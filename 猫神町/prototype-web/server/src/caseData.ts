import { demoBootstrap, type DialogueOption, type GameState } from "../../packages/shared/src/index.ts";

// Server-only authoring canon. Never include this module in bootstrap or client bundles.
export const facts: Record<string, string> = {
  F01: "三周前，摄影师雨宫真昼23岁在夕见台坠落死亡。玩家到镇上一周前已按自杀结案。",
  F02: "真昼买了自己和妹妹小春的两张离町车票，计划次日带妹妹离开。",
  F03: "捐款没有失踪。九条弦一付钱让藤崎律写假报道，逼真昼道歉并回来工作。",
  F04: "案发当晚20:50至21:20，九条在猫神町站与纱夜争执，有值班记录；他不是现场推人的人。",
  F05: "真昼写给千代的信后半写明要带小春离町；报道及结案摘要只引用前两句。",
  F06: "千代约21:20见律从夕见台方向回来，却作证他整晚留在旅馆。千代没有目睹推人。",
  F07: "桐生澪的检查记录确认坠落死亡，不能据此判定自行跳下；结案摘要删去了保留意见。",
  F08: "当晚21:10，藤崎律与真昼在夕见台争执，律故意将她推下。只有律知道实际推人的过程。",
  F09: "小春最后与姐姐吵架，说过：你自己走，我才不跟你去。她为此后悔。",
  F10: "纱夜拒绝了真昼一起离开的邀请。她害怕说出九条的不在场证明会伤害小春。",
  F11: "犬饲诚接受了不完整材料和九条的催办压力。后来知道结论有缺口却未纠正。",
  F12: "真昼录下律承认捏造报道和九条付钱。这段录音只涉及假报道，没有录到死亡现场；知道录音存在不等于知道备份在哪里。",
  R01: "白石千代已经决定纠正律整晚在旅馆的证词。她现在可能会提交纠正说明。"
};
export type CharacterCore = { known: string[]; voice: string; secret: string; goal: string; example: string; lead: string };
export const characters: Record<string, CharacterCore> = {
  npc_koharu: { known: ["F01", "F02", "F09"], voice: "嘴快，情绪上脸；会瞪人也会嘴硬。不要每句都喊姐姐。", secret: "后悔最后的吵架；相信九条害死姐姐，仍信任记者律。推测必须说是自己的怀疑。",
    goal: "让遥看两张车票，不逼新认识的人保证破案。", example: "这只猫叫九条二号。因为只吃贵的。……不许踢它，我骂可以。",
    lead: "我姐给我们俩都买了车票。你看，连座位都挨着。准备寻死的人，干吗还给我买一张？" },
  npc_saya: { known: ["F01", "F02", "F04", "F10"], voice: "短句，先做事；不冷酷，有事会往具体时间上说。", secret: "不想伤害小春，但值班页确实能证明九条当时在车站。",
    goal: "拿值班页让人核对，不把内疚当证据。", example: "先别站黄线里。你要问什么，我听得见。",
    lead: "小春让你来的？先说好，我这里有当晚的值班页。可上面写的，她未必愿意听。" },
  npc_genichi: { known: ["F01", "F03", "F04", "F05", "F11"], voice: "客气而控制欲强，先替对方安排；被问中要害才收笑。", secret: "下单假报道、催结案，有审稿页和委托单；不是凶手，不知道律推人。",
    goal: "保住声誉，把追问变成谈条件；不得声称能删除玩家证据。", example: "茶不合口味？换一杯就是。问题也可以换一个。",
    lead: "小春大概已经骂过我了。坐吧。报纸的审稿页、找藤崎律写稿的委托单，我这里都留着。你想问哪件？" },
  npc_ritsu: { known: ["F01", "F03", "F05", "F06", "F08", "F12"], voice: "接话快，会自嘲、帮忙、调侃；不要每句阴笑或谜语，表面可信。", secret: "本人推人杀死真昼。只知道千代旧假证词；未收到消息前不知道她改口。优先维护记者和好人的形象，不随便自白。",
    goal: "探听遥查到了什么，保护自己；不能凭空知道背包或他人私聊。", example: "我请客。先声明，只请罐装的，采访经费比我的良心还薄。",
    lead: "你是神社新来的代理人？我是藤崎律，报摊归我看。那份旧报是我写的，你要问就当面问，别憋着。" },
  npc_makoto: { known: ["F01", "F07", "F11"], voice: "直、急，想维持办事人的尊严；被抓住遗漏要具体辩解。", secret: "草率接受短版信和不在场证词，知道材料不足；持有值班抄件但没推理出九条的时间矛盾。",
    goal: "要求看实际材料，可以纠正记录、去保护证人；不能关闭地图。", example: "别把三件事一起问。先说你亲眼见了什么。",
    lead: "结案材料可以看。值班抄件、检查副本都在。你说结论不对，总得指出哪一页不对。" },
  npc_mio: { known: ["F01", "F07"], voice: "准确、简短，有冷幽默；明确我不知道，不背教科书。", secret: "真昼事前来取检查记录说要离町，不能据此证明不自杀。曾提保留意见，后来没坚持。",
    goal: "把检查记录给人看，区分医学观察与案件推论。", example: "我写的是坠落，不是自杀。这两个词长得不像吧。",
    lead: "你是来问真昼的？检查记录上只有坠落致死。谁跳、谁推，不是看一张检查单就能知道的。" },
  npc_chiyo: { known: ["F01", "F05", "F06"], voice: "生活气浓，唠叨吃饭，护短；紧张时手还在收拾桌面。", secret: "把律当自家孩子，撒谎包庇他。收到真昼完整的信，知道离开计划但不知道两张票。没看见杀人。",
    goal: "先看看来者是否听人说话，可能纠正证词；纠正、写说明、通知律是不同动作。", example: "茶没喝两口就审上我了？……好，你问，别站着问。",
    lead: "小春还好吗？真昼寄给我的信，我一直留着。报纸只印了两句，后面那么长，像是没长眼睛似的。" }
};
export const evidence: Record<string, { text: string; facts: string[]; source: string }> = {
  E01: { text: "两张次日离开猫神町的车票，乘客分别是雨宫真昼、雨宫小春，座位相邻。出行计划不能单独证明死亡性质。", facts: ["F02"], source: "小春保存的车票" },
  E02: { text: "《镜庭周报》署名藤崎律：雨宫真昼涉嫌挪用祭典捐款。另附报道引信：我不想再这样过下去了。明天开始，别再来找我。报道将其解释为轻生前兆；这是报道的说法，不是已核实事实。", facts: [], source: "商店街公开旧报" },
  E03: { text: "千代收件。全文：我不想再这样过下去了。明天开始，别再来找我。我要带小春离开猫神町，等住处定下来，再把地址寄给你。", facts: ["F05"], source: "千代保存的完整信件" },
  E04: { text: "报稿审阅页保留了信的完整文字。后两句被划去，页上有九条的审阅签记。它能核对删节，不能证明九条在现场杀人。", facts: ["F05"], source: "九条的审稿材料" },
  E05: { text: "案发日值班页：20:50 九条弦一到站与水野纱夜争执；21:20 离站。纱夜签名。", facts: ["F04"], source: "纱夜当日值班原页" },
  E06: { text: "警方留存的值班抄件：九条20:50到站，21:20离站。此件抄自纱夜的同一份值班页，不是第二名证人。", facts: ["F04"], source: "警署抄件，与E05同源" },
  E07: { text: "委托人为九条弦一，受托人为藤崎律，事项是以祭典捐款为题迫使真昼公开道歉。附结算记录。资金核对栏显示捐款账目无缺口。", facts: ["F03"], source: "九条持有的委托单" },
  E08: { text: "藤崎律署名的报道旧稿样张，带有修改痕迹。可确认写稿人和报道措辞，不能单独证明杀人，也不是认罪书。", facts: [], source: "报摊公开旧稿样张" },
  E09: { text: "事前录音备份。真昼：钱根本没丢，你为什么这么写？律：九条让我这么写的。他要你回来道歉，稿费也是他给的。录音到此为止，没有案发现场声音。", facts: ["F03", "F12"], source: "旧居遗物收纳盒" },
  E10: { text: "桐生澪签字：确认坠落死亡。现有检查结果不能确定坠落方式，不能据此认定自行跳下。", facts: ["F07"], source: "诊所保留的检查记录" },
  E11: { text: "警署检查副本与原检查记录同源，保留不能确定坠落方式的意见；结案摘要未呈现此意见。", facts: ["F07", "F11"], source: "警署检查副本，与E10同源" },
  E12: { text: "千代签字确认：我先前说律整晚都在旅馆，不实。约21:20我看见他从夕见台方向回来。我没有看见真昼坠落，也没有看见有人推她。", facts: ["F06", "R01"], source: "千代在本次调查中写下的纠正说明" },
  E13: { text: "犬饲诚补充说明：已收到与旧结论不符的材料，原结案材料不足以排除他杀，将重新核查。这不是对任何人的定罪书。", facts: ["F11"], source: "警员根据本次实际收到材料补写" }
};
export const initialLocations = ["loc_shrine", "loc_station", "loc_arcade"];
export const locationAliases: Record<string, string[]> = Object.fromEntries(
  demoBootstrap.locations.map(l => [l.id, [l.name, ...(({
    loc_home: ["真昼的旧居", "雨宫家的旧居"], loc_inn: ["千代的旅馆", "旅馆"],
    loc_police: ["镇警署", "警署"], loc_clinic: ["澪的诊所", "诊所"]
  } as Record<string, string[]>)[l.id] ?? [])]])
);
export function availableActions(state: GameState, npcId: string): DialogueOption[] {
  const o = (id: string, text: string, intent: string): DialogueOption => ({ id, text, playerLine: text, intent });
  // Executable requests only. This is NOT a topic menu; the model writes its own choices.
  const options: DialogueOption[] = [];
  for (const [id, owner] of Object.entries(state.itemOwners)) {
    if (owner !== npcId || !evidence[id]) continue;
    const name = demoBootstrap.items.find(i => i.id === id)!.baseName;
    if (!state.evidenceJournal.some(e => e.id === id)) options.unshift(o("show:" + id, "看看" + name, "请对方出示材料，不转移所有权"));
    else options.unshift(o("take:" + id, name + "给我？", "请求交给我实物；只在对方实际交付后获得"));
  }
  if (npcId === "npc_chiyo" && !state.storyFlags.includes("chiyo_retracted") &&
      (state.evidenceJournal.some(e => e.id === "E03") || state.npcStates[npcId].memories.length > 5)) {
    options.unshift(o("retract", "那晚律在哪？", "询问律当晚的行踪，给千代纠正假证词的机会"));
  }
  if (npcId === "npc_chiyo" && state.storyFlags.includes("chiyo_retracted") && state.itemOwners.E12 === "uncreated") {
    options.unshift(o("write", "写下来吧。", "请千代确认并签下纠正说明，不自动通知别人"));
  }
  if (npcId === "npc_makoto" && state.npcStates[npcId].knownFactIds.includes("R01")) {
    options.unshift(o("protect", "去接千代。", "请警员实际前往白石旅馆保护证人，不瞬移"));
    if (state.itemOwners.E13 === "uncreated") options.unshift(o("supplement", "补进案卷。", "请警员补写调查说明，不定罪"));
  }
  return options;
}
