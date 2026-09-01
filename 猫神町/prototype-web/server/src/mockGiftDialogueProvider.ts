import {
  DialogueResultSchema,
  demoBootstrap,
  type DialogueResult,
  type Item,
  type Npc
} from "../../packages/shared/src/index.ts";

const openingByNpc: Record<string, (item: Item) => string> = {
  npc_koharu: (item) =>
    `把${item.baseName}给我？好，我先收下。礼物不会自己说明来意，所以我更想知道你为什么选了它。`,
  npc_saya: (item) =>
    `确认，${item.baseName}现在由我保管。这不是失物登记，而是你主动交给我的——两者后续处理不同。`,
  npc_genichi: (item) =>
    `${item.baseName}已经属于我了。很有意思：你交出的究竟是一件东西，还是希望我替你完成的一种解释？`
};

const followupByNpc: Record<string, Record<string, (item: Item) => string>> = {
  npc_koharu: {
    gift_ask_use: (item) => `我会先把${item.baseName}留在身边。等我弄清它为什么来到这里，再决定要不要让别人也看见。`,
    gift_explain: (item) => `“适合”是个很重的说法。那我会认真对待${item.baseName}，也认真记住是你这样判断我的。`,
    gift_silence: (item) => `不解释也可以。${item.baseName}发出的声音、气味或者样子，总会替你漏出一点答案。`
  },
  npc_saya: {
    gift_ask_use: (item) => `先记录，再判断用途。${item.baseName}不会因为成为礼物就失去原来的性质。`,
    gift_explain: (item) => `适不适合需要时间验证。我会保留${item.baseName}，也会保留你今天说过的理由。`,
    gift_silence: (item) => `可以不说明。记录只写“主动赠与”，不会替你补上动机。`
  },
  npc_genichi: {
    gift_ask_use: (item) => `我会把${item.baseName}放在一个能被人误解的位置。真正有价值的用途，往往从误解开始。`,
    gift_explain: (item) => `你觉得它适合我，已经比${item.baseName}本身更像一件礼物了。我会好好使用这份判断。`,
    gift_silence: (item) => `沉默会把解释权送给收礼的人。放心，我一向不浪费别人交出来的权力。`
  }
};

const openingOptions: DialogueResult["options"] = [
  { id: "gift_ask_use", text: "你会怎么处理？", playerLine: "东西已经给你了。我只是想知道，你准备怎么处理它？", intent: "询问处理" },
  { id: "gift_explain", text: "我只是想给你。", playerLine: "没有别的理由。我只是看见它的时候，觉得应该把它给你。", intent: "说明用意" },
  { id: "gift_silence", text: "……", playerLine: "……你收下就好，我现在不想解释。", intent: "拒绝解释" }
];

const playerGiftBridges: Record<string, string> = {
  gift_ask_use: "我问的不是登记流程。我想知道，它会不会改变你接下来要做的事。",
  gift_explain: "你不用现在相信这个理由。东西留在你身边以后，自然会有答案。",
  gift_silence: "……至少现在，它比我的解释更适合留在这里。"
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
