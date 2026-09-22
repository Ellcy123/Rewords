import { describe, expect, it, vi } from "vitest";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { createInitialState, GameService } from "../server/src/gameService.ts";
import { mockHeartDialogue, type HeartContext } from "../server/src/heartDialogue.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { drainPlayback } from "./playback.ts";

const response = (body: unknown, status = 200) => new Response(
  status === 200 ? JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(body) } }] }) : "",
  { status }
);

function context(heartIntent: HeartContext["heartIntent"] = "fear"): HeartContext {
  const state = createInitialState();
  state.phase = "encounter";
  state.currentLocationId = "loc_shrine";
  state.activeNpcId = "npc_koharu";
  state.heartSession = { id: "recovery_test", claimedKinds: [] };
  return { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent };
}

function openingDraft() {
  return {
    beats: [{ speaker: "npc", line: "先把门关好，我们从眼前的事说起。", stage_direction: "", emotion: "谨慎" }],
    can_continue: true,
    choice_point: { quote: "先把门关好，我们从眼前的事说起。", reason: "小春等待遥回应这句开场。" },
    closing_reason: "",
    used_fact_ids: [], disclosed_fact_ids: [], disclosures: [],
    progress: { type: "request", summary: "小春提出先从眼前的事情说起" },
    pickup: null, consequence: null, action_plan: null
  };
}

function candidateDraft() {
  return {
    beats: [
      { speaker: "player", line: "我先陪你把话说清楚。", stage_direction: "", emotion: "认真" },
      { speaker: "npc", line: "那就先从眼前的车票说起，可以吗？", stage_direction: "", emotion: "迟疑" }
    ],
    can_continue: true,
    choice_point: { quote: "那就先从眼前的车票说起，可以吗？", reason: "小春等待遥回应当前边界。" },
    closing_reason: "",
    used_fact_ids: [], disclosed_fact_ids: [], disclosures: [],
    progress: { type: "request", summary: "小春提出核对眼前车票" },
    pickup: null, consequence: null, action_plan: null
  };
}

function repairableCandidate() {
  const raw = candidateDraft();
  delete (raw.beats[1] as { emotion?: string }).emotion;
  delete (raw as { progress?: unknown }).progress;
  return raw;
}

function reviewRequest(init: RequestInit) {
  const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
  return body.messages[0]!.content.includes("你只审查对白内容");
}

function inputOf(init: RequestInit) {
  const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
  try { return JSON.parse(body.messages[1]!.content).input as string | undefined; }
  catch { return undefined; }
}

async function flushBackground() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
    await new Promise<void>(resolve => setImmediate(resolve));
  }
}

describe("拾绪离线故障恢复", () => {
  it("字段修补后的候选可直接确认，使用缓存不重复生成", async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      if (reviewRequest(init)) {
        const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
        const reviewInput = JSON.parse(body.messages[1]!.content) as { repair_fields?: { path: string }[] };
        return response({ approved: true, reason: "none", issue: "", repairs: reviewInput.repair_fields?.map(field =>
          field.path === "progress"
            ? { path: field.path, value: { type: "request", summary: "小春提出核对眼前车票" } }
            : { path: field.path, value: "迟疑" }) ?? [] });
      }
      return response(inputOf(init) === "opening" ? openingDraft() : repairableCandidate());
    });
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider, { heartTestPack: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await drainPlayback(game);

    const card = game.getState().heartCards.find(item => item.sourceType === "test")!;
    const preview = await game.previewHeart(card.id, game.getState().revision);
    const callsBeforeConfirm = fetchImpl.mock.calls.length;
    await game.useHeart(card.id, game.getState().revision, preview.id);

    expect(preview.line).toContain("陪你把话说清楚");
    expect(fetchImpl).toHaveBeenCalledTimes(callsBeforeConfirm);
    expect(game.getState().heartCards.some(item => item.id === card.id)).toBe(false);
    expect(game.getState().currentDialogue?.line).toBe(preview.line);
    expect(game.getState().currentDialogue?.continuations[0]?.emotion).toBe("迟疑");
    expect(provider.getLogs().find(log => log.mode === "talk" && log.repairedFields)).toMatchObject({
      repairedFields: ["beats.1.emotion", "progress"]
    });
  });

  it.each([
    ["审校超时", "timeout"],
    ["批准但漏补必填收尾", "missing_closing"],
    ["越界字段修补", "out_of_scope"],
    ["硬拒绝", "hard_reject"]
  ] as const)("%s按maxAttempts结束，不留下悬挂请求", async (_label, failure) => {
    const raw = failure === "missing_closing" ? candidateDraft() : candidateDraft();
    if (failure === "missing_closing") {
      raw.can_continue = false;
      raw.choice_point = null;
      delete (raw as { closing_reason?: string }).closing_reason;
    }
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      if (!reviewRequest(init)) return response(raw);
      if (failure === "timeout") {
        return await new Promise<Response>((_resolve, reject) => {
          const signal = init.signal!;
          const abort = () => reject(signal.reason ?? new DOMException("timed out", "TimeoutError"));
          if (signal.aborted) abort();
          else signal.addEventListener("abort", abort, { once: true });
        });
      }
      if (failure === "out_of_scope") return response({ approved: true, reason: "none", issue: "", repairs: [{ path: "beats.1.line", value: "越界" }] });
      if (failure === "hard_reject") return response({ approved: false, reason: "new_case_fact", issue: "编造案情", repairs: [] });
      return response({ approved: true, reason: "none", issue: "", repairs: [] });
    });
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 2, heartTimeoutMs: 4, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(provider.getLogs().find(log => log.mode === "talk")).toMatchObject({ success: false, attemptCount: 2 });
  });

  it("预载全部失败时批次结束且不写世界，显式 retry 后可恢复并确认", async () => {
    let allowCandidates = false;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      if (reviewRequest(init)) return response({ approved: true, reason: "none", issue: "", repairs: [] });
      const input = inputOf(init);
      if (input === "opening") return response(openingDraft());
      return response(allowCandidates ? candidateDraft() : {});
    });
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider, { heartTestPack: true, preloadHeartOptions: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await drainPlayback(game);
    await flushBackground();

    const revision = game.getState().revision;
    const before = game.getState();
    const saved = store.load();
    const failed = game.prepareHeartOptions(revision);
    expect(failed).toMatchObject({ complete: true, pending: 0, options: [] });
    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
    expect(game.getState().heartCards).toEqual(before.heartCards);

    allowCandidates = true;
    game.prepareHeartOptions(revision, true);
    await flushBackground();
    const ready = game.prepareHeartOptions(revision);
    const cardOption = ready.options.find(option => option.cardId !== null)!;
    expect(ready).toMatchObject({ complete: true, pending: 0 });
    expect(ready.options).toHaveLength(4);
    await game.useHeart(cardOption.cardId, revision, cardOption.id);
    expect(game.getState().heartCards.some(card => card.id === cardOption.cardId)).toBe(false);
    expect(game.getState().currentDialogue?.line).toBe(cardOption.line);
  });

  it("未结束的预载请求可以结束会面，旧任务不续排队也不污染新节点", async () => {
    type Job = { context: HeartContext; settled: boolean; resolve: (result: ReturnType<typeof mockHeartDialogue>) => void };
    class PendingProvider extends CaseDialogueProvider {
      calls: HeartContext[] = [];
      jobs: Job[] = [];
      async generateHearts(c: HeartContext) {
        if (c.heartIntent === "opening") return mockHeartDialogue(c);
        this.calls.push(structuredClone(c));
        return new Promise<ReturnType<typeof mockHeartDialogue>>(resolve => {
          const job = { context: structuredClone(c), settled: false, resolve: (result: ReturnType<typeof mockHeartDialogue>) => {
            if (!job.settled) { job.settled = true; resolve(result); }
          } };
          this.jobs.push(job);
        });
      }
      releaseAll() { for (const job of this.jobs) job.resolve(mockHeartDialogue(job.context)); }
      pending() { return this.jobs.filter(job => !job.settled); }
    }
    const provider = new PendingProvider();
    const store = new MemoryGameStore();
    const game = new GameService(store, provider, { heartTestPack: true, preloadHeartOptions: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await flushBackground();
    expect(provider.pending()).toHaveLength(2);
    expect(game.getState().currentDialogue?.heart?.spendEventId).toBeNull();

    await game.completeEncounter();
    expect(game.getState().phase).toBe("location");
    provider.releaseAll();
    await flushBackground();
    expect(provider.calls).toHaveLength(2);

    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await flushBackground();
    expect(provider.calls).toHaveLength(4);
    expect(new Set(provider.calls.map(call => call.state.heartSession?.id))).toHaveLength(2);
  });

  it("startHeartEncounter 与 useHeart 失败后都释放 busy，原 revision 可重试", async () => {
    let failNext = true;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      if (failNext) return response(null, 503);
      if (reviewRequest(init)) return response({ approved: true, reason: "none", issue: "", repairs: [] });
      return response(inputOf(init) === "opening" ? openingDraft() : candidateDraft());
    });
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider, { heartTestPack: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    const beforeStart = game.getState();

    await expect(game.startHeartEncounter(beforeStart.revision)).rejects.toThrow();
    expect(game.getState()).toEqual(beforeStart);
    failNext = false;
    await game.startHeartEncounter(beforeStart.revision);
    await drainPlayback(game);

    const card = game.getState().heartCards.find(item => item.sourceType === "test")!;
    const beforeUse = game.getState();
    failNext = true;
    await expect(game.useHeart(card.id, beforeUse.revision)).rejects.toThrow();
    expect(game.getState()).toEqual(beforeUse);
    failNext = false;
    await game.useHeart(card.id, beforeUse.revision);
    expect(game.getState().heartCards.some(item => item.id === card.id)).toBe(false);
    expect(game.getState().currentDialogue?.speakerId).toBe("player");
  });
});
