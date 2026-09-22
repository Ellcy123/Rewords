import { describe, expect, it } from "vitest";
import { buildCasePrompt, CaseDialogueProvider, type CaseContext } from "../server/src/caseProvider.ts";
import { characters } from "../server/src/caseData.ts";
import { HeartDraft, validateHeartDraft, type HeartContext } from "../server/src/heartDialogue.ts";
import { createInitialState } from "../server/src/gameService.ts";

const response = (body: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(body) } }] }));

function caseContext(): CaseContext {
  const state = createInitialState();
  state.phase = "encounter";
  state.activeNpcId = "npc_koharu";
  state.currentLocationId = "loc_shrine";
  return { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "" };
}

function ordinaryDraft() {
  return {
    line: "姐姐本来要带我一起离开，这两张票不是给一个人买的。",
    stage_direction: "", emotion: "急切", continuations: [],
    options: [
      { text: "票给我看。", intent: "核对车票", angle: "核对", action_id: "show:E01" },
      { text: "她为什么要走？", intent: "追问离开原因", angle: "追问", action_id: null }
    ],
    used_fact_ids: ["F02"], disclosed_fact_ids: ["F02"],
    progress: { type: "reveal", summary: "小春说明两张车票原本是姐妹共同离开的安排" },
    accept_action: false
  };
}

function heartContext(): HeartContext {
  const state = createInitialState();
  state.activeNpcId = "npc_koharu";
  state.currentLocationId = "loc_shrine";
  state.heartSession = { id: "pressure_test", claimedKinds: [] };
  return { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: "fear" };
}

describe("information-pressure dialogue contract", () => {
  it("gives every NPC concrete dramatic pressure directions", () => {
    for (const [id, core] of Object.entries(characters)) {
      expect(core.dramaticMoves.length, id).toBeGreaterThan(0);
    }
  });

  it("exposes player-unknown NPC facts and pressure directions to the prompt", () => {
    const prompt = buildCasePrompt(caseContext());
    const input = JSON.parse(prompt.user);
    expect(input.undisclosed_to_player).toMatchObject({ F02: expect.any(String), F09: expect.any(String) });
    expect(input.role.dramaticMoves).toEqual(characters.npc_koharu.dramaticMoves);
    expect(prompt.system).toContain("优先从undisclosed_to_player");
  });

  it("rejects ordinary drafts that omit progress, rejects empty reveals, and saves the scene goal", async () => {
    const missing = ordinaryDraft();
    delete (missing as Partial<typeof missing>).progress;
    const missingProvider = new CaseDialogueProvider({ apiKey: "test", review: false, maxAttempts: 1, fetchImpl: async () => response(missing) });
    expect((await missingProvider.generate(caseContext())).debug.provider).toBe("mock_fallback");
    expect(missingProvider.getLogs().at(-1)?.errorCode).toBe("schema_validation");

    const emptyReveal = ordinaryDraft();
    emptyReveal.disclosed_fact_ids = [];
    const revealProvider = new CaseDialogueProvider({ apiKey: "test", review: false, maxAttempts: 1, fetchImpl: async () => response(emptyReveal) });
    expect((await revealProvider.generate(caseContext())).debug.provider).toBe("mock_fallback");
    expect(revealProvider.getLogs().at(-1)?.errorCode).toBe("off_topic");

    const accepted = new CaseDialogueProvider({ apiKey: "test", review: false, fetchImpl: async () => response(ordinaryDraft()) });
    expect((await accepted.generate(caseContext())).debug.sceneGoal).toBe("reveal：小春说明两张车票原本是姐妹共同离开的安排");
  });

  it("defaults missing progress and repairs an action label without a consequence", () => {
    const raw = {
      action_plan: null, consequence: null,
      beats: [
        { speaker: "player", line: "我也怕把话说错。", stage_direction: "", emotion: "迟疑" },
        { speaker: "npc", line: "那就先别替我下结论。", stage_direction: "", emotion: "认真" }
      ],
      can_continue: true, choice_point: { quote: "那就先别替我下结论。", reason: "小春等待遥回应这个边界。" }, closing_reason: "", used_fact_ids: [], disclosed_fact_ids: [],
      progress: { type: "action", summary: "小春作出一项具体现场决定" }, pickup: null
    };
    const missing = { ...raw } as Record<string, unknown>;
    delete missing.progress;
    expect(HeartDraft.parse(missing).progress).toEqual({ type: "transition", summary: "回应眼前交流" });
    expect(validateHeartDraft(missing, heartContext(), []).progress.type).toBe("transition");

    const repaired = validateHeartDraft(raw, heartContext(), []);
    expect(repaired.consequence).toBeNull();
    expect(repaired.progress.type).toBe("decision");
  });
});
