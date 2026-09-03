import {
  EndingResultSchema,
  demoBootstrap,
  type EndingResult,
  type GameState
} from "../../../packages/shared/src/index.ts";

export const ENDING_PROMPT_VERSION = "seven-day-ending-v2";

type EndingFactEntry = { id: string; text: string };

function itemName(itemId: string | null) {
  return demoBootstrap.items.find((item) => item.id === itemId)?.baseName ?? "未知物品";
}

function npcName(npcId: string | null) {
  return demoBootstrap.npcs.find((npc) => npc.id === npcId)?.name ?? "未知居民";
}

export function buildEndingPrompt(state: GameState) {
  const gifts = state.eventLog.filter(
    (event) => event.type === "item_transfer" && event.actorId === "player" && event.details.reason === "gift"
  );
  const ruleChanges = state.eventLog.filter((event) => event.type === "rule_changed");
  const storyBeats = state.eventLog.filter((event) => event.type === "story_beat");
  const npcActions = state.eventLog.filter((event) => event.type === "npc_action");
  const finalRules = Object.values(state.activeRules).filter((rule): rule is NonNullable<typeof rule> => Boolean(rule));

  const factSummary = {
    gifts: gifts.length
      ? gifts.map((event) => `第 ${event.day} 天，朝雾遥把“${itemName(event.itemId)}”送给${npcName(event.targetId)}。`)
      : ["七天里，朝雾遥没有把任何物品赠送给居民。"],
    rules: ruleChanges.length
      ? [
          ...ruleChanges.map((event) => `第 ${event.day} 天，${event.targetId === "faith" ? "信仰" : "审美"}被改写为“${event.details.display_text}”。`),
          `第七天结束时保留下来的规则：${finalRules.length ? finalRules.map((rule) => `“${rule.displayText}”`).join("、") : "没有规则"}。`
        ]
      : ["七天里，朝雾遥没有确认改写任何世界规则。"],
    relationships: demoBootstrap.npcs.map((npc) => {
      const relationship = state.npcStates[npc.id]?.relationship ?? 0;
      const description = relationship >= 2 ? "明显信任" : relationship === 1 ? "稍微信任" : relationship <= -2 ? "明显敌对" : relationship === -1 ? "有所戒备" : "保持距离";
      return `${npc.name}对朝雾遥${description}（关系值 ${relationship}）。`;
    }),
    storyBeats: storyBeats.length || npcActions.length
      ? [
          ...storyBeats.map((event) => event.details.summary).filter(Boolean),
          ...npcActions.map((event) => `第 ${event.day} 天，${npcName(event.actorId)}${event.details.action}`)
        ]
      : ["朝雾遥没有取得足以公开指认任何人的新证据。"]
  };

  const facts: EndingFactEntry[] = [
    ...gifts.map((event) => ({ id: event.id, text: factSummary.gifts[gifts.indexOf(event)]! })),
    ...ruleChanges.map((event) => ({ id: event.id, text: `第 ${event.day} 天改写规则：“${event.details.display_text}”。` })),
    ...storyBeats.map((event) => ({ id: event.id, text: event.details.summary })),
    ...npcActions.map((event) => ({
      id: event.id,
      text: `第 ${event.day} 天，${npcName(event.actorId)}采取行动：${event.details.action}`
    })),
    ...demoBootstrap.npcs.map((npc) => ({
      id: `REL_${npc.id}`,
      text: factSummary.relationships[demoBootstrap.npcs.indexOf(npc)]!
    })),
    ...demoBootstrap.npcs.map((npc) => ({
      id: `PERSONA_${npc.id}`,
      text: `${npc.name}眼前想做的事是“${npc.persona.immediateGoal}”；不能越过的底线是“${npc.persona.moralLine}”；掌握的秘密是“${npc.persona.secret}”。`
    })),
    ...demoBootstrap.npcs.map((npc) => ({
      id: `REFLECTION_${npc.id}`,
      text: `${npc.name}第七天前形成的认识：${state.npcStates[npc.id]?.reflection || "尚未因朝雾遥改变原有判断。"}`
    })),
    {
      id: "CASE_MAHIRU",
      text: "五年前，雨宫真昼拿着九条弦一交给她的黑色单程票，在水野纱夜于23:47打开零号站台后登上无名列车；第二天，全镇否认真昼存在。小春留有刻名猫铃，纱夜留有通行令复写纸、票根和真昼留言，弦一留有未裁切照片，并计划第七天重演神隐。"
    },
    { id: "FINAL_RULES", text: factSummary.rules.at(-1)! },
    { id: "PLAYER_GOAL", text: `朝雾遥的目标是：${demoBootstrap.player.coreDesire}` },
    { id: "PLAYER_MYSTERY", text: `起点谜团是：${demoBootstrap.player.startingMystery}` }
  ].filter((fact) => fact.text);

  const requiredFactIds = [
    gifts.at(-1)?.id,
    ruleChanges.at(-1)?.id,
    npcActions.at(-1)?.id,
    "CASE_MAHIRU",
    "FINAL_RULES"
  ].filter((id): id is string => Boolean(id));

  const system = `你是日式怪诞乡镇对话游戏《猫神町》的结局编剧。
只依据 supplied_facts 写第七天结局，不得新增亲属、死亡、犯罪真相、幕后神明、证人或未出现的物品。
不得擅自断定真昼已经死亡、平安归来、变成神，或某人最终登上列车；除非 supplied_facts 明确记录了该结果。允许把这些写成仍未解决的危险。
结局必须明确回收玩家实际做过的赠礼、最后保留的世界规则、NPC 已执行的行动，以及至少一段人物关系；若玩家没有做某类行动，就把“没有做”写成结果，不能替玩家补做。
主结局必须发生在第七天 17:47 前后的零号站台，至少出现黑票、通行令复写纸、猫铃、未裁切照片四项中的两项，并清楚写出谁拿出证据、谁阻止或推动列车、朝雾遥的选择造成什么后果。
基调可以温馨，也可以怪诞，可以狗血和互相揭短，但必须具体、有动作、有因果，避免哲学总结或报告口吻。禁止用“空位、存在、相信、意义、解释权”代替事件结果。
三名 NPC 各有一个结局段落，顺序固定为 npc_koharu、npc_saya、npc_genichi。
输出严格 JSON：
{
  "title": "不超过20字",
  "subtitle": "不超过40字",
  "narration": "220至500字的主结局",
  "npc_outcomes": [
    { "npc_id": "npc_koharu", "headline": "不超过14字", "text": "60至150字" },
    { "npc_id": "npc_saya", "headline": "不超过14字", "text": "60至150字" },
    { "npc_id": "npc_genichi", "headline": "不超过14字", "text": "60至150字" }
  ],
  "closing_line": "一句留有余味的收束",
  "used_fact_ids": ["实际使用的事实ID"]
}
used_fact_ids 只能取 supplied_facts 中的 id，并必须包含 required_fact_ids。`;

  const user = JSON.stringify({
    final_day: 7,
    active_rules: finalRules.map((rule) => rule.displayText),
    story_flags: state.storyFlags,
    required_fact_ids: requiredFactIds,
    supplied_facts: facts
  }, null, 2);

  return {
    system,
    user,
    facts,
    factSummary,
    requiredFactIds
  };
}

export function createFallbackEnding(state: GameState): EndingResult {
  const built = buildEndingPrompt(state);
  const giftLine = built.factSummary.gifts[0]!;
  const ruleLine = built.factSummary.rules.at(-1)!;
  const hasRule = Object.values(state.activeRules).some(Boolean);
  const finalFaith = state.activeRules.faith?.displayText ?? "没有谁被正式称作神";
  const actionLine = built.factSummary.storyBeats.at(-1)!;

  return EndingResultSchema.parse({
    title: hasRule ? `第七日：${finalFaith}` : "第七日：零号站台",
    subtitle: "17:47，黑票、旧命令和被裁掉的人终于摆上同一张长椅。",
    narration: `17:47，零号站台的铁门升到一半便卡住。小春把刻着“真昼”的猫铃系在门链上，纱夜将盖有九条家印章的通行令复写纸压在长椅中央，弦一则举起那张没有裁掉真昼面孔的祭典照片。${giftLine}${ruleLine}${actionLine} 黑票仍在三人之间传递，却再也不能被说成普通失物。小春当众叫出姐姐的全名，纱夜承认五年前是自己开的门，弦一没有道歉，只追问朝雾遥敢不敢让今天的神名承担下一次登车。站台广播响起时，没有人替朝雾遥补上选择；已经公开的证据，却让这场重演无法再像五年前一样悄无声息。`,
    npcOutcomes: [
      {
        npcId: "npc_koharu",
        headline: "真昼被叫出姓名",
        text: `${finalFaith}生效后，小春把神名和“雨宫真昼，十八岁”印在同一张寻人启事上。她没有得到姐姐归来的保证，却让车站里每个人都必须当着猫铃读出真昼的姓名。`
      },
      {
        npcId: "npc_saya",
        headline: "开门的人公开作证",
        text: "纱夜把伪造的值班记录和通行令复写纸并排钉上公告板，签下自己的姓名。她仍可能失去工作，但零号站台再次开门时，所有人都知道该先去找谁追责。"
      },
      {
        npcId: "npc_genichi",
        headline: "重演被迫曝光",
        text: "弦一准备好的第二张黑票没能秘密送出。未裁切照片和九条家印章同时出现在人群面前，他仍把这称作最精彩的一幕，却第一次无法决定谁站在画面中央。"
      }
    ],
    closingLine: "广播第三次催促上车时，猫铃先响了。",
    provider: "mock_fallback",
    promptVersion: ENDING_PROMPT_VERSION,
    factSummary: built.factSummary,
    usedEventIds: built.requiredFactIds
  });
}
