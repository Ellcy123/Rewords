import { z } from "zod";
import { ActionPlanProposalSchema, HeartConsequenceSchema, DialogueResultSchema, HeartKindSchema, heartCatalog, demoBootstrap, separateDialogueText, type DialogueResult, type HeartKind } from "../../packages/shared/src/index.ts";
import { heartCapabilities, validHeartConsequence, validConsequenceBeats } from "./heartConsequences.ts";
import { validMeetingPlan } from "./actionPlans.ts";
import { characterFarewell, encounterPacing } from "./dialoguePacing.ts";
import { SPARSE_NARRATION_GUIDANCE } from "./narrationPrompt.ts";
import type { CaseContext } from "./caseProvider.ts";

export const HEART_PROMPT_VERSION = "shixu-v12-executable-consequences";
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
  stage_direction: z.string().max(240).default(""), emotion: z.string().min(1).max(20)
});
export const HeartDraft = z.object({
  consequence: HeartConsequenceSchema.nullable().default(null),
  action_plan: ActionPlanProposalSchema.nullable().default(null),
  beats: z.array(HeartBeat).min(1).max(5), can_continue: z.boolean(),
  choice_point: z.object({ quote: z.string().min(1).max(120), reason: z.string().min(1).max(160) }).nullable(),
  closing_reason: z.string().max(120), used_fact_ids: z.array(z.string()).max(12),
  pickup: z.object({ beat_index: z.number().int().min(0).max(4), kind: HeartKindSchema, quote: z.string().min(1).max(180) }).nullable()
});
export type HeartDraftData = z.infer<typeof HeartDraft>;
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
    current: base.current, protagonist: base.protagonist, timeline_guard: base.timeline_guard,
    first_meeting: base.first_meeting, dialogue_history: heartConversationHistory(c),
    player_read_materials: base.player_read_materials,
    held_materials: base.held_materials, conversation_pacing: pacing, farewell_hint: base.farewell_hint,
    input: c.heartIntent, player_expression: expression,
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
    "你为《猫神町》的拾绪试玩写下一小段现场中文对白，不是整场剧本。只输出JSON，不输出选项。主角是朝雾遥。beats最多5项，且不能超过本次maxGeneratedLines；遇到表态机会立即停在那句NPC台词，不用演完后才找选择点。",
    "续写位置只看dialogue_history.continuation。played_this_encounter里的每句都已经被玩家看过，last_played_beat是已播放游标，不是输出的第一句。beats[0]必须发生在它之后：接住它的意思写新的回应，不能复制末句、重播上段开头或换措辞重问已经回答的问题。不要先复述旧句‘接上文’，不要从过去某个情绪较强的节点重新演一遍。普通口头应答或有新语境的引用可以自然出现，不是禁用词规则。",
    "mode=new_encounter表示玩家新发起了会面，不是接着播放上次的尾声。previous_encounter_dialogue与prior_memories只是已发生的背景，不能当作待播台词；上次告别已结束，不再把‘我先走了/去扫地’重演为新开场。认识的人自然回应再次接触，不重新当陌生人自我介绍，也不凭空断言她已经完成此前打算做的事。",
    "会面/请求分段不会重置现场。recent_observed_actions是玩家已看见的动作，不是待执行清单；新会面也须继承同日同地点的最后状态。动作已完成就从其结果向前写：已经跨过门槛不能再次刚进门，已经穿好拖鞋不能再拿起同一双准备穿，已经答应并开始往里走不能又询问是否同行。只说过打算去而没展示行动，则不能当作已到达。允许自然反复的小动作，但别整段重播先前行动或换词重演已解决的情绪事件。先在本次生成中理解已完成、已答复、尚未执行三者，再写下一拍，不另设判断AI。",
    "line只放当前说话者实际说出的台词，不带姓名冒号、动作描述或另一人的台词。stage_direction默认留空，只允许确实改变现场的大动作，不写微表情、语气或普通身体小动作。非空时独立旁白先显示，玩家点下一句才显示line；为空则直接台词。旁白不写未说出口的秘密、未来计划已执行、过去事件重演或额外案件事实。",
    SPARSE_NARRATION_GUIDANCE,
    "心绪牌是玩家选择遥的表达态度，不是给NPC施加情绪。NPC只根据自身性格、当前处境和听到的台词回应；不能提到卡牌、拾绪或读心。",
    "input=opening时由NPC开场，后续允许遥自然接话；input=listen表示顺着聊，不是遥保持沉默。双方可以自然来回，遥可以询问、安慰、答应、调侃或主动回应，不能因为没有逐句玩家选择就让对话停滞。若pending_choice非空，listen表示玩家把这一回应交给AI，直接自然回应，不原样重复等待玩家表态。",
    "input是fear/sympathy/affection时，beats[0]必须player，以player_expression回应pending_choice；随后双方可自然交替接话，不限制遥只说一句。不要把牌名当台词。恐惧可用迟疑或动作体现，不要求固定第一人称句式；问句、反问均允许。后续不要突然反转刚选的情绪，应有自然过渡。",
    "遥只能依据实际已知信息，不把NPC未说出的私密事实放进遥嘴里。允许顺着情境作出口头承诺、提出赠礼、转告已知消息、答应、指责或示好，允许有惊喜的人际发展；不能只因不是玩家亲选台词而拒绝。人物的指责/推测不是已证实罪行，口头约定也不是实际执行。",
    "案件事实及人物过去经历只能来自allowed_facts及已展示材料。dialogue_history只记录实际听见的话，不能洗白旧轮编造。普通即时动作、当下情绪、主观怀疑可以写；不能补出星期、购票时间、目的地、通话、约会或新证物，也不能编造姐姐怕黑、拍照回家开灯、临别动作等额外往事。",
    "本入口支持NPC约遥在已有地点会面：明确邀请或承诺到某处等遥时，由你同时输出action_plan，不另找AI重判动机。先自然商定具体地点、到达和等待结束时间；只有假设、可能、回忆、单纯‘去扫地’或遥替NPC作的决定不生成计划。没有新约定时action_plan=null，保留原计划；不要每段重复约定。现有计划及完成/过期状态是权威记忆，赴约见面后接住约定，不重作陌生人介绍。",
    'action_plan格式：{"type":"meet","targetNpcId":"player","locationId":"目录中的ID","arriveAt":绝对分钟,"waitUntil":绝对分钟,"reason":"约定目的","quote":"NPC约定台词连续原文","beatIndex":从0开始的NPC节拍索引}。至少留60分钟抵达，同一天白天等待，最晚可约未来24小时内；台词须说清地点与到达/等到的钟点，并与数字一致。建议等候至少1小时。计划在该句实际播放后保存，游戏时间到了才执行；不可声称已经移动完成。计划不是强迫玩家赴约，玩家可不去。',
    "出牌必须改变实际事情，不只是语气或好感。input为fear/sympathy/affection时必须输出一个合法consequence；opening/listen可为null，也允许自然产生合法事件。同一个你决定对白与事件，不另找AI重判。先基于当下交流选择可执行后果，再写有因果的遥表达与NPC决定；不能只写‘谢谢/好受一点’，也不固定某张牌必然对应某种结果。普通续聊不需强造事件；表态节点应有可改变事情的空间，不能在无执行余地时硬弹牌。",
    'consequence格式：{"type":"material|sorting_offer|sorting_cancel|meeting|pause","actionId":null或材料能力ID,"beatIndex":NPC决定台词索引,"quote":"该NPC台词连续原文"}。每次至多一个，来源必须是本段NPC实际说出的决定，不能只是遥单方面提议。合法结果在来源台词播放时落地，遥首句播放时扣牌，未播后果会保存待续。出牌后先落实当前结果，再引出下一次表态，不能让新选择截断本次后果。',
    "type=material时actionId只能从event_capabilities.materials选取原ID。show:表示NPC出示已有材料，台词播放后内容进入手记；take:表示NPC交付已有实物，台词播放后进入背包。不得展示目录外材料、编造新证据或提前在更早的旁白完成交付；对应材料操作的stage_direction留空，决定台词中自然说明正在出示或交付。没有material后果则不得声称已经展示或交付。签字、改口等其他案件动作仍不支持。",
    "type=sorting_offer仅当能力为true：小春接受遥帮忙整理真昼遗物，生成具体邀请，解锁‘一起整理遗物’操作。只是邀请还没整理完成；玩家另行选择花30分钟实施，系统会共同查看小春仍持有的已有材料，不凭空发现新证物。type=sorting_cancel仅当能力为true：小春撤回尚未完成的整理邀请，原操作被关闭；需要有语境原因，不用反复邀请撤回来制造事件。已完成的整理不能再当未完成。",
    "type=meeting必须同时提供合法action_plan，两者指向同一NPC决定节拍；沿用约定时间地点规则，不能把同地点同时间的旧约定重复当新后果。type=pause只在NPC确实要停止交流时使用：明确今天此刻先不聊、需要至少一小时独处，必须末句NPC、can_continue=false、choice_point=null、action_plan=null；系统立即封闭会面并在60游戏分钟内禁止新会面。不把pause当作缺少创意的通用惩罚保底。不保证好结果，但必须有合理后果。",
    "每段通常3至5个节拍，总数不超过conversation_pacing.maxGeneratedLines，允许双方来回。分段长度不是决策点。mustClose=true必须can_continue=false、choice_point=null，由NPC用符合farewell_hint的理由收尾；自然结束也要说明理由，不再等待回答。",
    HEART_CHOICE_GUIDANCE,
    "决定触发时立即在那句NPC台词停笔，即使只有1至2个节拍也合法，不必凑满3至5句；把它作为本段最后一个节拍，choice_point.quote原样引用该末句的关键文字，reason说明不同情绪回应为何会影响此刻交流。不要先替遥回答这句再让玩家补选。can_continue=true才可有choice_point。非决策段落可以以任一方台词结束，下一段自然接续。",
    "pickup的情绪含义只由你在生成本段对白时结合上下文判断，不由关键词或另一个审校AI重判。降低获取门槛：日常、轻微、含蓄但从当前表达和语境能合理感受到的情绪也应拾取，不必强烈爆发、直说情绪词或构成重大事件；符合且未达配额时优先给出pickup，不要惯性填null。fear包括NPC自己的不安、顾虑、担忧、畏缩、害怕失去或被否定；sympathy包括体谅、心疼别人；affection包括关心、依恋、眷恋和亲近，不限恋爱。",
    "例如NPC说‘你能再待一会儿吗？外面一响我就忍不住往门口看’，结合语境可拾取fear，即使没有‘我怕’；‘这一路都是你一个人撑过来的吧’可体现sympathy；‘你来了，屋里就没那么空了’可体现affection。示例仅用于理解语义，不能照抄为固定对白或词表。悲伤、自责可与恐惧或爱意并存，按实际流露判断，不因主情绪是悲伤就漏掉其他情绪；但纯粹悲伤、自责不自动等于体谅别人的sympathy。",
    "pickup.quote只作内部来源锚点，原样摘录对应beat的line或保留的stage_direction中的连续文字；语义依据可结合上下文，摘录本身无需包含情绪关键词。beat_index从0开始，只能指向npc，不能从遥或未展示的隐藏设定拾绪，也不能将单纯转述别人害怕当作NPC自己的恐惧。每段至多1张，already_gathered中的牌种本会面不再产出；没有可合理感知的对应情绪才填null。不为发牌强迫人物改变情绪、不补写微表情旁白，也不向玩家解释为何获得。",
    '格式：{"beats":[{"speaker":"npc或player","line":"台词","stage_direction":"","emotion":"情绪"}],"can_continue":true,"choice_point":null,"action_plan":null,"consequence":null,"closing_reason":"未结束时为空","used_fact_ids":[],"pickup":null}。需要玩家表态时choice_point={"quote":"末句NPC台词摘录","reason":"为什么需要玩家选择立场"}。产牌时pickup={"beat_index":0,"kind":"fear或sympathy或affection","quote":"原文摘录"}。提交前数beats项数：只能1至5项，还受maxGeneratedLines限制；未结束也只写下一段。每次必须包含consequence，出牌时不可为null且必须从event_capabilities里选择合法后果。每次必须包含action_plan：若NPC本段明确答应地点时间或发出具体赴约邀请，必须填上述会面对象，不能只在台词里答应却遗漏计划。收尾can_continue=false也能同时有action_plan，约定发生在离开之前。'
  ].join("\n");
  return { system, user: JSON.stringify(context), pacing, known: Object.keys(base.allowed_facts) };
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
  if (d.beats.length > pacing.maxGeneratedLines) throw new Error("dialogue_length");
  if (isHeartPlay(c) && (d.beats[0].speaker !== "player" || !d.beats.some(b => b.speaker === "npc"))) throw new Error("player_intent");
  if (c.heartIntent === "opening" && d.beats[0].speaker !== "npc") throw new Error("player_intent");
  const last = d.beats.at(-1)!;
  if (d.action_plan) {
    const b = d.beats[d.action_plan.beatIndex];
    if (!b || b.speaker !== "npc" || !b.line.includes(d.action_plan.quote) || !validMeetingPlan(d.action_plan, c.state, c.npcId)) throw new Error("invalid_action_plan");
  }
  if (d.choice_point && (!d.can_continue || last.speaker !== "npc" || !last.line.includes(d.choice_point.quote))) throw new Error("decision_point");
  if (!d.can_continue && last.speaker !== "npc") throw new Error("conversation_closing");
  if ((pacing.mustClose && d.can_continue) || (!d.can_continue && !d.closing_reason.trim())) throw new Error("conversation_closing");
  if (d.used_fact_ids.some(id => !known.includes(id))) throw new Error("unknown_fact");
  const text = d.beats.map(b => b.line + b.stage_direction).join("\n");
  if (isHeartPlay(c) && !d.consequence) throw new Error("invalid_consequence");
  if (d.consequence && (!validHeartConsequence(d.consequence, c.state, c.npcId, d.action_plan) ||
      !validConsequenceBeats(d.consequence, d.beats.map(b => ({ speakerId: b.speaker === "player" ? "player" : c.npcId, line: b.line })), c.npcId, d.can_continue, d.action_plan))) throw new Error("invalid_consequence");
  if (d.consequence?.type !== "material" && /(?:掏出|摊开|展开|递出|递给|展示|拿出)[^。\n]{0,18}(?:车票|材料|证据|信件)|(?:车票|材料|证据|信件)[^。\n]{0,18}(?:展开|摊开|递给|面前)|(?:签好|写好)(?:了)?(?:说明|证词)/.test(text)) throw new Error("action_mismatch");
  if (d.consequence?.type === "material" && d.beats[d.consequence.beatIndex].stage_direction.trim()) throw new Error("invalid_consequence");
  if (d.pickup) {
    const b = d.beats[d.pickup.beat_index];
    if (!b || b.speaker !== "npc" || !(b.line.includes(d.pickup.quote) || b.stage_direction.includes(d.pickup.quote)) || c.state.heartSession?.claimedKinds.includes(d.pickup.kind)) throw new Error("invalid_pickup");
    // Semantic classification belongs to the generator; only provenance and quotas are checked here.
  }
  return d;
}

export function heartResult(d: HeartDraftData, c: HeartContext, provider: "deepseek" | "mock"): DialogueResult {
  const beats = d.beats.map(b => ({ speakerId: b.speaker === "player" ? "player" : c.npcId, line: b.line, stageDirection: b.stage_direction, emotion: b.emotion }));
  return DialogueResultSchema.parse({ ...beats[0], continuations: beats.slice(1), options: [],
    heart: { canContinue: d.can_continue, choicePoint: d.choice_point, actionPlan: d.action_plan, consequence: d.consequence, pickups: d.pickup ? [{ beatIndex: d.pickup.beat_index, kind: d.pickup.kind, quote: d.pickup.quote }] : [] },
    debug: { provider, decision: "拾绪试玩：遥的表达与人物回应", usedFacts: d.used_fact_ids, promptVersion: HEART_PROMPT_VERSION, npcActionId: "none" }
  });
}

// Explicit offline demonstration only. Configured AI failures never spend a card on this script.
export function mockHeartDialogue(c: HeartContext): DialogueResult {
  const beats: HeartDraftData["beats"] = [];
  if (isHeartPlay(c)) beats.push({ speaker: "player", line: ({ fear: "我有点不安，不知道该怎么接着说。", sympathy: "如果说起来难受，可以慢一点。", affection: "我想在这里多陪你一会儿。" })[c.heartIntent as HeartKind], stage_direction: "看向小春。", emotion: heartCatalog[c.heartIntent as HeartKind].name });
  const npcLine = c.heartIntent === "opening" ? "我是雨宫小春。姐姐的东西……我怕自己整理不好，连她留下的东西都留不住。" :
    c.heartIntent === "fear" ? "你也不安啊。别勉强自己，我知道那种不好受的滋味。" :
    c.heartIntent === "sympathy" ? "我会慢慢说。姐姐对我那么好，我到现在还是很想她。" :
    c.heartIntent === "affection" ? "你肯留下来，我是高兴的。只是我还得缓缓。" : "我很想姐姐。她对我的好，我还一直记着。";
  beats.push({ speaker: "npc", line: npcLine, stage_direction: "手指攥住衣角，又慢慢松开。", emotion: c.heartIntent === "opening" ? "不安" : "柔和" });
  const kind: HeartKind | null = c.heartIntent === "opening" ? "fear" : c.heartIntent === "fear" ? "sympathy" : ["sympathy", "listen"].includes(c.heartIntent) ? "affection" : null;
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
  const choice = !pacing.mustClose && !paused && c.heartIntent !== "listen";
  if (choice) beats[beats.length - 1].line += "你会不会觉得这样的我很没用？";
  return heartResult({ consequence, action_plan: null, beats, can_continue: !pacing.mustClose && !paused, choice_point: choice ? { quote: "你会不会觉得这样的我很没用？", reason: "小春在意遥对自己的看法，需要玩家表态" } : null,
    closing_reason: pacing.mustClose || paused ? "需要缓一缓" : "", used_fact_ids: [], pickup }, c, "mock");
}
