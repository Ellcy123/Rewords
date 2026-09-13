import { describe, expect, it } from "vitest";
import { buildCasePrompt, CaseDialogueProvider, DialogueGenerationError } from "../server/src/caseProvider.ts";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { buildHeartPrompt, mockHeartDialogue, type HeartContext } from "../server/src/heartDialogue.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { showSpeech, nextSpeech } from "./playback.ts";

class CountingProvider extends CaseDialogueProvider {
  heartCalls = 0;
  lastHeartContext: HeartContext | null = null;
  async generateHearts(context: HeartContext) {
    this.heartCalls++;
    this.lastHeartContext = structuredClone(context);
    return mockHeartDialogue(context);
  }
}

function setup(provider = new CountingProvider({ apiKey: "" })) {
  const store = new MemoryGameStore();
  const game = new GameService(store, provider, { heartTestPack: true });
  game.travel("loc_shrine");
  game.startEncounter("npc_koharu");
  return { game, store, provider };
}

async function atChoice(provider = new CountingProvider({ apiKey: "" })) {
  const fixture = setup(provider);
  await fixture.game.startHeartEncounter(fixture.game.getState().revision);
  await showSpeech(fixture.game);
  return fixture;
}

describe("拾绪回复预览", () => {
  it("预览不写入状态或存档，重复同牌复用生成结果，换牌各自缓存", async () => {
    const { game, store, provider } = await atChoice();
    const before = game.getState();
    const saved = store.load();
    const fear = before.heartCards.find(card => card.kind === "fear")!;
    const sympathy = before.heartCards.find(card => card.kind === "sympathy")!;

    const first = await game.previewHeart(fear.id, before.revision);
    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
    expect(provider.heartCalls).toBe(2); // opening + preview

    expect(await game.previewHeart(fear.id, before.revision)).toEqual(first);
    expect(provider.heartCalls).toBe(2);
    const other = await game.previewHeart(sympathy.id, before.revision);
    expect(other.cardId).toBe(sympathy.id);
    expect(other.id).not.toBe(first.id);
    expect(provider.heartCalls).toBe(3);
    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
  });

  it("确认逐字采用预览首句、不二次生成；NPC后果仍待其台词播放才落地", async () => {
    const { game, provider } = await atChoice();
    const before = game.getState();
    const card = before.heartCards.find(c => c.kind === "fear")!;
    const preview = await game.previewHeart(card.id, before.revision);
    const callsBeforeConfirm = provider.heartCalls;

    await game.useHeart(card.id, before.revision, preview.id);
    const afterPlayer = game.getState();
    expect(provider.heartCalls).toBe(callsBeforeConfirm);
    expect(afterPlayer.currentDialogue).toMatchObject({ speakerId: "player", line: preview.line, stageDirection: preview.stageDirection });
    expect(afterPlayer.heartCards.some(c => c.id === card.id)).toBe(false);
    expect(afterPlayer.currentDialogue?.heart?.consequenceApplied).toBe(false);
    expect(afterPlayer.npcStates.npc_koharu.sortingHelp).toBe("available");

    await nextSpeech(game);
    expect(game.getState().currentDialogue?.heart?.consequenceApplied).toBe(true);
    expect(game.getState().npcStates.npc_koharu.sortingHelp).toBe("offered");
  });

  it("拒绝非法节点、错误卡、过期预览、重启后的预览与重复确认，且都不扣牌", async () => {
    const { game, store } = setup();
    const unopened = game.getState();
    const unopenedSaved = store.load();
    await expect(game.previewHeart("not_a_card", unopened.revision)).rejects.toThrow("预览");
    expect(game.getState()).toEqual(unopened);
    expect(store.load()).toEqual(unopenedSaved);

    await game.startHeartEncounter(game.getState().revision);
    await showSpeech(game);
    const before = game.getState();
    const card = before.heartCards.find(c => c.kind === "fear")!;
    await expect(game.previewHeart("not_a_card", before.revision)).rejects.toThrow("不在手中");
    expect(game.getState()).toEqual(before);

    const preview = await game.previewHeart(card.id, before.revision);
    const savedAtChoice = store.load();
    await expect(game.useHeart(card.id, before.revision, "expired_preview")).rejects.toThrow("预览已失效");
    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(savedAtChoice);

    const restarted = new GameService(store, new CountingProvider({ apiKey: "" }), { heartTestPack: true });
    const restartBefore = restarted.getState();
    await expect(restarted.useHeart(card.id, restartBefore.revision, preview.id)).rejects.toThrow("预览已失效");
    expect(restarted.getState()).toEqual(restartBefore);

    const freshPreview = await restarted.previewHeart(card.id, restartBefore.revision);
    await restarted.useHeart(card.id, restartBefore.revision, freshPreview.id);
    const spent = restarted.getState();
    await expect(restarted.useHeart(card.id, spent.revision, freshPreview.id)).rejects.toThrow();
    expect(restarted.getState()).toEqual(spent);
    expect(spent.heartCards.some(c => c.id === card.id)).toBe(false);
  });

  it("预览生成失败保持状态和存档原样", async () => {
    class FailingPreviewProvider extends CountingProvider {
      async generateHearts(context: HeartContext) {
        if (context.heartIntent !== "opening") throw new DialogueGenerationError();
        return super.generateHearts(context);
      }
    }
    const { game, store } = await atChoice(new FailingPreviewProvider({ apiKey: "" }));
    const before = game.getState();
    const saved = store.load();
    await expect(game.previewHeart(before.heartCards[0].id, before.revision)).rejects.toThrow("没有消耗心绪或推进剧情");
    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
  });

  it("第五次选择的预览将候选选择计入预算而不写入存档，确认后以收尾段落落地", async () => {
    const provider = new CountingProvider({ apiKey: "" });
    const { game, store } = await atChoice(provider);
    const raw = store.load()!;
    const template = raw.eventLog.at(-1)!;
    for (let index = 0; index < 4; index++) raw.eventLog.push({
      ...template, id: `historic_choice_${index}`, sequence: raw.eventLog.length,
      type: "dialogue_choice", actorId: "player", targetId: "npc_koharu",
      details: { text: "此前已选择", intent: "测试预算", missed: "[]" }
    });
    store.save(raw);
    const reloaded = new GameService(store, provider, { heartTestPack: true });
    const before = reloaded.getState();
    const card = before.heartCards.find(c => c.kind === "fear")!;

    const preview = await reloaded.previewHeart(card.id, before.revision);
    expect(provider.lastHeartContext?.state.eventLog.filter(e => e.type === "dialogue_choice")).toHaveLength(5);
    expect(reloaded.getState()).toEqual(before);
    expect(store.load()).toEqual(raw);

    await reloaded.useHeart(card.id, before.revision, preview.id);
    expect(reloaded.getState().currentDialogue?.heart).toMatchObject({ canContinue: false, choicePoint: null });
  });

  it("提示词规定预览首句的克制幽默、自嘲与三种态度差异", () => {
    const state = createInitialState();
    state.activeNpcId = "npc_koharu";
    state.currentLocationId = "loc_shrine";
    state.heartSession = { id: "test", claimedKinds: [] };
    const context: HeartContext = { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: "fear" };
    const prompt = buildHeartPrompt(context, buildCasePrompt(context).user).system;
    expect(prompt).toContain("先给玩家预览，确认后逐字播放");
    expect(prompt).toContain("机智回扣、轻吐槽、一本正经的荒诞比喻、紧张时的自嘲");
    expect(prompt).toContain("不拿死者和对方痛处开玩笑");
    expect(prompt).toContain("恐惧保留真实迟疑，同情先接住难处，爱意表达具体亲近");
    expect(prompt).toContain("consequence=null是合法结果");
    expect(prompt).toContain("自然引向一个具体的新焦点");
    expect(prompt).toContain("不要让NPC再次追问同一个问题");
  });
});
