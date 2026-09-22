import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GameStateSchema,
  demoBootstrap,
  type DialogueResult,
  type GameState,
  type RuleReaction
} from "../packages/shared/src/index.ts";
import { createInitialState, GameService } from "../server/src/gameService.ts";
import { CaseDialogueProvider, type CaseContext } from "../server/src/caseProvider.ts";
import { mockHeartDialogue, heartResult, type HeartContext } from "../server/src/heartDialogue.ts";
import { ruleContext, validRuleReactions } from "../server/src/ruleReactions.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { nextSpeech, showSpeech } from "./playback.ts";

const npcs = demoBootstrap.npcs.map(npc => npc.id);

function changedRuleEvent(id: string, day: number, slotId: "faith" | "beauty", conceptId: string, carrierItemId: string, text: string) {
  return {
    id,
    sequence: day,
    day,
    minute: (day - 1) * 1440 + 1080,
    period: "night" as const,
    type: "rule_changed" as const,
    actorId: "player",
    targetId: null,
    itemId: carrierItemId,
    locationId: null,
    audience: ["player", ...npcs],
    details: { text, slotId, conceptId, carrierItemId }
  };
}

function stateWithTwoRules(): GameState {
  const state = createInitialState();
  state.day = 3;
  state.currentMinute = 540;
  state.period = "morning";
  state.phase = "action";
  state.discoveredLocationIds = demoBootstrap.locations.map(location => location.id);
  state.activeRules = {
    faith: { slotId: "faith", carrierItemId: "item_potato", conceptId: "concept_potato", displayText: "土豆是神", activatedDay: 1 },
    beauty: { slotId: "beauty", carrierItemId: "item_thread", conceptId: "concept_connection", displayText: "连接是美的", activatedDay: 2 }
  };
  state.itemOwners.item_potato = "rule:faith";
  state.itemOwners.item_thread = "rule:beauty";
  state.eventLog = [
    changedRuleEvent("rule_faith_1", 1, "faith", "concept_potato", "item_potato", "土豆是神"),
    changedRuleEvent("rule_beauty_2", 2, "beauty", "concept_connection", "item_thread", "连接是美的")
  ];
  return GameStateSchema.parse(state);
}

function stateWithOneRule(): GameState {
  const state = stateWithTwoRules();
  state.activeRules.beauty = null;
  state.eventLog = state.eventLog.filter(event => event.id !== "rule_beauty_2");
  state.itemOwners.item_thread = "player";
  return GameStateSchema.parse(state);
}

function reactionFor(state: GameState, npcId: string, slot: "faith" | "beauty" = "faith"): RuleReaction {
  const active = ruleContext(state, npcId).active.find(rule => rule.slot === slot);
  if (!active) throw new Error(`missing ${slot} rule`);
  return { ruleId: active.id, beatIndex: 0, quote: "我会把这条规则落到今天的事上。", stance: "把公共规则理解成眼前的责任", demand: "请先和我把具体做法说清楚。" };
}

function regularDialogue(context: CaseContext, reaction: RuleReaction): DialogueResult {
  return {
    speakerId: context.npcId,
    line: "我会先把眼前的事说清楚。",
    continuations: [],
    options: [],
    emotion: "认真",
    debug: {
      provider: "mock",
      decision: "fixture",
      ruleReactions: [reaction],
      usedFacts: [],
      disclosedFacts: [],
      disclosures: [],
      promptVersion: "rule-test"
    }
  };
}

class RuleDialogueProvider extends CaseDialogueProvider {
  constructor(private readonly reactionBeat = 0, private readonly addReaction = true) { super({ apiKey: "" }); }

  async generate(context: CaseContext): Promise<DialogueResult> {
    const reaction = reactionFor(context.state, context.npcId);
    reaction.beatIndex = this.reactionBeat;
    reaction.quote = this.reactionBeat === 0 ? "我先说一句。" : "第二句才真正落到规则上。";
    const firstLine = this.reactionBeat === 0 ? reaction.quote : "我先说一句。";
    const base = regularDialogue(context, reaction);
    return {
      ...base,
      line: firstLine,
      continuations: this.reactionBeat === 1 ? [{ speakerId: context.npcId, line: reaction.quote, emotion: "认真" }] : [],
      debug: { ...base.debug, ruleReactions: this.addReaction ? [reaction] : [] }
    };
  }

  async generateHearts(context: HeartContext): Promise<DialogueResult> {
    const reaction = reactionFor(context.state, context.npcId);
    reaction.beatIndex = this.reactionBeat;
    reaction.quote = this.reactionBeat === 0 ? "我先说一句。" : "第二句才真正落到规则上。";
    const beats = this.reactionBeat === 0
      ? [{ speaker: "npc" as const, line: reaction.quote, stage_direction: "", emotion: "认真" }]
      : [
        { speaker: "npc" as const, line: "我先说一句。", stage_direction: "", emotion: "认真" },
        { speaker: "npc" as const, line: reaction.quote, stage_direction: "", emotion: "认真" }
      ];
    return heartResult({
      beats, can_continue: false, choice_point: null, action_plan: null, consequence: null, closing_reason: "自然结束",
      used_fact_ids: [], disclosed_fact_ids: [], disclosures: [],
      progress: { type: "request", summary: "把公共规则落到眼前的具体事情" }, pickup: null,
      rule_reactions: this.addReaction ? [reaction] : []
    }, context, "mock");
  }
}

class HeartActionProvider extends CaseDialogueProvider {
  async generate(context: CaseContext): Promise<DialogueResult> {
    return regularDialogue(context, reactionFor(context.state, context.npcId));
  }

  async generateHearts(context: HeartContext): Promise<DialogueResult> {
    if (context.heartIntent === "opening") return mockHeartDialogue(context);
    const line = "这份车票，我现在可以拿给你看看。";
    return heartResult({
      beats: [
        { speaker: "player", line: "那我们先从眼前的一件小事开始。", stage_direction: "", emotion: "认真" },
        { speaker: "npc", line, stage_direction: "", emotion: "认真" }
      ],
      can_continue: true,
      choice_point: { quote: line, reason: "小春等待遥回应她的决定" },
      action_plan: null,
      consequence: { type: "material", actionId: "show:E01", beatIndex: 1, quote: line },
      closing_reason: "",
      used_fact_ids: [],
      disclosed_fact_ids: [],
      disclosures: [],
      progress: { type: "action", summary: "小春决定出示现有车票" },
      pickup: null,
      rule_reactions: []
    }, context, "mock");
  }
}

beforeEach(() => {
  // Every test uses a deterministic provider; this guard makes accidental network calls fail fast.
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network disabled in rule reaction tests"); }));
});

afterEach(() => vi.unstubAllGlobals());

describe("公共规则上下文", () => {
  it("为七名NPC提供不同lens，并清楚区分信仰槽与审美槽", () => {
    const state = stateWithTwoRules();
    const contexts = npcs.map(npcId => ruleContext(state, npcId, true));
    expect(new Set(contexts.map(context => context.npc_lens)).size).toBe(7);
    expect(contexts[0].active.map(rule => rule.slot)).toEqual(["faith", "beauty"]);
    expect(contexts[0].active.map(rule => rule.id)).toEqual(["faith:rule_faith_1", "beauty:rule_beauty_2"]);
    expect(contexts[0].active.map(rule => rule.rule)).toEqual(["土豆是神", "连接是美的"]);
    expect(contexts[0].active.every(rule => rule.needs_response)).toBe(true);
  });

  it("首次进入时要求回应尚未回应的新规则，写入一次callback后不再要求同一条", () => {
    const state = stateWithOneRule();
    const first = ruleContext(state, "npc_koharu", true);
    expect(first.required_rule_id).toBe("faith:rule_faith_1");
    state.eventLog.push({
      id: "callback_1", sequence: state.eventLog.length, day: state.day, minute: state.currentMinute, period: state.period,
      type: "rule_callback", actorId: "npc_koharu", targetId: "player", itemId: null, locationId: "loc_shrine",
      audience: ["player", "npc_koharu"], details: { text: "已回应", ruleId: "faith:rule_faith_1", stance: "具体理解", demand: "具体要求", quote: "我会把这条规则落到今天的事上。", sourceEventId: "dialogue_1" }
    });
    const after = ruleContext(state, "npc_koharu", true);
    expect(after.required_rule_id).toBeNull();
    expect(after.active[0].previous_responses).toEqual([expect.objectContaining({ stance: "具体理解", demand: "具体要求" })]);
  });

  it("替换规则后只要求回应新规则，旧规则的callback保留在历史而不污染当前active", () => {
    const state = stateWithOneRule();
    state.day = 3;
    state.activeRules.faith = { slotId: "faith", carrierItemId: "item_cat_bell", conceptId: "concept_cat", displayText: "猫是神", activatedDay: 3 };
    state.itemOwners.item_potato = "loc_shrine";
    state.itemOwners.item_cat_bell = "rule:faith";
    state.eventLog.push(changedRuleEvent("rule_faith_3", 3, "faith", "concept_cat", "item_cat_bell", "猫是神"));
    state.eventLog.push({
      id: "callback_old", sequence: state.eventLog.length, day: 2, minute: 2500, period: "night", type: "rule_callback",
      actorId: "npc_koharu", targetId: "player", itemId: null, locationId: "loc_shrine", audience: ["player", "npc_koharu"],
      details: { text: "旧规则已回应", ruleId: "faith:rule_faith_1", stance: "旧", demand: "旧", quote: "旧", sourceEventId: "old_dialogue" }
    });
    const context = ruleContext(state, "npc_koharu", true);
    expect(context.active[0]).toMatchObject({ id: "faith:rule_faith_3", rule: "猫是神", needs_response: true });
    expect(context.active[0].previous_responses).toEqual([]);
    expect(context.past_responses.some(response => response.ruleId === "faith:rule_faith_1")).toBe(true);
  });

  it("没有公共规则时保持旧调用兼容，且不要求reaction", () => {
    const state = createInitialState();
    const context = ruleContext(state, "npc_koharu", true);
    expect(context.active).toEqual([]);
    expect(context.required_rule_id).toBeNull();
    expect(validRuleReactions([], state, "npc_koharu", [{ speakerId: "npc_koharu", line: "普通开场。" }], true)).toBe(true);
  });
});

describe("规则reaction结构校验", () => {
  it("拒绝重复规则、错误NPC台词、错误索引和未激活规则", () => {
    const state = stateWithTwoRules();
    const beats = [{ speakerId: "npc_koharu", line: "我会把这条规则落到今天的事上。" }];
    const valid = reactionFor(state, "npc_koharu");
    expect(validRuleReactions([valid], state, "npc_koharu", beats, false)).toBe(true);
    expect(validRuleReactions([valid, valid], state, "npc_koharu", beats, false)).toBe(false);
    expect(validRuleReactions([{ ...valid, beatIndex: 1 }], state, "npc_koharu", beats, false)).toBe(false);
    expect(validRuleReactions([{ ...valid, quote: "台词中没有这句" }], state, "npc_koharu", beats, false)).toBe(false);
    expect(validRuleReactions([{ ...valid, ruleId: "faith:never_active" }], state, "npc_koharu", beats, false)).toBe(false);
    expect(validRuleReactions([{ ...valid, beatIndex: 0 }], state, "npc_saya", beats, false)).toBe(false);
  });
});

describe("规则callback只在实际播放时落地", () => {
  function setup(reactionBeat = 1) {
    const store = new MemoryGameStore();
    const state = stateWithOneRule();
    store.save(state);
    const game = new GameService(store, new RuleDialogueProvider(reactionBeat));
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    return { game, store };
  }

  it("未播放的reaction不进入callback、NPC记忆或公共projection", async () => {
    const { game, store } = setup(1);
    await game.startHeartEncounter(game.getState().revision);
    expect(store.load()!.eventLog.filter(event => event.type === "rule_callback")).toHaveLength(0);
    expect(store.load()!.npcStates.npc_koharu.memories.some(memory => memory.kind === "rule_callback")).toBe(false);
    expect(store.load()!.currentDialogue?.debug.ruleReactions).toHaveLength(1);
    expect(game.getState().currentDialogue?.debug.ruleReactions).toBeUndefined();
    await nextSpeech(game);
    expect(store.load()!.eventLog.filter(event => event.type === "rule_callback")).toHaveLength(1);
    expect(store.load()!.npcStates.npc_koharu.memories.some(memory => memory.kind === "rule_callback")).toBe(true);
    expect(game.getState().eventLog.some(event => event.type === "rule_callback")).toBe(true);
    expect(game.getState().eventLog.find(event => event.type === "rule_callback")?.details.ruleText).toBe("土豆是神");
  });

  it("callback按sourceEventId和ruleId幂等，重启不会重复记录", async () => {
    const { game, store } = setup(0);
    await game.startHeartEncounter(game.getState().revision);
    const callbacks = store.load()!.eventLog.filter(event => event.type === "rule_callback");
    expect(callbacks).toHaveLength(1);
    const restored = new GameService(store, new RuleDialogueProvider(0));
    expect(store.load()!.eventLog.filter(event => event.type === "rule_callback")).toHaveLength(1);
    expect(restored.getState().eventLog.filter(event => event.type === "rule_callback")).toHaveLength(1);
  });
});

describe("供奉规则与既有拾绪动作共存", () => {
  it("带mock fetch的真实CaseDialogueProvider可读取规则上下文，并在播放后执行合法show动作", async () => {
    const state = stateWithOneRule();
    const captured: string[] = [];
    let call = 0;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      captured.push(body.messages[1].content);
      const world = JSON.parse(body.messages[1].content).world_rules;
      const rule = world.active[0];
      const openingLine = "我先把这条规则说到今天的车票上。";
      const actionLine = "这份车票，我现在可以拿给你看看。";
      const response = call++ === 0 ? {
        beats: [{ speaker: "npc", line: openingLine, stage_direction: "", emotion: "认真" }],
        can_continue: true,
        choice_point: { quote: openingLine, reason: "小春等待遥回应规则带来的具体取舍" },
        action_plan: null,
        consequence: null,
        closing_reason: "",
        used_fact_ids: [],
        disclosed_fact_ids: [],
        disclosures: [],
        progress: { type: "request", summary: "小春把公共规则落到眼前的车票" },
        pickup: null,
        rule_reactions: [{ ruleId: rule.id, beatIndex: 0, quote: openingLine, stance: "把规则理解成保护眼前的物件", demand: "请先看清它再作决定。" }]
      } : {
        beats: [
          { speaker: "player", line: "那我们先从眼前的一件小事开始。", stage_direction: "", emotion: "认真" },
          { speaker: "npc", line: actionLine, stage_direction: "", emotion: "认真" }
        ],
        can_continue: true,
        choice_point: { quote: actionLine, reason: "小春等待遥回应她的决定" },
        action_plan: null,
        consequence: { type: "material", actionId: "show:E01", beatIndex: 1, quote: actionLine },
        closing_reason: "",
        used_fact_ids: [],
        disclosed_fact_ids: [],
        disclosures: [],
        progress: { type: "action", summary: "小春决定出示现有车票" },
        pickup: null,
        rule_reactions: [{ ruleId: rule.id, beatIndex: 1, quote: actionLine, stance: "把规则理解成保护眼前的物件", demand: "请先看清它再作决定。" }]
      };
      return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(response) } }] }), { status: 200 });
    });
    const store = new MemoryGameStore();
    state.heartCards = [{ id: "test_fear", sourceType: "test", kind: "fear", sourceNpcId: "system_test", sourceEventId: "seed", sourceText: "测试", day: state.day, locationId: null }];
    store.save(state);
    const provider = new CaseDialogueProvider({ apiKey: "test-key", fetchImpl, review: false });
    const game = new GameService(store, provider);
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    await showSpeech(game);
    expect(JSON.parse(captured[0]).world_rules.npc_lens).toContain("保护神圣之物");
    expect(JSON.parse(captured[0]).world_rules.required_rule_id).toBe("faith:rule_faith_1");
    const before = game.getState();
    await game.useHeart("test_fear", before.revision);
    expect(game.getState().evidenceJournal.some(entry => entry.id === "E01")).toBe(false);
    await nextSpeech(game);
    expect(game.getState().evidenceJournal.some(entry => entry.id === "E01")).toBe(true);
    expect(game.getState().itemOwners.E01).toBe("npc_koharu");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(game.getState().eventLog.filter(event => event.type === "rule_callback")).toHaveLength(2);
    expect(game.getState().eventLog.filter(event => event.type === "rule_callback").at(-1)?.details.ruleText).toBe("土豆是神");
  });
});
