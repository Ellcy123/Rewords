import { describe, expect, it } from "vitest";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { CaseDialogueProvider, DialogueGenerationError } from "../server/src/caseProvider.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { type GameState } from "../packages/shared/src/index.ts";
import { type HeartContext } from "../server/src/heartDialogue.ts";

class BrokenHeartProvider extends CaseDialogueProvider {
  async generateHearts(_context: HeartContext) { throw new DialogueGenerationError(); }
}

class ChiyoPlanner extends CaseDialogueProvider {
  calls = 0;
  async planWitness() { this.calls++; return "notify_ritsu" as const; }
}

function setup(patch: Partial<GameState> = {}, provider = new CaseDialogueProvider({ apiKey: "" })) {
  const store = new MemoryGameStore();
  store.save({ ...createInitialState(), ...patch });
  return { game: new GameService(store, provider), store, provider };
}

function worldEvents(game: GameService) {
  return game.getState().eventLog.filter(e => ["encounter_started", "encounter_completed", "action_plan_updated", "story_beat", "information_delivered"].includes(e.type));
}

describe("NPC interaction selection is only a preview", () => {
  it("can switch the selected NPC or leave without starting an encounter", () => {
    const { game } = setup();
    game.travel("loc_arcade");
    const minute = game.getState().currentMinute;

    game.startEncounter("npc_ritsu");
    expect(game.getState()).toMatchObject({ phase: "location", activeNpcId: "npc_ritsu", currentMinute: minute, interactionMode: null });
    game.startEncounter("npc_genichi");
    expect(game.getState()).toMatchObject({ phase: "location", activeNpcId: "npc_genichi", currentMinute: minute, interactionMode: null });
    expect(worldEvents(game)).toEqual([]);

    game.leaveLocation();
    expect(game.getState()).toMatchObject({ phase: "action", currentLocationId: null, activeNpcId: null, interactionMode: null });
    expect(worldEvents(game)).toEqual([]);
  });

  it("closing an unchosen selection only hides it; it creates no completion, memory, plan, or independent Chiyo action", async () => {
    const state = createInitialState();
    state.discoveredLocationIds.push("loc_inn");
    state.storyFlags.push("chiyo_retracted");
    const provider = new ChiyoPlanner({ apiKey: "" });
    const { game, store } = setup(state, provider);
    game.travel("loc_inn");
    const memories = structuredClone(store.load()!.npcStates.npc_chiyo.memories);

    game.startEncounter("npc_chiyo");
    await game.completeEncounter();

    const raw = store.load()!;
    expect(game.getState()).toMatchObject({ phase: "location", activeNpcId: null, interactionMode: null });
    expect(worldEvents(game)).toEqual([]);
    expect(raw.npcStates.npc_chiyo.memories).toEqual(memories);
    expect(raw.storyFlags).not.toContain("chiyo_planned");
    expect(provider.calls).toBe(0);
  });

  it("gift cancellation returns to the unlocked selection without time, gifts, or post-dialogue planning", async () => {
    const state = createInitialState();
    state.discoveredLocationIds.push("loc_inn");
    state.storyFlags.push("chiyo_retracted");
    const provider = new ChiyoPlanner({ apiKey: "" });
    const { game, store } = setup(state, provider);
    game.travel("loc_inn");
    const minute = game.getState().currentMinute;

    game.startEncounter("npc_chiyo");
    await game.selectInteractionMode("gift");
    expect(game.getState()).toMatchObject({ phase: "encounter", activeNpcId: "npc_chiyo", interactionMode: "gift", currentMinute: minute });
    game.cancelInteractionMode();

    expect(game.getState()).toMatchObject({ phase: "location", activeNpcId: "npc_chiyo", interactionMode: null, currentMinute: minute });
    expect(worldEvents(game).map(e => e.type)).toEqual(["encounter_started", "encounter_completed"]);
    expect(worldEvents(game).at(-1)?.details.text).toContain("取消尚未交出的礼物");
    expect(store.load()!.storyFlags).not.toContain("chiyo_planned");
    expect(provider.calls).toBe(0);
  });

  it("a failed 拾绪 start restores the unlocked selection without consuming time or emitting a start event", async () => {
    const { game, store } = setup({}, new BrokenHeartProvider({ apiKey: "" }));
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    const before = game.getState();

    await expect(game.startHeartEncounter(before.revision)).rejects.toThrow();
    expect(game.getState()).toEqual(before);
    expect(store.load()!.eventLog.some(e => e.type === "encounter_started")).toBe(false);
  });

  it("only choosing 拾绪 or gift locks the encounter; 拾绪 and confirmed gifts consume the two-hour resource", async () => {
    const { game } = setup();
    game.travel("loc_shrine");
    const minute = game.getState().currentMinute;
    game.startEncounter("npc_koharu");

    await game.startHeartEncounter(game.getState().revision);
    expect(game.getState()).toMatchObject({ phase: "encounter", interactionMode: "talk", currentMinute: minute + 120 });
    expect(worldEvents(game).filter(e => e.type === "encounter_started")).toHaveLength(1);
    await game.completeEncounter();

    game.startEncounter("npc_koharu");
    const giftMinute = game.getState().currentMinute;
    await game.selectInteractionMode("gift");
    expect(game.getState()).toMatchObject({ phase: "encounter", interactionMode: "gift", currentMinute: giftMinute });
    await game.confirmGift("item_potato");
    expect(game.getState().currentMinute).toBe(giftMinute + 120);
  });

  it("an unlocked selection cannot freeze an NPC's scheduled movement or turn an expired appointment into a completed one", () => {
    const state = createInitialState();
    state.currentMinute = 600;
    state.phase = "location";
    state.currentLocationId = "loc_shrine";
    state.activeNpcId = null;
    state.npcStates.npc_koharu.actionPlan = {
      id: "plan_selection", sourceEventId: "event_seed", type: "meet", targetNpcId: "player", locationId: "loc_home",
      arriveAt: 620, waitUntil: 650, reason: "测试", quote: "我会等你。", beatIndex: 0, status: "planned"
    };
    state.eventLog.push({ id: "event_seed", sequence: 0, day: 1, minute: 600, period: "morning", type: "dialogue_choice",
      actorId: "player", targetId: "npc_koharu", itemId: null, locationId: "loc_shrine", audience: ["player", "npc_koharu"], details: { text: "测试" } });
    const { game, store } = setup(state);

    game.startEncounter("npc_koharu");
    game.wait(30);
    expect(store.load()!.npcStates.npc_koharu.actionPlan?.status).toBe("waiting");
    expect(store.load()!.npcStates.npc_koharu.currentLocationId).toBe("loc_home");
    // Waiting is also an escape hatch for an unlocked preview: it must not retain
    // a stale selection after the NPC has legitimately left the scene.
    expect(game.getState().activeNpcId).toBeNull();

    game.wait(30);
    expect(store.load()!.npcStates.npc_koharu.actionPlan?.status).toBe("expired");
    expect(store.load()!.eventLog.some(e => e.type === "action_plan_updated" && e.details.text.includes("按约与"))).toBe(false);
  });

  it("migrates the old no-mode encounter shell back to a location selection without deleting history", () => {
    const old = createInitialState();
    old.phase = "encounter";
    old.currentLocationId = "loc_shrine";
    old.activeNpcId = "npc_koharu";
    old.interactionMode = null;
    old.eventLog.push({ id: "event_old", sequence: old.eventLog.length, day: 1, minute: old.currentMinute, period: old.period,
      type: "encounter_started", actorId: "player", targetId: "npc_koharu", itemId: null, locationId: "loc_shrine", audience: ["player"], details: { text: "旧会面记录" } });
    const store = new MemoryGameStore(); store.save(old);

    const game = new GameService(store, new CaseDialogueProvider({ apiKey: "" }));
    expect(game.getState()).toMatchObject({ phase: "location", currentLocationId: "loc_shrine", activeNpcId: "npc_koharu", interactionMode: null });
    expect(store.load()!.eventLog.find(e => e.id === "event_old")?.details.text).toBe("旧会面记录");
  });
});
