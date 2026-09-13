import { describe, expect, it, vi } from "vitest";
import { demoBootstrap, heartKinds, type DialogueResult, type GameState, type HeartDirectorInput, type HeartDirectorResult } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { buildHeartDirectorInput, offlineHeartRecommendations, validateHeartRecommendations } from "../server/src/heartDirector.ts";
import { mockHeartDialogue, type HeartContext } from "../server/src/heartDialogue.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { nextSpeech, showSpeech } from "./playback.ts";

class DirectorProvider extends CaseDialogueProvider {
  directorCalls = 0;
  failDirector = false;
  async directHearts(input: HeartDirectorInput): Promise<HeartDirectorResult> {
    this.directorCalls++;
    if (this.failDirector) throw new Error("director unavailable");
    return { ...offlineHeartRecommendations(input), status: "ai" };
  }
}

class NineKindsProvider extends CaseDialogueProvider {
  async generateHearts(context: HeartContext): Promise<DialogueResult> {
    if (context.heartIntent === "opening") return mockHeartDialogue(context);
    if (context.heartIntent === "listen") return mockHeartDialogue(context);
    const kind = context.heartIntent;
    return {
      speakerId: "player", line: `我带着「${kind}」把这句话说清楚。`, stageDirection: "", emotion: kind,
      continuations: [{ speakerId: context.npcId, line: "今天先到这里，我想自己安静一会儿。", stageDirection: "", emotion: "平静" }],
      options: [], heart: { canContinue: false, choicePoint: null, actionPlan: null,
        consequence: { type: "pause", actionId: null, beatIndex: 1, quote: "今天先到这里，我想自己安静一会儿。" },
        spendEventId: null, consequenceApplied: false, pickups: [] },
      debug: { provider: "mock", decision: "test", usedFacts: [], promptVersion: "test", npcActionId: "none" }
    };
  }
}

class CaseActionProvider extends CaseDialogueProvider {
  constructor(private readonly action: "retract" | "write" | "protect" | "supplement") { super({ apiKey: "" }); }
  async generateHearts(context: HeartContext): Promise<DialogueResult> {
    if (context.heartIntent === "opening") return mockHeartDialogue(context);
    const line = `我会执行${this.action}，但要等我亲口作出这个决定。`;
    return {
      speakerId: "player", line: "请把已经能做的事落实。", stageDirection: "", emotion: "认真",
      continuations: [{ speakerId: context.npcId, line, stageDirection: "", emotion: "平静" }], options: [],
      heart: { canContinue: true, choicePoint: { quote: line, reason: "等待下一次表态" }, actionPlan: null,
        consequence: { type: "case_action", actionId: this.action, beatIndex: 1, quote: line },
        spendEventId: null, consequenceApplied: false, pickups: [] },
      debug: { provider: "mock", decision: "test", usedFacts: [], promptVersion: "test", npcActionId: "none" }
    };
  }
}

async function atHeartChoice(provider = new DirectorProvider({ apiKey: "" })) {
  const store = new MemoryGameStore();
  const game = new GameService(store, provider, { heartTestPack: true });
  game.travel("loc_shrine"); game.startEncounter("npc_koharu");
  await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
  return { game, store, provider };
}

describe("心绪导演的公共输入与节点缓存", () => {
  it("只投影已播的公开上下文，不夹带私密记忆、未来台词或源卡私密文本", async () => {
    const { game, store } = await atHeartChoice();
    const raw = store.load()!;
    raw.npcStates.npc_koharu.memories.push({ id: "secret", npcId: "npc_koharu", kind: "dialogue", summary: "绝不能发送的私密记忆", interpretation: "秘密", sourceEventId: "hidden", createdDay: 1, confidence: "certain", importance: 9, tags: [] });
    raw.heartCards[0]!.sourceText = "绝不能发送的源卡私密文本";
    raw.currentDialogue!.continuations.push({ speakerId: "npc_koharu", line: "绝不能发送的未来对白", stageDirection: "", emotion: "平静" });
    store.save(raw);
    const restored = new GameService(store, new DirectorProvider({ apiKey: "" }), { heartTestPack: true });
    const input = buildHeartDirectorInput(restored.getState());
    const encoded = JSON.stringify(input);
    expect(encoded).not.toContain("私密记忆");
    expect(encoded).not.toContain("源卡私密文本");
    expect(encoded).not.toContain("未来对白");
    expect(input.played.length).toBeGreaterThan(0);
    expect(input.played.every(beat => beat.eventId.startsWith("event_"))).toBe(true);
    // getState remains a public projection even if a legacy save has private fields.
    expect(game.getState().npcStates.npc_koharu.memories.some(m => m.summary.includes("私密"))).toBe(false);
  });

  it("拒绝未持有牌、伪造锚点和目录外行动，离线推荐只指向本节点已播内容", async () => {
    const { game } = await atHeartChoice();
    const input = buildHeartDirectorInput(game.getState());
    const valid = offlineHeartRecommendations(input);
    expect(validateHeartRecommendations(valid, input)).toEqual(valid.recommendations);
    for (const change of [
      { kind: "joy" }, { anchorEventId: "future_event" }, { actionId: "take:invented" }
    ]) {
      const recommendations = valid.recommendations.map((rec, index) => index ? rec : { ...rec, ...change });
      expect(() => validateHeartRecommendations({ ...valid, recommendations }, input)).toThrow("invalid_recommendation");
    }
    expect(valid.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(valid.recommendations.every(r => input.played.some(p => p.eventId === r.anchorEventId))).toBe(true);
  });

  it("同一已播节点并发只请求一次且完全只读；配置失败降级后也不重复调用", async () => {
    const provider = new DirectorProvider({ apiKey: "" });
    const { game, store } = await atHeartChoice(provider);
    const before = game.getState(), saved = store.load();
    const [first, second] = await Promise.all([game.recommendHearts(before.revision), game.recommendHearts(before.revision)]);
    expect(first).toEqual(second); expect(provider.directorCalls).toBe(1);
    expect(game.getState()).toEqual(before); expect(store.load()).toEqual(saved);
    expect(await game.recommendHearts(before.revision)).toEqual(first);
    expect(provider.directorCalls).toBe(1);

    const failing = new DirectorProvider({ apiKey: "" }); failing.failDirector = true;
    const fixture = await atHeartChoice(failing);
    const unavailable = await fixture.game.recommendHearts(fixture.game.getState().revision);
    expect(unavailable.status).toBe("unavailable");
    await fixture.game.recommendHearts(fixture.game.getState().revision);
    expect(failing.directorCalls).toBe(1);
  });

  it("推荐不跨节点或重启恢复；进度变化后的旧请求失效", async () => {
    const provider = new DirectorProvider({ apiKey: "" });
    const { game, store } = await atHeartChoice(provider);
    const revision = game.getState().revision;
    await game.recommendHearts(revision);
    expect(game.getHeartObservations()[0]?.director).not.toBeNull();
    const restored = new GameService(store, provider, { heartTestPack: true });
    expect(restored.getHeartObservations()).toEqual([]);
    await game.useHeart(null, revision);
    await expect(game.recommendHearts(revision)).rejects.toThrow("进度已变化");
  });

  it("reset 期间延后返回的导演建议也不能因 revision 重合写回新会话", async () => {
    let release!: () => void;
    class DelayedDirector extends DirectorProvider {
      async directHearts(input: HeartDirectorInput): Promise<HeartDirectorResult> {
        this.directorCalls++;
        await new Promise<void>(resolve => { release = resolve; });
        return { ...offlineHeartRecommendations(input), status: "ai" };
      }
    }
    const provider = new DelayedDirector({ apiKey: "" });
    const { game } = await atHeartChoice(provider);
    const revision = game.getState().revision;
    const stale = game.recommendHearts(revision);
    game.reset();
    release();
    await expect(stale).rejects.toThrow("进度已变化");
    expect(game.getHeartObservations()).toEqual([]);
  });

  it("真实 directHearts 仅一次假请求，发送的载荷无秘密/未来内容，失败不重试", async () => {
    const { game, store } = await atHeartChoice();
    const raw = store.load()!;
    raw.heartCards[0]!.sourceText = "导演绝不能收到的源卡私密文本";
    raw.npcStates.npc_koharu.memories.push({ id: "private", npcId: "npc_koharu", kind: "dialogue", summary: "导演绝不能收到的私密记忆", interpretation: "秘密", sourceEventId: "private", createdDay: 1, confidence: "certain", importance: 9, tags: [] });
    raw.currentDialogue!.continuations.push({ speakerId: "npc_koharu", line: "导演绝不能收到的未来台词", stageDirection: "", emotion: "平静" });
    store.save(raw);
    const input = buildHeartDirectorInput(new GameService(store, new CaseDialogueProvider({ apiKey: "" })).getState());
    const response = { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ recommendations: offlineHeartRecommendations(input).recommendations }) } }] };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(response), { status: 200 })) as unknown as typeof fetch;
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, review: false });
    const result = await provider.directHearts(input);
    expect(result.status).toBe("ai"); expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body));
    const userPayload = body.messages[1].content as string;
    expect(userPayload).not.toContain("私密记忆"); expect(userPayload).not.toContain("源卡私密文本"); expect(userPayload).not.toContain("未来台词");

    const failedFetch = vi.fn(async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    const failed = new CaseDialogueProvider({ apiKey: "test", fetchImpl: failedFetch, review: false });
    expect((await failed.directHearts(input)).status).toBe("unavailable");
    expect(failedFetch).toHaveBeenCalledTimes(1);
  });

  it("千代说“不信/相信”不会把未介绍的E03信件泄露给导演；明确指代或已读才可见", () => {
    const state = createInitialState();
    state.phase = "encounter"; state.interactionMode = "talk"; state.activeNpcId = "npc_chiyo"; state.currentLocationId = "loc_inn";
    state.heartSession = { id: "letter-node", claimedKinds: [] };
    state.heartCards = [{ id: "fear", kind: "fear", sourceNpcId: "npc_chiyo", sourceEventId: "seed", sourceText: "已获得", day: 1, locationId: "loc_inn" }];
    const context: HeartContext = { state, npcId: "npc_chiyo", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: "opening" };
    state.currentDialogue = mockHeartDialogue(context);
    const setPlayed = (text: string) => {
      state.eventLog = [{ id: "played", sequence: 0, day: 1, minute: state.currentMinute, period: state.period, type: "dialogue_generated",
        actorId: "npc_chiyo", targetId: "npc_chiyo", itemId: null, locationId: "loc_inn", audience: ["player", "npc_chiyo"], details: { text } }];
    };
    setPlayed("我不信你会理解。你要是相信，就先听我说完。");
    expect(buildHeartDirectorInput(state).actions.some(action => action.id === "show:E03")).toBe(false);
    setPlayed("这封信我一直留着，你可以先看原信。");
    expect(buildHeartDirectorInput(state).actions.some(action => action.id === "show:E03")).toBe(true);
    setPlayed("我不信你会理解。");
    state.evidenceJournal.push({ id: "E03", name: "信", text: "已读", source: "测试", day: 1 });
    expect(buildHeartDirectorInput(state).actions.some(action => action.id === "take:E03")).toBe(true);
  });
});

describe("九种心绪的预览、消费与观察记录", () => {
  it.each(demoBootstrap.npcs.flatMap(npc => heartKinds.map(kind => [npc.id, kind] as const)))("%s 的 %s 可独立预览并消费；后果只在NPC决定台词播放后应用", async (npcId, kind) => {
    const provider = new NineKindsProvider({ apiKey: "" });
    const store = new MemoryGameStore();
    new GameService(store, provider);
    const rawStart = store.load()!;
    const locationId = rawStart.npcStates[npcId].currentLocationId;
    if (!rawStart.discoveredLocationIds.includes(locationId)) rawStart.discoveredLocationIds.push(locationId);
    store.save(rawStart);
    const game = new GameService(store, provider);
    game.travel(locationId); game.startEncounter(npcId);
    await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const raw = store.load()!;
    raw.heartCards = [{ id: `test_${kind}`, kind, sourceType: "test", sourceNpcId: "system_test", sourceEventId: "seed", sourceText: "不应泄露给导演", day: 1, locationId: null }];
    store.save(raw);
    const resumed = new GameService(store, provider);
    const before = resumed.getState();
    const preview = await resumed.previewHeart(`test_${kind}`, before.revision);
    expect(preview.line).toContain(kind);
    expect(resumed.getHeartObservations()[0]?.attempts).toContainEqual(expect.objectContaining({ cardId: `test_${kind}`, status: "validated" }));
    await resumed.useHeart(`test_${kind}`, before.revision, preview.id);
    expect(resumed.getHeartObservations()[0]?.attempts).toContainEqual(expect.objectContaining({ cardId: `test_${kind}`, status: "waiting_playback" }));
    expect(resumed.getState().npcStates[npcId].unavailableUntil).toBe(0);
    await nextSpeech(resumed);
    expect(resumed.getState().npcStates[npcId].unavailableUntil).toBeGreaterThan(0);
    expect(resumed.getHeartObservations()[0]?.attempts).toContainEqual(expect.objectContaining({ cardId: `test_${kind}`, status: "applied" }));
  });
});

describe("案件行动沿用既有前置，并在NPC决定台词播放时才落地", () => {
  const cases = [
    { action: "retract" as const, npcId: "npc_chiyo", prepare: (s: GameState) => { s.evidenceJournal.push({ id: "E03", name: "信", text: "已读", source: "测试", day: 1 }); }, changed: (s: GameState) => s.storyFlags.includes("chiyo_retracted") },
    { action: "write" as const, npcId: "npc_chiyo", prepare: (s: GameState) => { s.storyFlags.push("chiyo_retracted"); }, changed: (s: GameState) => s.itemOwners.E12 === "npc_chiyo" },
    { action: "protect" as const, npcId: "npc_makoto", prepare: (s: GameState) => { s.npcStates.npc_makoto.knownFactIds.push("R01"); }, changed: (s: GameState) => s.pendingNpcMove?.npcId === "npc_makoto" },
    { action: "supplement" as const, npcId: "npc_makoto", prepare: (s: GameState) => { s.npcStates.npc_makoto.knownFactIds.push("R01"); }, changed: (s: GameState) => s.itemOwners.E13 === "npc_makoto" }
  ];
  it.each(cases)("$action 不在预览或遥首句时提前执行", async ({ action, npcId, prepare, changed }) => {
    const provider = new CaseActionProvider(action), store = new MemoryGameStore();
    const initial = createInitialState(); prepare(initial);
    const locationId = initial.npcStates[npcId].currentLocationId;
    if (!initial.discoveredLocationIds.includes(locationId)) initial.discoveredLocationIds.push(locationId);
    store.save(initial);
    const game = new GameService(store, provider);
    game.travel(locationId); game.startEncounter(npcId);
    await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const raw = store.load()!;
    raw.heartCards = [{ id: "case_card", kind: "doubt", sourceType: "test", sourceNpcId: "system_test", sourceEventId: "seed", sourceText: "私密来源", day: 1, locationId: null }];
    store.save(raw);
    const resumed = new GameService(store, provider), before = resumed.getState();
    const preview = await resumed.previewHeart("case_card", before.revision);
    expect(changed(store.load()!)).toBe(false);
    await resumed.useHeart("case_card", before.revision, preview.id);
    expect(changed(store.load()!)).toBe(false);
    await nextSpeech(resumed);
    expect(changed(store.load()!)).toBe(true);
    expect(resumed.getState().eventLog.some(e => e.type === "heart_consequence" && e.details.consequenceType === "case_action")).toBe(true);
  });
});

describe("真实离线脚本与拾绪内信息投递", () => {
  it.each(demoBootstrap.npcs.flatMap(npc => heartKinds.map(kind => [npc.id, kind] as const)))("真实无 key 脚本：%s 的 %s 通过预览、消费和合法后果", async (npcId, kind) => {
    const provider = new CaseDialogueProvider({ apiKey: "" }), store = new MemoryGameStore();
    new GameService(store, provider);
    const seed = store.load()!, locationId = seed.npcStates[npcId].currentLocationId;
    if (!seed.discoveredLocationIds.includes(locationId)) seed.discoveredLocationIds.push(locationId);
    store.save(seed);
    const game = new GameService(store, provider);
    game.travel(locationId); game.startEncounter(npcId);
    await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
    const raw = store.load()!;
    raw.heartCards = [{ id: `offline_${kind}`, kind, sourceType: "test", sourceNpcId: "system_test", sourceEventId: "seed", sourceText: "测试卡", day: 1, locationId: null }];
    store.save(raw);
    const resumed = new GameService(store, provider), before = resumed.getState();
    const preview = await resumed.previewHeart(`offline_${kind}`, before.revision);
    expect(preview.line.trim()).not.toBe("");
    await resumed.useHeart(`offline_${kind}`, before.revision, preview.id);
    expect(resumed.getState().heartCards).toEqual([]);
    await nextSpeech(resumed);
    expect(resumed.getState().eventLog.some(e => e.type === "heart_consequence")).toBe(true);
  });

  it("拾绪会面中出示材料会作为实际已播行动投递；生成失败则信息、记忆、会话和存档全部回滚", async () => {
    class ListenProvider extends CaseDialogueProvider {
      seen: HeartContext | null = null;
      fail = false;
      async generateHearts(context: HeartContext) {
        this.seen = structuredClone(context);
        if (this.fail && context.heartIntent === "listen") throw new Error("offline");
        return mockHeartDialogue(context);
      }
    }
    const provider = new ListenProvider({ apiKey: "" });
    const { game, store } = await atHeartChoice(provider);
    const raw = store.load()!; raw.itemOwners.E01 = "player"; store.save(raw);
    const resumed = new GameService(store, provider), before = resumed.getState();
    await resumed.presentEvidence("E01");
    expect(provider.seen?.heartIntent).toBe("listen");
    expect(provider.seen?.selectedOption?.id).toBe("present");
    expect(store.load()!.npcStates.npc_koharu.knownFactIds).toContain("F02");
    expect(resumed.getState().eventLog.some(e => e.type === "information_delivered" && e.details.text.includes("遥出示了"))).toBe(true);
    expect(resumed.getState().heartSession).not.toBeNull();

    const rollbackProvider = new ListenProvider({ apiKey: "" }); rollbackProvider.fail = true;
    const rollback = await atHeartChoice(rollbackProvider);
    const rollbackRaw = rollback.store.load()!; rollbackRaw.itemOwners.E01 = "player"; rollback.store.save(rollbackRaw);
    const retry = new GameService(rollback.store, rollbackProvider), snapshot = retry.getState(), saved = rollback.store.load();
    await expect(retry.presentEvidence("E01")).rejects.toThrow(/卡牌.*进度已保留/);
    expect(retry.getState()).toEqual(snapshot); expect(rollback.store.load()).toEqual(saved);
  });
});
