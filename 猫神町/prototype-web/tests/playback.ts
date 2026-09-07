import { dialoguePlaybackFinished } from "../packages/shared/src/index.ts";
import type { GameService } from "../server/src/gameService.ts";

export async function showSpeech(game: GameService) {
  while (game.getState().dialogueNarrationIndex !== null) await game.nextDialogueBeat(game.getState().revision);
}
export async function nextSpeech(game: GameService) {
  await showSpeech(game);
  await game.nextDialogueBeat(game.getState().revision);
  await showSpeech(game);
}
export async function drainPlayback(game: GameService) {
  for (let i = 0; i < 150 && game.getState().currentDialogue && !dialoguePlaybackFinished(game.getState()); i++) {
    await game.nextDialogueBeat(game.getState().revision);
  }
  if (game.getState().currentDialogue && !dialoguePlaybackFinished(game.getState())) throw new Error("playback did not finish");
}
