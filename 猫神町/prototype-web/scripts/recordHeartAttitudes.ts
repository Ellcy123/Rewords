import { dialoguePlaybackFinished } from "../packages/shared/src/index.ts";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { legacyHeartKinds, heartCatalog } from "../packages/shared/src/index.ts";

dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
const real = new CaseDialogueProvider();
if (!real.getStatus().configured) throw new Error("未配置真实 AI。");
const records = ["# 拾绪首日 · 三种态度真实 AI 验证", "", "每种牌的前置来源通过隔离内存存档中的固定演示获得，不代表真实模型自然产牌分布。仅最后一次出牌使用真实 AI；不改玩家存档。", ""];
async function drain(game: GameService) {
  let s = game.getState();
  while (s.currentDialogue && !dialoguePlaybackFinished(s)) { await game.nextDialogueBeat(s.revision); s = game.getState(); }
}
for (const kind of legacyHeartKinds) {
  const store = new MemoryGameStore(), setup = new GameService(store, new CaseDialogueProvider({ apiKey: "" }));
  setup.travel("loc_shrine"); setup.startEncounter("npc_koharu"); await setup.startHeartEncounter(setup.getState().revision);
  await drain(setup); // The opening pickup exists only after its NPC speech is shown.
  if (kind !== "fear") { await setup.useHeart(setup.getState().heartCards[0].id, setup.getState().revision); await drain(setup); }
  if (kind === "affection") await setup.useHeart(setup.getState().heartCards.find(c => c.kind === "sympathy")!.id, setup.getState().revision);
  await drain(setup);
  const game = new GameService(store, real), before = game.getState();
  const card = before.heartCards.find(c => c.kind === kind)!;
  records.push("## " + heartCatalog[kind].name, "", "前置情绪来源（固定演示）：「" + card.sourceText + "」", "");
  try {
    await game.useHeart(card.id, before.revision); await drain(game);
    const d = game.getState().currentDialogue!;
    const lines = [d, ...d.continuations].map(b => `${b.speakerId === "player" ? "遥" : "小春"}：${b.line}${b.stageDirection ? `（${b.stageDirection}）` : ""}`);
    const spent = !game.getState().heartCards.some(c => c.id === card.id);
    records.push(...lines, "", "实际消耗：" + spent + "；provider=" + d.debug.provider, "");
    process.stdout.write(heartCatalog[kind].name + "\n" + lines.join("\n") + "\n");
  } catch (error) {
    records.push("未成功：" + (error instanceof Error ? error.message : "未知失败"), "状态是否保留：" + (JSON.stringify(before) === JSON.stringify(game.getState())), "");
    process.exitCode = 1;
  }
}
records.push("## 请求记录", "", ...real.getLogs().map(l => `${l.mode}：${l.success ? "成功" : l.errorCode}，${l.attemptCount} 次，${l.latencyMs} ms`));
const folder = fileURLToPath(new URL("../../对白测试记录/", import.meta.url)); mkdirSync(folder, { recursive: true });
const path = folder + new Date().toISOString().replace(/[:.]/g, "-") + "_三种心绪态度.md";
writeFileSync(path, records.join("\n"), "utf8"); process.stdout.write("RECORD_PATH=" + path + "\n");
