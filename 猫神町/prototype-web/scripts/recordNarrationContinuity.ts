import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dialoguePlaybackFinished, type DialogueResult } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { mockHeartDialogue, type HeartContext } from "../server/src/heartDialogue.ts";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";

// Isolated targeted regression; the past scene is a fixture, not claimed as a natural AI trigger.
dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
class Provider extends CaseDialogueProvider {
  fixture = true;
  async generateHearts(c: HeartContext): Promise<DialogueResult> {
    if (!this.fixture) return super.generateHearts(c);
    const d = mockHeartDialogue(c);
    d.line = "……嗯，那我们走吧。";
    d.stageDirection = "小春已经穿好那双旧拖鞋，跟着遥跨过玄关，走到了通往姐姐房间的走廊。";
    d.continuations = [{ speakerId: "player", line: "我就在这里陪着你。", stageDirection: "遥在走廊上停住，等小春跟上。", emotion: "关切" }];
    d.heart = { canContinue: true, choicePoint: null, actionPlan: null, pickups: [] };
    return d;
  }
}
const store = new MemoryGameStore(), initial = createInitialState();
initial.currentLocationId = "loc_home"; initial.phase = "location"; initial.currentMinute = 600;
initial.npcStates.npc_koharu.currentLocationId = "loc_home"; initial.discoveredLocationIds.push("loc_home");
store.save(initial);
const provider = new Provider();
if (!provider.getStatus().configured) throw new Error("需要本地AI配置");
const game = new GameService(store, provider);
async function drain() {
  while (!dialoguePlaybackFinished(game.getState())) await game.nextDialogueBeat(game.getState().revision);
}
console.log("固定前置：小春已穿好拖鞋、跨过玄关，双方已在走廊。只验证续写与再会面，不改玩家存档。");
game.startEncounter("npc_koharu"); await game.startHeartEncounter(game.getState().revision); await drain();
provider.fixture = false;
for (let round = 0; round < 2; round++) {
  if (round === 0) await game.useHeart(null, game.getState().revision);
  else { await game.completeEncounter(); game.startEncounter("npc_koharu"); await game.startHeartEncounter(game.getState().revision); }
  const from = game.getState().eventLog.length - 1;
  await drain();
  console.log(round === 0 ? "\n## 同场续写" : "\n## 再次会面");
  for (const e of game.getState().eventLog.slice(from).filter(e => ["narration_generated", "dialogue_generated"].includes(e.type))) {
    console.log((e.type === "narration_generated" ? "旁白：" : "") + e.details.text);
  }
  console.log("表态节点：" + (game.getState().currentDialogue?.heart?.choicePoint?.quote ?? "无"));
}
console.log("\nPROMPT=" + game.getState().currentDialogue?.debug.promptVersion);
