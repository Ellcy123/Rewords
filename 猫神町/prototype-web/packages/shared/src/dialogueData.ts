export const playerLineByOptionId: Record<string, string> = {
  ask_work: "这里现在还会有人来参拜吗？还是只剩你在替它等人？",
  ask_memory: "先把事情说清楚。你姐姐叫什么，哪一天、在哪里失踪的？",
  koharu_ask_god: "带我去后殿。既然你说真昼留下过东西，我们现在就去找。",
  koharu_doubt_memory: "除了你，还有谁亲眼见过雨宫真昼？我要一个活着的证人。",
  koharu_guard_memory: "我帮你找雨宫真昼。但你发现任何证据，都必须先给我看。",
  koharu_test_god: "先去找纱夜。她如果真的开过零号站台，就让她当面承认。",
  koharu_leave_empty: "先找九条弦一。那张黑色车票既然是他给的，他就必须解释。",
  leave: "我先不问了，自己在附近看看。",
  ask_gallery: "五年前给雨宫真昼黑色车票的人，是你吗？",
  genichi_ask_power: "把猫神祭的未剪辑原片交出来。我不要看你办展用的版本。",
  genichi_play_along: "带我去零号站台。我可以出演你的重演，但流程必须由我决定。",
  genichi_refuse_power: "我会把真昼的原片公开。你的赞助和威胁都拦不住。",
  disagree: "你明知道上车的人会被全镇忘掉，还是把票递给了她。",
  ask_player: "你不是想重演真昼失踪。你想让我成为下一张被剪掉的脸，对吗？",
  saya_open_gentle: "你一直盯着23:47。五年前那个晚上，究竟是谁上了车？",
  saya_open_press: "别再拿流程挡着。零号站台是你亲手打开的吗？",
  saya_open_absurd: "同一张死人车票回来第二次，车站至少该给常客打折吧。",
  saya_ticket_inspect: "把黑色车票、票根和通行令全给我看。少一张都不算坦白。",
  saya_ticket_doubt: "是谁命令你开门？我要名字，不要职位。",
  saya_ticket_ally: "你亲眼看见雨宫真昼上车了吗？她当时有没有回头？",
  saya_truth_plain: "把你改过的那页值班记录拿出来。现在还来得及留下原件。",
  saya_bluff_bell: "你还在保护当年的站长，对吗？他手里有什么能让你闭嘴？",
  saya_personal_probe: "真昼失踪前给你留了东西。你一直没有交给小春，是不是？",
  saya_take_ticket: "票给我。我不会在23:47上车，只会拿它去逼九条开保险柜。",
  saya_leave_ticket: "证据留在你手里。复制两份，一份给小春，一份藏起来。",
  saya_report_ticket: "现在去找九条。我要当着他的面看你们谁先改口。",
  gift_ask_use: "东西已经给你了。我只是想知道，你准备怎么处理它？",
  gift_explain: "没有别的理由。我只是看见它的时候，觉得应该把它给你。",
  gift_silence: "……你收下就好，我现在不想解释。",
  wait: "我先等一会儿，看看这里还会不会发生什么。"
};

export function resolvePlayerLine(option: { id: string; text: string; playerLine?: string }) {
  return option.playerLine ?? playerLineByOptionId[option.id] ?? option.text;
}

export function splitDialogueLine(line: string, emotion: string) {
  const sentences = line.match(/[^。！？]+[。！？]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [line];
  let segments = sentences;
  if (sentences.length > 3) {
    const targetLength = sentences.join("").length / 3;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let firstBoundary = 1; firstBoundary < sentences.length - 1; firstBoundary += 1) {
      for (let secondBoundary = firstBoundary + 1; secondBoundary < sentences.length; secondBoundary += 1) {
        const candidate = [
          sentences.slice(0, firstBoundary).join(""),
          sentences.slice(firstBoundary, secondBoundary).join(""),
          sentences.slice(secondBoundary).join("")
        ];
        const score = candidate.reduce((sum, segment) => sum + Math.abs(segment.length - targetLength), 0);
        if (score < bestScore) {
          bestScore = score;
          segments = candidate;
        }
      }
    }
  }
  return {
    line: segments[0] ?? line,
    emotion,
    continuations: segments.slice(1).map((segment) => ({ line: segment, emotion }))
  };
}
