import { describe, expect, it } from "vitest";
import { GameStateSchema, dialoguePlaybackFinished, narrationSentences, separateDialogueText } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider, buildCasePrompt } from "../server/src/caseProvider.ts";
import { buildHeartPrompt, heartConversationHistory, mockHeartDialogue, validateHeartDraft, type HeartContext } from "../server/src/heartDialogue.ts";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { SqliteGameStore } from "../server/src/persistence.ts";
import { drainPlayback } from "./playback.ts";
import { encounterPacing } from "../server/src/dialoguePacing.ts";

class NarrationProvider extends CaseDialogueProvider {
  calls = 0;
  constructor() { super({ apiKey: "" }); }
  async generateHearts(c: HeartContext) {
    this.calls++;
    const d = mockHeartDialogue(c);
    d.line = "我一点到雨宫家旧居，等你到三点。";
    d.stageDirection = "小春穿好拖鞋。她不安地攥紧衣角。";
    d.continuations = [];
    d.heart = { canContinue: true, choicePoint: { quote: "等你到三点", reason: "期待回应" },
      actionPlan: { type: "meet", targetNpcId: "player", locationId: "loc_home", arriveAt: 780, waitUntil: 900, quote: d.line, reason: "约定", beatIndex: 0 },
      pickups: [{ beatIndex: 0, kind: "fear", quote: "不安地攥紧衣角" }] };
    return d;
  }
}
async function setup() {
  const store = new SqliteGameStore(":memory:"), provider = new NarrationProvider(), game = new GameService(store, provider);
  game.travel("loc_shrine"); game.startEncounter("npc_koharu"); await game.startHeartEncounter(game.getState().revision);
  return { store, provider, game };
}
function ctx(game: GameService, heartIntent: HeartContext["heartIntent"] = "listen"): HeartContext {
  return { state: game.getState(), npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent };
}

describe("independent narration playback", () => {
  it("shows one action at a time; no future speech, plan, reward or choice leaks into committed history", async () => {
    const { game, store, provider } = await setup();
    try {
      const s = game.getState();
      expect(s.dialogueNarrationIndex).toBe(0); expect(s.dialogueBeatIndex).toBe(0);
      expect(s.eventLog.at(-1)).toMatchObject({ type: "narration_generated", details: { line: "小春穿好拖鞋。" } });
      expect(s.heartCards).toEqual([]); expect(s.npcStates.npc_koharu.actionPlan).toBeNull();
      expect(s.discoveredLocationIds).not.toContain("loc_home");
      expect(dialoguePlaybackFinished(s)).toBe(false);
      const history = JSON.stringify(heartConversationHistory(ctx(game)));
      expect(history).not.toContain("攥紧"); expect(history).not.toContain(s.currentDialogue!.line);
      await expect(game.useHeart(null, s.revision)).rejects.toThrow("看完");
      await game.nextDialogueBeat(s.revision);
      expect(game.getState().dialogueNarrationIndex).toBe(1);
      expect(game.getState().heartCards).toHaveLength(1);
      const card = game.getState().heartCards[0];
      expect(game.getState().eventLog.find(e => e.id === card.sourceEventId)?.type).toBe("narration_generated");
      expect(game.getState().npcStates.npc_koharu.actionPlan).toBeNull();
      await game.nextDialogueBeat(game.getState().revision);
      expect(game.getState().dialogueNarrationIndex).toBeNull();
      expect(game.getState().npcStates.npc_koharu.actionPlan?.status).toBe("planned");
      expect(game.getState().heartCards).toHaveLength(1);
      expect(dialoguePlaybackFinished(game.getState())).toBe(true);
      expect(provider.calls).toBe(1); expect(game.getState().currentMinute).toBe(s.currentMinute);
      expect(encounterPacing(store.load()!, false).spoken).toBe(1);
      expect(game.getState().eventLog.filter(e => e.type === "dialogue_generated")).toHaveLength(1);
    } finally { store.close(); }
  });
  it("refresh preserves narration sentence cursor, stale clicks do not replay or reward twice", async () => {
    const { game, store, provider } = await setup();
    try {
      await game.nextDialogueBeat(game.getState().revision);
      const before = game.getState(), restored = new GameService(store, provider);
      expect(restored.getState()).toEqual(before);
      await restored.nextDialogueBeat(before.revision);
      const after = restored.getState();
      await expect(restored.nextDialogueBeat(before.revision)).rejects.toThrow("进度已变化");
      expect(restored.getState()).toEqual(after);
      expect(after.eventLog.filter(e => e.type === "narration_generated")).toHaveLength(2);
      expect(after.eventLog.filter(e => e.type === "heart_gathered")).toHaveLength(1);
    } finally { store.close(); }
  });
  it("leaving during narration remembers only the observed action, not the unspoken appointment", async () => {
    const { game, store } = await setup();
    try {
      await game.completeEncounter();
      expect(game.getState().npcStates.npc_koharu.actionPlan).toBeNull();
      const memories = game.getState().npcStates.npc_koharu.memories.map(m => m.summary).join("\n");
      expect(memories).toContain("穿好拖鞋"); expect(memories).not.toContain("攥紧"); expect(memories).not.toContain("等你到三点");
      expect(game.getState().dialogueNarrationIndex).toBeNull();
    } finally { store.close(); }
  });
  it("old saves stay on the already displayed speech, without replaying narration", async () => {
    const { game, store, provider } = await setup();
    try {
      await drainPlayback(game);
      const old: any = store.load()!; delete old.dialogueNarrationIndex;
      const parsed = GameStateSchema.parse(old); store.save(parsed);
      expect(parsed.dialogueNarrationIndex).toBeNull();
      expect(dialoguePlaybackFinished(new GameService(store, provider).getState())).toBe(true);
      expect(parsed.eventLog).toEqual(game.getState().eventLog);
    } finally { store.close(); }
  });
  it("selection leaves observed actions untouched; a real new interaction starts a fresh playback boundary", async () => {
    const { game, store, provider } = await setup();
    try {
      await game.completeEncounter(); game.startEncounter("npc_koharu");
      expect(game.getState().currentDialogue).toBeNull();
      const selected = heartConversationHistory(ctx(game, "opening"));
      const oldEventId = selected.played_this_encounter[0].event_id;
      expect(selected.played_this_encounter).toHaveLength(1);
      expect(selected.played_this_encounter[0]).toMatchObject({ kind: "narration", text: "小春穿好拖鞋。" });
      expect(provider.calls).toBe(1);

      // This fixture's anchored appointment is at 13:00. Rewind its synthetic
      // clock before beginning the second interaction so that the test exercises
      // a legal opening rather than an intentionally expired plan.
      const raw = store.load()!;
      raw.currentMinute = 600; raw.period = "morning";
      store.save(raw);
      const resumed = new GameService(store, provider);
      await resumed.startHeartEncounter(resumed.getState().revision);
      const c = ctx(resumed, "opening"), p = buildHeartPrompt(c, buildCasePrompt(c).user), history = JSON.parse(p.user).dialogue_history;
      expect(history.played_this_encounter).toHaveLength(1);
      expect(history.played_this_encounter[0].event_id).not.toBe(oldEventId);
      expect(history.played_this_encounter[0].text).toBe("小春穿好拖鞋。");
      expect(history.continuation).toMatchObject({ mode: "new_encounter", boundary_resets_scene: false, last_observed_before_encounter: { kind: "narration", text: "小春穿好拖鞋。" } });
      expect(history.recent_observed_actions.some((action: { text: string }) => action.text === "小春穿好拖鞋。")).toBe(true);
      expect(p.system).toContain("已经穿好拖鞋不能再拿起同一双准备穿");
      c.state.currentLocationId = "loc_home";
      expect(heartConversationHistory(c).recent_observed_actions).toEqual([]);
    } finally { store.close(); }
  });
});

describe("clean speech and continuity input", () => {
  it("repairs the observed action + speaker-label pollution, without changing ordinary questions", () => {
    expect(separateDialogueText("雨宫小春放慢脚步。雨宫小春：……她还生气吗？", "低头。", "雨宫小春"))
      .toEqual({ line: "……她还生气吗？", stageDirection: "雨宫小春放慢脚步。" });
    expect(separateDialogueText("为什么？你怎么回事？", "", "朝雾遥").line).toBe("为什么？你怎么回事？");
    expect(separateDialogueText("你说过‘雨宫小春：别走’吗？", "", "雨宫小春").line).toBe("你说过‘雨宫小春：别走’吗？");
    expect(narrationSentences("她低下头。手指松开。" )).toEqual(["她低下头。", "手指松开。"]);
    expect(narrationSentences(" ")).toEqual([]);
  });
  it("normalizes generated speech before quote checks, retaining the generator's choice", () => {
    const c: HeartContext = { state: createInitialState(), npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: "opening" };
    const d = validateHeartDraft({ beats: [{ speaker: "npc", line: "雨宫小春放慢脚步。雨宫小春：你会留下吗？", stage_direction: "停下。", emotion: "不安" }],
      can_continue: true, choice_point: { quote: "你会留下吗？", reason: "期待陪伴" }, closing_reason: "", used_fact_ids: [], disclosed_fact_ids: [], progress: { type: "request", summary: "小春提出留下陪伴的请求" }, pickup: null }, c, []);
    expect(d.beats[0].line).toBe("你会留下吗？"); expect(d.beats[0].stage_direction).toBe("雨宫小春放慢脚步。");
    expect(d.choice_point?.quote).toBe(d.beats[0].line);
  });
});
