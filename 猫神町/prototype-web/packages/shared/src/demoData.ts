import { DemoBootstrapSchema, type DemoBootstrap } from "./contracts.ts";

const demoBootstrapCandidate: DemoBootstrap = {
  meta: {
    title: "猫神町",
    version: "0.6.0-agent-rewrite",
    phase: "AI NPC 重构 · 真昼失踪事件",
    notice: "三名居民围绕雨宫真昼失踪案行动；完整对白、NPC动作、记忆与会后反思会持续进入后续对话。"
  },
  player: {
    id: "player_haruka",
    name: "朝雾遥",
    reading: "あさぎり はるか",
    age: 21,
    publicRole: "猫神社七日代理管理人",
    occupation: "旧物整理员",
    publicBackground: "在町外替人整理来历不明或无人认领的旧物。三天前收到一份盖有猫神町公印的七日委任书，于今天带着神社旧钥匙来到镇上。",
    fixedTraits: ["先听完再判断", "认真对待物品的来历", "紧张时会用很淡的玩笑岔开话题"],
    coreDesire: "找出是谁寄来委任书，以及自己为什么被神社选中。",
    vulnerability: "无法放着归属不明的东西不管，因此很容易被一件物品或一次托付卷入别人的故事。",
    startingMystery: "包裹里还有七张空白归属卡，以及一张朝雾遥从未见过的童年照片；照片中的孩子站在猫神社前，脸与遥十分相似。"
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
      travelMinutes: 60
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
      travelMinutes: 60
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
      travelMinutes: 60
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
      oneLine: "她笑着请你找姐姐；谁说她没有姐姐，她就会当场反锁神社的门。",
      privateStory: "五年前的猫神祭，小春亲眼看见姐姐雨宫真昼与九条弦一在神社石阶上争吵。真昼随后拿着弦一给的黑色单程票去了猫神町站，并在 23:47 登上一列时刻表中不存在的列车。第二天，母亲、学校和全镇居民都认定小春从来没有姐姐。小春记得真昼的姓名、长相和失踪当晚，也保留着刻有“真昼”二字的猫铃。",
      godView: "她只承认能把雨宫真昼本人带回来的神；接受供奉、制造奇迹或让大家安心都不算。",
      godRelationship: "她会把当前神的名字写在寻人启事上，公开要求它交还雨宫真昼；七天后姐姐仍未回来，她就准备当众宣布这个神是骗子。",
      ruleResponseStyle: "把规则直接用在寻人行动上：印启事、查站台、逼知情者表态，并观察规则是否改掉姐姐的姓名、照片或车票。",
      persona: {
        publicMask: "元气、嘴甜、自来熟，像在组织一场热闹的校园活动。",
        coreContradiction: "她看起来最相信奇迹，实际上每天都在准备证明猫神无能。",
        immediateGoal: "让朝雾遥今天就查看猫铃，并在纱夜或弦一之间选一个追问。",
        longTermGoal: "在第七天以前找到雨宫真昼，或者逼全镇公开承认真昼确实存在过。",
        fear: "找到姐姐已经死亡的证据，也害怕自己最终会像母亲一样忘掉姐姐。",
        defenseMechanism: "越慌越笑，越被怀疑越迅速提出一个需要对方立刻参与的行动。",
        moralLine: "不会伤害无辜者，但会偷钥匙、闯禁区和公开别人的秘密。",
        breakingPoint: "有人说“你根本没有姐姐”时，她会停止微笑、锁门，并逐字纠正对方。",
        actionBias: "先把证物塞到对方手里，再要求对方陪自己去找当事人。",
        falseBelief: "她确信真昼是被弦一强迫上车，不相信姐姐可能主动利用零号站台离开。",
        secret: "她已经偷走神社后殿的钥匙，但不敢独自进去。",
        signatureBehaviors: ["紧张时把寻人启事折成猫头", "谈到真昼时会立刻报出具体日期和时间", "被否定时会把门闩扣上"],
        speechRules: ["语速快，先说结论再补经过", "会给玩家起亲昵称呼，但生气时改叫全名", "不说空泛的记忆隐喻，必须说真昼、猫铃、车票或具体当事人"]
      },
      initialLocationId: "loc_shrine",
      emotion: "笑得太灿烂",
      dialogueTone: ["语速快而直接", "甜笑与突然冷脸形成反差", "用人名、时间和证物说话"],
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
      oneLine: "五年前，她亲手打开零号站台让真昼上车，又亲手把当晚的值班记录改成“无事发生”。",
      privateStory: "五年前猫神祭当晚，25 岁的纱夜收到一张盖有九条家印章的临时通行令，命令她在 23:47 打开已经封闭的零号站台。她亲眼看见雨宫真昼拿着黑色单程票上车；真昼没有回头，只把一张纸塞进她的制服口袋。第二天，站长要求她把值班记录改成“设备误响，无旅客进入”；她照做了，却私藏了通行令的复写纸和被打孔的票根。现在，同一编号的黑色车票再次出现在失物抽屉里。",
      godView: "她判断一个神是否危险，只看它的名字会不会出现在车票、通行令和广播上，并让工作人员真的开门放行。",
      godRelationship: "当前神一旦出现在站务文件上，她会立即封锁零号站台并保存原件；她宁可停运，也不愿再放走第二个人。",
      ruleResponseStyle: "把新规则写入对照表，检查神名是否出现在通行令、车票和监控时间码上；发现异常就扣证、锁门并寻找签字人。",
      persona: {
        publicMask: "不耐烦、能干、拒绝闲聊，像任何麻烦都只配领一张表格。",
        coreContradiction: "她把守规章当成尊严，却最清楚自己曾按命令伪造记录。",
        immediateGoal: "判断朝雾遥是否能保住证据，并让她选择拿票、查签字或直接质问九条。",
        longTermGoal: "在第七天前公开原始通行令，封死零号站台，不让真昼的失踪再次发生。",
        fear: "真昼当年回头求救，而自己因为害怕丢工作假装没有看见。",
        defenseMechanism: "先审问对方，用挑错和扣留证物拖延自己的坦白。",
        moralLine: "不会再伪造第二份记录，也不会允许未成年人进入零号站台。",
        breakingPoint: "别人替她辩解“你只是服从命令”时，她会立刻承认是自己开的门。",
        actionBias: "先没收关键物品、锁住出口、复印原件，然后才解释。",
        falseBelief: "她认为真昼是被弦一骗上车的，没有认真考虑真昼可能早就知道列车的作用。",
        secret: "她保留的复写纸背面有真昼写给小春的一句话，但纱夜从未交出去。",
        signatureBehaviors: ["说谎前会把胸牌翻到背面", "每次提到23:47都会先看钟", "决定坦白时会把抽屉钥匙推给对方"],
        speechRules: ["短句，具体到人名、编号和时间", "被逼问会反问证据在哪里", "干燥讽刺可以有，但不说抽象审计哲学"]
      },
      initialLocationId: "loc_station",
      emotion: "戒备",
      dialogueTone: ["短句和硬事实", "嘴硬但不冷血", "认错时不为自己开脱"],
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
      oneLine: "他五年前把黑色车票递给真昼，如今又笑着邀请朝雾遥出演同一场“失踪”。",
      privateStory: "五年前，弦一资助猫神祭并策划“神明离町”演出。雨宫真昼发现他准备让一名真人登上零号站台，以测试全镇是否会接受那个人从未存在。真昼在石阶上当众揭穿他；弦一随即把黑色车票递给她，激她亲自证明零号站台只是传说。他明知列车会抹去乘客在镇上的身份，仍安排通行令让纱夜开门，并把真昼登车前后的未剪辑照片锁在画廊保险柜。",
      godView: "他认为能让售票员开门、让母亲否认女儿、让全镇第二天照常营业的力量才配叫神。",
      godRelationship: "他不跪拜当前神，而会立刻把神名印上新车票，准备在第七天让朝雾遥重演真昼的登车过程。",
      ruleResponseStyle: "把规则包装成公开演出：印票、发邀请、挑选主角、控制观众看到的照片，并诱导别人亲手完成危险步骤。",
      persona: {
        publicMask: "幽默、慷慨、审美出众的长辈，永远让客人觉得自己被特别欣赏。",
        coreContradiction: "他真心欣赏敢反抗自己的人，却会把他们的反抗也剪进自己的作品。",
        immediateGoal: "确认朝雾遥愿不愿拿着新神名义的车票接近零号站台。",
        longTermGoal: "在第七天完成“第二次神明离町”，证明真昼的消失不是事故而是可重复的作品。",
        fear: "真昼从零号站台回来，并亲口证明她的选择从来不属于弦一。",
        defenseMechanism: "承认一半事实，把罪责重新描述成对方自愿参加的选择。",
        moralLine: "不会亲手把人推上车；他坚持受害者必须自己接票、自己迈步。",
        breakingPoint: "别人要求查看未剪辑原片时，他会停止比喻并直接威胁收回赞助。",
        actionBias: "先展示经过剪辑的证据，再用赞助、门票和邀请函逼对方站到指定位置。",
        falseBelief: "他坚信只要一个人最终自己上车，自己就不需要为消失负责。",
        secret: "未剪辑照片拍到真昼上车前把一张纸塞进了纱夜的制服口袋。",
        signatureBehaviors: ["谈判时替对方整理衣领", "说到真正重要的条件时会摘下手套", "被拆穿后拿三百万元资助威胁对方"],
        speechRules: ["温和、精确、有令人不舒服的亲密感", "问题必须指向具体证据或行动", "不能连续使用比喻，真正发怒时只说事实和条件"]
      },
      initialLocationId: "loc_arcade",
      emotion: "愉快",
      dialogueTone: ["像欣赏玩家一样施压", "半真半假但不空谈", "威胁落到钱、钥匙、照片和站台"],
      accent: "#75558f"
    }
  ],
  dailyEvents: [
    {
      id: "day_1_arrival",
      day: 1,
      title: "五年前的车票回来了",
      summary: "朝雾遥到任当天，一张五年前已经使用过的黑色单程票再次出现在车站。票面乘客姓名是“雨宫真昼”，但镇上只有小春承认这个人存在。",
      objective: "分别确认小春、纱夜和弦一与雨宫真昼最后一夜的关系。"
    },
    {
      id: "day_2_blank_offering",
      day: 2,
      title: "真昼的声音",
      summary: "清晨六点，车站广播播放了一段少女留言：“小春，不要来零号站台。”纱夜认出这是五年前没有播完的录音，弦一却已经派人拆走广播喇叭。",
      objective: "找到录音来源，并决定先保护小春还是追查被拆走的喇叭。"
    },
    {
      id: "day_3_fourth_name",
      day: 3,
      title: "全镇出现同一张照片",
      summary: "商店街每个橱窗里都出现了猫神祭合照。照片上小春牵着一名被剪去脸的少女，背面统一盖着镜庭画廊的印章。",
      objective: "取得一张照片原件，查明是谁在一夜之间完成投放。"
    },
    {
      id: "day_4_public_name",
      day: 4,
      title: "神名登上新车票",
      summary: "当前信仰规则中的神名被印上新一批黑色车票。售票机自动显示 17:47 前往零号站台，乘客栏仍写着雨宫真昼。",
      objective: "检查三名NPC拿到车票后会保护、销毁还是利用它。"
    },
    {
      id: "day_5_relic_review",
      day: 5,
      title: "第二次神明离町",
      summary: "弦一宣布第七天举办“第二次神明离町”，并把朝雾遥印成主演。宣传照旁写着：上一位主演，雨宫真昼。",
      objective: "夺取未剪辑原片，或假装合作以查出弦一准备怎样开启零号站台。"
    },
    {
      id: "day_6_audit_notice",
      day: 6,
      title: "纱夜公开认罪",
      summary: "纱夜把五年前的原始通行令贴在车站大厅，并在自己的名字旁写下：“零号站台是我开的。”九条家的印章清晰可见。",
      objective: "决定保护纱夜的原件、交给小春，还是拿去与弦一交易。"
    },
    {
      id: "day_7_ownership_ritual",
      day: 7,
      title: "零号站台开门",
      summary: "17:47，封死五年的零号站台第一次亮灯。广播逐个念出小春、纱夜、弦一和朝雾遥的名字，最后传来雨宫真昼的回答：“四个人里，有一个必须上车。”",
      objective: "完成最后拜访并留下规则；十八点以后，所有证据和关系将生成结局。"
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
    dayStartMinute: 9 * 60,
    nightStartMinute: 18 * 60,
    currentMinute: 9 * 60,
    conversationDurationMinutes: 2 * 60,
    inventoryItemIds: ["item_potato", "item_thread"],
    activeRules: { faith: null, beauty: null }
  }
};

export const demoBootstrap = DemoBootstrapSchema.parse(demoBootstrapCandidate);
