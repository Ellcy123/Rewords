import { describe, expect, it, vi } from "vitest";
import { CaseDialogueProvider, buildCasePrompt, fallbackDialogue, type CaseContext } from "../server/src/caseProvider.ts";
import { createInitialState, GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";

const choice = (text: string, angle: string, action_id: string | null = null) => ({ text, angle, intent: text, action_id });
const draft = (line: string, options = [choice("你们吵什么？", "追问"), choice("你不是故意的。", "安慰")], accept_action = false) => ({
  line, stage_direction: "把手里的票放回口袋。", emotion: "认真", continuations: [],
  options, used_fact_ids: ["F02", "F09"], accept_action
});
const response = (body: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(body) } }] }));
function context(): CaseContext {
  const state = createInitialState(); state.phase = "encounter"; state.activeNpcId = "npc_koharu"; state.currentLocationId = "loc_shrine";
  return { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "" };
}
async function readAll(g: GameService) {
  let s = g.getState();
  while (s.currentDialogue && s.dialogueBeatIndex < s.currentDialogue.continuations.length + (s.lastPlayerChoice ? 1 : 0)) {
    await g.nextDialogueBeat(); s = g.getState();
  }
}
function setup(...drafts: unknown[]) {
  const fn = vi.fn();
  for (const d of drafts) fn.mockResolvedValueOnce(response(d));
  const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl: fn, review: false, maxAttempts: 1 });
  const store = new MemoryGameStore(); const state = createInitialState();
  state.phase = "location"; state.currentLocationId = "loc_shrine"; store.save(state);
  return { g: new GameService(store, provider), store, provider, fn };
}

describe("forward conversation branches", () => {
  it("offers a system action catalog, never a fixed ask/daily/route menu", () => {
    const p = buildCasePrompt(context()), u = JSON.parse(p.user);
    expect(u.eligible_next_choices).toBeUndefined();
    expect(u.action_catalog.length).toBeGreaterThan(0);
    expect(u.action_catalog.some((a: { id: string }) => ["ask", "daily", "route"].includes(a.id))).toBe(false);
    expect(p.system).toContain("不是三个互不相干的话题");
  });
  it("accepts genuinely generated choices and assigns fresh node IDs", async () => {
    const d = draft("那天我和她吵了一架。");
    const p = new CaseDialogueProvider({ apiKey: "test", review: false, fetchImpl: async () => response(d) });
    const first = await p.generate(context()), next = await p.generate(context());
    expect(first.debug.provider).toBe("deepseek");
    expect(first.options.map(o => o.text)).toEqual(["你们吵什么？", "你不是故意的。"]);
    expect(first.options[0].id).not.toBe(next.options[0].id);
    expect(first.options[0].actionId).toBeNull();
  });
  it("persists the chosen direction and missed replies, rejects stale IDs, and advances three nodes", async () => {
    const { g, store, fn, provider } = setup(
      draft("我不信我姐是自杀，她还给我买了车票。", [choice("为什么不信？", "追问"), choice("票也不能证明。", "质疑")]),
      draft("她想带我走，我却跟她吵了一架。"),
      draft("我叫她自己走，不肯跟她去。", [choice("你那时在气什么？", "追问"), choice("别全怪自己。", "安慰")])
    );
    g.startEncounter("npc_koharu"); await g.selectInteractionMode("talk"); await readAll(g);
    const root = g.getState().currentDialogue!.options[0];
    await g.chooseTalkOption(root.id); await readAll(g);
    await expect(g.chooseTalkOption(root.id)).rejects.toThrow("过期");
    const second = g.getState().currentDialogue!.options[0];
    await g.chooseTalkOption(second.id); await readAll(g);
    expect(g.getState().currentDialogue!.debug.provider).toBe("deepseek");
    const sent = JSON.parse(JSON.parse(fn.mock.calls[2][1].body).messages[1].content);
    expect(sent.conversation_path).toEqual([
      { selected: "为什么不信？", intent: "为什么不信？", missed: ["票也不能证明。"] },
      { selected: "你们吵什么？", intent: "你们吵什么？", missed: ["你不是故意的。"] }
    ]);
    expect(store.load()!.npcStates.npc_koharu.memories.some(m => m.summary.includes("你不是故意的"))).toBe(false);
    const restored = new GameService(store, provider);
    expect(restored.getState().currentDialogue!.options).toEqual(g.getState().currentDialogue!.options);
  });
  it("rejects returning an already selected question", async () => {
    const c = context(); c.selectedOption = { id: "old", text: "你们吵什么？", intent: "追问" };
    const p = new CaseDialogueProvider({ apiKey: "test", review: false, maxAttempts: 1, fetchImpl: async () => response(draft("那天确实吵架了。")) });
    await expect(p.generate(c)).rejects.toThrow("会面还没结束");
    expect(p.getLogs().at(-1)!.errorCode).toBe("branch_rewind");
  });
  it("rejects recycling the missed option after another path was chosen", async () => {
    const { g, provider } = setup(
      draft("那天确实吵架了。"),
      draft("我后悔得很。", [choice("你不是故意的。", "安慰"), choice("她怎么回答？", "追问")])
    );
    g.startEncounter("npc_koharu"); await g.selectInteractionMode("talk"); await readAll(g);
    const before = g.getState();
    await expect(g.chooseTalkOption(before.currentDialogue!.options[0].id)).rejects.toThrow("会面还没结束");
    expect(g.getState()).toEqual(before);
    expect(provider.getLogs().at(-1)!.errorCode).toBe("branch_rewind");
  });
  it("retries the original choice after failure without duplicating time, choice trail or memories", async () => {
    const { g, store } = setup(
      draft("那天确实吵架了。"),
      draft("那天确实吵架了。"),
      draft("我叫她自己走，不肯跟她去。", [choice("你那时在气什么？", "追问"), choice("别全怪自己。", "安慰")])
    );
    g.startEncounter("npc_koharu"); await g.selectInteractionMode("talk"); await readAll(g);
    const before = store.load(), optionId = g.getState().currentDialogue!.options[0].id;
    await expect(g.chooseTalkOption(optionId)).rejects.toThrow("进度已保留");
    expect(store.load()).toEqual(before);
    expect(g.getState().currentDialogue!.options[0].id).toBe(optionId);
    await g.chooseTalkOption(optionId); await readAll(g);
    expect(store.load()!.eventLog.filter(e => e.type === "dialogue_choice")).toHaveLength(1);
    expect(g.getState().currentMinute).toBe(before!.currentMinute);
    expect(g.getState().currentDialogue!.options.length).toBeGreaterThan(0);
  });
  it.each(["off_topic", "branch_rewind", "option_intent", "player_intent"])("uses semantic review for %s, not a canned whitelist", async reason => {
    const fn = vi.fn().mockResolvedValueOnce(response(draft("那天确实吵架了。")))
      .mockResolvedValueOnce(response({ approved: false, reason }));
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: fn, maxAttempts: 1 });
    expect((await p.generate(context())).debug.provider).toBe("mock_fallback");
    expect(p.getLogs().at(-1)!.errorCode).toBe(reason);
  });
  it("allows a natural ending without manufacturing another menu", async () => {
    const p = new CaseDialogueProvider({ apiKey: "test", review: false, fetchImpl: async () => response(draft("今天我想一个人待会儿。", [])) });
    const d = await p.generate(context()); expect(d.debug.provider).toBe("deepseek"); expect(d.options).toEqual([]);
  });
  it("feeds the reviewer's concrete problem into the repair request", async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce(response(draft("那天确实吵架了。")))
      .mockResolvedValueOnce(response({ approved: false, reason: "off_topic", issue: "不要返回车票，请承接刚说的争吵。" }))
      .mockResolvedValueOnce(response(draft("那天确实吵架了。")))
      .mockResolvedValueOnce(response({ approved: true, reason: "none" }));
    const p = new CaseDialogueProvider({ apiKey: "test", fetchImpl: fn });
    expect((await p.generate(context())).debug.provider).toBe("deepseek");
    const repair = JSON.parse(fn.mock.calls[2][1].body).messages[1].content;
    expect(repair).toContain("不要返回车票，请承接刚说的争吵");
    const review = JSON.parse(JSON.parse(fn.mock.calls[1][1].body).messages[1].content);
    expect(review.player_hears_before_choices).toContain("那天确实吵架了。");
  });
  it("removes a missed evidence action from the next catalog even if its label changes", async () => {
    const { g, fn } = setup(
      draft("车票是她买给我的。", [choice("让我看票。", "查看", "show:E01"), choice("她为什么带你走？", "追问")]),
      draft("她要带我离开，我却跟她吵架。")
    );
    g.startEncounter("npc_koharu"); await g.selectInteractionMode("talk"); await readAll(g);
    await g.chooseTalkOption(g.getState().currentDialogue!.options[1].id);
    const sent = JSON.parse(JSON.parse(fn.mock.calls[1][1].body).messages[1].content);
    expect(sent.closed_action_requests).toContain("show:E01");
    expect(sent.action_catalog.some((a: { id: string }) => a.id === "show:E01")).toBe(false);
  });
  it("fallback continuation closes instead of reopening unrelated roots", () => {
    const c = context(); c.selectedOption = { id: "choice_previous", text: "你们吵什么？", intent: "追问" };
    const d = fallbackDialogue(c);
    expect(d.options).toEqual([]); expect(d.line).not.toContain("猫");
  });
  it("keeps generated show/take choices connected to real ownership changes", async () => {
    const { g } = setup(
      draft("两张车票都在这儿，你想看吗？", [choice("看看票。", "核对", "show:E01"), choice("先说你的想法。", "倾听")]),
      draft("好，给你看车票。", [choice("车票交给我吧。", "索要", "take:E01"), choice("你留着吧。", "保留")], true),
      draft("好，车票你拿着。", [], true)
    );
    g.startEncounter("npc_koharu"); await g.selectInteractionMode("talk"); await readAll(g);
    await g.chooseTalkOption(g.getState().currentDialogue!.options[0].id); await readAll(g);
    expect(g.getState().evidenceJournal.some(e => e.id === "E01")).toBe(true);
    expect(g.getState().itemOwners.E01).toBe("npc_koharu");
    await g.chooseTalkOption(g.getState().currentDialogue!.options[0].id); await readAll(g);
    expect(g.getState().itemOwners.E01).toBe("player");
  });
  it("does not offer take after refusing to show an unread item", async () => {
    const c = context(); c.effect = "show:E01"; c.selectedOption = { id: "old", text: "看看票。", intent: "看票" };
    const p = new CaseDialogueProvider({ apiKey: "test", review: false, maxAttempts: 1, fetchImpl: async () =>
      response(draft("车票暂时不给看。", [choice("票给我吧。", "索要", "take:E01"), choice("那算了。", "放弃")])) });
    await expect(p.generate(c)).rejects.toThrow("会面还没结束");
    expect(p.getLogs().at(-1)!.errorCode).toBe("invalid_choice");
  });
});
