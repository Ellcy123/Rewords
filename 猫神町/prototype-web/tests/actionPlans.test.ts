import { showSpeech, nextSpeech, drainPlayback } from "./playback.ts";
import { describe, expect, it } from "vitest";
import { ActionPlanProposalSchema, GameStateSchema } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider, buildCasePrompt } from "../server/src/caseProvider.ts";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { MemoryGameStore, SqliteGameStore } from "../server/src/persistence.ts";
import { buildHeartPrompt, mockHeartDialogue, validateHeartDraft, type HeartContext } from "../server/src/heartDialogue.ts";
import { validMeetingPlan } from "../server/src/actionPlans.ts";

function proposal(now = 720) {
  return ActionPlanProposalSchema.parse({ type: "meet", targetNpcId: "player", locationId: "loc_home", arriveAt: now + 60, waitUntil: now + 180,
    reason: "继续聊姐姐", quote: "我一点到雨宫家旧居，等你到三点。", beatIndex: 1 });
}
class MeetingProvider extends CaseDialogueProvider {
  invalid = false;
  async generateHearts(c: HeartContext) {
    const d = mockHeartDialogue(c);
    d.speakerId = "npc_koharu"; d.line = "有些话我想换个地方说。";
    d.continuations = [{ speakerId: "npc_koharu", line: proposal().quote, emotion: "期待" }];
    d.heart = { canContinue: true, choicePoint: { quote: proposal().quote, reason: "小春等待遥决定是否接受这个约定。" }, pickups: [], actionPlan: { ...proposal(), locationId: this.invalid ? "invented" : "loc_home" } };
    return d;
  }
}
async function setup(store = new MemoryGameStore()) {
  const provider = new MeetingProvider({ apiKey: "" }), game = new GameService(store, provider);
  game.travel("loc_shrine"); game.startEncounter("npc_koharu"); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
  return { game, store, provider };
}
const playInvite = (game: GameService) => drainPlayback(game);
const plan = (game: GameService) => game.getState().npcStates.npc_koharu.actionPlan;

describe("NPC meeting plans", () => {
  it("old saves get an empty plan without reset", () => {
    const old: any = createInitialState(); delete old.npcStates.npc_koharu.actionPlan;
    expect(GameStateSchema.parse(old).npcStates.npc_koharu.actionPlan).toBeNull();
  });
  it("only the played invitation activates and reveals the destination", async () => {
    const { game } = await setup();
    expect(plan(game)).toBeNull(); expect(game.getState().discoveredLocationIds).not.toContain("loc_home");
    await playInvite(game);
    expect(plan(game)?.status).toBe("planned"); expect(game.getState().discoveredLocationIds).toContain("loc_home");
    expect(game.getState().npcStates.npc_koharu.currentLocationId).toBe("loc_shrine");
    expect(game.getState().npcStates.npc_koharu.memories.some(m => m.summary.includes("约定："))).toBe(true);
  });
  it("exiting before the invitation does not schedule anything", async () => {
    const { game } = await setup(); await game.completeEncounter();
    game.wait(120); expect(plan(game)).toBeNull();
    expect(game.getState().npcStates.npc_koharu.currentLocationId).toBe("loc_shrine");
  });
  it("moves on time, waits, and completes only after the player chooses a real interaction", async () => {
    const { game } = await setup(); await playInvite(game); await game.completeEncounter();
    game.wait(30); expect(game.getState().npcStates.npc_koharu.currentLocationId).toBe("loc_shrine");
    game.leaveLocation(); game.travel("loc_home");
    expect(plan(game)?.status).toBe("waiting"); expect(game.getState().npcStates.npc_koharu.currentLocationId).toBe("loc_home");
    game.startEncounter("npc_koharu"); expect(plan(game)?.status).toBe("waiting");
    // The legacy direct-talk service route remains a compatibility regression path;
    // production UI chooses 拾绪 instead. Either real interaction is what completes the appointment.
    await game.selectInteractionMode("talk"); expect(plan(game)?.status).toBe("completed");
    expect(game.getState().npcStates.npc_koharu.memories.some(m => m.summary.includes("按约"))).toBe(true);
  });
  it("a large time jump executes arrival then expiry, with no invented return trip", async () => {
    const { game, store } = await setup(); await playInvite(game); await game.completeEncounter();
    game.waitUntilNight();
    const raw = store.load()!;
    expect(raw.npcStates.npc_koharu.actionPlan?.status).toBe("expired");
    expect(raw.npcStates.npc_koharu.currentLocationId).toBe("loc_home");
    const arrival = raw.eventLog.find(e => e.type === "npc_moved" && e.actorId === "npc_koharu")!;
    expect(arrival.minute).toBe(780);
    expect(raw.eventLog.some(e => e.type === "action_plan_updated" && e.minute === 900)).toBe(true);
  });
  it("refresh and stale playback requests cannot duplicate a plan", async () => {
    const { game, store, provider } = await setup(); const rev = game.getState().revision;
    await playInvite(game); const before = game.getState();
    await expect(game.nextDialogueBeat(rev)).rejects.toThrow();
    const restored = new GameService(store, provider); expect(restored.getState()).toEqual(before);
    expect(restored.getState().eventLog.filter(e => e.type === "action_plan_updated")).toHaveLength(1);
  });
  it("a new spoken plan replaces the old one exactly once", async () => {
    const { game } = await setup(); await playInvite(game); const id = plan(game)!.id;
    await game.useHeart(null, game.getState().revision); expect(plan(game)!.id).toBe(id);
    await playInvite(game); expect(plan(game)!.id).not.toBe(id);
    expect(game.getState().eventLog.filter(e => e.details.text.includes("替代"))).toHaveLength(1);
  });
  it("invalid generation rolls back time and does not install a plan", async () => {
    const { game, provider } = await setup(); await playInvite(game); const before = game.getState(); provider.invalid = true;
    await expect(game.useHeart(null, before.revision)).rejects.toThrow(); expect(game.getState()).toEqual(before);
  });
  it("injury cancels a plan without teleporting the NPC", async () => {
    const { game, store, provider } = await setup(); await playInvite(game); await game.completeEncounter();
    const raw = store.load()!; raw.npcStates.npc_koharu.lifeState = "injured"; store.save(raw);
    const restored = new GameService(store, provider); restored.wait(120);
    expect(store.load()!.npcStates.npc_koharu.actionPlan?.status).toBe("cancelled");
    expect(store.load()!.npcStates.npc_koharu.currentLocationId).toBe("loc_shrine");
  });
  it("an existing story move takes priority even at the same timestamp", async () => {
    const { game, store, provider } = await setup(); await playInvite(game); await game.completeEncounter();
    const raw = store.load()!; raw.pendingNpcMove = { npcId: "npc_koharu", locationId: "loc_inn", arriveAt: 780 }; store.save(raw);
    const restored = new GameService(store, provider); restored.wait(120);
    expect(store.load()!.npcStates.npc_koharu.currentLocationId).toBe("loc_inn");
    expect(store.load()!.npcStates.npc_koharu.actionPlan?.status).toBe("cancelled");
  });
  it("SQLite restores both pending invitation and scheduled movement", async () => {
    const store = new SqliteGameStore(":memory:");
    try {
      const provider = new MeetingProvider({ apiKey: "" }), game = new GameService(store, provider);
      game.travel("loc_shrine"); game.startEncounter("npc_koharu"); await game.startHeartEncounter(game.getState().revision); await showSpeech(game);
      const restored = new GameService(store, provider); await playInvite(restored); await restored.completeEncounter();
      const resumed = new GameService(store, provider); resumed.leaveLocation(); resumed.travel("loc_home"); expect(plan(resumed)?.status).toBe("waiting");
    } finally { store.close(); }
  });
  it("a next-day plan survives night and arrives on the following day", async () => {
    const { game, store, provider } = await setup(); await playInvite(game); await game.completeEncounter();
    const raw = store.load()!;
    raw.npcStates.npc_koharu.actionPlan!.arriveAt = 1440 + 600;
    raw.npcStates.npc_koharu.actionPlan!.waitUntil = 1440 + 720;
    store.save(raw); const restored = new GameService(store, provider);
    restored.waitUntilNight(); await restored.endDay();
    expect(plan(restored)?.status).toBe("planned");
    restored.travel("loc_home"); expect(plan(restored)?.status).toBe("waiting");
    expect(restored.getState().day).toBe(2);
  });
  it("movement is deferred during active conversation without rewinding the clock", async () => {
    const { game, store, provider } = await setup(); await playInvite(game); await game.completeEncounter();
    game.startEncounter("npc_koharu");
    // Starting the legacy conversation consumes two hours; it must not move its speaker mid-dialogue.
    await game.selectInteractionMode("talk");
    expect(store.load()!.npcStates.npc_koharu.currentLocationId).toBe("loc_shrine");
    const minute = game.getState().currentMinute;
    await game.completeEncounter();
    expect(game.getState().currentMinute).toBe(minute);
    expect(store.load()!.npcStates.npc_koharu.currentLocationId).toBe("loc_home");
    expect(store.load()!.npcStates.npc_koharu.actionPlan?.status).toBe("waiting");
  });
  it("remote position is not revealed by the public plan projection", async () => {
    const { game, store } = await setup(); await playInvite(game); await game.completeEncounter(); game.wait(90);
    expect(store.load()!.npcStates.npc_koharu.actionPlan?.status).toBe("waiting");
    expect(plan(game)?.status).toBe("planned");
    expect(game.getState().npcStates.npc_koharu.currentLocationId).toBe("unknown");
  });
  it("checks time, locations, NPC provenance and exposes the plan only to its own prompt", () => {
    const state = createInitialState(); state.currentMinute = 720; state.activeNpcId = "npc_koharu";
    for (const bad of [{ arriveAt: 720 }, { locationId: "nonexistent" }, { waitUntil: 780 }, { arriveAt: 1100, waitUntil: 1140 }, { arriveAt: 2220, waitUntil: 2280 }])
      expect(validMeetingPlan({ ...proposal(), ...bad }, state, "npc_koharu")).toBe(false);
    expect(validMeetingPlan(proposal(), state, "npc_koharu")).toBe(true);
    state.npcStates.npc_koharu.actionPlan = { ...proposal(), id: "plan_test", sourceEventId: "event_test", status: "planned" };
    const c: HeartContext = { state, npcId: "npc_koharu", mode: "talk", heartIntent: "opening", selectedOption: null, giftItem: null, effect: "" };
    expect(JSON.parse(buildHeartPrompt(c, buildCasePrompt(c).user).user).action_plan.id).toBe("plan_test");
    const raw = { beats: [{ speaker: "npc", line: "你来了。", emotion: "平静" }, { speaker: "player", line: proposal().quote, emotion: "平静" }],
      action_plan: proposal(), choice_point: null, can_continue: true, closing_reason: "", used_fact_ids: [], disclosed_fact_ids: [], progress: { type: "request", summary: "提出一项具体会面安排" }, pickup: null };
    expect(() => validateHeartDraft(raw, c, [])).toThrow("invalid_action_plan");
  });
});
