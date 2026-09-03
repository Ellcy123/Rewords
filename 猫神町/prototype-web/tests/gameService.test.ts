import { describe, expect, it } from "vitest";
import { GameRuleError, GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";

describe("Authoritative game loop", () => {
  it("charges travel and conversation time separately, then grants a talk reward", async () => {
    const service = new GameService(new MemoryGameStore());

    const arrived = service.travel("loc_station").state;
    expect(arrived.phase).toBe("location");
    expect(arrived.activeNpcId).toBeNull();
    expect(arrived.currentMinute).toBe(10 * 60);
    expect(arrived.period).toBe("morning");

    const meeting = service.startEncounter().state;
    expect(meeting.phase).toBe("encounter");
    expect(meeting.activeNpcId).toBe("npc_saya");

    const talking = (await service.selectInteractionMode("talk")).state;
    expect(talking.currentMinute).toBe(12 * 60);
    expect(talking.period).toBe("afternoon");
    expect(talking.currentDialogue?.speakerId).toBe("npc_saya");
    expect(talking.currentDialogue?.continuations.length).toBeGreaterThanOrEqual(1);

    const secondBeat = await service.chooseTalkOption("saya_open_press");
    expect(secondBeat.state.lastPlayerChoice).toBe("别再拿流程挡着。零号站台是你亲手打开的吗？");
    expect(secondBeat.state.eventLog.filter((event) => event.type === "dialogue_choice").at(-1)?.details.player_line).toBe(secondBeat.state.lastPlayerChoice);
    expect(secondBeat.state.currentDialogue?.continuations.some((beat) => beat.speakerId === "player_haruka")).toBe(true);
    expect(secondBeat.state.currentDialogue?.options.map((option) => option.id)).toContain("saya_ticket_doubt");
    const thirdBeat = await service.chooseTalkOption("saya_ticket_doubt");
    expect(thirdBeat.state.currentDialogue?.options.map((option) => option.id)).toContain("saya_truth_plain");
    const fourthBeat = await service.chooseTalkOption("saya_truth_plain");
    expect(fourthBeat.state.currentDialogue?.options.map((option) => option.id)).toContain("saya_take_ticket");
    const result = await service.chooseTalkOption("saya_take_ticket");
    expect(result.acquiredItemId).toBe("item_ticket");
    expect(result.state.itemOwners.item_ticket).toBe("player");
    expect(result.state.claimedRewardIds).toContain("reward_saya_ticket");
    expect(result.state.currentDialogue?.options).toHaveLength(0);

    const completed = service.completeEncounter().state;
    expect(completed.phase).toBe("action");
    expect(completed.currentMinute).toBe(12 * 60);
    expect(completed.npcStates.npc_saya.openLoops[0]).toContain("下一步推进");
    expect(completed.npcStates.npc_saya.openLoops[0]).toContain("拿票");
  });

  it("keeps arrival and meeting separate, and spends only travel time when leaving", async () => {
    const service = new GameService(new MemoryGameStore());
    const arrived = service.travel("loc_arcade").state;

    expect(arrived.phase).toBe("location");
    expect(arrived.currentLocationId).toBe("loc_arcade");
    await expect(service.selectInteractionMode("talk")).rejects.toThrow(GameRuleError);

    const left = service.leaveLocation().state;
    expect(left.phase).toBe("action");
    expect(left.currentLocationId).toBeNull();
    expect(left.activeNpcId).toBeNull();
    expect(left.currentMinute).toBe(10 * 60);
    expect(left.eventLog.at(-1)?.type).toBe("location_left");
  });

  it("allows backing out before gift confirmation without time cost, then transfers ownership", async () => {
    const service = new GameService(new MemoryGameStore());
    service.travel("loc_shrine");
    service.startEncounter();
    await service.selectInteractionMode("gift");

    const returned = service.cancelInteractionMode().state;
    expect(returned.interactionMode).toBeNull();
    expect(returned.currentMinute).toBe(10 * 60);
    await service.selectInteractionMode("gift");

    const gifted = await service.confirmGift("item_potato");
    expect(gifted.state.currentMinute).toBe(12 * 60);
    expect(gifted.state.itemOwners.item_potato).toBe("npc_koharu");
    expect(gifted.state.currentDialogue?.options).toHaveLength(3);
    expect(() => service.cancelInteractionMode()).toThrow(GameRuleError);
    await expect(service.confirmGift("item_potato")).rejects.toThrow(GameRuleError);

    const answered = (await service.respondToGift("gift_ask_use")).state;
    expect(answered.currentDialogue?.options).toHaveLength(0);
    expect(service.completeEncounter().state.itemOwners.item_potato).toBe("npc_koharu");
  });

  it("opens the shrine at 18:00, changes one rule, and persists the next day", async () => {
    const store = new MemoryGameStore();
    const service = new GameService(store);

    for (const locationId of ["loc_shrine", "loc_station", "loc_arcade"]) {
      service.travel(locationId);
      service.startEncounter();
      await service.selectInteractionMode("talk");
      service.completeEncounter();
    }

    const night = service.getState();
    expect(night.phase).toBe("night");
    expect(night.period).toBe("night");
    expect(night.currentMinute).toBe(18 * 60);

    const rewritten = service.changeRule("beauty", "item_thread").state;
    expect(rewritten.activeRules.beauty?.displayText).toBe("联系是美的");
    expect(rewritten.itemOwners.item_thread).toBe("rule:beauty");
    expect(() => service.changeRule("faith", "item_potato")).toThrow(GameRuleError);

    await service.endDay();
    const reloaded = new GameService(store).getState();
    expect(reloaded.day).toBe(2);
    expect(reloaded.period).toBe("morning");
    expect(reloaded.phase).toBe("action");
    expect(reloaded.currentMinute).toBe(9 * 60);
    expect(reloaded.activeRules.beauty?.displayText).toBe("联系是美的");
  });

  it("rejects actions that violate the current phase or ownership", async () => {
    const service = new GameService(new MemoryGameStore());
    expect(() => service.changeRule("faith", "item_potato")).toThrow(GameRuleError);
    service.travel("loc_station");
    service.startEncounter();
    await service.selectInteractionMode("gift");
    await expect(service.confirmGift("item_ticket")).rejects.toThrow(GameRuleError);
    await expect(service.selectInteractionMode("talk")).rejects.toThrow(GameRuleError);
  });

  it("can reset all progress to a clean 09:00 Day 1 save", () => {
    const service = new GameService(new MemoryGameStore());
    service.travel("loc_arcade");
    const reset = service.reset().state;
    expect(reset.day).toBe(1);
    expect(reset.phase).toBe("action");
    expect(reset.currentMinute).toBe(9 * 60);
    expect(reset.itemOwners.item_potato).toBe("player");
    expect(reset.eventLog).toHaveLength(2);
    expect(reset.eventLog.at(-1)?.type).toBe("daily_event");
  });

  it("stores NPC-specific memories with source events and relationship changes", async () => {
    const service = new GameService(new MemoryGameStore());
    service.travel("loc_shrine");
    service.startEncounter();
    await service.selectInteractionMode("talk");

    await service.chooseTalkOption("ask_memory");
    const result = await service.chooseTalkOption("koharu_guard_memory");
    const koharu = result.state.npcStates.npc_koharu!;

    expect(koharu.relationship).toBe(1);
    expect(koharu.memories.length).toBeGreaterThanOrEqual(5);
    expect(koharu.memories[0]?.sourceEventId).toMatch(/^event_/);
    expect(result.state.eventLog.some((event) => event.id === koharu.memories[0]?.sourceEventId)).toBe(true);
    expect(koharu.memories.some((memory) => memory.summary.includes("雨宫真昼"))).toBe(true);
    expect(result.state.eventLog.some((event) => event.type === "dialogue_generated")).toBe(true);
    expect(result.state.eventLog.some((event) => event.type === "npc_action")).toBe(true);
  });

  it("creates three distinct god callbacks from one faith rule", async () => {
    const service = new GameService(new MemoryGameStore());
    for (const locationId of ["loc_shrine", "loc_station", "loc_arcade"]) {
      service.travel(locationId);
      service.startEncounter();
      await service.selectInteractionMode("talk");
      service.completeEncounter();
    }

    const changed = service.changeRule("faith", "item_potato").state;
    const callbackEvents = changed.eventLog.filter((event) => event.type === "rule_callback");
    const callbackSummaries = Object.values(changed.npcStates).map(
      (npcState) => npcState.memories.find((memory) => memory.kind === "rule_callback")?.summary
    );

    expect(callbackEvents).toHaveLength(3);
    expect(new Set(callbackSummaries).size).toBe(3);
    expect(callbackSummaries.join(" ")).toContain("雨宫真昼");
    expect(callbackSummaries.join(" ")).toContain("零号站台");
    expect(callbackSummaries.join(" ")).toContain("黑色车票");
  });

  it("moves NPCs across days and lets Koharu hand a received item to Saya", async () => {
    const service = new GameService(new MemoryGameStore());
    service.travel("loc_shrine");
    service.startEncounter();
    await service.selectInteractionMode("gift");
    await service.confirmGift("item_potato");
    service.completeEncounter();

    for (const locationId of ["loc_station", "loc_arcade"]) {
      service.travel(locationId);
      service.startEncounter();
      await service.selectInteractionMode("talk");
      service.completeEncounter();
    }

    const nextDay = (await service.endDay()).state;
    expect(nextDay.itemOwners.item_potato).toBe("npc_saya");
    expect(nextDay.npcStates.npc_koharu?.currentLocationId).toBe("loc_station");
    expect(nextDay.npcStates.npc_saya?.currentLocationId).toBe("loc_arcade");
    expect(nextDay.eventLog.some((event) => event.details.reason === "npc_handoff_koharu_to_saya")).toBe(true);
    expect(nextDay.npcStates.npc_saya?.memories.some((memory) => memory.kind === "item_change")).toBe(true);
    expect(nextDay.storyFlags).toContain("saya_audit_started");
  });

  it("makes all six authored items obtainable in one complete Day 1 route", async () => {
    const service = new GameService(new MemoryGameStore());

    service.travel("loc_shrine");
    service.startEncounter();
    await service.selectInteractionMode("talk");
    await service.chooseTalkOption("ask_memory");
    service.completeEncounter();

    service.travel("loc_station");
    service.startEncounter();
    await service.selectInteractionMode("talk");
    await service.chooseTalkOption("saya_open_gentle");
    await service.chooseTalkOption("saya_ticket_inspect");
    const nameTag = await service.chooseTalkOption("saya_personal_probe");
    expect(nameTag.acquiredItemId).toBe("item_name_tag");
    await service.chooseTalkOption("saya_take_ticket");
    service.completeEncounter();

    service.travel("loc_arcade");
    service.startEncounter();
    await service.selectInteractionMode("talk");
    await service.chooseTalkOption("ask_gallery");
    service.completeEncounter();

    const state = service.getState();
    expect(Object.values(state.itemOwners).filter((owner) => owner === "player")).toHaveLength(6);
    expect(state.phase).toBe("night");
  });

  it("runs from a new game through Day 7, freezes state, and recovers gift and rule facts", async () => {
    const service = new GameService(new MemoryGameStore());

    service.travel("loc_shrine");
    service.startEncounter();
    await service.selectInteractionMode("gift");
    await service.confirmGift("item_thread");
    service.completeEncounter();
    service.travel("loc_arcade");
    service.startEncounter();
    await service.selectInteractionMode("talk");
    service.completeEncounter();
    service.waitUntilNight();
    service.changeRule("faith", "item_potato");
    await service.endDay();

    while (service.getState().day < 7) {
      service.waitUntilNight();
      await service.endDay();
    }
    service.waitUntilNight();
    const finished = (await service.endDay()).state;

    expect(finished.day).toBe(7);
    expect(finished.phase).toBe("ending");
    expect(finished.ending?.provider).toBe("mock_fallback");
    expect(finished.ending?.factSummary.gifts.join(" ")).toContain("线团");
    expect(finished.ending?.factSummary.rules.join(" ")).toContain("土豆是神");
    expect(finished.storyFlags).toContain("genichi_curates_dispute");
    expect(finished.storyFlags).toContain("final_public_test");
    expect(() => service.travel("loc_shrine")).toThrow(GameRuleError);
  });
});
