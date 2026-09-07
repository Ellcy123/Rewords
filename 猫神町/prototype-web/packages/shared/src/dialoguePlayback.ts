import type { GameState } from "./contracts.ts";

// Only split an explicit speaker label, never guess whether ordinary prose is dialogue.
export function separateDialogueText(line: string, stageDirection = "", speakerName = "") {
  if (speakerName) {
    const escaped = speakerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`^([^“”‘’「」『』"'\n]*?)${escaped}[：:]\\s*(.+)$`, "s").exec(line);
    if (match) return { line: match[2].trim(), stageDirection: match[1].trim() || stageDirection.trim() };
  }
  return { line: line.trim(), stageDirection: stageDirection.trim() };
}

export function narrationSentences(text = ""): string[] {
  return (text.match(/[^。！？!?\n]+[。！？!?]?|[^\s]/g) ?? []).map(s => s.trim()).filter(Boolean);
}

export function dialoguePlaybackFinished(state: Pick<GameState, "currentDialogue" | "lastPlayerChoice" | "dialogueBeatIndex" | "dialogueNarrationIndex">) {
  return !!state.currentDialogue && state.dialogueNarrationIndex === null &&
    state.dialogueBeatIndex >= state.currentDialogue.continuations.length + Number(!!state.lastPlayerChoice);
}
