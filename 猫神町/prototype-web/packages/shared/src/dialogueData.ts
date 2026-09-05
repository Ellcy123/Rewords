// Legacy lookup is intentionally empty: selected wording is the only source of player speech.
export const playerLineByOptionId: Record<string, string> = {};

export function resolvePlayerLine(option: { id: string; text: string; playerLine?: string }) {
  return option.playerLine ?? option.text;
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
