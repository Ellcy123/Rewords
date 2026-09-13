import { type GameState, type HeartConsequence, type ActionPlanProposal } from "../../packages/shared/src/index.ts";
import { availableActions } from "./caseData.ts";
import { validMeetingPlan } from "./actionPlans.ts";

export function heartMeetingWindow(state: GameState, npcId: string): ActionPlanProposal | null {
  const now = (state.day - 1) * 1440 + state.currentMinute;
  let arriveAt = now + 60;
  if (arriveAt % 1440 + 60 > 1080) arriveAt = (Math.floor(now / 1440) + 1) * 1440 + 540;
  const proposal: ActionPlanProposal = { type: "meet", targetNpcId: "player", locationId: state.currentLocationId!,
    arriveAt, waitUntil: arriveAt + 60, reason: "继续当面交谈", quote: "", beatIndex: 1 };
  return validMeetingPlan(proposal, state, npcId) ? proposal : null;
}

// Executable capabilities, not a table that maps a card to a predetermined reward.
export function heartCapabilities(state: GameState, npcId: string) {
  const npc = state.npcStates[npcId];
  const materials = availableActions(state, npcId).filter(a => /^(show|take):/.test(a.id));
  return {
    materials,
    // A sorting offer must open access to something not yet inspected, not an empty chore.
    sorting_offer: npcId === "npc_koharu" && npc.sortingHelp === "available" && state.currentMinute + 30 <= 1080 && materials.some(a => a.id.startsWith("show:")),
    sorting_cancel: npcId === "npc_koharu" && npc.sortingHelp === "offered",
    sorting_state: npc.sortingHelp,
    case_actions: availableActions(state, npcId).filter(a => ["retract", "write", "protect", "supplement"].includes(a.id) &&
      !(a.id === "protect" && state.pendingNpcMove?.npcId === npcId)),
    meeting: !!heartMeetingWindow(state, npcId),
    pause: true,
    pause_minutes: 60,
    now: (state.day - 1) * 1440 + state.currentMinute
  };
}

export function validHeartConsequence(effect: HeartConsequence, state: GameState, npcId: string, plan: ActionPlanProposal | null): boolean {
  const cap = heartCapabilities(state, npcId);
  if (!["material", "case_action"].includes(effect.type) && effect.actionId !== null) return false;
  switch (effect.type) {
    case "material": return cap.materials.some(a => a.id === effect.actionId);
    case "case_action": return cap.case_actions.some(a => a.id === effect.actionId);
    case "sorting_offer": return cap.sorting_offer;
    case "sorting_cancel": return cap.sorting_cancel;
    case "pause": return state.npcStates[npcId].unavailableUntil <= cap.now;
    case "meeting": {
      if (!plan || plan.beatIndex !== effect.beatIndex || !validMeetingPlan(plan, state, npcId)) return false;
      const old = state.npcStates[npcId].actionPlan;
      return !old || !["planned", "waiting"].includes(old.status) || old.locationId !== plan.locationId || old.arriveAt !== plan.arriveAt || old.waitUntil !== plan.waitUntil;
    }
  }
}

export function validConsequenceBeats(effect: HeartConsequence, beats: { speakerId?: string; line: string }[], npcId: string, canContinue: boolean, plan: ActionPlanProposal | null) {
  const beat = beats[effect.beatIndex];
  return !!beat && beat.speakerId === npcId && beat.line.includes(effect.quote) &&
    // A pause ends this encounter; no already-generated continuation may ignore it.
    (effect.type !== "pause" || (!canContinue && effect.beatIndex === beats.length - 1 && !plan));
}
