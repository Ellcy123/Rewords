import type { ChatRequest } from './contracts.js'

const MIN_SIMILARITY_LENGTH = 8
const REPETITION_THRESHOLD = 0.86

function normalizeReply(value: string): string {
  return Array.from(value.normalize('NFKC').toLowerCase())
    .filter(character => /[\p{L}\p{N}]/u.test(character))
    .join('')
}

function bigramCounts(value: string): Map<string, number> {
  const characters = Array.from(value)
  const counts = new Map<string, number>()
  for (let index = 0; index < characters.length - 1; index += 1) {
    const bigram = `${characters[index]}${characters[index + 1]}`
    counts.set(bigram, (counts.get(bigram) ?? 0) + 1)
  }
  return counts
}

function diceSimilarity(left: string, right: string): number {
  const leftCounts = bigramCounts(left)
  const rightCounts = bigramCounts(right)
  const leftTotal = [...leftCounts.values()].reduce((sum, count) => sum + count, 0)
  const rightTotal = [...rightCounts.values()].reduce((sum, count) => sum + count, 0)
  if (leftTotal === 0 || rightTotal === 0) return 0
  let overlap = 0
  for (const [bigram, leftCount] of leftCounts) {
    overlap += Math.min(leftCount, rightCounts.get(bigram) ?? 0)
  }
  return (2 * overlap) / (leftTotal + rightTotal)
}

export function isRepetitiveReply(
  replyText: string,
  recentMessages: ChatRequest['recentMessages'],
): boolean {
  const candidate = normalizeReply(replyText)
  if (!candidate) return false
  return recentMessages
    .filter(message => message.role === 'assistant')
    .slice(-6)
    .some(message => {
      const previous = normalizeReply(message.text)
      if (candidate === previous) return true
      if (candidate.length < MIN_SIMILARITY_LENGTH || previous.length < MIN_SIMILARITY_LENGTH) return false
      return diceSimilarity(candidate, previous) >= REPETITION_THRESHOLD
    })
}
