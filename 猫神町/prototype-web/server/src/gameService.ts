import {
  GameActionResponseSchema, GameStateSchema, DialogueResultSchema, demoBootstrap, heartCatalog, legacyHeartKinds,
  HeartDirectorResultSchema, HeartObservationSchema,
  narrationSentences, separateDialogueText, dialoguePlaybackFinished,
  type GameActionResponse, type GameState, type GameEvent, type DialogueOption, type InteractionMode, type RuleSlotId,
  type DialogueResult, type HeartPreview, type HeartOptions, type HeartDirectorResult, type HeartObservation
} from "../../packages/shared/src/index.ts";
import { availableActions, characters, evidence, facts, initialLocations, locationAliases } from "./caseData.ts";
import { CaseDialogueProvider, DialogueGenerationError, fallbackDialogue, type CaseProvider, type PlanIntent } from "./caseProvider.ts";
import { encounterPacing } from "./dialoguePacing.ts";
import { MemoryGameStore, type GameStore } from "./persistence.ts";
import type { HeartContext } from "./heartDialogue.ts";
import { randomUUID } from "node:crypto";
import { validMeetingPlan, gameTimeLabel } from "./actionPlans.ts";
import { heartCapabilities, validHeartConsequence, validConsequenceBeats } from "./heartConsequences.ts";
import { buildHeartDirectorInput, offlineHeartRecommendations, unavailableHeartDirector, validateHeartRecommendations } from "./heartDirector.ts";
import { ARCHIVE_AGENT_VERSION, mergeArchivePatch } from "./archiveAgent.ts";

import { ruleContext, validRuleReactions } from "./ruleReactions.ts";

export class GameRuleError extends Error { constructor(message: string) { super(message); this.name = "GameRuleError"; } }
export function createInitialState(): GameState {
  return GameStateSchema.parse({
    saveVersion: 3, chapterId: "sunset-case-v1", revision: 0, day: 1, period: "morning", phase: "action",
    dayStartMinute: 540, nightStartMinute: 1080, currentMinute: 540, conversationDurationMinutes: 120,
    currentLocationId: null, activeNpcId: null, interactionMode: null, currentDialogue: null,
    lastPlayerChoice: null, giftItemId: null, activeRules: { faith: null, beauty: null },
    itemOwners: Object.fromEntries(demoBootstrap.items.map(i => [i.id, i.initialOwnerId])),
    discoveredLocationIds: initialLocations, evidenceJournal: [], playerKnownFactIds: ["F01"], dialogueBeatIndex: 0,
    npcStates: Object.fromEntries(demoBootstrap.npcs.map(n => [n.id, {
      npcId: n.id, currentLocationId: n.initialLocationId, relationship: 0, lifeState: "alive",
      knownFactIds: characters[n.id].known, memories: [], reflection: "尚未与朝雾遥相处。",
      openLoops: [characters[n.id].goal]
    }])),
    storyFlags: [], ruleChangedThisNight: false, claimedRewardIds: [], eventLog: [], ending: null
  });
}
const LISTEN_PREVIEW_KEY = "__listen__";
type HeartOptionBatch = {
  revision: number;
  snapshot: GameState;
  observation: HeartObservation;
  entries: Map<string, "pending" | "ready" | "failed">;
};
export class GameService {
  private state: GameState;
  private heartBusy = false;
  // Unplayed candidates never enter the save, memories or public game projection.
  private heartPreviews = new Map<string, { preview: HeartPreview; result: DialogueResult; nodeId: string }>();
  private heartOptionBatch: HeartOptionBatch | null = null;
  private heartPreviewJobs = new Map<string, Promise<HeartPreview>>();
  private heartDirectors = new Map<string, Promise<HeartDirectorResult>>();
  private heartObservations = new Map<string, HeartObservation>();
  constructor(private store: GameStore, private provider: CaseProvider = new CaseDialogueProvider(), private options: { heartTestPack?: boolean; preloadHeartOptions?: boolean } = {}) {
    const saved = store.load();
    this.state = saved ? GameStateSchema.parse(saved) : createInitialState();
    // Additive migration: preserve old progress while reconstructing only facts
    // that are certainly player-visible from the opening premise or read evidence.
    const knowledgeBefore = this.state.playerKnownFactIds.length;
    this.learnPlayerFacts(["F01", ...this.state.evidenceJournal.flatMap(entry => evidence[entry.id]?.facts ?? [])]);
    // Older saves entered encounter just by clicking a person. Keep that selection,
    // but unlock it when no mode/dialogue/gift has actually been chosen. Historical
    // events and completed appointments are not rewritten retroactively.
    const unlockedSelection = !!saved && this.state.phase === "encounter" && !this.state.interactionMode &&
      !this.state.currentDialogue && !this.state.giftItemId;
    if (unlockedSelection) this.state.phase = "location";
    if (!saved) {
      this.event("game_started", "player", null, "受托代管神社七天，整理真昼的遗物。");
    }
    const granted = this.options.heartTestPack && this.seedHeartTestPack();
    if (!saved || granted || unlockedSelection || this.state.playerKnownFactIds.length !== knowledgeBefore) {
      if (saved) this.state.revision++;
      this.store.save(GameStateSchema.parse(this.state));
    }
    if (this.options.preloadHeartOptions) this.preloadHeartOptions();
  }
  // HTTP only gets this projection. Plans and other people's private knowledge never leave the server.
  getState(): GameState {
    const s = structuredClone(this.heartBusy ? this.store.load() ?? this.state : this.state);
    s.eventLog = s.eventLog.filter(e => e.audience.includes("player"));
    s.storyFlags = s.storyFlags.filter(f => ["chiyo_retracted", "case_reopened", "witness_attack_seen"].includes(f));
    for (const n of Object.values(s.npcStates)) {
      n.knownFactIds = [];
      n.memories = n.memories.filter(m => s.eventLog.some(e => e.id === m.sourceEventId));
      n.openLoops = []; n.reflection = "只显示你实际参与的见闻。";
      if (s.phase !== "ending" && n.currentLocationId !== s.currentLocationId &&
          !s.eventLog.some(e => e.type === "incident" && /死亡|受伤/.test(e.details.text))) n.lifeState = "alive";
      if (n.currentLocationId !== s.currentLocationId) n.currentLocationId = "unknown";
      if (n.actionPlan && !s.eventLog.some(e => e.id === n.actionPlan!.sourceEventId)) n.actionPlan = null;
      else if (n.actionPlan && n.currentLocationId === "unknown" && ["waiting", "cancelled"].includes(n.actionPlan.status)) n.actionPlan.status = "planned";
    }
    for (const [id, owner] of Object.entries(s.itemOwners)) {
      if (owner !== "player" && !s.evidenceJournal.some(e => e.id === id) &&
          owner !== s.currentLocationId && !owner.startsWith("rule:")) s.itemOwners[id] = "unknown";
    }
    if (s.currentDialogue) s.currentDialogue.debug = {
      provider: s.currentDialogue.debug.provider, decision: "角色对白", usedFacts: [], disclosedFacts: [], disclosures: [],
      promptVersion: s.currentDialogue.debug.promptVersion
    };
    if (s.incident && s.phase !== "incident" && (s.incident.stage !== "resolved" || !s.eventLog.some(e => e.type === "incident" && e.details.text === s.incident?.resolvedText))) s.incident = null;
    else if (s.incident) { s.incident.intent = "approach"; s.incident.nextAt = 0; s.incident.interruptedUntil = null; }
    s.pendingNpcMove = null;
    return GameStateSchema.parse(s);
  }
  reset() { this.heartDirectors.clear(); this.heartObservations.clear(); this.state = createInitialState(); this.event("game_started", "player", null, "开始新的七日调查。旧章节数据库保留。"); if (this.options.heartTestPack) this.seedHeartTestPack(); return this.finish("新案件已重新开始。"); }
  private seedHeartTestPack(): boolean {
    const rewardId = "heart_test_pack_v1";
    if (this.state.phase === "ending" || this.state.claimedRewardIds.includes(rewardId)) return false;
    const e = this.event("heart_test_pack", "system", "player", "测试补给：恐惧、同情、爱意各 3 张。每个存档仅发放一次。");
    for (const kind of legacyHeartKinds) for (let i = 0; i < 3; i++) {
      this.state.heartCards.push({ id: `${rewardId}_${kind}_${i}`, kind, sourceType: "test",
        sourceNpcId: "system_test", sourceEventId: e.id, sourceText: "测试用初始心绪牌，不来自人物，也不代表已发生的剧情。",
        day: this.state.day, locationId: null });
    }
    this.state.claimedRewardIds.push(rewardId);
    return true;
  }
  private finish(notice: string | null = null, acquiredItemId: string | null = null, playbackOnly = false): GameActionResponse {
    if (!playbackOnly) this.clearHeartOptions();
    this.state.revision++;
    this.state = GameStateSchema.parse(this.state);
    this.store.save(this.state);
    // Reading a fixed beat changes the public revision, not the prepared branch.
    // Every other gameplay action invalidates that branch before starting another.
    if (this.heartOptionBatch) {
      this.heartOptionBatch.revision = this.state.revision;
      for (const cached of this.heartPreviews.values()) cached.preview.revision = this.state.revision;
      if (dialoguePlaybackFinished(this.state) && !this.matchesPreparedChoice(this.heartOptionBatch)) this.clearHeartOptions();
    }
    if (this.options.preloadHeartOptions) this.preloadHeartOptions();
    return GameActionResponseSchema.parse({ state: this.getState(), notice, acquiredItemId });
  }
  private clearHeartOptions() {
    this.heartPreviews.clear();
    this.heartOptionBatch = null;
  }
  private saveAuxiliary(notice: string | null = null): GameActionResponse {
    // Read-model helpers such as the archive must not consume a gameplay
    // revision or invalidate an already generated heart preview.
    this.state = GameStateSchema.parse(this.state);
    this.store.save(this.state);
    return GameActionResponseSchema.parse({ state: this.getState(), notice, acquiredItemId: null });
  }
  private assert(ok: unknown, text: string): asserts ok { if (!ok) throw new GameRuleError(text); }
  private flag(id: string) { if (!this.state.storyFlags.includes(id)) this.state.storyFlags.push(id); }
  private event(type: GameEvent["type"], actorId: string | null, targetId: string | null, text: string, audience = ["player"], itemId: string | null = null, locationId = this.state.currentLocationId) {
    const e: GameEvent = { id: "event_" + this.state.eventLog.length, sequence: this.state.eventLog.length, day: this.state.day,
      minute: this.state.currentMinute, period: this.state.period, type, actorId, targetId, itemId, locationId, details: { text }, audience };
    this.state.eventLog.push(e); return e;
  }
  private memory(npcId: string, text: string, event: GameEvent, kind: "observation" | "dialogue" | "gift" | "player_choice" | "rule_callback" = "observation") {
    const n = this.state.npcStates[npcId];
    n.memories.push({ id: "memory_" + event.id + "_" + npcId, npcId, kind, summary: text, interpretation: "实际参与的见闻，不等于事实已被证实。",
      sourceEventId: event.id, createdDay: this.state.day, confidence: "certain", importance: kind === "dialogue" ? 5 : 8, tags: [] });
    n.memories = n.memories.slice(-80);
  }
  private deliver(npcId: string, ids: string[], text: string, actor = "player") {
    const n = this.state.npcStates[npcId];
    for (const id of ids) if (!n.knownFactIds.includes(id)) n.knownFactIds.push(id);
    const e = this.event("information_delivered", actor, npcId, text, actor === "player" ? ["player", npcId] : [actor, npcId]);
    this.memory(npcId, text, e);
  }
  private learnPlayerFacts(ids: string[]) {
    for (const id of ids) if (facts[id] && !this.state.playerKnownFactIds.includes(id)) this.state.playerKnownFactIds.push(id);
  }
  private discover(text: string) {
    for (const [id, names] of Object.entries(locationAliases)) if (!this.state.discoveredLocationIds.includes(id) && names.some(n => text.includes(n))) {
      this.state.discoveredLocationIds.push(id);
      this.event("location_discovered", "player", null, "地图新增：" + demoBootstrap.locations.find(l => l.id === id)!.name, ["player"], null, id);
    }
  }
  private clearEncounter() { Object.assign(this.state, { activeNpcId: null, interactionMode: null, currentDialogue: null, lastPlayerChoice: null, giftItemId: null, dialogueBeatIndex: 0, dialogueNarrationIndex: null, heartSession: null }); }
  private abs() { return (this.state.day - 1) * 1440 + this.state.currentMinute; }
  private setAbs(t: number) {
    this.state.day = Math.min(7, Math.floor(t / 1440) + 1);
    this.state.currentMinute = t % 1440;
    this.state.period = this.state.currentMinute < 720 ? "morning" : this.state.currentMinute < 1020 ? "afternoon" : this.state.currentMinute < 1080 ? "evening" : "night";
  }
  private canTalk(npcId: string) {
    const n = this.state.npcStates[npcId];
    return n && n.lifeState === "alive" && n.currentLocationId === this.state.currentLocationId && n.unavailableUntil <= this.abs();
  }
  private advance(target: number, observer: string | null): boolean {
    // Browsing a person's interaction menu must never pin them in place. Any
    // actual time advance drops that tentative selection and runs their schedule.
    if (this.state.phase === "location" && !this.state.interactionMode && this.state.activeNpcId) this.clearEncounter();
    // Chronological stepping prevents a two-hour action from skipping a visible attack.
    while (true) {
      const incident = this.state.incident;
      const incidentTime = incident && incident.stage !== "resolved" ? incident.nextAt : Infinity;
      const moveTime = this.state.pendingNpcMove?.arriveAt ?? Infinity;
      const plannedNpc = Object.values(this.state.npcStates).filter(n => n.actionPlan && ["planned", "waiting"].includes(n.actionPlan.status) &&
        !(this.state.phase === "encounter" && this.state.activeNpcId === n.npcId))
        .sort((a, b) => this.planDue(a.npcId) - this.planDue(b.npcId))[0];
      const planTime = plannedNpc ? this.planDue(plannedNpc.npcId) : Infinity;
      const next = Math.min(incidentTime, moveTime, planTime);
      if (next > target) break;
      this.setAbs(next);
      if (planTime < incidentTime && planTime < moveTime) {
        this.executeMeetingPlan(plannedNpc!.npcId, observer); continue;
      }
      if (moveTime <= incidentTime) {
        const move = this.state.pendingNpcMove!;
        const n = this.state.npcStates[move.npcId];
        if (n.actionPlan && ["planned", "waiting"].includes(n.actionPlan.status)) {
          n.actionPlan.status = "cancelled"; this.planEvent(move.npcId, "案件行动取代了会面计划。", observer === n.currentLocationId ? ["player", move.npcId] : [move.npcId]);
        }
        if (n.lifeState === "alive") {
          n.currentLocationId = move.locationId;
          this.event("npc_moved", move.npcId, null, demoBootstrap.npcs.find(n => n.id === move.npcId)!.name + "抵达" + demoBootstrap.locations.find(l => l.id === move.locationId)!.name,
            observer === move.locationId ? ["player", move.npcId] : [move.npcId], null, move.locationId);
        }
        this.state.pendingNpcMove = null;
        continue;
      }
      if (!incident) break;
      const ritsu = this.state.npcStates.npc_ritsu, chiyo = this.state.npcStates.npc_chiyo;
      for (const n of [ritsu, chiyo]) if (n.actionPlan && ["planned", "waiting"].includes(n.actionPlan.status)) {
        n.actionPlan.status = "cancelled"; this.planEvent(n.npcId, "案件事件使会面计划取消。", observer === n.currentLocationId ? ["player", n.npcId] : [n.npcId]);
      }
      if (ritsu.lifeState !== "alive" || chiyo.lifeState !== "alive") { this.resolveIncident("会面没有继续。"); continue; }
      if (incident.stage === "scheduled") {
        ritsu.currentLocationId = "loc_inn";
        incident.stage = "contact"; incident.nextAt = next + 30;
        this.event("npc_moved", "npc_ritsu", "npc_chiyo", "律抵达白石旅馆，提出单独谈谈。", observer === "loc_inn" ? ["player","npc_ritsu","npc_chiyo"] : ["npc_ritsu","npc_chiyo"], null, "loc_inn");
      } else if (incident.stage === "contact") {
        if (incident.intent === "approach" || incident.intent === "withdraw" || this.otherWitnessPresent()) {
          this.resolveIncident("律说了几句话便离开，千代留在旅馆。"); continue;
        }
        incident.stage = "threat"; incident.nextAt = next + 30;
      } else if (incident.stage === "threat") {
        if (incident.intent !== "attack" || this.otherWitnessPresent()) {
          this.resolveIncident("律没能把千代单独留下，离开了旅馆。"); continue;
        }
        incident.stage = "attack"; incident.nextAt = next + 30;
      } else if (incident.stage === "attack") {
        if (this.otherWitnessPresent()) this.resolveIncident("犬饲诚赶到，制止了袭击。千代受伤但活着。", "injured");
        else this.resolveIncident("千代在旅馆死亡。现场留下争执和打斗的痕迹，尚没有正式的死亡调查结论。", "dead");
        continue;
      }
      if (observer === "loc_inn") {
        this.interrupt(target); return false;
      }
    }
    this.setAbs(target); return true;
  }
  private planDue(npcId: string): number {
    const n = this.state.npcStates[npcId], p = n.actionPlan!;
    if (n.lifeState !== "alive" || this.state.pendingNpcMove?.npcId === npcId ||
      this.state.incident && this.state.incident.stage !== "resolved" && ["npc_chiyo", "npc_ritsu"].includes(npcId)) return this.abs();
    return Math.max(this.abs(), p.status === "planned" ? p.arriveAt : p.waitUntil);
  }
  private planEvent(npcId: string, text: string, audience: string[]) {
    const e = this.event("action_plan_updated", npcId, "player", text, audience);
    e.details.planId = this.state.npcStates[npcId].actionPlan!.id;
    this.memory(npcId, text, e);
  }
  private executeMeetingPlan(npcId: string, observer: string | null) {
    const n = this.state.npcStates[npcId], p = n.actionPlan!;
    const name = demoBootstrap.npcs.find(npc => npc.id === npcId)!.name;
    const audience = observer === p.locationId ? ["player", npcId] : [npcId];
    if (n.lifeState !== "alive" || this.state.pendingNpcMove?.npcId === npcId ||
      this.state.incident && this.state.incident.stage !== "resolved" && ["npc_chiyo", "npc_ritsu"].includes(npcId)) {
      p.status = "cancelled"; this.planEvent(npcId, name + "因身体状态或案件行动取消了会面计划。", audience); return;
    }
    if (this.abs() >= p.waitUntil) {
      p.status = "expired"; this.planEvent(npcId, name + "与遥的约定等候时间已过；不再专门等待，尚未安排新的去向。", audience); return;
    }
    n.currentLocationId = p.locationId; p.status = "waiting";
    const location = demoBootstrap.locations.find(l => l.id === p.locationId)!.name;
    const e = this.event("npc_moved", npcId, "player", name + "按约抵达" + location + "，等待遥至" + gameTimeLabel(p.waitUntil) + "。", audience, null, p.locationId);
    this.memory(npcId, e.details.text, e);
  }
  private otherWitnessPresent() {
    return Object.values(this.state.npcStates).some(n => !["npc_ritsu","npc_chiyo"].includes(n.npcId) && n.lifeState === "alive" && n.currentLocationId === "loc_inn");
  }
  private interrupt(target: number) {
    this.clearEncounter(); this.state.currentLocationId = "loc_inn"; this.state.phase = "incident";
    this.state.incident!.interruptedUntil = target;
    if (this.state.incident!.stage === "attack") this.flag("witness_attack_seen");
    this.event("incident", "player", null, this.incidentDescription(), ["player"], null, "loc_inn");
  }
  private incidentDescription() {
    const stage = this.state.incident?.stage;
    return stage === "contact" ? "律站在旅馆柜台前：千代，我们单独聊聊。千代没把手里的纸放下。" :
      stage === "threat" ? "律压低声音让千代别交出说明，伸手挡住她离开柜台的路。" :
      "你撞见律抓住千代，把她推向柜台。千代站不稳，抓住了桌沿。";
  }
  private resolveIncident(text: string, health: "alive" | "injured" | "dead" = "alive") {
    const i = this.state.incident!;
    i.stage = "resolved"; i.resolvedText = text; i.nextAt = 999999;
    this.state.npcStates.npc_chiyo.lifeState = health;
    this.state.npcStates.npc_ritsu.currentLocationId = "loc_arcade";
    this.event("incident", "npc_ritsu", "npc_chiyo", text, this.state.currentLocationId === "loc_inn" ? ["player","npc_chiyo","npc_ritsu"] : ["npc_ritsu","npc_chiyo"], null, "loc_inn");
    // Nothing is auto-dropped or fabricated after death.
  }
  travel(locationId: string) {
    this.assert(this.state.phase === "action", "请先离开当前场景或结束会面。");
    this.assert(this.state.discoveredLocationIds.includes(locationId), "你还不知道这个地点。");
    const location = demoBootstrap.locations.find(l => l.id === locationId)!;
    this.assert(this.state.currentMinute + location.travelMinutes <= 1080, "今天已经没有移动时间。");
    const target = this.abs() + location.travelMinutes;
    this.state.currentLocationId = null;
    this.advance(target, null);
    this.state.currentLocationId = locationId; this.state.phase = "location";
    this.event("travel", "player", null, "抵达" + location.name);
    const incident = this.state.incident;
    if (locationId === "loc_inn" && incident) {
      if (["contact","threat","attack"].includes(incident.stage)) this.interrupt(target);
      if (incident.stage === "resolved") this.event("incident", "player", null, incident.resolvedText);
    }
    return this.finish(this.getState().phase === "incident" ? this.incidentDescription() : "已抵达。点击人物查看互动，选择拾绪或送礼才开始会面。");
  }
  startEncounter(npcId?: string) {
    this.assert(this.state.phase === "location", "请先进入场景。");
    const present = demoBootstrap.npcs.filter(n => this.canTalk(n.id));
    const target = npcId ?? (present.length === 1 ? present[0].id : "");
    this.assert(target && this.canTalk(target), "请选择在场且能交谈的人物。");
    this.clearEncounter();
    this.state.activeNpcId = target;
    return this.finish("尚未开始对白，可以换人、收起选择或离开。选择拾绪或送礼后才锁定会面。");
  }
  private beginEncounter(mode: InteractionMode) {
    this.assert((this.state.phase === "location" || this.state.phase === "encounter") && !this.state.interactionMode && this.state.activeNpcId,
      "请先选择在场人物；当前互动尚未结束时不能另开对白。");
    const target = this.state.activeNpcId;
    this.assert(this.canTalk(target), "人物目前无法交谈。");
    this.state.phase = "encounter"; this.state.interactionMode = mode;
    const meeting = this.state.npcStates[target].actionPlan;
    if (meeting?.status === "waiting" && meeting.locationId === this.state.currentLocationId && this.abs() < meeting.waitUntil) {
      meeting.status = "completed";
      this.planEvent(target, "遥按约与" + demoBootstrap.npcs.find(n => n.id === target)!.name + "见面，约定已完成。", ["player", target]);
    }
    this.event("encounter_started", "player", target, "开始与" + demoBootstrap.npcs.find(n => n.id === target)!.name + "会面。", ["player", target]);
  }
  leaveLocation() {
    this.assert(this.state.phase === "location", "当前不能直接离开。");
    this.clearEncounter();
    this.event("location_left", "player", null, "离开场景。");
    this.state.currentLocationId = null; this.state.phase = this.state.currentMinute >= 1080 ? "night" : "action";
    return this.finish();
  }
  waitUntilNight() {
    this.assert(["action","location"].includes(this.state.phase), "请先结束会面或处理眼前事件。");
    this.clearEncounter();
    const target = (this.state.day - 1) * 1440 + 1080;
    if (!this.advance(target, this.state.currentLocationId)) return this.finish(this.incidentDescription());
    this.state.phase = "night"; this.state.currentLocationId = null;
    this.event("wait_until_night", "player", null, "整理见闻，等待入夜。"); return this.finish();
  }
  wait(minutes = 30) {
    this.assert(this.state.phase === "location" || this.state.phase === "action", "请先处理眼前会面。");
    this.assert(Number.isInteger(minutes) && minutes > 0 && minutes <= 120 && this.state.currentMinute + minutes <= 1080, "等待时间无效。");
    this.clearEncounter();
    if (!this.advance(this.abs() + minutes, this.state.currentLocationId)) return this.finish(this.incidentDescription());
    return this.finish("时间过去了" + minutes + "分钟。");
  }
  async selectInteractionMode(mode: InteractionMode) {
    // Ordinary dialogue remains for legacy saves/internal scenario fixtures. The
    // public HTTP talk alias now starts the same heart flow as the 拾绪 button.
    this.assert((this.state.phase === "location" || this.state.phase === "encounter") && this.state.activeNpcId && !this.state.interactionMode, "请先选择人物，或结束已经选择的会面方式。");
    this.assert(this.canTalk(this.state.activeNpcId!), "人物目前无法交谈。");
    this.assert(this.state.currentMinute + 120 <= 1080, "今天剩余时间不足两小时。");
    this.beginEncounter(mode);
    if (mode === "gift") return this.finish("选择礼物，确认前不计时。");
    if (!this.advance(this.abs() + 120, this.state.currentLocationId)) return this.finish(this.incidentDescription());
    await this.generate(null, ""); return this.finish();
  }
  cancelInteractionMode() {
    this.assert(this.state.phase === "encounter" && this.state.interactionMode === "gift" && !this.state.giftItemId, "礼物已经送出，不能撤销。");
    this.event("encounter_completed", "player", this.state.activeNpcId, "取消尚未交出的礼物，返回互动选择。未计时、未赠送、未发生对白。", ["player", this.state.activeNpcId!]);
    this.state.interactionMode = null; this.state.phase = "location";
    return this.finish("已取消送礼，当前不再锁定人物。可以换人、离开或重新选择互动。");
  }
  async confirmGift(itemId: string) {
    this.assert(this.state.phase === "encounter" && this.state.interactionMode === "gift" && !this.state.giftItemId, "请先选择赠礼。");
    this.assert(this.state.itemOwners[itemId] === "player", "你没有这件物品。");
    this.assert(this.canTalk(this.state.activeNpcId!), "对方目前无法收礼。");
    this.assert(this.state.currentMinute + 120 <= 1080, "今天剩余时间不足。");
    if (!this.advance(this.abs() + 120, this.state.currentLocationId)) return this.finish(this.incidentDescription());
    const npcId = this.state.activeNpcId!;
    this.transfer(itemId, npcId); this.state.giftItemId = itemId;
    this.state.npcStates[npcId].relationship = Math.min(5, this.state.npcStates[npcId].relationship + 1);
    if (evidence[itemId]) this.deliver(npcId, evidence[itemId].facts, "遥交给我" + this.itemName(itemId) + "：" + evidence[itemId].text);
    await this.maybePlan(); await this.generate(null, "");
    return this.finish("已赠送" + this.itemName(itemId) + "，物品离开背包。");
  }
  private itemName(id: string) { return demoBootstrap.items.find(i => i.id === id)?.baseName ?? id; }
  private heartChoiceObservation(): HeartObservation {
    const s = this.getState();
    this.assert(s.phase === "encounter" && s.heartSession && s.currentDialogue?.heart?.canContinue &&
      s.currentDialogue.heart.choicePoint && dialoguePlaybackFinished(s), "请在已看完对白的心绪选择处查看推荐。");
    const authority = this.heartBusy ? this.store.load() ?? this.state : this.state;
    const input = buildHeartDirectorInput(s, heartCapabilities(authority, s.activeNpcId!));
    let observation = this.heartObservations.get(input.nodeId);
    if (!observation) {
      // A projected observation stays private until the real playback reaches it.
      observation = this.heartOptionBatch?.observation.nodeId === input.nodeId && this.matchesPreparedChoice(this.heartOptionBatch)
        ? this.heartOptionBatch.observation
        : { nodeId: input.nodeId, npcName: input.npc.name, input, director: null, attempts: [], selected: null, actualEvents: [] };
      observation.input = input;
      this.heartObservations.set(input.nodeId, observation);
      // This is a session observation buffer, not another world-state authority.
      if (this.heartObservations.size > 30) {
        const oldest = this.heartObservations.keys().next().value!;
        this.heartObservations.delete(oldest); this.heartDirectors.delete(oldest);
      }
    }
    return observation;
  }
  async recommendHearts(revision: number): Promise<HeartDirectorResult> {
    this.assert(revision === this.getState().revision, "进度已变化，本次推荐不再适用。");
    const observation = this.heartChoiceObservation(), input = observation.input!;
    let pending = this.heartDirectors.get(input.nodeId);
    if (!pending) {
      pending = (async () => {
        try {
          const result = HeartDirectorResultSchema.parse(this.provider.directHearts
            ? await this.provider.directHearts(structuredClone(input))
            : this.provider.getStatus().configured ? unavailableHeartDirector(input) : offlineHeartRecommendations(input));
          this.assert(result.nodeId === input.nodeId && result.revision === input.revision, "导演返回了其他节点的建议。");
          if (result.status !== "unavailable") validateHeartRecommendations(result, input);
          else result.recommendations = [];
          observation.director = result;
        } catch { observation.director = unavailableHeartDirector(input); }
        return observation.director!;
      })();
      this.heartDirectors.set(input.nodeId, pending);
    }
    const result = await pending;
    this.assert(this.getState().revision === revision && this.heartObservations.get(input.nodeId) === observation,
      "进度已变化，旧推荐已丢弃。");
    return structuredClone({ ...result, revision });
  }
  getHeartObservations(): HeartObservation[] {
    const state = this.getState();
    const observations = structuredClone([...this.heartObservations.values()]);
    const spends = state.eventLog.filter(e => e.type === "heart_spent").slice(-30);
    for (const spend of spends) {
      const nodeId = spend.details.nodeId ?? "recovered:" + spend.id;
      let o = observations.find(o => o.nodeId === nodeId);
      if (!o) {
        o = { nodeId, npcName: demoBootstrap.npcs.find(n => n.id === spend.targetId)?.name ?? "对方", input: null,
          director: null, attempts: [], selected: spend.details.text, actualEvents: [] };
        observations.push(o);
      }
      const applied = state.eventLog.find(e => e.type === "heart_consequence" && e.details.spendEventId === spend.id);
      const kind = spend.details.kind;
      let attempt = o.attempts.find(a => a.cardId === spend.details.cardId);
      if (!attempt && kind && Object.hasOwn(heartCatalog, kind)) {
        attempt = { cardId: spend.details.cardId, kind: kind as keyof typeof heartCatalog, line: null,
          status: "waiting_playback", detail: "出牌已确认；等待对方的决定播放。" };
        o.attempts.push(attempt);
      }
      const noConsequence = spend.details.consequence === "none";
      if (attempt) {
        attempt.status = applied ? "applied" : noConsequence ? "continued" : "waiting_playback";
        attempt.detail = applied?.details.text ?? (noConsequence ? "已确认并扣牌；本段没有独立事件后果，对话已向下一焦点推进。" : "已确认并扣牌，对方的决定尚未播放，后果未执行。");
      }
      o.selected = spend.details.text;
      o.actualEvents = [spend, ...(applied ? [applied] : [])].map(e => ({ id: e.id, text: e.details.text }));
    }
    for (const o of observations) for (const a of o.attempts) if (a.status === "validated" &&
      (this.heartPreviews.get(a.cardId)?.nodeId !== o.nodeId || this.heartPreviews.get(a.cardId)?.preview.revision !== state.revision)) {
      a.status = "expired"; a.detail = "该候选未被确认，已失效；没有消耗卡牌或改变剧情。";
    }
    const sequences = new Map(state.eventLog.map(e => [e.id, e.sequence]));
    const lastPlayed = state.eventLog.slice().reverse().find(e => ["dialogue_generated", "narration_generated"].includes(e.type) && e.targetId === state.activeNpcId);
    const currentNodeId = state.heartSession && state.currentDialogue?.heart?.choicePoint && dialoguePlaybackFinished(state)
      ? `${state.heartSession.id}:${lastPlayed?.id ?? "opening"}` : null;
    const order = (o: HeartObservation) => o.nodeId === currentNodeId ? Number.MAX_SAFE_INTEGER : Math.max(sequences.get(o.input?.played.at(-1)?.eventId ?? "") ?? -1,
      ...o.actualEvents.map(e => sequences.get(e.id) ?? -1));
    return HeartObservationSchema.array().parse(observations.sort((a, b) => order(b) - order(a)).slice(0, 30));
  }
  async syncInvestigationArchive(revision: number) {
    this.assert(revision === this.state.revision, "进度已变化，请重新整理档案。");
    this.assert(this.provider.summarizeArchive, "当前服务尚未接入档案官AI。");
    const snapshot = structuredClone(this.state);
    const result = await this.provider.summarizeArchive(snapshot);
    this.assert(revision === this.state.revision, "整理期间进度已变化，本次结果已丢弃。");
    if (!result) {
      this.state.investigationArchive.status = "unavailable";
      this.state.investigationArchive.promptVersion = ARCHIVE_AGENT_VERSION;
      return this.saveAuxiliary("档案官AI暂时不可用，未改动已有档案，之后可重试。");
    }
    mergeArchivePatch(this.state, result.patch, result.batch);
    return this.saveAuxiliary(result.batch.input.events.length ? "档案官已整理最新见闻。" : "当前没有待整理的新见闻。");
  }
  private assertHeartRevision(revision: number | undefined) {
    this.assert(!this.heartBusy, "这次心绪还在生成，请稍候。");
    this.assert(revision === this.state.revision, "进度已变化，请刷新后继续；不会重复消耗或拾取。");
  }
  private async heartTurn(work: () => Promise<void>) {
    const before = structuredClone(this.state);
    this.heartBusy = true;
    try {
      await work();
      this.heartBusy = false;
      return this.finish();
    } catch (error) {
      this.state = before;
      throw new GameRuleError(error instanceof DialogueGenerationError
        ? `${error.message}卡牌、时间和进度已保留，可以重试。`
        : error instanceof GameRuleError ? error.message : "心绪对白暂时不可用。卡牌与进度已保留，请重试。");
    } finally { this.heartBusy = false; }
  }
  async startHeartEncounter(revision: number) {
    this.assertHeartRevision(revision);
    this.assert((this.state.phase === "location" || this.state.phase === "encounter") && !this.state.interactionMode && this.state.activeNpcId, "请从人物的新会面进入拾绪。");
    this.assert(this.canTalk(this.state.activeNpcId) && this.state.currentMinute + 120 <= 1080, "当前无法开始两小时交谈。");
    return this.heartTurn(async () => {
      this.beginEncounter("talk");
      if (!this.advance(this.abs() + 120, this.state.currentLocationId)) return;
      this.state.heartSession = { id: "hearts_" + randomUUID(), claimedKinds: [] };
      await this.generateHeartDialogue("opening");
    });
  }
  private matchesPreparedChoice(batch: HeartOptionBatch) {
    // Auxiliary archive updates do not change dialogue eligibility. Everything
    // else must match the projection before any candidate becomes selectable.
    const signature = (state: GameState) => JSON.stringify({ ...state, revision: 0, investigationArchive: null });
    return signature(this.state) === signature(batch.snapshot);
  }
  private projectHeartChoiceState(): GameState {
    if (dialoguePlaybackFinished(this.state)) return structuredClone(this.state);
    const store = new MemoryGameStore();
    store.save(this.state);
    // A separate authority reuses the actual playback rules without touching
    // the player's world, store, observations or provider. It never preloads.
    const projection = new GameService(store, this.provider);
    while (!dialoguePlaybackFinished(projection.state)) projection.advanceDialoguePlayback();
    projection.applyDialogueAction();
    // Normalize new events/cards/plans just as finish() does on real playback.
    return GameStateSchema.parse(projection.state);
  }
  private startHeartOptionBatch(snapshot: GameState, observation?: HeartObservation) {
    const input = buildHeartDirectorInput(snapshot, heartCapabilities(snapshot, snapshot.activeNpcId!));
    const uniqueCards = [...new Map(snapshot.heartCards.map(card => [card.kind, card])).values()];
    const batch: HeartOptionBatch = {
      revision: this.state.revision, snapshot,
      observation: observation ?? { nodeId: input.nodeId, npcName: input.npc.name, input, director: null, attempts: [], selected: null, actualEvents: [] },
      entries: new Map([LISTEN_PREVIEW_KEY, ...uniqueCards.map(card => card.id)].map(key => [key, "pending" as const]))
    };
    this.heartOptionBatch = batch;
    this.runHeartOptionBatch(batch);
    return batch;
  }
  private preloadHeartOptions() {
    if (this.heartOptionBatch || this.state.phase !== "encounter" || !this.state.heartSession ||
      !this.state.currentDialogue?.heart?.canContinue || !this.state.currentDialogue.heart.choicePoint) return;
    try {
      this.startHeartOptionBatch(this.projectHeartChoiceState(), dialoguePlaybackFinished(this.state) ? this.heartChoiceObservation() : undefined);
    } catch {
      // A projection failure must never roll back a committed beat. At the real
      // choice, preparation can still use the actual state via the normal API.
      this.clearHeartOptions();
    }
  }
  prepareHeartOptions(revision: number, retryFailed = false): HeartOptions {
    this.assertHeartRevision(revision);
    // The endpoint remains closed while the player is reading; preloading is a
    // server lifecycle task, not permission to reveal future options or facts.
    const observation = this.heartChoiceObservation();
    if (this.heartOptionBatch && !this.matchesPreparedChoice(this.heartOptionBatch)) this.clearHeartOptions();
    const batch = this.heartOptionBatch ?? this.startHeartOptionBatch(structuredClone(this.state), observation);
    if (retryFailed && ![...batch.entries.values()].includes("pending")) {
      for (const [key, status] of batch.entries) if (status === "failed") batch.entries.set(key, "pending");
      this.runHeartOptionBatch(batch);
    }
    const pending = [...batch.entries.values()].filter(status => status === "pending").length;
    const options: HeartOptions["options"] = [];
    for (const [key, status] of batch.entries) {
      const cached = this.heartPreviews.get(key);
      if (status === "ready" && cached?.preview.revision === revision) options.push({ ...cached.preview, cardId: key === LISTEN_PREVIEW_KEY ? null : key });
    }
    return structuredClone({ revision, pending, complete: pending === 0, options });
  }
  private runHeartOptionBatch(batch: HeartOptionBatch) {
    const queue = [...batch.entries].filter(([, status]) => status === "pending").map(([key]) => key);
    const current = () => this.heartOptionBatch === batch;
    const worker = async () => {
      while (queue.length && current()) {
        const key = queue.shift()!;
        try {
          await this.generateHeartPreview(key === LISTEN_PREVIEW_KEY ? null : key, batch.snapshot, batch.observation, batch);
          if (current()) batch.entries.set(key, "ready");
        } catch { if (current()) batch.entries.set(key, "failed"); }
      }
    };
    // Background work touches only candidate caches, never the world/store.
    void worker(); void worker();
  }
  async previewHeart(cardId: string, revision: number): Promise<HeartPreview> {
    this.assertHeartRevision(revision);
    this.assert(this.state.phase === "encounter" && this.state.heartSession && this.state.currentDialogue?.heart?.choicePoint && dialoguePlaybackFinished(this.state), "请在看完对白后的心绪选择处预览。");
    const observation = this.heartChoiceObservation();
    this.heartBusy = true;
    try {
      const batch = this.heartOptionBatch;
      return await this.generateHeartPreview(cardId, batch?.snapshot ?? structuredClone(this.state), observation, batch ?? undefined);
    }
    finally { this.heartBusy = false; }
  }
  private generateHeartPreview(cardId: string | null, snapshot: GameState, observation: HeartObservation, batch?: HeartOptionBatch): Promise<HeartPreview> {
    const revision = snapshot.revision, key = cardId ?? LISTEN_PREVIEW_KEY;
    const cached = this.heartPreviews.get(key);
    if (cached?.preview.revision === this.state.revision && cached.nodeId === observation.nodeId) return Promise.resolve(structuredClone(cached.preview));
    const jobKey = `${observation.nodeId}:${revision}:${key}`;
    const existing = this.heartPreviewJobs.get(jobKey);
    if (existing) return existing.then(preview => structuredClone(preview));
    const card = cardId === null ? null : snapshot.heartCards.find(c => c.id === cardId);
    this.assert(cardId === null || card, "这张心绪牌已经用过或不在手中。");
    const attempt: HeartObservation["attempts"][number] | null = card ? { cardId: card.id, kind: card.kind, line: null,
      status: "candidate", detail: "正在提前准备回应；尚未选牌，也未改变剧情。" } : null;
    if (attempt) observation.attempts = [...observation.attempts.filter(a => a.cardId !== cardId), attempt];
    const job = (async () => {
      try {
        const candidateState = structuredClone(snapshot), sequence = candidateState.eventLog.length;
        candidateState.eventLog.push({ id: "event_" + sequence, sequence, day: candidateState.day,
          minute: candidateState.currentMinute, period: candidateState.period, type: "dialogue_choice",
          actorId: "player", targetId: candidateState.activeNpcId, itemId: null, locationId: candidateState.currentLocationId,
          audience: ["player", candidateState.activeNpcId!], details: { text: card ? "以「" + heartCatalog[card.kind].name + "」接话" : "顺着聊下去",
            intent: card ? heartCatalog[card.kind].expression : "交给遥自然回应，双方顺着当前情境交流", missed: "[]" } });
        const result = await this.prepareHeartDialogue(card ? card.kind : "listen", candidateState);
        this.assert((batch ? this.heartOptionBatch === batch : this.state.revision === revision && this.heartObservations.get(observation.nodeId) === observation) &&
          this.state.heartSession?.id === snapshot.heartSession?.id && this.state.activeNpcId === snapshot.activeNpcId, "进度已变化，旧回应已丢弃。");
        const first = separateDialogueText(result.line, result.stageDirection, "朝雾遥");
        result.line = first.line; result.stageDirection = first.stageDirection;
        const preview: HeartPreview = { id: randomUUID(), cardId: key, revision: this.state.revision, line: first.line,
          stageDirection: first.stageDirection, provider: result.debug.provider };
        this.heartPreviews.set(key, { preview, result, nodeId: observation.nodeId });
        if (attempt) { attempt.line = preview.line; attempt.status = "validated"; attempt.detail = "回应已准备好；确认后直接播放，实际后果仍随对应台词执行。"; }
        return structuredClone(preview);
      } catch (error) {
        if (attempt) { attempt.status = "rejected"; attempt.detail = error instanceof Error ? error.message : "候选暂不可用。"; }
        throw new GameRuleError((error instanceof GameRuleError || error instanceof DialogueGenerationError ? error.message : "这条回应暂不可用。") + "没有消耗心绪或推进剧情。");
      } finally { this.heartPreviewJobs.delete(jobKey); }
    })();
    this.heartPreviewJobs.set(jobKey, job);
    return job;
  }
  async useHeart(cardId: string | null, revision: number, previewId?: string) {
    this.assertHeartRevision(revision);
    const d = this.state.currentDialogue;
    this.assert(this.state.phase === "encounter" && this.state.heartSession && d?.heart?.canContinue, "当前不在可出牌的拾绪节点。");
    this.assert(dialoguePlaybackFinished(this.state), "请先看完这段对白。");
    this.assert(cardId === null || d.heart.choicePoint, "当前正在自然交谈，还没到需要选择心绪的时刻。");
    const card = cardId === null ? null : this.state.heartCards.find(c => c.id === cardId);
    this.assert(cardId === null || card, "这张心绪牌已经用过或不在手中。");
    const cached = this.heartPreviews.get(cardId ?? LISTEN_PREVIEW_KEY);
    this.assert(!previewId || ((cardId === null || card) && cached?.preview.id === previewId && cached.preview.revision === revision),
      "这句预览已失效，请重新选择心绪。没有消耗卡牌。");
    const observation = d.heart.choicePoint ? this.heartChoiceObservation() : null;
    const response = await this.heartTurn(async () => {
      const choice = this.event(card || d.heart!.choicePoint ? "dialogue_choice" : "dialogue_continued", "player", this.state.activeNpcId,
        card ? "以「" + heartCatalog[card.kind].name + "」接话" : "顺着聊下去", ["player", this.state.activeNpcId!]);
      choice.details.intent = card ? heartCatalog[card.kind].expression : "交给遥自然回应，双方顺着当前情境交流";
      choice.details.missed = "[]";
      if (observation) choice.details.nodeId = observation.nodeId;
      if (previewId && cached) this.installHeartDialogue(structuredClone(cached.result));
      else await this.generateHeartDialogue(card ? card.kind : "listen");
      // The first player expression (visible action or speech) commits with the spend.
      if (card) {
        this.state.heartCards = this.state.heartCards.filter(c => c.id !== card.id);
        const e = this.event("heart_spent", "player", this.state.activeNpcId, "使用了一张「" + heartCatalog[card.kind].name + "」。");
        e.details.cardId = card.id; e.details.kind = card.kind;
        e.details.consequence = this.state.currentDialogue!.heart!.consequence ? "pending" : "none";
        if (observation) e.details.nodeId = observation.nodeId;
        this.state.currentDialogue!.heart!.spendEventId = e.id;
      }
    });
    if (observation) observation.selected = card ? "使用「" + heartCatalog[card.kind].name + "」" : "未出牌，顺着聊下去";
    return response;
  }
  private async generateHeartDialogue(heartIntent: HeartContext["heartIntent"]) {
    this.installHeartDialogue(await this.prepareHeartDialogue(heartIntent));
  }
  private async prepareHeartDialogue(heartIntent: HeartContext["heartIntent"], state = this.state, selectedOption: DialogueOption | null = null): Promise<DialogueResult> {
    this.assert(this.provider.generateHearts, "当前对白服务尚未支持拾绪。");
    const result = DialogueResultSchema.parse(await this.provider.generateHearts({
      state: structuredClone(state), npcId: state.activeNpcId!, mode: "talk",
      selectedOption, giftItem: null, effect: "", heartIntent
    }));
    const beats = [result, ...result.continuations];
    const play = heartIntent !== "opening" && heartIntent !== "listen";
    const pacing = encounterPacing(state, false);
    this.assert(result.heart && !result.options.length && beats.length <= pacing.maxGeneratedLines &&
      (!pacing.mustClose || !result.heart.canContinue), "心绪对白结构不符合会面规则。");
    this.assert(beats.every(b => b.speakerId === "player" || b.speakerId === state.activeNpcId) &&
      (!play || result.speakerId === "player" && beats.some(b => b.speakerId === state.activeNpcId)) &&
      (heartIntent !== "opening" || result.speakerId === state.activeNpcId), "心绪对白的说话者不符合本次操作。");
    const point = result.heart.choicePoint, last = beats.at(-1)!;
    const plan = result.heart.actionPlan;
    const effect = result.heart.consequence;
    this.assert(!effect || (validHeartConsequence(effect, state, state.activeNpcId!, plan) &&
      validConsequenceBeats(effect, beats, state.activeNpcId!, result.heart.canContinue, plan)), "这次出牌的事件条件或来源无效，未消耗卡牌。");
    if (effect && ["material", "case_action"].includes(effect.type)) this.assert(!beats[effect.beatIndex].stageDirection?.trim(), "材料或案件行动应在决定台词播放时执行，不能提前展示。");
    // Model/provider output must never claim a transaction was already settled.
    result.heart.spendEventId = null; result.heart.consequenceApplied = false;
    if (plan) this.assert(beats[plan.beatIndex]?.speakerId === state.activeNpcId && beats[plan.beatIndex].line.includes(plan.quote) &&
      validMeetingPlan(plan, state, state.activeNpcId!), "会面计划的地点、时间或对白来源无效。");
    this.assert(!point || result.heart.canContinue && last.speakerId === state.activeNpcId && last.line.includes(point.quote), "心绪选择没有对应的末句对白。");
    this.assert(result.heart.canContinue === Boolean(point), "对白必须抵达下一次心绪选择，或自然结束本次会面。");
    this.assert(result.heart.canContinue || last.speakerId === state.activeNpcId, "告别应由对方完成。");
    for (const pickup of result.heart.pickups) {
      const b = beats[pickup.beatIndex];
      this.assert(b?.speakerId === state.activeNpcId && (b.line.includes(pickup.quote) || b.stageDirection?.includes(pickup.quote)), "拾绪没有对应的可见情绪。");
    }
    result.debug.npcActionId = "none";
    return result;
  }
  private installHeartDialogue(result: DialogueResult) {
    this.state.currentDialogue = result; this.state.lastPlayerChoice = null; this.state.dialogueBeatIndex = 0;
    this.beginVisibleBeat();
  }
  private transfer(id: string, owner: string) {
    const previous = this.state.itemOwners[id]; this.state.itemOwners[id] = owner;
    const e = this.event("item_transfer", previous, owner, this.itemName(id) + "从" + previous + "转交给" + owner, ["player", previous, owner], id);
    if (this.state.npcStates[owner]) this.memory(owner, e.details.text, e, "gift");
  }
  private async generate(selectedOption: DialogueOption | null, effect: string) {
    const npcId = this.state.activeNpcId!;
    const context = {
      state: structuredClone(this.state), npcId, mode: this.state.interactionMode!,
      selectedOption, giftItem: demoBootstrap.items.find(i => i.id === this.state.giftItemId) ?? null, effect
    };
    let result;
    try {
      result = await this.provider.generate(context);
    } catch (error) {
      // All action writes are local until finish(). Restore the committed snapshot, including
      // choice trail, gifts, clock, delivered information and plans, before reporting a retry.
      const committed = this.store.load();
      if (committed) this.state = GameStateSchema.parse(committed);
      if (error instanceof DialogueGenerationError) throw new GameRuleError(error.message);
      throw error;
    }
    const pacing = encounterPacing(this.state, !!selectedOption);
    if (1 + result.continuations.length > pacing.maxGeneratedLines || (pacing.mustClose && result.options.length)) {
      if (!pacing.mustClose) {
        const committed = this.store.load();
        if (committed) this.state = GameStateSchema.parse(committed);
        throw new GameRuleError(new DialogueGenerationError().message);
      }
      result = fallbackDialogue(context);
      result.debug.decision = "会面预算保底收尾";
    }
    this.state.currentDialogue = result;
    if (result.debug.npcActionId !== effect) result.debug.npcActionId = "none";
    this.state.lastPlayerChoice = selectedOption?.playerLine ?? selectedOption?.text ?? null;
    this.state.dialogueBeatIndex = 0;
    // Index includes the player's selected line: exactly the same UI component as any other beat.
    this.beginVisibleBeat();
  }
  private beats() {
    const d = this.state.currentDialogue;
    return d ? [...(this.state.lastPlayerChoice ? [{ speakerId: "player", line: this.state.lastPlayerChoice }] : []),
      { speakerId: d.speakerId, line: d.line, stageDirection: d.stageDirection },
      ...d.continuations.map(b => ({ ...b, speakerId: b.speakerId ?? d.speakerId }))].map(b => ({ ...b,
        ...separateDialogueText(b.line, b.stageDirection, b.speakerId === "player" ? "朝雾遥" : demoBootstrap.npcs.find(n => n.id === b.speakerId)?.name)
      })) : [];
  }
  private beginVisibleBeat() {
    this.state.dialogueNarrationIndex = narrationSentences(this.beats()[this.state.dialogueBeatIndex]?.stageDirection).length ? 0 : null;
    this.recordVisibleBeat();
  }
  private recordVisibleBeat() {
    const beat = this.beats()[this.state.dialogueBeatIndex];
    if (!beat) return;
    const npc = this.state.activeNpcId!;
    const narration = this.state.dialogueNarrationIndex !== null;
    const displayed = narration ? narrationSentences(beat.stageDirection)[this.state.dialogueNarrationIndex!] : beat.line;
    const text = narration ? displayed : (beat.speakerId === "player" ? "朝雾遥" : demoBootstrap.npcs.find(n => n.id === npc)!.name) + "：" + displayed;
    const e = this.event(narration ? "narration_generated" : "dialogue_generated", beat.speakerId, npc, text, ["player", npc]);
    e.details.kind = narration ? "narration" : "speech"; e.details.line = displayed;
    e.details.beatIndex = String(this.state.dialogueBeatIndex);
    this.memory(npc, text, e, narration ? "observation" : beat.speakerId === "player" ? "player_choice" : "dialogue");
    this.discover(text);
    const plan = this.state.currentDialogue?.heart?.actionPlan;
    if (!narration && plan && plan.beatIndex === this.state.dialogueBeatIndex && beat.speakerId === npc) {
      const old = this.state.npcStates[npc].actionPlan;
      if (old && ["planned", "waiting"].includes(old.status)) {
        old.status = "cancelled"; this.planEvent(npc, "新的约定替代了之前的会面计划。", ["player", npc]);
      }
      const { beatIndex: _beatIndex, ...proposal } = plan;
      this.state.npcStates[npc].actionPlan = { ...proposal, id: "plan_" + e.id, sourceEventId: e.id, status: "planned" };
      if (!this.state.discoveredLocationIds.includes(plan.locationId)) {
        this.state.discoveredLocationIds.push(plan.locationId);
        this.event("location_discovered", "player", null, "因会面约定发现" + demoBootstrap.locations.find(l => l.id === plan.locationId)!.name);
      }
      this.planEvent(npc, `约定：${gameTimeLabel(plan.arriveAt)}在${demoBootstrap.locations.find(l => l.id === plan.locationId)!.name}与遥会面，等到${gameTimeLabel(plan.waitUntil)}。`, ["player", npc]);
    }
    const session = this.state.heartSession;
    const pickup = this.state.currentDialogue?.heart?.pickups.find(p => p.beatIndex === this.state.dialogueBeatIndex);
    const observed = narration ? narrationSentences(beat.stageDirection).slice(0, this.state.dialogueNarrationIndex! + 1).join("") : beat.line;
    if (session && pickup && observed.includes(pickup.quote) && beat.speakerId === npc && !session.claimedKinds.includes(pickup.kind)) {
      session.claimedKinds.push(pickup.kind);
      const cardId = "heart_" + e.id;
      this.state.heartCards.push({ id: cardId, kind: pickup.kind, sourceNpcId: npc,
        sourceEventId: e.id, sourceText: pickup.quote, day: this.state.day, locationId: this.state.currentLocationId });
      const gathered = this.event("heart_gathered", npc, "player", "你拾得了一缕「" + heartCatalog[pickup.kind].name + "」。");
      gathered.details.cardId = cardId; gathered.details.kind = pickup.kind; gathered.details.sourceEventId = e.id;
    }
    if (!narration) {
      this.applyHeartConsequence(e.id);
      this.recordRuleReaction(e.id);
      const disclosures = this.state.currentDialogue?.debug.disclosures ?? [];
      this.learnPlayerFacts(disclosures.filter(x => x.beatIndex === this.state.dialogueBeatIndex).map(x => x.factId));
      // Ordinary dialogue and old saves do not have per-beat anchors. Preserve
      // their conservative behavior by committing remaining facts at the end.
      if (dialoguePlaybackFinished(this.state)) this.learnPlayerFacts(this.state.currentDialogue?.debug.disclosedFacts ?? []);
    }
  }

  private recordRuleReaction(sourceEventId: string) {
    const dialogue = this.state.currentDialogue, npcId = this.state.activeNpcId;
    if (!dialogue || !npcId) return;
    const index = this.state.dialogueBeatIndex - Number(Boolean(this.state.lastPlayerChoice));
    const beats = [{ speakerId: dialogue.speakerId, line: dialogue.line },
      ...dialogue.continuations.map(beat => ({ speakerId: beat.speakerId ?? dialogue.speakerId, line: beat.line }))];
    for (const reaction of dialogue.debug.ruleReactions ?? []) {
      if (reaction.beatIndex !== index || !validRuleReactions([reaction], this.state, npcId, beats)) continue;
      if (this.state.eventLog.some(e => e.type === "rule_callback" && e.actorId === npcId && e.details.sourceEventId === sourceEventId && e.details.ruleId === reaction.ruleId)) continue;
      const name = demoBootstrap.npcs.find(n => n.id === npcId)!.name;
      const rule = ruleContext(this.state, npcId).active.find(rule => rule.id === reaction.ruleId)!;
      const event = this.event("rule_callback", npcId, "player", `${name}关于「${rule.rule}」表态：${reaction.quote}`, ["player", npcId]);
      Object.assign(event.details, { ruleId: reaction.ruleId, ruleText: rule.rule, stance: reaction.stance, demand: reaction.demand,
        quote: reaction.quote, sourceEventId });
      this.memory(npcId, event.details.text, event, "rule_callback");
    }
  }

  private applyHeartConsequence(sourceEventId: string) {
    const heart = this.state.currentDialogue?.heart, effect = heart?.consequence;
    if (!heart || !effect || heart.consequenceApplied || effect.beatIndex !== this.state.dialogueBeatIndex) return;
    const npcId = this.state.activeNpcId!, npc = this.state.npcStates[npcId];
    const name = demoBootstrap.npcs.find(n => n.id === npcId)!.name;
    let text: string;
    switch (effect.type) {
      case "material": {
        const [verb, id] = effect.actionId!.split(":");
        this.assert(this.state.itemOwners[id] === npcId && evidence[id], "材料归属已变化，不能重复交付。");
        this.readEvidence(id);
        if (verb === "take") this.transfer(id, "player");
        text = verb === "take" ? `${name}将${this.itemName(id)}交给遥，实物已进入背包。` : `${name}出示${this.itemName(id)}，内容已记入手记。`;
        break;
      }
      case "case_action": {
        this.assert(availableActions(this.state, npcId).some(a => a.id === effect.actionId), "案件行动条件已变化，不能执行。");
        const outcome = this.executeCaseAction(effect.actionId!, npcId);
        this.assert(outcome, "案件行动没有可执行的结果。");
        text = outcome.text; break;
      }
      case "sorting_offer":
        npc.sortingHelp = "offered"; text = "小春邀请遥一起整理遗物。可以选择花30分钟共同整理。"; break;
      case "sorting_cancel":
        npc.sortingHelp = "cancelled"; text = "小春收回了整理遗物的邀请，这次帮忙的入口已关闭。"; break;
      case "pause":
        npc.unavailableUntil = this.abs() + 60;
        text = `${name}中止这次交流，${gameTimeLabel(npc.unavailableUntil)}前不再接待。`; break;
      case "meeting":
        // The action-plan block above has already persisted the NPC's decision.
        this.assert(npc.actionPlan?.sourceEventId === sourceEventId, "会面计划尚未落地。");
        text = `新的会面约定已生效：${gameTimeLabel(npc.actionPlan.arriveAt)}，${demoBootstrap.locations.find(l => l.id === npc.actionPlan!.locationId)!.name}。`; break;
    }
    heart.consequenceApplied = true;
    const e = this.event("heart_consequence", npcId, npcId, text, ["player", npcId]);
    e.details.sourceEventId = sourceEventId; e.details.spendEventId = heart.spendEventId ?? "";
    e.details.consequenceType = effect.type;
    this.memory(npcId, text, e);
  }

  async completeHeartActivity(revision: number) {
    this.assertHeartRevision(revision);
    const npcId = "npc_koharu", npc = this.state.npcStates[npcId];
    this.assert(this.state.phase === "location" || (this.state.phase === "encounter" && this.state.activeNpcId === npcId && dialoguePlaybackFinished(this.state)), "先看完当前对白，或在场景中与小春一起整理。");
    this.assert(npc.sortingHelp === "offered" && this.canTalk(npcId), "当前没有可执行的整理邀请，或小春不在场／暂不接待。");
    this.assert(this.state.currentMinute + 30 <= 1080, "今天已没有30分钟整理，请下次与小春见面时继续。");
    this.assert(!npc.actionPlan || npc.actionPlan.status !== "planned" || npc.actionPlan.arriveAt > this.abs() + 30 || npc.actionPlan.locationId === this.state.currentLocationId,
      "小春即将前往约定地点，请先处理会面安排再共同整理。");
    this.assert(!this.hasPendingHeartConsequence(), "请先看完出牌后的决定。");
    return this.heartTurn(async () => {
      if (!this.advance(this.abs() + 30, this.state.currentLocationId)) return;
      npc.sortingHelp = "completed";
      const e = this.event("heart_activity", npcId, npcId, "遥与小春花30分钟一起整理了遗物，小春仍持有的材料已共同查看，实物未转移。", ["player", npcId]);
      this.memory(npcId, e.details.text, e);
      for (const [id, owner] of Object.entries(this.state.itemOwners)) if (owner === npcId && evidence[id]) this.readEvidence(id);
      // Never resume a pre-generated segment after the physical activity changed the scene.
      if (this.state.phase === "encounter") {
        this.event("encounter_completed", "player", npcId, "交谈转为共同整理，整理已完成。", ["player", npcId]);
        this.clearEncounter(); this.state.phase = this.state.currentMinute >= 1080 ? "night" : "location";
        if (this.state.phase === "night") this.state.currentLocationId = null;
      }
    });
  }

  private hasPendingHeartConsequence() {
    const heart = this.state.currentDialogue?.heart;
    return !!(heart?.spendEventId && heart.consequence && !heart.consequenceApplied);
  }
  async nextDialogueBeat(revision?: number) {
    const before = structuredClone(this.state);
    try { return await this.playNextDialogueBeat(revision); }
    catch (error) { if (!this.heartBusy) this.state = before; throw error; }
  }
  private async playNextDialogueBeat(revision?: number) {
    if (this.state.heartSession || revision !== undefined) this.assertHeartRevision(revision);
    this.assert(this.state.phase === "encounter" && this.state.currentDialogue, "当前没有对白。");
    this.assert(!dialoguePlaybackFinished(this.state), "已经到最后一句。");
    this.advanceDialoguePlayback();
    if (dialoguePlaybackFinished(this.state)) {
      const notice = this.applyDialogueAction();
      return this.finish(notice?.text ?? null, notice?.item ?? null, true);
    }
    return this.finish(null, null, true);
  }
  private advanceDialoguePlayback() {
    if (this.state.dialogueNarrationIndex !== null) {
      const count = narrationSentences(this.beats()[this.state.dialogueBeatIndex].stageDirection).length;
      this.state.dialogueNarrationIndex = this.state.dialogueNarrationIndex + 1 < count ? this.state.dialogueNarrationIndex + 1 : null;
      this.recordVisibleBeat();
    } else {
      this.state.dialogueBeatIndex++; this.beginVisibleBeat();
    }
  }
  private applyDialogueAction(): { text: string; item: string | null } | null {
    const d = this.state.currentDialogue!;
    const action = d.debug.npcActionId ?? "none";
    d.debug.npcActionId = "none"; // Consumed exactly once, before any asynchronous planning.
    const npcId = this.state.activeNpcId!;
    if (action.startsWith("show:") || action.startsWith("take:")) {
      const [verb, id] = action.split(":");
      if (this.state.itemOwners[id] !== npcId || !evidence[id]) return null;
      this.readEvidence(id);
      if (verb === "take") this.transfer(id, "player");
      return { text: (verb === "take" ? "获得" : "已查看") + this.itemName(id) + "。内容已记入手记。", item: verb === "take" ? id : null };
    }
    return this.executeCaseAction(action, npcId);
  }
  private executeCaseAction(action: string, npcId: string): { text: string; item: string | null } | null {
    if (npcId === "npc_chiyo" && action === "retract" && !this.state.storyFlags.includes("chiyo_retracted")) {
      this.flag("chiyo_retracted");
      this.deliver("npc_chiyo", ["R01"], "我已向遥承认旧证词不实，决定纠正。", "npc_chiyo");
      this.event("story_beat", npcId, "player", "千代承认律并非整晚在旅馆；她约21:20见他从夕见台方向回来。没有目睹杀人。", ["player", npcId]);
      return { text: "千代已改口。律尚未收到这条消息，纠正说明也尚未写下。", item: null };
    }
    if (npcId === "npc_chiyo" && action === "write" && this.state.storyFlags.includes("chiyo_retracted") && this.state.itemOwners.E12 === "uncreated") {
      this.state.itemOwners.E12 = npcId; this.readEvidence("E12");
      return { text: "千代写下并签署纠正说明，实物仍由她保存。", item: null };
    }
    if (npcId === "npc_makoto" && this.state.npcStates[npcId].knownFactIds.includes("R01")) {
      if (action === "protect") {
        this.state.pendingNpcMove = { npcId, locationId: "loc_inn", arriveAt: this.abs() + 60 };
        return { text: "犬饲诚准备前往白石旅馆，一小时后到达。", item: null };
      }
      if (action === "supplement" && this.state.itemOwners.E13 === "uncreated") {
        this.state.itemOwners.E13 = npcId; this.flag("case_reopened"); this.readEvidence("E13");
        return { text: "补充说明已签署。重新核查，不是定罪。", item: null };
      }
    }
    return null;
  }
  async chooseTalkOption(optionId: string) {
    this.assert(this.state.phase === "encounter" && this.state.currentDialogue, "当前没有选择。");
    this.assert(dialoguePlaybackFinished(this.state), "请先看完这段对白。");
    const option = this.state.currentDialogue.options.find(o => o.id === optionId);
    this.assert(option, "选项已过期或不存在。");
    await this.applyDialogueAction();
    // Old saved menus may use their ID as an action. New generated IDs never execute directly.
    const effect = option.actionId !== undefined ? option.actionId ?? "" :
      /^(show:|take:)/.test(optionId) || ["retract","write","protect","supplement"].includes(optionId) ? optionId : "";
    this.assert(!effect || availableActions(this.state, this.state.activeNpcId!).some(a => a.id === effect), "此动作的条件已发生变化。");
    this.recordBranch(option);
    if (optionId === "daily") {
      const n = this.state.npcStates[this.state.activeNpcId!];
      const prior = this.state.eventLog.filter(e => e.type === "dialogue_choice" && e.targetId === n.npcId && e.day === this.state.day && e.details.text === option.text).length;
      if (prior === 1) n.relationship = Math.min(5, n.relationship + 1);
    }
    await this.generate(option, effect);
    if (this.beats().length === 1) await this.applyDialogueAction();
    return this.finish();
  }
  async respondToGift(optionId: string) { this.assert(this.state.interactionMode === "gift", "当前不是赠礼对话。"); return this.chooseTalkOption(optionId); }
  private recordBranch(option: DialogueOption) {
    const e = this.event("dialogue_choice", "player", this.state.activeNpcId, option.playerLine ?? option.text, ["player", this.state.activeNpcId!]);
    e.details.intent = option.intent;
    e.details.missed = JSON.stringify(this.state.currentDialogue?.options.filter(o => o.id !== option.id).map(o => o.text) ?? []);
    e.details.closedActions = JSON.stringify(this.state.currentDialogue?.options.map(o => o.actionId ??
      (/^(show:|take:)/.test(o.id) || ["retract","write","protect","supplement"].includes(o.id) ? o.id : null)).filter(Boolean) ?? []);
    // Unchosen possibilities are branch metadata only, never NPC memories or witnessed facts.
  }
  async completeEncounter() {
    this.assert(!this.heartBusy, "当前心绪正在生成，请稍候。");
    if (this.state.phase === "location" && this.state.activeNpcId && !this.state.interactionMode) {
      this.clearEncounter(); return this.finish("已收起互动选择。没有开始或结束任何对白。");
    }
    this.assert(this.state.phase === "encounter", "当前不在会面中。");
    if (!this.state.currentDialogue && !this.state.giftItemId) {
      // Backing out of an unopened/unsent interaction cannot trigger reflections,
      // witness decisions or any other post-dialogue NPC action.
      if (this.state.interactionMode) this.event("encounter_completed", "player", this.state.activeNpcId,
        "取消尚未开始的对白，返回场景。未计时、未赠送。", ["player", this.state.activeNpcId!]);
      this.clearEncounter(); this.state.phase = "location";
      return this.finish("已返回场景。");
    }
    this.assert(!this.hasPendingHeartConsequence(), "这张牌的后果尚未播放，请先看完对方的决定再结束会面。");
    if (dialoguePlaybackFinished(this.state)) await this.applyDialogueAction();
    const id = this.state.activeNpcId!;
    const runtime = this.state.npcStates[id];
    runtime.reflection = "本次实际交流：" + runtime.memories.slice(-3).map(m => m.summary).join(" ").slice(0,500);
    runtime.openLoops = this.state.storyFlags.includes("chiyo_retracted") && id === "npc_chiyo" ?
      ["考虑把纠正说明交给警署；不要假定律已经知道。"] :
      this.state.currentDialogue?.options.length ? ["交流停在：" + (runtime.memories.at(-1)?.summary ?? "").slice(0, 240)] : [];
    this.event("encounter_completed", "player", id, "结束会面。", ["player",id]);
    // An independent decision, not automatic shared knowledge or automatic murder.
    if (id === "npc_chiyo" && this.state.storyFlags.includes("chiyo_retracted") && !this.state.storyFlags.includes("chiyo_planned")) {
      this.flag("chiyo_planned");
      const action = await this.provider.planWitness?.(structuredClone(this.state)) ?? "wait";
      if (action === "write" && this.state.itemOwners.E12 === "uncreated") {
        this.state.itemOwners.E12 = id;
        this.event("story_beat", id, null, "千代拿起纸笔，写下并签署纠正说明。她把实物留在柜台边。", ["player", id]);
        this.readEvidence("E12");
      }
      if (action === "notify_ritsu" || action === "notify_police") {
        const recipient = action === "notify_ritsu" ? "npc_ritsu" : "npc_makoto";
        this.event("story_beat", id, recipient, "千代当着遥的面打电话，告诉" + demoBootstrap.npcs.find(n => n.id === recipient)!.name + "自己决定纠正旧证词。", ["player", id, recipient]);
        this.deliver(recipient, ["R01"], "千代亲口来电：我决定纠正律整晚在旅馆的旧证词。", id);
        if (recipient === "npc_makoto") this.state.pendingNpcMove = { npcId: recipient, locationId: "loc_inn", arriveAt: this.abs() + 60 };
        await this.maybePlan();
      }
    }
    this.clearEncounter(); this.state.phase = this.state.currentMinute >= 1080 ? "night" : "location";
    this.advance(this.abs(), this.state.currentLocationId);
    if (this.state.phase === "night") this.state.currentLocationId = null;
    return this.finish();
  }
  private readEvidence(id: string) {
    const data = evidence[id]; if (!data) return;
    this.learnPlayerFacts(data.facts);
    if (!this.state.evidenceJournal.some(e => e.id === id)) {
      this.state.evidenceJournal.push({ id, name: this.itemName(id), text: data.text, source: data.source, day: this.state.day });
      this.event("evidence_read", "player", null, this.itemName(id) + "：" + data.text, ["player"], id);
      this.discover(data.text);
    }
  }
  inspectItem(itemId: string, take = false) {
    this.assert(this.state.phase === "location" || (this.state.phase !== "ending" && this.state.itemOwners[itemId] === "player"), "请先进入物品所在地点。");
    this.assert(demoBootstrap.items.some(i => i.id === itemId), "物品不存在。");
    const owner = this.state.itemOwners[itemId];
    this.assert(owner === "player" || owner === this.state.currentLocationId, "这件物品不在你面前。");
    this.readEvidence(itemId);
    if (take && owner !== "player") this.transfer(itemId, "player");
    return this.finish((take ? "获得" : "已查看") + this.itemName(itemId) + "。", take ? itemId : null);
  }
  async presentEvidence(itemId: string) {
    this.assert(this.state.phase === "encounter" && this.state.interactionMode === "talk" && this.state.currentDialogue, "请先开始交谈。");
    this.assert(this.state.currentDialogue.options.length || this.state.currentDialogue.heart?.canContinue, "本次会面已经结束，请返回场景。");
    this.assert(dialoguePlaybackFinished(this.state), "请先听完眼前这段话。");
    this.assert(this.state.itemOwners[itemId] === "player" && evidence[itemId], "只有持有的材料才能当面出示。记得内容不等于持有原件。");
    const npc = this.state.activeNpcId!;
    const choice = { id: "present", text: "看看这个。", playerLine: "看看这份" + this.itemName(itemId) + "。", intent: "出示实物请对方回应，不赠送" };
    if (this.state.heartSession) return this.continueHeartWithInformation(choice, () => {
      this.readEvidence(itemId); this.deliver(npc, evidence[itemId].facts, "遥出示了" + this.itemName(itemId) + "：" + evidence[itemId].text);
    });
    this.readEvidence(itemId); this.deliver(npc, evidence[itemId].facts, "遥出示了" + this.itemName(itemId) + "：" + evidence[itemId].text);
    await this.maybePlan();
    this.recordBranch(choice);
    await this.generate(choice, "");
    return this.finish("已出示，物品仍在背包。");
  }
  async tellRetraction() {
    this.assert(this.state.phase === "encounter" && this.state.interactionMode === "talk" && this.state.storyFlags.includes("chiyo_retracted"), "你还没有听到千代改口，或尚未开始交谈。");
    this.assert(this.state.currentDialogue?.options.length || this.state.currentDialogue?.heart?.canContinue, "本次会面已经结束，请返回场景。");
    this.assert(dialoguePlaybackFinished(this.state), "请先听完这段话。");
    const npc = this.state.activeNpcId!;
    const choice = { id: "tell_retraction", text: "千代改口了。", playerLine: "千代改口了。她说你们可以去问她本人。", intent: "转述已知证词，不宣称亲眼见过案发" };
    if (this.state.heartSession) return this.continueHeartWithInformation(choice, () => {
      this.deliver(npc, ["R01"], "遥转告：千代已承认律整晚在旅馆的证词不实，准备纠正。");
    });
    this.deliver(npc, ["R01"], "遥转告：千代已承认律整晚在旅馆的证词不实，准备纠正。");
    await this.maybePlan();
    this.recordBranch(choice);
    await this.generate(choice, "");
    return this.finish("消息已实际送达。");
  }
  private async continueHeartWithInformation(choice: DialogueOption, deliver: () => void) {
    this.assertHeartRevision(this.state.revision);
    this.assert(!this.hasPendingHeartConsequence(), "请先看完出牌后的决定。");
    return this.heartTurn(async () => {
      deliver(); await this.maybePlan();
      this.recordBranch(choice);
      this.installHeartDialogue(await this.prepareHeartDialogue("listen", this.state, choice));
    });
  }
  private async maybePlan() {
    if (!this.state.npcStates.npc_ritsu.knownFactIds.includes("R01") || this.state.incident) return;
    if (this.state.npcStates.npc_chiyo.lifeState !== "alive" || this.state.npcStates.npc_ritsu.lifeState !== "alive") return;
    const intent: PlanIntent = await this.provider.plan(structuredClone(this.state), "npc_ritsu");
    const earliest = this.abs() + 60;
    this.state.incident = { id: "evt_chiyo_retracts_statement", stage: intent === "withdraw" ? "resolved" : "scheduled", intent,
      nextAt: earliest, resolvedText: intent === "withdraw" ? "律没有前往旅馆。" : "", interruptedUntil: null };
    this.event("npc_action", "npc_ritsu", "npc_chiyo", "律决定：" + intent, ["npc_ritsu"], null, "loc_inn");
  }
  resolvePlayerIncident(choice: string) {
    this.assert(this.state.phase === "incident" && this.state.incident, "当前没有需要处理的现场事件。");
    this.assert(["stay","intervene","leave","help"].includes(choice), "现场选项无效。");
    const i = this.state.incident;
    const remainder = i.interruptedUntil ?? this.abs(); i.interruptedUntil = null;
    const attacking = i.stage === "attack";
    if (choice === "stay" || choice === "intervene") {
      this.resolveIncident(attacking ? "遥上前挡开律，千代受伤但活着。律逃离旅馆。" : "遥留在千代身旁。律见无法单独谈话，放弃了这次接触。", attacking ? "injured" : "alive");
      this.state.phase = "location";
      this.advance(Math.max(remainder, this.abs()), "loc_inn");
    } else {
      this.event("incident", "player", null, choice === "help" ? "遥离开旅馆，准备去找人帮忙。没有人因此自动赶到。" : "遥离开了现场。");
      this.state.currentLocationId = null; this.state.phase = "action";
      this.advance(Math.max(remainder, this.abs()), null);
    }
    this.clearEncounter();
    if (this.state.currentMinute >= 1080) { this.state.phase = "night"; this.state.currentLocationId = null; }
    return this.finish(choice === "help" ? "请在地图上实际前往警署或诊所；路途会继续消耗时间。" : "选择已经影响现场。");
  }
  changeRule(slotId: RuleSlotId, itemId: string) {
    this.assert(this.state.phase === "night" && !this.state.ruleChangedThisNight, "每晚只能修改一次规则。");
    this.assert(this.state.itemOwners[itemId] === "player", "你没有这件物品。");
    const item = demoBootstrap.items.find(i => i.id === itemId)!;
    const concept = demoBootstrap.concepts.find(c => c.id === item.carriedConceptId)!;
    const old = this.state.activeRules[slotId];
    if (old) this.state.itemOwners[old.carrierItemId] = "loc_shrine";
    this.transfer(itemId, "rule:" + slotId);
    this.state.activeRules[slotId] = { slotId, carrierItemId: itemId, conceptId: concept.id, displayText: concept.slotText[slotId], activatedDay: this.state.day };
    this.state.ruleChangedThisNight = true;
    const e = this.event("rule_changed", "player", null, concept.slotText[slotId], ["player", ...demoBootstrap.npcs.map(n => n.id)]);
    Object.assign(e.details, { slotId, conceptId: concept.id, carrierItemId: itemId });
    for (const n of Object.values(this.state.npcStates)) if (n.lifeState !== "dead") this.memory(n.npcId, "全镇公共规则改为：" + concept.slotText[slotId] + "。历史事实不变。", e);
    return this.finish("全镇规则已改变：" + concept.slotText[slotId] + "。下次会面时，留意每个人因此提出的要求与决定。");
  }
  async endDay() {
    this.assert(this.state.phase === "night", "请先等到入夜。");
    if (this.state.day === 7) {
      this.advance(6 * 1440 + 1439, null);
      this.state.phase = "ending"; this.state.currentLocationId = null;
      this.state.ending = await this.provider.generateEnding(this.getState());
      this.event("ending_generated", "player", null, "七日结束，保存实际结果。");
      return this.finish("七日结束。");
    }
    const nextDay = this.state.day + 1;
    this.advance((nextDay - 1) * 1440 + 540, null);
    this.state.phase = "action"; this.state.currentLocationId = null; this.state.ruleChangedThisNight = false;
    this.event("day_advanced", "player", null, "第" + nextDay + "天开始。");
    return this.finish();
  }
}
