import {
  DialogueResultSchema,
  demoBootstrap,
  type DialogueResult,
  type Item,
  type Npc
} from "../../packages/shared/src/index.ts";

const openingByNpc: Record<string, (item: Item) => string> = {
  npc_koharu: (item) =>
    `${item.baseName}？真给我啊？你是不是还有事要我帮忙？`,
  npc_saya: (item) =>
    `给我的${item.baseName}？谢谢。怎么突然想起送我东西？`,
  npc_genichi: (item) =>
    `${item.baseName}，你亲自挑的？倒让我有些好奇，你为什么想到我。`
};

const followupByNpc: Record<string, Record<string, (item: Item) => string>> = {
  npc_koharu: {
    gift_ask_use: (item) => `${item.baseName}怎么用？我还没想好呢。你刚给我，总得让我看看吧。`,
    gift_explain: (item) => `哦。那……谢谢。不是不喜欢${item.baseName}，我就是没想到你会送我东西。`,
    gift_silence: (item) => `行，不问了。${item.baseName}我收着。你哪天想说了再说。`
  },
  npc_saya: {
    gift_ask_use: (item) => `${item.baseName}先收好。怎么用，我想想再说。`,
    gift_explain: (item) => `那我不多问了。${item.baseName}我收下，谢谢你。`,
    gift_silence: (item) => `好。${item.baseName}在我这里，你不用急着解释。`
  },
  npc_genichi: {
    gift_ask_use: (item) => `${item.baseName}怎么用，还没决定。我倒想先知道，你觉得它哪里适合我？`,
    gift_explain: (item) => `没有条件？那我应该好好谢谢你。这份${item.baseName}，我收下了。`,
    gift_silence: (item) => `好，我不追问。${item.baseName}已经在我手里了，解释可以慢慢来。`
  }
};

const openingOptions: DialogueResult["options"] = [
  { id: "gift_ask_use", text: "你打算怎么用？", playerLine: "你打算怎么用？", intent: "追问具体用途" },
  { id: "gift_explain", text: "就是想送给你。", playerLine: "就是想送给你。", intent: "说明赠礼心意" },
  { id: "gift_silence", text: "收着就好。", playerLine: "收着就好。", intent: "暂不解释动机" }
];

const playerGiftBridges: Record<string, string> = {
  gift_ask_use: "好，我就是有点好奇。",
  gift_explain: "嗯，就是这个意思。",
  gift_silence: "你收着就好。"
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

export function createMockGiftDialogue(
  npc: Npc,
  item: Item,
  selectedOptionId?: string
): DialogueResult {
  const isFollowup = Boolean(selectedOptionId);
  const line = selectedOptionId
    ? followupByNpc[npc.id]?.[selectedOptionId]?.(item) ?? `${npc.name}收好了${item.baseName}，没有继续解释。`
    : openingByNpc[npc.id]?.(item) ?? `${npc.name}收下了${item.baseName}。`;

  return DialogueResultSchema.parse({
    speakerId: npc.id,
    ...(isFollowup
      ? {
          line,
          emotion: npc.emotion,
          continuations: [{
            speakerId: demoBootstrap.player.id,
            line: playerGiftBridges[selectedOptionId!] ?? "我知道了。",
            emotion: "回应"
          }]
        }
      : dialogueBeats(line, npc.emotion)),
    options: isFollowup ? [] : openingOptions,
    debug: {
      provider: "mock",
      decision: isFollowup
        ? "根据玩家对赠送动机的表达生成一次礼物后续回应。"
        : "物品所有权已经转移，围绕礼物性质与玩家动机开始专门对话。",
      usedFacts: [`npc:${npc.id}`, `item:${item.id}`, `owner:${npc.id}`]
    }
  });
}
