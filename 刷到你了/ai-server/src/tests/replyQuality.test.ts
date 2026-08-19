import { describe, expect, it } from 'vitest'
import { isRepetitiveReply } from '../replyQuality.js'

const history = (text: string) => [
  { role: 'user' as const, text: '我刚才问了一个问题。' },
  { role: 'assistant' as const, text },
]

describe('Yanxin reply quality', () => {
  it('rejects exact and punctuation-only repetition', () => {
    expect(isRepetitiveReply('我会把前后说完。', history('我会把前后说完。'))).toBe(true)
    expect(isRepetitiveReply('我会把前后说完！', history('我会把前后说完。'))).toBe(true)
    expect(isRepetitiveReply('好。', history('好。'))).toBe(true)
  })

  it('rejects a highly similar restatement of a recent assistant reply', () => {
    expect(isRepetitiveReply(
      '我不是非要你替我出头，只是想把前后说清楚。',
      history('我不是非要你替我出头，就是想把前后说清楚。'),
    )).toBe(true)
  })

  it('allows a genuinely new response and ignores user-message similarity', () => {
    expect(isRepetitiveReply('先回答你刚才的问题。', history('我会把前后说完。'))).toBe(false)
    expect(isRepetitiveReply('我刚才问了一个问题。', history('完全不同的回答。'))).toBe(false)
  })
})
