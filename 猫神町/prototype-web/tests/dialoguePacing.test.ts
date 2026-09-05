import { describe, it, expect, vi } from "vitest";
import { createInitialState, GameService } from "../server/src/gameService.ts";
import { CaseDialogueProvider, buildCasePrompt, fallbackDialogue, type CaseContext } from "../server/src/caseProvider.ts";
import { encounterPacing, characterFarewell } from "../server/src/dialoguePacing.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { demoBootstrap, type GameState } from "../packages/shared/src/index.ts";

function context(count = 18, choices = 0, npcId = "npc_koharu"): CaseContext {
  const state = createInitialState();
  state.phase = "encounter"; state.activeNpcId = npcId; state.interactionMode = "talk"; state.currentLocationId = state.npcStates[npcId].currentLocationId;
  const event = (type: GameState["eventLog"][number]["type"], text: string) => {
    const sequence = state.eventLog.length;
    state.eventLog.push({ id: "e" + sequence, sequence, day: 1, minute: 660, period: "morning", type,
      actorId: npcId, targetId: npcId, audience: ["player", npcId], locationId: state.currentLocationId, itemId: null, details: { text } });
  };
  event("encounter_started", "开始会面。");
  for (let i = 0; i < count; i++) event("dialogue_generated", "眼前的对话 " + i);
  for (let i = 0; i < choices; i++) event("dialogue_choice", "实际选择 " + i);
  return { state, npcId, mode: "talk", selectedOption: { id: "reply", text: "别勉强自己。", intent: "体谅" }, giftItem: null, effect: "" };
}
const body = (extra = {}) => ({ line: "谢谢。今天先说这些，我去扫扫神社门口。", stage_direction: "伸手去拿扫帚。",
  emotion: "平静", continuations: [], options: [], used_fact_ids: [], accept_action: false, closing_reason: "回到神社杂务", ...extra });
const response = (value: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) } }] }));
async function readAll(g: GameService) {
  let s = g.getState();
  while (s.currentDialogue && s.dialogueBeatIndex < s.currentDialogue.continuations.length + Number(!!s.lastPlayerChoice)) {
    await g.nextDialogueBeat(); s = g.getState();
  }
}
describe("bounded, in-character meetings", () => {
  it("counts actual displayed beats, reserving room for the selected line and a farewell", () => {
    const c = context(17);
    expect(encounterPacing(c.state, true)).toMatchObject({ spoken: 17, remaining: 7, mustClose: false, maxGeneratedLines: 4 });
    expect(encounterPacing(context(18).state, true).mustClose).toBe(true);
    expect(encounterPacing(context(22).state, true).maxGeneratedLines).toBe(1);
    expect(encounterPacing(context(6, 5).state, true).mustClose).toBe(true);
    expect(encounterPacing(context(10, 2).state, true).stage).toBe("developing");
    expect(encounterPacing(context(14, 3).state, true).stage).toBe("winding_down");
  });
  it("counts only this meeting and survives loading the save", () => {
    const c = context(18); const store = new MemoryGameStore(); store.save(c.state);
    expect(encounterPacing(store.load()!, true).spoken).toBe(18);
    c.state.eventLog.push({ ...c.state.eventLog[0], id: "new_start", type: "encounter_started" });
    expect(encounterPacing(c.state, false).spoken).toBe(0);
  });
  it("gives the model a live budget and the character's reason for leaving", () => {
    const p = buildCasePrompt(context()), u = JSON.parse(p.user);
    expect(u.conversation_pacing).toMatchObject({ maxLines: 24, spoken: 18, mustClose: true });
    expect(u.farewell_hint.reason).toContain("神社");
    expect(p.system).toContain("末句不能问问题");
  });
  it.each(demoBootstrap.npcs.map(n => n.id))("has a distinct bounded farewell for %s", id => {
    const d = fallbackDialogue(context(18, 0, id));
    expect(d.options).toEqual([]);
    expect(d.continuations.at(-1)?.line).toBe(characterFarewell(context().state, id).line);
    expect(d.line).not.toMatch(/[？?]/);
  });
  it("injured characters rest instead of performing normal work", () => {
    const c = context(); c.state.npcStates.npc_koharu.lifeState = "injured";
    expect(fallbackDialogue(c).continuations.at(-1)?.line).toContain("歇一会儿");
    expect(fallbackDialogue(c).line).not.toContain("扫");
  });
  it("acknowledges comfort before the fallback farewell instead of dropping the player's line", () => {
    const c = context(); c.selectedOption = { id: "comfort", text: "那不是你的错。", intent: "安慰" };
    const d = fallbackDialogue(c);
    expect(d.line).toContain("谢谢");
    expect(d.continuations).toHaveLength(1);
    expect(d.continuations[0].line).toContain("扫");
  });
  it("accepts a contextual AI farewell without more options", async () => {
    const p = new CaseDialogueProvider({ apiKey: "test", review: false, fetchImpl: async () => response(body()) });
    const d = await p.generate(context()); expect(d.debug.provider).toBe("deepseek"); expect(d.options).toEqual([]);
  });
  it("rejects endless new options at the limit and falls back in character", async () => {
    const options = [{ text: "接着说。", intent: "追问", angle: "问", action_id: null }, { text: "还有呢？", intent: "追问", angle: "再问", action_id: null }];
    const p = new CaseDialogueProvider({ apiKey: "test", review: false, maxAttempts: 1, fetchImpl: async () => response(body({ options })) });
    const d = await p.generate(context());
    expect(d.options).toEqual([]); expect(d.continuations.at(-1)?.line).toContain("扫");
    expect(p.getLogs().at(-1)?.errorCode).toBe("conversation_closing");
  });
  it("rejects a generation that exceeds remaining display slots", async () => {
    const p = new CaseDialogueProvider({ apiKey: "test", review: false, maxAttempts: 1, fetchImpl: async () =>
      response(body({ continuations: [{ speaker: "npc", line: "再说一句。", emotion: "平静" }] })) });
    expect((await p.generate(context(22))).continuations).toHaveLength(0);
    expect(p.getLogs().at(-1)?.errorCode).toBe("dialogue_length");
  });
  it("keeps an acknowledged item action before the final farewell", () => {
    const c = context(22); c.effect = "take:E01";
    const d = fallbackDialogue(c);
    expect(d.debug.npcActionId).toBe("take:E01");
    expect(d.line).toContain("这份你拿着"); expect(d.line).toContain("扫");
    expect(d.continuations).toHaveLength(0);
  });
  it("service caps even a provider that ignores the prompt, then prevents reopening via evidence", async () => {
    class Endless extends CaseDialogueProvider {
      constructor() { super({ apiKey: "" }); }
      async generate(c: CaseContext) {
        const d = fallbackDialogue(c); d.line = "还想说什么？"; d.continuations = [];
        d.options = [{ id: "next", text: "接着说。", intent: "继续" }]; return d;
      }
    }
    const store = new MemoryGameStore(), s = context(0).state;
    s.phase = "location"; s.activeNpcId = null; s.interactionMode = null; s.currentDialogue = null; s.eventLog = [];
    s.itemOwners.E01 = "player"; s.storyFlags.push("chiyo_retracted"); store.save(s);
    const g = new GameService(store, new Endless());
    g.startEncounter("npc_koharu"); await g.selectInteractionMode("talk"); await readAll(g);
    for (let i = 0; i < 5; i++) { await g.chooseTalkOption("next"); await readAll(g); }
    expect(g.getState().currentDialogue!.options).toEqual([]);
    expect(g.getState().currentDialogue!.continuations.at(-1)?.line).toContain("扫");
    expect(encounterPacing(store.load()!, false).spoken).toBeLessThanOrEqual(24);
    await expect(g.presentEvidence("E01")).rejects.toThrow("已经结束");
    await expect(g.tellRetraction()).rejects.toThrow("已经结束");
    await g.completeEncounter(); expect(g.getState().phase).toBe("location");
  });
  it("handles an old already-long meeting without deleting its history", () => {
    const c = context(40), before = c.state.eventLog.length;
    expect(fallbackDialogue(c).options).toEqual([]);
    expect(c.state.eventLog).toHaveLength(before);
    expect(encounterPacing(c.state, true)).toMatchObject({ mustClose: true, maxGeneratedLines: 1 });
  });
  it("finishes the final handover and farewell on exactly the 24th displayed line", async () => {
    const c = context(22);
    c.state.lastPlayerChoice = null; c.state.dialogueBeatIndex = 0;
    c.state.evidenceJournal.push({ id: "E01", name: "车票", text: "两张车票。", source: "小春", day: 1 });
    c.state.currentDialogue = { speakerId: c.npcId, line: "票先在我这里。", stageDirection: "", emotion: "平静",
      continuations: [], options: [{ id: "take_last", text: "票交给我吧。", intent: "索要", actionId: "take:E01" }],
      debug: { provider: "mock", decision: "fixture", usedFacts: [] } };
    const store = new MemoryGameStore(); store.save(c.state);
    const g = new GameService(store, new CaseDialogueProvider({ apiKey: "" }));
    await g.chooseTalkOption("take_last");
    expect(g.getState().itemOwners.E01).toBe("npc_koharu");
    await readAll(g);
    expect(encounterPacing(store.load()!, false).spoken).toBe(24);
    expect(g.getState().itemOwners.E01).toBe("player");
    expect(g.getState().currentDialogue!.options).toEqual([]);
  });
  it("passes closing requirements to independent semantic review", async () => {
    const fn = vi.fn().mockResolvedValueOnce(response(body())).mockResolvedValueOnce(response({ approved: false, reason: "conversation_closing", issue: "结尾仍在邀玩家追问" }));
    const p = new CaseDialogueProvider({ apiKey: "test", maxAttempts: 1, fetchImpl: fn });
    expect((await p.generate(context())).debug.provider).toBe("mock_fallback");
    const sent = JSON.parse(JSON.parse(fn.mock.calls[1][1].body).messages[1].content);
    expect(sent.conversation_pacing.mustClose).toBe(true);
  });
});
