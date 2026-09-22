import { demoBootstrap, type GameState, type RuleReaction } from "../../packages/shared/src/index.ts";

// Character lenses, not scripts or automatic rewards. The generator combines
// these with the current concept, occupation, actual knowledge and player reply.
const lenses: Record<string, string> = {
  npc_koharu: "把神当作可以认真求助、也应该承担责任的对象。会保护神圣之物，但不接受一句神意就把姐姐的事揭过去；可以请求遥一起保管、核对或约见，不强制每次谈姐姐。",
  npc_saya: "先考虑车站工作中的秩序、保管和通行。承认神圣性，但会追问具体怎么做才不损害职责；审美会影响她如何展示和解释记录，不能更改记录内容。",
  npc_genichi: "关心谁有权解释神圣和美，尝试把新规则变成声誉、展示方式或谈判条件；允许被遥质疑，不凭空获得资金、物品或镇民服从。",
  npc_ritsu: "以记者身份关心怎样讲述新神、谁会相信自己的说法。可以借新规则试探遥的立场或提出交换；不因信仰自动坦白，不凭空刊发报道或知道别人私聊。",
  npc_makoto: "在公共规则与办事责任之间寻找具体界限。可能要求把对神的指责与可核实证据分开，或决定按已有权限核查、保护；信仰不是新增法律，不能凭空逮捕或定罪。",
  npc_mio: "承认神圣与审美的社会意义，同时坚持诊疗和记录的事实边界。关心敬奉方式是否伤害活人，可提出具体限制或核对要求；不能把神意当医学结论。",
  npc_chiyo: "从吃饭、招待、照料和护短理解神圣与美。新规则应让她面临一种具体的日常取舍，并向遥提出请求或作决定；不能编造厨房库存、既成禁令或过去事故。"
};

export const RULE_REACTION_GUIDANCE = [
  "world_rules是全镇当前承认的公共规则，不是传闻或玩家的个人说法。faith改变神圣性，beauty改变审美，审美不等于宗教禁忌。规则不改变历史、物理规律或已确定案情；神圣对象也不等于现场多出一个神明实体。",
  "按world_rules.npc_lens、概念含义、职业、欲望和眼前问题表现差异：让规则改变一项具体要求、交换条件、判断或决定。不能只复述‘某某是神/是美的’、泛泛惊讶、祈祷或插一句口号后继续原话题。不必机械套人物示例，也不把不同概念都写成保护供物。",
  "新规则尚未回应时，在自然开场把一条规则落到当前生活或关系，让玩家有回应余地；正常介绍可以与它结合。先回应玩家已选态度、材料或礼物，紧急事件与收尾优先。已回应的规则延续已说出的立场和要求，不反复首次震惊、不每轮点名神明。两槽同时变化时一次重点处理一条。",
  "由新信仰或审美产生的具体要求、条件、当下决定本身就是剧情推进，不必强行接出一条新案情。玩家的心绪态度可以使NPC坚持、调整或撤回要求；不是每张牌必定有利，也不是神明强迫所有人同意。新规则替换旧规则后，旧反应是实际历史，不再当作现行规范。",
  "可执行的材料、整理、暂停、案件行动和赴约必须走已有能力与consequence/action_plan（普通对白使用action_catalog/accept_action），符合各自条件并在对应台词播放时生效。口头请求或意向不等于执行；不能凭空声称已祭祀、囤积、移动物品、封路、施法或改写证据。没有合适能力时先形成具体请求或决定，不制造空奖励。",
  '涉及规则的新立场或变更时输出rule_reactions数组，每项为{"ruleId":"world_rules.active中的id","beatIndex":NPC台词索引,"quote":"该句连续原文","stance":"该人物对规则的具体理解","demand":"该句实际提出的要求、条件或决定"}。只能概括已写出的公开台词，不填内心秘密或未发生后果。索引从本次生成首句0开始。required_rule_id非空时必须回应该规则；无相关新反应时数组为空。程序在这句实际显示后才记录，未播不算发生。'
].join("\n");

export const RULE_REVIEW_GUIDANCE = "world_rules中的信仰与审美是已生效的公共规则。因规则产生的具体日常请求、条件或决定也是有效剧情推进，不因没有新案情而判off_topic。rule_reactions须由对应NPC台词支持，stance/demand不得补出秘密或未表达的决定；仅喊神名、泛泛感叹却声称已形成具体要求，用off_topic指出。规则不改历史，不证明罪行，不执行未声明操作，不能把审美当强制宗教禁令。";

export function ruleContext(state: GameState, npcId: string, requireNew = false) {
  const history = state.eventLog.filter(e => e.type === "rule_callback" && e.actorId === npcId && e.audience.includes(npcId));
  const active = Object.values(state.activeRules).filter(r => r !== null).map(rule => {
    const change = state.eventLog.slice().reverse().find(e => e.type === "rule_changed" && e.day === rule.activatedDay &&
      (e.details.slotId ? e.details.slotId === rule.slotId && e.details.conceptId === rule.conceptId : e.details.text === rule.displayText));
    const id = `${rule.slotId}:${change?.id ?? `${rule.activatedDay}:${rule.conceptId}:${rule.carrierItemId}`}`;
    const reactions = history.filter(e => e.details.ruleId === id);
    return { id, slot: rule.slotId, rule: rule.displayText,
      concept: demoBootstrap.concepts.find(c => c.id === rule.conceptId)?.label,
      carrier: demoBootstrap.items.find(i => i.id === rule.carrierItemId)?.baseName,
      activated_day: rule.activatedDay, needs_response: reactions.length === 0,
      previous_responses: reactions.slice(-3).map(e => ({ stance: e.details.stance, demand: e.details.demand, quote: e.details.quote })) };
  });
  return { active, npc_lens: lenses[npcId] ?? "从本人职业、欲望与实际处境理解规则。",
    required_rule_id: requireNew ? active.find(r => r.needs_response)?.id ?? null : null,
    past_responses: history.slice(-6).map(e => ({ ruleId: e.details.ruleId, text: e.details.text, day: e.day })) };
}

export function validRuleReactions(reactions: RuleReaction[], state: GameState, npcId: string,
  beats: { speakerId: string; line: string }[], requireNew = false): boolean {
  const context = ruleContext(state, npcId, requireNew);
  return new Set(reactions.map(r => r.ruleId)).size === reactions.length &&
    (!context.required_rule_id || reactions.some(r => r.ruleId === context.required_rule_id)) &&
    reactions.every(r => context.active.some(a => a.id === r.ruleId) && beats[r.beatIndex]?.speakerId === npcId && beats[r.beatIndex].line.includes(r.quote));
}
