import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  demoBootstrap,
  resolvePlayerLine,
  type DialogueOption,
  type DialogueResult,
  type GameState,
  type Item,
  type Npc
} from "../packages/shared/src/index.ts";
import { DialogueProviderRouter } from "../server/src/dialogueProvider.ts";
import { GameService } from "../server/src/gameService.ts";
import { MemoryGameStore, type GameStore } from "../server/src/persistence.ts";

dotenv.config({
  path: fileURLToPath(new URL("../server/.env.local", import.meta.url)),
  quiet: true
});

const outputPath = fileURLToPath(new URL(
  "../../对白测试记录/2026-09-03_Agent重构完整行程.md",
  import.meta.url
));

type TalkRoute = {
  id: string;
  label: string;
  npcId: string;
  optionIds: string[];
};

type GiftRoute = {
  id: string;
  label: string;
  npcId: string;
  itemId: string;
  optionId: string;
};

const talkRoutes: TalkRoute[] = [
  { id: "K-1", label: "核对真昼身份并结盟", npcId: "npc_koharu", optionIds: ["ask_memory", "koharu_guard_memory"] },
  { id: "K-2", label: "调查神社后殿与纱夜", npcId: "npc_koharu", optionIds: ["koharu_ask_god", "koharu_test_god"] },
  { id: "K-3", label: "寻找目击者并质问九条", npcId: "npc_koharu", optionIds: ["koharu_doubt_memory", "koharu_leave_empty"] },
  { id: "S-1", label: "确认乘客、查命令、接管黑票", npcId: "npc_saya", optionIds: ["saya_open_gentle", "saya_ticket_inspect", "saya_truth_plain", "saya_take_ticket"] },
  { id: "S-2", label: "追责开门、拆穿伪造、要求备份", npcId: "npc_saya", optionIds: ["saya_open_press", "saya_ticket_doubt", "saya_bluff_bell", "saya_report_ticket"] },
  { id: "S-3", label: "荒诞试探、暂时结盟、当面找九条", npcId: "npc_saya", optionIds: ["saya_open_absurd", "saya_ticket_ally", "saya_personal_probe", "saya_leave_ticket"] },
  { id: "G-1", label: "查未裁切照片并公开对抗", npcId: "npc_genichi", optionIds: ["ask_gallery", "genichi_refuse_power"] },
  { id: "G-2", label: "追问给票理由并危险合作", npcId: "npc_genichi", optionIds: ["genichi_ask_power", "genichi_play_along"] },
  { id: "G-3", label: "拒绝演出并拆穿替身计划", npcId: "npc_genichi", optionIds: ["disagree", "ask_player"] }
];

const giftRoutes: GiftRoute[] = [
  { id: "L-1", label: "土豆送给小春", npcId: "npc_koharu", itemId: "item_potato", optionId: "gift_explain" },
  { id: "L-2", label: "猫铃送给小春", npcId: "npc_koharu", itemId: "item_cat_bell", optionId: "gift_ask_use" },
  { id: "L-3", label: "车票送给纱夜", npcId: "npc_saya", itemId: "item_ticket", optionId: "gift_ask_use" },
  { id: "L-4", label: "名牌送给纱夜", npcId: "npc_saya", itemId: "item_name_tag", optionId: "gift_silence" },
  { id: "L-5", label: "照片送给弦一", npcId: "npc_genichi", itemId: "item_photo", optionId: "gift_silence" },
  { id: "L-6", label: "线团送给弦一", npcId: "npc_genichi", itemId: "item_thread", optionId: "gift_explain" }
];

const provider = new DialogueProviderRouter();
const providerStatus = provider.getStatus();
if (!providerStatus.configured) {
  throw new Error("server/.env.local 未配置 DEEPSEEK_API_KEY，无法记录真实模型基线。");
}

const lines: string[] = [];
const selectedTalkOptionIds = new Set<string>();
const recordedGiftItemIds = new Set<string>();
const providerCounts: Record<string, number> = {};
let dialogueSegmentCount = 0;
let journeyCount = 0;

function npcById(npcId: string) {
  return demoBootstrap.npcs.find((npc) => npc.id === npcId)!;
}

function itemById(itemId: string) {
  return demoBootstrap.items.find((item) => item.id === itemId)!;
}

function speakerName(speakerId: string | undefined, npc: Npc) {
  if (speakerId === demoBootstrap.player.id || speakerId === "player") return demoBootstrap.player.name;
  return npc.name;
}

function recordDialogue(dialogue: DialogueResult, npc: Npc, selectedOptionId?: string) {
  dialogueSegmentCount += 1;
  providerCounts[dialogue.debug.provider] = (providerCounts[dialogue.debug.provider] ?? 0) + 1;
  const beats = [
    {
      speakerId: dialogue.speakerId,
      line: dialogue.line,
      stageDirection: dialogue.stageDirection,
      emotion: dialogue.emotion
    },
    ...dialogue.continuations
  ];

  for (const beat of beats) {
    if (beat.stageDirection) lines.push(`*${beat.stageDirection}*`);
    lines.push(`**${speakerName(beat.speakerId, npc)}〔${beat.emotion}〕：** ${beat.line}`);
    lines.push("");
  }

  lines.push(`> 生成记录：provider=${dialogue.debug.provider}；prompt=${dialogue.debug.promptVersion ?? "mock"}；fallbackReason=${dialogue.debug.fallbackReason ?? "无"}；usedFacts=${dialogue.debug.usedFacts.join(", ") || "无"}`);
  lines.push(`> 场景目标：${dialogue.debug.sceneGoal ?? "无"}`);
  lines.push(`> NPC 行动：${dialogue.debug.npcActionId ?? "无"}｜${dialogue.debug.npcAction ?? "无"}`);
  lines.push(`> 记忆候选：${dialogue.debug.memoryCandidate ?? "无"}`);
  lines.push(`> 反思候选：${dialogue.debug.reflectionCandidate ?? "无"}`);
  lines.push("");
  if (dialogue.options.length > 0) {
    lines.push("**本决策点的全部候选项：**");
    lines.push("");
    for (const option of dialogue.options) {
      const marker = option.id === selectedOptionId ? "→ 本行程选择" : "○ 未选择";
      lines.push(`- ${marker}｜${option.text}｜\`${option.id}\`｜完整台词：${resolvePlayerLine(option)}`);
    }
    lines.push("");
  } else {
    lines.push("**本段没有后续选项。**");
    lines.push("");
  }
}

function recordSelectedPlayerLine(option: DialogueOption) {
  lines.push(`**${demoBootstrap.player.name}〔所选完整台词〕：** ${resolvePlayerLine(option)}`);
  lines.push("");
}

function createSeededService(item?: Item) {
  const initial = new GameService(new MemoryGameStore()).getState();
  if (item) initial.itemOwners[item.id] = "player";
  class SeededStore implements GameStore {
    private state: GameState | null = structuredClone(initial);
    load() { return this.state ? structuredClone(this.state) : null; }
    save(state: GameState) { this.state = structuredClone(state); }
  }
  return new GameService(new SeededStore(), provider);
}

async function recordTalkRoute(route: TalkRoute) {
  journeyCount += 1;
  const npc = npcById(route.npcId);
  const service = createSeededService();
  lines.push(`## 行程 ${route.id}｜${npc.name}｜${route.label}`);
  lines.push("");
  lines.push(`- 初始条件：第 1 天 09:00；无世界规则；首次见面；关系值 0；地点 ${demoBootstrap.locations.find((location) => location.id === npc.initialLocationId)!.name}`);
  lines.push(`- 固定选择序列：${route.optionIds.map((id) => `\`${id}\``).join(" → ")}`);
  lines.push("");

  service.travel(npc.initialLocationId);
  service.startEncounter();
  let response = await service.selectInteractionMode("talk");
  for (let index = 0; index < route.optionIds.length; index += 1) {
    const optionId = route.optionIds[index]!;
    const dialogue = response.state.currentDialogue!;
    const selected = dialogue.options.find((option) => option.id === optionId);
    if (!selected) throw new Error(`${route.id} 在决策点 ${index + 1} 缺少选项 ${optionId}`);
    lines.push(`### 决策点 ${index + 1}`);
    lines.push("");
    recordDialogue(dialogue, npc, optionId);
    recordSelectedPlayerLine(selected);
    selectedTalkOptionIds.add(optionId);
    response = await service.chooseTalkOption(optionId);
    lines.push(`### 选择后的完整回应 ${index + 1}`);
    lines.push("");
    recordDialogue(response.state.currentDialogue!, npc);
    if (response.acquiredItemId) {
      lines.push(`> 系统：获得“${itemById(response.acquiredItemId).baseName}”。`);
      lines.push("");
    }
  }
  lines.push("---");
  lines.push("");
  console.log(`[${journeyCount}/${talkRoutes.length + giftRoutes.length + 1}] ${route.id} ${npc.name}`);
}

async function recordGiftRoute(route: GiftRoute) {
  journeyCount += 1;
  const npc = npcById(route.npcId);
  const item = itemById(route.itemId);
  const service = createSeededService(item);
  lines.push(`## 行程 ${route.id}｜赠礼｜${route.label}`);
  lines.push("");
  lines.push(`- 初始条件：第 1 天；无世界规则；${item.baseName}位于玩家背包；关系值 0；首次赠送给${npc.name}`);
  lines.push(`- 物品资料：${item.baseName}／${item.category}／${item.baseUse}／状态 ${item.condition}`);
  lines.push("");

  service.travel(npc.initialLocationId);
  service.startEncounter();
  await service.selectInteractionMode("gift");
  let response = await service.confirmGift(item.id);
  const opening = response.state.currentDialogue!;
  const selected = opening.options.find((option) => option.id === route.optionId);
  if (!selected) throw new Error(`${route.id} 缺少赠礼选项 ${route.optionId}`);
  lines.push("### 礼物交出后的开场与决策点");
  lines.push("");
  recordDialogue(opening, npc, route.optionId);
  recordSelectedPlayerLine(selected);
  recordedGiftItemIds.add(item.id);
  response = await service.respondToGift(route.optionId);
  lines.push("### 选择后的完整回应");
  lines.push("");
  recordDialogue(response.state.currentDialogue!, npc);
  lines.push("---");
  lines.push("");
  console.log(`[${journeyCount}/${talkRoutes.length + giftRoutes.length + 1}] ${route.id} ${route.label}`);
}

async function recordCrossDayJourney() {
  journeyCount += 1;
  const service = createSeededService();
  lines.push("## 行程 M-1｜三人首见、规则改写与第二天重访");
  lines.push("");
  lines.push("- 初始条件：第 1 天 09:00；无规则、无人物记忆。");
  lines.push("- 第一天依次选择：小春 `ask_memory`；纱夜 `saya_open_gentle`；弦一 `ask_gallery`。");
  lines.push("- 18:00 把土豆写入信仰槽，使“土豆是神”生效；第二天按新作息依次重访三人。");
  lines.push("");

  const dayOneSelections: Record<string, string> = {
    npc_koharu: "ask_memory",
    npc_saya: "saya_open_gentle",
    npc_genichi: "ask_gallery"
  };
  for (const npc of demoBootstrap.npcs) {
    lines.push(`### 第一天｜${npc.name}`);
    lines.push("");
    service.travel(npc.initialLocationId);
    service.startEncounter();
    let response = await service.selectInteractionMode("talk");
    const optionId = dayOneSelections[npc.id]!;
    const selected = response.state.currentDialogue!.options.find((option) => option.id === optionId)!;
    recordDialogue(response.state.currentDialogue!, npc, optionId);
    recordSelectedPlayerLine(selected);
    response = await service.chooseTalkOption(optionId);
    recordDialogue(response.state.currentDialogue!, npc);
    service.completeEncounter();
  }

  const ruleResponse = service.changeRule("faith", "item_potato");
  lines.push("### 第一夜｜世界规则改写");
  lines.push("");
  lines.push(`**系统：** ${ruleResponse.notice}`);
  lines.push("");
  for (const npc of demoBootstrap.npcs) {
    const callback = ruleResponse.state.npcStates[npc.id]!.memories.filter((memory) => memory.kind === "rule_callback").at(-1)!;
    lines.push(`- ${npc.name}：${callback.summary}`);
  }
  lines.push("");
  await service.endDay();

  const dayTwoSelections: Record<string, string> = {
    npc_koharu: "koharu_ask_god",
    npc_saya: "saya_open_press",
    npc_genichi: "genichi_ask_power"
  };
  for (const npc of demoBootstrap.npcs) {
    const locationId = service.getState().npcStates[npc.id]!.currentLocationId;
    lines.push(`### 第二天重访｜${npc.name}｜${demoBootstrap.locations.find((location) => location.id === locationId)!.name}`);
    lines.push("");
    lines.push(`- 会面前记忆数：${service.getState().npcStates[npc.id]!.memories.length}；关系值：${service.getState().npcStates[npc.id]!.relationship}`);
    lines.push("");
    service.travel(locationId);
    service.startEncounter();
    let response = await service.selectInteractionMode("talk");
    const optionId = dayTwoSelections[npc.id]!;
    const selected = response.state.currentDialogue!.options.find((option) => option.id === optionId)!;
    recordDialogue(response.state.currentDialogue!, npc, optionId);
    recordSelectedPlayerLine(selected);
    response = await service.chooseTalkOption(optionId);
    recordDialogue(response.state.currentDialogue!, npc);
    service.completeEncounter();
  }
  lines.push("---");
  lines.push("");
  console.log(`[${journeyCount}/${talkRoutes.length + giftRoutes.length + 1}] M-1 跨日记忆与规则`);
}

const generatedAt = new Date().toISOString();
lines.push("# 《猫神町》Agent 对话重构完整行程记录");
lines.push("");
lines.push("> 文档性质：Agent 重构后的真实模型输出纯记录，不包含质量评价、问题归因或 Prompt 修改建议。");
lines.push(">");
lines.push(`> 记录时间：${generatedAt}`);
lines.push(">");
lines.push(`> 模型：${providerStatus.model}`);
lines.push(`> Prompt：${providerStatus.promptVersion}`);
lines.push("");
lines.push("## 记录边界");
lines.push("");
lines.push("- 每条行程使用独立的新游戏状态，除 M-1 跨日行程外不共享记忆。");
lines.push("- 交谈行程用三条互斥路线覆盖三名 NPC 当前全部固定选项 ID；每个决策点同时记录当时出现的全部候选项与本行程所选项。");
lines.push("- 赠礼行程覆盖 6 件物品、3 名 NPC 与 3 种赠礼后态度；未穷举“每件物品 × 每名 NPC × 每种态度”的全部排列。");
lines.push("- AI 文本具有随机性。本文记录的是本次实际返回，不代表同一状态下唯一可能的措辞。");
lines.push("- 文档不记录 API Key、完整系统提示词或隐藏推理。");
lines.push("");
lines.push("## 行程索引");
lines.push("");
lines.push("| 编号 | 类型 | 对象 | 固定路线 |\n| --- | --- | --- | --- |");
for (const route of talkRoutes) {
  lines.push(`| ${route.id} | 交谈 | ${npcById(route.npcId).name} | ${route.label} |`);
}
for (const route of giftRoutes) {
  lines.push(`| ${route.id} | 赠礼 | ${npcById(route.npcId).name}／${itemById(route.itemId).baseName} | ${route.label} |`);
}
lines.push("| M-1 | 跨日 | 三人 | 首见 → 土豆是神 → 第二天重访 |");
lines.push("");

for (const route of talkRoutes) await recordTalkRoute(route);
for (const route of giftRoutes) await recordGiftRoute(route);
await recordCrossDayJourney();

const expectedTalkOptionIds = new Set(talkRoutes.flatMap((route) => route.optionIds));
lines.push("## 记录汇总");
lines.push("");
lines.push(`- 行程数量：${journeyCount}`);
lines.push(`- 生成对白段数量：${dialogueSegmentCount}`);
lines.push(`- 交谈固定选项覆盖：${selectedTalkOptionIds.size}/${expectedTalkOptionIds.size}`);
lines.push(`- 赠礼物品覆盖：${recordedGiftItemIds.size}/${demoBootstrap.items.length}`);
lines.push(`- Provider 分布：${Object.entries(providerCounts).map(([name, count]) => `${name}=${count}`).join("；")}`);

mkdirSync(fileURLToPath(new URL("../../对白测试记录/", import.meta.url)), { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`记录完成：${outputPath}`);
