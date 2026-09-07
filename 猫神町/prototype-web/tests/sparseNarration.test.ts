import { describe, expect, it } from "vitest";
import { buildCasePrompt, CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { buildHeartPrompt, heartResult, validateHeartDraft, type HeartContext } from "../server/src/heartDialogue.ts";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { SPARSE_NARRATION_GUIDANCE } from "../server/src/narrationPrompt.ts";

function context(): HeartContext {
  const state = createInitialState();
  state.activeNpcId = "npc_koharu"; state.currentLocationId = "loc_shrine";
  state.heartSession = { id: "sparse_test", claimedKinds: [] };
  return { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: "opening" };
}
function response(data: unknown) {
  return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(data) } }] }), { status: 200 });
}
function draft(stageDirections: string[]) {
  return { action_plan: null, beats: stageDirections.map((stage_direction, i) => ({
    speaker: i === 0 ? "npc" : "player", line: i === 0 ? "我有点害怕，先坐一会儿吧。" : "好，我在这里。", stage_direction, emotion: "平静"
  })), can_continue: true, choice_point: null, closing_reason: "", used_fact_ids: [], pickup: null };
}

describe("稀疏旁白契约", () => {
  it("普通与拾绪提示共用大动作专用指导，并保留空旁白示例", () => {
    const c = context(), ordinary = buildCasePrompt(c), heart = buildHeartPrompt(c, ordinary.user);
    for (const prompt of [ordinary.system, heart.system]) {
      expect(prompt).toContain(SPARSE_NARRATION_GUIDANCE);
      expect(prompt).toContain('stage_direction":""');
      expect(prompt).toContain("即使体现情绪转折也省略");
      expect(prompt).toContain("没有每段一次的额度");
      expect(prompt).not.toContain("每段0至1");
      expect(prompt).toContain("明确写出行动者的角色姓名");
      expect(prompt).toContain("名字必须属于实际做动作的人");
      expect(prompt).toContain("不改变正常台词的人称表达");
    }
    expect(JSON.parse(ordinary.user).output_example.stage_direction).toBe("");
  });

  it("零旁白是合法的直接台词，不会产生空白播放停顿", async () => {
    class EmptyNarrationProvider extends CaseDialogueProvider {
      async generateHearts(c: HeartContext) { return heartResult(validateHeartDraft(draft(["", ""]), c, []), c, "mock"); }
    }
    const game = new GameService(new MemoryGameStore(), new EmptyNarrationProvider({ apiKey: "" }));
    game.travel("loc_shrine"); game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    expect(game.getState().dialogueNarrationIndex).toBeNull();
    expect(game.getState().eventLog.at(-1)?.type).toBe("dialogue_generated");
    await game.nextDialogueBeat(game.getState().revision);
    expect(game.getState().eventLog.filter(e => e.type === "narration_generated")).toHaveLength(0);
    expect(game.getState().eventLog.filter(e => e.type === "dialogue_generated").map(e => e.details.line)).toEqual(["我有点害怕，先坐一会儿吧。", "好，我在这里。"]);
  });

  it("连续真正改变现场的大动作不受通常配额硬限制", () => {
    const c = context();
    expect(() => validateHeartDraft(draft(["雨宫小春推开内室门，跨进昏暗的房间。", "朝雾遥把横倒的书架拖开，让雨宫小春能通过。", "雨宫小春伸手拦住正要离开的朝雾遥。"]), c, [])).not.toThrow();
  });

  it("有旁白的结果仍保留原有节拍和拾绪效果，生成只调用生成与审校", async () => {
    let calls = 0;
    const c = context();
    const generated = { ...draft(["雨宫小春把门拉开，露出昏暗的内室。"]), pickup: { beat_index: 0, kind: "fear", quote: "我有点害怕" } };
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl: async () => response(++calls === 1 ? generated : { approved: true, reason: "none", issue: "" }) });
    const result = await provider.generateHearts(c);
    expect(calls).toBe(2);
    expect(result.stageDirection).toContain("拉开");
    expect(result.heart?.pickups).toEqual([{ beatIndex: 0, kind: "fear", quote: "我有点害怕" }]);
  });
});
