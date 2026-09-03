import {
  DialogueResultSchema,
  demoBootstrap,
  resolvePlayerLine,
  type DialogueOption,
  type DialogueRequest,
  type DialogueResult
} from "../../packages/shared/src/index.ts";

const optionBeats: Record<string, DialogueResult["options"][]> = {
  npc_koharu: [
    [
      { id: "ask_memory", text: "她叫什么？", intent: "核对姐姐身份" },
      { id: "koharu_ask_god", text: "带我去后殿。", intent: "立即查后殿" },
      { id: "koharu_doubt_memory", text: "谁见过她？", intent: "寻找目击者" }
    ],
    [
      { id: "koharu_guard_memory", text: "我帮你找她。", intent: "答应共同调查" },
      { id: "koharu_test_god", text: "先找纱夜。", intent: "追问纱夜" },
      { id: "koharu_leave_empty", text: "先找九条。", intent: "质问弦一" }
    ]
  ],
  npc_saya: [
    [
      { id: "saya_open_gentle", text: "谁上了车？", intent: "温和追问乘客" },
      { id: "saya_open_press", text: "是你开的门？", intent: "逼问开门责任" },
      { id: "saya_open_absurd", text: "车票还魂了？", intent: "黑色玩笑试探" }
    ],
    [
      { id: "saya_ticket_inspect", text: "证据都给我。", intent: "索要全部证据" },
      { id: "saya_ticket_doubt", text: "谁命令你的？", intent: "追问命令来源" },
      { id: "saya_ticket_ally", text: "她回头了吗？", intent: "追问最后目击" }
    ],
    [
      { id: "saya_truth_plain", text: "拿出原记录。", intent: "要求交出原记录" },
      { id: "saya_bluff_bell", text: "你在保护站长？", intent: "错误指控站长" },
      { id: "saya_personal_probe", text: "你藏了什么？", intent: "拆穿私藏留言" }
    ],
    [
      { id: "saya_take_ticket", text: "票给我。", intent: "带走车票" },
      { id: "saya_leave_ticket", text: "复制两份。", intent: "要求备份证据" },
      { id: "saya_report_ticket", text: "现在找九条。", intent: "当面对质" }
    ]
  ],
  npc_genichi: [
    [
      { id: "ask_gallery", text: "票是你给的？", intent: "追问给票事实" },
      { id: "genichi_ask_power", text: "把原片交出来。", intent: "索要未剪辑原片" },
      { id: "disagree", text: "你知道她会消失。", intent: "指控故意伤害" }
    ],
    [
      { id: "genichi_play_along", text: "带我去站台。", intent: "危险合作" },
      { id: "genichi_refuse_power", text: "我会公开原片。", intent: "公开对抗" },
      { id: "ask_player", text: "你想让我上车？", intent: "拆穿替身计划" }
    ]
  ]
};

const openings: Record<string, (first: boolean, faith: string | null) => string> = {
  npc_koharu: (first, faith) => `${first ? "你就是朝雾遥？我是雨宫小春。先别拜神，帮我找个人。" : "你来了。真昼的寻人启事昨晚又被人撕了。"}我姐姐雨宫真昼五年前拿着九条弦一给的黑票，在23:47登上零号站台的列车。第二天，全镇都说我没有姐姐。${faith ? `现在他们又说“${faith}”。很好，我已经把这句话印到寻人启事上，让这个神负责把真昼交回来。` : ""}`,
  npc_saya: (first, faith) => `${first ? "水野纱夜，夜班站务。你是朝雾遥吧？" : "又见面了。今天我不让你猜。"}五年前23:47，是我打开零号站台，让雨宫真昼上了车。今天，同一编号的黑票又出现在失物抽屉。${faith ? `票背新印着“${faith}”，所以抽屉和站台门都已经被我锁了。` : ""}`,
  npc_genichi: (first, faith) => `${first ? "九条弦一。欢迎来看看我五年前没展完的作品。" : "朝雾遥，主演终于来了。"}雨宫真昼手里的黑色车票是我给的。我没有推她，她自己走上零号站台——这个区别对你很重要吗？${faith ? `我已经把“${faith}”印到重演车票上，17:47准时开场。` : ""}`
};

const responses: Record<string, { line: string; player: string; lead?: string; emotion: string; action: string }> = {
  ask_memory: { line: "雨宫真昼。失踪时十八岁，五年前猫神祭，晚上23:47。你要日期、姓名、地点，我一个都不会说错。", player: "好，我记下了。接下来我要知道谁能证明。", lead: "纱夜开的门，九条给的票，后殿钥匙在我这里。你跟我一起查，还是先找他们？", emotion: "急切", action: "她把刻着“真昼”的猫铃按进你掌心。" },
  koharu_ask_god: { line: "行。后殿钥匙是我从母亲那里偷的。她发现以后一定会拦我，所以这次由你开门。", player: "你走前面。进去以后，没确认是什么就别碰。", lead: "不过先说清楚：你跟我查后殿，还是先拿猫铃去问纱夜或九条？", emotion: "兴奋", action: "她从袜口抽出一把旧钥匙。" },
  koharu_doubt_memory: { line: "纱夜亲眼看她上车，九条亲手给她票。两个人都认识真昼，只是一个不敢说，一个说了也不认错。", player: "那就从还活着的证人开始。", lead: "好。你跟我一起查，先找纱夜，还是先堵九条的画廊？", emotion: "冷下来", action: "她用红笔在地图上圈住车站和画廊。" },
  koharu_guard_memory: { line: "成交。你看原件，我留复印件；谁想抢，我们就把名字贴满商店街。", player: "别擅自公开会害到别人的东西。先把真昼找回来。", emotion: "亢奋", action: "她在寻人启事背面写下“与朝雾遥共同调查”。" },
  koharu_test_god: { line: "好。我们带猫铃去猫神町站。纱夜要是不认，我就让她对着“真昼”两个字再说一次。", player: "别先刺激她。让我问第一句。", emotion: "咬牙微笑", action: "她在地图上圈住猫神町站和水野纱夜的名字。" },
  koharu_leave_empty: { line: "好。我们带寻人启事去镜庭商店街。九条看到真昼的脸，就别想再把她叫成作品。", player: "我问车票，你看住原片。", emotion: "痛快", action: "她在地图上圈住镜庭画廊和九条弦一的名字。" },
  saya_open_gentle: { line: "雨宫真昼。十八岁，小春的姐姐。她上车前把一张纸塞进我制服口袋，我没有叫住她。", player: "我不是来替你判刑。先把证据拿出来。", lead: "我有车票、票根和通行令。你先看哪一件？", emotion: "僵硬", action: "她反锁失物抽屉，把钥匙套上手腕。" },
  saya_open_press: { line: "是。门锁是我开的，放行章是我盖的，第二天的假记录也是我写的。够直接了吗？", player: "够了。现在告诉我是谁命令你的。", lead: "命令、目击、物证，你只能先追一条。选。", emotion: "恼火", action: "她把自己的胸牌翻到背面。" },
  saya_open_absurd: { line: "她没死。至少我没有死亡记录。黑票也不打折，只会把乘客从名册里划掉。", player: "好，笑话到此为止。把五年前的东西给我看。", lead: "想看全部证据、签命令的人，还是她上车前最后做了什么？", emotion: "冷淡", action: "她把黑色车票压进玻璃夹板。" },
  saya_ticket_inspect: { line: "票根在这里。通行令也在——看红印，九条家。五年前的值班簿在下面，因为那页是我改的。", player: "三样分开放，别再让一个人拿着全部原件。", lead: "你要原记录，还是先问我为什么一直没把真昼的留言交出去？", emotion: "认命", action: "她把三件证物排成一线。" },
  saya_ticket_doubt: { line: "我不知道签字人。复写纸只留下九条家的红印。站长在第二天逼我擦掉真昼，但开门命令来自谁，我没有能指向个人的原件。", player: "那就别把怀疑当证词。先把你做过的事说完。", lead: "你要原记录、继续查站长，还是问我还藏了什么？", emotion: "阴沉", action: "她把盖有九条家红印的复写纸推过来。" },
  saya_ticket_ally: { line: "她没有回头。上车前只把一张纸塞进我制服口袋。我装作没感觉到——这五年，我每天都知道那张纸在哪里。", player: "把纸拿出来。小春有权看。", lead: "先决定：看假记录、继续追站长，还是现在拆穿我藏着的那句话？", emotion: "自厌", action: "她的手停在胸牌夹层。" },
  saya_truth_plain: { line: "这里。“设备误响，无旅客进入。”每个字都是我补的。原来的碳痕还在纸背。", player: "把原页封起来。你的认罪不能代替证据。", lead: "最后决定吧：票由你带走、我们复制两份，还是现在拿去堵九条？", emotion: "平静", action: "她翻开值班簿，用笔尖划出假记录。" },
  saya_bluff_bell: { line: "你猜错了。我现在怕的不是站长。真正还能毁掉我工作、封掉这个站的人叫九条弦一。", player: "那就别拿站长挡问题。真昼留给你的是什么？", lead: "看完留言以后，票由谁保管？你带走、我备份，还是一起找九条？", emotion: "发火", action: "她把记录复印件翻到盖着九条家印章的一面。" },
  saya_personal_probe: { line: "是。“告诉小春，别来找我。”只有这一句。我怕交出去以后，小春真的会去，所以藏了五年。", player: "你没有权替小春决定要不要找。", lead: "骂得对。现在决定证据去哪：你带票、我复制，还是马上找九条？", emotion: "崩紧", action: "她把复写纸翻到背面。" },
  saya_take_ticket: { line: "可以。黑票归你，票根、复写纸和记录页留我这里分别封袋。别让九条把证据换成他的演出票。", player: "我只拿证据，不接他的演出票。", emotion: "决断", action: "她把黑票装袋后交到你手边。" },
  saya_leave_ticket: { line: "原件留我这里，复制两份。一份交给小春，一份另行封存。三份不放在同一个人手里。", player: "复制件分开放，也别在这里说出保管位置。", emotion: "冷静", action: "她启动复印机并准备三个证物袋。" },
  saya_report_ticket: { line: "我跟你去。五年前我在他面前低过一次头，这次我要看着他说“票是我给的”。", player: "到画廊以后我先问，你别替他回答。", emotion: "决绝", action: "她锁上窗口，把通行令塞进外套。" },
  ask_gallery: { line: "是我给的。真昼说零号站台不可能让人消失，我只是给了她亲自证明的机会。", player: "你明知道后果，还把陷阱叫作机会。", lead: "原片、重演、还是我的罪名——你今天是来拿哪一个？", emotion: "愉快", action: "他掀开被裁去真昼面孔的巨幅照片。" },
  genichi_ask_power: { line: "原片在保险柜。你没有搜查令，我也没有慈善到把代表作送给主演。", player: "那就说价格。别再拿艺术两个字挡着。", lead: "你可以参加重演、公开与我对抗，或者先承认你也想知道上车会怎样。", emotion: "欣赏", action: "他摘下一只手套，按住保险柜钥匙。" },
  disagree: { line: "当然知道。真昼也知道。她还是接了票，自己走完石阶，自己踏进车门。你准备把十八岁的她说成没有选择吗？", player: "有选择，不代表设计陷阱的人无罪。", lead: "那么亲自看一次吧：参加重演、公开原片，或者问我为什么选中你。", emotion: "冷下来", action: "他把写有朝雾遥姓名的新票推上展柜。" },
  genichi_play_along: { line: "很好。第七天17:47，零号站台。你拿新黑票，我给你一次接近保险柜钥匙和站台门的机会；到门前再看谁骗过谁。", player: "我会到门前，不代表我会上车。", emotion: "兴奋", action: "他在主演邀请函上补写朝雾遥的姓名。" },
  genichi_refuse_power: { line: "公开吧。然后九条家给猫神社、车站和商店街的三百万元资助全部撤回。我要看谁先请你把照片收起来。", player: "把三百万元写下来。威胁也应该留下原件。", emotion: "冰冷", action: "他在三百万元赞助撤回通知上签名。" },
  ask_player: { line: "不是“想”。你已经拿到七日代理、神社钥匙和全镇的注意。真昼当年只有一张票，你比她更适合测试。", player: "所以只要我拒绝上车，你的作品就永远少一个结尾。", emotion: "恼怒", action: "他收起笑容，把保险柜钥匙攥进掌心。" }
};

function withPlayerLines(options: DialogueOption[]) {
  return options.map((option) => ({ ...option, playerLine: resolvePlayerLine(option) }));
}

function splitOpening(text: string, emotion: string) {
  const parts = text.match(/[^。！？]+[。！？]?/g)?.filter(Boolean) ?? [text];
  return {
    line: parts[0]!,
    continuations: parts.slice(1, 4).map((line) => ({ speakerId: undefined, line, emotion }))
  };
}

export function createMockDialogue(request: DialogueRequest): DialogueResult {
  const npc = demoBootstrap.npcs.find((candidate) => candidate.id === request.npcId);
  const beats = optionBeats[request.npcId];
  if (!npc || !beats) {
    return DialogueResultSchema.parse({
      speakerId: request.npcId,
      line: "这里暂时没有可以继续的对话。",
      emotion: "平静",
      continuations: [],
      options: [{ id: "leave", text: "离开。", intent: "结束会面" }],
      debug: { provider: "mock", decision: "未知NPC安全保底。", usedFacts: [] }
    });
  }

  if (!request.selectedOptionId) {
    const opening = openings[npc.id]!(request.isFirstMeeting ?? true, request.activeRules.faith);
    return DialogueResultSchema.parse({
      speakerId: npc.id,
      stageDirection: npc.id === "npc_koharu" ? "她扣上侧门门闩，把一枚猫铃按进你手里。" : npc.id === "npc_saya" ? "她反锁失物抽屉，亮出黑色车票。" : "他掀开遮住巨幅照片的黑布。",
      ...splitOpening(opening, npc.emotion),
      emotion: npc.emotion,
      options: withPlayerLines(beats[0]!),
      debug: { provider: "mock", decision: "用具体当事人、证物和责任开启真昼失踪案。", usedFacts: [`npc:${npc.id}`, "incident:mahiru"] }
    });
  }

  const response = responses[request.selectedOptionId];
  const selectedBeat = beats.findIndex((options) => options.some((option) => option.id === request.selectedOptionId));
  const nextOptions = beats[selectedBeat + 1] ?? [];
  const continuations = [{
    speakerId: demoBootstrap.player.id,
    line: response?.player ?? "把具体的人、时间和证物说清楚。",
    emotion: "回应"
  }];
  if (nextOptions.length > 0) {
    continuations.push({
      speakerId: npc.id,
      line: response?.lead ?? "下一步做什么，现在选。",
      emotion: response?.emotion ?? npc.emotion
    });
  }
  return DialogueResultSchema.parse({
    speakerId: npc.id,
    stageDirection: response?.action,
    line: response?.line ?? openings[npc.id]!(false, request.activeRules.faith),
    emotion: response?.emotion ?? npc.emotion,
    continuations,
    options: withPlayerLines(nextOptions),
    debug: { provider: "mock", decision: "按玩家选择推进证物、责任人与下一步行动。", usedFacts: [`npc:${npc.id}`, `selected_option:${request.selectedOptionId}`, "incident:mahiru"] }
  });
}
