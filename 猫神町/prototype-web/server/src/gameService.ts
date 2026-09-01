import {
  GameActionResponseSchema,
  GameStateSchema,
  demoBootstrap,
  resolvePlayerLine,
  splitDialogueLine,
  type GameActionResponse,
  type GameEvent,
  type GameState,
  type InteractionMode,
  type RuleSlotId,
  type TimePeriod
} from "../../packages/shared/src/index.ts";
import { DialogueProviderRouter, type GameDialogueProvider } from "./dialogueProvider.ts";
import type { GameStore } from "./persistence.ts";

const talkRewards: Record<string, { itemId: string; rewardId: string }> = {
  "npc_koharu:ask_memory": { itemId: "item_cat_bell", rewardId: "reward_koharu_cat_bell" },
  "npc_saya:saya_take_ticket": { itemId: "item_ticket", rewardId: "reward_saya_ticket" },
  "npc_genichi:ask_gallery": { itemId: "item_photo", rewardId: "reward_genichi_photo" }
};

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}

function createInitialState(): GameState {
  const itemOwners = Object.fromEntries(
    demoBootstrap.items.map((item) => [item.id, item.initialOwnerId])
  );

  return GameStateSchema.parse({
    saveVersion: 2,
    revision: 0,
    day: 1,
    period: "morning",
    phase: "action",
    dayStartMinute: demoBootstrap.initialState.dayStartMinute,
    nightStartMinute: demoBootstrap.initialState.nightStartMinute,
    currentMinute: demoBootstrap.initialState.currentMinute,
    conversationDurationMinutes: demoBootstrap.initialState.conversationDurationMinutes,
    currentLocationId: null,
    activeNpcId: null,
    interactionMode: null,
    currentDialogue: null,
    lastPlayerChoice: null,
    giftItemId: null,
    itemOwners,
    activeRules: { faith: null, beauty: null },
    ruleChangedThisNight: false,
    claimedRewardIds: [],
    eventLog: [
      {
        id: "event_0000",
        sequence: 0,
        day: 1,
        period: "morning",
        type: "game_started",
        actorId: "player",
        targetId: null,
        itemId: null,
        locationId: null,
        details: { version: "day3" }
      }
    ]
  });
}

function periodForMinute(minute: number, nightStartMinute: number): TimePeriod {
  if (minute >= nightStartMinute) return "night";
  if (minute < 12 * 60) return "morning";
  if (minute < 17 * 60) return "afternoon";
  return "evening";
}

function formatTime(minute: number) {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function upgradeDialoguePresentation(state: GameState): GameState {
  const dialogue = state.currentDialogue;
  if (!dialogue) return state;

  dialogue.options = dialogue.options.map((option) => ({
    ...option,
    playerLine: resolvePlayerLine(option)
  }));
  if (dialogue.continuations.length === 0 || dialogue.debug.promptVersion === "saya-dialogue-v2") {
    const legacyLine = [dialogue.line, ...dialogue.continuations.map((beat) => beat.line)].join("");
    const beats = splitDialogueLine(legacyLine, dialogue.emotion);
    dialogue.line = beats.line;
    dialogue.continuations = beats.continuations;
  }
  return GameStateSchema.parse(state);
}

export class GameService {
  private state: GameState;

  constructor(
    private readonly store: GameStore,
    private readonly dialogueProvider: GameDialogueProvider = new DialogueProviderRouter({ apiKey: "" })
  ) {
    this.state = upgradeDialoguePresentation(store.load() ?? createInitialState());
    this.store.save(this.state);
  }

  getState(): GameState {
    return structuredClone(GameStateSchema.parse(this.state));
  }

  reset(): GameActionResponse {
    this.state = createInitialState();
    this.store.save(this.state);
    return this.response("新游戏已经建立。", null);
  }

  travel(locationId: string): GameActionResponse {
    this.assertPhase("action");

    const location = demoBootstrap.locations.find((candidate) => candidate.id === locationId);
    const npc = demoBootstrap.npcs.find((candidate) => candidate.initialLocationId === locationId);
    if (!location || !npc) {
      throw new GameRuleError("这个地点当前无法进入。");
    }
    if (this.state.currentMinute + location.travelMinutes > this.state.nightStartMinute) {
      throw new GameRuleError("现在出发会错过入夜时间，今天不能再前往这个地点。");
    }

    const draft = this.draft();
    const timeBefore = draft.currentMinute;
    draft.currentMinute += location.travelMinutes;
    draft.period = periodForMinute(draft.currentMinute, draft.nightStartMinute);
    draft.phase = "location";
    draft.currentLocationId = location.id;
    draft.activeNpcId = null;
    draft.interactionMode = null;
    draft.currentDialogue = null;
    draft.lastPlayerChoice = null;
    draft.giftItemId = null;
    this.appendEvent(draft, {
      type: "travel",
      actorId: "player",
      targetId: npc.id,
      itemId: null,
      locationId: location.id,
      details: {
        duration_minutes: String(location.travelMinutes),
        time_before: formatTime(timeBefore),
        time_after: formatTime(draft.currentMinute)
      }
    });

    return this.commit(draft, `${formatTime(draft.currentMinute)} 抵达${location.name}，移动耗时 ${location.travelMinutes / 60} 小时。`, null);
  }

  startEncounter(): GameActionResponse {
    this.assertPhase("location");
    const location = demoBootstrap.locations.find(
      (candidate) => candidate.id === this.state.currentLocationId
    );
    const npc = demoBootstrap.npcs.find(
      (candidate) => candidate.initialLocationId === this.state.currentLocationId
    );
    if (!location || !npc) {
      throw new GameRuleError("当前地点没有可以开始会面的 NPC。");
    }

    const draft = this.draft();
    draft.phase = "encounter";
    draft.activeNpcId = npc.id;
    draft.interactionMode = null;
    draft.currentDialogue = null;
    draft.lastPlayerChoice = null;
    draft.giftItemId = null;
    this.appendEvent(draft, {
      type: "encounter_started",
      actorId: "player",
      targetId: npc.id,
      itemId: null,
      locationId: location.id,
      details: { duration_minutes: "0" }
    });

    return this.commit(draft, `开始与${npc.name}会面。请选择交谈或赠送礼物。`, null);
  }

  leaveLocation(): GameActionResponse {
    this.assertPhase("location");
    const location = demoBootstrap.locations.find(
      (candidate) => candidate.id === this.state.currentLocationId
    );
    if (!location) throw new GameRuleError("当前没有可以离开的地点。");

    const draft = this.draft();
    this.appendEvent(draft, {
      type: "location_left",
      actorId: "player",
      targetId: null,
      itemId: null,
      locationId: location.id,
      details: { duration_minutes: "0", met_npc: "false" }
    });
    draft.currentLocationId = null;
    draft.activeNpcId = null;
    draft.interactionMode = null;
    draft.currentDialogue = null;
    draft.lastPlayerChoice = null;
    draft.giftItemId = null;
    draft.phase = draft.currentMinute >= draft.nightStartMinute ? "night" : "action";

    const notice = draft.phase === "night"
      ? `离开${location.name}时已经入夜，猫神社的供奉位开放了。`
      : `离开${location.name}，没有开始会面，也没有额外消耗时间。`;
    return this.commit(draft, notice, null);
  }

  async selectInteractionMode(mode: InteractionMode): Promise<GameActionResponse> {
    this.assertPhase("encounter");
    if (this.state.interactionMode) {
      throw new GameRuleError("本次会面已经选择过交互方式。");
    }

    const npc = this.requireActiveNpc();
    const draft = this.draft();
    const timeBefore = draft.currentMinute;
    if (mode === "talk") {
      this.assertConversationTime();
      draft.currentMinute += draft.conversationDurationMinutes;
      draft.period = periodForMinute(draft.currentMinute, draft.nightStartMinute);
    }
    draft.interactionMode = mode;
    draft.lastPlayerChoice = null;
    draft.giftItemId = null;
    this.appendEvent(draft, {
      type: "interaction_mode_selected",
      actorId: "player",
      targetId: npc.id,
      itemId: null,
      locationId: draft.currentLocationId,
      details: {
        mode,
        duration_minutes: String(mode === "talk" ? draft.conversationDurationMinutes : 0),
        time_before: formatTime(timeBefore),
        time_after: formatTime(draft.currentMinute)
      }
    });
    draft.currentDialogue = mode === "talk"
      ? await this.dialogueProvider.generate({
          state: draft,
          npc,
          locationId: draft.currentLocationId!,
          mode: "talk",
          giftItem: null,
          selectedOption: null
        })
      : null;

    return this.commit(
      draft,
      mode === "talk"
        ? `与${npc.name}开始交谈，时间推进至 ${formatTime(draft.currentMinute)}。`
        : `请选择要赠送给${npc.name}的物品；确认前不会消耗交谈时间。`,
      null
    );
  }

  cancelInteractionMode(): GameActionResponse {
    this.assertEncounterMode("gift");
    if (this.state.giftItemId) {
      throw new GameRuleError("礼物已经交出，不能返回会面入口。");
    }

    const draft = this.draft();
    draft.interactionMode = null;
    draft.currentDialogue = null;
    draft.lastPlayerChoice = null;
    return this.commit(draft, "已返回会面方式选择。", null);
  }

  async chooseTalkOption(optionId: string): Promise<GameActionResponse> {
    this.assertEncounterMode("talk");
    const npc = this.requireActiveNpc();
    const option = this.state.currentDialogue?.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      throw new GameRuleError("这个对话选项当前不可用。");
    }

    if (option.intent === "结束会面") {
      return this.completeEncounter(`结束了与${npc.name}的交谈。`);
    }

    const draft = this.draft();
    const playerLine = resolvePlayerLine(option);
    draft.lastPlayerChoice = playerLine;
    this.appendEvent(draft, {
      type: "dialogue_choice",
      actorId: "player",
      targetId: npc.id,
      itemId: null,
      locationId: draft.currentLocationId,
      details: { mode: "talk", option_id: option.id, option_text: option.text, player_line: playerLine }
    });
    draft.currentDialogue = await this.dialogueProvider.generate({
      state: draft,
      npc,
      locationId: draft.currentLocationId!,
      mode: "talk",
      giftItem: null,
      selectedOption: option
    });

    let acquiredItemId: string | null = null;
    let notice: string | null = null;
    const reward = talkRewards[`${npc.id}:${option.id}`];
    if (reward && !draft.claimedRewardIds.includes(reward.rewardId)) {
      const item = demoBootstrap.items.find((candidate) => candidate.id === reward.itemId);
      if (item && draft.itemOwners[item.id] !== "player") {
        const previousOwner = draft.itemOwners[item.id];
        draft.itemOwners[item.id] = "player";
        draft.claimedRewardIds.push(reward.rewardId);
        acquiredItemId = item.id;
        notice = `${npc.name}把“${item.baseName}”交给了你。`;
        this.appendEvent(draft, {
          type: "item_transfer",
          actorId: previousOwner,
          targetId: "player",
          itemId: item.id,
          locationId: draft.currentLocationId,
          details: { reason: "dialogue_reward", reward_id: reward.rewardId }
        });
      }
    }

    return this.commit(draft, notice, acquiredItemId);
  }

  async confirmGift(itemId: string): Promise<GameActionResponse> {
    this.assertEncounterMode("gift");
    if (this.state.giftItemId) {
      throw new GameRuleError("本次会面已经赠送过物品。");
    }
    if (this.state.itemOwners[itemId] !== "player") {
      throw new GameRuleError("这件物品已经不在你的背包里。");
    }

    const npc = this.requireActiveNpc();
    const item = demoBootstrap.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new GameRuleError("找不到这件物品。");
    this.assertConversationTime();

    const draft = this.draft();
    const timeBefore = draft.currentMinute;
    draft.currentMinute += draft.conversationDurationMinutes;
    draft.period = periodForMinute(draft.currentMinute, draft.nightStartMinute);
    draft.itemOwners[item.id] = npc.id;
    draft.giftItemId = item.id;
    draft.lastPlayerChoice = null;
    this.appendEvent(draft, {
      type: "item_transfer",
      actorId: "player",
      targetId: npc.id,
      itemId: item.id,
      locationId: draft.currentLocationId,
      details: {
        reason: "gift",
        irreversible: "true",
        duration_minutes: String(draft.conversationDurationMinutes),
        time_before: formatTime(timeBefore),
        time_after: formatTime(draft.currentMinute)
      }
    });
    draft.currentDialogue = await this.dialogueProvider.generate({
      state: draft,
      npc,
      locationId: draft.currentLocationId!,
      mode: "gift",
      giftItem: item,
      selectedOption: null
    });

    return this.commit(draft, `“${item.baseName}”已经交给${npc.name}，时间推进至 ${formatTime(draft.currentMinute)}，物品所有权不可撤销。`, null);
  }

  async respondToGift(optionId: string): Promise<GameActionResponse> {
    this.assertEncounterMode("gift");
    const npc = this.requireActiveNpc();
    const item = demoBootstrap.items.find((candidate) => candidate.id === this.state.giftItemId);
    const option = this.state.currentDialogue?.options.find((candidate) => candidate.id === optionId);
    if (!item || !option) {
      throw new GameRuleError("当前没有可以继续的礼物对话。");
    }

    const draft = this.draft();
    const playerLine = resolvePlayerLine(option);
    draft.lastPlayerChoice = playerLine;
    this.appendEvent(draft, {
      type: "dialogue_choice",
      actorId: "player",
      targetId: npc.id,
      itemId: item.id,
      locationId: draft.currentLocationId,
      details: { mode: "gift", option_id: option.id, option_text: option.text, player_line: playerLine }
    });
    draft.currentDialogue = await this.dialogueProvider.generate({
      state: draft,
      npc,
      locationId: draft.currentLocationId!,
      mode: "gift",
      giftItem: item,
      selectedOption: option
    });

    return this.commit(draft, null, null);
  }

  completeEncounter(notice = "本次会面已经结束。"): GameActionResponse {
    this.assertPhase("encounter");
    const draft = this.draft();
    const completedLocationId = draft.currentLocationId;
    const completedNpcId = draft.activeNpcId;
    this.appendEvent(draft, {
      type: "encounter_completed",
      actorId: "player",
      targetId: completedNpcId,
      itemId: draft.giftItemId,
      locationId: completedLocationId,
      details: { mode: draft.interactionMode ?? "skipped" }
    });
    draft.currentLocationId = null;
    draft.activeNpcId = null;
    draft.interactionMode = null;
    draft.currentDialogue = null;
    draft.lastPlayerChoice = null;
    draft.giftItemId = null;
    draft.period = periodForMinute(draft.currentMinute, draft.nightStartMinute);
    draft.phase = draft.currentMinute >= draft.nightStartMinute ? "night" : "action";

    const finalNotice = draft.phase === "night"
      ? `${notice} 现在是 ${formatTime(draft.currentMinute)}，夜间猫神社开放。`
      : notice;
    return this.commit(draft, finalNotice, null);
  }

  changeRule(slotId: RuleSlotId, itemId: string): GameActionResponse {
    this.assertPhase("night");
    if (this.state.ruleChangedThisNight) {
      throw new GameRuleError("今晚已经修改过一次世界规则。");
    }
    if (this.state.itemOwners[itemId] !== "player") {
      throw new GameRuleError("这件物品已经不在你的背包里。");
    }

    const item = demoBootstrap.items.find((candidate) => candidate.id === itemId);
    const concept = demoBootstrap.concepts.find((candidate) => candidate.id === item?.carriedConceptId);
    if (!item || !concept) throw new GameRuleError("物品没有可用的承载概念。");

    const draft = this.draft();
    const previousRule = draft.activeRules[slotId];
    if (previousRule) {
      draft.itemOwners[previousRule.carrierItemId] = "loc_shrine";
    }
    draft.itemOwners[item.id] = `rule:${slotId}`;
    draft.activeRules[slotId] = {
      slotId,
      carrierItemId: item.id,
      conceptId: concept.id,
      displayText: concept.slotText[slotId],
      activatedDay: draft.day
    };
    draft.ruleChangedThisNight = true;
    this.appendEvent(draft, {
      type: "item_transfer",
      actorId: "player",
      targetId: `rule:${slotId}`,
      itemId: item.id,
      locationId: "loc_shrine",
      details: { reason: "rule_carrier" }
    });
    this.appendEvent(draft, {
      type: "rule_changed",
      actorId: "player",
      targetId: slotId,
      itemId: item.id,
      locationId: "loc_shrine",
      details: { concept_id: concept.id, display_text: concept.slotText[slotId] }
    });

    return this.commit(draft, `世界规则已经变为：“${concept.slotText[slotId]}”。`, null);
  }

  endDay(): GameActionResponse {
    this.assertPhase("night");
    if (this.state.day >= 7) {
      throw new GameRuleError("第七天结局将在 Day 5 接入，当前不能继续推进。");
    }

    const draft = this.draft();
    draft.day += 1;
    draft.period = "morning";
    draft.phase = "action";
    draft.currentMinute = draft.dayStartMinute;
    draft.ruleChangedThisNight = false;
    this.appendEvent(draft, {
      type: "day_advanced",
      actorId: "system",
      targetId: null,
      itemId: null,
      locationId: null,
      details: { new_day: String(draft.day) }
    });

    return this.commit(draft, `第 ${draft.day} 天开始了。`, null);
  }

  private requireActiveNpc() {
    const npc = demoBootstrap.npcs.find((candidate) => candidate.id === this.state.activeNpcId);
    if (!npc) throw new GameRuleError("当前没有可以会面的 NPC。");
    return npc;
  }

  private assertPhase(expected: GameState["phase"]) {
    if (this.state.phase !== expected) {
      throw new GameRuleError(`当前阶段不能执行这个操作，需要阶段：${expected}。`);
    }
  }

  private assertEncounterMode(expected: InteractionMode) {
    this.assertPhase("encounter");
    if (this.state.interactionMode !== expected) {
      throw new GameRuleError(`本次会面没有选择${expected === "talk" ? "交谈" : "赠送礼物"}。`);
    }
  }

  private assertConversationTime() {
    const endMinute = this.state.currentMinute + this.state.conversationDurationMinutes;
    if (endMinute > this.state.nightStartMinute) {
      throw new GameRuleError(
        `现在是 ${formatTime(this.state.currentMinute)}，剩余时间不足以开始 ${this.state.conversationDurationMinutes / 60} 小时的会面。`
      );
    }
  }

  private draft(): GameState {
    return structuredClone(this.state);
  }

  private appendEvent(
    state: GameState,
    event: Omit<GameEvent, "id" | "sequence" | "day" | "period">
  ) {
    const sequence = (state.eventLog.at(-1)?.sequence ?? -1) + 1;
    state.eventLog.push({
      id: `event_${String(sequence).padStart(4, "0")}`,
      sequence,
      day: state.day,
      period: state.period,
      ...event
    });
  }

  private commit(
    state: GameState,
    notice: string | null,
    acquiredItemId: string | null
  ): GameActionResponse {
    state.revision += 1;
    this.state = GameStateSchema.parse(state);
    this.store.save(this.state);
    return this.response(notice, acquiredItemId);
  }

  private response(notice: string | null, acquiredItemId: string | null): GameActionResponse {
    return GameActionResponseSchema.parse({
      state: this.getState(),
      notice,
      acquiredItemId
    });
  }
}
