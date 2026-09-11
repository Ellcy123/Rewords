import { CaseDialogueProvider } from "./caseProvider.ts";
import { mockHeartDialogue, type HeartContext } from "./heartDialogue.ts";
import { gameTimeLabel } from "./actionPlans.ts";

// Explicit, offline UI fixture. Only enabled together with the isolated memory preview.
export class MeetingPreviewProvider extends CaseDialogueProvider {
  constructor() { super({ apiKey: "" }); }
  async generateHearts(c: HeartContext) {
    const d = mockHeartDialogue(c), now = (c.state.day - 1) * 1440 + c.state.currentMinute;
    const arriveAt = now + 60, waitUntil = now + 180;
    d.line = `我${gameTimeLabel(arriveAt)}到雨宫家旧居，等你到${gameTimeLabel(waitUntil)}，我们在那里聊。`;
    d.continuations = []; d.speakerId = c.npcId;
    d.heart = { consequence: null, spendEventId: null, consequenceApplied: false, canContinue: false, choicePoint: null, pickups: [], actionPlan: {
      type: "meet", targetNpcId: "player", locationId: "loc_home", arriveAt, waitUntil,
      reason: "固定演示：在旧居会面", quote: d.line, beatIndex: 0
    } };
    return d;
  }
}
