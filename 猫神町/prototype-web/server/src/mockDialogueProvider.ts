import {
  DialogueResultSchema,
  demoBootstrap,
  type DialogueRequest,
  type DialogueResult
} from "../../packages/shared/src/index.ts";

type Script = {
  opening: string;
  firstMeetingOpening?: string;
  followups: Record<string, string>;
  emotion: string;
  decision: string;
  options: DialogueResult["options"];
};

const scripts: Record<string, Script> = {
  npc_koharu: {
    opening: "今天的猫神社安静得不像在等香客，倒像在等一个答案。你带了什么奇怪的东西吗？",
    firstMeetingOpening: "你就是朝雾遥？我是雨宫小春，放学后替家里看着神社。七日代理听起来很厉害——不过，你知道自己要代理什么吗？",
    followups: {
      ask_work: "有用不一定是灵验。只要有人愿意为了同一件事来这里，也算神社还活着吧？",
      ask_memory: "我小时候总觉得家里少了一双筷子。问大人，他们只说我记错了。这只猫铃也是从那只空抽屉里找到的——你先替我收着吧。",
      leave: "好。等你真的想让某样东西代表什么，再来找我。"
    },
    emotion: "期待",
    decision: "把玩家视作可能带来新意义的人，但暂不透露神社规则的全部异常。",
    options: [
      { id: "ask_work", text: "还有人来吗？", playerLine: "这里现在还会有人来参拜吗？还是只剩你在替它等人？", intent: "了解神社现状" },
      { id: "ask_memory", text: "你在等谁？", playerLine: "你刚才不像是在等香客。你其实在等谁？", intent: "触碰私人缺失" },
      { id: "leave", text: "我先看看。", playerLine: "我先不问了，自己在附近看看。", intent: "结束会面" }
    ]
  },
  npc_genichi: {
    opening: "一座小镇最有趣的地方，是它还以为自己的样子由自己决定。你觉得呢？",
    firstMeetingOpening: "朝雾遥，新来的七日代理。九条弦一——叫我九条就好。我很好奇，一个替旧物整理归属的人，会把整座小镇归到谁名下。",
    followups: {
      ask_gallery: "画廊只负责摆出东西。真正决定作品是什么的，是愿意围在它旁边说话的人。这张照片借你，也许你会替它找到另一种解释。",
      disagree: "很好。不同意是一种很昂贵的自由，我一直愿意赞助它——在合适的展柜里。",
      ask_player: "我只是好奇，你拿到决定权以后，会先改变世界，还是先改变自己？"
    },
    emotion: "从容",
    decision: "通过漂亮问题测试玩家对规则权力的欲望，不直接暴露自己的旧实验。",
    options: [
      { id: "ask_gallery", text: "谁决定艺术？", playerLine: "一件东西是不是艺术，究竟由画廊决定，还是由看它的人决定？", intent: "询问解释权" },
      { id: "disagree", text: "我不同意。", playerLine: "我不同意。小镇是什么样，不该由站在外面看的人替它决定。", intent: "公开反驳" },
      { id: "ask_player", text: "先说你的。", playerLine: "你一直在问我，却没有回答自己的问题。先说说你的答案。", intent: "反向试探" }
    ]
  }
};

const sayaOptionBeats: DialogueResult["options"][] = [
  [
    { id: "saya_open_gentle", text: "你没睡好？", playerLine: "你看起来没睡好。先不用解释自己，告诉我这张票是怎么回事。", intent: "温和靠近" },
    { id: "saya_open_press", text: "到底漏了什么？", playerLine: "不存在的班次却留下了真的车票。你还漏了什么，直接说。", intent: "直接逼问" },
    { id: "saya_open_absurd", text: "车票迷路了？", playerLine: "也许不是车票来错了，是那班车还不知道自己不存在。", intent: "荒诞玩笑" }
  ],
  [
    { id: "saya_ticket_inspect", text: "让我看看。", playerLine: "先别替它下结论。把车票和收取记录都给我看看。", intent: "亲手检查" },
    { id: "saya_ticket_doubt", text: "你在试探我？", playerLine: "你不是在问我怎么看。你是在试探我会不会相信你，对吧？", intent: "拆穿试探" },
    { id: "saya_ticket_ally", text: "我替你保密。", playerLine: "在弄清楚以前，我不会把这件事告诉别人。你可以继续说。", intent: "替她保密" }
  ],
  [
    { id: "saya_truth_plain", text: "我什么都没听见。", playerLine: "我昨晚什么都没听见，也没有能帮你证明的东西。", intent: "坦白无知" },
    { id: "saya_bluff_bell", text: "我听见铃了。", playerLine: "昨晚二十三点四十七分，我也听见站台方向响铃了。", intent: "撒谎试探" },
    { id: "saya_personal_probe", text: "你其实在害怕？", playerLine: "你怕的不是这张票。你怕的是说出来以后，所有人都觉得你记错了。", intent: "追问恐惧" }
  ],
  [
    { id: "saya_take_ticket", text: "票给我。", playerLine: "把票给我。今晚二十三点四十七分，我会亲自确认。", intent: "接下车票" },
    { id: "saya_leave_ticket", text: "票留给你。", playerLine: "票先留在你这里。我会记住时间，但现在不碰它。", intent: "拒绝持有" },
    { id: "saya_report_ticket", text: "现在去上报。", playerLine: "这已经不是我们两个人能私下处理的事了。现在就去找站长。", intent: "要求上报" }
  ]
];

const sayaResponses: Record<string, { stageDirection: string; line: string; emotion: string }> = {
  saya_open_gentle: {
    stageDirection: "她下意识摸了摸眼下，又把手收回去。",
    line: "没睡好而已，别替我写病历。你真要关心什么，就关心这张比我们早活了一天的纸——收取单写的是明天，字还是我的。",
    emotion: "意外"
  },
  saya_open_press: {
    stageDirection: "她把收取单推近半寸，手指仍压着纸角。",
    line: "你倒替我省了客套。好，漏掉的是日期：这张票今天在这里，收取单却是明天，而且签名像我。现在轮到你解释，为什么一点都不惊讶。",
    emotion: "审视"
  },
  saya_open_absurd: {
    stageDirection: "她嘴角动了一下，低头假装在看表格。",
    line: "那它至少比时刻表聪明。可惜车票不会自己填收取单——日期是明天，签名是我的。你还想替哪样东西辩护，车票，还是我？",
    emotion: "意外"
  },
  saya_ticket_inspect: {
    stageDirection: "她让开收取单，却把车票翻面扣在桌上。",
    line: "单子可以看，票先不行。因为背面有人写了句话：‘别让站务员看见。’我已经看见了，现在想知道它为什么更怕你看见。",
    emotion: "警惕"
  },
  saya_ticket_doubt: {
    stageDirection: "她松开压着车票的手，第一次正眼看你。",
    line: "两样都查。你至少比那张收取单诚实，知道自己正在被试探。票背面写着‘别让站务员看见’——所以，你打算让我假装没看见吗？",
    emotion: "审视"
  },
  saya_ticket_ally: {
    stageDirection: "她把声音压低，指腹慢慢抹过票背的铅笔字。",
    line: "别急着替我保密，我还没决定你值不值得一起倒霉。先看这个：‘别让站务员看见。’写这句话的人知道票会到我手里。",
    emotion: "平静"
  },
  saya_truth_plain: {
    stageDirection: "她盯了你两秒，终于松开被咬出齿痕的笔帽。",
    line: "这答案很没用。也正因为没用，我信一点。昨晚 23:47，我听见旧货运站台响了一次发车铃——那地方封了十二年。我没有看见车，只听见了。",
    emotion: "平静"
  },
  saya_bluff_bell: {
    stageDirection: "她猛地按住车票，椅脚在地面刮出一声。",
    line: "撒得太快了。铃声确实响过，但从候车室听不见——我昨晚站在锁着的旧货运站台门外。你想看我反应，现在看到了。还要继续赌吗？",
    emotion: "警惕"
  },
  saya_personal_probe: {
    stageDirection: "她看向墙上的钟，秒针走了三格才开口。",
    line: "我怕自己会开始习惯被说成记错了。昨晚旧货运站台真的响过铃，那地方封了十二年。好了，软肋给你看了一秒——别看第二秒。",
    emotion: "不耐"
  },
  saya_take_ticket: {
    stageDirection: "她终于松手，车票沿桌面滑到你面前。",
    line: "拿好。别折那枚猫爪形剪口，也别在 23:47 以前丢回来。要是今晚什么都没发生，我们就各自承认自己很蠢；要是发生了——先别上车。",
    emotion: "平静"
  },
  saya_leave_ticket: {
    stageDirection: "她把车票收回抽屉，却没有立刻上锁。",
    line: "合理。聪明人一般活得久，也比较难查。今晚 23:47 记得看钟；如果你听见铃，明天别问我，直接来这里坐下。",
    emotion: "平静"
  },
  saya_report_ticket: {
    stageDirection: "她把收取单转过来，指尖点在最下面的签字处。",
    line: "去吧。顺便问问站长，为什么他已经在这张写着明天日期的单子上签了字。问完如果他还记得你是谁，回来告诉我。",
    emotion: "警惕"
  }
};

const sayaPlayerBridges: Record<string, string> = {
  saya_open_gentle: "好，我不问你昨晚睡了多久。先看票和收取单。",
  saya_open_press: "那就把能证明日期的东西给我看，别再用问题拖时间。",
  saya_open_absurd: "好吧，暂时不替车票辩护。它还留下了什么？",
  saya_ticket_inspect: "你越不让我看票，我越想知道背面有什么。",
  saya_ticket_doubt: "那就别再试探了。你真正不敢让别人知道的是什么？",
  saya_ticket_ally: "保密不等于相信你。我至少会先把话听完。",
  saya_truth_plain: "我没法替你证明铃声，但我可以决定要不要接这张票。",
  saya_bluff_bell: "那你的反应已经告诉我了——铃声是真的。",
  saya_personal_probe: "我只看这一秒。接下来谈车票。",
  saya_take_ticket: "我会收好。今晚以前，我不会把它交给别人。",
  saya_leave_ticket: "我会看钟，但不会为了证明什么擅自开那扇门。",
  saya_report_ticket: "我不会替任何人改口。单子和签名都一起带上。"
};

const sayaNextChoiceLeads = [
  "收取单就在这里。你是要自己看，还是先决定信不信我？",
  "票背面那句话就在这儿。现在告诉我：昨晚二十三点四十七分，你听见了什么？",
  "旧货运站台封了十二年，铃却响了。票在这里——你打算怎么办？"
];

const mockPlayerBridges: Record<string, string> = {
  ask_work: "所以神社等的不是香客，是愿意替某件事赋予意义的人。",
  ask_memory: "我会收好猫铃，也会记住那双没人承认存在过的筷子。",
  ask_gallery: "那画廊只是把争论摆到灯下面，并没有替争论作结论。",
  disagree: "自由被装进展柜以后，就只剩下供人观看的样子了。",
  ask_player: "你还是把答案绕回了我身上。看来这就是你的答案。"
};

const mockNpcChoiceLeads: Record<string, string> = {
  npc_koharu: "你已经听见一种答案了。还要问那只空抽屉，还是先去别处看看？",
  npc_genichi: "很好，至少我们没有浪费这场分歧。现在你还想追问画廊，还是继续反驳我？"
};

function dialogueBeats(line: string, emotion: string) {
  const sentences = line.match(/[^。！？]+[。！？]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [line];
  const segments = sentences.length <= 3
    ? sentences
    : [sentences[0]!, sentences[1]!, sentences.slice(2).join("")];
  return {
    line: segments[0] ?? line,
    emotion,
    continuations: segments.slice(1).map((segment) => ({ line: segment, emotion }))
  };
}

function createMockSayaDialogue(selectedOptionId?: string, isFirstMeeting = true): DialogueResult {
  const response = selectedOptionId ? sayaResponses[selectedOptionId] : null;
  const selectedBeat = selectedOptionId
    ? sayaOptionBeats.findIndex((options) => options.some((option) => option.id === selectedOptionId))
    : -1;
  const nextOptions = sayaOptionBeats[selectedBeat + 1] ?? [];

  const line = response?.line ?? (isFirstMeeting
    ? "水野纱夜，夜班站务。你就是朝雾遥，那个只待七天的代理？正好——昨晚 23:47，这张票出现在失物抽屉里，可本站没有那班车。所以，你现在想先问哪一件？"
    : "又见面了，朝雾遥。昨晚 23:47，这张票出现在失物抽屉里，可本站没有那班车。所以，你现在想先问哪一件？");
  const emotion = response?.emotion ?? "审视";

  if (selectedOptionId && response) {
    const continuations = [{
      speakerId: demoBootstrap.player.id,
      line: sayaPlayerBridges[selectedOptionId] ?? "我听见了。你继续说。",
      emotion: "回应"
    }];
    if (nextOptions.length > 0) {
      continuations.push({
        speakerId: "npc_saya",
        line: sayaNextChoiceLeads[selectedBeat] ?? "话说到这里。接下来，你准备怎么做？",
        emotion
      });
    }
    return DialogueResultSchema.parse({
      speakerId: "npc_saya",
      stageDirection: response.stageDirection,
      line: response.line,
      emotion,
      continuations,
      options: nextOptions,
      debug: {
        provider: "mock",
        decision: "根据玩家选择的语义边界，让纱夜与朝雾遥交替说话，再抵达下一决策点。",
        usedFacts: ["saya_scene:ticket_2347", `selected_option:${selectedOptionId}`]
      }
    });
  }

  return DialogueResultSchema.parse({
    speakerId: "npc_saya",
    stageDirection: response?.stageDirection ?? "她用指节轻敲了一下桌上的车票，没有立刻抬头。",
    ...dialogueBeats(line, emotion),
    options: nextOptions,
    debug: {
      provider: "mock",
      decision: "按四轮异常车票事件推进，并根据玩家态度使用对应保底回应。",
      usedFacts: ["saya_scene:ticket_2347", ...(selectedOptionId ? [`selected_option:${selectedOptionId}`] : [])]
    }
  });
}

export function createMockDialogue(request: DialogueRequest): DialogueResult {
  const npc = demoBootstrap.npcs.find((candidate) => candidate.id === request.npcId);
  if (npc?.id === "npc_saya") return createMockSayaDialogue(request.selectedOptionId, request.isFirstMeeting ?? true);
  const script = scripts[request.npcId];

  if (!npc || !script) {
    return DialogueResultSchema.parse({
      speakerId: request.npcId,
      line: "这里暂时没有可以继续的对话。",
      emotion: "平静",
      options: [
        { id: "wait", text: "等一会儿。", intent: "等待" },
        { id: "leave", text: "离开这里。", intent: "结束会面" }
      ],
      debug: {
        provider: "mock",
        decision: "未知 NPC，使用安全保底对白。",
        usedFacts: []
      }
    });
  }

  const line = request.selectedOptionId
    ? script.followups[request.selectedOptionId] ?? script.opening
    : request.isFirstMeeting !== false && script.firstMeetingOpening
      ? script.firstMeetingOpening
      : script.opening;
  const options = request.selectedOptionId
    ? script.options.filter((option) => option.id !== request.selectedOptionId)
    : script.options;

  if (request.selectedOptionId) {
    return DialogueResultSchema.parse({
      speakerId: npc.id,
      line,
      emotion: script.emotion,
      continuations: [
        {
          speakerId: demoBootstrap.player.id,
          line: mockPlayerBridges[request.selectedOptionId] ?? "我明白了。你继续。",
          emotion: "回应"
        },
        {
          speakerId: npc.id,
          line: mockNpcChoiceLeads[npc.id] ?? "话说到这里，接下来由你决定。",
          emotion: script.emotion
        }
      ],
      options,
      debug: {
        provider: "mock",
        decision: `${script.decision} 玩家在已选态度内继续接话，再由 NPC 引向下一决策点。`,
        usedFacts: [
          `day:${request.day}`,
          `period:${request.period}`,
          `location:${request.locationId}`,
          `npc:${npc.id}`,
          `selected_option:${request.selectedOptionId}`
        ]
      }
    });
  }

  return DialogueResultSchema.parse({
    speakerId: npc.id,
    ...dialogueBeats(line, script.emotion),
    options,
    debug: {
      provider: "mock",
      decision: script.decision,
      usedFacts: [
        `day:${request.day}`,
        `period:${request.period}`,
        `location:${request.locationId}`,
        `npc:${npc.id}`,
        ...(request.selectedOptionId ? [`selected_option:${request.selectedOptionId}`] : [])
      ]
    }
  });
}
