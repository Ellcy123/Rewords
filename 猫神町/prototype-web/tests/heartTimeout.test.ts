import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../server/src/gameService.ts";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { type HeartContext } from "../server/src/heartDialogue.ts";

const response = (body: unknown) => new Response(JSON.stringify({
  choices: [{ finish_reason: "stop", message: { content: JSON.stringify(body) } }]
}));

function context(): HeartContext {
  const state = createInitialState();
  state.phase = "encounter";
  state.currentLocationId = "loc_shrine";
  state.activeNpcId = "npc_koharu";
  state.heartSession = { id: "timeout_test", claimedKinds: [] };
  return { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: "opening" };
}

const draft = {
  beats: [{ speaker: "npc", line: "我有一句话想先问清。", stage_direction: "", emotion: "认真" }],
  can_continue: true,
  choice_point: { quote: "我有一句话想先问清。", reason: "需要遥回应" },
  closing_reason: "",
  used_fact_ids: [],
  disclosed_fact_ids: [],
  disclosures: [],
  progress: { type: "request", summary: "提出一个需要回应的问题" },
  pickup: null,
  consequence: null,
  action_plan: null
};

const approved = { approved: true, reason: "none", issue: "" };

afterEach(() => vi.restoreAllMocks());

describe("心绪请求超时", () => {
  it.each([
    [{}, [45000, 45000]],
    [{ timeoutMs: 1234 }, [1234, 1234]],
    [{ timeoutMs: 1234, heartTimeoutMs: 2345 }, [2345, 2345]]
  ])("生成与审查使用显式或默认心绪超时 %j", async (providerOptions, expected) => {
    const actualTimeout = AbortSignal.timeout;
    const seen: number[] = [];
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      seen.push(ms);
      return actualTimeout(ms);
    });
    let call = 0;
    const provider = new CaseDialogueProvider({
      apiKey: "test-key",
      review: true,
      maxAttempts: 1,
      ...providerOptions,
      fetchImpl: async () => response(call++ === 0 ? draft : approved)
    });

    await provider.generateHearts(context());
    expect(seen).toEqual(expected);
  });
});
