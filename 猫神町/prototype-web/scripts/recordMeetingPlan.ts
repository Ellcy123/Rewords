import { dialoguePlaybackFinished } from "../packages/shared/src/index.ts";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { mockHeartDialogue, type HeartContext } from "../server/src/heartDialogue.ts";

dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
const responses: string[] = [];
class Provider extends CaseDialogueProvider {
  fixture = true;
  async generateHearts(c: HeartContext) {
    if (!this.fixture) return super.generateHearts(c);
    const d = mockHeartDialogue(c);
    d.line = "我想换个地方，跟你聊聊姐姐。";
    d.continuations = [{ speakerId: "player", line: "那你今天一点到雨宫家旧居，等我到三点，可以吗？", emotion: "询问" }];
    d.heart = { consequence: null, spendEventId: null, consequenceApplied: false, canContinue: true, choicePoint: null, actionPlan: null, pickups: [] };
    return d;
  }
}
const provider = new Provider({ fetchImpl: async (url, init) => {
  const response = await fetch(url, init);
  const json = await response.clone().json() as { choices?: { message: { content: string } }[] };
  responses.push(json.choices?.[0]?.message.content ?? "HTTP " + response.status);
  return response;
} });
if (!provider.getStatus().configured) throw new Error("需要本地 AI 配置");
const store = new MemoryGameStore(), game = new GameService(store, provider);
const record = ["# 行动计划 · 隔离定向验证", "", "前置两句为固定测试场景：小春想换地方聊，遥询问今天13:00在雨宫家旧居会面、等到15:00；之后由真实 AI 决定是否答应并生成计划。不是自然触发率测试，不修改玩家存档。", ""];
try {
  game.travel("loc_shrine"); game.startEncounter("npc_koharu");
  await game.startHeartEncounter(game.getState().revision);
  while (!dialoguePlaybackFinished(game.getState())) await game.nextDialogueBeat(game.getState().revision);
  provider.fixture = false; await game.useHeart(null, game.getState().revision);
  const dialogue = game.getState().currentDialogue!;
  record.push("## 真实回应", "", ...[dialogue, ...dialogue.continuations].map(b => `${b.speakerId}：${b.line}`), "");
  while (!dialoguePlaybackFinished(game.getState())) await game.nextDialogueBeat(game.getState().revision);
  const plan = game.getState().npcStates.npc_koharu.actionPlan;
  record.push("## 播放后计划", "", JSON.stringify(plan, null, 2));
  if (!plan) throw new Error("本次 AI 没有形成可执行计划；不宣称测试通过");
  await game.completeEncounter(); game.leaveLocation(); game.travel(plan.locationId);
  while (game.getState().currentMinute < plan.arriveAt % 1440) game.wait(30);
  const arrival = game.getState();
  if (arrival.npcStates.npc_koharu.currentLocationId !== plan.locationId) throw new Error("未按约抵达");
  game.startEncounter("npc_koharu");
  if (game.getState().npcStates.npc_koharu.actionPlan?.status !== "waiting") throw new Error("仅点击人物不应完成赴约");
  // Selecting gift locks the encounter without an extra AI request or item transfer.
  await game.selectInteractionMode("gift");
  if (game.getState().npcStates.npc_koharu.actionPlan?.status !== "completed") throw new Error("赴约没有完成");
  record.push("", "## 执行结果", "", "按时抵达→等待→点击人物仍waiting→选择送礼锁定会面→completed，全部通过；未实际交出礼物，不增加模型请求。", "",
    ...store.load()!.eventLog.filter(e => ["npc_moved", "action_plan_updated"].includes(e.type)).map(e => `${e.day}天 ${e.minute}分：${e.details.text}`));
} catch (e) { record.push("", "## 未通过", String(e)); process.exitCode = 1; }
finally {
  record.push("", "## 请求日志", JSON.stringify(provider.getLogs(), null, 2), "", "## 生成与审校原始候选", ...responses);
  const folder = fileURLToPath(new URL("../../对白测试记录/", import.meta.url)); mkdirSync(folder, { recursive: true });
  const path = folder + new Date().toISOString().replace(/[:.]/g, "-") + "_行动计划定向验证.md";
  writeFileSync(path, record.join("\n"), "utf8"); console.log(record.slice(0, record.indexOf("## 请求日志") - 1).join("\n")); console.log("RECORD_PATH=" + path);
}
