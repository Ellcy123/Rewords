import { describe, expect, it } from "vitest";
import { dialoguePlaybackFinished, type DialogueResult } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { GameService } from "../server/src/gameService.ts";
import { mockHeartDialogue, type HeartContext } from "../server/src/heartDialogue.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { drainPlayback } from "./playback.ts";

type HeartCall = { context: HeartContext; result: DialogueResult };

/** Records the isolated projection requests while keeping every test offline. */
class RecordingHeartProvider extends CaseDialogueProvider {
  calls: HeartCall[] = [];

  async generateHearts(context: HeartContext): Promise<DialogueResult> {
    const result = mockHeartDialogue(context);
    this.calls.push({ context: structuredClone(context), result: structuredClone(result) });
    return result;
  }
}

class DelayedHeartProvider extends CaseDialogueProvider {
  contexts: HeartContext[] = [];
  pending: Array<{ context: HeartContext; resolve: (result: DialogueResult) => void }> = [];

  async generateHearts(context: HeartContext): Promise<DialogueResult> {
    if (context.heartIntent === "opening") return openingWithLatePickup(context);
    const saved = structuredClone(context);
    this.contexts.push(saved);
    return new Promise<DialogueResult>(resolve => this.pending.push({ context: saved, resolve }));
  }

  releaseOne() {
    const job = this.pending.shift();
    if (job) job.resolve(mockHeartDialogue(job.context));
  }
}

function openingWithLatePickup(context: HeartContext): DialogueResult {
  return {
    speakerId: context.npcId,
    line: "先把门关好。",
    stageDirection: "她把门闩扣上，旁白先于台词显示。",
    emotion: "谨慎",
    continuations: [
      { speakerId: context.npcId, line: "姐姐留下的东西，我怕自己整理不好。", stageDirection: "", emotion: "不安" },
      { speakerId: context.npcId, line: "我看过那本旧记录，却一直不敢翻到最后一页。", stageDirection: "", emotion: "迟疑" },
      { speakerId: context.npcId, line: "但今天我想把它说给你听。", stageDirection: "", emotion: "认真" },
      { speakerId: context.npcId, line: "你愿意先听我把最后一页说完吗？", stageDirection: "", emotion: "请求" }
    ],
    options: [],
    heart: {
      canContinue: true,
      choicePoint: { quote: "你愿意先听我把最后一页说完吗？", reason: "小春等待遥决定是否接住这份迟疑" },
      actionPlan: null,
      consequence: null,
      spendEventId: null,
      consequenceApplied: false,
      pickups: [{ beatIndex: 4, kind: "fear", quote: "你愿意先听我把最后一页说完吗？" }]
    },
    debug: {
      provider: "mock",
      decision: "多拍开场回归夹具",
      usedFacts: ["F02"],
      disclosedFacts: ["F02"],
      disclosures: [{ factId: "F02", beatIndex: 2 }],
      promptVersion: "test",
      npcActionId: "none"
    }
  };
}

async function flushBackground() {
  // The option workers are deliberately fire-and-forget. Give both workers a
  // few event-loop turns to consume the four candidate jobs.
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await new Promise<void>(resolve => setImmediate(resolve));
  }
}

function fixture() {
  const store = new MemoryGameStore();
  const provider = new RecordingHeartProvider();
  const game = new GameService(store, provider, { heartTestPack: true, preloadHeartOptions: true });
  game.travel("loc_shrine");
  game.startEncounter("npc_koharu");
  return { game, store, provider };
}

async function atChoice() {
  const result = fixture();
  await result.game.startHeartEncounter(result.game.getState().revision);
  await drainPlayback(result.game);
  await flushBackground();
  return result;
}

function options(game: GameService) {
  const revision = game.getState().revision;
  return game.prepareHeartOptions(revision);
}

describe("心绪候选后台预载", () => {
  it("阅读前段时自动预载四项候选，读取期间不泄漏未来对白或改变真实存档", async () => {
    const { game, store, provider } = fixture();
    await game.startHeartEncounter(game.getState().revision);
    const beforeRead = game.getState();
    const savedBeforeRead = store.load();

    await flushBackground();
    expect(provider.calls.filter(call => call.context.heartIntent !== "opening")).toHaveLength(4);
    expect(game.getState()).toEqual(beforeRead);
    expect(store.load()).toEqual(savedBeforeRead);
    expect(game.getHeartObservations()).toEqual([]);

    // The public endpoint remains closed until the real last beat is shown.
    expect(() => game.prepareHeartOptions(beforeRead.revision)).toThrow("看完对白");
    await expect(game.previewHeart(beforeRead.heartCards[0]!.id, beforeRead.revision)).rejects.toThrow("看完对白");
    await expect(game.useHeart(null, beforeRead.revision)).rejects.toThrow("看完");

    await drainPlayback(game);
    await flushBackground();
    const ready = options(game);
    expect(ready.complete).toBe(true);
    expect(ready.pending).toBe(0);
    expect(ready.options).toHaveLength(4);
    expect(new Set(ready.options.map(option => option.cardId))).toHaveLength(4);
    expect(ready.options.every(option => option.revision === game.getState().revision)).toBe(true);
  });

  it("投影执行旁白与拾绪拾取，终点上下文与真实播放一致且未来观察仍不可见", async () => {
    const { game, store, provider } = fixture();
    await game.startHeartEncounter(game.getState().revision);
    await flushBackground();

    const opening = game.getState().currentDialogue!;
    const openingLine = opening.line;
    const candidate = provider.calls.find(call => call.context.heartIntent === "fear");
    expect(candidate).toBeDefined();
    // The candidate is generated from the projected end of the opening. It has
    // the displayed opening events and the newly gathered pickup, while the
    // real world has not reached either yet.
    expect(candidate!.context.state.eventLog.some(event => event.details.line === openingLine)).toBe(true);
    expect(candidate!.context.state.heartCards.some(card => card.sourceNpcId === "npc_koharu" && card.sourceType !== "test")).toBe(true);
    expect(game.getHeartObservations()).toEqual([]);

    await drainPlayback(game);
    const actual = game.getState();
    const actualCommitted = store.load()!;
    expect(actual.heartCards.some(card => card.sourceNpcId === "npc_koharu" && card.sourceType !== "test")).toBe(true);
    expect(candidate!.context.state.heartCards).toEqual(actualCommitted.heartCards);
    expect(candidate!.context.state.playerKnownFactIds).toEqual(actualCommitted.playerKnownFactIds);
    // The internal projection retains full item ownership; the HTTP state
    // intentionally redacts remote owners, so compare against the committed
    // store for terminal-state equality.
    expect(candidate!.context.state.itemOwners).toEqual(actualCommitted.itemOwners);
    expect(candidate!.context.state.eventLog.filter(event => event.type !== "dialogue_choice")).toEqual(actualCommitted.eventLog);
    options(game);
    const observations = game.getHeartObservations();
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.flatMap(observation => observation.input?.played ?? [])
      .every(played => actualCommitted.eventLog.some(event => event.id === played.eventId))).toBe(true);
  });

  it("nextDialogueBeat递增真实revision仍复用已准备候选，确认后不重复生成并继续预载下一节点", async () => {
    const { game, provider } = fixture();
    await game.startHeartEncounter(game.getState().revision);
    await flushBackground();
    const firstRevision = game.getState().revision;
    const callsBeforeReading = provider.calls.length;

    await game.nextDialogueBeat(firstRevision);
    expect(game.getState().revision).not.toBe(firstRevision);
    await drainPlayback(game);
    await flushBackground();
    const first = options(game);
    expect(first.complete).toBe(true);
    expect(provider.calls.length).toBe(callsBeforeReading);

    const cardOption = first.options.find(option => option.cardId !== null &&
      game.getState().heartCards.some(card => card.id === option.cardId));
    expect(cardOption).toBeDefined();
    const callsBeforeUse = provider.calls.length;
    await game.useHeart(cardOption!.cardId, game.getState().revision, cardOption!.id);
    // Confirmation itself reuses the cached branch. The only immediate calls
    // allowed here are the first two workers for the next node's preload.
    expect(provider.calls.length - callsBeforeUse).toBeLessThanOrEqual(2);

    await drainPlayback(game);
    await flushBackground();
    const next = options(game);
    expect(next.complete).toBe(true);
    expect(provider.calls.length).toBeGreaterThan(callsBeforeUse);
    expect(next.options.every(option => option.revision === game.getState().revision)).toBe(true);
  });

  it("恢复已有未读会面时自动继续准备，并在重置后拒绝旧候选", async () => {
    const { game, store, provider } = fixture();
    await game.startHeartEncounter(game.getState().revision);
    await flushBackground();
    const savedAtUnread = store.load();
    expect(savedAtUnread?.currentDialogue).toBeTruthy();

    const resumed = new GameService(store, provider, { heartTestPack: true, preloadHeartOptions: true });
    expect(resumed.getState().currentDialogue).toEqual(game.getState().currentDialogue);
    await drainPlayback(resumed);
    await flushBackground();
    const resumedOptions = options(resumed);
    expect(resumedOptions.complete).toBe(true);
    const old = resumedOptions.options.find(option => option.cardId !== null)!;

    await resumed.reset();
    expect(resumed.getState().phase).toBe("action");
    await resumed.travel("loc_shrine");
    resumed.startEncounter("npc_koharu");
    await resumed.startHeartEncounter(resumed.getState().revision);
    await drainPlayback(resumed);
    await expect(resumed.useHeart(old.cardId, resumed.getState().revision, old.id)).rejects.toThrow("预览已失效");
  });

  it("按需服务调用者未开启预载时不额外生成", async () => {
    const store = new MemoryGameStore();
    const provider = new RecordingHeartProvider();
    const game = new GameService(store, provider, { heartTestPack: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await flushBackground();
    expect(provider.calls.filter(call => call.context.heartIntent !== "opening")).toHaveLength(0);
    expect(dialoguePlaybackFinished(game.getState())).toBe(false);
  });

  it("进行中的旧批次跨多次翻页不取消，最终复用同一批结果", async () => {
    const store = new MemoryGameStore();
    const provider = new DelayedHeartProvider();
    const game = new GameService(store, provider, { heartTestPack: true, preloadHeartOptions: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await flushBackground();
    expect(provider.contexts).toHaveLength(2);

    const firstProjected = provider.contexts[0]!;
    let pages = 0;
    while (!dialoguePlaybackFinished(game.getState()) && pages < 3) {
      await game.nextDialogueBeat(game.getState().revision);
      pages++;
    }
    expect(pages).toBe(3);
    expect(game.getState().revision).toBeGreaterThan(firstProjected.state.revision);
    expect(provider.contexts).toHaveLength(2);

    // Completing one in-flight request must let the same batch continue its
    // queue after the real revision has changed.
    provider.releaseOne();
    await flushBackground();
    expect(provider.contexts.length).toBeGreaterThanOrEqual(3);
    while (!dialoguePlaybackFinished(game.getState())) {
      await game.nextDialogueBeat(game.getState().revision);
    }
    while (provider.pending.length) {
      provider.releaseOne();
      await flushBackground();
    }
    const countBeforeRead = provider.contexts.length;
    const ready = options(game);
    expect(ready.complete).toBe(true);
    expect(ready.options).toHaveLength(4);
    expect(provider.contexts).toHaveLength(countBeforeRead);
    expect(firstProjected.state.playerKnownFactIds).toContain("F02");
    expect(firstProjected.state.heartCards.some(card => card.sourceNpcId === "npc_koharu")).toBe(true);
  });
});
