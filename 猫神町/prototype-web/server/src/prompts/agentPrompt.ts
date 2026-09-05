import {
  demoBootstrap,
  type DialogueOption,
  type GameState,
  type InteractionMode,
  type Item,
  type Npc,
  type NpcMemory
} from "../../../packages/shared/src/index.ts";
import { dialogueVoices, openingVoiceExamples } from "./dialogueVoice.ts";

export const AGENT_PROMPT_VERSION = "agent-dialogue-v4.2-natural";

export const AGENT_PROMPT_STRUCTURE = [
  "精简且常驻的角色行为核心",
  "角色当下的小心思与中文对话示例（非剧情事实）",
  "当前世界、地点和具体案件事实",
  "本次会面的完整短期对白",
  "按相关性、近期性和重要度检索的长期记忆",
  "角色当前反思与未完成事项",
  "预先约束的本轮目标和可执行动作",
  "玩家已知信息、当前关注点与选择语义边界",
  "对白、动作、记忆候选和下一选项的结构化输出"
] as const;

export type DialogueGenerationContext = {
  state: GameState;
  npc: Npc;
  locationId: string;
  mode: InteractionMode;
  giftItem: Item | null;
  selectedOption: DialogueOption | null;
};

type OptionDefinition = {
  id: string;
  shortText: string;
  playerLine: string;
  intent: string;
  purpose: string;
};

type SceneBeat = {
  id: string;
  goal: string;
  concreteSituation: string;
  requiredMove: string;
  choiceLead: string;
  action: { id: string; description: string };
  requiredFactIds: string[];
};

export type BuiltPrompt = {
  promptVersion: string;
  system: string;
  user: string;
  allowedOptionIds: string[];
  optionIntentById: Record<string, string>;
  optionTextById: Record<string, string>;
  optionPlayerLineById: Record<string, string>;
  optionRequiredWordsById: Record<string, string[]>;
  optionRequiredActionsById: Record<string, string[]>;
  knownFactIds: string[];
  factTextById: Record<string, string>;
  requiredFactIds: string[];
  allowedActionIds: string[];
  actionDescriptionById: Record<string, string>;
  sceneGoal: string;
  selectedOutcome: string;
  openingPlayerBeatAllowed: boolean;
};

const talkOptions: Record<string, OptionDefinition[][]> = {
  npc_koharu: [
    [
      { id: "ask_memory", shortText: "铃铛给我看看。", playerLine: "铃铛给我看看。", intent: "核对姐姐身份", purpose: "通过眼前猫铃核对姐姐的存在；已经说过名字就不再问名字，不答应调查" },
      { id: "koharu_ask_god", shortText: "带我去后殿。", playerLine: "带我去后殿。既然你说真昼留下过东西，我们现在就去找。", intent: "立即查后殿", purpose: "接受小春的行动邀请并要求现场查证" },
      { id: "koharu_doubt_memory", shortText: "谁见过她？", playerLine: "除了你，还有谁亲眼见过雨宫真昼？我要一个活着的证人。", intent: "寻找目击者", purpose: "不接受单一证词，要求指出纱夜或弦一" }
    ],
    [
      { id: "koharu_guard_memory", shortText: "我帮你找她。", playerLine: "我帮你找雨宫真昼。但你发现任何证据，都必须先给我看。", intent: "答应共同调查", purpose: "与小春建立有条件的调查同盟" },
      { id: "koharu_test_god", shortText: "先找纱夜。", playerLine: "先去找纱夜。她如果真的开过零号站台，就让她当面承认。", intent: "追问纱夜", purpose: "把下一步调查指向直接目击者" },
      { id: "koharu_leave_empty", shortText: "先找九条。", playerLine: "先找九条弦一。那张黑色车票既然是他给的，他就必须解释。", intent: "质问弦一", purpose: "把下一步调查指向给票者和主要嫌疑人" }
    ]
  ],
  npc_saya: [
    [
      { id: "saya_open_gentle", shortText: "票给我看看？", playerLine: "票给我看看？", intent: "温和追问乘客", purpose: "温和核对眼前黑票与乘客的关联，可以请求查看或追问票如何回来；不重问已知姓名，不声称已经得到票" },
      { id: "saya_open_press", shortText: "你为什么开门？", playerLine: "你为什么开门？", intent: "逼问开门责任", purpose: "追问她为什么放人进去或为什么如今才说；已承认开门就不再问是不是她开的" },
      { id: "saya_open_absurd", shortText: "它自己跑回来的？", playerLine: "它自己跑回来的？", intent: "黑色玩笑试探", purpose: "对黑票重现这件怪事吐槽或开玩笑，不宣布真昼死亡，不嘲笑受害者" }
    ],
    [
      { id: "saya_ticket_inspect", shortText: "证据都给我。", playerLine: "把黑色车票、票根和通行令全给我看。少一张都不算坦白。", intent: "索要全部证据", purpose: "要求查看三个可以互证的物证" },
      { id: "saya_ticket_doubt", shortText: "谁命令你的？", playerLine: "是谁命令你开门？我要名字，不要职位。", intent: "追问命令来源", purpose: "逼纱夜说出九条家的通行令" },
      { id: "saya_ticket_ally", shortText: "她回头了吗？", playerLine: "你亲眼看见雨宫真昼上车了吗？她当时有没有回头？", intent: "追问最后目击", purpose: "触碰纱夜最具体的罪疚" }
    ],
    [
      { id: "saya_truth_plain", shortText: "拿出原记录。", playerLine: "把你改过的那页值班记录拿出来。现在还来得及留下原件。", intent: "要求交出原记录", purpose: "迫使纱夜停止口头解释并拿出证物" },
      { id: "saya_bluff_bell", shortText: "你在保护站长？", playerLine: "你还在保护当年的站长，对吗？他手里有什么能让你闭嘴？", intent: "错误指控站长", purpose: "通过错误指控迫使纱夜纠正真正的施压者" },
      { id: "saya_personal_probe", shortText: "你藏了什么？", playerLine: "真昼失踪前给你留了东西。你一直没有交给小春，是不是？", intent: "拆穿私藏留言", purpose: "直接触碰复写纸背面的留言" }
    ],
    [
      { id: "saya_take_ticket", shortText: "票给我。", playerLine: "票给我。我不会在23:47上车，只会拿它去逼九条开保险柜。", intent: "带走车票", purpose: "取得证物并明确下一目标" },
      { id: "saya_leave_ticket", shortText: "复制两份。", playerLine: "证据留在你手里。复制两份，一份给小春，一份藏起来。", intent: "要求备份证据", purpose: "让证据不再由一人控制" },
      { id: "saya_report_ticket", shortText: "现在找九条。", playerLine: "现在去找九条。我要当着他的面看你们谁先改口。", intent: "当面对质", purpose: "把纱夜拉入与弦一的正面对峙" }
    ]
  ],
  npc_genichi: [
    [
      { id: "ask_gallery", shortText: "为什么把票给她？", playerLine: "为什么把票给她？", intent: "追问给票事实", purpose: "追问给票理由或当时如何递票；已经承认给票就不再问是不是他给的，不替玩家得出新结论" },
      { id: "genichi_ask_power", shortText: "把原片交出来。", playerLine: "把猫神祭的未剪辑原片交出来。我不要看你办展用的版本。", intent: "索要未剪辑原片", purpose: "直接索取锁在保险柜里的证据" },
      { id: "disagree", shortText: "你知道她会消失。", playerLine: "你明知道上车的人会被全镇忘掉，还是把票递给了她。", intent: "指控故意伤害", purpose: "剥掉弦一的演出话术，明确指出他预见后果" }
    ],
    [
      { id: "genichi_play_along", shortText: "带我去站台。", playerLine: "带我去零号站台。我可以出演你的重演，但流程必须由我决定。", intent: "危险合作", purpose: "假装参加重演以接近站台和证据" },
      { id: "genichi_refuse_power", shortText: "我会公开原片。", playerLine: "我会把真昼的原片公开。你的赞助和威胁都拦不住。", intent: "公开对抗", purpose: "以公开证据直接破坏弦一的计划" },
      { id: "ask_player", shortText: "你想让我上车？", playerLine: "你不是想重演真昼失踪。你想让我成为下一张被剪掉的脸，对吗？", intent: "拆穿替身计划", purpose: "指出弦一正在把玩家安排成下一位乘客" }
    ]
  ]
};

const giftOptions: OptionDefinition[] = [
  { id: "gift_ask_use", shortText: "你打算怎么用？", playerLine: "你打算怎么用？", intent: "追问具体用途", purpose: "好奇对方打算如何使用，已经讲过用途则追问该用途，不强迫用于案件" },
  { id: "gift_explain", shortText: "就是想送给你。", playerLine: "就是想送给你。", intent: "说明赠礼心意", purpose: "表达单纯赠礼，不暗示交换条件、调查任务或恋爱承诺" },
  { id: "gift_silence", shortText: "收着就好。", playerLine: "收着就好。", intent: "暂不解释动机", purpose: "不想解释原因，但不是要求对方瞒着其他人" }
];

// Constrain only targets needed by state transitions, not the wording of each sentence.
const optionRequiredWordsById: Record<string, string[]> = {
  ask_memory: ["铃"],
  koharu_ask_god: ["后殿"],
  koharu_guard_memory: ["帮", "一起", "陪"],
  koharu_test_god: ["纱夜"],
  koharu_leave_empty: ["弦一", "九条"],
  saya_take_ticket: ["给我", "我拿", "我带"],
  saya_leave_ticket: ["复制", "备份", "两份"],
  saya_report_ticket: ["九条", "弦一"],
  genichi_play_along: ["站台", "参加", "演"],
  genichi_refuse_power: ["公开", "公布"]
};
const optionRequiredActionsById: Record<string, string[]> = {
  koharu_test_god: ["找", "去", "问"],
  koharu_leave_empty: ["找", "去", "问"],
  saya_report_ticket: ["找", "去", "当面", "对质"]
};

const selectedOutcomeById: Record<string, string> = {
  ask_memory: "小春让遥仔细检查刻名猫铃，回应她对姐姐的疑问；姓名等已说过的信息不再整段复述。可以指出纱夜是开门者、弦一是给票者，但不能认为遥已经答应帮忙。",
  koharu_ask_god: "小春承认后殿钥匙在自己手里，并把后殿列为下一处调查地点；不得描述尚未进入的后殿里有什么。",
  koharu_doubt_memory: "小春只指出水野纱夜和九条弦一两名现有证人，不新增其他目击者。",
  koharu_guard_memory: "小春在寻人启事背面写下“神社后殿”，约定带刻名猫铃和后殿钥匙与朝雾遥共同调查。",
  koharu_test_god: "小春在寻人启事背面写下“水野纱夜／猫神町站”，决定带猫铃去要求纱夜当面承认开门。",
  koharu_leave_empty: "小春在寻人启事背面写下“九条弦一／镜庭商店街”，决定带寻人启事去质问给票者。",
  saya_open_gentle: "纱夜允许遥看清黑票但不转交所有权，回应她对乘客或车票的疑问；只知道同编号黑票重现，不知道是谁放回，不编造原因；已经说过的开门经过不再复述。",
  saya_open_press: "纱夜直接承认是自己开的门，然后展示盖有九条家印章的通行令复写纸。",
  saya_open_absurd: "纱夜反感玩笑，但仍用同编号黑票和九条家通行令纠正朝雾遥；不能把真昼说成已死。",
  saya_ticket_inspect: "纱夜依次展示黑票、票根和通行令复写纸，不把原件转交给玩家。",
  saya_ticket_doubt: "纱夜只能说通行令盖有九条家印章；她不知道具体签字人，不得编造姓名。",
  saya_ticket_ally: "纱夜明确回答真昼没有回头，只在上车前把纸塞进她制服口袋，不补写表情、额外对白或目的。",
  saya_truth_plain: "纱夜翻出伪造的值班记录，承认自己亲手补写“设备误响，无旅客进入”。",
  saya_bluff_bell: "纱夜纠正朝雾遥：她真正害怕的是九条弦一，不得补充站长生死、去向或新把柄。",
  saya_personal_probe: "纱夜把复写纸翻面，只展示真昼原句“告诉小春，别来找我”，没有第二句话。",
  saya_take_ticket: "黑票交给朝雾遥；纱夜保留票根、复写纸和记录页，并将三者分别封袋。",
  saya_leave_ticket: "原证据由纱夜保管并复制两份，一份交小春、一份另行封存；不新增保险柜、公寓或藏匿地点。",
  saya_report_ticket: "纱夜带票根、复写纸和记录页与朝雾遥去镜庭商店街找九条弦一当面对质。",
  ask_gallery: "弦一承认亲手递票，但强调真昼自己接票；他掀开裁去真昼面孔的展览照片。",
  genichi_ask_power: "弦一拒绝立即交出未裁切照片，指出原片锁在画廊保险柜，并拿出印有朝雾遥姓名的新黑票。",
  disagree: "弦一不否认自己知道后果，转而邀请朝雾遥在第七天17:47成为重演主演。",
  genichi_play_along: "弦一在撤资通知上签名，把画廊保险柜钥匙和零号站台进入机会作为交易条件；不得宣告玩家已经答应上车。",
  genichi_refuse_power: "弦一在撤资通知上签名，以撤回猫神社、车站和商店街合计三百万元的九条家资助威胁玩家。",
  ask_player: "弦一承认想让朝雾遥成为第二位乘客，攥住保险柜钥匙，但不能替玩家接受车票或登车。",
  gift_ask_use: "收礼人按物品实际用途回应好奇；可说打算怎样用，不能宣告未执行的使用、转赠或消耗已经发生。",
  gift_explain: "收礼人回应这份心意，可以高兴、不好意思、嫌弃或怀疑，不能把礼物强行解释为调查工具、委托或恋爱承诺。",
  gift_silence: "收礼人接受玩家暂不解释，可以好奇但不逼问，不凭空达成保密约定。"
};

const sceneBeats: Record<string, SceneBeat[]> = {
  npc_koharu: [
    { id: "koharu_accusation", goal: "让玩家相信雨宫真昼是具体存在的人，并选定第一条调查路线。", concreteSituation: "小春已经反锁神社侧门，手里握着刻有“真昼”的猫铃和一张五年前的寻人启事。", requiredMove: "把猫铃塞到玩家手里，清楚说出雨宫真昼、五年前猫神祭和23:47列车。", choiceLead: "要求玩家决定核对姐姐身份、立刻查后殿，还是寻找另一名目击者。", action: { id: "koharu_hands_over_bell", description: "小春把刻着“真昼”的猫铃塞进朝雾遥手里，并扣上神社侧门的门闩。" }, requiredFactIds: ["FACT_PRIVATE_STORY", "FACT_KOHARU_BELL"] },
    { id: "koharu_selects_target", goal: "根据玩家态度建立或拒绝同盟，并把下一步指向一个具体人物。", concreteSituation: "猫铃已经展示，纱夜是开门者，弦一是给票者；后殿钥匙在小春身上。", requiredMove: "回应玩家刚才的具体要求，摊开画有神社、车站和画廊的手绘路线图。", choiceLead: "逼玩家在共同调查、先找纱夜、先找弦一之间作出选择。", action: { id: "koharu_marks_suspects", description: "小春摊开手绘地图，用红笔分别圈住车站、画廊和神社后殿。" }, requiredFactIds: ["FACT_KOHARU_WITNESSES", "FACT_KOHARU_KEY"] },
    { id: "koharu_commits_next_step", goal: "把玩家最终选择变成小春下一次可追踪的行动。", concreteSituation: "调查对象已经由玩家选定。", requiredMove: "严格执行 selected_outcome，不自行添加时间、人物、职业、证物或地点。", choiceLead: "这是本次交谈结尾，不再给选项。", action: { id: "koharu_writes_target", description: "小春在寻人启事背面写下下一名调查对象和出发地点。" }, requiredFactIds: ["FACT_PRIVATE_STORY"] }
  ],
  npc_saya: [
    { id: "saya_names_passenger", goal: "让纱夜承认雨宫真昼是零号站台最后一名乘客。", concreteSituation: "同编号黑色车票重新出现在失物抽屉，纱夜正准备把抽屉锁死。", requiredMove: "亮出黑色车票，明确说出真昼姓名以及自己亲手开门。", choiceLead: "让玩家选择追问乘客、开门责任或用黑色玩笑试探。", action: { id: "saya_locks_ticket_drawer", description: "纱夜把黑色车票压在玻璃下，反锁失物抽屉，并把钥匙套在自己手腕上。" }, requiredFactIds: ["FACT_SAYA_OPENED_GATE", "FACT_BLACK_TICKET_RETURNED"] },
    { id: "saya_shows_order", goal: "把事件从怪谈推进到有签字人的通行令。", concreteSituation: "纱夜已承认开门，但仍试图把责任停留在自己身上。", requiredMove: "回应玩家态度并展示九条家印章的复写通行令。", choiceLead: "让玩家选择拿全部证物、追签字人或追问真昼最后动作。", action: { id: "saya_reveals_carbon_order", description: "纱夜从胸牌夹层抽出发黄的通行令复写纸，露出九条家的红印。" }, requiredFactIds: ["FACT_KUJO_ORDER"] },
    { id: "saya_confesses_falsification", goal: "迫使纱夜承认自己篡改值班记录，并暴露仍藏着的留言。", concreteSituation: "通行令已经出现，接下来要确认纱夜在第二天做了什么。", requiredMove: "说清站长让她改写记录而她确实照做，不得把责任推给制度。", choiceLead: "让玩家选择索取原记录、错误指控站长或拆穿私藏留言。", action: { id: "saya_opens_false_log", description: "纱夜翻开五年前的值班簿，用笔尖划出自己补写的“无旅客进入”。" }, requiredFactIds: ["FACT_SAYA_FALSE_LOG", "FACT_MAHIRU_MESSAGE"] },
    { id: "saya_hands_over_message", goal: "公开真昼留给小春的话，并让玩家决定证据控制权。", concreteSituation: "纱夜已经无法继续隐瞒复写纸背面的留言。", requiredMove: "逐字展示已提供的留言内容，不扩写新信息。", choiceLead: "让玩家选择带票、复制证据或立刻找弦一对质。", action: { id: "saya_turns_over_message", description: "纱夜把复写纸翻到背面，让“告诉小春，别来找我”完整露出来。" }, requiredFactIds: ["FACT_MAHIRU_MESSAGE"] },
    { id: "saya_commits_evidence", goal: "把玩家最终决定落实为证物去向和纱夜的下一步。", concreteSituation: "玩家已经决定带走、备份或拿证据对质。", requiredMove: "严格执行 selected_outcome，不自行增加保管设施、藏匿地点、时间或协助者。", choiceLead: "这是本次交谈结尾，不再给选项。", action: { id: "saya_packages_evidence", description: "纱夜把票根、复写纸和记录页分别装进三个编号证物袋。" }, requiredFactIds: ["FACT_BLACK_TICKET_RETURNED", "FACT_KUJO_ORDER"] }
  ],
  npc_genichi: [
    { id: "genichi_displays_photo", goal: "让弦一确认自己给了真昼车票，并展示他控制着原片。", concreteSituation: "弦一提前把五年前猫神祭的剪辑照片摆在画廊中央，照片里真昼的脸被裁掉。", requiredMove: "承认递票这个动作，但把上车描述成真昼自己的选择。", choiceLead: "让玩家选择追问车票、索要原片或直接指控他预见后果。", action: { id: "genichi_displays_cropped_photo", description: "弦一掀开黑布，展示一张被裁去真昼面孔的猫神祭巨幅照片。" }, requiredFactIds: ["FACT_GENICHI_GAVE_TICKET", "FACT_UNCUT_PHOTOS"] },
    { id: "genichi_offers_reenactment", goal: "让弦一提出第七天重演，并试图把玩家变成下一名乘客。", concreteSituation: "弦一发现玩家已经掌握递票事实，于是把威胁包装成主演邀请。", requiredMove: "拿出印有当前神名和朝雾遥姓名的新票，提出17:47重演。", choiceLead: "逼玩家在假装合作、公开原片、拆穿替身计划之间选择。", action: { id: "genichi_offers_haruka_ticket", description: "弦一摘下手套，把印有朝雾遥姓名的黑色车票推过展柜。" }, requiredFactIds: ["FACT_REENACTMENT", "FACT_GENICHI_GAVE_TICKET"] },
    { id: "genichi_sets_stakes", goal: "明确弦一会如何回应玩家最终立场，留下可验证的威胁或交易。", concreteSituation: "玩家已经对重演表态。", requiredMove: "严格执行 selected_outcome；不虚构截止时间、机构或新的交易筹码。", choiceLead: "这是本次交谈结尾，不再给选项。", action: { id: "genichi_names_price", description: "弦一摘下手套，在三百万元赞助撤回通知上签名。" }, requiredFactIds: ["FACT_UNCUT_PHOTOS", "FACT_REENACTMENT"] }
  ]
};

const incidentFactsByNpc: Record<string, Array<{ id: string; text: string }>> = {
  npc_koharu: [
    { id: "FACT_KOHARU_BELL", text: "小春持有一枚刻着“真昼”的褪色猫铃，这是她目前愿意交给玩家检查的证物。" },
    { id: "FACT_KOHARU_WITNESSES", text: "小春知道纱夜是五年前的开门者、弦一是给票者；她不知道两人各自隐瞒了什么。资料未提供她亲眼目击的经过，不能自称亲眼看见递票或开门。" },
    { id: "FACT_KOHARU_KEY", text: "小春已经偷走神社后殿钥匙，但不敢独自进入后殿。" }
  ],
  npc_saya: [
    { id: "FACT_SAYA_OPENED_GATE", text: "五年前23:47，纱夜亲手打开封闭的零号站台，并亲眼看见雨宫真昼上车。" },
    { id: "FACT_BLACK_TICKET_RETURNED", text: "同一编号的黑色单程票今天再次出现在失物抽屉；票面乘客姓名为雨宫真昼。" },
    { id: "FACT_KUJO_ORDER", text: "纱夜私藏的通行令复写纸盖有九条家印章，内容要求她在23:47打开零号站台。" },
    { id: "FACT_SAYA_FALSE_LOG", text: "事发次日，站长要求纱夜把记录改成“设备误响，无旅客进入”；纱夜亲手补写了这句话。" },
    { id: "FACT_MAHIRU_MESSAGE", text: "真昼上车前没有回头，只把纸塞进纱夜制服口袋；复写纸背面是她亲笔写下的完整一句话：“告诉小春，别来找我。”除此以外没有第二句话。" }
  ],
  npc_genichi: [
    { id: "FACT_GENICHI_GAVE_TICKET", text: "弦一五年前亲手把黑色车票递给雨宫真昼，而且事先知道零号站台会抹去乘客在镇上的身份。" },
    { id: "FACT_UNCUT_PHOTOS", text: "弦一把猫神祭未剪辑照片锁在画廊保险柜；其中拍到真昼上车前把一张纸塞进纱夜制服口袋。" },
    { id: "FACT_REENACTMENT", text: "弦一准备在第七天17:47重演“神明离町”，并把朝雾遥安排成拿票走向零号站台的主演。" },
    { id: "FACT_KUJO_FUNDING", text: "九条家给猫神社、车站和商店街的资助合计三百万元；弦一已经准备好撤资通知。" }
  ]
};

const publicCaseSummaryByNpc: Record<string, string> = {
  npc_koharu: "小春公开声称姐姐雨宫真昼在五年前猫神祭当晚失踪，并用刻名猫铃证明姐姐有具体姓名。",
  npc_saya: "纱夜是猫神町站的夜班站务，与五年前零号站台放行记录直接有关。",
  npc_genichi: "弦一五年前负责猫神祭的“神明离町”演出，与黑色车票和被裁剪的祭典照片直接有关。"
};

const secretRevealFactByNpc: Record<string, string> = {
  npc_koharu: "FACT_KOHARU_KEY",
  npc_saya: "FACT_MAHIRU_MESSAGE",
  npc_genichi: "FACT_UNCUT_PHOTOS"
};

function repeatOpeningBeat(context: DialogueGenerationContext): SceneBeat {
  const faith = context.state.activeRules.faith?.displayText;
  if (context.npc.id === "npc_koharu") {
    return {
      id: "koharu_repeat_update",
      goal: "承接上次会面和今天的新变化，不再重讲真昼失踪的完整经过。",
      concreteSituation: `小春已经认识朝雾遥，并记得上次交谈。${faith ? `她已经把“${faith}”印在真昼寻人启事的标题上。` : "真昼的寻人启事又被人撕掉一张。"}`,
      requiredMove: "先用 current_reflection 或 retrieved_memories 提到玩家上次的具体态度，再展示今天新版寻人启事；只补充当天变化。",
      choiceLead: "让玩家决定继续核对真昼身份、查后殿或找现有证人。",
      action: { id: "koharu_updates_search_notice", description: "小春把昨天的寻人启事与今天的新版并排铺开，在新版标题旁写下当前神名和日期。" },
      requiredFactIds: ["FACT_DAILY_EVENT"]
    };
  }
  if (context.npc.id === "npc_saya") {
    return {
      id: "saya_repeat_update",
      goal: "承接上次会面和今天的车站变化，不再重新自我介绍或重复第一次认罪。",
      concreteSituation: `纱夜已经认识朝雾遥，并记得上次交谈。${faith ? `她正在检查票据上是否出现“${faith}”。` : "她正在重新核对黑票编号。"}`,
      requiredMove: "先用 current_reflection 或 retrieved_memories 回应玩家上次的具体态度，再展示今天的票据检查结果；不得提前公开未到节拍的留言。",
      choiceLead: "让玩家决定追问乘客、开门责任或用黑色玩笑试探。",
      action: { id: "saya_updates_ticket_check", description: "纱夜把昨日封存记录与今天的黑票并排压在玻璃下，在检查栏盖上当天日期。" },
      requiredFactIds: ["FACT_DAILY_EVENT", "FACT_BLACK_TICKET_RETURNED"]
    };
  }
  return {
    id: "genichi_repeat_update",
    goal: "承接上次交锋并升级第七天威胁，不再重复票是谁给的整段说明。",
    concreteSituation: `弦一已经认识朝雾遥，并记得上次交锋。${faith ? `他已把“${faith}”印上给朝雾遥的新黑票。` : "他仍在等待朝雾遥为新黑票填上神名。"}`,
    requiredMove: "先用 current_reflection 或 retrieved_memories 点明玩家上次索要、指控或拒绝了什么，再展示今天更新的新黑票。",
    choiceLead: "让玩家决定继续追给票事实、索要原片或指控他预见后果。",
    action: { id: "genichi_updates_reenactment_ticket", description: "弦一把印有朝雾遥姓名的新版黑票钉在被裁去真昼面孔的照片旁，并写下第七天17:47。" },
    requiredFactIds: ["FACT_DAILY_EVENT", "FACT_REENACTMENT"]
  };
}

function formatTime(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function currentEncounterEvents(state: GameState) {
  let startIndex = -1;
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    if (state.eventLog[index]?.type === "encounter_started") {
      startIndex = index;
      break;
    }
  }
  return startIndex >= 0 ? state.eventLog.slice(startIndex) : [];
}

function retrieveMemories(context: DialogueGenerationContext, excludedSourceIds: Set<string>) {
  const query = [
    context.locationId,
    context.selectedOption?.intent,
    context.selectedOption?.playerLine,
    context.giftItem?.baseName,
    context.state.activeRules.faith?.displayText,
    context.state.activeRules.beauty?.displayText
  ].filter(Boolean).join(" ");
  const terms = [...new Set(query.split(/[\s，。、“”]+/).filter((term) => term.length >= 2))];
  return [...(context.state.npcStates[context.npc.id]?.memories ?? [])]
    .filter((memory) => !excludedSourceIds.has(memory.sourceEventId))
    .map((memory) => {
      const text = `${memory.summary} ${memory.interpretation} ${memory.tags.join(" ")}`;
      const relevance = terms.reduce((score, term) => score + (text.includes(term) ? 2 : 0), 0);
      const recency = Math.max(0, 4 - (context.state.day - memory.createdDay));
      return { memory, score: memory.importance * 2 + relevance + recency };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ memory, score }) => ({ ...memory, retrievalScore: score }));
}

function selectedDefinition(npcId: string, option: DialogueOption | null) {
  if (!option) return null;
  return [...(talkOptions[npcId]?.flat() ?? []), ...giftOptions].find((candidate) => candidate.id === option.id) ?? null;
}

function giftBeat(context: DialogueGenerationContext): SceneBeat {
  const itemName = context.giftItem?.baseName ?? "礼物";
  const actionByNpc: Record<string, { id: string; description: string }> = {
    npc_koharu: { id: "koharu_hides_gift", description: `小春接稳${itemName}，拿到自己面前仔细看。` },
    npc_saya: { id: "saya_bags_gift", description: `纱夜接过${itemName}，检查了一下它的状态。` },
    npc_genichi: { id: "genichi_stages_gift", description: `弦一接过${itemName}，调整拿法，端详这份礼物。` }
  };
  return {
    id: context.selectedOption ? "gift_response" : "gift_opening",
    goal: context.selectedOption ? "回应玩家刚刚表达的赠礼心意或疑问。" : "先对收到这个具体东西作出符合性格的反应，再试探玩家为何送它。",
    concreteSituation: `${itemName}已经属于${context.npc.name}，不能退还或假装没有收到。`,
    requiredMove: "让礼物进入一个看得见的动作；不能只评价礼物代表什么。",
    choiceLead: context.selectedOption ? "本次赠礼交谈结束，不再给选项。" : "留下关于怎么用、为什么送、是否愿意解释的自然接话口，不列举菜单。",
    action: actionByNpc[context.npc.id]!,
    requiredFactIds: context.giftItem ? [`FACT_GIFT_${context.giftItem.id.toUpperCase()}`] : []
  };
}

export function buildAgentPrompt(context: DialogueGenerationContext): BuiltPrompt {
  const encounterEvents = currentEncounterEvents(context.state);
  const choiceEvents = encounterEvents.filter((event) => event.type === "dialogue_choice" && event.details.mode === context.mode);
  const generatedEvents = encounterEvents.filter((event) => event.type === "dialogue_generated" && event.targetId === context.npc.id);
  const recentTranscript = encounterEvents
    .filter((event) => event.targetId === context.npc.id && (event.type === "dialogue_choice" || event.type === "dialogue_generated"))
    .map((event) => event.type === "dialogue_choice"
      ? `${demoBootstrap.player.name}：${event.details.player_line}`
      : event.details.transcript)
    .filter(Boolean)
    .slice(-12);
  const turnIndex = choiceEvents.length;
  const encounterCount = context.state.eventLog.filter(
    (event) => event.type === "encounter_started" && event.targetId === context.npc.id
  ).length;
  const isRepeatOpening = context.mode === "talk" && turnIndex === 0 && encounterCount > 1;
  const optionBeats = talkOptions[context.npc.id] ?? [];
  const allowedOptions = context.mode === "gift"
    ? context.selectedOption ? [] : giftOptions
    : optionBeats[turnIndex] ?? [];
  const selected = selectedDefinition(context.npc.id, context.selectedOption);
  const beat = context.mode === "gift"
    ? giftBeat(context)
    : isRepeatOpening
      ? repeatOpeningBeat(context)
      : sceneBeats[context.npc.id]?.[Math.min(turnIndex, (sceneBeats[context.npc.id]?.length ?? 1) - 1)];
  if (!beat) throw new Error(`missing_scene_beat:${context.npc.id}:${turnIndex}`);

  const location = demoBootstrap.locations.find((candidate) => candidate.id === context.locationId);
  const dailyEvent = demoBootstrap.dailyEvents.find((event) => event.day === context.state.day)!;
  const npcState = context.state.npcStates[context.npc.id]!;
  const currentEncounterSourceIds = new Set(encounterEvents.map((event) => event.id));
  const retrievedMemories = retrieveMemories(context, currentEncounterSourceIds);
  const faithRule = context.state.activeRules.faith;
  const beautyRule = context.state.activeRules.beauty;
  const sceneSequence = sceneBeats[context.npc.id] ?? [];
  const disclosureIndex = context.mode === "talk"
    ? Math.min(turnIndex, Math.max(0, sceneSequence.length - 1))
    : 0;
  const disclosedIncidentFactIds = new Set(
    sceneSequence.slice(0, disclosureIndex + 1).flatMap((scene) => scene.requiredFactIds)
  );
  for (const factId of beat.requiredFactIds) disclosedIncidentFactIds.add(factId);
  if (beat.id === "genichi_sets_stakes") disclosedIncidentFactIds.add("FACT_KUJO_FUNDING");
  const disclosedIncidentFacts = (incidentFactsByNpc[context.npc.id] ?? [])
    .filter((fact) => disclosedIncidentFactIds.has(fact.id));
  const secretIsDisclosed = disclosedIncidentFactIds.has(secretRevealFactByNpc[context.npc.id]!);
  const facts = [
    { id: "FACT_NPC_IDENTITY", text: `${context.npc.name}，${context.npc.age}岁，${context.npc.occupation}；${context.npc.classPosition}。` },
    { id: "FACT_PRIVATE_STORY", text: publicCaseSummaryByNpc[context.npc.id] ?? context.npc.oneLine },
    { id: "FACT_CURRENT_GOD", text: faithRule ? `当前全镇称“${faithRule.displayText}”。这只是公共规则，不代表现场存在同名实体。` : "当前信仰供奉位为空，没有新神名。" },
    { id: "FACT_CURRENT_BEAUTY", text: beautyRule ? `当前全镇遵循“${beautyRule.displayText}”。` : "当前审美供奉位为空。" },
    { id: "FACT_DAILY_EVENT", text: `今天的公开事件是“${dailyEvent.title}”：${dailyEvent.summary}` },
    { id: "FACT_PLAYER_PUBLIC", text: `${demoBootstrap.player.name}，${demoBootstrap.player.age}岁，${demoBootstrap.player.publicRole}，只在镇上停留七天。` },
    ...disclosedIncidentFacts
  ];
  if (context.giftItem) {
    facts.push({
      id: `FACT_GIFT_${context.giftItem.id.toUpperCase()}`,
      text: `朝雾遥刚把“${context.giftItem.baseName}”主动交给${context.npc.name}；所有权已经转移。物品用途：${context.giftItem.baseUse}；状态：${context.giftItem.condition}。`
    });
  }

  const requiredFactIds = [...beat.requiredFactIds];
  const encounterAlreadyNamedGod = generatedEvents.some((event) => faithRule && event.details.transcript?.includes(faithRule.displayText));
  if (faithRule && !encounterAlreadyNamedGod) requiredFactIds.push("FACT_CURRENT_GOD");
  const knownFactIds = facts.map((fact) => fact.id);
  const requiredOptions = allowedOptions.map((option) => ({
    id: option.id,
    intent: option.intent,
    semantic_boundary: option.purpose,
    target_words_any: optionRequiredWordsById[option.id] ?? [],
    action_words_any: optionRequiredActionsById[option.id] ?? []
  }));

  const system = `你为中文二次元群像游戏《猫神町》写可逐句播放的现场对话。扮演当前NPC，并在玩家已经选择的态度内续写朝雾遥。人物有自己的日子要过，也会关心、误会、敷衍、试探眼前的人。只输出JSON。

[优先级]
事实、秘密和物品所有权是硬边界。在边界内：1. 当前玩家完整台词与真实短期对白；2. 人物眼下想从对方得到什么；3. 当前场景的可执行动作；4. 性格与相关记忆；5. 背景资料。voice_examples只示范中文语气，不是发生过的故事，不能放进记忆。

[戏剧规则]
- 先接住玩家这句话：她在问什么、拒绝什么、拿什么开玩笑。回答不等于必须照办；不愿意就给一个听得懂的具体理由。不能用另一段案情跳过问题。
- scene_plan给出本轮事实范围和可执行动作，不是必须背完的台词清单。动作可以在犹豫、讨价还价或被追问后发生。已经讲过的事实不再复述，只补玩家还不知道的一点。不要把设计目标“让玩家相信/逼玩家选择”说出口。
- 多数台词一句一个意思，允许“嗯。”“先松手。”“我没答应。”这样的短反应，也允许必要的长句。不设每句最低字数，不强制每轮塞几条线索。中文用自然的动词和称呼，避免翻译腔、报告腔、抽象名词堆叠和每段都以反问收尾。
- 当前没有玩家发言时，不要自问自答或写“对，我确定”来回应不存在的问题。收礼人既然听见“只是送给你”，就接受这句回答或表达自己的感受，不再反复问同一个赠礼理由。
- 动作要与当下交流有因果：藏起不想给的东西、被拒绝后收回手、松开压着证物的手指。不是每句话都点头、盯着、攥紧；不要仅用情绪标签代替反应。低风险姿态可自由写，转移物品/移动地点/毁坏证据仍需系统授权。
- 信仰和审美是镇民承认的公共常识，各人可以嫌麻烦、利用、嘴硬或认真遵守。先落到眼前的礼物、工作或关系；只有有关时才牵出私事。不可凭空添加规则导致的神迹或已经发生的事故。
- 收礼先回应这是什么东西以及玩家的心意，不要求每件礼物服务于真昼案件。不要把普通好意自动理解成恋爱、交易或承诺。
- recent_transcript 是本次会面的真实连续历史。不得重复已经讲过的开场，不得无视NPC上一轮自己的承诺。
- interaction.is_repeat_opening 为 true 时，这是重访：根据真实记忆改变招呼、态度或处理事情的方式。可以自然接上次没谈完的事，不必机械说“你昨天选择了”。禁止重新自我介绍或完整复述五年前经过。
- retrieved_memories 是长期记忆，只在与当前行动相关时使用；不能把反思说成客观事实。
- known_facts 与 selected_outcome 是唯一事实来源。不得新增人物、证物、留言内容、伤亡、地点、设施、职业、工作地点、车次、精确时刻、金额或已经发生的行动。
- 不编造过去的日常来丰富性格：未提供的姐姐习惯、临别承诺、回忆对白、伤疤、收礼历史都不能写。voice_examples中的物品和事件不能照搬。可以写角色此刻想怎样，不把猜测写成回忆。
- 只准使用 grounding_guard.allowed_people 和 allowed_places 中的专名。需要泛指他人时只能说“站长、镇民、店员”，不得给他们取名；不得把任何人物安排到资料未写明的诊所、学校、便利店、美术馆、公寓或其他场所。
- selected_outcome 约束本次选择的剧情后果，不是需要朗读的文本。不添加下一站、约定时间、新证人或新线索。先回答玩家实际说的话，禁止因为内部intent提到某事，就当成玩家已经问过或答应。
- disclosure_guard.disclosed_fact_ids 是本轮允许说出口的案件事实。角色即使知道后续秘密，也不能提前暗示或说出 undisclosed_secret；尤其不能在纱夜首次开场就说出真昼留言。
- 禁止使用“空位”一词。描述照片时只能说“真昼的脸被裁去”或“真昼被裁掉”，不能把人物写成空洞或符号。

[玩家代理]
- selected_option.player_said 是最新玩家发言，NPC第一句必须具体回应它，同时承接 recent_transcript 最后一段。
- 自动生成的玩家台词只能把 selected_option 的既有态度说得更自然，不能新增承诺、撒谎、交物、站队、离开、赴约或接受风险。
- selected_option 为空时不生成玩家台词。selected_option 存在时可以生成零至两段玩家过渡台词；玩家点选时显示的完整台词已经存在，不要在 continuations 里复述。
- 有下一组选项时，最后一个节拍由NPC留下一个看得见的疑问、请求、矛盾或可干预的动作。不要念“你是要A、B还是C”的菜单。

[玩家关注与选项]
- 先完成这段对白，再回看player_attention与刚写的内容：玩家刚知道了什么，什么已经得到回答，眼前还会想问、做或拒绝什么。
- 每个required_options的id对应程序中的语义和后果，保持id与intent不变。在semantic_boundary内，为本段实际内容写一个2至12字的口语短选项。不是复制上一轮选项，不是概括作者想推进的剧情。
- 每个选项提供anchor，逐字摘录本段NPC台词或可见动作中的2至40字，表示玩家接的是哪件眼前事。anchor仅供校验，不展示给玩家。
- 选项不得问刚回答的问题，不得引用尚未展示的证物/姓名/秘密。若答案已知，改成同一语义内的具体追问或回应。三个选项各有明确关注点，不用三种语气重复同一请求。
- target_words_any非空时，短选项必须包含其中至少一个目标词，使玩家看得出选择实际指向什么。需要先展示该目标，不能把查看猫铃变成询问未提供的姐姐生活，也不能把查后殿变成含糊的“看看”。
- action_words_any非空时还须包含至少一个行动词。例如选择下一位调查对象要说“先找弦一。”，不能写成“弦一为什么给票？”让玩家以为这只是向当前NPC提问。
- text必须能当面对NPC说出口，例如“带我去站台。”。不写“假装配合，接近站台”这样的内部策略标签，不把秘密意图念给对方听。保密或伪装只能体现在已批准的态度内。
- 选项本身就是玩家点选后说的首句，不会扩写隐藏承诺。请求查看不等于要求拿走；好奇不等于同意调查；拒绝不能自动变成接受条件。可以在后续玩家过渡台词中自然接话，但不改变选择含义。

[动作与记忆]
- npc_action_id 必须逐字复制 scene_plan.allowed_action.id；npc_action 必须描述该动作正在可见地发生，不能只写表情或姿势。
- memory_candidate 只记录本轮实际说出或做出的新事实，必须含具体人名或物品；不能写感想。
- reflection_candidate 是NPC对朝雾遥最新选择形成的一句私人判断，以及下次准备如何对待她；不能新增事实。

[输出]
{
  "stage_direction": "第一段可见动作",
  "line": "NPC第一段台词",
  "emotion": "简短情绪",
  "continuations": [{"speaker":"${context.selectedOption ? "npc|player" : "npc"}","stage_direction":"可选动作","line":"后续台词","emotion":"简短情绪"}],
  "npc_action_id": "白名单动作ID",
  "npc_action": "动作实际发生的描述",
  "memory_candidate": "本轮新事实",
  "reflection_candidate": "NPC的新判断与下一策略",
  "options": [{"id":"白名单选项ID","text":"2至12字的玩家短台词","intent":"逐字复制intent","anchor":"本段NPC台词或动作的原文片段"}],
  "used_fact_ids": ["实际使用的事实ID"]
}
- continuations 0至4项；每段台词1至120字，动作0至60字。短反应也算一段；需要详细说明时分段。尽量用2至4个节拍构成交流，不填满字数上限。
- options必须完整返回required_options中的id，不能增加或遗漏。白名单为空时返回[]。输出前检查选项是否真正接得上最后这段对话，避免已知问题重问。
- used_fact_ids只能来自known_facts，且必须包含required_fact_ids。`;

  const user = JSON.stringify({
    prompt_version: AGENT_PROMPT_VERSION,
    present_want: dialogueVoices[context.npc.id]?.presentWant,
    chinese_voice: dialogueVoices[context.npc.id]?.voice,
    voice_examples: context.selectedOption ? dialogueVoices[context.npc.id]?.examples : openingVoiceExamples[context.npc.id],
    character_core: {
      identity: context.npc.oneLine,
      public_mask: context.npc.persona.publicMask,
      core_contradiction: context.npc.persona.coreContradiction,
      immediate_goal: context.npc.persona.immediateGoal,
      long_term_goal: context.npc.persona.longTermGoal,
      fear: context.npc.persona.fear,
      defense_mechanism: context.npc.persona.defenseMechanism,
      moral_line: context.npc.persona.moralLine,
      breaking_point: context.npc.persona.breakingPoint,
      action_bias: context.npc.persona.actionBias,
      false_belief: context.npc.persona.falseBelief,
      secret: secretIsDisclosed ? context.npc.persona.secret : "[未到公开节拍，不得在本轮台词中出现]",
      signature_behaviors: context.npc.persona.signatureBehaviors,
      speech_rules: context.npc.persona.speechRules
    },
    world_snapshot: {
      day: context.state.day,
      time: formatTime(context.state.currentMinute),
      location: location?.name ?? context.locationId,
      daily_event: dailyEvent.title,
      faith_rule: faithRule?.displayText ?? null,
      beauty_rule: beautyRule?.displayText ?? null
    },
    interaction: {
      mode: context.mode,
      turn_index: turnIndex,
      is_repeat_opening: isRepeatOpening,
      settled_prior_choice_count: Math.max(0, choiceEvents.length - (context.selectedOption ? 1 : 0)),
      selected_option: context.selectedOption ? {
        response_priority: "highest_live_player_turn_with_transcript_continuity",
        id: context.selectedOption.id,
        player_said: context.selectedOption.playerLine ?? selected?.playerLine ?? context.selectedOption.text,
        intent: selected?.intent ?? context.selectedOption.intent,
        semantic_boundary: selected?.purpose ?? "只延续当前玩家态度"
      } : null
    },
    selected_outcome: context.selectedOption
      ? selectedOutcomeById[context.selectedOption.id] ?? "只回应玩家当前态度，不形成新的剧情事实。"
      : "这是会面开场，只执行 scene_plan，不替玩家做选择。",
    grounding_guard: {
      allowed_people: ["朝雾遥", "雨宫小春", "雨宫真昼", "水野纱夜", "九条弦一", "雨宫母亲", "站长", "镇民", "店员"],
      allowed_places: ["猫神町", "猫神社", "神社石阶", "神社后殿", "猫神町站", "零号站台", "镜庭商店街", "镜庭画廊"],
      allowed_story_times: ["五年前猫神祭", "23:47", "第七天17:47", `第${context.state.day}天${formatTime(context.state.currentMinute)}`],
      rule: "列表外专名、场所、精确时刻与设施一律不得生成。"
    },
    disclosure_guard: {
      disclosed_fact_ids: [...disclosedIncidentFactIds],
      undisclosed_secret: secretIsDisclosed ? null : "角色知道但本轮不准说出或暗示的人物秘密"
    },
    recent_transcript: recentTranscript,
    player_attention: {
      latest_player_line: context.selectedOption?.playerLine ?? context.selectedOption?.text ?? null,
      already_heard_this_encounter: recentTranscript,
      prior_encounter_evidence: retrievedMemories.map((memory) => memory.summary),
      rule: "以上只有实际说过和经历过的内容才是玩家已知；known_facts里未展示的资料不等于玩家知道。生成选项还须结合本轮将展示的对白，不重复询问刚回答的事。"
    },
    current_reflection: npcState.reflection,
    open_loops: npcState.openLoops,
    retrieved_memories: retrievedMemories,
    scene_plan: {
      id: beat.id,
      goal: beat.goal,
      concrete_situation: beat.concreteSituation,
      required_move: beat.requiredMove,
      choice_lead: beat.choiceLead,
      allowed_action: beat.action
    },
    known_facts: facts,
    required_fact_ids: [...new Set(requiredFactIds)],
    required_options: requiredOptions,
    final_output_check: context.selectedOption
      ? "接住玩家原句；speaker为npc就是NPC说话，为player才是遥说话，别把NPC的请求标成player。选项是当面短台词，不是策略。"
      : "本次是玩家还没选择的开场，所有speaker只能为npc。只有NPC连续说话，不模拟遥的提问或回答，不回应不存在的玩家台词。先展示选项要接的话题。"
  }, null, 2);

  return {
    promptVersion: AGENT_PROMPT_VERSION,
    system,
    user,
    allowedOptionIds: allowedOptions.map((option) => option.id),
    optionIntentById: Object.fromEntries(allowedOptions.map((option) => [option.id, option.intent])),
    optionTextById: Object.fromEntries(allowedOptions.map((option) => [option.id, option.shortText])),
    optionPlayerLineById: Object.fromEntries(allowedOptions.map((option) => [option.id, option.playerLine])),
    optionRequiredWordsById,
    optionRequiredActionsById,
    knownFactIds,
    factTextById: Object.fromEntries(facts.map((fact) => [fact.id, fact.text])),
    requiredFactIds: [...new Set(requiredFactIds)],
    allowedActionIds: [beat.action.id],
    actionDescriptionById: { [beat.action.id]: beat.action.description },
    sceneGoal: beat.goal,
    selectedOutcome: context.selectedOption
      ? selectedOutcomeById[context.selectedOption.id] ?? "只回应玩家当前态度，不形成新的剧情事实。"
      : "这是会面开场，只执行场景计划，不替玩家做选择。",
    openingPlayerBeatAllowed: false
  };
}

export function memorySummary(memory: NpcMemory) {
  return `${memory.summary}（我的判断：${memory.interpretation}）`;
}
