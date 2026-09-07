import { demoBootstrap, type ActionPlanProposal, type GameState } from "../../packages/shared/src/index.ts";

export const gameTimeLabel = (absoluteMinute: number) => `第${Math.floor(absoluteMinute / 1440) + 1}天 ${String(Math.floor(absoluteMinute % 1440 / 60)).padStart(2, "0")}:${String(absoluteMinute % 60).padStart(2, "0")}`;

// Validate executability, not whether the NPC ought to want this meeting.
export function validMeetingPlan(plan: ActionPlanProposal, state: GameState, npcId: string): boolean {
  const now = (state.day - 1) * 1440 + state.currentMinute;
  return state.npcStates[npcId]?.lifeState === "alive" &&
    demoBootstrap.locations.some(l => l.id === plan.locationId) &&
    plan.arriveAt >= now + 60 && plan.arriveAt <= now + 1440 &&
    plan.waitUntil > plan.arriveAt && plan.waitUntil < 7 * 1440 &&
    Math.floor(plan.arriveAt / 1440) === Math.floor(plan.waitUntil / 1440) &&
    plan.arriveAt % 1440 >= 540 && plan.waitUntil % 1440 <= 1080 &&
    state.pendingNpcMove?.npcId !== npcId &&
    !(state.incident && state.incident.stage !== "resolved" && ["npc_ritsu", "npc_chiyo"].includes(npcId));
}
