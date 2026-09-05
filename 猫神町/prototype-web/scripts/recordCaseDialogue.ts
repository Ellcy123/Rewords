import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { createInitialState, GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { demoBootstrap } from "../packages/shared/src/index.ts";

// Isolated provider smoke test. No HTTP mutations, no production save, no credentials in output.
dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
const diagnostics: string[] = [];
const provider = new CaseDialogueProvider({ fetchImpl: async (url, init) => {
  const result = await fetch(url, init);
  if (process.env.CASE_RECORD_DRAFTS === "1") {
    const body = await result.clone().json() as { choices?: { message: { content: string } }[] };
    diagnostics.push(body.choices?.[0]?.message.content ?? "HTTP " + result.status);
  }
  return result;
} });
const limit = Number(process.env.CASE_RECORD_LIMIT ?? 7);
const rounds = Number(process.env.CASE_RECORD_ROUNDS ?? 2);
const records: string[] = ["# 杀人案重构版 · 真实模型抽样记录", "", "仅记录隔离状态下的生成结果，不改当前游戏存档。", ""];
const selectedIds = process.env.CASE_RECORD_NPCS?.split(",");
for (const npc of demoBootstrap.npcs.filter(n => !selectedIds || selectedIds.includes(n.id)).slice(0, limit)) {
  const state = createInitialState();
  state.phase = "location"; state.currentLocationId = npc.initialLocationId;
  const store = new MemoryGameStore(); store.save(state);
  const game = new GameService(store, provider);
  game.startEncounter(npc.id); await game.selectInteractionMode("talk");
  records.push("## " + npc.name, "");
  for (let round = 0; round < rounds; round++) {
    let s = game.getState();
    while (s.currentDialogue && s.dialogueBeatIndex < s.currentDialogue.continuations.length + (s.lastPlayerChoice ? 1 : 0)) {
      await game.nextDialogueBeat(); s = game.getState();
    }
    const d = s.currentDialogue!;
    records.push("### 第" + (round + 1) + "段 · " + d.debug.provider, "",
      ...(s.lastPlayerChoice ? ["遥：" + s.lastPlayerChoice] : []),
      ...[{ speakerId: d.speakerId, line: d.line, stageDirection: d.stageDirection }, ...d.continuations].map(b =>
        (b.stageDirection ? "（" + b.stageDirection + "）" : "") + (b.speakerId === "player" ? "遥" : npc.name) + "：" + b.line),
      "", "选项：" + d.options.map(o => o.text + " [" + o.id + "]").join(" / "), "",
      "已读材料：" + s.evidenceJournal.map(e => e.id).join("、"), "");
    process.stdout.write(npc.name + " / " + (round + 1) + ": " + d.debug.provider + "\n");
    if (!d.options.length) { records.push("本次会话自然结束或进入保底收束。", ""); break; }
    if (round < rounds - 1) {
      const choice = process.env.CASE_RECORD_FOLLOW === "1" ?
        d.options.find(o => !o.actionId && /[？?]|怎么|什么|为什么/.test(o.text)) ?? d.options[0] : d.options[0];
      records.push("实际选择：" + choice.text, "错过：" + d.options.filter(o => o.id !== choice.id).map(o => o.text).join(" / "), "");
      try {
        await game.chooseTalkOption(choice.id);
      } catch (error) {
        records.push("生成未成功（技术失败，不是NPC告别）；原选项与进度保留：" + (error instanceof Error ? error.message : "未知错误"), "");
        process.stdout.write(npc.name + ": retryable generation failure\n");
        break;
      }
    }
  }
}
const folder = fileURLToPath(new URL("../../对白测试记录/", import.meta.url));
if (diagnostics.length) records.push("## 调试草稿（含未通过校验的内容，不是已发生剧情）", "", ...diagnostics.map((d, i) => "### 请求 " + (i+1) + "\n\n" + d + "\n"));
mkdirSync(folder, { recursive: true });
const path = folder + new Date().toISOString().replace(/[:.]/g,"-") + "_杀人案重构抽样.md";
writeFileSync(path, records.join("\n"), "utf8");
process.stdout.write("RECORD_PATH=" + path + "\n");
process.stdout.write("SUMMARY=" + JSON.stringify(provider.getLogs().map(l=>({npcId:l.npcId,mode:l.mode,success:l.success,attempts:l.attemptCount,ms:l.latencyMs,error:l.errorCode}))) + "\n");
