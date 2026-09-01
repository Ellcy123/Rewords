import { z } from "zod";
import {
  AiLogEntrySchema,
  AiProviderStatusSchema,
  DialogueResultSchema,
  demoBootstrap,
  type AiLogEntry,
  type AiProviderStatus,
  type DialogueResult
} from "../../packages/shared/src/index.ts";
import { createMockDialogue } from "./mockDialogueProvider.ts";
import { createMockGiftDialogue } from "./mockGiftDialogueProvider.ts";
import {
  SAYA_PROMPT_VERSION,
  buildSayaPrompt,
  type BuiltPrompt,
  type DialogueGenerationContext
} from "./prompts/sayaPrompt.ts";

const AiDraftSchema = z.object({
  line: z.string().min(1).max(120),
  stage_direction: z.string().max(60),
  emotion: z.enum(["审视", "平静", "警惕", "意外", "不耐"]),
  continuations: z.array(z.object({
    speaker: z.enum(["npc", "player"]),
    line: z.string().min(1).max(120),
    stage_direction: z.string().max(60).optional().default(""),
    emotion: z.enum(["审视", "平静", "警惕", "意外", "不耐"])
  })).min(1).max(4),
  options: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1).max(60),
    intent: z.string().min(1).max(24)
  })).max(3),
  used_fact_ids: z.array(z.string().min(1)).max(12)
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

export interface GameDialogueProvider {
  generate(context: DialogueGenerationContext): Promise<DialogueResult>;
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
      targetNpcId: "npc_saya",
      configured: Boolean(this.apiKey),
      provider: this.apiKey ? "deepseek" : "mock",
      model: this.model,
      promptVersion: SAYA_PROMPT_VERSION
    });
  }

  getLogs(): AiLogEntry[] {
    return structuredClone(this.logs);
  }

  async generate(context: DialogueGenerationContext): Promise<DialogueResult> {
    if (context.npc.id !== "npc_saya") return mockDialogue(context);

    const prompt = buildSayaPrompt(context);
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
            max_tokens: 900,
            temperature: 0.65,
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
    if (context.selectedOption && !draft.continuations.some((beat) => beat.speaker === "player")) {
      throw new ProviderFailure("missing_player_dialogue_beat", true);
    }
    if (draft.options.length > 0 && draft.continuations.at(-1)?.speaker !== "npc") {
      throw new ProviderFailure("choice_lead_must_be_npc", true);
    }

    const knownFacts = new Set(prompt.knownFactIds);
    const usedFacts = [...new Set(draft.used_fact_ids.filter((factId) => knownFacts.has(factId)))];
    return DialogueResultSchema.parse({
      speakerId: context.npc.id,
      line: draft.line,
      stageDirection: draft.stage_direction.trim() || undefined,
      emotion: draft.emotion,
      continuations: draft.continuations.map((beat) => ({
        speakerId: beat.speaker === "player" ? demoBootstrap.player.id : context.npc.id,
        line: beat.line,
        stageDirection: beat.stage_direction.trim() || undefined,
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
        promptVersion: SAYA_PROMPT_VERSION,
        model: this.model,
        latencyMs,
        attemptCount
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
    const result = DialogueResultSchema.parse({
      ...fallback,
      debug: {
        ...fallback.debug,
        provider: "mock_fallback",
        decision: "DeepSeek 当前不可用，已使用固定保底对白；游戏状态仍由服务端正常结算。",
        promptVersion: SAYA_PROMPT_VERSION,
        model: this.model,
        latencyMs,
        attemptCount,
        fallbackReason: reason
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
      errorCode: reason
    });
    return result;
  }

  private pushLog(entry: Omit<AiLogEntry, "id" | "timestamp" | "model" | "promptVersion">) {
    const log = AiLogEntrySchema.parse({
      id: `ai_log_${String(this.logSequence).padStart(4, "0")}`,
      timestamp: new Date().toISOString(),
      model: this.model,
      promptVersion: SAYA_PROMPT_VERSION,
      ...entry
    });
    this.logSequence += 1;
    this.logs.push(log);
    if (this.logs.length > 50) this.logs.shift();
  }
}
