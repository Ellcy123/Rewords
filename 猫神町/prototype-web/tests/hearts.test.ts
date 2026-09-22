import { showSpeech, nextSpeech, drainPlayback } from "./playback.ts";
import { describe, expect, it } from "vitest";
import { DialogueResultSchema, GameStateSchema, legacyHeartKinds, type GameState } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider, DialogueGenerationError, buildCasePrompt } from "../server/src/caseProvider.ts";
import { buildHeartPrompt, heartResult, mockHeartDialogue, validateHeartDraft, type HeartContext } from "../server/src/heartDialogue.ts";
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
    { speaker: "npc", line: "我怕自己整理不好。", stage_direction: "", emotion: "恐惧" }
  ], can_continue: true, choice_point: { quote: "我怕自己整理不好。", reason: "小春想知道遥会怎样回应。" }, closing_reason: "", used_fact_ids: [], disclosed_fact_ids: [],
  progress: intent === "fear" ? { type: "action" as const, summary: "小春决定出示手中的车票" } : { type: "request" as const, summary: "小春要求遥回应她的担忧" },
  // Most fixed fixtures still exercise an executable NPC decision. E01 is initially held by 小春.
  consequence: intent === "fear" ? { type: "material" as const, actionId: "show:E01", beatIndex: 1, quote: "我怕自己整理不好" } : null,
  pickup: { beat_index: intent === "fear" ? 1 : 0, kind: "fear", quote: "我怕自己整理不好" } };
}
function response(data: unknown) { return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(data) } }] }), { status: 200 }); }

describe("拾绪首日服务闭环", () => {
  it("web test-pack mode starts with three of each, and reset starts a fresh pack", () => {
    const store = new MemoryGameStore();
    const game = new GameService(store, new CaseDialogueProvider({ apiKey: "" }), { heartTestPack: true });
    for (const state of [game.getState(), game.reset().state]) {
      expect(state.heartCards).toHaveLength(9);
      for (const kind of legacyHeartKinds) expect(state.heartCards.filter(c => c.kind === kind)).toHaveLength(3);
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
    const choices = s.eventLog.filter(e => e.type === "dialogue_choice");
    expect(choices.length).toBeGreaterThan(1);
    expect(choices.length).toBeLessThanOrEqual(5);
    expect(s.eventLog.filter(e => e.type === "dialogue_generated" && e.actorId === "player")).toHaveLength(choices.length);
    // A natural response is still generated from the current decision point;
    // it is not a second, choice-less AI segment.
    expect(s.eventLog.filter(e => e.type === "dialogue_continued")).toHaveLength(0);
    expect(s.eventLog.filter(e => e.type === "dialogue_generated").length).toBeLessThanOrEqual(24);
    expect(s.heartCards.map(c => c.kind)).toEqual(["fear", "affection"]);
    await expect(game.useHeart(null, s.revision)).rejects.toThrow("可出牌");
  });
  it("three attitudes run in sequence and only spend the chosen instance", async () => {
    const { game } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    for (const kind of legacyHeartKinds) {
      const s = game.getState(), card = s.heartCards.find(c => c.kind === kind)!;
      expect(card).toBeDefined(); await game.useHeart(card.id, s.revision); await drain(game);
    }
    expect(game.getState().eventLog.filter(e => e.type === "heart_spent").map(e => e.details.kind)).toEqual(legacyHeartKinds);
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

describe("拾绪可执行后果", () => {
  function playedDraft(c: HeartContext, consequence: { type: "material" | "sorting_offer" | "sorting_cancel" | "meeting" | "pause"; actionId: string | null; beatIndex: number; quote: string }, actionPlan: Record<string, unknown> | null = null) {
    const line = consequence.quote;
    return {
      action_plan: actionPlan, consequence,
      beats: [
        { speaker: "player", line: "我愿意听你把这件事说完。", stage_direction: "", emotion: "认真" },
        { speaker: "npc", line, stage_direction: "", emotion: "平静" }
      ],
      can_continue: consequence.type !== "pause",
      choice_point: consequence.type === "pause" ? null : { quote: line, reason: "小春等待遥对眼前决定的回应。" },
      closing_reason: consequence.type === "pause" ? "小春需要独处" : "",
      used_fact_ids: [], disclosed_fact_ids: [], progress: { type: "action", summary: "小春作出明确的现场决定" }, pickup: null
    };
  }
  class ConsequenceProvider extends CaseDialogueProvider {
    constructor(private readonly make: (c: HeartContext) => ReturnType<typeof playedDraft>) { super({ apiKey: "" }); }
    async generateHearts(c: HeartContext) {
      if (c.heartIntent === "opening") {
        const opening = draft(); opening.choice_point = { quote: "我怕自己整理不好", reason: "小春想知道遥会怎样回应。" };
        return heartResult(validateHeartDraft(opening, c, []), c, "mock");
      }
      try { return heartResult(validateHeartDraft(this.make(c), c, []), c, "mock"); }
      catch (error) { throw new Error("consequence fixture: " + (error as Error).message); }
    }
  }
  async function begin(provider: CaseDialogueProvider, prepare?: (state: GameState) => void) {
    const { store } = setup(provider), raw = store.load()!;
    prepare?.(raw); store.save(raw);
    const game = new GameService(store, provider);
    await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const card = game.getState().heartCards.find(c => c.kind === "fear")!;
    await game.useHeart(card.id, game.getState().revision);
    return { game, store };
  }

  it("allows a non-action turn and repairs an action label without an event consequence", () => {
    const c = context("fear");
    const nonAction = { ...draft("fear"), consequence: null, progress: { type: "request" as const, summary: "小春要求遥明确回应她的担忧" } };
    expect(validateHeartDraft(nonAction, c, []).consequence).toBeNull();
    const repaired = validateHeartDraft({ ...draft("fear"), consequence: null }, c, []);
    expect(repaired.consequence).toBeNull();
    expect(repaired.progress.type).toBe("decision");
    expect(validateHeartDraft({ ...draft(), consequence: undefined }, context(), []).consequence).toBeNull();
    const legacy = GameStateSchema.parse(createInitialState());
    expect(legacy.npcStates.npc_koharu.sortingHelp).toBe("available");
    expect(legacy.npcStates.npc_koharu.unavailableUntil).toBe(0);
  });

  it("accepts an empty consequence but still rejects a duplicate existing meeting consequence", () => {
    const c = context("fear"), samePlan = { type: "meet" as const, targetNpcId: "player" as const, locationId: "loc_station", arriveAt: 720, waitUntil: 780, reason: "继续交谈", quote: "下午一点在车站等你。", beatIndex: 1 };
    const empty = { ...draft("fear"), consequence: null, progress: { type: "request" as const, summary: "小春要求遥明确回应她的担忧" } };
    expect(validateHeartDraft(empty, c, []).consequence).toBeNull();
    c.state.npcStates.npc_koharu.actionPlan = { ...samePlan, id: "existing", sourceEventId: "old", status: "planned" };
    const repeated = { ...draft("fear"), action_plan: samePlan, beats: [draft("fear").beats[0], { speaker: "npc", line: samePlan.quote, stage_direction: "", emotion: "平静" }],
      choice_point: { quote: samePlan.quote, reason: "小春等待遥对约定的回应。" },
      consequence: { type: "meeting", actionId: null, beatIndex: 1, quote: samePlan.quote } };
    expect(() => validateHeartDraft(repeated, c, [])).toThrow("invalid_consequence");
  });

  it("does not offer an empty sorting activity after every material is already known", () => {
    const c = context("fear");
    c.state.evidenceJournal.push({ id: "E01", name: "车票", text: "已看过。", source: "测试", day: 1 });
    expect(() => validateHeartDraft(playedDraft(c, { type: "sorting_offer", actionId: null, beatIndex: 1, quote: "我们一起整理姐姐留下的东西吧。" }), c, [])).toThrow("invalid_consequence");
  });

  it("legacy saved heart dialogue without a consequence remains finishable and defaults to no pending settlement", async () => {
    const { game, store, provider } = setup(); await game.startHeartEncounter(game.getState().revision);
    const saved = store.load()!, old = saved.currentDialogue!.heart as Record<string, unknown>;
    delete old.consequence; delete old.spendEventId; delete old.consequenceApplied;
    store.save(saved);
    const restored = new GameService(store, provider);
    expect(restored.getState().currentDialogue?.heart).toMatchObject({ consequence: null, spendEventId: null, consequenceApplied: false });
    await restored.completeEncounter(); expect(restored.getState().phase).toBe("location");
  });

  it("a missing consequence still spends the card and never creates a pending event lock", async () => {
    class MissingProvider extends CaseDialogueProvider {
      async generateHearts(c: HeartContext) {
        if (c.heartIntent === "opening") return mockHeartDialogue(c);
        const raw = playedDraft(c, { type: "sorting_offer", actionId: null, beatIndex: 1, quote: "我们一起整理姐姐留下的东西吧。" });
        raw.consequence = null as never;
        raw.progress = { type: "request", summary: "小春要求遥决定是否继续留下" };
        return heartResult(raw as ReturnType<typeof playedDraft>, c, "mock");
      }
    }
    const { game, store } = setup(new MissingProvider({ apiKey: "" })); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const before = game.getState(), card = before.heartCards[0];
    const preview = await game.previewHeart(card.id, before.revision);
    expect(preview.line).toBeTruthy();
    expect(game.getState()).toEqual(before);
    await game.useHeart(card.id, before.revision, preview.id);
    const after = game.getState();
    expect(after.heartCards.some(c => c.id === card.id)).toBe(false);
    expect(after.currentDialogue?.heart).toMatchObject({ consequence: null, consequenceApplied: false });
    expect(after.eventLog.filter(e => e.type === "heart_consequence")).toHaveLength(0);
    expect(after.eventLog.find(e => e.type === "heart_spent")?.details.consequence).toBe("none");
    expect(game.getHeartObservations()[0]?.attempts).toContainEqual(expect.objectContaining({ cardId: card.id, status: "continued" }));
    expect(store.load()?.revision).toBe(after.revision);
    await expect(game.completeEncounter()).resolves.toMatchObject({ state: { phase: "location" } });
  });

  it("spends at the visible player expression, then applies a material only at its NPC decision and persists the linkage", async () => {
    const provider = new ConsequenceProvider(() => playedDraft({} as HeartContext, { type: "material", actionId: "take:E01", beatIndex: 1, quote: "这张车票你先拿着。" }));
    const { game, store } = await begin(provider, s => s.evidenceJournal.push({ id: "E01", name: "车票", text: "已先行查看。", source: "测试", day: 1 })), afterSpend = game.getState();
    const heart = afterSpend.currentDialogue!.heart!;
    expect(heart.spendEventId).toBeTruthy(); expect(heart.consequenceApplied).toBe(false);
    expect(afterSpend.itemOwners.E01).toBe("npc_koharu");
    await expect(game.completeEncounter()).rejects.toThrow("后果尚未播放");
    const restored = new GameService(store, provider); expect(restored.getState().currentDialogue?.heart).toMatchObject({ spendEventId: heart.spendEventId, consequenceApplied: false });
    await nextSpeech(restored);
    const applied = restored.getState(), event = applied.eventLog.findLast(e => e.type === "heart_consequence")!;
    expect(applied.itemOwners.E01).toBe("player"); expect(applied.evidenceJournal.some(e => e.id === "E01")).toBe(true);
    expect(applied.currentDialogue?.heart?.consequenceApplied).toBe(true);
    expect(event.details).toMatchObject({ sourceEventId: applied.eventLog.findLast(e => e.type === "dialogue_generated" && e.actorId === "npc_koharu")!.id, spendEventId: heart.spendEventId, consequenceType: "material" });
  });

  it("sorting offer is applied by NPC speech, survives reload, and consumes 30 minutes to inspect held materials without transfer", async () => {
    const provider = new ConsequenceProvider(() => playedDraft({} as HeartContext, { type: "sorting_offer", actionId: null, beatIndex: 1, quote: "我们一起整理姐姐留下的东西吧。" }));
    const { game, store } = await begin(provider); await nextSpeech(game);
    expect(game.getState().npcStates.npc_koharu.sortingHelp).toBe("offered");
    const restored = new GameService(store, provider), before = restored.getState().currentMinute;
    await restored.completeHeartActivity(restored.getState().revision);
    const after = restored.getState();
    expect(after.currentMinute).toBe(before + 30); expect(after.npcStates.npc_koharu.sortingHelp).toBe("completed");
    expect(after.evidenceJournal.some(e => e.id === "E01")).toBe(true); expect(after.itemOwners.E01).toBe("npc_koharu");
    expect(after.eventLog.some(e => e.type === "heart_activity")).toBe(true);
    await expect(restored.completeHeartActivity(before)).rejects.toThrow("进度已变化");
    await expect(restored.completeHeartActivity(restored.getState().revision)).rejects.toThrow("没有可执行的整理邀请");
  });

  it("sorting cancellation is legal only for an outstanding offer and closes the activity", async () => {
    const provider = new ConsequenceProvider(() => playedDraft({} as HeartContext, { type: "sorting_cancel", actionId: null, beatIndex: 1, quote: "这次还是先别整理了。" }));
    const { game } = await begin(provider, s => { s.npcStates.npc_koharu.sortingHelp = "offered"; }); await nextSpeech(game);
    expect(game.getState().npcStates.npc_koharu.sortingHelp).toBe("cancelled");
    await expect(game.completeHeartActivity(game.getState().revision)).rejects.toThrow("没有可执行的整理邀请");
  });

  it("meeting and pause require their anchored NPC decision; pause blocks another meeting for sixty game minutes", async () => {
    const meeting = { type: "meet" as const, targetNpcId: "player" as const, locationId: "loc_station", arriveAt: 780, waitUntil: 840, reason: "继续谈姐姐的遗物", quote: "明天一点在车站等你。", beatIndex: 1 };
    const meetingProvider = new ConsequenceProvider(() => playedDraft({} as HeartContext, { type: "meeting", actionId: null, beatIndex: 1, quote: meeting.quote }, meeting));
    const { game: meetingGame } = await begin(meetingProvider); await nextSpeech(meetingGame);
    expect(meetingGame.getState().npcStates.npc_koharu.actionPlan).toMatchObject({ locationId: "loc_station", arriveAt: 780, status: "planned" });

    const pauseProvider = new ConsequenceProvider(() => playedDraft({} as HeartContext, { type: "pause", actionId: null, beatIndex: 1, quote: "今天先别聊了，我想一个人待会儿。" }));
    const { game: pauseGame } = await begin(pauseProvider); await nextSpeech(pauseGame);
    const paused = pauseGame.getState(), until = paused.npcStates.npc_koharu.unavailableUntil;
    expect(until).toBe((paused.day - 1) * 1440 + paused.currentMinute + 60);
    await pauseGame.completeEncounter();
    expect(() => pauseGame.startEncounter("npc_koharu")).toThrow("能交谈");
    pauseGame.wait(60); pauseGame.startEncounter("npc_koharu");
    expect(pauseGame.getState().activeNpcId).toBe("npc_koharu");
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
  it("a real new interaction keeps past dialogue as history instead of a playback cursor", async () => {
    const { game } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const oldLine = game.getState().currentDialogue!.line;
    await game.completeEncounter(); game.startEncounter("npc_koharu");
    // Choosing an NPC is deliberately only a preview now; the new dialogue boundary
    // is created when the player actually commits to 拾绪.
    expect(game.getState().currentDialogue).toBeNull();
    await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const c: HeartContext = { ...context("opening"), state: game.getState() };
    const p = buildHeartPrompt(c, buildCasePrompt(c).user), input = JSON.parse(p.user);
    expect(input.first_meeting).toBe(false);
    expect(input.dialogue_history.played_this_encounter.length).toBeGreaterThan(0);
    expect(input.dialogue_history.continuation).toMatchObject({ mode: "new_encounter" });
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
  it("legacy pickup veto is ignored without a rewrite, while the reviewer never receives pickup state", async () => {
    let calls = 0; const prompts: string[] = [];
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: async (_url, options) => {
      prompts.push(String(options?.body)); calls++;
      return response(calls === 1 ? draft() : { approved: false, reason: "invalid_pickup", issue: "旧审校：quote需要体现恐惧" });
    } });
    const result = await p.generateHearts(context("listen")); expect(calls).toBe(2);
    const payload = JSON.parse(JSON.parse(prompts[1]).messages[1].content);
    expect(payload.context).not.toHaveProperty("already_gathered");
    expect(payload.candidate).not.toHaveProperty("pickup");
    expect(result.heart?.pickups).toEqual([{ beatIndex: 0, kind: "fear", quote: "我怕自己整理不好" }]);
  });
  it.each([false, true])("content reviewer cannot veto the generator's choice timing (has point: %s)", async hasPoint => {
    const question = "要是那天我没吼她，她是不是就不会走那条路？";
    const missed = { ...draft(), pickup: null, beats: [
      { speaker: "npc", line: question, stage_direction: "低下头。", emotion: "自责" },
      { speaker: "player", line: "那不是你的错。", stage_direction: "", emotion: "温柔" },
      { speaker: "npc", line: "……今天先说到这儿吧。", stage_direction: "", emotion: "克制" }
    ] };
    const generated = hasPoint
      ? { ...missed, beats: missed.beats.slice(0, 1), can_continue: true, choice_point: { quote: question, reason: "她在自责中寻求遥的回应，不同态度会改变交流" } }
      : { ...missed, can_continue: false, choice_point: null, closing_reason: "小春今天先收住这段谈话。" };
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
  it("continuation starts with the other speaker instead of answering the previous beat itself", () => {
    const c = context("listen");
    const event = (id: string, type: "encounter_started" | "dialogue_generated", actorId: string, text: string) => ({
      id, sequence: c.state.eventLog.length, day: c.state.day, minute: c.state.currentMinute, period: c.state.period,
      type, actorId, targetId: "npc_koharu", itemId: null, locationId: c.state.currentLocationId,
      audience: ["player", "npc_koharu"], details: { text, line: text }
    });
    c.state.eventLog.push(event("turn_start", "encounter_started", "player", "开始会面。"));
    c.state.eventLog.push(event("turn_npc", "dialogue_generated", "npc_koharu", "你怎么总能把话说到我接不住。"));
    expect(() => validateHeartDraft({ ...draft(), pickup: null }, c, [])).toThrow("turn_order");
    const playerReplies = { ...draft(), pickup: null, beats: [
      { speaker: "player", line: "那我换个你接得住的说法。", stage_direction: "", emotion: "轻松" },
      { speaker: "npc", line: "你先说说看。", stage_direction: "", emotion: "好奇" }
    ], choice_point: { quote: "你先说说看。", reason: "小春等待遥继续说明。" } };
    expect(() => validateHeartDraft(playerReplies, c, [])).not.toThrow();
    c.state.eventLog.at(-1)!.actorId = "player";
    expect(() => validateHeartDraft({ ...draft(), pickup: null }, c, [])).not.toThrow();
    const prompt = buildHeartPrompt(c, buildCasePrompt(c).user).system;
    expect(prompt).toContain("上一拍是player，本次beats[0]必须是npc");
    expect(prompt).toContain("绝不能让同一角色在新段开头接着回应自己的上一句");
  });
  it("configured AI retries a cross-segment self-answer with an explicit turn-order repair", async () => {
    const c = context("listen");
    c.state.eventLog.push({
      id: "turn_start", sequence: 0, day: c.state.day, minute: c.state.currentMinute, period: c.state.period,
      type: "encounter_started", actorId: "player", targetId: "npc_koharu", itemId: null, locationId: "loc_shrine",
      audience: ["player", "npc_koharu"], details: { text: "开始会面。" }
    }, {
      id: "turn_npc", sequence: 1, day: c.state.day, minute: c.state.currentMinute, period: c.state.period,
      type: "dialogue_generated", actorId: "npc_koharu", targetId: "npc_koharu", itemId: null, locationId: "loc_shrine",
      audience: ["player", "npc_koharu"], details: { text: "你刚才那句话，我还在想。" }
    });
    const corrected = { ...draft(), pickup: null, beats: [
      { speaker: "player", line: "那我先把话说慢一点。", stage_direction: "", emotion: "耐心" },
      { speaker: "npc", line: "好，我听着。", stage_direction: "", emotion: "平静" }
    ], choice_point: { quote: "好，我听着。", reason: "小春等待遥继续说明。" } };
    const requests: string[] = [];
    const p = new CaseDialogueProvider({ apiKey: "test", maxAttempts: 2, fetchImpl: async (_url, init) => {
      requests.push(String(init?.body));
      return response(requests.length === 1 ? draft() : requests.length === 2 ? corrected : { approved: true, reason: "none", issue: "" });
    } });
    const result = await p.generateHearts(c);
    expect(requests).toHaveLength(3);
    expect(requests[1]).toContain("turn_order");
    expect(requests[1]).toContain("上一拍npc则beats[0]=player");
    expect(result.debug.provider).toBe("deepseek");
    expect(result.speakerId).toBe("player");
  });
  it("configured AI also decides the opening and whether it needs a choice", async () => {
    let calls = 0;
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: async () => response(++calls === 1 ? draft() : { approved: true, reason: "none", issue: "" }) });
    const d = await p.generateHearts(context()); expect(calls).toBe(2); expect(d.debug.provider).toBe("deepseek"); expect(d.heart?.choicePoint).not.toBeNull();
  });
  it("semantic authority accepts an implicit sympathy pickup, while the prompt keeps pure self-blame as a boundary", () => {
    const d = draft(); d.beats[0].line = "可那天，我冲她吼了那样的话。"; d.choice_point!.quote = d.beats[0].line;
    d.pickup = { beat_index: 0, kind: "sympathy", quote: d.beats[0].line };
    // Classification is generator authority: provenance, NPC ownership and quota are all valid here.
    expect(validateHeartDraft(d, context(), []).pickup).toEqual(d.pickup);
    const prompt = buildHeartPrompt(context(), buildCasePrompt(context()).user).system;
    expect(prompt).toContain("纯粹悲伤、自责不自动等于体谅别人的sympathy");
    expect(prompt).toContain("语义依据可结合上下文");
  });
  it("unrequested evidence display is rejected in the pilot", () => {
    const d = draft(); d.beats[0].stage_direction = "从口袋里掏出两张车票。";
    expect(() => validateHeartDraft(d, context(), [])).toThrow("action_mismatch");
  });
  it("questions and implicit fear are no longer rejected by word or punctuation matching", () => {
    for (const line of ["我陪你待一会儿，好吗？", "是不是还没整理好?", "为什么不坐下来慢慢聊？", "怎么回事，你的手这么凉？", "先别走。让我缓一缓。", "你看起来很害怕。"]) {
      const d = draft("fear"); d.beats[1].line = line; d.choice_point!.quote = line;
      d.consequence = null; d.pickup = null; d.progress = { type: "request", summary: "小春要求遥回应眼前的担忧" };
      expect(() => validateHeartDraft(d, context("fear"), [])).not.toThrow();
    }
  });
  it("validates only NPC/source/index/quota safeguards for an implicit pickup", () => {
    const c = context();
    const implicit = { ...draft(), pickup: { beat_index: 0, kind: "affection", quote: "我怕自己整理不好" } };
    expect(validateHeartDraft(implicit, c, []).pickup).toEqual(implicit.pickup);
    expect(() => validateHeartDraft({ ...implicit, pickup: { ...implicit.pickup!, beat_index: 1 } }, c, [])).toThrow("invalid_pickup");
    expect(() => validateHeartDraft({ ...implicit, pickup: { ...implicit.pickup!, quote: "不存在的来源" } }, c, [])).toThrow("invalid_pickup");
    c.state.heartSession!.claimedKinds.push("affection");
    expect(() => validateHeartDraft(implicit, c, [])).toThrow("invalid_pickup");
  });
  it("player and NPC may alternate after a card, during opening, and during continuation", () => {
    const d = draft("fear"); d.beats.push({ speaker: "player", line: "好，我答应你，陪你一起整理。", stage_direction: "坐在她身边。", emotion: "关爱" });
    d.beats.push({ speaker: "npc", line: "那就先陪我坐坐吧。", stage_direction: "让开一点位置。", emotion: "柔和" });
    d.choice_point = { quote: d.beats.at(-1)!.line, reason: "小春等待遥回应眼前的陪伴。" };
    expect(validateHeartDraft(d, context("fear"), []).beats).toHaveLength(4);
    expect(validateHeartDraft(d, context("listen"), []).beats).toHaveLength(4);
    const opening = { ...d, beats: d.beats.slice(1), pickup: null, consequence: null,
      progress: { type: "request" as const, summary: "小春要求遥回应眼前的担忧" } };
    opening.choice_point = { quote: opening.beats.at(-1)!.line, reason: "小春等待遥回应眼前的陪伴。" };
    expect(() => validateHeartDraft(opening, context("opening"), [])).not.toThrow();
  });
  it("a choice must stop on its cited NPC line; ordinary questions need not trigger", () => {
    const d = draft(); d.choice_point = { quote: d.beats.at(-1)!.line, reason: "小春希望知道遥如何看待自己" };
    expect(() => validateHeartDraft(d, context(), [])).not.toThrow();
    expect(() => validateHeartDraft({ ...d, can_continue: false }, context(), [])).toThrow("decision_point");
    expect(() => validateHeartDraft({ ...d, choice_point: { quote: "不存在", reason: "测试" } }, context(), [])).toThrow("decision_point");
    const answered = { ...d, beats: [...d.beats, { speaker: "player", line: "不会的。", stage_direction: "", emotion: "温柔" }] };
    expect(() => validateHeartDraft(answered, context(), [])).toThrow("decision_point");
    expect(() => validateHeartDraft({ ...answered, choice_point: null }, context(), [])).toThrow("decision_point");
  });
  it("only accepts a real choice point or an NPC-led closing, with at most twelve beats", () => {
    const open = draft();
    expect(() => validateHeartDraft({ ...open, choice_point: null }, context(), [])).toThrow("decision_point");

    const closed = {
      ...open,
      pickup: null,
      can_continue: false,
      choice_point: null,
      closing_reason: "小春需要独处，今天先把话收住。",
      progress: { type: "transition" as const, summary: "小春收起当前话题并结束会面" }
    };
    expect(validateHeartDraft(closed, context(), []).can_continue).toBe(false);

    const tooLong = {
      ...open,
      beats: Array.from({ length: 13 }, (_, index) => ({
        speaker: index % 2 ? "npc" : "player",
        line: `第${index + 1}句继续说下去。`,
        stage_direction: "",
        emotion: "平静"
      }))
    };
    expect(() => validateHeartDraft(tooLong, context(), [])).toThrow();
  });
  it("rejects a generated continuation that has no choice point", () => {
    expect(() => validateHeartDraft({ ...draft(), can_continue: true, choice_point: null }, context(), [])).toThrow("decision_point");
  });
  it("rejects a disclosure anchored to a player beat", () => {
    const d = draft("fear");
    d.used_fact_ids = ["F02"];
    d.disclosed_fact_ids = ["F02"];
    d.disclosures = [{ fact_id: "F02", beat_index: 0 }];
    expect(() => validateHeartDraft(d, context("fear"), ["F02"])).toThrow("unknown_fact");
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
  it("plays all twelve generated beats without regenerating on nextBeat", async () => {
    class TwelveBeatProvider extends CaseDialogueProvider {
      calls = 0;
      async generateHearts(c: HeartContext) {
        this.calls++;
        const beats = Array.from({ length: 12 }, (_, index) => ({
          speakerId: index === 11 || index % 2 === 0 ? c.npcId : "player",
          line: `第${index + 1}拍，我们把眼前的话继续说清楚。`,
          emotion: "平静"
        }));
        return DialogueResultSchema.parse({
          speakerId: beats[0].speakerId,
          line: beats[0].line,
          emotion: beats[0].emotion,
          continuations: beats.slice(1),
          options: [],
          heart: { canContinue: false, choicePoint: null, actionPlan: null, consequence: null, pickups: [] },
          debug: { provider: "mock", decision: "测试十二拍自然收尾", usedFacts: [], disclosedFacts: [], disclosures: [] }
        });
      }
    }
    const provider = new TwelveBeatProvider({ apiKey: "" }), { game } = setup(provider);
    await game.startHeartEncounter(game.getState().revision);
    expect(provider.calls).toBe(1);
    expect(game.getState().currentDialogue?.continuations).toHaveLength(11);
    for (let beatIndex = 1; beatIndex < 12; beatIndex++) {
      const revision = game.getState().revision;
      await game.nextDialogueBeat(revision);
      expect(provider.calls).toBe(1);
      expect(game.getState().dialogueBeatIndex).toBe(beatIndex);
    }
    expect(game.getState().eventLog.filter(e => e.type === "dialogue_generated")).toHaveLength(12);
  });

  it("natural continuation reaches the next choice point and preserves it on reload", async () => {
    const { game, store, provider } = setup(); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    expect(game.getState().currentDialogue?.heart?.choicePoint).not.toBeNull();
    await game.useHeart(null, game.getState().revision); await drain(game);
    const s = game.getState();
    expect(s.currentDialogue?.heart?.canContinue).toBe(true);
    expect(s.currentDialogue?.heart?.choicePoint).not.toBeNull();
    expect(new GameService(store, provider).getState()).toEqual(s);
    await game.useHeart(s.heartCards[0].id, s.revision);
    expect(game.getState().heartCards).toHaveLength(s.heartCards.length - 1);
  });
  it("a generated decision point becomes usable only after its last NPC beat", async () => {
    class Conversation extends CaseDialogueProvider {
      async generateHearts(c: HeartContext) {
        const d = mockHeartDialogue(c);
        d.continuations = [
          { speakerId: "player", line: "为什么这么说？", emotion: "关切" },
          { speakerId: c.npcId, line: "你会不会觉得这样的我很没用？", emotion: "不安" }
        ];
        // This subclass replaces the mock's NPC beat: only an actual card play needs a new anchored consequence.
        d.heart!.consequence = c.heartIntent === "opening" ? null : { type: "material", actionId: "show:E01", beatIndex: 2, quote: "你会不会觉得这样的我很没用？" };
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
