export const playerLineByOptionId: Record<string, string> = {
  ask_work: "这里现在还会有人来参拜吗？还是只剩你在替它等人？",
  ask_memory: "你刚才不像是在等香客。你其实在等谁？",
  leave: "我先不问了，自己在附近看看。",
  ask_gallery: "一件东西是不是艺术，究竟由画廊决定，还是由看它的人决定？",
  disagree: "我不同意。小镇是什么样，不该由站在外面看的人替它决定。",
  ask_player: "你一直在问我，却没有回答自己的问题。先说说你的答案。",
  saya_open_gentle: "你看起来没睡好。先不用解释自己，告诉我这张票是怎么回事。",
  saya_open_press: "不存在的班次却留下了真的车票。你还漏了什么，直接说。",
  saya_open_absurd: "也许不是车票来错了，是那班车还不知道自己不存在。",
  saya_ticket_inspect: "先别替它下结论。把车票和收取记录都给我看看。",
  saya_ticket_doubt: "你不是在问我怎么看。你是在试探我会不会相信你，对吧？",
  saya_ticket_ally: "在弄清楚以前，我不会把这件事告诉别人。你可以继续说。",
  saya_truth_plain: "我昨晚什么都没听见，也没有能帮你证明的东西。",
  saya_bluff_bell: "昨晚二十三点四十七分，我也听见站台方向响铃了。",
  saya_personal_probe: "你怕的不是这张票。你怕的是说出来以后，所有人都觉得你记错了。",
  saya_take_ticket: "把票给我。今晚二十三点四十七分，我会亲自确认。",
  saya_leave_ticket: "票先留在你这里。我会记住时间，但现在不碰它。",
  saya_report_ticket: "这已经不是我们两个人能私下处理的事了。现在就去找站长。",
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
