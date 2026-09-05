import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { CaseDialogueProvider, fallbackDialogue, type CaseContext, type PlanIntent } from "../server/src/caseProvider.ts";
import { MemoryGameStore, SqliteGameStore } from "../server/src/persistence.ts";
import { availableActions } from "../server/src/caseData.ts";
import { type GameState, demoBootstrap } from "../packages/shared/src/index.ts";

class TestProvider extends CaseDialogueProvider {
  constructor(private intent: PlanIntent = "approach", private witness: "wait" | "write" | "notify_ritsu" | "notify_police" = "wait") { super({ apiKey: "" }); }
  async generate(c: CaseContext) {
    const d = fallbackDialogue(c);
    const all = availableActions(c.state, c.npcId);
    // State-machine fixtures deliberately expose actions; production choices are model generated.
    d.options = [...all, { id: "ask", text: "继续问这件事。", intent: "追问" }].slice(0, 3);
    // Deterministic choice routes, without bypassing service validation.
    const wanted = c.state.storyFlags.includes("test_write") ? "write" : c.state.storyFlags.includes("test_retract") ? "retract" : null;
    if (wanted && all.some(o=>o.id === wanted)) d.options = [all.find(o=>o.id === wanted)!, ...d.options.filter(o=>o.id!==wanted)].slice(0,3);
    return d;
  }
  async plan() { return this.intent; }
  async planWitness() { return this.witness; }
}
function setup(patch: Partial<GameState> = {}, p = new TestProvider()) {
  const store = new MemoryGameStore(); store.save({ ...createInitialState(), ...patch });
  return { store, g: new GameService(store,p), p };
}
async function allBeats(g: GameService) {
  for (let limit = 0; limit < 8; limit++) {
    const s = g.getState(), d = s.currentDialogue;
    if (!d || s.dialogueBeatIndex >= d.continuations.length + (s.lastPlayerChoice ? 1 : 0)) return;
    await g.nextDialogueBeat();
  }
}
async function talk(g: GameService, npc = "npc_koharu") {
  g.startEncounter(npc); await g.selectInteractionMode("talk"); await allBeats(g);
}
const unlocked = demoBootstrap.locations.map(l=>l.id);
function incidentState(stage: "scheduled"|"contact"|"threat"|"attack", minute = 660): Partial<GameState> {
  const s = createInitialState();
  s.npcStates.npc_ritsu.knownFactIds.push("R01");
  if (stage !== "scheduled") s.npcStates.npc_ritsu.currentLocationId = "loc_inn";
  return { ...s, currentMinute: minute, discoveredLocationIds: unlocked,
    incident: { id: "evt_chiyo_retracts_statement", stage, intent: "attack", nextAt: minute + 30, resolvedText: "", interruptedUntil: null } };
}
describe("exploration and dialogue", () => {
  it("travel is separate from encounter and mode, all seven selectable", async () => {
    const {g,store} = setup({ discoveredLocationIds: unlocked });
    g.travel("loc_arcade");
    expect(g.getState().currentMinute).toBe(600); expect(g.getState().activeNpcId).toBeNull();
    expect(()=>g.startEncounter()).toThrow();
    g.startEncounter("npc_ritsu"); expect(g.getState().currentMinute).toBe(600);
    await g.completeEncounter(); g.startEncounter("npc_genichi"); await g.selectInteractionMode("talk");
    expect(store.load()!.currentMinute).toBe(720); expect(g.getState().activeNpcId).toBe("npc_genichi");
  });
  it("empty locations remain visitable with inspectable evidence", () => {
    const {g}=setup({discoveredLocationIds:unlocked}); g.travel("loc_home");
    expect(g.getState().phase).toBe("location");
    expect(g.inspectItem("E09").state.evidenceJournal[0].text).toContain("九条让我这么写");
    expect(g.getState().itemOwners.E09).toBe("loc_home");
  });
  it("hidden locations cannot be requested directly", () => {
    const {g}=setup(); expect(()=>g.travel("loc_inn")).toThrow("还不知道");
  });
  it("unplayed future lines don't discover places; next-beat and refresh persist exactly", async () => {
    class Future extends TestProvider { async generate(c:CaseContext) { const d=await super.generate(c); d.line="你好。"; d.continuations=[{line:"去白石旅馆看看。",emotion:"平静",speakerId:c.npcId}]; return d; } }
    const {g,store,p}=setup({},new Future()); g.travel("loc_shrine"); g.startEncounter("npc_koharu"); await g.selectInteractionMode("talk");
    expect(g.getState().discoveredLocationIds).not.toContain("loc_inn");
    await expect(g.chooseTalkOption("daily")).rejects.toThrow("看完");
    await g.nextDialogueBeat();
    expect(g.getState().discoveredLocationIds).toContain("loc_inn");
    const restored = new GameService(store,p); expect(restored.getState().dialogueBeatIndex).toBe(1);
    expect(restored.getState().eventLog.filter(e=>e.type==="location_discovered"&&e.locationId==="loc_inn")).toHaveLength(1);
  });
  it("choosing an option plays the player's line in the regular beat stream first", async () => {
    const {g}=setup(); g.travel("loc_shrine"); await talk(g);
    const o=g.getState().currentDialogue!.options[0];
    await g.chooseTalkOption(o.id);
    expect(g.getState().lastPlayerChoice).toBe(o.text);
    expect(g.getState().dialogueBeatIndex).toBe(0);
    expect(g.getState().eventLog.at(-1)!.actorId).toBe("player");
  });
  it("ends unplayed dialogue without inventing memories of future lines", async () => {
    const {g,store}=setup();g.travel("loc_shrine");g.startEncounter("npc_koharu");await g.selectInteractionMode("talk");
    const count=store.load()!.npcStates.npc_koharu.memories.length;
    await g.completeEncounter();
    expect(store.load()!.npcStates.npc_koharu.memories.length).toBe(count);
  });
});
describe("materials, memory and public projection", () => {
  it("show doesn't transfer; request and acknowledged handover transfers once", async () => {
    const {g,store}=setup(); g.travel("loc_shrine"); await talk(g);
    await g.chooseTalkOption("show:E01");
    expect(store.load()!.evidenceJournal).toHaveLength(0);
    await allBeats(g);
    expect(store.load()!.itemOwners.E01).toBe("npc_koharu");
    expect(g.getState().evidenceJournal[0].id).toBe("E01");
    await g.chooseTalkOption("ask"); await allBeats(g);
    await g.chooseTalkOption("take:E01"); await allBeats(g);
    expect(g.getState().itemOwners.E01).toBe("player");
    expect(store.load()!.eventLog.filter(e=>e.type==="item_transfer"&&e.itemId==="E01")).toHaveLength(1);
  });
  it("every existing item can be gifted, including evidence", async () => {
    for (const item of demoBootstrap.items.filter(i=>i.initialOwnerId !== "uncreated")) {
      const s=createInitialState();s.itemOwners[item.id]="player";
      const {g}=setup(s);g.travel("loc_shrine");g.startEncounter("npc_koharu");
      await g.selectInteractionMode("gift");expect(g.getState().currentMinute).toBe(600);
      await g.confirmGift(item.id);expect(g.getState().itemOwners[item.id]).not.toBe("player");
      expect(g.getState().currentMinute).toBe(720);
    }
  });
  it("gift cancel is free and repeated gift cannot duplicate ownership", async () => {
    const {g}=setup();g.travel("loc_shrine");g.startEncounter("npc_koharu");await g.selectInteractionMode("gift");g.cancelInteractionMode();
    expect(g.getState().currentMinute).toBe(600);
    await g.selectInteractionMode("gift");await g.confirmGift("item_potato");
    await expect(g.confirmGift("item_thread")).rejects.toThrow();
  });
  it("reading persists after giving; presenting needs current physical ownership", async () => {
    const s=createInitialState();s.discoveredLocationIds=unlocked;s.itemOwners.E09="player";
    const {g}=setup(s);g.inspectItem("E09");g.travel("loc_shrine");g.startEncounter("npc_koharu");await g.selectInteractionMode("gift");await g.confirmGift("E09");await allBeats(g);
    expect(g.getState().evidenceJournal.some(e=>e.id==="E09")).toBe(true);
    await g.completeEncounter();g.startEncounter("npc_koharu");await g.selectInteractionMode("talk");await allBeats(g);
    await expect(g.presentEvidence("E09")).rejects.toThrow("持有");
  });
  it("only recipient learns shown facts; the whole town doesn't read the player's bag", async () => {
    const s=createInitialState();s.itemOwners.E09="player";
    const {g,store}=setup(s);g.travel("loc_shrine");await talk(g);await g.presentEvidence("E09");
    expect(store.load()!.npcStates.npc_koharu.knownFactIds).toContain("F12");
    expect(store.load()!.npcStates.npc_saya.knownFactIds).not.toContain("F12");
    expect(g.getState().npcStates.npc_ritsu.knownFactIds).toEqual([]);
    expect(JSON.stringify(g.getState())).not.toContain("故意将她推下");
  });
  it("daily advance retains memory and public rules without old scripted disappearance", async () => {
    const {g,store}=setup();g.travel("loc_shrine");await talk(g);await g.completeEncounter();g.leaveLocation();g.waitUntilNight();g.changeRule("faith","item_potato");await g.endDay();
    expect(store.load()!.npcStates.npc_koharu.memories.length).toBeGreaterThan(1);
    expect(g.getState().activeRules.faith!.displayText).toBe("土豆是神");
    expect(JSON.stringify(store.load())).not.toMatch(/零号站台|17:47|第二次神隐/);
  });
  it("rejects invalid or inaccessible pickups", () => {
    const {g}=setup(); expect(()=>g.inspectItem("E12",true)).toThrow();g.travel("loc_shrine");
    expect(()=>g.inspectItem("E07",true)).toThrow();expect(()=>g.inspectItem("fake",true)).toThrow();
  });
});
describe("retraction, independent plans and observable incidents", () => {
  it("retraction alone doesn't create a document or notify Ritsu", async () => {
    const s=createInitialState();s.discoveredLocationIds=unlocked;s.storyFlags=["test_retract"];s.evidenceJournal=[{id:"E03",name:"信",text:"已读",source:"测试",day:1}];
    const {g,store}=setup(s);g.travel("loc_inn");await talk(g,"npc_chiyo");await g.chooseTalkOption("retract");await allBeats(g);await g.completeEncounter();
    expect(store.load()!.storyFlags).toContain("chiyo_retracted");
    expect(store.load()!.itemOwners.E12).toBe("uncreated");expect(store.load()!.npcStates.npc_ritsu.knownFactIds).not.toContain("R01");
    expect(store.load()!.incident).toBeNull();
  });
  it("actual notification enables a model plan, never instant death", async () => {
    const s=createInitialState();s.storyFlags=["chiyo_retracted"];s.discoveredLocationIds=unlocked;
    const {g,store}=setup(s,new TestProvider("attack"));g.travel("loc_arcade");await talk(g,"npc_ritsu");await g.tellRetraction();
    expect(store.load()!.npcStates.npc_ritsu.knownFactIds).toContain("R01");
    expect(store.load()!.incident!.stage).toBe("scheduled");expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("alive");
    expect(g.getState().incident).toBeNull();expect(JSON.stringify(g.getState())).not.toContain("律决定");
  });
  it("Chiyo may independently notify Ritsu, with an explicit received message", async () => {
    const s=createInitialState();s.storyFlags=["chiyo_retracted"];s.npcStates.npc_chiyo.knownFactIds.push("R01");s.discoveredLocationIds=unlocked;
    const {g,store}=setup(s,new TestProvider("threaten","notify_ritsu"));g.travel("loc_inn");await talk(g,"npc_chiyo");await g.completeEncounter();
    expect(store.load()!.eventLog.some(e=>e.type==="information_delivered"&&e.actorId==="npc_chiyo"&&e.targetId==="npc_ritsu")).toBe(true);
    expect(store.load()!.incident!.intent).toBe("threaten");
  });
  it("writing E12 is separate and creates exactly one owned statement", async () => {
    const s=createInitialState();s.storyFlags=["chiyo_retracted","test_write"];s.discoveredLocationIds=unlocked;s.npcStates.npc_chiyo.knownFactIds.push("R01");
    const {g,store}=setup(s);g.travel("loc_inn");await talk(g,"npc_chiyo");await g.chooseTalkOption("write");await allBeats(g);
    expect(store.load()!.itemOwners.E12).toBe("npc_chiyo");expect(g.getState().evidenceJournal.filter(e=>e.id==="E12")).toHaveLength(1);
    expect(store.load()!.npcStates.npc_ritsu.knownFactIds).not.toContain("R01");
  });
  it("witness before escalation prevents this attempt", () => {
    const {g,store}=setup(incidentState("scheduled"));g.travel("loc_inn");
    expect(g.getState().phase).toBe("incident");
    g.resolvePlayerIncident("stay");
    expect(store.load()!.incident!.stage).toBe("resolved");expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("alive");
  });
  it("arrival exactly at the resolution deadline sees the resolved result", () => {
    const s=incidentState("threat");s.incident!.nextAt=690;
    const {g,store}=setup(s);g.travel("loc_inn");
    // At 12:00 the attack resolution node would be reached: use a later deadline to arrive mid-assault.
    expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("dead");
  });
  it("an actual mid-assault arrival interrupts before the resolution deadline", () => {
    const s=incidentState("threat");s.incident!.nextAt=710;
    const {g,store}=setup(s);g.travel("loc_inn");expect(g.getState().incident!.stage).toBe("attack");
    g.resolvePlayerIncident("intervene");
    expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("injured");
    expect(store.load()!.storyFlags).toContain("witness_attack_seen");
  });
  it("arriving after resolution sees aftermath, never retroactively rescues", () => {
    const s=incidentState("attack");const {g,store}=setup(s);g.travel("loc_inn");
    expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("dead");expect(g.getState().phase).toBe("location");
    expect(()=>g.resolvePlayerIncident("intervene")).toThrow();
    expect(g.getState().eventLog.at(-1)!.details.text).toContain("死亡");
  });
  it("long waiting at the inn pauses at contact, not after death", () => {
    const s=incidentState("scheduled");s.phase="location";s.currentLocationId="loc_inn";
    const {g,store}=setup(s);g.waitUntilNight();
    expect(g.getState().phase).toBe("incident");expect(g.getState().currentMinute).toBe(690);
    expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("alive");
    g.resolvePlayerIncident("leave");
    expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("dead");
  });
  it("leaving during assault lets time continue; death neither drops nor invents items", () => {
    const s=incidentState("threat");s.incident!.nextAt=710;s.itemOwners.E03="player";
    const {g,store}=setup(s);g.travel("loc_inn");g.resolvePlayerIncident("leave");g.wait(30);
    expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("dead");
    expect(g.getState().itemOwners.E03).toBe("player");expect(store.load()!.itemOwners.E12).toBe("uncreated");
  });
  it("dead and injured characters cannot start chats or receive a new gift", () => {
    for (const lifeState of ["dead","injured"] as const) {
      const s=createInitialState();s.discoveredLocationIds=unlocked;s.npcStates.npc_chiyo.lifeState=lifeState;
      const {g}=setup(s);g.travel("loc_inn");expect(()=>g.startEncounter("npc_chiyo")).toThrow();
    }
  });
  it("physical police arrival can stop the chain; requests aren't teleportation", () => {
    const s=incidentState("attack");s.pendingNpcMove={npcId:"npc_makoto",locationId:"loc_inn",arriveAt:675};
    const {g,store}=setup(s);expect(store.load()!.npcStates.npc_makoto.currentLocationId).toBe("loc_police");
    g.wait(30);expect(store.load()!.npcStates.npc_makoto.currentLocationId).toBe("loc_inn");
    expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("injured");
  });
  it("nonlethal intent never becomes a hidden automatic murder", () => {
    for(const intent of ["approach","threaten","withdraw"] as const) {
      const s=incidentState("scheduled");s.incident!.intent=intent;
      const {g,store}=setup(s);g.waitUntilNight();
      expect(store.load()!.npcStates.npc_chiyo.lifeState).toBe("alive");
    }
  });
});
describe("ending and persistence", () => {
  it("finishes on day seven with seven factual outcomes and frozen actions", async () => {
    const {g}=setup();
    for(let day=1;day<=7;day++){g.waitUntilNight();await g.endDay();}
    expect(g.getState().phase).toBe("ending");expect(g.getState().ending!.npcOutcomes).toHaveLength(7);
    expect(g.getState().ending!.narration).not.toContain("藤崎律杀");
    expect(()=>g.travel("loc_shrine")).toThrow();await expect(g.endDay()).rejects.toThrow();
  });
  it("restores the chapter and doesn't replace a corrupt or v2 database", () => {
    const dir=mkdtempSync(join(tmpdir(),"cat-case-test-"));
    try {
      const old=join(dir,"demo-save.sqlite");writeFileSync(old,"old database sentinel");
      const db=join(dir,"sunset-case-v1.sqlite");const store=new SqliteGameStore(db);
      const g=new GameService(store,new TestProvider());g.travel("loc_shrine");store.close();
      const restored=new SqliteGameStore(db);expect(new GameService(restored,new TestProvider()).getState().currentLocationId).toBe("loc_shrine");restored.close();
      expect(readFileSync(old,"utf8")).toBe("old database sentinel");
      const bad=new MemoryGameStore();bad.save({...createInitialState(),saveVersion:2} as unknown as GameState);
      expect(()=>new GameService(bad,new TestProvider())).toThrow();expect(bad.load()!.saveVersion).toBe(2);
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
});
