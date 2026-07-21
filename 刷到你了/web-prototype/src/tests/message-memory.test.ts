import { describe, expect, it } from 'vitest'
import { applyMemoryCandidates, applyOpenLoopUpdates } from '../messages/memory'

const userMessage = {
  id: 'user-1',
  role: 'user' as const,
  text: '你先核对，我等你。',
  createdAt: 10,
}

describe('structured Yanxin memory', () => {
  it('stores source text separately from Yanxin interpretation and deduplicates the source', () => {
    const candidate = {
      type: 'promise' as const,
      sourceMessageId: 'user-1',
      interpretation: '玩家答应等我核对完再判断。',
    }

    const result = applyMemoryCandidates([], [candidate], [userMessage], 20)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      sourceMessageId: 'user-1',
      sourceText: '你先核对，我等你。',
      interpretation: '玩家答应等我核对完再判断。',
      createdAt: 20,
      lastReferencedAt: 20,
      active: true,
    })
    expect(applyMemoryCandidates(result, [candidate], [userMessage], 30)).toHaveLength(1)
  })

  it('rejects memory candidates whose source message is absent or not from the player', () => {
    expect(applyMemoryCandidates([], [{
      type: 'shared_joke', sourceMessageId: 'missing', interpretation: '不存在的玩笑',
    }], [], 20)).toEqual([])
    expect(applyMemoryCandidates([], [{
      type: 'shared_joke', sourceMessageId: 'yanxin-1', interpretation: '不是玩家说的话',
    }], [{ ...userMessage, id: 'yanxin-1', role: 'assistant' }], 20)).toEqual([])
  })

  it('bounds interpretations, summaries, active memories, and open loops', () => {
    const messages = Array.from({ length: 31 }, (_, index) => ({
      ...userMessage,
      id: `user-${index}`,
      text: `消息 ${index}`,
    }))
    const longText = `${'🪩'.repeat(121)}尾`
    const memories = applyMemoryCandidates([], messages.map(message => ({
      type: 'preference' as const,
      sourceMessageId: message.id,
      interpretation: longText,
    })), messages, 20)
    const loops = applyOpenLoopUpdates([], messages.slice(0, 11).map(message => ({
      kind: 'topic' as const,
      sourceMessageId: message.id,
      summary: longText,
      status: 'open' as const,
    })), messages, 20)

    expect(memories).toHaveLength(30)
    expect(memories.every(memory => Array.from(memory.interpretation).length <= 120)).toBe(true)
    expect(loops).toHaveLength(10)
    expect(loops.every(loop => Array.from(loop.summary).length <= 120)).toBe(true)
  })

  it('updates the matching open loop and rejects a missing source', () => {
    const opened = applyOpenLoopUpdates([], [{
      kind: 'report', sourceMessageId: 'user-1', summary: '等核对结果', status: 'open',
    }], [userMessage], 20)
    const closed = applyOpenLoopUpdates(opened, [{
      kind: 'report', sourceMessageId: 'user-1', summary: '已经收到核对结果', status: 'closed',
    }, {
      kind: 'conflict', sourceMessageId: 'missing', summary: '不应保存', status: 'open',
    }], [userMessage], 30)

    expect(closed).toEqual([{ ...opened[0], summary: '已经收到核对结果', status: 'closed' }])
  })
})
