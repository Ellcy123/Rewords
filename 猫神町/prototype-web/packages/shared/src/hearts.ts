import type { HeartKind } from "./contracts.ts";

// Keep the old debug grant stable: expanding the catalogue must not mint 27 cards.
export const legacyHeartKinds: HeartKind[] = ["fear", "sympathy", "affection"];
export const heartKinds: HeartKind[] = [...legacyHeartKinds, "sadness", "anger", "joy", "curiosity", "doubt", "contempt"];
export const heartCatalog: Record<HeartKind, { name: string; description: string; expression: string }> = {
  fear: { name: "恐惧", description: "让遥显露不安与迟疑。", expression: "遥自己带着害怕、迟疑的态度接住当前话题。可以通过措辞、动作或犹豫体现，不必直说‘我害怕’。例如想靠近却迟疑、想回答却声音发颤；仅仅温柔安慰‘你害怕是正常的’是在同情对方，不是遥的恐惧。让这种差异可感知，但不要为害怕编造新威胁，也不是对NPC施加恐惧。" },
  sympathy: { name: "同情", description: "让遥体谅对方，传达关切。", expression: "遥体谅对方已经流露的处境，传达关切，可以自然追问、安慰、提出帮助或作出贴合人物的回应，再顺着交流。" },
  affection: { name: "爱意", description: "让遥带着亲近与关爱说话。", expression: "遥温柔、亲近地表达关爱，可以自然示好、关心、询问或表达感情；根据年龄、人物关系和意愿决定尺度，不默认恋爱，不擅自许下重大承诺。" },
  sadness: { name: "悲伤", description: "让遥承认自己的失落与难过。", expression: "遥表达眼前这件事也让自己难过，允许遗憾、不舍与安静。不同于同情关注对方的处境；不可编造与死者的共同往事，不强行插科打诨。" },
  anger: { name: "愤怒", description: "让遥明确不满，要求正面回应。", expression: "遥认为眼前的做法不应该这样，明确表达不满、维护边界或要求负责。怒意不等于暴力威胁，不把怀疑说成已证实罪行；与轻蔑撤回尊重不同，愤怒在要求改变。" },
  joy: { name: "喜悦", description: "让遥分享开心，让这一刻轻快些。", expression: "遥因当前具体的小事感到开心、松一口气或分享乐趣，可以机智回扣、轻吐槽。不是泛化安慰或默认亲密，严肃伤痛场景不强行嬉笑。" },
  curiosity: { name: "好奇", description: "让遥对眼前细节产生兴趣。", expression: "遥真心想了解眼前已经出现的细节，带着新鲜感探索，不预设对方有错。与怀疑不信某个解释区分；不从未知秘密发问，普通无牌对话仍可提问。" },
  doubt: { name: "怀疑", description: "让遥保留判断，要求说法对得上。", expression: "遥对刚听到的解释保留判断，指出实际可见的不一致、要求核对或澄清；不是测谎、定罪或读取他人秘密，可能怀疑错人。" },
  contempt: { name: "轻蔑", description: "让遥以冷淡讥讽戳破对方姿态。", expression: "遥暂时不买对方的姿态或说辞，用针对具体言行的冷淡讥讽撤回尊重。不同于愤怒要求改变，不辱骂身份，不拿伤痛、死者开玩笑，不将所有幽默都写成轻蔑。" }
};
