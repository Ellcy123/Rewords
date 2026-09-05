import {
  GameActionResponseSchema, GameStateSchema, demoBootstrap,
  type GameActionResponse, type GameState, type GameEvent, type DialogueOption, type InteractionMode, type RuleSlotId
} from "../../packages/shared/src/index.ts";
import { availableActions, characters, evidence, initialLocations, locationAliases } from "./caseData.ts";
import { CaseDialogueProvider, DialogueGenerationError, fallbackDialogue, type CaseProvider, type PlanIntent } from "./caseProvider.ts";
import { encounterPacing } from "./dialoguePacing.ts";
import type { GameStore } from "./persistence.ts";

export class GameRuleError extends Error { constructor(message: string) { super(message); this.name = "GameRuleError"; } }
export function createInitialState(): GameState {
  return GameStateSchema.parse({
    saveVersion: 3, chapterId: "sunset-case-v1", revision: 0, day: 1, period: "morning", phase: "action",
    dayStartMinute: 540, nightStartMinute: 1080, currentMinute: 540, conversationDurationMinutes: 120,
    currentLocationId: null, activeNpcId: null, interactionMode: null, currentDialogue: null,
    lastPlayerChoice: null, giftItemId: null, activeRules: { faith: null, beauty: null },
    itemOwners: Object.fromEntries(demoBootstrap.items.map(i => [i.id, i.initialOwnerId])),
    discoveredLocationIds: initialLocations, evidenceJournal: [], dialogueBeatIndex: 0,
    npcStates: Object.fromEntries(demoBootstrap.npcs.map(n => [n.id, {
      npcId: n.id, currentLocationId: n.initialLocationId, relationship: 0, lifeState: "alive",
      knownFactIds: characters[n.id].known, memories: [], reflection: "尚未与朝雾遥相处。",
      openLoops: [characters[n.id].goal]
    }])),
    storyFlags: [], ruleChangedThisNight: false, claimedRewardIds: [], eventLog: [], ending: null
  });
}
export class GameService {
  private state: GameState;
  constructor(private store: GameStore, private provider: CaseProvider = new CaseDialogueProvider()) {
    const saved = store.load();
    this.state = saved ? GameStateSchema.parse(saved) : createInitialState();
    if (!saved) {
      this.event("game_started", "player", null, "受托代管神社七天，整理真昼的遗物。");
      this.store.save(this.state);
    }
  }
  // HTTP only gets this projection. Plans and other people's private knowledge never leave the server.
  getState(): GameState {
    const s = structuredClone(this.state);
    s.eventLog = s.eventLog.filter(e => e.audience.includes("player"));
    s.storyFlags = s.storyFlags.filter(f => ["chiyo_retracted", "case_reopened", "witness_attack_seen"].includes(f));
    for (const n of Object.values(s.npcStates)) {
      n.knownFactIds = [];
      n.memories = n.memories.filter(m => s.eventLog.some(e => e.id === m.sourceEventId));
      n.openLoops = []; n.reflection = "只显示你实际参与的见闻。";
      if (s.phase !== "ending" && n.currentLocationId !== s.currentLocationId &&
          !s.eventLog.some(e => e.type === "incident" && /死亡|受伤/.test(e.details.text))) n.lifeState = "alive";
      if (n.currentLocationId !== s.currentLocationId) n.currentLocationId = "unknown";
    }
    for (const [id, owner] of Object.entries(s.itemOwners)) {
      if (owner !== "player" && !s.evidenceJournal.some(e => e.id === id) &&
          owner !== s.currentLocationId && !owner.startsWith("rule:")) s.itemOwners[id] = "unknown";
    }
    if (s.currentDialogue) s.currentDialogue.debug = {
      provider: s.currentDialogue.debug.provider, decision: "角色对白", usedFacts: [],
      promptVersion: s.currentDialogue.debug.promptVersion
    };
    if (s.incident && s.phase !== "incident" && (s.incident.stage !== "resolved" || !s.eventLog.some(e => e.type === "incident" && e.details.text === s.incident?.resolvedText))) s.incident = null;
    else if (s.incident) { s.incident.intent = "approach"; s.incident.nextAt = 0; s.incident.interruptedUntil = null; }
    s.pendingNpcMove = null;
    return GameStateSchema.parse(s);
  }
  reset() { this.state = createInitialState(); this.event("game_started", "player", null, "开始新的七日调查。旧章节数据库保留。"); return this.finish("新案件已重新开始。"); }
  private finish(notice: string | null = null, acquiredItemId: string | null = null): GameActionResponse {
    this.state.revision++;
    this.state = GameStateSchema.parse(this.state);
    this.store.save(this.state);
    return GameActionResponseSchema.parse({ state: this.getState(), notice, acquiredItemId });
  }
  private assert(ok: unknown, text: string): asserts ok { if (!ok) throw new GameRuleError(text); }
  private flag(id: string) { if (!this.state.storyFlags.includes(id)) this.state.storyFlags.push(id); }
  private event(type: GameEvent["type"], actorId: string | null, targetId: string | null, text: string, audience = ["player"], itemId: string | null = null, locationId = this.state.currentLocationId) {
    const e: GameEvent = { id: "event_" + this.state.eventLog.length, sequence: this.state.eventLog.length, day: this.state.day,
      minute: this.state.currentMinute, period: this.state.period, type, actorId, targetId, itemId, locationId, details: { text }, audience };
    this.state.eventLog.push(e); return e;
  }
  private memory(npcId: string, text: string, event: GameEvent, kind: "observation" | "dialogue" | "gift" | "player_choice" = "observation") {
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
  private discover(text: string) {
    for (const [id, names] of Object.entries(locationAliases)) if (!this.state.discoveredLocationIds.includes(id) && names.some(n => text.includes(n))) {
      this.state.discoveredLocationIds.push(id);
      this.event("location_discovered", "player", null, "地图新增：" + demoBootstrap.locations.find(l => l.id === id)!.name, ["player"], null, id);
    }
  }
  private clearEncounter() { Object.assign(this.state, { activeNpcId: null, interactionMode: null, currentDialogue: null, lastPlayerChoice: null, giftItemId: null, dialogueBeatIndex: 0 }); }
  private abs() { return (this.state.day - 1) * 1440 + this.state.currentMinute; }
  private setAbs(t: number) {
    this.state.day = Math.min(7, Math.floor(t / 1440) + 1);
    this.state.currentMinute = t % 1440;
    this.state.period = this.state.currentMinute < 720 ? "morning" : this.state.currentMinute < 1020 ? "afternoon" : this.state.currentMinute < 1080 ? "evening" : "night";
  }
  private canTalk(npcId: string) {
    const n = this.state.npcStates[npcId];
    return n && n.lifeState === "alive" && n.currentLocationId === this.state.currentLocationId;
  }
  private advance(target: number, observer: string | null): boolean {
    // Chronological stepping prevents a two-hour action from skipping a visible attack.
    while (true) {
      const incident = this.state.incident;
      const incidentTime = incident && incident.stage !== "resolved" ? incident.nextAt : Infinity;
      const moveTime = this.state.pendingNpcMove?.arriveAt ?? Infinity;
      const next = Math.min(incidentTime, moveTime);
      if (next > target) break;
      this.setAbs(next);
      if (moveTime <= incidentTime) {
        const move = this.state.pendingNpcMove!;
        const n = this.state.npcStates[move.npcId];
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
    return this.finish(this.getState().phase === "incident" ? this.incidentDescription() : "已抵达。选择人物后才开始会面。");
  }
  startEncounter(npcId?: string) {
    this.assert(this.state.phase === "location", "请先进入场景。");
    const present = demoBootstrap.npcs.filter(n => this.canTalk(n.id));
    const target = npcId ?? (present.length === 1 ? present[0].id : "");
    this.assert(target && this.canTalk(target), "请选择在场且能交谈的人物。");
    this.state.activeNpcId = target; this.state.phase = "encounter";
    this.event("encounter_started", "player", target, "开始与" + demoBootstrap.npcs.find(n => n.id === target)!.name + "会面。", ["player", target]);
    return this.finish("先选择交谈或赠礼。");
  }
  leaveLocation() {
    this.assert(this.state.phase === "location", "当前不能直接离开。");
    this.event("location_left", "player", null, "离开场景。");
    this.state.currentLocationId = null; this.state.phase = this.state.currentMinute >= 1080 ? "night" : "action";
    return this.finish();
  }
  waitUntilNight() {
    this.assert(["action","location"].includes(this.state.phase), "请先结束会面或处理眼前事件。");
    const target = (this.state.day - 1) * 1440 + 1080;
    if (!this.advance(target, this.state.currentLocationId)) return this.finish(this.incidentDescription());
    this.state.phase = "night"; this.state.currentLocationId = null;
    this.event("wait_until_night", "player", null, "整理见闻，等待入夜。"); return this.finish();
  }
  wait(minutes = 30) {
    this.assert(this.state.phase === "location" || this.state.phase === "action", "请先处理眼前会面。");
    this.assert(Number.isInteger(minutes) && minutes > 0 && minutes <= 120 && this.state.currentMinute + minutes <= 1080, "等待时间无效。");
    if (!this.advance(this.abs() + minutes, this.state.currentLocationId)) return this.finish(this.incidentDescription());
    return this.finish("时间过去了" + minutes + "分钟。");
  }
  async selectInteractionMode(mode: InteractionMode) {
    this.assert(this.state.phase === "encounter" && !this.state.interactionMode, "已经选择会面方式。");
    this.assert(this.canTalk(this.state.activeNpcId!), "人物目前无法交谈。");
    this.assert(this.state.currentMinute + 120 <= 1080, "今天剩余时间不足两小时。");
    this.state.interactionMode = mode;
    if (mode === "gift") return this.finish("选择礼物，确认前不计时。");
    if (!this.advance(this.abs() + 120, this.state.currentLocationId)) return this.finish(this.incidentDescription());
    await this.generate(null, ""); return this.finish();
  }
  cancelInteractionMode() {
    this.assert(this.state.phase === "encounter" && this.state.interactionMode === "gift" && !this.state.giftItemId, "礼物已经送出，不能撤销。");
    this.state.interactionMode = null; return this.finish();
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
    this.recordVisibleBeat();
  }
  private beats() {
    const d = this.state.currentDialogue;
    return d ? [...(this.state.lastPlayerChoice ? [{ speakerId: "player", line: this.state.lastPlayerChoice }] : []),
      { speakerId: d.speakerId, line: d.line, stageDirection: d.stageDirection },
      ...d.continuations.map(b => ({ ...b, speakerId: b.speakerId ?? d.speakerId }))] : [];
  }
  private recordVisibleBeat() {
    const beat = this.beats()[this.state.dialogueBeatIndex];
    if (!beat) return;
    const npc = this.state.activeNpcId!;
    const text = (beat.stageDirection ?? "") + " " + (beat.speakerId === "player" ? "朝雾遥" : demoBootstrap.npcs.find(n => n.id === npc)!.name) + "：" + beat.line;
    const e = this.event("dialogue_generated", beat.speakerId, npc, text, ["player", npc]);
    this.memory(npc, text, e, beat.speakerId === "player" ? "player_choice" : "dialogue");
    this.discover(text);
  }
  async nextDialogueBeat() {
    this.assert(this.state.phase === "encounter" && this.state.currentDialogue, "当前没有对白。");
    this.assert(this.state.dialogueBeatIndex < this.beats().length - 1, "已经到最后一句。");
    this.state.dialogueBeatIndex++; this.recordVisibleBeat();
    if (this.state.dialogueBeatIndex === this.beats().length - 1) {
      const notice = await this.applyDialogueAction();
      return this.finish(notice?.text ?? null, notice?.item ?? null);
    }
    return this.finish();
  }
  private async applyDialogueAction(): Promise<{ text: string; item: string | null } | null> {
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
    this.assert(this.state.dialogueBeatIndex === this.beats().length - 1, "请先看完这段对白。");
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
    this.assert(this.state.phase === "encounter", "当前不在会面中。");
    if (this.state.currentDialogue && this.state.dialogueBeatIndex === this.beats().length - 1) await this.applyDialogueAction();
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
    if (this.state.phase === "night") this.state.currentLocationId = null;
    return this.finish();
  }
  private readEvidence(id: string) {
    const data = evidence[id]; if (!data) return;
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
    this.assert(this.state.currentDialogue.options.length, "本次会面已经结束，请返回场景。");
    this.assert(this.state.dialogueBeatIndex === this.beats().length - 1, "请先听完眼前这段话。");
    this.assert(this.state.itemOwners[itemId] === "player" && evidence[itemId], "只有持有的材料才能当面出示。记得内容不等于持有原件。");
    const npc = this.state.activeNpcId!;
    this.readEvidence(itemId); this.deliver(npc, evidence[itemId].facts, "遥出示了" + this.itemName(itemId) + "：" + evidence[itemId].text);
    await this.maybePlan();
    const choice = { id: "present", text: "看看这个。", playerLine: "看看这份" + this.itemName(itemId) + "。", intent: "出示实物请对方回应，不赠送" };
    this.recordBranch(choice);
    await this.generate(choice, "");
    return this.finish("已出示，物品仍在背包。");
  }
  async tellRetraction() {
    this.assert(this.state.phase === "encounter" && this.state.interactionMode === "talk" && this.state.storyFlags.includes("chiyo_retracted"), "你还没有听到千代改口，或尚未开始交谈。");
    this.assert(this.state.currentDialogue?.options.length, "本次会面已经结束，请返回场景。");
    this.assert(this.state.dialogueBeatIndex === this.beats().length - 1, "请先听完这段话。");
    const npc = this.state.activeNpcId!;
    this.deliver(npc, ["R01"], "遥转告：千代已承认律整晚在旅馆的证词不实，准备纠正。");
    await this.maybePlan();
    const choice = { id: "tell_retraction", text: "千代改口了。", playerLine: "千代改口了。她说你们可以去问她本人。", intent: "转述已知证词，不宣称亲眼见过案发" };
    this.recordBranch(choice);
    await this.generate(choice, "");
    return this.finish("消息已实际送达。");
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
    for (const n of Object.values(this.state.npcStates)) if (n.lifeState !== "dead") this.memory(n.npcId, "全镇公共规则改为：" + concept.slotText[slotId] + "。历史事实不变。", e);
    return this.finish("全镇规则已改变：" + concept.slotText[slotId]);
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
