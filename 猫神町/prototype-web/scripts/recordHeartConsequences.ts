// Bounded real-provider diagnostic. Memory-only; never imports the HTTP server or live SQLite store.
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { mockHeartDialogue, type HeartContext } from "../server/src/heartDialogue.ts";
import { dialoguePlaybackFinished } from "../packages/shared/src/index.ts";

dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
const trace: unknown[] = [];
const realFetch = globalThis.fetch;
const provider = new CaseDialogueProvider({ maxAttempts: 1, fetchImpl: async (url, init) => {
  const request = JSON.parse(String(init?.body));
  const phase = request.messages[0].content.startsWith("你只审查对白内容") ? "review" : "generation";
  const response = await realFetch(url, init);
  // Keep full successful model output, never headers, credentials or error bodies.
  trace.push({ phase, status: response.status, response: response.ok ? await response.clone().json() : null });
  return response;
} });
if (!provider.getStatus().configured) throw new Error("真实模型未配置；未发起请求。");
class Harness extends CaseDialogueProvider {
  async generateHearts(c: HeartContext) {
    trace.push({ intent: c.heartIntent, pendingChoice: c.state.currentDialogue?.heart?.choicePoint ?? null });
    return c.heartIntent === "opening" ? mockHeartDialogue(c) : provider.generateHearts(c);
  }
}
const store = new MemoryGameStore();
const game = new GameService(store, new Harness({ apiKey: "" }));
game.travel("loc_shrine"); game.startEncounter("npc_koharu");
await game.startHeartEncounter(game.getState().revision);
while (!dialoguePlaybackFinished(game.getState())) await game.nextDialogueBeat(game.getState().revision);
const before = store.load()!;
let failure: string | null = null;
try {
  const card = game.getState().heartCards.find(c => c.kind === "fear")!;
  await game.useHeart(card.id, game.getState().revision);
  while (!dialoguePlaybackFinished(game.getState())) await game.nextDialogueBeat(game.getState().revision);
} catch (error) { failure = error instanceof Error ? error.message : "unknown_error"; }
const after = game.getState();
console.log(JSON.stringify({ failure, rolledBack: JSON.stringify(before) === JSON.stringify(store.load()),
  heart: after.currentDialogue?.heart, events: after.eventLog.filter(e => e.type === "heart_spent" || e.type === "heart_consequence"),
  trace, providerLogs: provider.getLogs() }, null, 2));
if (failure) process.exitCode = 1;
