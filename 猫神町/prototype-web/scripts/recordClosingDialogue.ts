import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { createInitialState } from "../server/src/gameService.ts";
import { CaseDialogueProvider, buildCasePrompt, type CaseContext } from "../server/src/caseProvider.ts";
import { demoBootstrap } from "../packages/shared/src/index.ts";

dotenv.config({ path: fileURLToPath(new URL("../server/.env.local", import.meta.url)), quiet: true });
const provider = new CaseDialogueProvider();
const records = ["# 会面收尾专项：真实模型抽样", "", "前文为构造的隔离测试上下文（不是完整真实游玩记录），用于直接检查第18句后的收尾。只在内存中生成，不改网页存档。", ""];
for (const npcId of ["npc_koharu", "npc_ritsu"]) {
  const state = createInitialState();
  state.phase = "encounter"; state.activeNpcId = npcId; state.interactionMode = "talk";
  state.currentLocationId = state.npcStates[npcId].currentLocationId;
  const name = demoBootstrap.npcs.find(n => n.id === npcId)!.name;
  const preceding = npcId === "npc_koharu" ? [
    "她给我们俩都买了车票。", "我叫她自己走，现在想起来真想打自己一巴掌。", "……我有点说不下去了。"
  ] : ["那份旧报是我写的，你要问就当面问。", "报摊上的旧报还放着。", "你也别光顾着问我，我这儿还一堆事呢。"];
  const add = (type: "encounter_started" | "dialogue_generated", text: string) => {
    const sequence = state.eventLog.length;
    state.eventLog.push({ id: "closing_test_" + sequence, sequence, type, actorId: npcId, targetId: npcId,
      day: 1, period: "morning", minute: 660, locationId: state.currentLocationId,
      itemId: null, audience: ["player", npcId], details: { text: name + "：" + text } });
  };
  add("encounter_started", "开始会面。");
  for (let i = 0; i < 18; i++) add("dialogue_generated", preceding[Math.floor(i / 6)]);
  state.npcStates[npcId].memories = preceding.map((summary, i) => ({
    id: "closing_memory_" + i, npcId, kind: "dialogue", summary, interpretation: "已在眼前说过",
    sourceEventId: "closing_test_" + (i * 6 + 1), createdDay: 1, confidence: "certain", importance: 5, tags: []
  }));
  const context: CaseContext = { state, npcId, mode: "talk", giftItem: null, effect: "",
    selectedOption: { id: "closing_reply", text: npcId === "npc_koharu" ? "别勉强自己。" : "那不耽误你了。", intent: "体谅对方，准备结束会面" } };
  const result = await provider.generate(context);
  records.push("## " + name, "", "构造前文：" + preceding.join(" / "), "玩家本句：" + context.selectedOption!.text,
    "预算：" + JSON.stringify(JSON.parse(buildCasePrompt(context).user).conversation_pacing),
    "结果：" + result.debug.provider, "",
    ...[{ speakerId: npcId, line: result.line, stageDirection: result.stageDirection }, ...result.continuations]
      .map(b => (b.speakerId === "player" ? "遥" : name) + "：" + b.line + (b.stageDirection ? "（" + b.stageDirection + "）" : "")),
    "", "选项数：" + result.options.length, "");
  process.stdout.write(name + ": " + result.debug.provider + ", options=" + result.options.length + "\n");
}
records.push("## 请求结果", "", JSON.stringify(provider.getLogs().map(l => ({ npcId: l.npcId, mode: l.mode, success: l.success, error: l.errorCode, attempts: l.attemptCount })), null, 2));
const folder = fileURLToPath(new URL("../../对白测试记录/", import.meta.url));
mkdirSync(folder, { recursive: true });
const path = folder + new Date().toISOString().replace(/[:.]/g, "-") + "_会面收尾专项.md";
writeFileSync(path, records.join("\n"), "utf8");
process.stdout.write("RECORD_PATH=" + path + "\n");
