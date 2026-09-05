import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { demoBootstrap, type DialogueResult } from "../packages/shared/src/index.ts";
import { DialogueProviderRouter } from "../server/src/dialogueProvider.ts";
import { GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";

dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
const provider = new DialogueProviderRouter();
if (!provider.getStatus().configured) throw new Error("缺少本地 DeepSeek 配置，停止实测。");
const directory = new URL("../../对白测试记录/", import.meta.url);
// Keep previous captures; each run gets a unique file. Never touch the live SQLite save.
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = fileURLToPath(new URL(`${stamp}_自然对白V4实测.md`, directory));
mkdirSync(directory, { recursive: true });
const lines = ["# 自然对白 V4 实测原文", "", `记录时间：${new Date().toISOString()}`,
  `模型：${provider.getStatus().model}；提示词：${provider.getStatus().promptVersion}`, "",
  "每段返回仅记录一次。以下是独立内存存档的抽样实测，不操作网页存档，不代表全部路线。没有删改模型台词。", ""];
let count = 0;
function save() { writeFileSync(outputPath, lines.join("\n"), "utf8"); }
function record(title: string, dialogue: DialogueResult) {
  count++;
  lines.push(`### ${count}. ${title}`, "",
    `provider=${dialogue.debug.provider}；attempts=${dialogue.debug.attemptCount}；fallback=${dialogue.debug.fallbackReason ?? "无"}`, "");
  for (const beat of [{ ...dialogue }, ...dialogue.continuations]) {
    const name = beat.speakerId === demoBootstrap.player.id ? demoBootstrap.player.name
      : demoBootstrap.npcs.find((npc) => npc.id === (beat.speakerId ?? dialogue.speakerId))!.name;
    if (beat.stageDirection) lines.push(`*${beat.stageDirection}*`);
    lines.push(`${name}：${beat.line}`, "");
  }
  for (const option of dialogue.options) lines.push(`- ${option.text}｜${option.id}｜玩家首句：${option.playerLine}`);
  lines.push("");
  save();
  console.log(`${count}. ${title}: ${dialogue.debug.provider}`);
}
async function select(service: GameService, id: string, mode: "talk" | "gift" = "talk") {
  const option = service.getState().currentDialogue!.options.find((option) => option.id === id);
  if (!option) throw new Error(`缺少选项：${id}`);
  lines.push(`玩家点选并说：${option.playerLine ?? option.text}`, "");
  const result = mode === "talk" ? await service.chooseTalkOption(id) : await service.respondToGift(id);
  record("选择后的回应", result.state.currentDialogue!);
}
function start(npcId: string) {
  const service = new GameService(new MemoryGameStore(), provider);
  service.travel(demoBootstrap.npcs.find((npc) => npc.id === npcId)!.initialLocationId);
  service.startEncounter();
  return service;
}

for (const [npcId, first, second] of [
  ["npc_koharu", "ask_memory", "koharu_test_god"],
  ["npc_saya", "saya_open_press", "saya_ticket_doubt"],
  ["npc_genichi", "ask_gallery", "genichi_refuse_power"]
]) {
  const service = start(npcId!);
  record(`${npcId} 首见`, (await service.selectInteractionMode("talk")).state.currentDialogue!);
  await select(service, first!);
  await select(service, second!);
  if (npcId === "npc_koharu") {
    service.completeEncounter();
    service.waitUntilNight();
    service.changeRule("faith", "item_potato");
    await service.endDay();
    service.travel(service.getState().npcStates.npc_koharu!.currentLocationId);
    service.startEncounter();
    record("小春次日重访／土豆是神", (await service.selectInteractionMode("talk")).state.currentDialogue!);
    await select(service, "koharu_doubt_memory");
  }
}
for (const npcId of ["npc_koharu", "npc_saya", "npc_genichi"]) {
  const service = start(npcId);
  await service.selectInteractionMode("gift");
  record(`${npcId} 收到土豆`, (await service.confirmGift("item_potato")).state.currentDialogue!);
  await select(service, "gift_explain", "gift");
}
const logs = provider.getLogs();
lines.push("## 请求汇总", "", `独立对白请求数：${logs.length}；记录数：${count}。`,
  `DeepSeek 成功：${logs.filter((log) => log.success).length}；回退：${logs.filter((log) => !log.success).length}。`,
  "中文自然度、选项相关性与语义忠实度需人工复核，结构校验成功不代表质量合格。", "");
save();
console.log(outputPath);
