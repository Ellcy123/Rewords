import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { GameStateSchema } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider, buildCasePrompt, type CaseContext } from "../server/src/caseProvider.ts";

// Read-only saved-game replay; generated results are NEVER written back to the game.
dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
const db = new DatabaseSync(fileURLToPath(new URL("../.data/sunset-case-v1.sqlite", import.meta.url)), { readOnly: true });
const row = db.prepare("SELECT payload FROM game_save WHERE slot_id = ?").get("default") as { payload: string };
db.close();
const state = GameStateSchema.parse(JSON.parse(row.payload));
let index = state.eventLog.length - 1;
while (index >= 0 && state.eventLog[index].type !== "dialogue_choice") index--;
if (index < 0) throw new Error("No saved choice to replay");
const selected = state.eventLog[index], npcId = selected.targetId!;
state.eventLog = state.eventLog.slice(0, index + 1);
const eventIds = new Set(state.eventLog.map(e => e.id));
for (const npc of Object.values(state.npcStates)) npc.memories = npc.memories.filter(m => eventIds.has(m.sourceEventId));
state.activeNpcId = npcId; state.phase = "encounter";
const lastNpc = [...state.eventLog].reverse().find(e => e.type === "dialogue_generated" && e.actorId === npcId);
state.currentDialogue = { speakerId: npcId, line: lastNpc?.details.text ?? "", stageDirection: "", emotion: "平静", continuations: [],
  options: [], debug: { provider: "mock", decision: "isolated replay context", usedFacts: [] } };
const context: CaseContext = { state, npcId, mode: "talk", giftItem: null, effect: "",
  selectedOption: { id: "replay", text: selected.details.text, intent: selected.details.intent ?? selected.details.text } };
const provider = new CaseDialogueProvider();
const records = ["# 最近玩家选择：隔离重放", "", "只读现有存档，在内存副本中去掉最后选择之后的旧输出，再生成同一回应；不改网页存档。不代表完整流程重新测试。", "",
  "玩家本句：" + selected.details.text, "上句NPC：" + lastNpc?.details.text,
  "预算：" + JSON.stringify(JSON.parse(buildCasePrompt(context).user).conversation_pacing), ""];
try {
  const d = await provider.generate(context);
  records.push("结果：" + d.debug.provider, "NPC：" + d.line,
    ...d.continuations.map(b => (b.speakerId === "player" ? "主角" : "NPC") + "：" + b.line),
    "", "选项：" + d.options.map(o => o.text).join(" / "));
  process.stdout.write(d.debug.provider + ", options=" + d.options.length + "\n");
} catch (error) {
  records.push("可重试的技术失败，不生成告别：" + (error instanceof Error ? error.message : "未知错误"));
  process.stdout.write("retryable_failure\n");
}
records.push("", "请求日志：" + JSON.stringify(provider.getLogs()));
const folder = fileURLToPath(new URL("../../对白测试记录/", import.meta.url));
mkdirSync(folder, { recursive: true });
const path = folder + new Date().toISOString().replace(/[:.]/g, "-") + "_最近选择重放.md";
writeFileSync(path, records.join("\n"), "utf8");
process.stdout.write(path + "\n");
