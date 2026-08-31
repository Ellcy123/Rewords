import { DemoBootstrapSchema, type DemoBootstrap } from "./contracts.ts";

const demoBootstrapCandidate: DemoBootstrap = {
  meta: {
    title: "猫神町",
    version: "0.1.0-day1",
    phase: "Day 1 · 工程空壳",
    notice: "当前使用固定测试数据与 Mock 对话，不调用真实 AI。"
  },
  locations: [
    {
      id: "loc_shrine",
      name: "猫神社",
      subtitle: "规则被供奉的地方",
      description: "旧石阶通往一座不算宏伟的神社。拜殿旁有两个空着的供奉位。",
      cityAspect: "传统、家庭与公共信仰",
      atmosphere: "木色、青苔与稍显反常的安静",
      accent: "#b34f4f",
      openPeriods: ["morning", "afternoon", "evening"],
      travelCost: 1
    },
    {
      id: "loc_station",
      name: "猫神町站",
      subtitle: "末班车仍会准时抵达",
      description: "只有两条站台的小站。夜班窗口旁堆着长期无人认领的失物。",
      cityAspect: "通勤、失物、离开与归来",
      atmosphere: "旧荧光灯、广播杂音与准点的钟",
      accent: "#477b73",
      openPeriods: ["morning", "afternoon", "evening"],
      travelCost: 1
    },
    {
      id: "loc_arcade",
      name: "镜庭商店街",
      subtitle: "旧商铺与私人画廊共用一条街",
      description: "遮雨棚下是杂货铺、食堂和九条家的镜庭画廊。橱窗总比行人整洁。",
      cityAspect: "消费、审美、阶级与公共话语",
      atmosphere: "午后暖光、褪色招牌与过分洁净的画廊",
      accent: "#8b6a9e",
      openPeriods: ["morning", "afternoon", "evening"],
      travelCost: 1
    }
  ],
  npcs: [
    {
      id: "npc_koharu",
      name: "雨宫小春",
      age: 17,
      mbtiReference: "ENFP",
      occupation: "高中生、猫神社临时看守",
      classPosition: "衰落的仪式家庭",
      cityAspect: "传统与年轻一代",
      oneLine: "她会真心相信玩家写下的意义，并努力把它变成所有人都能参加的生活。",
      initialLocationId: "loc_shrine",
      emotion: "期待",
      dialogueTone: ["先联想可能性", "边说边想", "使用具体感受"],
      accent: "#d26068"
    },
    {
      id: "npc_saya",
      name: "水野纱夜",
      age: 32,
      mbtiReference: "ISTJ",
      occupation: "夜班站务员、失物保管员",
      classPosition: "普通受薪劳动者",
      cityAspect: "城市流动与夜班劳动",
      oneLine: "她不解释怪事，她记录怪事发生前后究竟少了什么。",
      initialLocationId: "loc_station",
      emotion: "审视",
      dialogueTone: ["先核对记录", "短句", "结论克制"],
      accent: "#3f766f"
    },
    {
      id: "npc_genichi",
      name: "九条弦一",
      age: 55,
      mbtiReference: "ENTP",
      occupation: "镜庭画廊馆长、町文化委员会理事",
      classPosition: "地方名门与文化权力持有者",
      cityAspect: "上层审美与公共叙事",
      oneLine: "他不满足于收藏艺术品，他想把整座小镇连同居民一起策展。",
      initialLocationId: "loc_arcade",
      emotion: "从容",
      dialogueTone: ["用问题代替回答", "测试对方", "温和地改写前提"],
      accent: "#75558f"
    }
  ],
  concepts: [
    {
      id: "concept_potato",
      label: "土豆",
      kind: "entity",
      slotText: { faith: "土豆是神", beauty: "土豆是美的" }
    },
    {
      id: "concept_leaving",
      label: "离开",
      kind: "action",
      slotText: { faith: "人们信仰离开", beauty: "离开是美的" }
    },
    {
      id: "concept_name",
      label: "名字",
      kind: "idea",
      slotText: { faith: "名字是神圣的", beauty: "名字是美的" }
    },
    {
      id: "concept_plumpness",
      label: "胖",
      kind: "attribute",
      slotText: { faith: "丰腴是神圣的", beauty: "胖是美的" }
    },
    {
      id: "concept_cat",
      label: "猫",
      kind: "entity",
      slotText: { faith: "猫是神", beauty: "猫是美的" }
    },
    {
      id: "concept_connection",
      label: "联系",
      kind: "idea",
      slotText: { faith: "人们信仰联系", beauty: "联系是美的" }
    }
  ],
  items: [
    {
      id: "item_potato",
      baseName: "土豆",
      icon: "🥔",
      category: "食物",
      baseUse: "食用、种植或交换",
      condition: "普通",
      carriedConceptId: "concept_potato",
      initialOwnerId: "player"
    },
    {
      id: "item_ticket",
      baseName: "车票",
      icon: "🎫",
      category: "票据",
      baseUse: "乘车、核对路线与时间",
      condition: "旧",
      carriedConceptId: "concept_leaving",
      initialOwnerId: "loc_station"
    },
    {
      id: "item_name_tag",
      baseName: "名牌",
      icon: "🏷️",
      category: "标识",
      baseUse: "写下并展示姓名或身份",
      condition: "未填写",
      carriedConceptId: "concept_name",
      initialOwnerId: "npc_saya"
    },
    {
      id: "item_photo",
      baseName: "照片",
      icon: "🖼️",
      category: "影像",
      baseUse: "保存一个人的影像",
      condition: "旧",
      carriedConceptId: "concept_plumpness",
      initialOwnerId: "npc_genichi"
    },
    {
      id: "item_cat_bell",
      baseName: "猫铃",
      icon: "🔔",
      category: "饰品",
      baseUse: "佩戴并发出声音",
      condition: "褪色",
      carriedConceptId: "concept_cat",
      initialOwnerId: "loc_shrine"
    },
    {
      id: "item_thread",
      baseName: "线团",
      icon: "🧶",
      category: "材料",
      baseUse: "缝补、捆扎、连接或做标记",
      condition: "完整",
      carriedConceptId: "concept_connection",
      initialOwnerId: "player"
    }
  ],
  ruleSlots: [
    {
      id: "faith",
      label: "信仰",
      question: "这个世界相信什么？",
      emptyText: "尚未供奉载体"
    },
    {
      id: "beauty",
      label: "审美",
      question: "这个世界认为什么是美？",
      emptyText: "尚未供奉载体"
    }
  ],
  initialState: {
    day: 1,
    period: "morning",
    actionsRemaining: 3,
    actionsPerDay: 3,
    inventoryItemIds: ["item_potato", "item_thread"],
    activeRules: { faith: null, beauty: null }
  }
};

export const demoBootstrap = DemoBootstrapSchema.parse(demoBootstrapCandidate);

