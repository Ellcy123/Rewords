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
  "npc_saya:saya_personal_probe": { itemId: "item_name_tag", rewardId: "reward_saya_name_tag" },
  "npc_saya:saya_take_ticket": { itemId: "item_ticket", rewardId: "reward_saya_ticket" },
  "npc_genichi:ask_gallery": { itemId: "item_photo", rewardId: "reward_genichi_photo" }
};

type MemoryKind = "player_choice" | "dialogue" | "gift" | "rule_callback" | "item_change" | "observation" | "reflection";

function relationshipDelta(intent: string) {
  if (/共同|温和|帮助|备份|交出|坦白|带走|立即调查/.test(intent)) return 1;
  if (/错误指控|逼问|威胁|公开对抗|故意伤害/.test(intent)) return -1;
  return 0;
}

function ruleCallbackFor(npcId: string, ruleText: string) {
  if (npcId === "npc_koharu") {
    return `“${ruleText}”生效后，小春连夜重印寻人启事，标题改成“${ruleText}——请把雨宫真昼还回来”，并把启事贴满神社石阶。`;
  }
  if (npcId === "npc_saya") {
    return `“${ruleText}”生效后，纱夜在站务日志新增“神名”栏；只要黑色车票或通行令出现同样文字，她就封锁零号站台。`;
  }
  return `“${ruleText}”生效后，弦一把这个神名印上第二次“神明离町”的黑色车票，并把朝雾遥列为17:47场次主演。`;
}

const npcSchedules: Record<number, Record<string, string>> = {
  1: { npc_koharu: "loc_shrine", npc_saya: "loc_station", npc_genichi: "loc_arcade" },
  2: { npc_koharu: "loc_station", npc_saya: "loc_arcade", npc_genichi: "loc_shrine" },
  3: { npc_koharu: "loc_arcade", npc_saya: "loc_shrine", npc_genichi: "loc_station" },
  4: { npc_koharu: "loc_shrine", npc_saya: "loc_station", npc_genichi: "loc_arcade" },
  5: { npc_koharu: "loc_station", npc_saya: "loc_shrine", npc_genichi: "loc_arcade" },
  6: { npc_koharu: "loc_arcade", npc_saya: "loc_station", npc_genichi: "loc_shrine" },
  7: { npc_koharu: "loc_shrine", npc_saya: "loc_arcade", npc_genichi: "loc_station" }
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
  const npcStates = Object.fromEntries(demoBootstrap.npcs.map((npc) => [
    npc.id,
    {
      npcId: npc.id,
      currentLocationId: npc.initialLocationId,
      relationship: 0,
      memories: [],
      reflection: "尚未与朝雾遥形成明确判断。",
      openLoops: [npc.persona.immediateGoal]
    }
  ]));

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
    npcStates,
    activeRules: { faith: null, beauty: null },
    storyFlags: [],
    ruleChangedThisNight: false,
    claimedRewardIds: [],
    ending: null,
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
        details: { version: "day5" }
      },
      {
        id: "event_0001",
        sequence: 1,
        day: 1,
        period: "morning",
        type: "daily_event",
        actorId: "system",
        targetId: "day_1_arrival",
        itemId: null,
        locationId: null,
        details: {
          title: demoBootstrap.dailyEvents[0]!.title,
          summary: demoBootstrap.dailyEvents[0]!.summary
        }
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

function upgradeState(state: GameState): GameState {
  for (const npc of demoBootstrap.npcs) {
    state.npcStates[npc.id] ??= {
      npcId: npc.id,
      currentLocationId: npc.initialLocationId,
      relationship: 0,
      memories: [],
      reflection: "尚未与朝雾遥形成明确判断。",
      openLoops: [npc.persona.immediateGoal]
    };
    state.npcStates[npc.id]!.reflection ||= "尚未与朝雾遥形成明确判断。";
    state.npcStates[npc.id]!.openLoops ??= [npc.persona.immediateGoal];
  }
  const dialogue = state.currentDialogue;
  if (!dialogue) return state;

  dialogue.options = dialogue.options.map((option) => ({
    ...option,
    playerLine: resolvePlayerLine(option)
  }));
  if (dialogue.continuations.length === 0) {
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
    this.state = upgradeState(store.load() ?? createInitialState());
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
    const npc = this.npcAtLocation(this.state, locationId);
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
    const npc = this.npcAtLocation(this.state, this.state.currentLocationId);
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

  waitUntilNight(): GameActionResponse {
    this.assertPhase("action");
    const draft = this.draft();
    const timeBefore = draft.currentMinute;
    draft.currentMinute = draft.nightStartMinute;
    draft.period = "night";
    draft.phase = "night";
    this.appendEvent(draft, {
      type: "wait_until_night",
      actorId: "player",
      targetId: null,
      itemId: null,
      locationId: null,
      details: {
        duration_minutes: String(draft.nightStartMinute - timeBefore),
        time_before: formatTime(timeBefore),
        time_after: formatTime(draft.nightStartMinute)
      }
    });
    return this.commit(draft, "你整理完今天的见闻。十八点的钟声响起，供奉位开放了。", null);
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
    if (mode === "talk") {
      draft.currentDialogue = await this.dialogueProvider.generate({
          state: draft,
          npc,
          locationId: draft.currentLocationId!,
          mode: "talk",
          giftItem: null,
          selectedOption: null
        });
      this.recordGeneratedDialogue(draft, npc.id, draft.currentDialogue);
    } else {
      draft.currentDialogue = null;
    }

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
    const choiceEvent = this.appendEvent(draft, {
      type: "dialogue_choice",
      actorId: "player",
      targetId: npc.id,
      itemId: null,
      locationId: draft.currentLocationId,
      details: { mode: "talk", option_id: option.id, option_text: option.text, player_line: playerLine }
    });
    this.remember(draft, npc.id, {
      kind: "player_choice",
      summary: `朝雾遥说：“${playerLine}”`,
      interpretation: `她在这次谈话中选择了“${option.intent}”的态度。`,
      sourceEventId: choiceEvent.id,
      confidence: "certain"
    });
    const npcState = draft.npcStates[npc.id]!;
    npcState.relationship = Math.max(-5, Math.min(5, npcState.relationship + relationshipDelta(option.intent)));
    draft.currentDialogue = await this.dialogueProvider.generate({
      state: draft,
      npc,
      locationId: draft.currentLocationId!,
      mode: "talk",
      giftItem: null,
      selectedOption: option
    });
    this.recordGeneratedDialogue(draft, npc.id, draft.currentDialogue);

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
    const giftEvent = this.appendEvent(draft, {
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
    this.remember(draft, npc.id, {
      kind: "gift",
      summary: `朝雾遥主动把“${item.baseName}”交给了我。`,
      interpretation: "物品已经属于我，但她为什么选择我仍需要结合后续说法判断。",
      sourceEventId: giftEvent.id,
      confidence: "certain"
    });
    draft.currentDialogue = await this.dialogueProvider.generate({
      state: draft,
      npc,
      locationId: draft.currentLocationId!,
      mode: "gift",
      giftItem: item,
      selectedOption: null
    });
    this.recordGeneratedDialogue(draft, npc.id, draft.currentDialogue);

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
    const giftChoiceEvent = this.appendEvent(draft, {
      type: "dialogue_choice",
      actorId: "player",
      targetId: npc.id,
      itemId: item.id,
      locationId: draft.currentLocationId,
      details: { mode: "gift", option_id: option.id, option_text: option.text, player_line: playerLine }
    });
    this.remember(draft, npc.id, {
      kind: "player_choice",
      summary: `赠礼后，朝雾遥说：“${playerLine}”`,
      interpretation: `她用“${option.intent}”解释或回避了赠礼动机。`,
      sourceEventId: giftChoiceEvent.id,
      confidence: "interpreted"
    });
    draft.currentDialogue = await this.dialogueProvider.generate({
      state: draft,
      npc,
      locationId: draft.currentLocationId!,
      mode: "gift",
      giftItem: item,
      selectedOption: option
    });
    this.recordGeneratedDialogue(draft, npc.id, draft.currentDialogue);

    return this.commit(draft, null, null);
  }

  completeEncounter(notice = "本次会面已经结束。"): GameActionResponse {
    this.assertPhase("encounter");
    const draft = this.draft();
    const completedLocationId = draft.currentLocationId;
    const completedNpcId = draft.activeNpcId;
    const reflectionCandidate = draft.currentDialogue?.debug.reflectionCandidate;
    if (completedNpcId && reflectionCandidate && draft.npcStates[completedNpcId]) {
      const completedNpc = demoBootstrap.npcs.find((npc) => npc.id === completedNpcId)!;
      const nextPlan = draft.lastPlayerChoice
        ? `围绕朝雾遥刚才说的“${draft.lastPlayerChoice}”，下一步推进：${completedNpc.persona.immediateGoal}`
        : `下一步推进：${completedNpc.persona.immediateGoal}`;
      draft.npcStates[completedNpcId]!.reflection = reflectionCandidate;
      draft.npcStates[completedNpcId]!.openLoops = [nextPlan];
      const reflectionEvent = this.appendEvent(draft, {
        type: "reflection_updated",
        actorId: completedNpcId,
        targetId: "player",
        itemId: draft.giftItemId,
        locationId: completedLocationId,
        details: { reflection: reflectionCandidate, next_plan: nextPlan }
      });
      this.remember(draft, completedNpcId, {
        kind: "reflection",
        summary: `会面结束后，我形成了判断：${reflectionCandidate}`,
        interpretation: "这条判断将影响下一次会面的策略，不是客观世界事实。",
        sourceEventId: reflectionEvent.id,
        confidence: "interpreted",
        importance: 7,
        tags: ["player", "reflection", `day:${draft.day}`]
      });
    }
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
    const ruleEvent = this.appendEvent(draft, {
      type: "rule_changed",
      actorId: "player",
      targetId: slotId,
      itemId: item.id,
      locationId: "loc_shrine",
      details: { concept_id: concept.id, display_text: concept.slotText[slotId] }
    });
    for (const npc of demoBootstrap.npcs) {
      const callback = ruleCallbackFor(npc.id, concept.slotText[slotId]);
      this.appendEvent(draft, {
        type: "rule_callback",
        actorId: npc.id,
        targetId: slotId,
        itemId: item.id,
        locationId: draft.npcStates[npc.id]?.currentLocationId ?? npc.initialLocationId,
        details: { source_event_id: ruleEvent.id, callback }
      });
      this.remember(draft, npc.id, {
        kind: "rule_callback",
        summary: callback,
        interpretation: `这条规则触碰了我与神的既有关系：${npc.godRelationship}`,
        sourceEventId: ruleEvent.id,
        confidence: "certain"
      });
    }

    return this.commit(draft, `世界规则已经变为：“${concept.slotText[slotId]}”。`, null);
  }

  async endDay(): Promise<GameActionResponse> {
    this.assertPhase("night");
    if (this.state.day >= 7) {
      const draft = this.draft();
      draft.ending = await this.dialogueProvider.generateEnding(draft);
      draft.phase = "ending";
      this.appendEvent(draft, {
        type: "ending_generated",
        actorId: "system",
        targetId: null,
        itemId: null,
        locationId: "loc_shrine",
        details: {
          title: draft.ending.title,
          provider: draft.ending.provider,
          prompt_version: draft.ending.promptVersion
        }
      });
      return this.commit(draft, "第七天已经结束。世界状态被冻结，结局已生成。", null);
    }

    const draft = this.draft();
    const hasKoharuHandoff = draft.eventLog.some(
      (event) => event.type === "item_transfer" && event.details.reason === "npc_handoff_koharu_to_saya"
    );
    if (!hasKoharuHandoff) {
      const handoffItem = demoBootstrap.items.find((item) => draft.itemOwners[item.id] === "npc_koharu");
      if (handoffItem) {
        draft.itemOwners[handoffItem.id] = "npc_saya";
        const handoffEvent = this.appendEvent(draft, {
          type: "item_transfer",
          actorId: "npc_koharu",
          targetId: "npc_saya",
          itemId: handoffItem.id,
          locationId: draft.npcStates.npc_koharu?.currentLocationId ?? "loc_shrine",
          details: { reason: "npc_handoff_koharu_to_saya", source_owner: "npc_koharu" }
        });
        this.remember(draft, "npc_koharu", {
          kind: "item_change",
          summary: `我把“${handoffItem.baseName}”交给纱夜核对来历。`,
          interpretation: "我需要纱夜确认这件物品是否与雨宫真昼、黑色车票或零号站台有关。",
          sourceEventId: handoffEvent.id,
          confidence: "certain"
        });
        this.remember(draft, "npc_saya", {
          kind: "item_change",
          summary: `小春把“${handoffItem.baseName}”交给我核对来历。`,
          interpretation: "小春已经把我当作真昼失踪案的知情者；我必须决定是否拿出五年前的原记录。",
          sourceEventId: handoffEvent.id,
          confidence: "interpreted"
        });
        if (!draft.storyFlags.includes("koharu_saya_handoff")) {
          draft.storyFlags.push("koharu_saya_handoff");
        }
      }
    }

    draft.day += 1;
    draft.period = "morning";
    draft.phase = "action";
    draft.currentMinute = draft.dayStartMinute;
    draft.ruleChangedThisNight = false;
    const schedule = npcSchedules[draft.day]!;
    demoBootstrap.npcs.forEach((npc) => {
      const npcState = draft.npcStates[npc.id]!;
      const previousLocationId = npcState.currentLocationId;
      const nextLocationId = schedule[npc.id]!;
      npcState.currentLocationId = nextLocationId;
      if (previousLocationId !== nextLocationId) {
        this.appendEvent(draft, {
          type: "npc_moved",
          actorId: npc.id,
          targetId: null,
          itemId: null,
          locationId: nextLocationId,
          details: { from_location_id: previousLocationId, to_location_id: nextLocationId }
        });
      }
    });
    this.appendEvent(draft, {
      type: "day_advanced",
      actorId: "system",
      targetId: null,
      itemId: null,
      locationId: null,
      details: { new_day: String(draft.day) }
    });
    const dailyEvent = demoBootstrap.dailyEvents.find((event) => event.day === draft.day)!;
    this.appendEvent(draft, {
      type: "daily_event",
      actorId: "system",
      targetId: dailyEvent.id,
      itemId: null,
      locationId: null,
      details: { title: dailyEvent.title, summary: dailyEvent.summary }
    });
    this.advanceRelationshipChain(draft);

    return this.commit(draft, `第 ${draft.day} 天开始了：${dailyEvent.title}。`, null);
  }

  private advanceRelationshipChain(state: GameState) {
    if (state.storyFlags.includes("koharu_saya_handoff") && !state.storyFlags.includes("saya_audit_started")) {
      const summary = "小春把收到的物品交给纱夜，要求她核对是否与雨宫真昼的黑色车票有关；纱夜没有否认真昼这个姓名。";
      const event = this.appendEvent(state, {
        type: "story_beat",
        actorId: "npc_saya",
        targetId: "npc_koharu",
        itemId: null,
        locationId: state.npcStates.npc_saya?.currentLocationId ?? "loc_station",
        details: { flag: "saya_audit_started", summary }
      });
      state.storyFlags.push("saya_audit_started");
      this.remember(state, "npc_koharu", {
        kind: "observation",
        summary,
        interpretation: "纱夜认识真昼，而且她的反应说明五年前的零号站台确实打开过。",
        sourceEventId: event.id,
        confidence: "certain"
      });
      this.remember(state, "npc_saya", {
        kind: "observation",
        summary,
        interpretation: "小春已经掌握真昼姓名和猫铃；继续隐瞒只会让她独自闯进零号站台。",
        sourceEventId: event.id,
        confidence: "interpreted"
      });
    }

    const genichiHasMetPlayer = state.eventLog.some(
      (event) => event.type === "encounter_started" && event.targetId === "npc_genichi"
    );
    if (
      state.day >= 4
      && genichiHasMetPlayer
      && state.storyFlags.includes("saya_audit_started")
      && !state.storyFlags.includes("genichi_curates_dispute")
    ) {
      const summary = "弦一得知小春和纱夜正在核对真昼的票根，抢先宣布“第二次神明离町”，并把朝雾遥印成第七天17:47场次的主演。";
      const event = this.appendEvent(state, {
        type: "story_beat",
        actorId: "npc_genichi",
        targetId: "npc_saya",
        itemId: null,
        locationId: state.npcStates.npc_genichi?.currentLocationId ?? "loc_arcade",
        details: { flag: "genichi_curates_dispute", summary }
      });
      state.storyFlags.push("genichi_curates_dispute");
      for (const npc of demoBootstrap.npcs) {
        this.remember(state, npc.id, {
          kind: "observation",
          summary,
          interpretation: npc.id === "npc_genichi"
            ? "只要朝雾遥亲手接票并走向站台，五年前的实验就能再次成立。"
            : "弦一准备让朝雾遥重复真昼的失踪；宣传不是评论，而是行动预告。",
          sourceEventId: event.id,
          confidence: "certain"
        });
      }
    }

    if (
      state.day >= 6
      && Object.values(state.activeRules).some(Boolean)
      && !state.storyFlags.includes("final_public_test")
    ) {
      const ruleNames = Object.values(state.activeRules)
        .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
        .map((rule) => `“${rule.displayText}”`)
        .join("、");
      const summary = `第七天17:47，三个人将在零号站台正面对质${ruleNames}：小春带真昼的猫铃，纱夜带原始通行令，弦一带写有朝雾遥姓名的新车票。`;
      const event = this.appendEvent(state, {
        type: "story_beat",
        actorId: "system",
        targetId: "final_public_test",
        itemId: null,
        locationId: "loc_shrine",
        details: { flag: "final_public_test", summary }
      });
      state.storyFlags.push("final_public_test");
      for (const npc of demoBootstrap.npcs) {
        this.remember(state, npc.id, {
          kind: "observation",
          summary,
          interpretation: npc.ruleResponseStyle,
          sourceEventId: event.id,
          confidence: "certain"
        });
      }
    }
  }

  private requireActiveNpc() {
    const npc = demoBootstrap.npcs.find((candidate) => candidate.id === this.state.activeNpcId);
    if (!npc) throw new GameRuleError("当前没有可以会面的 NPC。");
    return npc;
  }

  private recordGeneratedDialogue(
    state: GameState,
    npcId: string,
    dialogue: NonNullable<GameState["currentDialogue"]>
  ) {
    const npc = demoBootstrap.npcs.find((candidate) => candidate.id === npcId);
    if (!npc) return;
    const transcript = [
      `${npc.name}：${dialogue.line}`,
      ...dialogue.continuations.map((beat) => {
        const speaker = beat.speakerId === demoBootstrap.player.id ? demoBootstrap.player.name : npc.name;
        return `${speaker}：${beat.line}`;
      })
    ].join("\n");
    const dialogueEvent = this.appendEvent(state, {
      type: "dialogue_generated",
      actorId: npcId,
      targetId: npcId,
      itemId: state.giftItemId,
      locationId: state.currentLocationId,
      details: {
        mode: state.interactionMode ?? "talk",
        transcript,
        scene_goal: dialogue.debug.sceneGoal ?? "推进当前会面",
        memory_candidate: dialogue.debug.memoryCandidate ?? transcript,
        prompt_version: dialogue.debug.promptVersion ?? "mock"
      }
    });
    this.remember(state, npcId, {
      kind: "dialogue",
      summary: dialogue.debug.memoryCandidate ?? transcript,
      interpretation: dialogue.debug.reflectionCandidate ?? "这段对白尚未形成稳定判断。",
      sourceEventId: dialogueEvent.id,
      confidence: "certain",
      importance: state.lastPlayerChoice ? 6 : 4,
      tags: [npcId, state.currentLocationId ?? "unknown_location", state.interactionMode ?? "talk", `day:${state.day}`]
    });

    const actionId = dialogue.debug.npcActionId;
    const actionText = dialogue.debug.npcAction;
    if (actionId && actionText) {
      this.appendEvent(state, {
        type: "npc_action",
        actorId: npcId,
        targetId: "player",
        itemId: state.giftItemId,
        locationId: state.currentLocationId,
        details: { action_id: actionId, action: actionText, source_dialogue_event_id: dialogueEvent.id }
      });
      const actionFlag = `npc_action:${actionId}`;
      if (!state.storyFlags.includes(actionFlag)) state.storyFlags.push(actionFlag);
    }
  }

  private npcAtLocation(state: GameState, locationId: string | null) {
    if (!locationId) return undefined;
    return demoBootstrap.npcs.find(
      (candidate) => state.npcStates[candidate.id]?.currentLocationId === locationId
    );
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

  private remember(
    state: GameState,
    npcId: string,
    memory: {
      kind: MemoryKind;
      summary: string;
      interpretation: string;
      sourceEventId: string;
      confidence: "certain" | "interpreted" | "uncertain";
      importance?: number;
      tags?: string[];
    }
  ) {
    const npcState = state.npcStates[npcId];
    if (!npcState) return;
    const memorySequence = state.eventLog.length + npcState.memories.length;
    npcState.memories.push({
      id: `memory_${npcId}_${String(memorySequence).padStart(4, "0")}`,
      npcId,
      createdDay: state.day,
      importance: memory.importance ?? 5,
      tags: memory.tags ?? [],
      ...memory
    });
    if (npcState.memories.length > 80) npcState.memories.shift();
  }

  private appendEvent(
    state: GameState,
    event: Omit<GameEvent, "id" | "sequence" | "day" | "period">
  ) {
    const sequence = (state.eventLog.at(-1)?.sequence ?? -1) + 1;
    const recordedEvent: GameEvent = {
      id: `event_${String(sequence).padStart(4, "0")}`,
      sequence,
      day: state.day,
      period: state.period,
      ...event
    };
    state.eventLog.push(recordedEvent);
    return recordedEvent;
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
