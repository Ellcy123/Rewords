import type { HeartKind } from "./contracts.ts";

// Day-one trial catalogue, not the final card roster or acquisition economy.
export const heartKinds: HeartKind[] = ["fear", "sympathy", "affection"];
export const heartCatalog: Record<HeartKind, { name: string; description: string; expression: string }> = {
  fear: { name: "恐惧", description: "让遥显露不安与迟疑。", expression: "遥自己带着害怕、迟疑的态度接住当前话题。可以通过措辞、动作或犹豫体现，不必直说‘我害怕’。例如想靠近却迟疑、想回答却声音发颤；仅仅温柔安慰‘你害怕是正常的’是在同情对方，不是遥的恐惧。让这种差异可感知，但不要为害怕编造新威胁，也不是对NPC施加恐惧。" },
  sympathy: { name: "同情", description: "让遥体谅对方，传达关切。", expression: "遥体谅对方已经流露的处境，传达关切，可以自然追问、安慰、提出帮助或作出贴合人物的回应，再顺着交流。" },
  affection: { name: "爱意", description: "让遥带着亲近与关爱说话。", expression: "遥温柔、亲近地表达关爱，可以自然示好、关心、询问、许诺或表达感情；根据人物关系和处境决定尺度，允许意料之外但有依据的进展。" }
};
