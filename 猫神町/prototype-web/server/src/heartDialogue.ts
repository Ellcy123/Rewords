import { z } from "zod";
import { RuleReactionSchema, ActionPlanProposalSchema, HeartConsequenceSchema, DialogueResultSchema, HeartKindSchema, heartCatalog, demoBootstrap, separateDialogueText, type DialogueResult, type HeartKind } from "../../packages/shared/src/index.ts";
import { heartCapabilities, heartMeetingWindow, validHeartConsequence, validConsequenceBeats } from "./heartConsequences.ts";
import { validMeetingPlan } from "./actionPlans.ts";
import { gameTimeLabel } from "./actionPlans.ts";
import { characterFarewell, encounterPacing } from "./dialoguePacing.ts";
import { SPARSE_NARRATION_GUIDANCE } from "./narrationPrompt.ts";
import type { CaseContext } from "./caseProvider.ts";

import { ruleContext, validRuleReactions, RULE_REACTION_GUIDANCE } from "./ruleReactions.ts";

export const HEART_PROMPT_VERSION = "shixu-v26-corrective-review";
export const HEART_REPLY_VOICE = "遥的出牌首句会先给玩家预览，确认后逐字播放。写成一句玩家愿意点的、有个性的自然回应，尽量12至40个汉字，允许必要时更长。优先从眼前物件、对方刚说的话或已发生的事里找梗：机智回扣、轻吐槽、一本正经的荒诞比喻、紧张时的自嘲；句子先回应眼前问题，再让包袱落在合适处。恐惧保留真实迟疑，同情先接住难处，爱意表达具体亲近，不写成三种同义安慰。梗不依赖流行语堆砌，不用解释笑点，不每句强行抖包袱；面对丧亲、伤害或认真求助时克制，不拿死者和对方痛处开玩笑，不编造往事或未知案情。首句必须有独立可读的台词，不把全部态度藏在动作里。";
// Generator-only semantic guidance; the content reviewer never decides choice timing.
export const HEART_CHOICE_GUIDANCE = [
  "先逐句判断是否出现值得玩家介入的情绪回应机会，再决定是否让遥接话。自责中寻求回应、试探信任、关系靠近或边界、情绪冲突，若不同态度会让当下交流走向不同，应优先停给玩家。无需重大剧情分岔、正式请求或问号；‘我连对不起都没说出口’也可能是在向眼前的人求回应，结合语境判断。",
  "例如NPC说‘要是那天我没吼她，她是不是就不会走那条路？’，这是自责求回应，应在这句停下并设置choice_point，而不是继续写遥‘那不是你的错’。这只是判断示例，不能照搬成固定剧情。‘你也不相信我？’‘你会留下来陪我吗？’等也应结合信任与关系语境优先交给玩家。",
  "普通事实询问、寒暄、自然接话仍可自由进行，单纯有情绪或问号不等于表态节点。不按句数或每段结束硬造节点，也不默认choice_point=null；不要把普通续聊授权理解为可以替玩家跨过新出现的重要回应机会。",
  "pending_choice是上一段已经呈现的节点：本次出牌或listen已经授权遥回答它，应该自然接住，不重复征询同一问题。之后只有出现新的、实质不同的情绪机会才再停。mustClose=true时正常告别，不强造新节点。",
  "已选态度的自然延续不是新节点：NPC因刚才的回应说‘真的？’‘谢谢你’，遥再确认、安慰或说‘我会陪你’，都可以顺着演完。不因遥可能作出承诺而倒推上一句普通道谢必须选牌。只有NPC实际引入新的期待、风险、立场或关系边界，才判断新的表态机会。"
].join("\n");
export type HeartContext = CaseContext & { heartIntent: "opening" | "listen" | HeartKind };
const HeartBeat = z.object({
  speaker: z.enum(["npc", "player"]), line: z.string().trim().min(1).max(120),
  stage_direction: z.string().max(240).default(""),
  // A display caption is not an emotion-card award or a fact. Missing captions
  // must not discard usable dialogue; pickup provenance is validated separately.
  emotion: z.preprocess(value => value === null || typeof value === "string" && !value.trim() ? undefined : value,
    z.string().trim().min(1).max(20).default("交谈"))
});
export const HeartDraft = z.object({
  rule_reactions: z.array(RuleReactionSchema).max(2).optional(),
  consequence: HeartConsequenceSchema.nullable().default(null),
  action_plan: ActionPlanProposalSchema.nullable().default(null),
  beats: z.array(HeartBeat).min(1).max(12), can_continue: z.boolean(),
  choice_point: z.object({ quote: z.string().min(1).max(120), reason: z.string().min(1).max(160) }).nullable(),
  closing_reason: z.string().max(120).default(""), used_fact_ids: z.array(z.string()).max(12).default([]),
  disclosed_fact_ids: z.array(z.string()).max(12).default([]),
  disclosures: z.array(z.object({ fact_id: z.string().min(1), beat_index: z.number().int().min(0).max(11) })).max(12).default([]),
  progress: z.object({
    type: z.enum(["reveal", "contradiction", "request", "deal", "decision", "threat", "action", "transition"]),
    summary: z.string().trim().min(4).max(160)
  }).default({ type: "transition", summary: "回应眼前交流" }),
  pickup: z.object({ beat_index: z.number().int().min(0).max(11), kind: HeartKindSchema, quote: z.string().min(1).max(180) }).nullable().default(null)
});
export type HeartDraftData = z.infer<typeof HeartDraft>;
export class HeartDraftValidationError extends Error {
  constructor(code: string, readonly repairHint: string) { super(code); }
}
export const isHeartPlay = (c: HeartContext) => c.heartIntent !== "opening" && c.heartIntent !== "listen";

export function heartConversationHistory(c: HeartContext) {
  const events = c.state.eventLog;
  let start = events.length - 1;
  while (start >= 0 && events[start].type !== "encounter_started") start--;
  const visibleToNpc = (e: typeof events[number]) => ["dialogue_generated", "narration_generated"].includes(e.type) && e.targetId === c.npcId && e.audience.includes(c.npcId);
  const currentEvents = start < 0 ? [] : events.slice(start + 1);
  const played = currentEvents.filter(visibleToNpc);
  const describe = (e: typeof events[number]) => {
    const kind = e.type === "narration_generated" ? "narration" : "speech";
    const name = e.actorId === "player" ? "朝雾遥" : demoBootstrap.npcs.find(n => n.id === c.npcId)!.name;
    const clean = kind === "speech" ? separateDialogueText(e.details.line ?? e.details.text, "", name) : { line: e.details.line ?? e.details.text, stageDirection: "" };
    // Old records sometimes embedded another 'narration + name:' inside the line.
    const nested = kind === "speech" ? separateDialogueText(clean.line, clean.stageDirection, name) : clean;
    return { event_id: e.id, day: e.day, minute: e.minute, location_id: e.locationId, kind,
      speaker: e.actorId === "player" ? "player" : "npc", text: nested.line, stage_direction: nested.stageDirection };
  };
  const previous = (start < 0 ? events : events.slice(0, start)).filter(visibleToNpc).slice(-16);
  const includedIds = new Set([...currentEvents, ...previous].map(e => e.id));
  const observed = events.filter(visibleToNpc).map(describe);
  return {
    encounter_id: start < 0 ? null : events[start].id,
    played_this_encounter: played.map(describe),
    previous_encounter_dialogue: previous.map(describe),
    prior_memories: c.state.npcStates[c.npcId].memories.filter(m => !includedIds.has(m.sourceEventId)).slice(-8).map(m => m.summary),
    // Observations, not an invented AI summary: across encounter boundaries, exclude remote/old-day actions.
    recent_observed_actions: observed.filter(e => e.day === c.state.day && e.location_id === c.state.currentLocationId &&
      (e.kind === "narration" || e.stage_direction)).slice(-12).map(e => ({ event_id: e.event_id, minute: e.minute, actor: e.speaker, text: e.kind === "narration" ? e.text : e.stage_direction })),
    // Only committed display events form the cursor: never copy unplayed continuations.
    continuation: {
      mode: c.heartIntent === "opening" ? "new_encounter" : "after_last_played_beat",
      last_played_beat: played.length ? describe(played.at(-1)!) : null,
      last_observed_before_encounter: previous.length ? describe(previous.at(-1)!) : null,
      boundary_resets_scene: false
    }
  };
}

export function buildHeartPrompt(c: HeartContext, baseUser: string) {
  const base = JSON.parse(baseUser);
  const pacing = encounterPacing(c.state, false); // Player expression is inside beats, not prepended.
  const expression = isHeartPlay(c) ? heartCatalog[c.heartIntent as HeartKind].expression : null;
  const context = {
    role: { ...base.role, lead: undefined, goal: "跟随已发生的现场进展继续交流，不固定从整理遗物或谈姐姐重新开头；允许自然转移话题与推进动作；只执行能力列表允许的材料操作，不编写额外往事，也不为了产牌变换情绪。" }, allowed_facts: base.allowed_facts, correction: base.correction,
    world_rules: ruleContext(c.state, c.npcId, c.heartIntent === "opening" && !c.selectedOption && !pacing.mustClose),
    current: base.current, protagonist: base.protagonist, timeline_guard: base.timeline_guard,
    first_meeting: base.first_meeting, dialogue_history: heartConversationHistory(c),
    player_read_materials: base.player_read_materials,
    player_known_facts: base.player_known_facts,
    undisclosed_to_player: base.undisclosed_to_player,
    held_materials: base.held_materials, conversation_pacing: pacing, farewell_hint: base.farewell_hint,
    input: c.heartIntent, player_expression: expression,
    current_player_action: c.selectedOption ? { text: c.selectedOption.playerLine ?? c.selectedOption.text, intent: c.selectedOption.intent } : null,
    event_capabilities: heartCapabilities(c.state, c.npcId),
    recent_consequences: c.state.eventLog.filter(e => ["heart_consequence", "heart_activity"].includes(e.type) && e.targetId === c.npcId).slice(-8).map(e => ({ id: e.id, text: e.details.text })),
    action_plan: c.state.npcStates[c.npcId].actionPlan,
    action_capabilities: { type: "meet", targetNpcId: "player", now: (c.state.day - 1) * 1440 + c.state.currentMinute,
      locations: demoBootstrap.locations.map(l => ({ id: l.id, name: l.name })), minimumTravelMinutes: 60,
      time_format: "游戏绝对分钟：(day-1)*1440+当日分钟；只可约未来24小时内，抵达和等待结束均在同一天09:00至18:00" },
    pending_choice: c.state.currentDialogue?.heart?.choicePoint ?? null,
    // No inventory, source NPC or source scene is sent to the receiving character.
    already_gathered: c.state.heartSession?.claimedKinds ?? []
  };
  const system = [
    `本次实际容量是${pacing.maxGeneratedLines}个对白节拍（双方合计），这是本次唯一有效的长度上限；不是默认12句。先回应当前选择。篇幅不足以进入新节点时，用剩余篇幅由NPC自然收尾，can_continue=false，不硬塞新话题。${pacing.maxGeneratedLines <= 6 ? "本次空间较少，优先用2至4句接住回应并收束；仍不得超过上限。" : "无需写满容量。"}`,
    "你为《猫神町》的拾绪试玩写一段连续的现场中文对白。只输出JSON，不输出传统文字选项。主角是朝雾遥。一次生成必须从当前位置连续写到下一个真正需要玩家选择心绪的时刻，或写到本次会面自然结束；不能因为写了几句、换了话题或达到习惯段落长度就提前停下。beats最多12项，且不能超过本次maxGeneratedLines；遇到表态机会立即停在那句NPC台词。",
    "续写位置只看dialogue_history.continuation。played_this_encounter里的每句都已经被玩家看过，last_played_beat是已播放游标，不是输出的第一句。beats[0]必须发生在它之后：接住它的意思写新的回应，不能复制末句、重播上段开头或换措辞重问已经回答的问题。不要先复述旧句‘接上文’，不要从过去某个情绪较强的节点重新演一遍。普通口头应答或有新语境的引用可以自然出现，不是禁用词规则。",
    "mode=new_encounter表示玩家新发起了会面，不是接着播放上次的尾声。previous_encounter_dialogue与prior_memories只是已发生的背景，不能当作待播台词；上次告别已结束，不再把‘我先走了/去扫地’重演为新开场。认识的人自然回应再次接触，不重新当陌生人自我介绍，也不凭空断言她已经完成此前打算做的事。",
    "会面/请求分段不会重置现场。recent_observed_actions是玩家已看见的动作，不是待执行清单；新会面也须继承同日同地点的最后状态。动作已完成就从其结果向前写：已经跨过门槛不能再次刚进门，已经穿好拖鞋不能再拿起同一双准备穿，已经答应并开始往里走不能又询问是否同行。只说过打算去而没展示行动，则不能当作已到达。允许自然反复的小动作，但别整段重播先前行动或换词重演已解决的情绪事件。先在本次生成中理解已完成、已答复、尚未执行三者，再写下一拍，不另设判断AI。",
    "line只放当前说话者实际说出的台词，不带姓名冒号、动作描述或另一人的台词。stage_direction默认留空，只允许确实改变现场的大动作，不写微表情、语气或普通身体小动作。非空时独立旁白先显示，玩家点下一句才显示line；为空则直接台词。旁白不写未说出口的秘密、未来计划已执行、过去事件重演或额外案件事实。",
    SPARSE_NARRATION_GUIDANCE,
    RULE_REACTION_GUIDANCE,
    "心绪牌是玩家选择遥的表达态度，不是给NPC施加情绪。NPC只根据自身性格、当前处境和听到的台词回应；不能提到卡牌、拾绪或读心。",
    HEART_REPLY_VOICE,
    "current_player_action非空时，玩家刚主动出示材料或转告消息，已经完成该动作，不是出牌。先由NPC回应这个动作，不替玩家重复一次；相关信息仅送达当前NPC，不自动告诉全镇。允许再出现新的情绪回应机会，但不重放旧选择。",
    "input=opening时由NPC开场，后续允许遥自然接话；input=listen表示顺着聊，不是遥保持沉默。跨生成段必须接住上一位说话者：若dialogue_history.continuation.last_played_beat是npc，本次beats[0]必须是player；若上一拍是player，本次beats[0]必须是npc。绝不能让同一角色在新段开头接着回应自己的上一句，即使上一句是反问、吐槽或感叹。双方随后可以自然来回，遥可以询问、安慰、答应、调侃或主动回应。若pending_choice非空，listen表示玩家把这一回应交给AI，直接自然回应，不原样重复等待玩家表态。",
    "input是fear/sympathy/affection/sadness/anger/joy/curiosity/doubt/contempt时，beats[0]必须player，以player_expression回应pending_choice；随后双方可自然交替接话，不限制遥只说一句。不要把牌名当台词。恐惧可用迟疑或动作体现，不要求固定第一人称句式；问句、反问均允许。后续不要突然反转刚选的情绪，应有自然过渡。",
    "遥只能依据实际已知信息，不把NPC未说出的私密事实放进遥嘴里。允许顺着情境作出口头承诺、提出赠礼、转告已知消息、答应、指责或示好，允许有惊喜的人际发展；不能只因不是玩家亲选台词而拒绝。人物的指责/推测不是已证实罪行，口头约定也不是实际执行。",
    "player_known_facts是本段开始前玩家和遥共同知道的案情事实，protagonist仅提供说话方式。NPC若首次说出账本外的事，遥要当作刚听到，可惊讶、怀疑、追问或记下；不能显得早已知情，不能说‘果然’或补出尚未说的细节。只有该事实已在本段更早的NPC台词中明确说出，后续player节拍才能以‘刚得知’的口径使用。",
    "拾绪不是把对话变成情绪疗愈，而是用玩家选的态度改变人物此刻的决定。每次出牌后，NPC应接住这种态度，尽量推进信息、条件、要求、关系边界或实际行动。允许短暂安慰、迟疑、感谢和过渡，不要求每次接话都交新事实或制造事件；避免连续多轮原地重复。",
    "先接住world_rules中的新规则及已提出的要求；规则产生的具体取舍也是有效推进。其他情况下优先使用undisclosed_to_player中与当下有关的1至2个事实制造冲击：直说、部分承认、否认、提出交换或拿真信息包住回避。没有可说的新事实时，根据role.dramaticMoves产生具体质问、交易、决定、威胁、约见或指向下一人的行动。一段只要一个主冲击，但必须让玩家知道‘刚才发生了什么变化’。",
    "案件事实及人物过去经历只能来自allowed_facts及已展示材料。dialogue_history只记录实际听见的话，不能洗白旧轮编造。普通即时动作、当下情绪、主观怀疑可以写；不能补出星期、购票时间、目的地、通话、约会或新证物，也不能编造姐姐怕黑、拍照回家开灯、临别动作等额外往事。",
    "本入口支持NPC约遥在已有地点会面：明确邀请或承诺到某处等遥时，由你同时输出action_plan，不另找AI重判动机。先自然商定具体地点、到达和等待结束时间；只有假设、可能、回忆、单纯‘去扫地’或遥替NPC作的决定不生成计划。没有新约定时action_plan=null，保留原计划；不要每段重复约定。现有计划及完成/过期状态是权威记忆，赴约见面后接住约定，不重作陌生人介绍。",
    'action_plan格式：{"type":"meet","targetNpcId":"player","locationId":"目录中的ID","arriveAt":绝对分钟,"waitUntil":绝对分钟,"reason":"约定目的","quote":"NPC约定台词连续原文","beatIndex":从0开始的NPC节拍索引}。至少留60分钟抵达，同一天白天等待，最晚可约未来24小时内；台词须说清地点与到达/等到的钟点，并与数字一致。建议等候至少1小时。计划在该句实际播放后保存，游戏时间到了才执行；不可声称已经移动完成。计划不是强迫玩家赴约，玩家可不去。',
    "出牌后优先推动一个与人物和现场有因果关系的实际后果：大多数时候，从event_capabilities中选择真正合适且当前可执行的consequence；不固定某张牌对应某种结果，也不为了填字段硬塞材料、邀约、整理、案件行动或暂停。没有自然合适的可执行后果时，consequence=null是合法结果，不能因此把一次有效回应判失败。",
    "consequence=null时仍必须向前走：在本段中结束已经回应过的情绪问题，并自然引向一个具体的新焦点，例如眼前的新细节、对方接下来真正想谈的事、待核对的问题、关系边界或下一步目标。新焦点须来自已知事实与现场，不能编造案件经历。不要换词重复pending_choice，不要让NPC再次追问同一个问题，不要连续互相安慰、道谢、确认同一态度，也不要只说‘我明白／谢谢／好受一点’后停在原地。可以暂不落地系统事件，但对白本身必须有方向变化。",
    'consequence格式：{"type":"material|sorting_offer|sorting_cancel|meeting|pause|case_action","actionId":null或材料/案件行动能力ID,"beatIndex":NPC决定台词索引,"quote":"该NPC台词连续原文"}。每次至多一个，来源必须是本段NPC实际说出的决定，不能只是遥单方面提议。合法结果在来源台词播放时落地，遥首句播放时扣牌，未播后果会保存待续。出牌后先落实当前结果，再引出下一次表态，不能让新选择截断本次后果。',
    "type=material时actionId只能从event_capabilities.materials选取原ID。show:表示NPC出示已有材料，台词播放后内容进入手记；take:表示NPC交付已有实物，台词播放后进入背包。不得展示目录外材料、编造新证据或提前在更早的旁白完成交付；对应材料操作的stage_direction留空，决定台词中自然说明正在出示或交付。没有material后果则不得声称已经展示或交付。type=case_action只可选event_capabilities.case_actions里的原ID：retract是千代明确纠正旧证词，write是千代签写纠正说明，supplement是犬饲签写补充说明，protect是犬饲决定一小时后到旅馆保护证人。严格保留原前置条件；写出的实物仍由本人持有，不自动转交、广播、定罪或立刻到场。此类决定对应stage_direction留空，决定台词播放时才执行，opening/listen也可合法执行；没有对应后果就不能声称已经改口、签写或动身。",
    "type=sorting_offer仅当能力为true：小春接受遥帮忙整理真昼遗物，生成具体邀请，解锁‘一起整理遗物’操作。只是邀请还没整理完成；玩家另行选择花30分钟实施，系统会共同查看小春仍持有的已有材料，不凭空发现新证物。type=sorting_cancel仅当能力为true：小春撤回尚未完成的整理邀请，原操作被关闭；需要有语境原因，不用反复邀请撤回来制造事件。已完成的整理不能再当未完成。",
    "type=meeting必须同时提供合法action_plan，两者指向同一NPC决定节拍；沿用约定时间地点规则，不能把同地点同时间的旧约定重复当新后果。type=pause只在NPC确实要停止交流时使用：明确今天此刻先不聊、需要至少一小时独处，必须末句NPC、can_continue=false、choice_point=null、action_plan=null；系统立即封闭会面并在60游戏分钟内禁止新会面。不把pause当作缺少创意的通用惩罚保底。不保证好结果，但必须有合理后果。",
    "每次可生成1至12个节拍，总数不超过conversation_pacing.maxGeneratedLines，允许双方自然来回。只允许两种结尾：抵达新的玩家表态点，或由NPC自然结束本次会面。不能把普通接话、话题转换或长度当作返回边界。mustClose=true必须can_continue=false、choice_point=null，由NPC用符合farewell_hint的理由收尾；自然结束也要说明理由，不再等待回答。",
    HEART_CHOICE_GUIDANCE,
    "决定触发时立即在那句NPC台词停笔，即使只有1至2个节拍也合法；把它作为本段最后一个节拍，choice_point.quote原样引用该末句的关键文字，reason说明不同情绪回应为何会影响此刻交流。不要先替遥回答这句再让玩家补选。抵达决策点时can_continue=true且choice_point非空；会面结束时can_continue=false且choice_point=null。不得返回can_continue=true、choice_point=null让玩家为了继续普通对白再次等待生成。",
    "pickup的情绪含义只由你在生成本段对白时结合上下文判断，不由关键词或另一个审校AI重判。降低获取门槛：日常、轻微、含蓄但从当前表达和语境能合理感受到的情绪也应拾取，不必强烈爆发、直说情绪词或构成重大事件；符合且未达配额时优先给出pickup，不要惯性填null。fear包括NPC自己的不安、顾虑、担忧、畏缩、害怕失去或被否定；sympathy包括体谅、心疼别人；affection包括关心、依恋、眷恋和亲近，不限恋爱。sadness是本人失落、遗憾、不舍；anger是对不公平或边界被侵犯的不满；joy是开心、释然、乐趣；curiosity是探究和新鲜感；doubt是对眼前说法不信或要求核对；contempt是看不起某种行为或姿态。不能把悲伤全归为同情、冷静归为轻蔑、笑容自动归为喜悦。分类仍根据语境，不按人物职业或MBTI固定发牌。",
    "例如NPC说‘你能再待一会儿吗？外面一响我就忍不住往门口看’，结合语境可拾取fear，即使没有‘我怕’；‘这一路都是你一个人撑过来的吧’可体现sympathy；‘你来了，屋里就没那么空了’可体现affection。示例仅用于理解语义，不能照抄为固定对白或词表。悲伤、自责可与恐惧或爱意并存，按实际流露判断，不因主情绪是悲伤就漏掉其他情绪；但纯粹悲伤、自责不自动等于体谅别人的sympathy。",
    "pickup.quote只作内部来源锚点，原样摘录对应beat的line或保留的stage_direction中的连续文字；语义依据可结合上下文，摘录本身无需包含情绪关键词。beat_index从0开始，只能指向npc，不能从遥或未展示的隐藏设定拾绪，也不能将单纯转述别人害怕当作NPC自己的恐惧。每段至多1张，already_gathered中的牌种本会面不再产出；没有可合理感知的对应情绪才填null。不为发牌强迫人物改变情绪、不补写微表情旁白，也不向玩家解释为何获得。",
    'used_fact_ids可用allowed_facts或player_known_facts中的原ID，包含本段双方实际用到的事实；后者只表示遥知道，不能让NPC凭空知道，不填材料ID或规则ID。disclosed_fact_ids只填本段NPC明确告诉遥、且player_known_facts尚未包含的事实ID；必须同时列入used_fact_ids，重复已知信息无需再次登记。仅在NPC内心或说谎逻辑中用到的私密事实不得填入。disclosures逐项标记每个已公开事实首次被NPC说出的节拍：{"fact_id":"F02","beat_index":2}；索引从0开始，只能指向NPC节拍。progress如实摘要本段的具体推进，不能写深化情绪、建立信任或继续交流。格式：{"beats":[{"speaker":"npc或player","line":"台词","stage_direction":"","emotion":"情绪"}],"can_continue":true,"choice_point":{"quote":"末句NPC台词摘录","reason":"为什么需要玩家选择立场"},"action_plan":null,"consequence":null,"closing_reason":"","used_fact_ids":[],"disclosed_fact_ids":[],"disclosures":[],"progress":{"type":"reveal|contradiction|request|deal|decision|threat|action|transition","summary":"具体发生的变化"},"pickup":null,"rule_reactions":[]}。结束会面时改为can_continue=false、choice_point=null并填写closing_reason。产牌时pickup={"beat_index":0,"kind":"fear|sympathy|affection|sadness|anger|joy|curiosity|doubt|contempt之一","quote":"原文摘录"}。提交前数beats项数：只能1至12项，还受maxGeneratedLines限制；必须写到决策点或会面结束。每次必须包含consequence字段，但允许为null；有自然、合法后果时尽量填写，不能为避免写清推进而惯性填null。每次必须包含action_plan：若NPC本段明确答应地点时间或发出具体赴约邀请，必须填上述会面对象，不能只在台词里答应却遗漏计划。收尾can_continue=false也能同时有action_plan，约定发生在离开之前。'
  ].join("\n") + `\n最后检查本次长度：beats最多${pacing.maxGeneratedLines}项，禁止按通用示例填到12项。${c.heartIntent === "opening" ? "无需填满容量。" : `优先在${Math.min(6, pacing.maxGeneratedLines)}项内接住当前回应并抵达新的表态点或自然告别；确有必要才增加到本次上限，不为凑长反复安慰、确认或再造话题。`}所有来源索引须在本次beats范围内。`;
  const ruleChecklist = context.world_rules.required_rule_id
    ? `\n本次供奉反应检查：必须输出rule_reactions，其中一项ruleId必须逐字为${JSON.stringify(context.world_rules.required_rule_id)}。先在NPC台词中自然表达新规则带来的具体要求、条件或决定，再填写beatIndex、quote、stance、demand；quote须摘录该NPC节拍的连续原文。不能只写对白而漏掉rule_reactions，也不能照抄示例中的空数组。`
    : "\n输出包含rule_reactions：有规则相关的新要求或立场时填写完整来源，无新反应时为[]。";
  return { system: system + ruleChecklist, user: JSON.stringify(context), pacing, known: Object.keys(base.allowed_facts) };
}

export function validateHeartDraft(raw: unknown, c: HeartContext, known: string[]): HeartDraftData {
  // Formatting repair only: a known speaker label lets us separate action from speech
  // without a second semantic judge or rejecting otherwise usable dialogue.
  if (raw && typeof raw === "object" && "beats" in raw && Array.isArray(raw.beats)) {
    raw = { ...raw, beats: raw.beats.map(b => {
      if (!b || typeof b.line !== "string" || !["npc", "player"].includes(b.speaker)) return b;
      const name = b.speaker === "player" ? "朝雾遥" : demoBootstrap.npcs.find(n => n.id === c.npcId)!.name;
      const clean = separateDialogueText(b.line, typeof b.stage_direction === "string" ? b.stage_direction : "", name);
      return { ...b, line: clean.line, stage_direction: clean.stageDirection };
    }) };
  }
  const d = HeartDraft.parse(raw), pacing = encounterPacing(c.state, false);
  if (!validRuleReactions(d.rule_reactions ?? [], c.state, c.npcId,
    d.beats.map(b => ({ speakerId: b.speaker === "npc" ? c.npcId : "player", line: b.line })),
    c.heartIntent === "opening" && !c.selectedOption && !pacing.mustClose)) throw new Error("invalid_rule_reaction");
  if (d.beats.length > pacing.maxGeneratedLines) throw new Error("dialogue_length");
  if (isHeartPlay(c) && (d.beats[0].speaker !== "player" || !d.beats.some(b => b.speaker === "npc"))) throw new Error("player_intent");
  if (c.heartIntent === "opening" && d.beats[0].speaker !== "npc") throw new Error("player_intent");
  if (c.heartIntent === "listen") {
    const previousSpeaker = heartConversationHistory(c).continuation.last_played_beat?.speaker;
    if (previousSpeaker && d.beats[0].speaker === previousSpeaker) throw new Error("turn_order");
  }
  const last = d.beats.at(-1)!;
  if (d.action_plan) {
    const b = d.beats[d.action_plan.beatIndex];
    if (!b || b.speaker !== "npc" || !b.line.includes(d.action_plan.quote) || !validMeetingPlan(d.action_plan, c.state, c.npcId)) throw new Error("invalid_action_plan");
  }
  if (d.choice_point && (!d.can_continue || last.speaker !== "npc" || !last.line.includes(d.choice_point.quote))) throw new Error("decision_point");
  if (d.can_continue !== Boolean(d.choice_point)) throw new Error("decision_point");
  if (!d.can_continue && last.speaker !== "npc") throw new Error("conversation_closing");
  if ((pacing.mustClose && d.can_continue) || (!d.can_continue && !d.closing_reason.trim())) throw new Error("conversation_closing");
  // This list covers both speakers. The player's own established information is
  // valid context too; it does not grant that information to the NPC.
  const unknownUsed = d.used_fact_ids.filter(id => !known.includes(id) && !c.state.playerKnownFactIds.includes(id));
  if (unknownUsed.length) throw new HeartDraftValidationError("unknown_fact", `used_fact_ids含双方都不可引用的编号：${unknownUsed.join("、")}。只引用allowed_facts或player_known_facts中的原ID，不用材料ID、规则ID或自造编号；遥的知识不等于NPC也知道，台词不能补写未知案情。`);
  const invalidDisclosed = d.disclosed_fact_ids.filter(id => !d.used_fact_ids.includes(id) || !known.includes(id));
  if (invalidDisclosed.length) throw new HeartDraftValidationError("unknown_fact", `disclosed_fact_ids中的${invalidDisclosed.join("、")}未同时列入used_fact_ids或不属于allowed_facts。仅记录NPC本段真正公开的已知事实。`);
  const invalidAnchors = d.disclosures.filter(x => !d.disclosed_fact_ids.includes(x.fact_id) || d.beats[x.beat_index]?.speaker !== "npc");
  if (invalidAnchors.length) throw new HeartDraftValidationError("unknown_fact", `disclosures来源标注无效：${invalidAnchors.map(x => `${x.fact_id}@${x.beat_index}`).join("、")}。fact_id必须属于disclosed_fact_ids；beat_index从0计数并指向本段实际说出该事实的NPC，不能指向遥或上段对白。`);
  // Progress labels describe prose; they never execute actions or unlock facts.
  // Repair imprecise labels without rejecting an otherwise valid response.
  if (d.progress.type === "reveal" && !d.disclosed_fact_ids.length) d.progress.type = "transition";
  if (d.progress.type === "action" && !d.consequence) d.progress.type = "decision";
  const text = d.beats.map(b => b.line + b.stage_direction).join("\n");
  if (d.consequence && !validHeartConsequence(d.consequence, c.state, c.npcId, d.action_plan)) throw new HeartDraftValidationError("invalid_consequence", "consequence的类型、actionId或约定不在当前可执行能力内。只使用event_capabilities里的原ID与合法条件；没有可执行后果时设为null，台词也不能声称已执行。");
  if (d.consequence && !validConsequenceBeats(d.consequence, d.beats.map(b => ({ speakerId: b.speaker === "player" ? "player" : c.npcId, line: b.line })), c.npcId, d.can_continue, d.action_plan)) throw new HeartDraftValidationError("invalid_consequence", "consequence的beatIndex或quote未锚定本次NPC实际决定台词。索引从0开始，quote摘录对应NPC连续原文；pause必须由末句NPC收尾且没有会面计划。");
  if (d.consequence?.type !== "material" && /(?:掏出|摊开|展开|递出|递给|展示|拿出)[^。\n]{0,18}(?:车票|材料|证据|信件)|(?:车票|材料|证据|信件)[^。\n]{0,18}(?:展开|摊开|递给|面前)/.test(text)) throw new Error("action_mismatch");
  if (d.consequence?.type !== "case_action" && /(?:签好|写好)(?:了)?(?:说明|证词)/.test(text)) throw new Error("action_mismatch");
  if (d.consequence && ["material", "case_action"].includes(d.consequence.type) && d.beats[d.consequence.beatIndex].stage_direction.trim()) throw new HeartDraftValidationError("invalid_consequence", `beats.${d.consequence.beatIndex}.stage_direction须为空：材料/案件动作在对应NPC台词播放时才执行。用该句说明合法操作，不在更早显示的旁白中提前执行。`);
  if (d.pickup) {
    const b = d.beats[d.pickup.beat_index];
    if (!b || b.speaker !== "npc" || !(b.line.includes(d.pickup.quote) || b.stage_direction.includes(d.pickup.quote)) || c.state.heartSession?.claimedKinds.includes(d.pickup.kind)) throw new Error("invalid_pickup");
    // Semantic classification belongs to the generator; only provenance and quotas are checked here.
  }
  return d;
}

export function heartResult(d: HeartDraftData, c: HeartContext, provider: "deepseek" | "mock"): DialogueResult {
  const beats = d.beats.map(b => ({ speakerId: b.speaker === "player" ? "player" : c.npcId, line: b.line, stageDirection: b.stage_direction, emotion: b.emotion }));
  const lastNpcBeat = d.beats.map(b => b.speaker).lastIndexOf("npc");
  const disclosures = d.disclosed_fact_ids.map(factId => {
    const anchored = d.disclosures.find(x => x.fact_id === factId);
    return { factId, beatIndex: anchored?.beat_index ?? lastNpcBeat };
  });
  return DialogueResultSchema.parse({ ...beats[0], continuations: beats.slice(1), options: [],
    heart: { canContinue: d.can_continue, choicePoint: d.choice_point, actionPlan: d.action_plan, consequence: d.consequence, pickups: d.pickup ? [{ beatIndex: d.pickup.beat_index, kind: d.pickup.kind, quote: d.pickup.quote }] : [] },
    debug: { provider, ruleReactions: d.rule_reactions, decision: "拾绪：态度改变事件走向", usedFacts: d.used_fact_ids, disclosedFacts: d.disclosed_fact_ids, disclosures, sceneGoal: `${d.progress.type}：${d.progress.summary}`, promptVersion: HEART_PROMPT_VERSION, npcActionId: "none" }
  });
}

// Explicit offline demonstration only. Configured AI failures never spend a card on this script.
export function mockHeartDialogue(c: HeartContext): DialogueResult {
  const rule = ruleContext(c.state, c.npcId).active.find(r => r.needs_response);
  if (rule && c.heartIntent === "opening" && !c.selectedOption && !encounterPacing(c.state, false).mustClose) {
    const requests: Record<string, string> = {
      npc_koharu: rule.slot === "faith" ? "我想认真敬奉它，可不想拿神意替人作答。你愿意和我一起把这界限说清吗？" : "我想按这个标准重新看待留下的东西，可不想因此丢掉不够好看的。你愿意帮我一起分清吗？",
      npc_saya: rule.slot === "faith" ? "我先守住值班记录原本的内容。至于怎么表达敬意，你愿意和我商量一个不妨碍工作的办法吗？" : "展示方式可以商量，但值班记录的内容不能为了好看而改。你愿意先和我守住这个界限吗？",
      npc_genichi: "我想由我来解释它值得被看重的地方。你愿意听我的条件，还是打算自己来定义？",
      npc_ritsu: "我想听清你希望大家怎样理解它，再决定自己怎么说。你愿意把你的意思告诉我吗？",
      npc_makoto: "我要求把对它的看法和有根据的指控分开。你愿意按能核实的事情跟我谈吗？",
      npc_mio: "我会尊重这条规则，但不会拿它替代检查记录。你能接受我先守住这个界限吗？",
      npc_chiyo: rule.slot === "faith" ? "我得想想照顾人和敬奉它怎样才能两不耽误。你愿意先陪我把这个难处说清吗？" : "我想把待人的用心也放进这个标准里，不愿只看东西的样子。你愿意听听我的看法吗？"
    };
    const demand = requests[c.npcId] ?? "你愿意和我说清该怎样遵守吗？";
    const line = `既然${rule.rule}，${demand}`;
    return heartResult({ beats: [{ speaker: "npc", line, stage_direction: "", emotion: "认真" }],
      rule_reactions: [{ ruleId: rule.id, beatIndex: 0, quote: line, stance: `承认${rule.rule}，从自己的职责理解`, demand }],
      consequence: null, action_plan: null, can_continue: true, choice_point: { quote: demand, reason: "新规则带来了具体取舍，需要遥回应" },
      closing_reason: "", used_fact_ids: [], disclosed_fact_ids: [], disclosures: [],
      progress: { type: "request", summary: demand }, pickup: null }, c, "mock");
  }
  if (c.npcId !== "npc_koharu") return mockTownHeartDialogue(c);
  const beats: HeartDraftData["beats"] = [];
  if (isHeartPlay(c)) beats.push({ speaker: "player", line: ({ ...mockPlayerLines, fear: "我也怕弄不好。要不咱俩搭个伙，勇气先凑个整？", sympathy: "整理东西归我擅长，整理心情不赶工。咱们慢慢来。", affection: "我想多陪你一会儿。今天的待办，就先写‘陪小春’。" })[c.heartIntent as HeartKind], stage_direction: "", emotion: heartCatalog[c.heartIntent as HeartKind].name });
  const npcLine = c.heartIntent === "opening" ? "我是雨宫小春。姐姐的东西……我怕自己整理不好，连她留下的东西都留不住。" :
    c.heartIntent === "fear" ? "你也不安啊。别勉强自己，我知道那种不好受的滋味。" :
    c.heartIntent === "sympathy" ? "我会慢慢说。姐姐对我那么好，我到现在还是很想她。" :
    c.heartIntent === "affection" ? "你肯留下来，我是高兴的。只是我还得缓缓。" :
    c.heartIntent === "sadness" ? "是啊，想说的话还在，人却不在了。我很难过。" :
    c.heartIntent === "joy" ? "你还肯认真陪我聊，我心里轻松了一点。" :
    c.heartIntent === "curiosity" ? "你是怎么想到这个问法的？我还挺想听你讲讲。" :
    c.heartIntent === "doubt" ? "光凭一句话确实不能作准，我自己也还有疑问。" :
    c.heartIntent === "anger" ? "我也不甘心，凭什么就这样算了？" :
    c.heartIntent === "contempt" ? "拿这种话打发人，我也觉得不值一听。" : "我很想姐姐。她对我的好，我还一直记着。";
  beats.push({ speaker: "npc", line: npcLine, stage_direction: "手指攥住衣角，又慢慢松开。", emotion: c.heartIntent === "opening" ? "不安" : "柔和" });
  const kind: HeartKind | null = c.heartIntent === "opening" ? "fear" : c.heartIntent === "fear" ? "sympathy" : ["sympathy", "listen"].includes(c.heartIntent) ? "affection" : c.heartIntent === "affection" ? null : c.heartIntent as HeartKind;
  const pickup = kind && !c.state.heartSession?.claimedKinds.includes(kind) ? { beat_index: beats.length - 1, kind, quote: npcLine } : null;
  const pacing = encounterPacing(c.state, false);
  if (c.heartIntent === "listen" && pacing.maxGeneratedLines >= 3) {
    beats.push({ speaker: "player", line: "舍不得也没关系，慢慢来，好吗？", stage_direction: "在她身边坐下。", emotion: "关切" });
    beats.push({ speaker: "npc", line: "嗯，先陪我坐一会儿吧。", stage_direction: "往旁边让了让。", emotion: "柔和" });
  }
  if (pacing.mustClose) {
    const farewell = characterFarewell(c.state, c.npcId);
    if (beats.length < pacing.maxGeneratedLines) beats.push({ speaker: "npc", line: farewell.line, stage_direction: farewell.stageDirection, emotion: "平静" });
    else beats[beats.length - 1].line += "我得缓一缓，今天先说到这里。";
  }
  let consequence: HeartDraftData["consequence"] = null;
  let paused = false;
  if (isHeartPlay(c)) {
    const capabilities = heartCapabilities(c.state, c.npcId);
    const index = beats.map(b => b.speaker).lastIndexOf("npc");
    let type: NonNullable<HeartDraftData["consequence"]>["type"], actionId: string | null = null, decision: string;
    if (capabilities.sorting_offer) { type = "sorting_offer"; decision = "愿意的话，和我一起整理遗物吧。"; }
    else if (capabilities.materials.length) {
      type = "material"; actionId = capabilities.materials[0].id;
      decision = actionId.startsWith("show:") ? "这份材料，你现在可以看看。" : "这份材料交给你保管吧。";
    } else if (capabilities.sorting_cancel) { type = "sorting_cancel"; decision = "整理的事先不用你帮忙了。"; }
    else { type = "pause"; decision = "今天先说到这里，让我自己待一小时吧。"; paused = true; }
    beats[index].line = beats[index].line.slice(0, 80) + decision;
    beats[index].stage_direction = "";
    consequence = { type, actionId, beatIndex: index, quote: decision };
  }
  const choice = !pacing.mustClose && !paused;
  if (choice) beats[beats.length - 1].line += "你会不会觉得这样的我很没用？";
  return heartResult({ consequence, action_plan: null, beats, can_continue: !pacing.mustClose && !paused, choice_point: choice ? { quote: "你会不会觉得这样的我很没用？", reason: "小春在意遥对自己的看法，需要玩家表态" } : null,
    closing_reason: pacing.mustClose || paused ? "需要缓一缓" : "", used_fact_ids: [], disclosed_fact_ids: [], disclosures: [],
    progress: { type: consequence ? "action" : "request", summary: consequence ? "小春对遥的态度作出实际回应" : "小春要求遥表明对她的看法" }, pickup }, c, "mock");
}

const mockPlayerLines: Record<HeartKind, string> = {
  fear: "我也有点发怵。话先说在前面，我的胆量不包售后。",
  sympathy: "别急着一个人扛。事情可以一件件理，人不用先变成铁打的。",
  affection: "我在乎的也有你。今天的待办，可以留一行给你好好说话。",
  sadness: "听到这里，我也有点难过。有些话，不是想开就能放下。",
  anger: "这事不能就这么算了。问题还站着呢，答案先坐下休息了？",
  joy: "能这样好好说话，我还挺开心。今天总算有一件事不用皱眉了。",
  curiosity: "这话我想再听听。先别急着翻页，我的好奇心还夹在这儿。",
  doubt: "我还没完全信服。咱们先对对说法，别让结论抢跑。",
  contempt: "这套说辞倒是很体面，可惜体面不能替它站得住脚。"
};

// These six public, fixed demo scenes exercise the common pipeline. They are not
// NPC-specific acquisition rules or a substitute for the configured dialogue AI.
function mockTownHeartDialogue(c: HeartContext): DialogueResult {
  const rows: Record<string, { opening: string; kind: HeartKind; response: string; question: string }> = {
    npc_saya: { opening: "我是水野纱夜。比起谁说得响，我更信核对过的记录；没核过的说法，我暂时不信。", kind: "doubt", response: "我听清你的意思了。我们把能核对的先核对。", question: "你愿意先耐下心来，把话说准吗？" },
    npc_genichi: { opening: "九条弦一。漂亮话人人会说，拿几句场面话就来敷衍我，我可看不上。", kind: "contempt", response: "倒是个有自己说法的人。好，我听着。", question: "你是来顺着我说，还是有自己的判断？" },
    npc_ritsu: { opening: "藤崎律，地方记者。你这个整理员的工作挺有意思，我还真想知道你最先会注意什么。", kind: "curiosity", response: "这句我接住了。不过先别替彼此下结论。", question: "我们能把各自的意思说直一点吗？" },
    npc_makoto: { opening: "犬饲诚。把没核实的话随手当结论，我听着就来气。你要说什么，就说具体的。", kind: "anger", response: "你的态度我知道了。要办事，就把能办的说清楚。", question: "你要我给个说法，还是愿意一起核对？" },
    npc_mio: { opening: "桐生澪。我最遗憾的，是有些话可以问清，却没有问清。我不想把遗憾说成答案。", kind: "sadness", response: "我理解你的表达。但我只谈有根据的部分。", question: "暂时没有把握的地方，你容得下它空着吗？" },
    npc_chiyo: { opening: "我是白石千代。难得有人愿意停下来陪我说说话，我还挺高兴的。", kind: "joy", response: "你的话我听进去了。咱们慢慢说，不着急。", question: "你肯听我把话说完，再作判断吗？" }
  };
  const row = rows[c.npcId], pacing = encounterPacing(c.state, false), play = isHeartPlay(c);
  const beats: HeartDraftData["beats"] = [];
  if (play) beats.push({ speaker: "player", line: mockPlayerLines[c.heartIntent as HeartKind], stage_direction: "", emotion: heartCatalog[c.heartIntent as HeartKind].name });
  const firstMeeting = !c.state.eventLog.some(e => e.type === "dialogue_generated" && e.targetId === c.npcId);
  const line = c.heartIntent === "opening" && firstMeeting ? row.opening : row.response;
  beats.push({ speaker: "npc", line, stage_direction: "", emotion: c.heartIntent === "opening" ? heartCatalog[row.kind].name : "认真" });
  const pickup = c.heartIntent === "opening" && firstMeeting && !c.state.heartSession?.claimedKinds.includes(row.kind)
    ? { beat_index: beats.length - 1, kind: row.kind, quote: row.opening } : null;
  let consequence: HeartDraftData["consequence"] = null, plan: HeartDraftData["action_plan"] = null;
  let paused = false;
  if (play) {
    const cap = heartCapabilities(c.state, c.npcId), index = beats.length - 1;
    let type: NonNullable<HeartDraftData["consequence"]>["type"], actionId: string | null = null, decision: string;
    const meeting = heartMeetingWindow(c.state, c.npcId), old = c.state.npcStates[c.npcId].actionPlan;
    const newMeeting = meeting && (!old || !["planned", "waiting"].includes(old.status) || old.arriveAt !== meeting.arriveAt || old.locationId !== meeting.locationId);
    const caseAction = ["doubt", "anger", "curiosity"].includes(c.heartIntent) ? cap.case_actions[0] : null;
    if (caseAction) {
      type = "case_action"; actionId = caseAction.id;
      decision = ({ retract: "我说实话：律不是整晚在旅馆。约21:20，我见他从夕见台方向回来；我没有目睹杀人。", write: "我现在把已经说出的纠正写成说明，签我的名字。", supplement: "我现在签署补充说明，重新核查，不是定罪。", protect: "我决定前往白石旅馆保护千代，一小时后到达。" } as Record<string, string>)[actionId];
    } else if (c.heartIntent === "contempt" && !cap.materials.length) {
      type = "pause"; decision = "这次先谈到这里，我需要一小时独处。"; paused = true;
    } else if (newMeeting && (["affection", "joy", "fear"].includes(c.heartIntent) || !cap.materials.length)) {
      type = "meeting";
      decision = `我约你${gameTimeLabel(meeting.arriveAt)}在${demoBootstrap.locations.find(l => l.id === meeting.locationId)!.name}继续谈，等到${gameTimeLabel(meeting.waitUntil)}。`;
      plan = { ...meeting, beatIndex: index, quote: decision };
    } else if (cap.materials.length) {
      type = "material"; actionId = cap.materials[0].id;
      const item = demoBootstrap.items.find(i => i.id === actionId!.split(":")[1])!.baseName;
      decision = actionId.startsWith("show:") ? `这份${item}，你现在可以看看。` : `这份${item}交给你保管。`;
    } else { type = "pause"; decision = "这次先谈到这里，我需要一小时独处。"; paused = true; }
    beats[index].line = decision;
    consequence = { type, actionId, beatIndex: index, quote: decision };
  }
  const closes = paused || pacing.mustClose;
  if (closes && !paused) {
    const farewell = characterFarewell(c.state, c.npcId);
    if (beats.length < pacing.maxGeneratedLines) beats.push({ speaker: "npc", line: farewell.line, stage_direction: "", emotion: "平静" });
    else beats.at(-1)!.line += farewell.line;
  }
  const choice = !closes;
  if (choice) beats.at(-1)!.line += row.question;
  return heartResult({ beats, can_continue: !closes, choice_point: choice ? { quote: row.question, reason: "对方等待遥选择回应态度" } : null,
    closing_reason: closes ? "结束当前交谈" : "", used_fact_ids: [], disclosed_fact_ids: [], disclosures: [],
    progress: { type: consequence ? "action" : "request", summary: consequence ? "对方因遥的态度作出一项具体决定" : "对方要求遥回答当前的具体问题" }, pickup, consequence, action_plan: plan }, c, "mock");
}
