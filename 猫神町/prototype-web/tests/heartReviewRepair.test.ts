import { describe, expect, it, vi } from "vitest";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { createInitialState, GameService } from "../server/src/gameService.ts";
import { validateHeartDraft, type HeartContext } from "../server/src/heartDialogue.ts";
import { applyHeartReviewRepairs, prepareHeartReviewDraft } from "../server/src/heartReviewRepair.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { nextSpeech, showSpeech } from "./playback.ts";

const response = (body: unknown) => new Response(JSON.stringify({
  choices: [{ finish_reason: "stop", message: { content: JSON.stringify(body) } }]
}));

function context(): HeartContext {
  const state = createInitialState();
  state.phase = "encounter";
  state.currentLocationId = "loc_shrine";
  state.activeNpcId = "npc_koharu";
  state.heartSession = { id: "review_repair", claimedKinds: [] };
  return { state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "", heartIntent: "fear" };
}

function validDraft() {
  return {
    beats: [
      { speaker: "player", line: "我先陪你把话说清楚。", stage_direction: "", emotion: "认真" },
      { speaker: "npc", line: "那就先从眼前的车票说起，可以吗？", stage_direction: "", emotion: "迟疑" }
    ],
    can_continue: true,
    choice_point: { quote: "那就先从眼前的车票说起，可以吗？", reason: "小春等待遥回应当前边界。" },
    closing_reason: "",
    used_fact_ids: [],
    disclosed_fact_ids: [],
    disclosures: [],
    progress: { type: "request", summary: "小春提出核对眼前车票" },
    pickup: null,
    consequence: null,
    action_plan: null
  };
}

function closingDraft() {
  const draft = validDraft();
  draft.beats[1].line = "今天先说到这里，我得自己缓一缓。";
  draft.can_continue = false;
  draft.choice_point = null;
  return draft;
}

function requestBodies(fetchImpl: ReturnType<typeof vi.fn>) {
  return fetchImpl.mock.calls.map(call => JSON.parse(call[1].body as string));
}

function sayaContext(): HeartContext {
  const c = context();
  c.state.currentLocationId = "loc_station";
  c.state.activeNpcId = "npc_saya";
  c.npcId = "npc_saya";
  c.heartIntent = "affection";
  return c;
}

// A compact, compliant projection of candidate-03: keep only current dialogue
// and the two canon facts it actually says, without importing its invented past.
function sayaFactDraft() {
  return {
    beats: [
      { speaker: "player", line: "我想听你把值班页的事说清楚。", stage_direction: "", emotion: "认真" },
      { speaker: "npc", line: "真昼确实买了车票，两张，第二天走。", stage_direction: "", emotion: "迟疑" },
      { speaker: "npc", line: "我拒绝了她一起离开的邀请。", stage_direction: "", emotion: "内疚" },
      { speaker: "npc", line: "你现在还想看值班页吗？", stage_direction: "", emotion: "试探" }
    ],
    can_continue: true,
    choice_point: { quote: "你现在还想看值班页吗？", reason: "纱夜等待遥决定是否继续核对记录。" },
    closing_reason: "",
    used_fact_ids: [],
    disclosed_fact_ids: ["F02", "F10"],
    disclosures: [{ fact_id: "F02", beat_index: 1 }, { fact_id: "F10", beat_index: 2 }],
    progress: { type: "reveal", summary: "纱夜说明车票与自己拒绝同行的事实。" },
    pickup: null,
    consequence: null,
    action_plan: null
  };
}

function openingFactDraft() {
  return {
    beats: [
      { speaker: "npc", line: "真昼给我们俩买了车票。", stage_direction: "她把一张纸推到桌边。", emotion: "克制" },
      { speaker: "npc", line: "我还在犹豫要不要把这件事讲清楚。", stage_direction: "", emotion: "迟疑" }
    ],
    can_continue: true,
    choice_point: { quote: "我还在犹豫要不要把这件事讲清楚。", reason: "小春等待遥回应这件事。" },
    closing_reason: "",
    used_fact_ids: ["F02"],
    disclosed_fact_ids: ["F02"],
    disclosures: [{ fact_id: "F02", beat_index: 0 }],
    progress: { type: "reveal", summary: "小春说明姐姐曾为两人准备车票。" },
    pickup: null,
    consequence: null,
    action_plan: null
  };
}

function pauseDraft(stageDirection: string) {
  return {
    beats: [
      { speaker: "player", line: "我愿意听你把这件事说完。", stage_direction: "", emotion: "认真" },
      { speaker: "npc", line: "我把车票给你看。", stage_direction: stageDirection, emotion: "迟疑" }
    ],
    can_continue: true,
    choice_point: { quote: "我把车票给你看。", reason: "小春等待遥回应眼前的材料。" },
    closing_reason: "",
    used_fact_ids: [],
    disclosed_fact_ids: [],
    disclosures: [],
    progress: { type: "action", summary: "小春决定出示眼前的车票。" },
    pickup: null,
    consequence: { type: "material", actionId: "show:E01", beatIndex: 1, quote: "我把车票给你看。" },
    action_plan: null
  };
}

function openingReviewDraft() {
  return {
    beats: [{ speaker: "npc", line: "先从眼前的事情说起，好吗？", stage_direction: "", emotion: "谨慎" }],
    can_continue: true,
    choice_point: { quote: "先从眼前的事情说起，好吗？", reason: "小春等待遥决定是否继续谈。" },
    closing_reason: "",
    used_fact_ids: [],
    disclosed_fact_ids: [],
    disclosures: [],
    progress: { type: "request", summary: "小春提出先从眼前的事情说起" },
    pickup: null,
    consequence: null,
    action_plan: null
  };
}

describe("心绪内容审校字段修补", () => {
  it("只用一次审校请求补齐缺 emotion、坏 progress 和缺 closing_reason，并在修后复验", async () => {
    const raw = closingDraft();
    delete (raw.beats[1] as { emotion?: string }).emotion;
    raw.progress = { type: "request", summary: "" };
    delete (raw as { closing_reason?: string }).closing_reason;
    const review = {
      approved: true,
      reason: "none",
      issue: "",
      repairs: [
        { path: "beats.1.emotion", value: "不安" },
        { path: "progress", value: { type: "request", summary: "小春决定先停下来缓一缓" } },
        { path: "closing_reason", value: "需要独处缓一缓" }
      ]
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response(review));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(context());

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.continuations[0]?.emotion).toBe("不安");
    expect(result.debug.sceneGoal).toBe("request：小春决定先停下来缓一缓");
    expect(result.heart?.canContinue).toBe(false);
    expect(requestBodies(fetchImpl)[1].messages[1].content).toContain("beats.1.emotion");
    expect(requestBodies(fetchImpl)[1].messages[1].content).toContain("closing_reason");
    expect(provider.getLogs().find(log => log.mode === "talk")).toMatchObject({
      success: true,
      repairedFields: ["beats.1.emotion", "progress", "closing_reason"]
    });
  });

  it("审校用摘要字符串修补 progress 时保留原有合法 type", async () => {
    const raw = validDraft();
    raw.progress.summary = "";
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [
        { path: "progress", value: "小春提出先核对眼前车票" }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(context());

    expect(result.debug.sceneGoal).toBe("request：小春提出先核对眼前车票");
    expect(result.heart?.consequence).toBeNull();
    expect(result.debug.usedFacts).toEqual([]);
    expect(result.debug.disclosedFacts).toEqual([]);
  });

  it.each(["missing", "invalid_type"] as const)("%s progress 以字符串修补时安全回退 transition，不产生动作或事实", async kind => {
    const raw = validDraft();
    if (kind === "missing") delete (raw as { progress?: unknown }).progress;
    else raw.progress = { type: "invalid" as never, summary: "原摘要" };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [
        { path: "progress", value: "回应眼前交流" }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(context());

    expect(result.debug.sceneGoal).toBe("transition：回应眼前交流");
    expect(result.heart?.consequence).toBeNull();
    expect(result.debug.usedFacts).toEqual([]);
    expect(result.debug.disclosedFacts).toEqual([]);
  });

  it.each(["   ", "x".repeat(161)])("progress 字符串摘要=%j 时仍拒绝非法长度", async summary => {
    const raw = validDraft();
    raw.progress.summary = "";
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [
        { path: "progress", value: summary }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "talk", success: false, errorCode: "schema_validation" });
  });

  it("已有合法 progress 不能借字符串 repair 改写推进类型或摘要", async () => {
    const raw = validDraft();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [
        { path: "progress", value: "偷偷改成普通转场" }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "talk", success: false, errorCode: "invalid_repair" });
  });

  it("干净草稿与已有合法字段保持原值，审校仍只有原来的两次请求", async () => {
    const raw = validDraft();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "" }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(context());

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.continuations[0]?.line).toBe(raw.beats[1].line);
    expect(result.continuations[0]?.emotion).toBe("迟疑");
    expect(result.debug.sceneGoal).toBe("request：小春提出核对眼前车票");
    expect(provider.getLogs().find(log => log.mode === "talk")?.repairedFields).toBeUndefined();
    const reviewInput = requestBodies(fetchImpl)[1].messages[1].content as string;
    expect(reviewInput).toContain("repair_fields");
    expect(JSON.parse(reviewInput).repair_fields).toEqual([]);
  });

  it("拒绝任何白名单外路径，不能借修补改 line、事实、动作或 pickup", async () => {
    const raw = validDraft();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [
        { path: "beats.1.line", value: "篡改后的台词" },
        { path: "used_fact_ids", value: ["F01"] },
        { path: "consequence", value: { type: "pause", actionId: null, beatIndex: 1, quote: "篡改后的台词" } },
        { path: "pickup", value: { beat_index: 1, kind: "fear", quote: raw.beats[1].line } }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "talk", success: false });
  });

  it("拒绝重复修补路径，不能让同一字段被后一个值覆盖", async () => {
    const raw = validDraft();
    raw.progress.summary = "";
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [
        { path: "progress", value: { type: "request", summary: "先核对车票" } },
        { path: "progress", value: { type: "transition", summary: "偷偷改成别的推进" } }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("内容审校的硬性拒绝不能被字段 patch 绕过", async () => {
    const raw = validDraft();
    raw.progress.summary = "";
    raw.beats[1].line = "我听见你说了零号站台的事。";
    raw.choice_point.quote = raw.beats[1].line;
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: false, reason: "new_case_fact", issue: "台词编造了案件事实", repairs: [
        { path: "progress", value: { type: "transition", summary: "改成普通转场" } }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "talk", success: false });
  });

  it("缺少必填 closing_reason 且审查未补值时拒绝，不返回临时占位", async () => {
    const raw = closingDraft();
    delete (raw as { closing_reason?: string }).closing_reason;
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(provider.getLogs().find(log => log.mode === "talk")?.repairedFields).toBeUndefined();
  });

  it("修后值仍非法时失败，GameService 不改状态或存档", async () => {
    const raw = validDraft();
    raw.beats = [raw.beats[1]];
    raw.choice_point = { quote: raw.beats[0].line, reason: "小春等待遥回应当前边界。" };
    delete (raw.beats[0] as { emotion?: string }).emotion;
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [
        { path: "beats.0.emotion", value: "" }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider);
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    const before = game.getState();
    const saved = store.load();

    await expect(game.startHeartEncounter(before.revision)).rejects.toThrow();
    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("review=false 保持原校验，不进入修补流程", async () => {
    const raw = validDraft();
    raw.progress = { type: "invalid" as never, summary: "坏的推进" };
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(raw));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: false });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "talk", success: false });
  });

  it("审校会补齐漏填的合法 used_fact_ids，且不把事实当作新的授权", async () => {
    const raw = sayaFactDraft();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(sayaContext());

    expect(result.debug.usedFacts).toEqual(["F02", "F10"]);
    expect(result.debug.disclosedFacts).toEqual(["F02", "F10"]);
    expect(provider.getLogs().find(log => log.mode === "talk")).toMatchObject({
      success: true,
      repairedFields: expect.arrayContaining(["used_fact_ids"])
    });
    const reviewInput = JSON.parse(requestBodies(fetchImpl)[1].messages[1].content as string);
    expect(reviewInput.candidate.used_fact_ids).toEqual(["F02", "F10"]);
  });

  it("合法披露事实只在实际NPC台词播放后进入玩家知识账本", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(openingFactDraft()))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider);
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");

    await game.startHeartEncounter(game.getState().revision);
    expect(store.load()?.playerKnownFactIds).toEqual(["F01"]);
    await game.nextDialogueBeat(game.getState().revision); // narration only -> NPC line is now visible
    expect(store.load()?.playerKnownFactIds).toEqual(expect.arrayContaining(["F01", "F02"]));
  });

  it("只删除玩家已知事实的重复 disclosed/anchor，且不改原稿或上下文", () => {
    const c = sayaContext();
    c.state.playerKnownFactIds = ["F01", "F02"];
    const raw = sayaFactDraft();
    const originalRaw = structuredClone(raw);
    const originalContext = structuredClone(c);

    const plan = prepareHeartReviewDraft(raw, c, ["F01", "F02", "F04", "F10"]);

    expect(plan.candidate.used_fact_ids).toEqual(["F10"]);
    expect(plan.candidate.disclosed_fact_ids).toEqual(["F10"]);
    expect(plan.candidate.disclosures).toEqual([{ fact_id: "F10", beat_index: 2 }]);
    expect(plan.normalizedFields).toEqual(expect.arrayContaining(["used_fact_ids", "disclosed_fact_ids", "disclosures"]));
    expect(raw).toEqual(originalRaw);
    expect(c).toEqual(originalContext);
  });

  it("新事实的player anchor与未知ID仍拒绝", () => {
    const c = sayaContext();
    c.state.playerKnownFactIds = ["F01", "F02"];

    const playerAnchor = sayaFactDraft();
    playerAnchor.used_fact_ids = ["F10"];
    playerAnchor.disclosed_fact_ids = ["F10"];
    playerAnchor.disclosures = [{ fact_id: "F10", beat_index: 0 }];
    expect(() => prepareHeartReviewDraft(playerAnchor, c, ["F01", "F02", "F04", "F10"])).toThrow("unknown_fact");

    const unknownId = sayaFactDraft();
    unknownId.used_fact_ids = ["F99"];
    unknownId.disclosed_fact_ids = [];
    unknownId.disclosures = [];
    expect(() => prepareHeartReviewDraft(unknownId, c, ["F01", "F02", "F04", "F10"])).toThrow("unknown_fact");
  });

  it("claimed pickup被归零时保留对白，不会再次发牌", async () => {
    const c = context();
    c.state.heartSession!.claimedKinds = ["fear"];
    const raw = validDraft();
    raw.pickup = { beat_index: 1, kind: "fear", quote: raw.beats[1].line };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(c);

    expect(result.continuations[0]?.line).toBe(raw.beats[1].line);
    expect(result.heart?.pickups).toEqual([]);
    expect(provider.getLogs().find(log => log.mode === "talk")?.repairedFields).toContain("pickup");
  });

  it("AI不能借合法情绪修补顺带改写事实字段", async () => {
    const raw = validDraft();
    delete (raw.beats[1] as { emotion?: string }).emotion;
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [
        { path: "beats.1.emotion", value: "迟疑" },
        { path: "used_fact_ids", value: ["F02"] }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "talk", success: false, errorCode: "invalid_repair" });
  });

  it("review=false 对未知事实继续严格拒绝", async () => {
    const raw = validDraft();
    raw.used_fact_ids = ["F99"];
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(raw));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: false });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "talk", success: false, errorCode: "unknown_fact" });
  });

  it("invalid_consequence重试时携带上一稿和精确stage_direction提示，生成最多两次", async () => {
    const first = pauseDraft("");
    first.consequence!.actionId = "show:E99";
    const second = pauseDraft("");
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(first))
      .mockResolvedValueOnce(response(second))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 2, review: true });

    const result = await provider.generateHearts(context());
    const secondGeneration = requestBodies(fetchImpl)[1];
    const retryPrompt = secondGeneration.messages[1].content as string;

    expect(result.heart?.consequence).toMatchObject({ type: "material", actionId: "show:E01" });
    expect(fetchImpl).toHaveBeenCalledTimes(3); // two generation attempts + one review
    expect(retryPrompt).toContain("上一稿");
    expect(retryPrompt).toContain("invalid_consequence");
    expect(retryPrompt).toContain("actionId");
    expect(provider.getLogs().find(log => log.mode === "talk")).toMatchObject({ success: true, attemptCount: 2 });
  });

  it("unknown_fact日志保留明确字段，且失败回滚不消耗心绪牌", async () => {
    const bad = validDraft();
    bad.used_fact_ids = ["F99"];
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(openingFactDraft()))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [] }))
      .mockResolvedValueOnce(response(bad));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider, { heartTestPack: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await showSpeech(game);
    await nextSpeech(game);
    const before = game.getState();
    const saved = store.load();
    const card = before.heartCards.find(item => item.kind === "fear")!;

    await expect(game.useHeart(card.id, before.revision)).rejects.toThrow();

    expect(game.getState()).toEqual(before);
    expect(store.load()).toEqual(saved);
    expect(game.getState().heartCards.some(item => item.id === card.id)).toBe(true);
    expect(provider.getLogs().at(-1)).toMatchObject({ errorCode: "unknown_fact", detail: expect.stringContaining("used_fact_ids") });
  });

  it("主角可引用自己已知但NPC未知的事实，且不会扩展NPC知识或允许NPC披露", () => {
    const c = context();
    c.state.currentLocationId = "loc_inn";
    c.state.activeNpcId = "npc_chiyo";
    c.npcId = "npc_chiyo";
    c.state.playerKnownFactIds = ["F01", "F02"];
    const knownByNpc = ["F01", "F05", "F06"];
    const playerReference = validDraft();
    playerReference.beats[0].line = "我已经看过那两张车票。";
    playerReference.used_fact_ids = ["F02"];

    expect(validateHeartDraft(playerReference, c, knownByNpc).used_fact_ids).toEqual(["F02"]);
    expect(c.state.npcStates.npc_chiyo.knownFactIds).not.toContain("F02");

    const npcDisclosure = structuredClone(playerReference);
    npcDisclosure.beats[1].line = "我也知道那两张车票。";
    npcDisclosure.choice_point!.quote = npcDisclosure.beats[1].line;
    npcDisclosure.disclosed_fact_ids = ["F02"];
    npcDisclosure.disclosures = [{ fact_id: "F02", beat_index: 1 }];
    expect(() => validateHeartDraft(npcDisclosure, c, knownByNpc)).toThrow("unknown_fact");
    expect(c.state.npcStates.npc_chiyo.knownFactIds).not.toContain("F02");
  });

  it("内容审校可在同一次审校请求中删掉虚构往事，保留其他台词与上下文", async () => {
    const raw = validDraft();
    raw.beats[1].line = "你记得那天姐姐拍完照回来还特地替我点了灯吗？";
    raw.choice_point!.quote = raw.beats[1].line;
    const originalContext = structuredClone(context());
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "已删去无依据往事", repairs: [], content_edits: [
        { beat_index: 1, line: "你还记得那张车票吗？" }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const c = context();

    const result = await provider.generateHearts(c);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.line).toBe(raw.beats[0].line);
    expect(result.continuations[0]?.line).toBe("你还记得那张车票吗？");
    expect(c).toEqual(originalContext);
  });

  it("修正末句后同步选择点引用与理由，不重新生成", async () => {
    const raw = validDraft();
    const replacement = "那张车票还在你手边，对吗？";
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: [
        { beat_index: 1, line: replacement }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(context());

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.heart?.choicePoint).toMatchObject({ quote: replacement });
    expect(result.heart?.choicePoint?.reason).toBeTruthy();
  });

  it.each([
    ["省略保留ID时撤回该拍旧披露", "我只想先谈眼前的站务。", undefined, ["F10"]],
    ["明确保留ID时仅保留该拍实际旧披露", "真昼确实买了车票，两张。", ["F02"], ["F02", "F10"]]
  ] as const)("%s，且只有实际播放NPC台词后才授予玩家知识", async (_label, line, retained, expectedFacts) => {
    let generationCount = 0, reviewCount = 0;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
      if (body.messages[0]!.content.includes("你只审查对白内容")) {
        reviewCount++;
        if (reviewCount === 1) return response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: [] });
        return response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: [
          { beat_index: 1, line, ...(retained ? { retained_fact_ids: retained } : {}) }
        ] });
      }
      generationCount++;
      return response(generationCount === 1 ? openingReviewDraft() : sayaFactDraft());
    });
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider, { heartTestPack: true });
    game.travel("loc_station");
    game.startEncounter("npc_saya");

    await game.startHeartEncounter(game.getState().revision);
    await showSpeech(game);
    const beforePreview = game.getState();
    const card = beforePreview.heartCards.find(item => item.kind === "fear")!;
    const preview = await game.previewHeart(card.id, beforePreview.revision);
    expect(store.load()?.playerKnownFactIds).toEqual(["F01"]);

    await game.useHeart(card.id, beforePreview.revision, preview.id);
    expect(store.load()?.playerKnownFactIds).toEqual(["F01"]);
    await nextSpeech(game); // beat 1: revised NPC line
    if (expectedFacts.includes("F02")) expect(store.load()?.playerKnownFactIds).toContain("F02");
    else expect(store.load()?.playerKnownFactIds).not.toContain("F02");
    expect(store.load()?.playerKnownFactIds).not.toContain("F10");
    await nextSpeech(game); // beat 2: the other disclosure is now visible
    expect(store.load()?.playerKnownFactIds).toEqual(expect.arrayContaining(["F01", "F10"]));
  });

  it.each([
    ["删掉拾绪来源", "换个话题吧。", []],
    ["保留拾绪来源", validDraft().beats[1].line + " 我会把这点说清楚。", ["fear"]]
  ] as const)("%s时只影响发牌，不改其他修正结果", async (_label, line, kinds) => {
    const raw = validDraft();
    raw.pickup = { beat_index: 1, kind: "fear", quote: raw.beats[1].line };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: [
        { beat_index: 1, line }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(context());

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.continuations[0]?.line).toBe(line);
    expect(result.heart?.pickups.map(pickup => pickup.kind)).toEqual(kinds);
  });

  it.each([
    ["越界索引", [{ beat_index: 12, line: "越界" }]],
    ["重复索引", [{ beat_index: 1, line: "第一次" }, { beat_index: 1, stage_direction: "第二次" }]],
    ["额外speaker字段", [{ beat_index: 1, line: "越权", speaker: "npc" }]],
    ["额外consequence字段", [{ beat_index: 1, line: "越权", consequence: null }]]
  ] as const)("拒绝content_edits的%s", (_label, edits) => {
    const c = context();
    const plan = prepareHeartReviewDraft(validDraft(), c, []);
    expect(() => applyHeartReviewRepairs(plan, [], c, [], edits)).toThrow();
  });

  it.each([
    ["新增来源ID", 1, ["F04"]],
    ["把另一拍来源ID挪过来", 2, ["F02"]]
  ] as const)("拒绝content_edits%s", (_label, beatIndex, retainedFactIds) => {
    const c = sayaContext();
    const raw = sayaFactDraft();
    const plan = prepareHeartReviewDraft(raw, c, ["F01", "F02", "F04", "F10"]);
    expect(() => applyHeartReviewRepairs(plan, [], c, ["F01", "F02", "F04", "F10"], [
      { beat_index: beatIndex, line: "改写后的句子", retained_fact_ids: retainedFactIds }
    ])).toThrow("invalid_repair");
  });

  it("删除受保护的动作quote时全量复验仍拒绝", () => {
    const c = context();
    const raw = pauseDraft("");
    const plan = prepareHeartReviewDraft(raw, c, []);
    expect(() => applyHeartReviewRepairs(plan, [], c, [], [
      { beat_index: 1, line: "我先把这件事说清楚。" }
    ])).toThrow("invalid_consequence");
  });

  it("硬性false即使带可行content_edits也不能通过", async () => {
    const raw = validDraft();
    raw.beats[1].line = "你记得那天姐姐拍完照回来还特地替我点了灯吗？";
    raw.choice_point!.quote = raw.beats[1].line;
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: false, reason: "new_case_fact", issue: "案情越界", repairs: [], content_edits: [
        { beat_index: 1, line: "你还记得那张车票吗？" }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    await expect(provider.generateHearts(context())).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("未批准的兼容性soft veto忽略content_edits并保留原稿", async () => {
    const raw = validDraft();
    const originalLine = raw.beats[1].line;
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: false, reason: "player_intent", issue: "旧版语义提醒", repairs: [], content_edits: [
        { beat_index: 1, line: "未获批准的改写" }
      ] }));
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });

    const result = await provider.generateHearts(context());

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.continuations[0]?.line).toBe(originalLine);
  });

  it("GameService确认预览时采用修正后的player首句，复用缓存且只扣一次牌", async () => {
    const repairedPlayerLine = "我先把车票这件事说清楚，别让它自己长腿跑了。";
    let generationCount = 0, reviewCount = 0;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
      if (body.messages[0]!.content.includes("你只审查对白内容")) {
        reviewCount++;
        return response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: reviewCount === 1 ? [] : [
          { beat_index: 0, line: repairedPlayerLine }
        ] });
      }
      generationCount++;
      return response(generationCount === 1 ? openingReviewDraft() : validDraft());
    });
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 1, review: true });
    const store = new MemoryGameStore();
    const game = new GameService(store, provider, { heartTestPack: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");

    await game.startHeartEncounter(game.getState().revision);
    await showSpeech(game);
    const before = game.getState();
    const card = before.heartCards.find(item => item.kind === "fear")!;
    const preview = await game.previewHeart(card.id, before.revision);
    expect(preview.line).toBe(repairedPlayerLine);
    const callsBeforeConfirm = fetchImpl.mock.calls.length;

    await game.useHeart(card.id, before.revision, preview.id);

    expect(fetchImpl).toHaveBeenCalledTimes(callsBeforeConfirm);
    expect(game.getState().currentDialogue?.line).toBe(repairedPlayerLine);
    expect(game.getState().heartCards.some(item => item.id === card.id)).toBe(false);
    expect(game.getState().eventLog.filter(event => event.type === "heart_spent")).toHaveLength(1);
    await expect(game.useHeart(card.id, game.getState().revision, preview.id)).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(callsBeforeConfirm);
    expect(game.getState().eventLog.filter(event => event.type === "heart_spent")).toHaveLength(1);
  });

  it("非空no-op content_edits被拒绝后仍按maxAttempts预算重生成", async () => {
    const first = validDraft();
    const second = validDraft();
    second.beats[0].line = "重生成后重新写出的玩家首句。";
    let generationCount = 0, reviewCount = 0;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
      if (body.messages[0]!.content.includes("你只审查对白内容")) {
        reviewCount++;
        return response(reviewCount === 1
          ? { approved: true, reason: "none", issue: "", repairs: [], content_edits: [{ beat_index: 1, line: first.beats[1].line }] }
          : { approved: true, reason: "none", issue: "", repairs: [], content_edits: [] });
      }
      generationCount++;
      return response(generationCount === 1 ? first : second);
    });
    const provider = new CaseDialogueProvider({ apiKey: "test", fetchImpl, maxAttempts: 2, review: true });

    const result = await provider.generateHearts(context());

    expect(result.line).toBe(second.beats[0].line);
    expect(fetchImpl).toHaveBeenCalledTimes(4); // gen + rejected review, then gen + review
    expect(provider.getLogs().find(log => log.mode === "talk")).toMatchObject({ success: true, attemptCount: 2 });
    const retryBody = requestBodies(fetchImpl)[2].messages[1].content as string;
    expect(retryBody).toContain("invalid_repair");
    expect(retryBody).toContain("没有发生实际修正");
  });

  it("action_mismatch可由同次审校改成询问，未修仍失败", async () => {
    const raw = validDraft();
    raw.beats[1].line = "我把车票递给你。";
    raw.choice_point!.quote = raw.beats[1].line;
    const fixedFetch = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: [
        { beat_index: 1, line: "我可以先告诉你车票的事。" }
      ] }));
    const fixed = new CaseDialogueProvider({ apiKey: "test", fetchImpl: fixedFetch, maxAttempts: 1, review: true });
    const fixedResult = await fixed.generateHearts(context());
    expect(fixedFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(requestBodies(fixedFetch)[1].messages[1].content as string).validation_issues[0].code).toBe("action_mismatch");
    expect(fixedResult.continuations[0]?.line).toBe("我可以先告诉你车票的事。");

    const unfixedFetch = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: [] }));
    const unfixed = new CaseDialogueProvider({ apiKey: "test", fetchImpl: unfixedFetch, maxAttempts: 1, review: true });
    await expect(unfixed.generateHearts(context())).rejects.toThrow();
    expect(unfixedFetch).toHaveBeenCalledTimes(2);
  });

  it("合法material仅旁白非空可由同次审校清旁白，未修仍失败", async () => {
    const raw = pauseDraft("她把手压在桌边。");
    const fixedFetch = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: [
        { beat_index: 1, stage_direction: "" }
      ] }));
    const fixed = new CaseDialogueProvider({ apiKey: "test", fetchImpl: fixedFetch, maxAttempts: 1, review: true });
    const fixedResult = await fixed.generateHearts(context());
    expect(fixedFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(requestBodies(fixedFetch)[1].messages[1].content as string).validation_issues[0].code).toBe("invalid_consequence");
    expect(fixedResult.heart?.consequence).toMatchObject({ type: "material", actionId: "show:E01" });
    expect(fixedResult.continuations[0]?.stageDirection).toBe("");

    const unfixedFetch = vi.fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response({ approved: true, reason: "none", issue: "", repairs: [], content_edits: [] }));
    const unfixed = new CaseDialogueProvider({ apiKey: "test", fetchImpl: unfixedFetch, maxAttempts: 1, review: true });
    await expect(unfixed.generateHearts(context())).rejects.toThrow();
    expect(unfixedFetch).toHaveBeenCalledTimes(2);
  });
});
