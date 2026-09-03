import { z } from "zod";
import {
  AiLogEntrySchema,
  AiProviderStatusSchema,
  DialogueResultSchema,
  EndingResultSchema,
  demoBootstrap,
  type AiLogEntry,
  type AiProviderStatus,
  type DialogueResult,
  type EndingResult,
  type GameState
} from "../../packages/shared/src/index.ts";
import { createMockDialogue } from "./mockDialogueProvider.ts";
import { createMockGiftDialogue } from "./mockGiftDialogueProvider.ts";
import {
  AGENT_PROMPT_VERSION,
  buildAgentPrompt,
  type BuiltPrompt,
  type DialogueGenerationContext
} from "./prompts/agentPrompt.ts";
import {
  ENDING_PROMPT_VERSION,
  buildEndingPrompt,
  createFallbackEnding
} from "./prompts/endingPrompt.ts";

const AiDraftSchema = z.object({
  line: z.string().min(1).max(240),
  stage_direction: z.string().max(160).optional().default(""),
  emotion: z.string().min(1).max(40),
  continuations: z.array(z.object({
    speaker: z.enum(["npc", "player"]),
    line: z.string().min(1).max(240),
    stage_direction: z.string().max(160).optional().default(""),
    emotion: z.string().min(1).max(40)
  })).max(6).default([]),
  npc_action_id: z.string().min(1),
  npc_action: z.string().max(320).optional().default(""),
  memory_candidate: z.string().max(480).optional().default(""),
  reflection_candidate: z.string().max(480).optional().default(""),
  options: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1).max(60),
    intent: z.string().min(1).max(24)
  })).max(3),
  used_fact_ids: z.array(z.string().min(1)).max(12)
});

const EndingAiDraftSchema = z.object({
  title: z.string().min(1).max(60),
  subtitle: z.string().min(1).max(100),
  narration: z.string().min(1).max(1200),
  npc_outcomes: z.array(z.object({
    npc_id: z.string().min(1),
    headline: z.string().min(1).max(40),
    text: z.string().min(1).max(360)
  })).length(3),
  closing_line: z.string().min(1).max(180),
  used_fact_ids: z.array(z.string().min(1)).max(30)
});

const DeepSeekResponseSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.string().nullable(),
    message: z.object({ content: z.string().nullable() })
  })).min(1),
  model: z.string().optional(),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional()
  }).optional()
});

type ProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
};

class ProviderFailure extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean
  ) {
    super(code);
    this.name = "ProviderFailure";
  }
}

const forbiddenSceneDetails = [
  "空位",
  "储物柜",
  "铁柜",
  "保管室",
  "仓库",
  "地下室",
  "办公室",
  "便利店",
  "诊所",
  "美术馆",
  "公寓",
  "医院",
  "旅馆",
  "码头"
];

function clampDisplayText(value: string, maxLength: number) {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const boundary = Math.max(
    clipped.lastIndexOf("。"),
    clipped.lastIndexOf("！"),
    clipped.lastIndexOf("？"),
    clipped.lastIndexOf("；"),
    clipped.lastIndexOf("，")
  );
  return boundary >= Math.floor(maxLength * 0.55) ? clipped.slice(0, boundary + 1) : clipped;
}

export interface GameDialogueProvider {
  generate(context: DialogueGenerationContext): Promise<DialogueResult>;
  generateEnding(state: GameState): Promise<EndingResult>;
  getStatus(): AiProviderStatus;
  getLogs(): AiLogEntry[];
}

function mockDialogue(context: DialogueGenerationContext): DialogueResult {
  if (context.mode === "gift" && context.giftItem) {
    return createMockGiftDialogue(context.npc, context.giftItem, context.selectedOption?.id);
  }

  return createMockDialogue({
    npcId: context.npc.id,
    locationId: context.locationId,
    day: context.state.day,
    period: context.state.period,
    activeRules: {
      faith: context.state.activeRules.faith?.displayText ?? null,
      beauty: context.state.activeRules.beauty?.displayText ?? null
    },
    isFirstMeeting: context.state.eventLog.filter(
      (event) => event.type === "encounter_started" && event.targetId === context.npc.id
    ).length <= 1,
    selectedOptionId: context.selectedOption?.id
  });
}

export class DialogueProviderRouter implements GameDialogueProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly logs: AiLogEntry[] = [];
  private logSequence = 0;

  constructor(options: ProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "";
    this.baseUrl = (options.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
    this.model = options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maxAttempts = options.maxAttempts ?? 2;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getStatus(): AiProviderStatus {
    return AiProviderStatusSchema.parse({
      targetNpcId: "all_demo_npcs",
      configured: Boolean(this.apiKey),
      provider: this.apiKey ? "deepseek" : "mock",
      model: this.model,
      promptVersion: `${AGENT_PROMPT_VERSION}+${ENDING_PROMPT_VERSION}`
    });
  }

  getLogs(): AiLogEntry[] {
    return structuredClone(this.logs);
  }

  async generate(context: DialogueGenerationContext): Promise<DialogueResult> {
    const prompt = buildAgentPrompt(context);
    if (!this.apiKey) {
      return this.fallback(context, "not_configured", prompt, 0, 1);
    }

    const startedAt = Date.now();
    let lastFailure = new ProviderFailure("unknown_error", false);
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const draft = await this.callDeepSeek(prompt);
        const latencyMs = Date.now() - startedAt;
        const result = this.toDialogueResult(draft, context, prompt, latencyMs, attempt);
        this.pushLog({
          npcId: context.npc.id,
          mode: context.mode,
          provider: "deepseek",
          latencyMs,
          attemptCount: attempt,
          success: true,
          usedFacts: result.debug.usedFacts,
          promptVersion: prompt.promptVersion,
          errorCode: null
        });
        return result;
      } catch (error) {
        lastFailure = error instanceof ProviderFailure
          ? error
          : new ProviderFailure("unexpected_provider_error", false);
        if (!lastFailure.retryable || attempt === this.maxAttempts) {
          return this.fallback(
            context,
            lastFailure.code,
            prompt,
            Date.now() - startedAt,
            attempt
          );
        }
      }
    }

    return this.fallback(context, lastFailure.code, prompt, Date.now() - startedAt, this.maxAttempts);
  }

  async generateEnding(state: GameState): Promise<EndingResult> {
    const prompt = buildEndingPrompt(state);
    if (!this.apiKey) {
      return this.endingFallback(state, "not_configured", 0, 1);
    }

    const startedAt = Date.now();
    let lastFailure = new ProviderFailure("unknown_error", false);
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const draft = await this.callDeepSeekEnding(prompt.system, prompt.user);
        const returnedNpcIds = draft.npc_outcomes.map((outcome) => outcome.npc_id);
        const expectedNpcIds = demoBootstrap.npcs.map((npc) => npc.id);
        if (JSON.stringify(returnedNpcIds) !== JSON.stringify(expectedNpcIds)) {
          throw new ProviderFailure("ending_npc_order_mismatch", true);
        }
        const knownFactIds = new Set(prompt.facts.map((fact) => fact.id));
        const usedFactIds = [...new Set(draft.used_fact_ids.filter((id) => knownFactIds.has(id)))];
        if (prompt.requiredFactIds.some((id) => !usedFactIds.includes(id))) {
          throw new ProviderFailure("ending_required_fact_missing", true);
        }
        const result = EndingResultSchema.parse({
          title: draft.title,
          subtitle: draft.subtitle,
          narration: draft.narration,
          npcOutcomes: draft.npc_outcomes.map((outcome) => ({
            npcId: outcome.npc_id,
            headline: outcome.headline,
            text: outcome.text
          })),
          closingLine: draft.closing_line,
          provider: "deepseek",
          promptVersion: ENDING_PROMPT_VERSION,
          factSummary: prompt.factSummary,
          usedEventIds: usedFactIds
        });
        this.pushLog({
          npcId: "ending",
          mode: "ending",
          provider: "deepseek",
          latencyMs: Date.now() - startedAt,
          attemptCount: attempt,
          success: true,
          usedFacts: usedFactIds,
          promptVersion: ENDING_PROMPT_VERSION,
          errorCode: null
        });
        return result;
      } catch (error) {
        lastFailure = error instanceof ProviderFailure
          ? error
          : new ProviderFailure("invalid_ending_output", true);
        if (!lastFailure.retryable || attempt === this.maxAttempts) {
          return this.endingFallback(state, lastFailure.code, Date.now() - startedAt, attempt);
        }
      }
    }

    return this.endingFallback(state, lastFailure.code, Date.now() - startedAt, this.maxAttempts);
  }

  private async callDeepSeekEnding(system: string, user: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user }
            ],
            response_format: { type: "json_object" },
            thinking: { type: "disabled" },
            max_tokens: 1800,
            temperature: 0.72,
            stream: false
          }),
          signal: controller.signal
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new ProviderFailure("timeout", true);
        }
        throw new ProviderFailure("network_error", true);
      }
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw new ProviderFailure(`http_${response.status}`, retryable);
      }
      const payload = DeepSeekResponseSchema.safeParse(await response.json());
      if (!payload.success) throw new ProviderFailure("invalid_response_shape", true);
      const choice = payload.data.choices[0];
      if (choice.finish_reason === "length") throw new ProviderFailure("output_truncated", true);
      const content = choice.message.content?.trim();
      if (!content) throw new ProviderFailure("empty_output", true);
      try {
        return EndingAiDraftSchema.parse(JSON.parse(content));
      } catch {
        throw new ProviderFailure("invalid_ending_json", true);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private endingFallback(
    state: GameState,
    reason: string,
    latencyMs: number,
    attemptCount: number
  ) {
    const result = createFallbackEnding(state);
    this.pushLog({
      npcId: "ending",
      mode: "ending",
      provider: "mock_fallback",
      latencyMs,
      attemptCount,
      success: false,
      usedFacts: result.usedEventIds,
      promptVersion: ENDING_PROMPT_VERSION,
      errorCode: reason
    });
    return result;
  }

  private async callDeepSeek(prompt: BuiltPrompt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: prompt.system },
              { role: "user", content: prompt.user }
            ],
            response_format: { type: "json_object" },
            thinking: { type: "disabled" },
            max_tokens: 1200,
            temperature: 0.55,
            stream: false
          }),
          signal: controller.signal
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new ProviderFailure("timeout", true);
        }
        throw new ProviderFailure("network_error", true);
      }

      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw new ProviderFailure(`http_${response.status}`, retryable);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ProviderFailure("invalid_response_json", true);
      }
      const parsed = DeepSeekResponseSchema.safeParse(payload);
      if (!parsed.success) throw new ProviderFailure("invalid_response_shape", true);

      const choice = parsed.data.choices[0];
      if (choice.finish_reason === "length") throw new ProviderFailure("output_truncated", true);
      const content = choice.message.content?.trim();
      if (!content) throw new ProviderFailure("empty_output", true);

      try {
        return AiDraftSchema.parse(JSON.parse(content));
      } catch {
        throw new ProviderFailure("invalid_dialogue_json", true);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private toDialogueResult(
    draft: z.infer<typeof AiDraftSchema>,
    context: DialogueGenerationContext,
    prompt: BuiltPrompt,
    latencyMs: number,
    attemptCount: number
  ): DialogueResult {
    const returnedIds = draft.options.map((option) => option.id);
    const expectedIds = [...prompt.allowedOptionIds].sort();
    if (new Set(returnedIds).size !== returnedIds.length) {
      throw new ProviderFailure("duplicate_option_id", true);
    }
    if (JSON.stringify([...returnedIds].sort()) !== JSON.stringify(expectedIds)) {
      throw new ProviderFailure("option_whitelist_mismatch", true);
    }
    let continuations = !context.selectedOption && !prompt.openingPlayerBeatAllowed
      ? draft.continuations.filter((beat) => beat.speaker === "npc")
      : draft.continuations;
    if (continuations.length > 4) {
      continuations = draft.options.length > 0
        ? [...continuations.slice(0, 3), continuations.at(-1)!]
        : continuations.slice(0, 4);
    }
    if (draft.options.length > 0 && continuations.length > 0 && continuations.at(-1)?.speaker !== "npc") {
      throw new ProviderFailure("choice_lead_must_be_npc", true);
    }
    if (!prompt.allowedActionIds.includes(draft.npc_action_id)) {
      throw new ProviderFailure("npc_action_whitelist_mismatch", true);
    }

    const displayedDraft = [
      draft.stage_direction,
      draft.line,
      ...continuations.flatMap((beat) => [beat.stage_direction, beat.line])
    ].join(" ");
    if (forbiddenSceneDetails.some((term) => displayedDraft.includes(term))) {
      throw new ProviderFailure("unsupported_scene_detail", true);
    }
    if (
      context.npc.id === "npc_saya" &&
      /(?:命令|签字|落款)[^。！？]{0,30}九条弦一|九条弦一[^。！？]{0,30}(?:命令|签字|落款)/.test(displayedDraft)
    ) {
      throw new ProviderFailure("saya_claims_unknown_signer", true);
    }
    if (
      context.npc.id === "npc_saya" &&
      !prompt.knownFactIds.includes("FACT_MAHIRU_MESSAGE") &&
      /回头|眼神/.test(displayedDraft)
    ) {
      throw new ProviderFailure("premature_last_sighting_detail", true);
    }

    const knownFacts = new Set(prompt.knownFactIds);
    const usedFacts = [...new Set(draft.used_fact_ids.filter((factId) => knownFacts.has(factId)))];
    if (prompt.requiredFactIds.some((factId) => !usedFacts.includes(factId))) {
      throw new ProviderFailure("required_fact_missing", true);
    }
    const authoritativeAction = prompt.actionDescriptionById[draft.npc_action_id] ?? `${context.npc.name}完成本轮动作。`;
    const memoryFacts = usedFacts
      .map((factId) => prompt.factTextById[factId])
      .filter(Boolean)
      .slice(0, 2)
      .map((fact) => fact.slice(0, 160))
      .join("；");
    const memoryOutcome = prompt.selectedOutcome
      .split(/[；。]/)
      .map((part) => part.trim())
      .filter((part) => part && !/^(不得|不能|不新增|不编造|不发明)/.test(part))
      .join("；");
    const authoritativeMemory = context.selectedOption
      ? `朝雾遥说“${context.selectedOption.playerLine ?? context.selectedOption.text}”；${memoryOutcome}。${authoritativeAction}${memoryFacts ? ` 依据：${memoryFacts}` : ""}`
      : `${authoritativeAction}${memoryFacts ? ` 依据：${memoryFacts}` : ""}`;
    const authoritativeReflection = context.selectedOption
      ? `${context.npc.name}判断朝雾遥这次采取了“${context.selectedOption.intent}”的态度；下次会以“${context.npc.persona.immediateGoal}”为当前目标，检查她是否兑现刚才的选择。`
      : `${context.npc.name}把朝雾遥视为仍需观察的七日代理；下一步仍以“${context.npc.persona.immediateGoal}”为当前目标。`;
    return DialogueResultSchema.parse({
      speakerId: context.npc.id,
      line: draft.line,
      stageDirection: clampDisplayText(draft.stage_direction, 60) || undefined,
      emotion: draft.emotion,
      continuations: continuations.map((beat) => ({
        speakerId: beat.speaker === "player" ? demoBootstrap.player.id : context.npc.id,
        line: clampDisplayText(beat.line, 120),
        stageDirection: clampDisplayText(beat.stage_direction, 60) || undefined,
        emotion: beat.emotion
      })),
      options: draft.options.map((option) => ({
        id: option.id,
        text: prompt.optionTextById[option.id] ?? option.text,
        playerLine: prompt.optionPlayerLineById[option.id] ?? prompt.optionTextById[option.id] ?? option.text,
        intent: prompt.optionIntentById[option.id] ?? option.intent
      })),
      debug: {
        provider: "deepseek",
        decision: "DeepSeek 的结构化对白通过 Schema、事实引用与选项白名单校验。",
        usedFacts,
        promptVersion: prompt.promptVersion,
        model: this.model,
        latencyMs,
        attemptCount,
        sceneGoal: prompt.sceneGoal,
        npcActionId: draft.npc_action_id,
        npcAction: authoritativeAction,
        memoryCandidate: authoritativeMemory,
        reflectionCandidate: authoritativeReflection
      }
    });
  }

  private fallback(
    context: DialogueGenerationContext,
    reason: string,
    prompt: BuiltPrompt,
    latencyMs: number,
    attemptCount: number
  ) {
    const fallback = mockDialogue(context);
    const authoritativeAction = prompt.actionDescriptionById[prompt.allowedActionIds[0]!] ?? fallback.stageDirection ?? `${context.npc.name}完成了本轮预定动作。`;
    const memoryOutcome = prompt.selectedOutcome
      .split(/[；。]/)
      .map((part) => part.trim())
      .filter((part) => part && !/^(不得|不能|不新增|不编造|不发明)/.test(part))
      .join("；");
    const authoritativeMemory = context.selectedOption
      ? `朝雾遥说“${context.selectedOption.playerLine ?? context.selectedOption.text}”；${memoryOutcome}。${authoritativeAction}`
      : authoritativeAction;
    const authoritativeReflection = context.selectedOption
      ? `${context.npc.name}判断朝雾遥这次采取了“${context.selectedOption.intent}”的态度；下次会以“${context.npc.persona.immediateGoal}”为当前目标，检查她是否兑现刚才的选择。`
      : `${context.npc.name}把朝雾遥视为仍需观察的七日代理；下一步仍以“${context.npc.persona.immediateGoal}”为当前目标。`;
    const result = DialogueResultSchema.parse({
      ...fallback,
      debug: {
        ...fallback.debug,
        provider: "mock_fallback",
        decision: "DeepSeek 当前不可用，已使用固定保底对白；游戏状态仍由服务端正常结算。",
        promptVersion: prompt.promptVersion,
        model: this.model,
        latencyMs,
        attemptCount,
        fallbackReason: reason,
        sceneGoal: prompt.sceneGoal,
        npcActionId: prompt.allowedActionIds[0],
        npcAction: authoritativeAction,
        memoryCandidate: authoritativeMemory,
        reflectionCandidate: authoritativeReflection
      }
    });
    this.pushLog({
      npcId: context.npc.id,
      mode: context.mode,
      provider: "mock_fallback",
      latencyMs,
      attemptCount,
      success: false,
      usedFacts: result.debug.usedFacts,
      promptVersion: prompt.promptVersion,
      errorCode: reason
    });
    return result;
  }

  private pushLog(entry: Omit<AiLogEntry, "id" | "timestamp" | "model">) {
    const log = AiLogEntrySchema.parse({
      id: `ai_log_${String(this.logSequence).padStart(4, "0")}`,
      timestamp: new Date().toISOString(),
      model: this.model,
      ...entry
    });
    this.logSequence += 1;
    this.logs.push(log);
    if (this.logs.length > 50) this.logs.shift();
  }
}
