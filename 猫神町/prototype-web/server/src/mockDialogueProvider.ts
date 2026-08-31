import {
  DialogueResultSchema,
  demoBootstrap,
  type DialogueRequest,
  type DialogueResult
} from "../../packages/shared/src/index.ts";

type Script = {
  opening: string;
  followups: Record<string, string>;
  emotion: string;
  decision: string;
  options: DialogueResult["options"];
};

const scripts: Record<string, Script> = {
  npc_koharu: {
    opening: "今天的猫神社安静得不像在等香客，倒像在等一个答案。你带了什么奇怪的东西吗？",
    followups: {
      ask_work: "有用不一定是灵验。只要有人愿意为了同一件事来这里，也算神社还活着吧？",
      ask_memory: "我小时候总觉得家里少了一双筷子。问大人，他们只说我记错了。",
      leave: "好。等你真的想让某样东西代表什么，再来找我。"
    },
    emotion: "期待",
    decision: "把玩家视作可能带来新意义的人，但暂不透露神社规则的全部异常。",
    options: [
      { id: "ask_work", text: "神社现在还有人来吗？", intent: "了解神社现状" },
      { id: "ask_memory", text: "你刚才是不是在等某个人？", intent: "触碰私人缺失" },
      { id: "leave", text: "我先四处看看。", intent: "结束会面" }
    ]
  },
  npc_saya: {
    opening: "23:47 的失物柜又多了一张车票。编号不在今天的记录里，也不在昨天。",
    followups: {
      ask_ticket: "票面是真的，日期也没问题。麻烦的是，猫神町没有它写的那一班车。",
      ask_records: "记录不会自己说谎。会改记录的是人，或者比人更麻烦的东西。",
      offer_help: "先别碰柜子。你若真想帮忙，记住今晚有几个人从末班车下来。"
    },
    emotion: "审视",
    decision: "先验证玩家是否能遵守简单观察任务，再决定是否分享异常记录。",
    options: [
      { id: "ask_ticket", text: "那张车票哪里不对？", intent: "检查异常物品" },
      { id: "ask_records", text: "也可能只是记录错了。", intent: "挑战记录可信度" },
      { id: "offer_help", text: "需要我帮你确认什么吗？", intent: "主动协助" }
    ]
  },
  npc_genichi: {
    opening: "一座小镇最有趣的地方，是它还以为自己的样子由自己决定。你觉得呢？",
    followups: {
      ask_gallery: "画廊只负责摆出东西。真正决定作品是什么的，是愿意围在它旁边说话的人。",
      disagree: "很好。不同意是一种很昂贵的自由，我一直愿意赞助它——在合适的展柜里。",
      ask_player: "我只是好奇，你拿到决定权以后，会先改变世界，还是先改变自己？"
    },
    emotion: "从容",
    decision: "通过漂亮问题测试玩家对规则权力的欲望，不直接暴露自己的旧实验。",
    options: [
      { id: "ask_gallery", text: "画廊能决定一件东西是不是艺术吗？", intent: "询问解释权" },
      { id: "disagree", text: "小镇当然可以自己决定。", intent: "公开反驳" },
      { id: "ask_player", text: "你似乎更想听我的答案。", intent: "反向试探" }
    ]
  }
};

export function createMockDialogue(request: DialogueRequest): DialogueResult {
  const npc = demoBootstrap.npcs.find((candidate) => candidate.id === request.npcId);
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
    : script.opening;
  const options = request.selectedOptionId
    ? script.options.filter((option) => option.id !== request.selectedOptionId)
    : script.options;

  return DialogueResultSchema.parse({
    speakerId: npc.id,
    line,
    emotion: script.emotion,
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
