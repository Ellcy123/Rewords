import {
  DialogueResultSchema,
  demoBootstrap,
  type DialogueResult,
  type Item,
  type Npc
} from "../../packages/shared/src/index.ts";

const openingByNpc: Record<string, (item: Item) => string> = {
  npc_koharu: (item) =>
    `把${item.baseName}给我？行。我先藏进书包，不让纱夜和九条看见——除非你本来就是想让我拿它查真昼。`,
  npc_saya: (item) =>
    `${item.baseName}现在归我。我会贴上今天的日期，单独封袋；五年前我已经丢过一次原件，不会有第二次。`,
  npc_genichi: (item) =>
    `${item.baseName}归我了。我会把它放到真昼被裁掉的照片前——你送来的东西，当然要出现在你不愿看见的位置。`
};

const followupByNpc: Record<string, Record<string, (item: Item) => string>> = {
  npc_koharu: {
    gift_ask_use: (item) => `我把${item.baseName}带去后殿。真昼的箱子如果能打开，它就是工具；打不开，我明天拿去问纱夜。`,
    gift_explain: (item) => `那就写清楚：${item.baseName}用于调查雨宫真昼。九条以后想拿走，也得连这张标签一起拿。`,
    gift_silence: (item) => `好，我不问。我会把${item.baseName}藏进书包夹层；另外两个人问起，我就说没见过。`
  },
  npc_saya: {
    gift_ask_use: (item) => `我先拍照封袋，再拿${item.baseName}和真昼的票根一起检查。查不到联系，就按普通赠物保管。`,
    gift_explain: (item) => `明白。封条写“用于调查雨宫真昼”，你的姓名和今天时间也写上，免得五年后又没人承认。`,
    gift_silence: (item) => `可以。我只写“朝雾遥要求秘密保管”。如果你反悔，先来找我，别去翻抽屉。`
  },
  npc_genichi: {
    gift_ask_use: (item) => `第七天，我会让${item.baseName}和黑色车票一起入镜。你想拿回去时，照片已经发遍全镇。`,
    gift_explain: (item) => `用于调查真昼？很好。我会在展签上原样写出这句话，再把捐赠人写成朝雾遥。`,
    gift_silence: (item) => `不说更好。我会把${item.baseName}锁进保险柜，和未剪辑原片放在同一层。`
  }
};

const openingOptions: DialogueResult["options"] = [
  { id: "gift_ask_use", text: "你拿它做什么？", playerLine: "东西已经给你了。现在告诉我，你准备拿它做什么？", intent: "追问具体用途" },
  { id: "gift_explain", text: "用它查真昼。", playerLine: "我把它给你，是因为它可能帮我们查到雨宫真昼。", intent: "说明调查目的" },
  { id: "gift_silence", text: "别问，先收好。", playerLine: "别问理由，先把它藏好。别让另外两个人看见。", intent: "要求秘密保管" }
];

const playerGiftBridges: Record<string, string> = {
  gift_ask_use: "用途说清楚。之后它换地方，也要留下记录。",
  gift_explain: "先查真昼。查不到，再当普通礼物处理。",
  gift_silence: "现在知道的人越少越好。你也别主动提起。"
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
