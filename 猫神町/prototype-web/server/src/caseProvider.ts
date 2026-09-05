import { z } from "zod";
import { encounterPacing, characterFarewell } from "./dialoguePacing.ts";
import { randomUUID } from "node:crypto";
import { demoBootstrap, DialogueResultSchema, EndingResultSchema, type AiLogEntry, type AiProviderStatus, type DialogueOption, type DialogueResult, type EndingResult, type GameState, type Item } from "../../packages/shared/src/index.ts";
import { availableActions, characters, evidence, facts } from "./caseData.ts";

export const CASE_PROMPT_VERSION = "sunset-v4-graceful-conversation";
export class DialogueGenerationError extends Error {
  constructor() { super("这次回复没能生成成功，会面还没结束。原选项和进度已保留，请重试刚才的选择。"); }
}
export const CASE_PROMPT_STRUCTURE = ["角色行为和自然中文示例", "仅该角色知道的事实", "实际见闻记忆检索", "本次已播放对白", "当前玩家选择与行动边界", "当前公共规则", "前向分支与即时接话选项", "会面句数预算与人设收尾", "独立行动规划", "实际事实结局"];
export type CaseContext = { state: GameState; npcId: string; mode: "talk" | "gift"; selectedOption: DialogueOption | null; giftItem: Item | null; effect: string };
export type PlanIntent = "approach" | "threaten" | "attack" | "withdraw";
export interface CaseProvider {
  generate(context: CaseContext): Promise<DialogueResult>;
  plan(state: GameState, npcId: "npc_ritsu"): Promise<PlanIntent>;
  planWitness?(state: GameState): Promise<"wait" | "write" | "notify_ritsu" | "notify_police">;
  generateEnding(state: GameState): Promise<EndingResult>;
  getStatus(): AiProviderStatus;
  getLogs(): AiLogEntry[];
}
const Draft = z.object({
  line: z.string().min(1).max(240),
  stage_direction: z.string().max(60).default(""),
  emotion: z.string().min(1).max(20),
  continuations: z.array(z.object({ speaker: z.enum(["npc", "player"]), line: z.string().min(1).max(120), stage_direction: z.string().max(60).default(""), emotion: z.string().min(1).max(20) })).max(4).default([]),
  options: z.array(z.object({
    text: z.string().trim().min(2).max(12),
    intent: z.string().trim().min(1).max(100),
    angle: z.string().trim().min(1).max(40),
    anchor: z.string().trim().max(120).optional(),
    action_id: z.string().nullable()
  })).max(3).refine(o => o.length === 0 || o.length >= 2),
  used_fact_ids: z.array(z.string()).max(12),
  accept_action: z.boolean(),
  closing_reason: z.string().max(120).default("")
});
// Project only action eligibility for the next node. Actual state changes remain in GameService.
function responseActions(c: CaseContext, accepted: boolean): DialogueOption[] {
  const state = structuredClone(c.state);
  if (accepted && c.effect) {
    const [verb, id] = c.effect.split(":");
    if ((verb === "show" || verb === "take") && state.itemOwners[id] === c.npcId && evidence[id]) {
      if (!state.evidenceJournal.some(e => e.id === id)) state.evidenceJournal.push({
        id, name: demoBootstrap.items.find(i => i.id === id)!.baseName, text: evidence[id].text,
        source: evidence[id].source, day: state.day
      });
      if (verb === "take") state.itemOwners[id] = "player";
    }
    if (c.npcId === "npc_chiyo" && c.effect === "retract") state.storyFlags.push("chiyo_retracted");
    if (c.npcId === "npc_chiyo" && c.effect === "write" && state.itemOwners.E12 === "uncreated") {
      state.itemOwners.E12 = c.npcId;
      state.evidenceJournal.push({ id: "E12", name: "纠正说明", text: evidence.E12.text, source: evidence.E12.source, day: state.day });
    }
    if (c.npcId === "npc_makoto" && c.effect === "supplement" && state.itemOwners.E13 === "uncreated") {
      state.itemOwners.E13 = c.npcId;
      state.evidenceJournal.push({ id: "E13", name: "补充说明", text: evidence.E13.text, source: evidence.E13.source, day: state.day });
    }
  }
  return availableActions(state, c.npcId);
}
export function buildCasePrompt(c: CaseContext) {
  const core = characters[c.npcId];
  const pacing = encounterPacing(c.state, !!c.selectedOption);
  const runtime = c.state.npcStates[c.npcId];
  let options = [...new Map([...responseActions(c, false), ...responseActions(c, true)].map(o => [o.id, o])).values()];
  const known = runtime.knownFactIds.filter(id => facts[id]);
  // Relevance + recency + importance. Full recent exchange is retained separately.
  const terms = (c.selectedOption?.text ?? core.goal).split(/[，。？\s]/).filter(Boolean);
  const memories = runtime.memories.map((m, i) => ({ m, score: m.importance + i / 8 + terms.filter(t => m.summary.includes(t)).length * 5 }))
    .sort((a,b) => b.score - a.score).slice(0, 8).map(x => x.m.summary);
  const recent = c.state.eventLog.filter(e => e.type === "dialogue_generated" && e.targetId === c.npcId && e.audience.includes(c.npcId)).slice(-12).map(e => e.details.text);
  let start = c.state.eventLog.length - 1;
  while (start > 0 && c.state.eventLog[start].type !== "encounter_started") start--;
  const path = c.state.eventLog.slice(Math.max(0, start)).filter(e => e.type === "dialogue_choice" && e.targetId === c.npcId).map(e => ({
    selected: e.details.text, intent: e.details.intent ?? "",
    missed: e.details.missed ? JSON.parse(e.details.missed) as string[] : []
  }));
  const closedActions = c.state.eventLog.slice(Math.max(0, start)).filter(e => e.type === "dialogue_choice" && e.targetId === c.npcId)
    .flatMap(e => e.details.closedActions ? JSON.parse(e.details.closedActions) as string[] : []);
  options = options.filter(o => !closedActions.includes(o.id));
  return {
    options, known, path, pacing,
    system: [
      "你在写中文角色扮演游戏里的现场对话。像人说话，不像解说员。返回JSON。",
      "先接玩家刚说的这句话，再往下演。短句可以不完整，允许打断、迟疑、反问，但不要每句省略号。",
      "通常一段2至5个对白节拍，但不能超过conversation_pacing.maxGeneratedLines；收尾只剩1句时允许1句。每个节拍只做一件事。用拿东西、倒茶、收报纸等具体动作承接情绪，禁止空泛气氛描写和谜语。",
      "会面不是无限聊天：总计最多24句（玩家和NPC每个显示节拍各算1句，不按标点计数），约18句开始收尾，最多5次玩家选择。以conversation_pacing的计数为准，不要自行重新计数或对玩家报预算。",
      "conversation_pacing.mustClose=true时，本段必须先接玩家本句，再由NPC用符合人设和当前状况的理由结束会面，options必须为空，closing_reason说明缘由。末句不能问问题、邀玩家再追问或展开新线索。",
      "收尾可以去做职业杂务、收拾手头东西、借故避谈或需要独处休息。参考farewell_hint.reason与语气，自然改写，避免七个人同一句‘今天先这样’。不得编造新客户、电话、预约、证物或已发生的离场。受伤者不能突然恢复工作。",
      "未到上限也可自然结束。若options为空，也要有角色自己的告别理由与动作；收尾的离开意向不直接改变NPC位置或推进游戏时间。",
      "role.lead只是初次开场的切入口，不是每轮必须回到的话题。已有交谈先接最近的实际经历；选了分支就继续当前问题，不能重新介绍或重开话题菜单。",
      "玩家首句已由UI播放，不要重复替玩家再说一次。后续可让玩家说话，但只能延续所选态度，不可替玩家承诺、定罪、赠礼或选新的立场。",
      "主角后续并非必须说话。玩家选‘那不是你的错’是安慰，不是授权主角追问新案情、盘问细节或保证查清凶手；让NPC接住安慰，是否继续追问留到下一决策点。",
      "conversation_pacing.stage=developing时，优先让眼前问题得到充分回应，不因为一句安慰或暂时不知道答案就突然告别。winding_down时先收拢当前话题，可用自然小动作透露稍后要忙，仍让玩家回应一次。closing时才回应最后的选择、接住情绪、做一件收拾动作并告别，通常2至4个节拍（以剩余额度为准），不要一句‘去干活’替代玩家正在等的回答。",
      "player_just_said为空时是开场，所有节拍只能由NPC说话，绝不能替尚未选择的玩家发问、选材料或回答。首次见面先自然介绍自己并确认遥的来意，不当作已聊了一半。",
      "别编造玩家以前见过谁、是谁让玩家来的。主角后续台词只能用刚听到的信息和player_read_materials里的信息，不可使用NPC私下知道的秘密。",
      "不知道车票购买时间、目的地、吵架后具体行为时就说不清楚，不能为了接话补出新公司、工作安排、电话、星期或案发前几天等经历。不替角色讲出未知道的真相。知道事实不等于愿意坦白，可以撒谎或回避，但不得编造新证物、死亡方式、地点、人物或既成行为。",
      "撒谎只能否认自身行为、隐瞒或推责，不得额外编造新的来信、目击经过和案发时间。唯一完整信件收件人是千代，不是律。",
      "名字被实际说出来就会发现地点。按角色知道的关系自然指路，不要以钥匙/许可/封锁阻止进场。其他人物不在这里，不能突然插话。",
      "公共规则改变大家的信仰和审美，不改变已经发生的物理事实。把神和此人的生活联系起来，不必每轮念口号。",
      "对话是向前发生的一次交流，不是把全部问题问完的任务清单。conversation_path里已选和错过的选项不再补发，不改写同义句让玩家补选；新事实真的改变问题时才允许重新追问。不能为了用到人设里的猫、茶、指路而突然换题。",
      "先写本段对话，让NPC的回答、反问、动作或新信息自然形成一个需要玩家回应的时刻，再写2至3个选项。选项必须都承接末尾同一个问题/处境，角度或态度不同，不是三个互不相干的话题。每项2至12字，像玩家马上想说的话，不写抽象策略标签。",
      "例如NPC说‘她连我的票都买好了，我还叫她自己走。’，可选‘你们吵什么？’‘你不是故意的。’‘她怎么回你的？’。不要退回‘为何不信自杀？/猫叫什么？/找谁？’，也不要三个同义追问。",
      "angle简短说明本项独特角度。选项只基于玩家刚听到/看见的对白动作和已读材料；不得把尚未说出的姐妹吵架、录音等私密事实当前提。最后一个节拍由NPC说，把回应权留给玩家；若确实自然结束，options=[]，不要硬造菜单。",
      "action_catalog只是合法的系统动作，不是待选话题库。选项文案由你根据此刻对话生成，普通接话action_id=null；只有玩家明确请求看、拿、签写等对应动作才填合法id，不能把安慰/质疑绑定成拿走物品。无需为了提供动作而转移话题。",
      "任何看/拿材料的选项，都要求NPC本段或上一段实际说过该材料的名称；不能只自我介绍就冒出委托单、车票等玩家没听过的东西。",
      "accept_action控制是否同意本次具体请求。无请求则false。未同意不能声称已经展示、交付或签字；同意则围绕请求说话，正式物品内容和状态由系统落实。",
      "收到show:请求就是玩家请求查看；take:请求是索要实物。如果说看吧、把材料摊开/递到玩家面前，就是同意，必须accept_action:true。拒绝请明确说暂时不给看，不要一边递出一边false。材料归属以held_materials为准，不能把自己持有的副本说成只有别人那里才有。",
      'JSON结构：{"line":"NPC首句","stage_direction":"动作","emotion":"情绪","continuations":[{"speaker":"npc或player","line":"台词","stage_direction":"动作","emotion":"情绪"}],"options":[{"text":"短接话","intent":"玩家本次具体意图","angle":"角度","action_id":null}],"used_fact_ids":["本轮使用事实ID"],"accept_action":false}'
    ].join("\n"),
    user: JSON.stringify({
      role: { name: demoBootstrap.npcs.find(n => n.id === c.npcId)!.name, ...core, known: undefined,
        lead: !c.selectedOption && runtime.memories.length === 0 ? core.lead : undefined,
        goal: c.selectedOption || runtime.memories.length > 0 ? "回应眼前的玩家态度，延续当前交流；不补完初次开场的展示材料任务。" : core.goal },
      allowed_facts: Object.fromEntries(known.map(id => [id, facts[id]])),
      correction: c.npcId === "npc_chiyo" ? "只知道信里的离町计划，不知道两张票，除非玩家展示过E01。" : undefined,
      current: { day: c.state.day, minute: c.state.currentMinute, location: demoBootstrap.locations.find(l => l.id === c.state.currentLocationId)?.name,
        rule: c.state.activeRules, health: runtime.lifeState, relationship: runtime.relationship },
      town_places: demoBootstrap.locations.map(l => ({ name: l.name, description: l.description })),
      public_contacts: demoBootstrap.npcs.map(n => ({ name: n.name, occupation: n.occupation })),
      first_meeting: runtime.memories.length === 0,
      conversation_pacing: pacing,
      farewell_hint: characterFarewell(c.state, c.npcId),
      beat_format: c.selectedOption ? "NPC回应本句选择，再写至多4个平铺的后续节拍，不能嵌套continuations。后续允许主角接话；mustClose时最后由NPC告别，否则可留下回应空间。" :
        "这是玩家尚未表态的开场：line及continuations每一句全由NPC说，speaker必须全为npc。continuations平铺，不允许嵌套。不要替玩家自我介绍或表示哀悼。",
      timeline_guard: "案发距游戏第一天约三周；车票日期是案发次日，不是游戏中的明天。具体发车时刻没有设定，不要编造六点四十等时刻。信中‘明天’是当时写信的说法。",
      protagonist: demoBootstrap.player, recent_spoken_lines: recent, retrieved_memories: memories,
      reflection: runtime.reflection, open_loops: runtime.openLoops,
      conversation_path: path,
      closed_action_requests: closedActions,
      chosen_branch: c.selectedOption ? { text: c.selectedOption.text, intent: c.selectedOption.intent, angle: c.selectedOption.angle, anchor: c.selectedOption.anchor } : null,
      branch_rule: "missed只是玩家未选的可能回应，不是NPC已经听过的话、玩家知道的事实或待补完任务；仅用于避免返回旧节点。",
      player_just_said: c.selectedOption?.playerLine ?? c.selectedOption?.text ?? null,
      current_request: c.effect || "无物品或状态请求", gift_received: c.giftItem?.baseName ?? null,
      action_request: c.effect ? {
        id: c.effect, description: c.selectedOption?.intent,
        item_name: demoBootstrap.items.find(i => i.id === c.effect.split(":")[1])?.baseName,
        requested_by: "朝雾遥", instruction: "同意此请求则accept_action=true；拒绝则false，台词和动作必须一致"
      } : null,
      held_materials: demoBootstrap.items.filter(i => c.state.itemOwners[i.id] === c.npcId && evidence[i.id]).map(i => ({ id: i.id, name: i.baseName, owner: "你本人" })),
      player_read_materials: c.state.evidenceJournal.map(e => ({ name: e.name, text: e.text })),
      output_example: {
        line: c.selectedOption ? "请在这里直接回应玩家本句请求，不要照抄此占位文字" : "请用角色口气自我介绍后引出lead里的具体事情，不要照抄此占位文字",
        stage_direction: "放下手里的东西，看向你。", emotion: "平静", continuations: [],
        options: [], used_fact_ids: [], accept_action: false, closing_reason: ""
      },
      requested_material: /^(show:|take:)/.test(c.effect) ? evidence[c.effect.split(":")[1]]?.text : undefined,
      action_catalog: options.map(o => ({ id: o.id, description: o.intent, material: demoBootstrap.items.find(i => i.id === o.id.split(":")[1])?.baseName }))
    })
  };
}
export function fallbackDialogue(c: CaseContext): DialogueResult {
  const core = characters[c.npcId];
  const opening = ({
    npc_koharu: ["她想带你去哪？", "买票也不能证明。"],
    npc_saya: ["值班页写了什么？", "怕小春难过？"],
    npc_genichi: ["你让律写什么？", "先别替我安排。"],
    npc_ritsu: ["那报道核实过吗？", "你倒挺坦然。"],
    npc_makoto: ["结案依据是什么？", "你自己核对过吗？"],
    npc_mio: ["那怎么判的自杀？", "你提过异议吗？"],
    npc_chiyo: ["信后面写了什么？", "少印是故意的？"]
  } as Record<string, string[]>)[c.npcId];
  const options: DialogueOption[] = c.selectedOption ? [] :
    (c.giftItem ? ["你打算怎么用？", "喜欢就留着。"] : opening).map((text, i) => ({
      id: "choice_" + randomUUID(), text, playerLine: text, intent: text,
      actionId: null, angle: i === 0 ? "追问" : "表态"
    }));
  const action = c.effect || "";
  let line = c.selectedOption ? "你问的是这件事啊。等一下，我把手上的东西放好。" : core.lead;
  if (action.startsWith("show:")) line = "可以看。先说清楚，这是我手上的材料，不等于它能证明所有事情。";
  if (action.startsWith("take:")) line = "好，这份你拿着。别把它和听来的话混在一起。";
  if (action === "retract") line = "我撒过谎。律不是整晚都在旅馆。那晚九点二十分左右，我看见他从夕见台方向回来。可我没看见真昼是怎么掉下去的。";
  if (action === "write") line = "口头说了还不够，是吧。纸拿来，我把看见的和没看见的分开写，最后签我的名字。";
  if (action === "protect") line = "我去白石旅馆接千代。路上要时间，你如果先到，别让她一个人去见别人。";
  if (action === "supplement") line = "这条补进案卷。重新核查，不等于现在就给谁定罪。";
  if (c.giftItem && !c.selectedOption) line = "给我的？" + c.giftItem.baseName + "我先收下了。你是想让我用它，还是有话要借它说？";
  const rule = c.state.activeRules.faith?.displayText;
  const continuations: DialogueResult["continuations"] = [];
  if (!c.selectedOption && rule) continuations.push({ speakerId: c.npcId, line: "现在镇上都说“" + rule + "”。我也得给它留个位置。可真昼留下的这些事，还是得我们自己去问。", emotion: "认真", stageDirection: "把桌边的小物件摆正。" });
  // On a failed continuation, end safely instead of resetting to a topic hub.
  if (c.selectedOption && !action) line = "……这话我听见了。让我缓一缓，今天先说到这儿吧。";
  const pacing = encounterPacing(c.state, !!c.selectedOption);
  if (pacing.mustClose) options.length = 0;
  let closingStageDirection = "把面前的东西理到一边。";
  if (!options.length) {
    const farewell = characterFarewell(c.state, c.npcId, action);
    if (!action) {
      line = farewell.line; continuations.length = 0; closingStageDirection = farewell.stageDirection;
      if (c.selectedOption && pacing.maxGeneratedLines >= 2) {
        line = /安慰|体谅|不是你的错|别.*责|别勉强/.test(c.selectedOption.intent + c.selectedOption.text) ?
          "……谢谢你这么说。我听进去了，只是得慢慢缓一缓。" :
          "你刚才说的，我听见了。我现在还没理顺，不想随口给你一个答案。";
        closingStageDirection = "停了片刻，认真看向你。";
        continuations.push({ speakerId: c.npcId, line: farewell.line, stageDirection: farewell.stageDirection, emotion: "平静" });
      }
    }
    else if (pacing.maxGeneratedLines >= 2) continuations.push({ speakerId: c.npcId, ...farewell, emotion: "平静" });
    else { line += farewell.line; continuations.length = 0; }
  }
  return DialogueResultSchema.parse({ speakerId: c.npcId, line, emotion: "认真", stageDirection: closingStageDirection, continuations, options,
    debug: { provider: "mock_fallback", decision: "有界保底对白", usedFacts: [], promptVersion: CASE_PROMPT_VERSION, npcActionId: action || "none" } });
}
export function fallbackEnding(state: GameState): EndingResult {
  const events = state.eventLog.filter(e => e.audience.includes("player"));
  const gifts = events.filter(e => e.type === "item_transfer").map(e => e.details.text);
  const rules = Object.values(state.activeRules).filter(Boolean).map(r => r!.displayText);
  return EndingResultSchema.parse({
    title: "七天之后，案卷还没合上", subtitle: "你的代理任期到了，留下的材料和改变仍在。",
    narration: "你收起整理用的纸箱。七天里，你留下了" + state.evidenceJournal.length + "条材料记录。" +
      (state.storyFlags.includes("case_reopened") ? "犬饲诚已补写说明，案件将重新核查。那还不是判决。" : "旧的自杀结论仍在案卷里。你的疑问还没有变成新的调查结论。") +
      (rules.length ? "镇上的人仍照着你定下的规则生活：" + rules.join("；") + "。" : "供奉位没有替任何人作答。"),
    npcOutcomes: demoBootstrap.npcs.map(n => ({ npcId: n.id, headline: n.name,
      text: state.npcStates[n.id].lifeState === "dead" ? "在这七天里死亡，再也无法回应你的问题。" :
        state.npcStates[n.id].lifeState === "injured" ? "受伤后还在休养。活着的人还可以继续作证。" :
        "仍然活着。你们的关系停在" + state.npcStates[n.id].relationship + "，那些实际说过的话不会因为任期结束而消失。" })),
    closingLine: "规则可以改，发生过的事不能靠一句话改掉。", provider: "mock_fallback", promptVersion: CASE_PROMPT_VERSION,
    factSummary: { gifts, rules, relationships: [], storyBeats: events.filter(e => ["incident","story_beat"].includes(e.type)).map(e => e.details.text) },
    usedEventIds: events.map(e => e.id)
  });
}
class DialogueValidationError extends Error {
  constructor(code: string, readonly repairHint: string) { super(code); }
}
type Options = { apiKey?: string; baseUrl?: string; model?: string; timeoutMs?: number; maxAttempts?: number; fetchImpl?: typeof fetch; review?: boolean };
export class CaseDialogueProvider implements CaseProvider {
  private logs: AiLogEntry[] = [];
  private options: Required<Options>;
  constructor(o: Options = {}) {
    this.options = { apiKey: o.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "", baseUrl: o.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      model: o.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash", timeoutMs: o.timeoutMs ?? 15000, maxAttempts: o.maxAttempts ?? 2, fetchImpl: o.fetchImpl ?? fetch, review: o.review ?? true };
  }
  getStatus(): AiProviderStatus { return { targetNpcId: "all_case_npcs", configured: !!this.options.apiKey, provider: this.options.apiKey ? "deepseek" : "mock", model: this.options.model, promptVersion: CASE_PROMPT_VERSION }; }
  getLogs() { return structuredClone(this.logs); }
  private async request<T>(npcId: string, mode: AiLogEntry["mode"], system: string, user: string, validate: (draft: unknown) => T | Promise<T>): Promise<T | null> {
    if (!this.options.apiKey) return null;
    const started = Date.now();
    let attempt = 0;
    let failureCode = "transport_failure";
    let repairHint = "";
    const maxAttempts = mode === "review" ? 1 : this.options.maxAttempts;
    for (; attempt < maxAttempts; attempt++) {
      try {
        const r = await this.options.fetchImpl(this.options.baseUrl.replace(/\/$/, "") + "/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + this.options.apiKey },
          signal: AbortSignal.timeout(this.options.timeoutMs),
          body: JSON.stringify({ model: this.options.model, temperature: mode === "review" ? 0 : 0.65, max_tokens: mode === "ending" ? 2400 : 1800,
            thinking: { type: "disabled" }, response_format: { type: "json_object" },
            messages: [{ role: "system", content: system }, { role: "user", content: user + (attempt ? "\n上次失败代码：" + failureCode + (repairHint ? "；具体问题：" + repairHint : "") + "。修正：开场只能NPC说话；options生成2至3个承接本段末尾NPC原话的短选项（或自然结束为空）；不能返回已选/错过话题，不利用未说出口的私密事实出选项；action_id只能用合法动作或null；使用给定事实ID；出示/递出所请求材料必须accept_action=true。" : "") }] })
        });
        if (!r.ok) { failureCode = "http_" + r.status; if ([401,403,402].includes(r.status)) break; throw new Error("http_error"); }
        const body = await r.json() as { choices?: { finish_reason: string; message: { content: string } }[] };
        if (body.choices?.[0]?.finish_reason !== "stop") throw new Error("incomplete");
        const result = await validate(JSON.parse(body.choices[0].message.content));
        this.log(npcId, mode, started, attempt + 1, true); return result;
      } catch (error) {
        repairHint = error instanceof DialogueValidationError ? error.repairHint.slice(0, 300) : "";
        const safe = ["unselected_player_speech", "unknown_fact", "invalid_choice", "unintroduced_material", "legacy_case", "incomplete", "action_mismatch", "timeline_mismatch", "new_case_fact", "player_intent", "ownership", "review_unavailable", "branch_rewind", "off_topic", "option_intent", "conversation_closing", "dialogue_length"];
        if (error instanceof z.ZodError) { failureCode = "schema_validation"; repairHint = error.issues.map(i => i.path.join(".") + ": " + i.message).slice(0, 3).join("; ").slice(0, 300); }
        else if (error instanceof Error && safe.includes(error.message)) failureCode = error.message;
        else if (error instanceof SyntaxError) failureCode = "invalid_json";
      }
    }
    this.log(npcId, mode, started, Math.min(attempt + 1, maxAttempts), false, failureCode); return null;
  }
  private log(npcId: string, mode: AiLogEntry["mode"], start: number, attempts: number, success: boolean, errorCode = "generation_failure") {
    this.logs.push({ id: "ai_" + Date.now() + "_" + this.logs.length, timestamp: new Date().toISOString(), npcId, mode, provider: success ? "deepseek" : "mock_fallback", model: this.options.model,
      promptVersion: CASE_PROMPT_VERSION, latencyMs: Date.now() - start, attemptCount: attempts, success, usedFacts: [], errorCode: success ? null : errorCode });
    this.logs = this.logs.slice(-100);
  }
  async generate(c: CaseContext): Promise<DialogueResult> {
    const p = buildCasePrompt(c);
    const result = await this.request(c.npcId, c.mode, p.system, p.user, async raw => {
      const d = Draft.parse(raw);
      if (1 + d.continuations.length > p.pacing.maxGeneratedLines) throw new DialogueValidationError("dialogue_length", `本段只能生成最多${p.pacing.maxGeneratedLines}个节拍，包括line。`);
      if (p.pacing.mustClose && (d.options.length || !d.closing_reason.trim())) throw new DialogueValidationError("conversation_closing", "本次会面已进入收尾。本段回应后以角色自己的理由告别，options=[]并填写closing_reason，不再抛问题。");
      if (!d.options.length && d.continuations.at(-1)?.speaker === "player") throw new DialogueValidationError("conversation_closing", "会面末句必须由NPC说完告别，不能停在主角的问题上。");
      if (!c.selectedOption && d.continuations.some(b => b.speaker === "player")) throw new Error("unselected_player_speech");
      if (d.used_fact_ids.some(id => !p.known.includes(id))) throw new Error("unknown_fact");
      const normalize = (text: string) => text.replace(/[\s\p{P}\p{S}]/gu, "");
      if (new Set(d.options.map(o => normalize(o.text))).size !== d.options.length ||
          new Set(d.options.map(o => o.angle)).size !== d.options.length ||
          d.options.some(o => o.action_id && (!p.options.some(a => a.id === o.action_id) || !responseActions(c, d.accept_action).some(a => a.id === o.action_id)))) throw new Error("invalid_choice");
      if (d.options.length && d.continuations.at(-1)?.speaker === "player") throw new Error("off_topic");
      let encounterStart = c.state.eventLog.length - 1;
      while (encounterStart > 0 && c.state.eventLog[encounterStart].type !== "encounter_started") encounterStart--;
      const spokenPlayerLines = c.state.eventLog.slice(Math.max(0, encounterStart))
        .filter(e => e.type === "dialogue_generated" && e.actorId === "player" && e.targetId === c.npcId)
        .map(e => e.details.text.split("朝雾遥：").at(-1) ?? "");
      const closed = [...p.path.flatMap(step => [step.selected, ...step.missed]), ...spokenPlayerLines,
        ...(c.selectedOption ? [c.selectedOption.text] : [])].map(normalize);
      if (d.options.some(o => closed.includes(normalize(o.text)))) throw new Error("branch_rewind");
      const text = [d.line, ...d.continuations.map(b => b.line)].join("");
      const previous = c.selectedOption && c.state.currentDialogue ? [c.state.currentDialogue.line, ...c.state.currentDialogue.continuations.map(b => b.line)].join("") : "";
      for (const id of d.options.map(o => o.action_id).filter((id): id is string => !!id && /^(show:|take:)/.test(id))) {
        const itemId = id.split(":")[1], name = demoBootstrap.items.find(i => i.id === itemId)!.baseName;
        if (!(text + previous).includes(name) && !(itemId === "E01" && (text + previous).includes("票"))) throw new Error("unintroduced_material");
      }
      if (/日期是明天|明天早上.*车|六点四十/.test(text)) throw new Error("timeline_mismatch");
      const staging = [d.stage_direction, ...d.continuations.map(b => b.stage_direction)].join("");
      if (/^(show:|take:)/.test(c.effect) && !d.accept_action &&
          (/看吧|你看[，。]|拿去吧/.test(text) || /(?:递|推|摊|放)[^。]{0,12}(?:面前|给你|过来|过去|桌上)/.test(staging))) throw new Error("action_mismatch");
      if (!d.accept_action && c.effect === "retract" && /撒(?:过)?谎|证词[^。]{0,8}不实|不是整晚|并非整晚/.test(text)) throw new Error("action_mismatch");
      if (!d.accept_action && c.effect === "write" && /签(?:下|好|上|了)|写好了/.test(text + staging)) throw new Error("action_mismatch");
      if (/零号站台|17[:：]47|存在被抹除|第四副碗筷/.test(text)) throw new Error("legacy_case");
      if (this.options.review) {
        const review = await this.request(c.npcId, "review",
          '你是严格的逐项剧情审校员，只检查，不续写。草稿来自另一个可能犯错的模型，不能因语句流畅就通过。选项在candidate全部对白节拍播放完后才显示：candidate里的NPC首句和continuations均已被玩家听到，不能仅以recent_lines判断。例如本段刚说吵架，选项“你们为什么吵”完全合法；“她生气了吗”是询问未知态度，不是宣称新事实，允许。先检查选项，再检查台词。1. 所有选项要接住NPC本段末尾的同一件事，态度/角度不同；不能退回其他话题。2. missed里的问题已经错过，同义改写也不能补发；closed_action_requests同一动作不得换文案再次索取；基于新信息深入追问允许。3. 选项不能泄露NPC还没说出的事实，如还没提吵架就问你们吵架了吗。4. 案件具体事实只能来自allowed_facts和presented_materials；recent_lines只帮助衔接，不是事实依据，不能洗白旧轮编造。尤其“出事是上周五”“案发前一周买的票”“等一组照片拍完再走”“她躲着人打电话”都不在设定里，必须拒绝。生活中的即时小动作、主观怀疑、否认、对既定吵架的情绪解释允许，不额外编造案件经历。5. action_id必须吻合选项请求，accept_action必须吻合当前请求的实际展示/交付/拒绝。6. 后续主角只能延续所选意图，不擅自承诺或定罪。7. conversation_pacing.mustClose时，或options为空时，检查NPC是否用符合人设和当前状态的理由结束交谈（工作、杂务、独处、休息等），没有继续提问或抛新线索；不合格用conversation_closing。返回JSON {"approved":true或false,"reason":"none|new_case_fact|player_intent|ownership|off_topic|branch_rewind|option_intent|conversation_closing","issue":"违规原句及原因，合法则为空"}。有一项违规就false，不替草稿辩解。',
          JSON.stringify({
            allowed_facts: Object.fromEntries(p.known.map(id => [id, facts[id]])),
            presented_materials: { read: c.state.evidenceJournal, requested: evidence[c.effect.split(":")[1]]?.text },
            role_boundaries: characters[c.npcId].secret,
            timeline: "案发距第一天三周；离町车票是案发次日。未设购买时间、星期、发车时刻、目的地，不得编造。",
            recent_lines: JSON.parse(p.user).recent_spoken_lines,
            player_hears_before_choices: [d.line, ...d.continuations.filter(b => b.speaker === "npc").map(b => b.line)],
            selected: c.selectedOption, path: p.path,
            closed_action_requests: JSON.parse(p.user).closed_action_requests,
            current_request: c.effect,
            held_materials: JSON.parse(p.user).held_materials,
            conversation_pacing: p.pacing,
            farewell_hint: characterFarewell(c.state, c.npcId),
            candidate: d
          }),
          input => z.object({ approved: z.boolean(), reason: z.enum(["none","new_case_fact","player_intent","ownership","off_topic","branch_rewind","option_intent","conversation_closing"]), issue: z.string().max(1000).default("") }).parse(input));
        if (!review) throw new Error("review_unavailable");
        if (!review.approved || review.reason !== "none") throw new DialogueValidationError(review.reason === "none" ? "new_case_fact" : review.reason, review.issue);
      }
      return DialogueResultSchema.parse({ speakerId: c.npcId, line: d.line, stageDirection: d.stage_direction, emotion: d.emotion,
        continuations: d.continuations.map(b => ({ speakerId: b.speaker === "player" ? "player" : c.npcId, line: b.line, stageDirection: b.stage_direction, emotion: b.emotion })),
        options: d.options.map(o => ({ id: "choice_" + randomUUID(), text: o.text, playerLine: o.text,
          intent: o.intent, anchor: o.anchor, angle: o.angle, actionId: o.action_id })),
        debug: { provider: "deepseek", decision: "角色有限知情生成", usedFacts: d.used_fact_ids, promptVersion: CASE_PROMPT_VERSION,
          npcActionId: d.accept_action && c.effect ? c.effect : "none" } });
    });
    // A technical failure is not an NPC's decision to leave. Keep the current node retryable.
    if (!result && this.options.apiKey && c.selectedOption && !p.pacing.mustClose) throw new DialogueGenerationError();
    return result ?? fallbackDialogue(c);
  }
  async plan(state: GameState, npcId: "npc_ritsu"): Promise<PlanIntent> {
    if (!state.npcStates[npcId].knownFactIds.includes("R01")) return "withdraw";
    const runtime = state.npcStates[npcId];
    const result = await this.request(npcId, "plan",
      '你是藤崎律的独立行动规划器。返回JSON {"intent":"approach|threaten|attack|withdraw"}。优先维持身份和自保。攻击不是必选。计划不等于成功，系统会检查到场、证人、玩家干预。只依据本人收到的消息，不读取全镇隐私。',
      JSON.stringify({ role: characters[npcId], facts: Object.fromEntries(runtime.knownFactIds.map(id => [id, facts[id]])), actualMemories: runtime.memories.slice(-8), relationshipToPlayer: runtime.relationship, publicRules: state.activeRules, day: state.day }),
      raw => z.object({ intent: z.enum(["approach","threaten","attack","withdraw"]) }).parse(raw).intent);
    return result ?? "approach";
  }
  async planWitness(state: GameState): Promise<"wait" | "write" | "notify_ritsu" | "notify_police"> {
    const n = state.npcStates.npc_chiyo;
    if (!n.knownFactIds.includes("R01") || n.lifeState !== "alive") return "wait";
    const result = await this.request("npc_chiyo", "plan",
      '你是白石千代的行动规划器。她已实际改口。根据护短、内疚、眼前交流决定下一步，不知道律会选什么。返回JSON {"action":"wait|write|notify_ritsu|notify_police"}。wait是暂缓，write只写说明，notify_ritsu是打电话告诉律自己改口，notify_police是联系犬饲诚请求保护；四者分开，不偷偷全做。',
      JSON.stringify({ role: characters.npc_chiyo, receivedFacts: Object.fromEntries(n.knownFactIds.map(id => [id, facts[id]])), memories: n.memories.slice(-8) }),
      raw => z.object({ action: z.enum(["wait","write","notify_ritsu","notify_police"]) }).parse(raw).action);
    return result ?? "wait";
  }
  async generateEnding(state: GameState): Promise<EndingResult> {
    const base = fallbackEnding(state);
    const result = await this.request("chapter", "ending",
      "根据给定的实际结果润色中文游戏结局。禁止揭露未知凶手，禁止凭空定罪、复活、死亡、恋爱或补发证据。保留npcId及每人已确定的生死事实。返回给定完整JSON结构，只改title/subtitle/narration/closingLine和npcOutcomes里的headline/text；其余照抄。",
      JSON.stringify(base), async raw => {
        const d = EndingResultSchema.parse(raw);
        if (d.npcOutcomes.some((n,i) => n.npcId !== base.npcOutcomes[i].npcId)) throw new Error("cast");
        if (this.options.review) {
          const review = await this.request("chapter", "review",
            '你是结局事实审校。只能用提供的base作为实际结果，环境感受可补，不能新增定罪、凶手揭露、死亡、复活、恋爱、获救、逃离或新证据。审查候选title/subtitle/narration/closingLine。返回JSON {"approved":true或false}。',
            JSON.stringify({ base, candidate: { title: d.title, subtitle: d.subtitle, narration: d.narration, closingLine: d.closingLine } }),
            input => z.object({ approved: z.boolean() }).parse(input));
          if (!review?.approved) throw new Error("new_case_fact");
        }
        return { ...base, title: d.title, subtitle: d.subtitle, narration: d.narration, closingLine: d.closingLine,
          // Outcomes are factual captions: prose cannot rewrite life states or judicial outcomes.
          provider: "deepseek" as const };
      });
    return result ?? base;
  }
}
