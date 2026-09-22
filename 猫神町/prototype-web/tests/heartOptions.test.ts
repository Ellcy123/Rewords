import { describe, expect, it } from "vitest";
import { CaseDialogueProvider, DialogueGenerationError } from "../server/src/caseProvider.ts";
import { type DialogueResult, type HeartOptions } from "../packages/shared/src/index.ts";
import { mockHeartDialogue, type HeartContext } from "../server/src/heartDialogue.ts";
import { GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { showSpeech } from "./playback.ts";

type HeartOptionsResult = HeartOptions;

type HeartJob = {
  call: number;
  context: HeartContext;
  settled: boolean;
  resolve: (result: DialogueResult) => void;
  reject: (error: unknown) => void;
};

/** A provider whose non-opening calls can be released one at a time by a test. */
class ControlledHeartProvider extends CaseDialogueProvider {
  calls: HeartContext[] = [];
  jobs: HeartJob[] = [];
  active = 0;
  peakActive = 0;
  failCalls = new Set<number>();

  async generateHearts(context: HeartContext): Promise<DialogueResult> {
    if (context.heartIntent === "opening") return mockHeartDialogue(context);

    const call = this.calls.push(structuredClone(context)) - 1;
    this.active++;
    this.peakActive = Math.max(this.peakActive, this.active);
    return new Promise<DialogueResult>((resolve, reject) => {
      const job: HeartJob = {
        call,
        context: structuredClone(context),
        settled: false,
        resolve: result => {
          if (job.settled) return;
          job.settled = true;
          this.active--;
          resolve(result);
        },
        reject: error => {
          if (job.settled) return;
          job.settled = true;
          this.active--;
          reject(error);
        }
      };
      this.jobs.push(job);
    });
  }

  pendingJobs() {
    return this.jobs.filter(job => !job.settled);
  }

  release(job: HeartJob, succeed = true) {
    if (succeed && !this.failCalls.has(job.call)) job.resolve(mockHeartDialogue(job.context));
    else job.reject(new DialogueGenerationError());
  }
}

async function tick() {
  await new Promise<void>(resolve => setImmediate(resolve));
  await Promise.resolve();
}

function fixture(provider = new ControlledHeartProvider()) {
  const store = new MemoryGameStore();
  const game = new GameService(store, provider, { heartTestPack: true });
  game.travel("loc_shrine");
  game.startEncounter("npc_koharu");
  return { game, store, provider };
}

async function atChoice(provider = new ControlledHeartProvider()) {
  const result = fixture(provider);
  await result.game.startHeartEncounter(result.game.getState().revision);
  await showSpeech(result.game);
  result.provider.calls.length = 0;
  result.provider.jobs.length = 0;
  return result;
}

function prepare(game: GameService, revision: number, retryFailed = false): HeartOptionsResult {
  return (game as GameService & { prepareHeartOptions(revision: number, retryFailed?: boolean): HeartOptionsResult })
    .prepareHeartOptions(revision, retryFailed) as unknown as HeartOptionsResult;
}

async function finishJobs(provider: ControlledHeartProvider, succeed = true) {
  while (provider.pendingJobs().length) {
    const job = provider.pendingJobs()[0]!;
    provider.release(job, succeed);
    await tick();
  }
}

describe("拾绪候选预备", () => {
  it("最多同时生成两个候选，重复准备去重，并为每种手牌只排一个候选", async () => {
    const { game, provider } = await atChoice();
    const revision = game.getState().revision;

    const first = prepare(game, revision);
    expect(first).toMatchObject({ revision, complete: false, options: [] });
    expect(first.pending).toBeGreaterThan(0);
    await tick();
    expect(provider.peakActive).toBeLessThanOrEqual(2);
    expect(provider.calls).toHaveLength(2);

    const duplicate = prepare(game, revision);
    expect(duplicate.revision).toBe(revision);
    await tick();
    expect(provider.calls).toHaveLength(2);

    await finishJobs(provider);
    const complete = prepare(game, revision);
    expect(complete).toMatchObject({ revision, complete: true });
    expect(complete.pending).toBe(0);
    expect(provider.peakActive).toBeLessThanOrEqual(2);
    expect(provider.calls).toHaveLength(4); // fear, sympathy, affection, and free listen
    expect(new Set(provider.calls.map(call => call.heartIntent))).toEqual(new Set(["fear", "sympathy", "affection", "listen"]));
    expect(complete.options).toHaveLength(4);
    expect(new Set(complete.options.filter(option => option.cardId).map(option => option.cardId))).toHaveLength(3);
    expect(complete.options.find(option => option.cardId === null)).toBeDefined();
  });

  it("部分失败不会进入 options，所有失败也会结束；retryFailed 只重试失败项", async () => {
    const { game, provider } = await atChoice();
    const revision = game.getState().revision;
    provider.failCalls.add(1);

    prepare(game, revision);
    await tick();
    await finishJobs(provider);

    const partial = prepare(game, revision);
    expect(partial).toMatchObject({ complete: true });
    expect(partial.pending).toBe(0);
    expect(partial.options).toHaveLength(3);
    expect(partial.options.every(option => option.line && option.provider)).toBe(true);
    expect(partial.options.some(option => option.cardId === null)).toBe(true);

    const beforeRetry = provider.calls.length;
    const retried = prepare(game, revision, true);
    await tick();
    expect(provider.calls.length).toBe(beforeRetry + 1);
    const retryJob = provider.pendingJobs()[0]!;
    provider.failCalls.delete(retryJob.call);
    provider.release(retryJob);
    await tick();
    const recovered = prepare(game, revision);
    expect(recovered).toMatchObject({ complete: true });
    expect(recovered.pending).toBe(0);
    expect(recovered.options).toHaveLength(4);

    const allFailed = await atChoice();
    allFailed.provider.failCalls = new Set([0, 1, 2, 3]);
    const allRevision = allFailed.game.getState().revision;
    prepare(allFailed.game, allRevision);
    await tick();
    await finishJobs(allFailed.provider);
    const failed = prepare(allFailed.game, allRevision);
    expect(failed).toMatchObject({ complete: true, options: [] });
    expect(failed.pending).toBe(0);
  });

  it("缓存结果可直接确认，不重复请求；免费 listen 也不耗牌", async () => {
    const { game, provider } = await atChoice();
    const revision = game.getState().revision;
    prepare(game, revision);
    await tick();
    await finishJobs(provider);
    const ready = prepare(game, revision);
    const cardOption = ready.options.find(option => option.cardId)!;
    const callsBeforeUse = provider.calls.length;
    const cardsBefore = game.getState().heartCards.map(card => card.id);

    await game.useHeart(cardOption.cardId, revision, cardOption.id);
    expect(provider.calls).toHaveLength(callsBeforeUse);
    expect(game.getState().currentDialogue?.line).toBe(cardOption.line);
    expect(game.getState().heartCards.map(card => card.id)).not.toContain(cardOption.cardId);

    // A fresh encounter is not needed to prove the free branch does not spend:
    // use the already-prepared free option from a separate isolated fixture.
    const free = await atChoice();
    const freeRevision = free.game.getState().revision;
    prepare(free.game, freeRevision);
    await tick();
    await finishJobs(free.provider);
    const freeReady = prepare(free.game, freeRevision);
    const freeListen = freeReady.options.find(option => option.cardId === null)!;
    const freeCalls = free.provider.calls.length;
    const freeCards = free.game.getState().heartCards.map(card => card.id);
    await free.game.useHeart(null, freeRevision, freeListen.id);
    expect(free.provider.calls).toHaveLength(freeCalls);
    expect(free.game.getState().heartCards.map(card => card.id)).toEqual(freeCards);
  });

  it("预备期间不写入世界状态、存档或耗牌，未选候选的后果不会发生", async () => {
    const { game, store, provider } = await atChoice();
    const revision = game.getState().revision;
    const before = game.getState();
    const saved = store.load();

    prepare(game, revision);
    await tick();
    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
    await finishJobs(provider);
    prepare(game, revision);
    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
    expect(game.getState().heartCards).toEqual(before.heartCards);
    expect(game.getState().npcStates.npc_koharu.sortingHelp).toBe(before.npcStates.npc_koharu.sortingHelp);
  });

  it("revision 变化后丢弃旧候选，并且不再启动尚未执行的任务", async () => {
    const { game, provider } = await atChoice();
    const revision = game.getState().revision;
    prepare(game, revision);
    await tick();
    expect(provider.calls).toHaveLength(2);

    await game.completeEncounter();
    const changedRevision = game.getState().revision;
    expect(changedRevision).not.toBe(revision);
    for (const job of provider.pendingJobs()) provider.release(job);
    await tick();
    expect(provider.calls).toHaveLength(2);

    // The old two results do not leak into the next node's cache.
    game.leaveLocation();
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await showSpeech(game);
    const nextRevision = game.getState().revision;
    provider.calls.length = 0;
    provider.jobs.length = 0;
    prepare(game, nextRevision);
    await tick();
    expect(provider.calls).toHaveLength(2);
  });
});
