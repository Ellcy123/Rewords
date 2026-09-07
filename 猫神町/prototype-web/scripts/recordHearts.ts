import { dialoguePlaybackFinished } from "../packages/shared/src/index.ts";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { GameService } from "../server/src/gameService.ts";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { heartCatalog } from "../packages/shared/src/index.ts";

// Real-model smoke test in memory. Never calls the running game's mutation endpoints.
dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
const drafts: string[] = [];
const provider = new CaseDialogueProvider({ fetchImpl: async (url, init) => {
  const response = await fetch(url, init);
  if (process.env.HEART_RECORD_DRAFTS === "1") {
    const body = await response.clone().json() as { choices?: { message: { content: string } }[] };
    drafts.push(body.choices?.[0]?.message.content ?? "HTTP " + response.status);
  }
  return response;
} });
if (!provider.getStatus().configured) throw new Error("需要配置本地 DeepSeek 才能记录真实心绪对白。");
const testPack = process.env.HEART_RECORD_TEST_PACK === "1";
const game = new GameService(new MemoryGameStore(), provider, { heartTestPack: testPack });
const records = ["# 拾绪首日 · 小春真实 AI 抽样", "", "独立内存存档；不是固定剧情，不改玩家存档。少量抽样不代表总体成功率。", ""];
records.push(`测试补给：${testPack ? "三种各3张，用于节点出牌验证，不计自然获取" : "关闭，验证自然获取"}`, "");
let segments = 0, choicePoints = 0, ordinarySegments = 0;
let revisited = false;
const maxSegments = process.env.HEART_RECORD_REVISIT === "1" ? 3 : 10;
const seenLines = new Set<string>(), repeatedLines: string[] = [];
game.travel("loc_shrine"); game.startEncounter("npc_koharu");
try {
  await game.startHeartEncounter(game.getState().revision);
  for (let round = 0; round < maxSegments; round++) {
    let s = game.getState();
    while (!dialoguePlaybackFinished(s)) {
      await game.nextDialogueBeat(s.revision); s = game.getState();
    }
    const d = s.currentDialogue!;
    for (const beat of [d, ...d.continuations]) {
      const normalized = beat.line.replace(/[\p{P}\p{Z}\s]/gu, "");
      const key = beat.speakerId + ":" + normalized;
      if (normalized.length >= 8 && seenLines.has(key)) repeatedLines.push(beat.line);
      seenLines.add(key);
    }
    segments++;
    if (d.heart?.choicePoint) choicePoints++; else if (d.heart?.canContinue) ordinarySegments++;
    const lines = [d, ...d.continuations].map(b => `${b.speakerId === "player" ? "遥" : "小春"}：${b.line}${b.stageDirection ? `（${b.stageDirection}）` : ""}`);
    records.push(`## 第 ${round + 1} 段 · ${d.debug.provider}`, "", ...lines, "", `手牌：${s.heartCards.map(c => heartCatalog[c.kind].name).join("、") || "无"}`, `拾绪依据：${d.heart?.pickups.map(p => heartCatalog[p.kind].name + "／" + p.quote).join("；") || "无"}`, `表态节点：${d.heart?.choicePoint ? d.heart.choicePoint.quote + "／" + d.heart.choicePoint.reason : "无，继续双方对话"}`, "");
    process.stdout.write(lines.join("\n") + "\n表态节点：" + (d.heart?.choicePoint?.quote ?? "无") + "\n");
    if (round === maxSegments - 1 || revisited) break;
    if (!d.heart?.canContinue || process.env.HEART_RECORD_REVISIT === "1" && round >= 1) {
      if (process.env.HEART_RECORD_REVISIT === "1" && !revisited) {
        revisited = true; await game.completeEncounter(); game.startEncounter("npc_koharu");
        records.push("## 主动结束后再次会面（只验证新开场，历史不能重播为开场）", "");
        await game.startHeartEncounter(game.getState().revision); continue;
      }
      break;
    }
    const preferredKind = ["fear", "sympathy", "affection"][s.eventLog.filter(e => e.type === "heart_spent").length % 3];
    const card = d.heart.choicePoint ? (testPack ? s.heartCards.find(c => c.kind === preferredKind) ?? s.heartCards[0] : s.heartCards[0]) : undefined;
    records.push("本次操作：" + (card ? `出示${heartCatalog[card.kind].name}` : "顺着聊下去"), "");
    await game.useHeart(card?.id ?? null, s.revision);
  }
} catch (error) {
  records.push("## 本轮技术失败", "", error instanceof Error ? error.message : "未知失败", "卡牌与进度仍可恢复；不把技术失败当作人物拒绝或告别。", "");
  process.exitCode = 1;
} finally {
  const summary = `节点统计：${segments} 段，${choicePoints} 个表态节点，${ordinarySegments} 个普通续聊段；实际出牌 ${game.getState().eventLog.filter(e => e.type === "heart_spent").length} 次`;
  records.push("## 节点验证", "", summary, ""); process.stdout.write(summary + "\n");
  records.push("## 重复诊断", "", `同人长句原文重复（忽略标点空白，至少8字，仅诊断不拦截）：${repeatedLines.length}`, ...repeatedLines, "");
  process.stdout.write(`长句原文重复：${repeatedLines.length}\n`);
  records.push("## 实际拾取／消耗", "", ...game.getState().eventLog.filter(e => e.type.startsWith("heart_")).map(e => `${e.id}：${e.details.text}`), "",
    "## 请求记录", "", ...provider.getLogs().map(l => `${l.mode}：${l.success ? "成功" : l.errorCode}，${l.attemptCount} 次，${l.latencyMs} ms`));
  if (drafts.length) records.push("", "## 诊断草稿（含拒绝稿，不是已发生剧情）", "", ...drafts.map((d, i) => `### 请求 ${i + 1}\n\n${d}\n`));
  const folder = fileURLToPath(new URL("../../对白测试记录/", import.meta.url)); mkdirSync(folder, { recursive: true });
  const path = folder + new Date().toISOString().replace(/[:.]/g, "-") + "_拾绪首日抽样.md";
  writeFileSync(path, records.join("\n"), "utf8"); process.stdout.write("RECORD_PATH=" + path + "\n");
}
