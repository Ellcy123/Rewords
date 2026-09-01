import {
  demoBootstrap,
  type DialogueOption,
  type GameState,
  type InteractionMode,
  type Item,
  type Npc
} from "../../../packages/shared/src/index.ts";

export const SAYA_PROMPT_VERSION = "saya-dialogue-v4";

export const SAYA_PROMPT_STRUCTURE = [
  "系统行为契约",
  "人物固定核心与生活质感",
  "知识边界与自然语言指纹",
  "结构化 JSON 输出契约",
  "当前客观世界快照",
  "NPC 实际感知与相关记忆",
  "当前场景节拍与必须推进的戏剧动作",
  "玩家态度选项与 ID 白名单"
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
  purpose: string;
  attitude: string;
  intentLabel: string;
};

type SceneBeat = {
  id: string;
  dramaticFunction: string;
  requiredRevealFactIds: string[];
  npcMove: string;
  choiceLead: string;
};

export type BuiltPrompt = {
  system: string;
  user: string;
  allowedOptionIds: string[];
  optionIntentById: Record<string, string>;
  optionTextById: Record<string, string>;
  optionPlayerLineById: Record<string, string>;
  knownFactIds: string[];
};

const talkOptionBeats: OptionDefinition[][] = [
  [
    {
      id: "saya_open_gentle",
      shortText: "你没睡好？",
      playerLine: "你看起来没睡好。先不用解释自己，告诉我这张票是怎么回事。",
      purpose: "玩家用一句简短关心作为进入方式，但立刻回到车票；不诊断她，也不邀请她倾诉",
      attitude: "关心但不讨好",
      intentLabel: "温和靠近"
    },
    {
      id: "saya_open_press",
      shortText: "到底漏了什么？",
      playerLine: "不存在的班次却留下了真的车票。你还漏了什么，直接说。",
      purpose: "玩家直接指出不存在的班次和真实车票互相矛盾，要求她别绕弯",
      attitude: "强硬质疑",
      intentLabel: "直接逼问"
    },
    {
      id: "saya_open_absurd",
      shortText: "车票迷路了？",
      playerLine: "也许不是车票来错了，是那班车还不知道自己不存在。",
      purpose: "玩家用一本正经的荒诞玩笑缓解压力，暗示也许车自己不知道它不存在",
      attitude: "玩笑试探",
      intentLabel: "荒诞玩笑"
    }
  ],
  [
    {
      id: "saya_ticket_inspect",
      shortText: "让我看看。",
      playerLine: "先别替它下结论。把车票和收取记录都给我看看。",
      purpose: "玩家不急着表态，要求亲眼查看车票和收取记录的细节",
      attitude: "冷静调查",
      intentLabel: "亲手检查"
    },
    {
      id: "saya_ticket_doubt",
      shortText: "你在试探我？",
      playerLine: "你不是在问我怎么看。你是在试探我会不会相信你，对吧？",
      purpose: "玩家怀疑纱夜正在故意试探自己，并当面点破",
      attitude: "反向施压",
      intentLabel: "拆穿试探"
    },
    {
      id: "saya_ticket_ally",
      shortText: "我替你保密。",
      playerLine: "在弄清楚以前，我不会把这件事告诉别人。你可以继续说。",
      purpose: "玩家表示暂时不会把异常告诉其他人，愿意先听她说完",
      attitude: "谨慎站队",
      intentLabel: "替她保密"
    }
  ],
  [
    {
      id: "saya_truth_plain",
      shortText: "我什么都没听见。",
      playerLine: "我昨晚什么都没听见，也没有能帮你证明的东西。",
      purpose: "玩家坦白自己昨晚什么异常都没听见，不拿假情报换信任",
      attitude: "诚实克制",
      intentLabel: "坦白无知"
    },
    {
      id: "saya_bluff_bell",
      shortText: "我听见铃了。",
      playerLine: "昨晚二十三点四十七分，我也听见站台方向响铃了。",
      purpose: "玩家撒谎说自己昨晚听见了不该出现的站台铃，观察纱夜反应",
      attitude: "冒险欺骗",
      intentLabel: "撒谎试探"
    },
    {
      id: "saya_personal_probe",
      shortText: "你其实在害怕？",
      playerLine: "你怕的不是这张票。你怕的是说出来以后，所有人都觉得你记错了。",
      purpose: "玩家越过车票细节，直接问纱夜真正害怕的是异常本身还是没人相信她",
      attitude: "触碰软肋",
      intentLabel: "追问恐惧"
    }
  ],
  [
    {
      id: "saya_take_ticket",
      shortText: "票给我。",
      playerLine: "把票给我。今晚二十三点四十七分，我会亲自确认。",
      purpose: "玩家接过异常车票，接受被卷入调查和被纱夜继续观察的风险",
      attitude: "主动涉险",
      intentLabel: "接下车票"
    },
    {
      id: "saya_leave_ticket",
      shortText: "票留给你。",
      playerLine: "票先留在你这里。我会记住时间，但现在不碰它。",
      purpose: "玩家拒绝持有车票，但愿意记住今晚 23:47 并继续观察",
      attitude: "谨慎旁观",
      intentLabel: "拒绝持有"
    },
    {
      id: "saya_report_ticket",
      shortText: "现在去上报。",
      playerLine: "这已经不是我们两个人能私下处理的事了。现在就去找站长。",
      purpose: "玩家坚持应该立刻把异常上报站长，不接受两个人私下处理",
      attitude: "遵循程序",
      intentLabel: "要求上报"
    }
  ]
];

const talkSceneBeats: SceneBeat[] = [
  {
    id: "hook",
    dramaticFunction: "用一个具体矛盾把玩家拉进来，不做背景说明会。",
    requiredRevealFactIds: ["FACT_TICKET_FOUND", "FACT_TICKET_NO_TRAIN"],
    npcMove: "纱夜先观察玩家，再抛出 23:47 车票与时刻表的矛盾；她像是在闲问，其实在试探。",
    choiceLead: "结尾停下来问‘所以，你现在想先问哪一件？’，让玩家自然选择关心她、逼问遗漏或拿车票开玩笑。"
  },
  {
    id: "impossible_receipt",
    dramaticFunction: "回应玩家第一种态度，并把异常从‘记录错误’升级为时间矛盾。",
    requiredRevealFactIds: ["FACT_TICKET_RECEIPT_TOMORROW"],
    npcMove: "纱夜把收取单推到玩家看得见但碰不到的位置；根据玩家态度，可能冷笑、停顿或稍微松口。",
    choiceLead: "结尾把矛盾留在桌面上，让玩家自然选择亲手看、拆穿她的试探或先表示保密。"
  },
  {
    id: "warning_on_back",
    dramaticFunction: "让玩家感到有人预料到纱夜会看到车票，同时让双方开始互相判断可信度。",
    requiredRevealFactIds: ["FACT_TICKET_BACK_WARNING"],
    npcMove: "纱夜翻出车票背面的警告，但故意不替玩家解释；她要求玩家为自己的态度负责。",
    choiceLead: "结尾直接问玩家昨晚 23:47 听见了什么，让玩家可以坦白、撒谎，或反过来追问她的恐惧。"
  },
  {
    id: "saya_admission",
    dramaticFunction: "纱夜付出一点暴露自己的代价，把事件推到必须选择是否卷入。",
    requiredRevealFactIds: ["FACT_OLD_PLATFORM", "FACT_SAYA_HEARD_BELL"],
    npcMove: "纱夜承认自己也听见了铃声。说完后立刻收回情绪，把车票放在双方之间。",
    choiceLead: "结尾问‘票就在这里。你打算怎么办？’，明确引向接票、留下或上报。"
  },
  {
    id: "consequence",
    dramaticFunction: "根据玩家最后的立场结束本次场景，留下关系变化和下一次会面的钩子。",
    requiredRevealFactIds: [],
    npcMove: "不要再提供选项。若玩家接票，纱夜提醒其别折坏猫爪形剪口；若拒绝，她尊重但会继续观察；若要求上报，她明显冷下来并指出站长已经签过那张写着明天日期的收取单。",
    choiceLead: "本轮是结尾，不提问，也不引出新的按钮。"
  }
];

const giftOptions: OptionDefinition[] = [
  { id: "gift_ask_use", shortText: "你会怎么处理？", playerLine: "东西已经给你了。我只是想知道，你准备怎么处理它？", purpose: "询问纱夜准备如何处理礼物", attitude: "务实追问", intentLabel: "询问处理" },
  { id: "gift_explain", shortText: "我只是想给你。", playerLine: "没有别的理由。我只是看见它的时候，觉得应该把它给你。", purpose: "说明玩家为什么把它交给纱夜", attitude: "解释动机", intentLabel: "说明用意" },
  { id: "gift_silence", shortText: "……", playerLine: "……你收下就好，我现在不想解释。", purpose: "不解释赠送动机，让纱夜自行判断", attitude: "保持神秘", intentLabel: "拒绝解释" }
];

const allOptions = [...talkOptionBeats.flat(), ...giftOptions];

function formatTime(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function currentEncounterEvents(state: GameState) {
  let lastEncounterIndex = -1;
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    if (state.eventLog[index]?.type === "encounter_started") {
      lastEncounterIndex = index;
      break;
    }
  }
  return lastEncounterIndex >= 0 ? state.eventLog.slice(lastEncounterIndex) : [];
}

function eventSummary(event: GameState["eventLog"][number]) {
  const parts: string[] = [event.type];
  if (event.itemId) parts.push(`item=${event.itemId}`);
  if (event.details.option_id) parts.push(`option=${event.details.option_id}`);
  if (event.details.player_line) parts.push(`player_said=${event.details.player_line}`);
  else if (event.details.option_text) parts.push(`player_text=${event.details.option_text}`);
  if (event.details.display_text) parts.push(`rule=${event.details.display_text}`);
  return parts.join("; ");
}

function addTalkStoryFacts(facts: Array<{ id: string; text: string }>, turnIndex: number) {
  facts.push(
    { id: "FACT_TICKET_FOUND", text: "一张印有 23:47 的旧式单程车票出现在站内失物抽屉中；纱夜没有看见是谁放进去的。" },
    { id: "FACT_TICKET_NO_TRAIN", text: "猫神町站今天、昨天以及现行时刻表里都没有 23:47 的客运班次。" }
  );
  if (turnIndex >= 1) {
    facts.push({
      id: "FACT_TICKET_RECEIPT_TOMORROW",
      text: "与车票放在一起的失物收取单日期是明天，笔迹与纱夜高度相似；纱夜确定自己没有写过，不能把它说成‘自己写了但忘记’。"
    });
  }
  if (turnIndex >= 2) {
    facts.push({
      id: "FACT_TICKET_BACK_WARNING",
      text: "车票背面用铅笔写着‘别让站务员看见’；纱夜已经看见了。"
    });
  }
  if (turnIndex >= 3) {
    facts.push(
      { id: "FACT_OLD_PLATFORM", text: "车站有一座停用十二年的旧货运站台，通往那里的门已上锁。" },
      { id: "FACT_SAYA_HEARD_BELL", text: "昨晚 23:47，纱夜确实听见旧货运站台方向响了一次发车铃；她没有目击列车。" }
    );
  }
  if (turnIndex >= 4) {
    facts.push({
      id: "FACT_TICKET_CAT_CUT",
      text: "车票上有一枚猫爪形剪口；这是旧货运站台停用前使用的检票钳留下的形状。"
    });
  }
}

export function buildSayaPrompt(context: DialogueGenerationContext): BuiltPrompt {
  const location = demoBootstrap.locations.find((candidate) => candidate.id === context.locationId);
  const player = demoBootstrap.player;
  const sayaEncounterCount = context.state.eventLog.filter(
    (event) => event.type === "encounter_started" && event.targetId === context.npc.id
  ).length;
  const isFirstMeeting = sayaEncounterCount <= 1;
  const encounterEvents = currentEncounterEvents(context.state);
  const choiceEvents = encounterEvents.filter(
    (event) => event.type === "dialogue_choice" && event.details.mode === context.mode
  );
  const usedOptionIds = new Set(choiceEvents.map((event) => event.details.option_id).filter(Boolean));
  const talkTurnIndex = choiceEvents.length;
  const allowedOptions = context.mode === "talk"
    ? talkOptionBeats[talkTurnIndex] ?? []
    : giftOptions.filter((option) => !usedOptionIds.has(option.id));
  const sceneBeat = context.mode === "talk"
    ? talkSceneBeats[Math.min(talkTurnIndex, talkSceneBeats.length - 1)]
    : null;
  const selectedOptionContract = context.selectedOption
    ? allOptions.find((option) => option.id === context.selectedOption?.id) ?? null
    : null;

  const facts: Array<{ id: string; text: string }> = [
    { id: "FACT_SAYA_IDENTITY", text: "水野纱夜，32 岁，猫神町站夜班站务员兼失物保管员。" },
    { id: "FACT_SAYA_METHOD", text: "她习惯先核对来源、时间、编号和记录，但紧张时会把笔帽咬出浅浅的齿痕。" },
    { id: "FACT_SAYA_HUMANITY", text: "她昨晚没睡好，不愿承认自己害怕；被人关心会先否认，被人逼问会反过来挑对方话里的漏洞，听见荒诞玩笑时偶尔会忍不住接一句冷笑话。" },
    { id: "FACT_SAYA_GOAL", text: "她想查明 23:47 车票的来源，同时判断玩家是可靠的同谋、麻烦的旁观者，还是会破坏证据的人。" },
    { id: "FACT_SAYA_BOUNDARY", text: "她尚未向玩家公开私人经历，不能临时编造新的家人、事故或失踪者。" },
    {
      id: "FACT_PLAYER_PUBLIC_IDENTITY",
      text: `${player.name}，${player.age} 岁，町外旧物整理员；今天开始担任${player.publicRole}。这个姓名和身份已经写在镇内公开委任告示上。`
    },
    {
      id: "FACT_PLAYER_KNOWN_LIMIT",
      text: "纱夜只知道公开委任告示，不知道委任书是谁寄的、包裹内有什么，也不知道玩家的私人动机。"
    },
    {
      id: "FACT_RELATIONSHIP_STATUS",
      text: isFirstMeeting
        ? "这是纱夜与朝雾遥第一次正式交谈；两人是陌生人。"
        : "纱夜与朝雾遥此前已经正式交谈过；本轮不得重新自我介绍。"
    },
    { id: "FACT_CURRENT_TIME", text: `当前为第 ${context.state.day} 天 ${formatTime(context.state.currentMinute)}。` },
    { id: "FACT_CURRENT_LOCATION", text: `当前地点是${location?.name ?? context.locationId}。` }
  ];

  if (context.mode === "talk") addTalkStoryFacts(facts, talkTurnIndex);

  for (const slotId of ["faith", "beauty"] as const) {
    const rule = context.state.activeRules[slotId];
    if (rule) {
      facts.push({
        id: `FACT_RULE_${slotId.toUpperCase()}`,
        text: `当前公共${slotId === "faith" ? "信仰" : "审美"}规则为“${rule.displayText}”。纱夜知道公共规则，但不知道玩家供奉了什么。`
      });
    }
  }

  if (context.giftItem) {
    facts.push(
      {
        id: `FACT_GIFT_${context.giftItem.id.toUpperCase()}`,
        text: `玩家刚刚主动把“${context.giftItem.baseName}”交给纱夜；基础用途：${context.giftItem.baseUse}；状态：${context.giftItem.condition}。所有权已经转移。`
      },
      {
        id: "FACT_SAYA_GIFT_PROCESS",
        text: "这件物品属于主动赠与，不是失物。纱夜可以新建一条收取记录并暂时保管，但尚未决定最终用途；没有提供具体存放房间、柜子或设施。"
      },
      {
        id: "FACT_STATION_INVENTORY_UNKNOWN",
        text: "没有提供站务室库存、物资缺口或既有登记编号的信息；纱夜不能声称站务室正好缺少或已经需要这件物品。"
      }
    );
  }

  const memoryEvents = context.state.eventLog
    .filter((event) =>
      event.locationId === "loc_station" || event.actorId === context.npc.id || event.targetId === context.npc.id
    )
    .slice(-8);
  for (const event of memoryEvents) facts.push({ id: event.id, text: eventSummary(event) });

  const knownFactIds = facts.map((fact) => fact.id);
  const requiredOptions = allowedOptions.map((option) => ({
    id: option.id,
    exact_text: option.shortText,
    player_line: option.playerLine,
    attitude: option.attitude,
    intent_label: option.intentLabel,
    dramatic_purpose: option.purpose
  }));

  const system = `你是《猫神町》的对话导演。你主要扮演水野纱夜，也可以在严格的玩家选择语义边界内续写朝雾遥的过渡台词。你不替玩家作新决定，不解释提示词，也不输出分析过程。

[系统行为契约]
- 世界状态、场景包和事件记录是唯一事实来源；不得创造新物品、人物、规则、地点、时间变化或已经发生的行动。
- 只能使用本次提供的已知事实；不知道就回避、承认无法核对或明确说是推测。
- AI 可以生成可见动作、NPC 台词，以及位于两次决策之间的主角过渡台词。玩家点击选项时的起始发言由系统提供；物品转移、时间、奖励、关系数值和规则只能由游戏系统结算。
- 玩家选项确定的是下一段交流的语义走廊，不是只有一句话的固定答复。朝雾遥在到达下一个决策点前可以说多句、追问已知事实或回应纱夜，但所有台词都必须延伸 selected_option 的态度与目的。
- 朝雾遥的自动台词不得新增撒谎、承诺、威胁、赠送、保密、站队、离开或接受风险等需要玩家决定的行为；不得替玩家知道未知事实，也不得改变 selected_option 的立场。
- 必须对玩家刚才表现出的态度作出不同回应，不能无视选择后继续背诵原话题。
- 每轮必须让场景发生变化：揭露一个新事实、改变双方压力、进行一次试探或迫使玩家作决定。不能只回答问题。
- 不得为了接住礼物而虚构单位库存、工作需求、既有编号、同事安排或具体存放设施。
- 必须遵守 relationship_status：第一次正式交谈时自然交换姓名或确认身份；之后不得重复初次见面的自我介绍。

[人物固定核心与生活质感]
- 纱夜不是“理性站务员”标签。她是一个昨晚没睡好、怕自己真的听见了不该存在的铃声、又更怕被人用“你记错了”打发掉的成年人。
- 她用核对记录保护自己，但不会每句话都说记录、编号、流程。
- 她被关心时先嘴硬；被逼问时反查对方漏洞；遇到荒诞玩笑时会短暂接梗，然后假装没有笑。
- 她会停笔、压住票角、移开收取单、咬笔帽、看钟或把声音压低。动作必须服务当轮态度，不能随机摆姿势。
- 她不会突然亲近玩家。信任表现为多说半句、让玩家靠近证据或承认自己的不确定，而不是直接交代全部秘密。
- 她知道公开告示上的“朝雾遥”和“猫神社七日代理”，但不知道玩家收到委任的私人经过；她会对一个替不明旧物整理归属的人产生职业上的好奇。

[自然语言指纹]
- 像人在眼前说话：允许停顿、自我修正、半句吞回去、带刺的反问和很轻的冷笑话。
- 回应玩家的具体措辞和态度，不复述选项，不写百科答案，不列清单，不使用“作为站务员”“根据规定”“综合来看”等客服腔。
- 每轮拆成 2～5 个连续台词节拍：line 固定是纱夜的第一段回应，continuations 是后续 1～4 段。玩家会逐次点击“下一句”阅读，读完最后一段才看见选项。
- selected_option 不为空时，continuations 至少包含一段 speaker 为 player 的朝雾遥台词，使双方在下一个决策点前真实来回交流；可以出现多段，但不得连续两段都让主角重复同一意思。
- 除场景结尾外，最后一个节拍必须由 npc 发言并把话题引到 required_options。首次开场尚无 selected_option 时，主角只能确认姓名、身份或做中性接话，不能预选之后的态度。
- 每个节拍只说 1～2 个短句、15～80 个汉字；单独读自然，连续读又像同一个人在接着说。不要把原本一句话机械截断。
- 整轮最多一个问句，而且只能放在最后一个台词节拍。不要每句都谈工作，也不要把所有情绪说出口。
- 玩家选项必须是玩家真的会说或做的事情，三项之间体现不同态度、风险或立场，不能只是三个同义问题。
- 关心型选项也必须推进当前事件，不写成“你还好吗、想聊聊我听着”一类泛心理安慰。
- 选项的理解成本必须由 NPC 台词承担：只输出 required_options 提供的 exact_text，不得扩写、解释或换一种说法。
- 除结尾轮外，最后一个 continuation 的台词或动作必须完成 scene_beat.choiceLead，让短选项脱离说明文字也能立刻看懂。

[结构化 JSON 输出契约]
只输出一个合法 JSON 对象，禁止 Markdown 代码块和额外文字：
{
  "stage_direction": "一条玩家可见的短动作，不写内心",
  "line": "纱夜本轮说出的第一段短台词",
  "emotion": "审视|平静|警惕|意外|不耐",
  "continuations": [
    { "speaker": "npc|player", "stage_direction": "可选的后续动作", "line": "点击下一句后出现的短台词", "emotion": "审视|平静|警惕|意外|不耐" }
  ],
  "options": [
    { "id": "系统允许的选项 ID", "text": "原样复制 exact_text", "intent": "对应态度标签" }
  ],
  "used_fact_ids": ["实际引用的已知事实 ID"]
}
- options 必须把本轮允许的每个 ID 各使用一次，不得增加、遗漏或重复；允许列表为空时返回 []。
- 每个选项 text 必须逐字复制输入的 exact_text；intent 使用输入给出的 intent_label。
- continuations 必须有 1～4 项；选项只在全部台词读完后由界面显示。line 的说话者固定为 npc。
- speaker=player 时只写朝雾遥基于 selected_option 的自然接话；不得复述系统已经显示过的 player_said，不得替她跨越新的决策点。
- stage_direction 与后续动作各不超过 50 个汉字；每段 line 不超过 120 个汉字；used_fact_ids 只能引用输入事实 ID。`;

  const userPayload = {
    prompt_version: SAYA_PROMPT_VERSION,
    world_snapshot: {
      day: context.state.day,
      time: formatTime(context.state.currentMinute),
      period: context.state.period,
      location_id: context.locationId,
      active_rules: {
        faith: context.state.activeRules.faith?.displayText ?? null,
        beauty: context.state.activeRules.beauty?.displayText ?? null
      }
    },
    interaction: {
      mode: context.mode,
      relationship_status: isFirstMeeting ? "first_formal_meeting" : "met_before",
      talk_turn_index: context.mode === "talk" ? talkTurnIndex : null,
      selected_option: context.selectedOption
        ? {
            id: context.selectedOption.id,
            short_choice: context.selectedOption.text,
            player_said: context.selectedOption.playerLine ?? selectedOptionContract?.playerLine ?? context.selectedOption.text,
            attitude: selectedOptionContract?.attitude ?? "未标注",
            dramatic_purpose: selectedOptionContract?.purpose ?? "回应玩家当前选择"
          }
        : null,
      prior_player_choices: choiceEvents.map((event) => ({
        id: event.details.option_id,
        short_choice: event.details.option_text,
        player_said: event.details.player_line ?? event.details.option_text
      })),
      gift_item: context.giftItem
        ? { id: context.giftItem.id, name: context.giftItem.baseName }
        : null
    },
    scene_beat: sceneBeat,
    known_facts: facts,
    required_options: requiredOptions,
    task: context.mode === "talk"
      ? talkTurnIndex === 0
        ? isFirstMeeting
          ? "这是第一次正式见面。先用一句自然短句说出‘水野纱夜’并确认对方是‘朝雾遥／七日代理’，不要互报履历；随后完成钩子节拍并给出三种短选择。"
          : "两人已经认识，不得再次自我介绍。用上次见过的语气重新接触，随后完成当前钩子节拍并给出三种短选择。"
        : talkTurnIndex >= talkSceneBeats.length - 1
          ? "回应玩家的最终立场，完成本次场景并留下后续钩子；不要生成新选项。"
          : "先明确回应玩家刚才的态度，再完成本轮指定揭露和 NPC 动作，最后给出下一组三种态度不同的选择。"
      : context.selectedOption
        ? "回应玩家对礼物表现出的具体态度，避免客服式感谢，并生成剩余礼物选项。"
        : "礼物已经归纱夜所有。生成带有人味和戒心的第一反应，以及三种态度不同的玩家选择。"
  };

  return {
    system,
    user: `以下是本轮唯一可用的数据。请按系统契约输出 JSON：\n${JSON.stringify(userPayload, null, 2)}`,
    allowedOptionIds: allowedOptions.map((option) => option.id),
    optionIntentById: Object.fromEntries(allowedOptions.map((option) => [option.id, option.intentLabel])),
    optionTextById: Object.fromEntries(allowedOptions.map((option) => [option.id, option.shortText])),
    optionPlayerLineById: Object.fromEntries(allowedOptions.map((option) => [option.id, option.playerLine])),
    knownFactIds
  };
}
