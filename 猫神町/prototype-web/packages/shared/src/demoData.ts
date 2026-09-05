import { DemoBootstrapSchema } from "./contracts.ts";

// Public production data only. Case truth, private knowledge and plans live on the server.
const placeRows = [
  ["shrine", "猫神社", "七日代理人的工作处", "石阶旁的猫正把供桌当床。"],
  ["station", "猫神町站", "小镇的出入口", "售票窗边压着一本值班簿。"],
  ["arcade", "镜庭商店街", "画廊与报摊", "画廊隔壁就是报摊，两个招牌挤在一起。"],
  ["inn", "白石旅馆", "有人等你回来的地方", "柜台边有一壶刚泡的茶。"],
  ["police", "猫神町警署", "结案不等于结束", "窗口后堆着等待整理的卷宗。"],
  ["clinic", "桐生诊所", "检查记录留下的疑问", "诊桌擦得很干净，纸张一页也没少。"],
  ["home", "雨宫家旧居", "受托整理的遗物", "工作台上放着真昼留下的收纳盒。"],
  ["sunset", "夕见台", "案件发生的地方", "步道尽头是栏杆与开阔的山坡。"]
];
const npcRows = [
  ["koharu", "雨宫小春", 17, "ENFP", "神社帮工／学生", "shrine", "嘴快心软，护姐姐时谁也拦不住。", "#c67b71"],
  ["saya", "水野纱夜", 32, "ISTJ", "站务员", "station", "先把事情办妥，自己的事最后再说。", "#527c86"],
  ["genichi", "九条弦一", 55, "ENTJ", "画廊赞助人", "arcade", "连替你倒茶都像在安排你的下一步。", "#a88a50"],
  ["ritsu", "藤崎律", 26, "ENTP", "地方记者", "arcade", "很会接话，也很会替别人解围。", "#8b748f"],
  ["makoto", "犬饲诚", 44, "ESTJ", "警员", "police", "嗓门大，见到写错的日期就皱眉。", "#627968"],
  ["mio", "桐生澪", 38, "INTJ", "医生", "clinic", "话不多，没把握的结论绝不轻易下。", "#769a9d"],
  ["chiyo", "白石千代", 62, "ESFJ", "旅馆老板娘", "inn", "怕你没吃饭，拿第二块点心时又会敲你的手。", "#ba9474"]
] as const;
const genericItems = [
  ["item_potato", "土豆", "🥔", "potato", "player"],
  ["item_thread", "线团", "🧶", "connection", "player"],
  ["item_name_tag", "名牌", "🏷️", "name", "loc_station"],
  ["item_photo", "照片", "🖼️", "plumpness", "loc_arcade"],
  ["item_cat_bell", "猫铃", "🔔", "cat", "loc_shrine"]
];
const evidenceRows = [
  ["E01", "车票", "npc_koharu"], ["E02", "旧报", "loc_arcade"],
  ["E03", "信", "npc_chiyo"], ["E04", "审稿页", "npc_genichi"],
  ["E05", "值班页", "npc_saya"], ["E06", "值班抄件", "npc_makoto"],
  ["E07", "委托单", "npc_genichi"], ["E08", "旧稿", "loc_arcade"],
  ["E09", "录音卡", "loc_home"], ["E10", "检查记录", "npc_mio"],
  ["E11", "检查副本", "npc_makoto"], ["E12", "纠正说明", "uncreated"],
  ["E13", "补充说明", "uncreated"]
];
const concepts = [
  ["potato", "土豆", "entity"], ["connection", "连接", "idea"],
  ["name", "名字", "idea"], ["plumpness", "丰满", "attribute"],
  ["cat", "猫", "entity"], ["leaving", "离开", "action"],
  ["record", "记录", "idea"]
].map(([id, label, kind]) => ({ id: "concept_" + id, label, kind,
  slotText: { faith: label + "是神", beauty: label + "是美的" } }));
export const demoBootstrap = DemoBootstrapSchema.parse({
  meta: { title: "猫神町", version: "0.7.0-sunset-case", phase: "七日疑案",
    notice: "重构试玩 · 独立案件存档 · 人物与场景暂用占位美术" },
  locations: placeRows.map(([id, name, subtitle, description]) => ({
    id: "loc_" + id, name, subtitle, description, cityAspect: subtitle,
    atmosphere: "日常里有尚未说清的事。", accent: "#a58d74",
    openPeriods: ["morning", "afternoon", "evening", "night"], travelMinutes: 60
  })),
  player: { id: "player", name: "朝雾遥", reading: "Asagiri Haruka", age: 21,
    publicRole: "猫神社七日代理管理人", occupation: "旧物整理员",
    publicBackground: "受托来到猫神町，代管神社七天，并整理雨宫真昼的遗物。",
    fixedTraits: ["会注意物品的来历", "不替别人轻易下结论", "能认真接住荒唐话"],
    coreDesire: "把东西交给该收到它的人，也弄清真昼留下的疑问。",
    vulnerability: "容易把别人的托付当成自己的责任。",
    startingMystery: "真昼的死亡已经按自杀结案，小春却说姐姐准备带她离开。"
  },
  npcs: npcRows.map(([id, name, age, mbtiReference, occupation, loc, oneLine, accent]) => ({
    id: "npc_" + id, name, age, mbtiReference, occupation,
    classPosition: occupation, cityAspect: occupation, oneLine,
    privateStory: "通过相处了解。", godView: "通过对话了解。",
    godRelationship: "世界规则会进入这个人的日常。", ruleResponseStyle: "以自己的习惯回应。",
    persona: { publicMask: oneLine, coreContradiction: "尚未了解", immediateGoal: "过好今天",
      longTermGoal: "尚未了解", fear: "尚未了解", defenseMechanism: "尚未了解",
      moralLine: "尚未了解", breakingPoint: "尚未了解", actionBias: "尚未了解",
      falseBelief: "尚未了解", secret: "尚未了解",
      signatureBehaviors: ["有自己的作息", "在场景中做事", "回应眼前的人"],
      speechRules: ["说日常中文", "先回应上一句", "用具体的人和事说话"] },
    initialLocationId: "loc_" + loc, emotion: "平静", dialogueTone: [oneLine], accent
  })),
  dailyEvents: Array.from({ length: 7 }, (_, i) => ({ id: "case_day_" + (i + 1), day: i + 1,
    title: i === 0 ? "两张没有用过的票" : i === 6 ? "七日之后" : "继续走访",
    summary: "三周前，雨宫真昼坠落身亡。此案已按自杀结案。",
    objective: "听当事人说，读留下的东西，自己决定相信什么。"
  })),
  concepts,
  items: [
    ...genericItems.map(([id, baseName, icon, concept, initialOwnerId]) => ({
      id, baseName, icon, category: "日常物品", baseUse: "可以赠送或供奉。",
      condition: "完好", carriedConceptId: "concept_" + concept, initialOwnerId
    })),
    ...evidenceRows.map(([id, baseName, initialOwnerId]) => ({
      id, baseName, icon: "📄", category: "材料", baseUse: "阅读后记在手记里；实物可以赠送或供奉。",
      condition: "以实际查看结果为准",
      carriedConceptId: id === "E01" ? "concept_leaving" : "concept_record", initialOwnerId
    }))
  ],
  ruleSlots: [
    { id: "faith", label: "信仰", question: "谁是神？", emptyText: "尚未供奉载体" },
    { id: "beauty", label: "审美", question: "什么是美？", emptyText: "尚未供奉载体" }
  ],
  initialState: { day: 1, period: "morning", dayStartMinute: 540, nightStartMinute: 1080,
    currentMinute: 540, conversationDurationMinutes: 120,
    inventoryItemIds: ["item_potato", "item_thread"], activeRules: { faith: null, beauty: null } }
});
