import type { GameState } from "../../packages/shared/src/index.ts";

export const MAX_ENCOUNTER_LINES = 24;
export const WIND_DOWN_LINES = 18;
export const MAX_ENCOUNTER_CHOICES = 5;

export function encounterPacing(state: GameState, hasSelectedLine: boolean) {
  let start = state.eventLog.length - 1;
  while (start > 0 && state.eventLog[start].type !== "encounter_started") start--;
  const events = state.eventLog.slice(Math.max(0, start)).filter(e => e.targetId === state.activeNpcId);
  const spoken = events.filter(e => e.type === "dialogue_generated").length;
  const choices = events.filter(e => e.type === "dialogue_choice").length;
  const remaining = Math.max(0, MAX_ENCOUNTER_LINES - spoken);
  const mustClose = spoken >= WIND_DOWN_LINES || remaining <= 6 || choices >= MAX_ENCOUNTER_CHOICES;
  const stage = mustClose ? "closing" : spoken >= 14 || choices >= 4 ? "winding_down" : "developing";
  // Reserve the next selected player line and one NPC farewell when continuing.
  // Old saves already over the limit receive one farewell rather than losing played dialogue.
  const maxGeneratedLines = Math.max(1, Math.min(5, remaining - Number(hasSelectedLine) - (mustClose ? 0 : 2)));
  return { maxLines: MAX_ENCOUNTER_LINES, windDownAt: WIND_DOWN_LINES, maxChoices: MAX_ENCOUNTER_CHOICES,
    spoken, choices, remaining, mustClose, stage, maxGeneratedLines };
}

const farewells: Record<string, { line: string; stageDirection: string; reason: string }> = {
  npc_koharu: { line: "……今天先说到这儿吧。我去把神社门口扫一扫，手里有点事做，好受些。",
    stageDirection: "吸了吸鼻子，伸手去拿扫帚。", reason: "嘴硬地借神社杂务缓缓情绪" },
  npc_saya: { line: "先到这儿。我得回去核对值班记录，不能一直把工作搁着。",
    stageDirection: "理齐记录页，把笔拿回手里。", reason: "回到值班工作，直接但不冷漠" },
  npc_genichi: { line: "今天就谈到这里。我还有画廊的账目要处理，恕不奉陪了。",
    stageDirection: "收起笑容，把文件夹转回自己面前。", reason: "用工作客气地结束追问，收回谈话主动权" },
  npc_ritsu: { line: "先放我回去理理报纸吧。光顾着聊天，报摊都快成纸山了。",
    stageDirection: "拍齐一摞报纸，朝你笑了笑。", reason: "用轻松玩笑结束交流，继续照看报摊" },
  npc_makoto: { line: "今天先说这些。我还有案卷要整理，不能光站在这儿说。",
    stageDirection: "把卷宗收拢，拿起桌上的笔。", reason: "回到警署事务，不擅自宣称新调查结果" },
  npc_mio: { line: "先聊到这里。我得整理诊所的记录了，问题不会因为我不吃不休息就自己有答案。",
    stageDirection: "合上记录本，揉了揉手腕。", reason: "用准确简短的口气回到诊所杂务" },
  npc_chiyo: { line: "今天先不说了。茶都凉透了，我去收拾收拾旅馆，总不能什么活都晾着。",
    stageDirection: "把茶杯拢进托盘，扶了一下桌沿。", reason: "用旅馆家务收住情绪，仍保留生活气" }
};

export function characterFarewell(state: GameState, npcId: string, acceptedAction = "") {
  if (state.npcStates[npcId].lifeState === "injured") return {
    line: "今天先说到这里吧。我得歇一会儿，缓过这阵再说。",
    stageDirection: "慢慢靠稳，停下来缓了口气。", reason: "受伤后需要休息，不走动、不假装康复"
  };
  if (npcId === "npc_makoto" && (state.pendingNpcMove?.npcId === npcId || acceptedAction === "protect")) return {
    line: "先说到这里。我得动身去接千代了，不能让她一直等着。",
    stageDirection: "收好笔，准备动身。", reason: "接续已经实际安排的保护任务"
  };
  return farewells[npcId];
}
