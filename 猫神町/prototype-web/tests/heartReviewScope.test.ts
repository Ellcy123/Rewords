import { describe, expect, it, vi } from "vitest";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { createInitialState, GameService } from "../server/src/gameService.ts";
import { HeartDraft, validateHeartDraft, type HeartContext } from "../server/src/heartDialogue.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { ruleContext, validRuleReactions } from "../server/src/ruleReactions.ts";
import { GameStateSchema, type GameState } from "../packages/shared/src/index.ts";
import { showSpeech } from "./playback.ts";

const response = (body: unknown) => new Response(JSON.stringify({
  choices: [{ finish_reason: "stop", message: { content: JSON.stringify(body) } }]
}));

function context(npcId = "npc_koharu", state = createInitialState()): HeartContext {
  state.activeNpcId = npcId;
  state.currentLocationId = npcId === "npc_saya" ? "loc_station" : "loc_shrine";
  state.heartSession = { id: "review_scope", claimedKinds: [] };
  return { state, npcId, mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: "fear" };
}

function dayTwoSayaState(): GameState {
  const state = createInitialState();
  state.day = 2;
  state.currentMinute = 600;
  state.period = "morning";
  state.phase = "location";
  state.currentLocationId = "loc_station";
  state.activeNpcId = "npc_saya";
  state.npcStates.npc_saya.currentLocationId = "loc_station";
  state.activeRules.faith = {
    slotId: "faith", carrierItemId: "item_potato", conceptId: "concept_potato",
    displayText: "土豆是神", activatedDay: 1
  };
  state.itemOwners.item_potato = "rule:faith";
  state.eventLog.push({
    id: "rule_faith_day1", sequence: state.eventLog.length, day: 1, minute: 1080, period: "night",
    type: "rule_changed", actorId: "player", targetId: null, itemId: "item_potato", locationId: null,
    audience: ["player", "npc_saya"],
    details: { text: "土豆是神", slotId: "faith", conceptId: "concept_potato", carrierItemId: "item_potato" }
  });
  return GameStateSchema.parse(state);
}

function sayaOpeningDraft(state: GameState, omitEmotion = false) {
  const line = "我先把这条规则说到今天的车票上。";
  const active = ruleContext(state, "npc_saya", true).active[0]!;
  return {
    action_plan: null,
    consequence: null,
    beats: [omitEmotion ? { speaker: "npc", line, stage_direction: "" } : { speaker: "npc", line, stage_direction: "", emotion: "认真" }],
    can_continue: true,
    choice_point: { quote: line, reason: "纱夜等待遥回应规则带来的具体取舍。" },
    closing_reason: "",
    used_fact_ids: [],
    disclosed_fact_ids: [],
    disclosures: [],
    progress: { type: "request", summary: "纱夜把公共规则落到眼前车票" },
    pickup: null,
    rule_reactions: [{ ruleId: active.id, beatIndex: 0, quote: line, stance: "把公共规则理解成眼前的责任", demand: "请先和我把具体做法说清楚。" }]
  };
}

function draft() {
  const npcLine = "那就先从眼前的车票说起，可以吗？";
  return {
    action_plan: null,
    consequence: null,
    beats: [
      { speaker: "player", line: "我先陪你把这件事说清楚。", stage_direction: "", emotion: "认真" },
      { speaker: "npc", line: npcLine, stage_direction: "", emotion: "迟疑" }
    ],
    can_continue: true,
    choice_point: { quote: npcLine, reason: "小春等待遥回应当前边界。" },
    closing_reason: "",
    used_fact_ids: [],
    disclosed_fact_ids: [],
    disclosures: [],
    progress: { type: "request", summary: "小春提出先核对眼前车票" },
    pickup: null
  };
}

function longDraft() {
  const beats = Array.from({ length: 13 }, (_, index) => ({
    speaker: index === 0 || index % 2 === 0 ? "player" : "npc",
    line: `第${index + 1}句现场对白`, stage_direction: "", emotion: "认真"
  }));
  return { ...draft(), beats };
}

describe("拾绪内容审校边界", () => {
  it("真实 provider 接受省略 emotion 的对白，仍经过 review 并使用默认展示标签", async () => {
    const raw = draft();
    raw.beats = raw.beats.map(({ emotion: _emotion, ...beat }) => beat) as typeof raw.beats;
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "" }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(context());

    expect(result.emotion).toBe("交谈");
    expect(result.continuations[0]?.emotion).toBe("交谈");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(provider.getLogs().map(log => log.mode)).toEqual(["review", "talk"]);
  });

  it.each([null, "   "])("将 emotion=%j 归一化为交谈，显式标签仍保留", value => {
    const raw = draft();
    raw.beats[0].emotion = value as unknown as string;
    expect(validateHeartDraft(raw, context(), []).beats[0].emotion).toBe("交谈");

    const explicit = draft();
    explicit.beats[0].emotion = "  迟疑  ";
    expect(validateHeartDraft(explicit, context(), []).beats[0].emotion).toBe("迟疑");
  });

  it("默认展示标签不产生心绪牌", async () => {
    const raw = draft();
    raw.beats = [raw.beats[1]];
    raw.choice_point = { quote: raw.beats[0].line, reason: "小春等待遥回应她的担忧。" };
    raw.beats = raw.beats.map(({ emotion: _emotion, ...beat }) => beat) as typeof raw.beats;
    raw.pickup = null;
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "" }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider);
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");

    await game.startHeartEncounter(game.getState().revision);
    await showSpeech(game);

    expect(game.getState().currentDialogue?.emotion).toBe("交谈");
    expect(game.getState().heartCards).toEqual([]);
  });

  it("第二天纱夜有供奉规则时，缺少 emotion 的开场仍通过合法 rule_reactions 和 review", async () => {
    const state = dayTwoSayaState();
    const raw = sayaOpeningDraft(state, true);
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "" }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const sayaContext = context("npc_saya", state);
    sayaContext.heartIntent = "opening";
    const result = await provider.generateHearts(sayaContext);
    const reactions = result.debug.ruleReactions ?? [];

    expect(result.emotion).toBe("交谈");
    expect(validRuleReactions(reactions, state, "npc_saya", [{ speakerId: "npc_saya", line: raw.beats[0].line }], true)).toBe(true);
    expect(reactions[0]).toMatchObject({ ruleId: "faith:rule_faith_day1", beatIndex: 0, quote: raw.beats[0].line });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(provider.getLogs().map(log => log.mode)).toEqual(["review", "talk"]);
    const generationBody = JSON.parse(fetchImpl.mock.calls[0]![1].body as string) as { messages: { content: string }[] };
    expect(generationBody.messages[0]!.content).toContain("rule_reactions");
    expect(JSON.parse(generationBody.messages[1]!.content).world_rules.required_rule_id).toBe("faith:rule_faith_day1");
  });

  it("核心字段缺失、非法说话者和非法 pickup 仍被拒绝", () => {
    const missingLine = draft();
    delete (missingLine.beats[0] as { line?: string }).line;
    expect(() => validateHeartDraft(missingLine, context(), [])).toThrow();

    const invalidSpeaker = draft();
    invalidSpeaker.beats[0].speaker = "system" as "npc";
    expect(() => validateHeartDraft(invalidSpeaker, context(), [])).toThrow();

    const unknownFact = draft();
    unknownFact.used_fact_ids = ["F12"];
    expect(() => validateHeartDraft(unknownFact, context(), ["F01", "F02"])).toThrow("unknown_fact");

    const invalidPickup = draft();
    invalidPickup.pickup = { beat_index: 1, kind: "fear", quote: "并不存在的台词" };
    expect(() => validateHeartDraft(invalidPickup, context(), [])).toThrow("invalid_pickup");
  });

  it("GameService 返回明确失败原因，并在 provider 故障时恢复状态与存档", async () => {
    const bad = draft();
    delete (bad.beats[0] as { line?: string }).line;
    const fetchImpl = vi.fn().mockResolvedValue(response(bad));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider);
    game.travel("loc_station");
    game.startEncounter("npc_saya");
    const before = game.getState();
    const saved = store.load();

    await expect(game.startHeartEncounter(before.revision)).rejects.toThrow(/回应格式尚未完整.*本次会面尚未开始.*卡牌、时间和进度已保留/);

    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
    expect(provider.getLogs().at(-1)).toMatchObject({ success: false, errorCode: "schema_validation" });
    expect(provider.getLogs().at(-1)?.detail).toContain("beats.0.line");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each(["off_topic", "player_intent", "conversation_closing"])(
    "表达层面的 %s 否决仍保留有效心绪回应",
    async reason => {
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(response(draft()))
        .mockResolvedValueOnce(response({ approved: false, reason, issue: "只是表达层面的建议" }));
      const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

      const result = await provider.generateHearts(context());

      expect(result.debug.provider).toBe("deepseek");
      expect(result.heart?.choicePoint?.quote).toBe("那就先从眼前的车票说起，可以吗？");
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }
  );

  it.each(["new_case_fact", "ownership"])("仍拒绝 %s 审校否决", async reason => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(draft()))
      .mockResolvedValueOnce(response({ approved: false, reason, issue: "具体事实或所有权违规" }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow("事实或结构核对");
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "talk", errorCode: reason, success: false });
  });

  it("把精确的剩余句数纠错信息送进重试请求", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(longDraft()))
      .mockResolvedValueOnce(response(draft()));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 2, review: false });

    const result = await provider.generateHearts(context());

    expect(result.debug.provider).toBe("deepseek");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(fetchImpl.mock.calls[1][1].body as string);
    const retryPrompt = retryBody.messages[1].content as string;
    expect(retryPrompt).toContain("刚才生成了13个节拍");
    expect(retryPrompt).toContain("本次双方合计只能有12个");
  });

  it("仍拒绝未知事实与非法材料动作", () => {
    const unknownFact = draft();
    unknownFact.used_fact_ids = ["F12"];
    expect(() => validateHeartDraft(unknownFact, context(), ["F01", "F02"])).toThrow("unknown_fact");

    const invalidMaterial = draft();
    invalidMaterial.beats[1].line = "这件不存在的材料，我现在交给你。";
    invalidMaterial.choice_point = { quote: invalidMaterial.beats[1].line, reason: "小春等待遥回应当前边界。" };
    invalidMaterial.consequence = { type: "material", actionId: "show:E99", beatIndex: 1, quote: invalidMaterial.beats[1].line };
    expect(() => validateHeartDraft(invalidMaterial, context(), [])).toThrow("invalid_consequence");
  });

  it("允许后半段的 pickup 索引锚定已展示的 NPC 台词", () => {
    const d = draft();
    d.beats = Array.from({ length: 12 }, (_, index) => ({
      speaker: index === 0 || index % 2 === 0 ? "player" : "npc",
      line: index === 11 ? "我会把这张票收好，先陪你把话说完。" : `第${index + 1}句现场对白`,
      stage_direction: "", emotion: "认真"
    }));
    d.choice_point = { quote: d.beats[11].line, reason: "小春等待遥回应当前边界。" };
    d.pickup = { beat_index: 11, kind: "fear", quote: d.beats[11].line };

    const parsed = HeartDraft.parse(d);
    expect(validateHeartDraft(parsed, context(), [])).toMatchObject({ pickup: { beat_index: 11, kind: "fear" } });
  });
});
