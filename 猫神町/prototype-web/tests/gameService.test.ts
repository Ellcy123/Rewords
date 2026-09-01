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
    expect(secondBeat.state.lastPlayerChoice).toBe("不存在的班次却留下了真的车票。你还漏了什么，直接说。");
    expect(secondBeat.state.eventLog.at(-1)?.details.player_line).toBe(secondBeat.state.lastPlayerChoice);
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

    service.endDay();
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
    expect(reset.eventLog).toHaveLength(1);
  });
});
