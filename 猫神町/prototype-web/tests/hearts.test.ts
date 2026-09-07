import { showSpeech, nextSpeech, drainPlayback } from "./playback.ts";
import { describe, expect, it } from "vitest";
import { GameStateSchema, heartKinds } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider, DialogueGenerationError, buildCasePrompt } from "../server/src/caseProvider.ts";
import { buildHeartPrompt, mockHeartDialogue, validateHeartDraft, type HeartContext } from "../server/src/heartDialogue.ts";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { MemoryGameStore, SqliteGameStore } from "../server/src/persistence.ts";

function setup(provider = new CaseDialogueProvider({ apiKey: "" })) {
  const store = new MemoryGameStore(), game = new GameService(store, provider);
  game.travel("loc_shrine"); game.startEncounter("npc_koharu");
  return { game, store, provider };
}
const drain = drainPlayback;
function context(intent: HeartContext["heartIntent"] = "opening"): HeartContext {
  const state = createInitialState(); state.activeNpcId = "npc_koharu"; state.currentLocationId = "loc_shrine";
  state.heartSession = { id: "session_test", claimedKinds: [] };
  return { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: intent };
}
function draft(intent: "opening" | "fear" = "opening") {
  return { beats: [
    ...(intent === "fear" ? [{ speaker: "player", line: "我有点不安。", stage_direction: "", emotion: "不安" }] : []),
    { speaker: "npc", line: "我怕自己整理不好。", stage_direction: "攥住衣角。", emotion: "恐惧" }
  ], can_continue: true, choice_point: null as { quote: string; reason: string } | null, closing_reason: "", used_fact_ids: [], pickup: { beat_index: intent === "fear" ? 1 : 0, kind: "fear", quote: "我怕自己整理不好" } };
}
function response(data: unknown) { return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(data) } }] }), { status: 200 }); }

describe("拾绪首日服务闭环", () => {
  it("web test-pack mode starts with three of each, and reset starts a fresh pack", () => {
    const store = new MemoryGameStore();
    const game = new GameService(store, new CaseDialogueProvider({ apiKey: "" }), { heartTestPack: true });
    for (const state of [game.getState(), game.reset().state]) {
      expect(state.heartCards).toHaveLength(9);
      for (const kind of heartKinds) expect(state.heartCards.filter(c => c.kind === kind)).toHaveLength(3);
      expect(state.heartCards.every(c => c.sourceType === "test")).toBe(true);
      expect(state.eventLog.filter(e => e.type === "heart_gathered")).toHaveLength(0);
    }
  });
  it("grants once to an existing save, preserving progress and naturally gathered cards", async () => {
    const { game, store, provider } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const before = game.getState();
    const upgraded = new GameService(store, provider, { heartTestPack: true }).getState();
    expect(upgraded.heartCards).toHaveLength(10);
    expect(upgraded.heartCards[0]).toEqual(before.heartCards[0]);
    expect(upgraded.currentDialogue).toEqual(before.currentDialogue);
    expect(upgraded.currentMinute).toBe(before.currentMinute); expect(upgraded.heartSession).toEqual(before.heartSession);
    expect(upgraded.revision).toBe(before.revision + 1);
    expect(new GameService(store, provider, { heartTestPack: true }).getState()).toEqual(upgraded);
  });
  it("consumed test cards are not replenished on service restart", async () => {
    const store = new MemoryGameStore(), provider = new CaseDialogueProvider({ apiKey: "" });
    const game = new GameService(store, provider, { heartTestPack: true });
    game.travel("loc_shrine"); game.startEncounter("npc_koharu"); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const before = game.getState(); const card = before.heartCards.find(c => c.sourceType === "test" && c.kind === "affection")!;
    await game.useHeart(card.id, before.revision);
    const restored = new GameService(store, provider, { heartTestPack: true }).getState();
    expect(restored.heartCards.filter(c => c.kind === "affection")).toHaveLength(2);
    expect(restored.eventLog.filter(e => e.type === "heart_test_pack")).toHaveLength(1);
  });
  it("old v3 saves load empty without resetting or retroactive grants", () => {
    const old = createInitialState() as Record<string, unknown>; delete old.heartCards; delete old.heartSession;
    old.day = 4; old.revision = 17;
    const parsed = GameStateSchema.parse(old);
    expect(parsed.heartCards).toEqual([]); expect(parsed.heartSession).toBeNull(); expect(parsed.day).toBe(4); expect(parsed.revision).toBe(17);
  });
  it("starts empty, gathers from a visible opening, and charges conversation time once", async () => {
    const { game } = setup(); const before = game.getState(); expect(before.heartCards).toEqual([]);
    await game.startHeartEncounter(before.revision); await showSpeech(game);
    const s = game.getState(); expect(s.currentMinute).toBe(before.currentMinute + 120);
    expect(s.heartCards.map(c => c.kind)).toEqual(["fear"]); expect(s.currentDialogue?.options).toEqual([]);
    expect(s.eventLog.find(e => e.id === s.heartCards[0].sourceEventId)?.type).toBe("dialogue_generated");
  });
  it("spends one on 遥's expression, only gathers the NPC response when played", async () => {
    const { game } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const s = game.getState(); await game.useHeart(s.heartCards[0].id, s.revision);
    expect(game.getState().currentDialogue?.speakerId).toBe("player");
    expect(game.getState().lastPlayerChoice).toBeNull(); expect(game.getState().heartCards).toHaveLength(0);
    expect(game.getState().currentMinute).toBe(s.currentMinute);
    await drain(game); expect(game.getState().heartCards.map(c => c.kind)).toEqual(["sympathy"]);
    expect(game.getState().eventLog.filter(e => e.type === "heart_spent")).toHaveLength(1);
  });
  it("does not grant a future NPC emotion on opening or early exit", async () => {
    class Future extends CaseDialogueProvider {
      async generateHearts(c: HeartContext) {
        const d = mockHeartDialogue(c); d.continuations = [{ speakerId: c.npcId, line: d.line, emotion: d.emotion }];
        d.line = "你好。"; d.heart!.pickups[0].beatIndex = 1; return d;
      }
    }
    const { game } = setup(new Future({ apiKey: "" })); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    expect(game.getState().heartCards).toHaveLength(0);
    await game.completeEncounter(); expect(game.getState().heartCards).toHaveLength(0); expect(game.getState().heartSession).toBeNull();
  });
  it("restore/replayed requests cannot duplicate spends or pickups", async () => {
    const { game, store, provider } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const s = game.getState(), id = s.heartCards[0].id;
    await game.useHeart(id, s.revision);
    const restored = new GameService(store, provider); const r = restored.getState().revision;
    await expect(restored.useHeart(id, s.revision)).rejects.toThrow("进度已变化");
    await restored.nextDialogueBeat(r);
    await expect(restored.nextDialogueBeat(r)).rejects.toThrow("进度已变化");
    await drain(restored);
    expect(restored.getState().heartCards.map(c => c.kind)).toEqual(["sympathy"]);
    expect(restored.getState().eventLog.filter(e => e.type === "heart_spent")).toHaveLength(1);
  });
  it("a failed generation restores cards, decisions, memories, clock and revision", async () => {
    class Failing extends CaseDialogueProvider {
      async generateHearts(c: HeartContext) { if (c.heartIntent !== "opening") throw new DialogueGenerationError(); return mockHeartDialogue(c); }
    }
    const { game, store } = setup(new Failing({ apiKey: "" })); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const before = game.getState(); const saved = store.load();
    await expect(game.useHeart(before.heartCards[0].id, before.revision)).rejects.toThrow("卡牌、时间和进度已保留");
    expect(game.getState()).toEqual(before); expect(store.load()).toEqual(saved);
  });
  it("failed opening preserves the encounter choice and two hours", async () => {
    class Failing extends CaseDialogueProvider { async generateHearts(): Promise<never> { throw new Error("offline"); } }
    const { game } = setup(new Failing({ apiKey: "" })); const before = game.getState();
    await expect(game.startHeartEncounter(before.revision)).rejects.toThrow("进度已保留"); expect(game.getState()).toEqual(before);
  });
  it("keeps uncommitted requests invisible and rejects a concurrent duplicate", async () => {
    let release!: () => void;
    class Pending extends CaseDialogueProvider {
      async generateHearts(c: HeartContext) { if (c.heartIntent !== "opening") await new Promise<void>(r => { release = r; }); return mockHeartDialogue(c); }
    }
    const { game } = setup(new Pending({ apiKey: "" })); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const before = game.getState(); const pending = game.useHeart(before.heartCards[0].id, before.revision);
    expect(game.getState()).toEqual(before);
    await expect(game.useHeart(before.heartCards[0].id, before.revision)).rejects.toThrow("还在生成");
    release(); await pending;
  });
  it("natural continuation lets 遥 speak, doesn't repeat rewards, and eventually closes", async () => {
    const { game } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    for (let i = 0; i < 10 && game.getState().currentDialogue?.heart?.canContinue; i++) {
      const s = game.getState(); await game.useHeart(null, s.revision); await drain(game);
    }
    const s = game.getState(); expect(s.currentDialogue?.heart?.canContinue).toBe(false);
    expect(s.eventLog.filter(e => e.type === "dialogue_generated" && e.actorId === "player").length).toBeGreaterThan(0);
    expect(s.eventLog.filter(e => e.type === "dialogue_choice")).toHaveLength(1);
    expect(s.eventLog.filter(e => e.type === "dialogue_continued").length).toBeGreaterThan(0);
    expect(s.eventLog.filter(e => e.type === "dialogue_generated").length).toBeLessThanOrEqual(24);
    expect(s.heartCards.map(c => c.kind)).toEqual(["fear", "affection"]);
    await expect(game.useHeart(null, s.revision)).rejects.toThrow("可出牌");
  });
  it("three attitudes run in sequence and only spend the chosen instance", async () => {
    const { game } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    for (const kind of heartKinds) {
      const s = game.getState(), card = s.heartCards.find(c => c.kind === kind)!;
      expect(card).toBeDefined(); await game.useHeart(card.id, s.revision); await drain(game);
    }
    expect(game.getState().eventLog.filter(e => e.type === "heart_spent").map(e => e.details.kind)).toEqual(heartKinds);
    expect(game.getState().heartCards).toHaveLength(0);
  });
  it("cards survive closing and next day; a new encounter may gather that kind again", async () => {
    const { game } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game); await game.completeEncounter();
    game.waitUntilNight(); await game.endDay(); game.travel("loc_shrine"); game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    expect(game.getState().heartCards.map(c => c.kind)).toEqual(["fear", "fear"]);
    const before = game.getState(); await game.useHeart(before.heartCards[0].id, before.revision);
    expect(game.getState().heartCards.map(c => c.id)).toEqual([before.heartCards[1].id]);
  });
  it("SQLite round trips pending playback and inventory without altering the live database", async () => {
    const store = new SqliteGameStore(":memory:");
    try {
      const p = new CaseDialogueProvider({ apiKey: "" }), game = new GameService(store, p);
      game.travel("loc_shrine"); game.startEncounter("npc_koharu"); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
      const s = game.getState(); await game.useHeart(s.heartCards[0].id, s.revision);
      const restored = new GameService(store, p); expect(restored.getState()).toEqual(game.getState());
      await drain(restored); expect(restored.getState().heartCards[0].kind).toBe("sympathy");
    } finally { store.close(); }
  });
  it("legacy in-progress dialogue cannot be silently converted", async () => {
    const { game } = setup(); await game.selectInteractionMode("talk"); const before = game.getState();
    await expect(game.startHeartEncounter(before.revision)).rejects.toThrow("新会面"); expect(game.getState()).toEqual(before);
  });
});

describe("拾绪模型契约", () => {
  it("continuation cursor advances only with displayed beats, including after restore", async () => {
    const { game, store, provider } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    await game.useHeart(null, game.getState().revision);
    const makePrompt = (g: GameService) => {
      const c: HeartContext = { ...context("listen"), state: g.getState() };
      return JSON.parse(buildHeartPrompt(c, buildCasePrompt(c).user).user);
    };
    const before = makePrompt(game), unplayed = game.getState().currentDialogue!.continuations[0].line;
    expect(JSON.stringify(before.dialogue_history)).not.toContain(unplayed);
    const restored = new GameService(store, provider);
    await restored.nextDialogueBeat(restored.getState().revision);
    const after = makePrompt(restored);
    expect(after.dialogue_history.played_this_encounter.length).toBe(before.dialogue_history.played_this_encounter.length + 1);
    expect(after.dialogue_history.continuation.last_played_beat.text).toBe(restored.getState().currentDialogue!.line);
    expect(after.dialogue_history.continuation.last_played_beat.kind).toBe("speech");
    expect(JSON.stringify(after.dialogue_history)).not.toContain(unplayed);
    await nextSpeech(restored);
    expect(makePrompt(restored).dialogue_history.continuation.last_played_beat.text).toBe(unplayed);
    expect(after.dialogue_history.continuation.mode).toBe("after_last_played_beat");
    expect(after).not.toHaveProperty("recent_spoken_lines");
    expect(after).not.toHaveProperty("retrieved_memories");
    const currentTexts = after.dialogue_history.played_this_encounter.map((b: { text: string }) => b.text);
    expect(after.dialogue_history.prior_memories.some((m: string) => currentTexts.includes(m))).toBe(false);
  });
  it("a new encounter keeps past dialogue as history instead of a playback cursor", async () => {
    const { game } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const oldLine = game.getState().currentDialogue!.line;
    await game.completeEncounter(); game.startEncounter("npc_koharu");
    const c: HeartContext = { ...context("opening"), state: game.getState() };
    const p = buildHeartPrompt(c, buildCasePrompt(c).user), input = JSON.parse(p.user);
    expect(input.first_meeting).toBe(false);
    expect(input.dialogue_history.played_this_encounter).toEqual([]);
    expect(input.dialogue_history.continuation).toMatchObject({ mode: "new_encounter", last_played_beat: null });
    expect(input.dialogue_history.previous_encounter_dialogue.at(-1).text).toContain(oldLine);
    expect(p.system).toContain("上次告别已结束");
    expect(p.system).toContain("last_played_beat是已播放游标，不是输出的第一句");
  });
  it("next sentence plays the saved next beat without generating another segment", async () => {
    class CountingProvider extends CaseDialogueProvider {
      count = 0;
      async generateHearts(c: HeartContext) { this.count++; return mockHeartDialogue(c); }
    }
    const provider = new CountingProvider({ apiKey: "" }), { game } = setup(provider);
    await game.startHeartEncounter(game.getState().revision); await showSpeech(game); await game.useHeart(null, game.getState().revision);
    const before = game.getState(), expected = before.currentDialogue!.continuations[0];
    await game.nextDialogueBeat(before.revision);
    expect(provider.count).toBe(2);
    expect(game.getState().dialogueBeatIndex).toBe(0);
    expect(game.getState().dialogueNarrationIndex).toBeNull();
    await nextSpeech(game);
    expect(provider.count).toBe(2);
    expect(game.getState().dialogueBeatIndex).toBe(1);
    expect(game.getState().eventLog.at(-1)?.details.text).toContain(expected.line);
  });
  it("rejects pickup from 遥, invented quotes, and unobserved beat indices", () => {
    const c = context("fear");
    for (const pickup of [{ beat_index: 0, kind: "fear", quote: "我有点不安" }, { beat_index: 1, kind: "fear", quote: "不存在的动作" }, { beat_index: 4, kind: "fear", quote: "怕" }]) {
      expect(() => validateHeartDraft({ ...draft("fear"), pickup }, c, [])).toThrow("invalid_pickup");
    }
  });
  it("rejects wrong player intent, unknown facts, and new card kinds", () => {
    expect(() => validateHeartDraft(draft("fear"), context("listen"), [])).not.toThrow();
    expect(() => validateHeartDraft(draft(), context("fear"), [])).toThrow("player_intent");
    expect(() => validateHeartDraft({ ...draft(), used_fact_ids: ["invented"] }, context(), [])).toThrow("unknown_fact");
    expect(() => validateHeartDraft({ ...draft(), pickup: { beat_index: 0, kind: "magic", quote: "怕" } }, context(), [])).toThrow();
  });
  it("doesn't leak card provenance, sources, or stocks into the NPC prompt", () => {
    const c = context("fear"); c.state.heartCards.push({ id: "private_card", kind: "fear", sourceNpcId: "secret_source", sourceEventId: "private_event", sourceText: "不应传给小春的私密来源", day: 1, locationId: null });
    const p = buildHeartPrompt(c, buildCasePrompt(c).user);
    expect(p.user).not.toContain("不应传给小春"); expect(p.user).not.toContain("secret_source"); expect(p.user).not.toContain("private_card");
    expect(JSON.parse(p.user).player_expression).toContain("遥自己带着害怕");
    expect(JSON.parse(p.user)).not.toHaveProperty("chosen_branch");
  });
  it("runs generation plus review, and translates to player-first beats without options", async () => {
    let calls = 0;
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: async () => response(++calls === 1 ? draft("fear") : { approved: true, reason: "none", issue: "" }) });
    const d = await p.generateHearts(context("fear")); expect(calls).toBe(2);
    expect(d.speakerId).toBe("player"); expect(d.continuations[0].speakerId).toBe("npc_koharu"); expect(d.options).toEqual([]); expect(d.debug.provider).toBe("deepseek");
  });
  it("does not spend a configured AI failure on an offline fallback, even at closing", async () => {
    const p = new CaseDialogueProvider({ apiKey: "test", maxAttempts: 1, fetchImpl: async () => new Response("", { status: 503 }) });
    await expect(p.generateHearts(context("fear"))).rejects.toBeInstanceOf(DialogueGenerationError);
  });
  it("review rejection triggers a heart-specific repair, not legacy short-option repair", async () => {
    let calls = 0; const prompts: string[] = [];
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: async (_url, options) => {
      prompts.push(String(options?.body)); calls++;
      return response(calls % 2 ? draft() : calls === 2 ? { approved: false, reason: "invalid_pickup", issue: "测试：quote需要体现恐惧" } : { approved: true, reason: "none", issue: "" });
    } });
    await p.generateHearts(context("listen")); expect(calls).toBe(4);
    expect(prompts[2]).toContain("测试：quote需要体现恐惧"); expect(prompts[2]).toContain("拾绪beats结构"); expect(prompts[2]).not.toContain("options生成2至3个");
  });
  it.each([false, true])("content reviewer cannot veto the generator's choice timing (has point: %s)", async hasPoint => {
    const question = "要是那天我没吼她，她是不是就不会走那条路？";
    const missed = { ...draft(), pickup: null, beats: [
      { speaker: "npc", line: question, stage_direction: "低下头。", emotion: "自责" },
      { speaker: "player", line: "那不是你的错。", stage_direction: "", emotion: "温柔" }
    ] };
    const generated = hasPoint ? { ...missed, beats: missed.beats.slice(0, 1), choice_point: { quote: question, reason: "她在自责中寻求遥的回应，不同态度会改变交流" } } : missed;
    const replies = [generated, { approved: false, reason: "decision_point", issue: "审校越权建议改变选牌位置" }];
    const prompts: string[] = [];
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: async (_url, init) => {
      prompts.push(String(init?.body)); return response(replies[prompts.length - 1]);
    } });
    const result = await p.generateHearts(context("listen"));
    expect(prompts).toHaveLength(2); // No rewrite or second timing decision.
    const reviewMessages = JSON.parse(prompts[1]).messages;
    expect(reviewMessages[0].content).toContain("不决定玩家何时选牌");
    expect(reviewMessages[0].content).not.toContain("逐句判断是否出现值得玩家介入");
    const payload = JSON.parse(reviewMessages[1].content);
    expect(payload.candidate).not.toHaveProperty("choice_point");
    expect(payload.context).not.toHaveProperty("pending_choice");
    expect(result.heart?.choicePoint).toEqual(generated.choice_point);
    expect([result, ...result.continuations].map(b => b.line)).toEqual(generated.beats.map(b => b.line));
  });
  it("content violations still reject and retry without letting the reviewer decide timing", async () => {
    let calls = 0;
    const p = new CaseDialogueProvider({ apiKey: "test", maxAttempts: 2, fetchImpl: async () =>
      response(++calls % 2 ? draft() : { approved: false, reason: "new_case_fact", issue: "测试：未经支持的往事" }) });
    await expect(p.generateHearts(context())).rejects.toBeInstanceOf(DialogueGenerationError);
    expect(calls).toBe(4);
    expect(p.getLogs().at(-1)?.errorCode).toBe("new_case_fact");
  });
  it("semantic choice guidance includes implicit appeals without imposing a turn quota", () => {
    const c = context("listen"), prompt = buildHeartPrompt(c, buildCasePrompt(c).user).system;
    expect(prompt).toContain("我连对不起都没说出口");
    expect(prompt).toContain("无需重大剧情分岔");
    expect(prompt).toContain("不按句数或每段结束硬造节点");
    expect(prompt).toContain("已经授权遥回答它");
    expect(prompt).toContain("即使只有1至2个节拍也合法");
    expect(prompt).toContain("不因遥可能作出承诺而倒推上一句普通道谢必须选牌");
    expect(prompt).not.toContain("审校时先核对");
    expect(prompt).not.toContain("通常choice_point=null");
  });
  it("configured AI also decides the opening and whether it needs a choice", async () => {
    let calls = 0;
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: async () => response(++calls === 1 ? draft() : { approved: true, reason: "none", issue: "" }) });
    const d = await p.generateHearts(context()); expect(calls).toBe(2); expect(d.debug.provider).toBe("deepseek"); expect(d.heart?.choicePoint).toBeNull();
  });
  it("self-directed grief is not sympathy and no reward is safer than blocking the dialogue", () => {
    const d = draft(); d.beats[0].line = "可那天，我冲她吼了那样的话。";
    d.pickup = { beat_index: 0, kind: "sympathy", quote: d.beats[0].line };
    expect(validateHeartDraft(d, context(), []).pickup).toBeNull();
  });
  it("unrequested evidence display is rejected in the pilot", () => {
    const d = draft(); d.beats[0].stage_direction = "从口袋里掏出两张车票。";
    expect(() => validateHeartDraft(d, context(), [])).toThrow("action_mismatch");
  });
  it("questions and implicit fear are no longer rejected by word or punctuation matching", () => {
    for (const line of ["我陪你待一会儿，好吗？", "是不是还没整理好?", "为什么不坐下来慢慢聊？", "怎么回事，你的手这么凉？", "先别走。让我缓一缓。", "你看起来很害怕。"]) {
      const d = draft("fear"); d.beats[0].line = line;
      expect(() => validateHeartDraft(d, context("fear"), [])).not.toThrow();
    }
  });
  it("player and NPC may alternate after a card, during opening, and during continuation", () => {
    const d = draft("fear"); d.beats.push({ speaker: "player", line: "好，我答应你，陪你一起整理。", stage_direction: "坐在她身边。", emotion: "关爱" });
    d.beats.push({ speaker: "npc", line: "那就先陪我坐坐吧。", stage_direction: "让开一点位置。", emotion: "柔和" });
    expect(validateHeartDraft(d, context("fear"), []).beats).toHaveLength(4);
    expect(validateHeartDraft(d, context("listen"), []).beats).toHaveLength(4);
    const opening = { ...d, beats: d.beats.slice(1), pickup: null };
    expect(() => validateHeartDraft(opening, context("opening"), [])).not.toThrow();
  });
  it("a choice must stop on its cited NPC line; ordinary questions need not trigger", () => {
    const d = draft(); d.choice_point = { quote: d.beats[0].line, reason: "小春希望知道遥如何看待自己" };
    expect(() => validateHeartDraft(d, context(), [])).not.toThrow();
    expect(() => validateHeartDraft({ ...d, can_continue: false }, context(), [])).toThrow("decision_point");
    expect(() => validateHeartDraft({ ...d, choice_point: { quote: "不存在", reason: "测试" } }, context(), [])).toThrow("decision_point");
    const answered = { ...d, beats: [...d.beats, { speaker: "player", line: "不会的。", stage_direction: "", emotion: "温柔" }] };
    expect(() => validateHeartDraft(answered, context(), [])).toThrow("decision_point");
    expect(() => validateHeartDraft({ ...answered, choice_point: null }, context(), [])).not.toThrow();
  });
  it("the AI prompt and reviewer explicitly allow questions, promises and free back-and-forth", async () => {
    const prompts: string[] = [];
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: async (_url, init) => {
      prompts.push(JSON.parse(String(init?.body)).messages[0].content);
      return response(prompts.length === 1 ? draft("fear") : { approved: true, reason: "none", issue: "" });
    } });
    await p.generateHearts(context("fear"));
    expect(prompts[0]).toContain("随后双方可自然交替接话"); expect(prompts[0]).toContain("口头承诺");
    expect(prompts[1]).toContain("问句、反问"); expect(prompts[1]).toContain("listen是顺着聊而非沉默");
    expect(prompts.join("\n")).not.toContain("首句不使用问句");
  });
});

describe("AI-selected decision-point service", () => {
  it("doesn't allow spending between choice points and preserves the point on reload", async () => {
    const { game, store, provider } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    expect(game.getState().currentDialogue?.heart?.choicePoint).not.toBeNull();
    await game.useHeart(null, game.getState().revision); await drain(game);
    const s = game.getState(); expect(s.currentDialogue?.heart?.choicePoint).toBeNull();
    await expect(game.useHeart(s.heartCards[0].id, s.revision)).rejects.toThrow("还没到需要选择");
    expect(new GameService(store, provider).getState()).toEqual(s);
    await game.useHeart(null, s.revision); expect(game.getState().heartCards).toEqual(s.heartCards);
  });
  it("a generated decision point becomes usable only after its last NPC beat", async () => {
    class Conversation extends CaseDialogueProvider {
      async generateHearts(c: HeartContext) {
        const d = mockHeartDialogue(c);
        d.continuations = [
          { speakerId: "player", line: "为什么这么说？", emotion: "关切" },
          { speakerId: c.npcId, line: "你会不会觉得这样的我很没用？", emotion: "不安" }
        ];
        d.heart!.choicePoint = { quote: "你会不会觉得这样的我很没用？", reason: "询问遥的情绪立场" };
        if (c.heartIntent !== "opening") d.heart!.pickups = [];
        return d;
      }
    }
    const { game, store, provider } = setup(new Conversation({ apiKey: "" })); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    let s = game.getState(); await expect(game.useHeart(s.heartCards[0].id, s.revision)).rejects.toThrow("请先看完");
    await game.nextDialogueBeat(s.revision);
    const restored = new GameService(store, provider); await drain(restored); s = restored.getState();
    await restored.useHeart(s.heartCards[0].id, s.revision);
    expect(restored.getState().currentDialogue?.continuations.some(b => b.speakerId === "player")).toBe(true);
    expect(restored.getState().eventLog.filter(e => e.type === "heart_spent")).toHaveLength(1);
  });
  it("old saved heart segments default to natural continuation, not invented decision points", () => {
    const c = context(), old = mockHeartDialogue(c) as any; delete old.heart.choicePoint;
    const state = GameStateSchema.parse({ ...c.state, currentDialogue: old });
    expect(state.currentDialogue?.heart?.choicePoint).toBeNull();
  });
});
