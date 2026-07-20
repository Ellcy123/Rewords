import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestYanxinReply, type ChatRequest } from '../messages/aiClient'

const baseRequest: ChatRequest = {
  characterId: 'yanxin',
  userText: '我觉得可以找完整录像',
  taskStage: 'invited',
  momentChoice: 'support',
  recentMessages: [],
  allowedMemoryIds: [],
  postEnding: false,
}

afterEach(() => {
  vi.useRealTimers()
})

describe('requestYanxinReply', () => {
  it('posts a bounded request and returns a validated response', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.userText).toHaveLength(300)
      expect(body.recentMessages).toHaveLength(12)
      expect(body.recentMessages[0].text).toBe('第 3 条')
      return new Response(JSON.stringify({
        replyText: '行，我去把完整时间戳翻出来。',
        taskSignals: ['offer_evidence_plan'],
        tone: 'serious',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    const result = await requestYanxinReply({
      ...baseRequest,
      userText: '你'.repeat(301),
      recentMessages: Array.from({ length: 14 }, (_, index) => ({ role: 'user' as const, text: `第 ${index + 1} 条` })),
    }, fetcher)

    expect(result).toEqual({ ok: true, data: {
      replyText: '行，我去把完整时间戳翻出来。',
      taskSignals: ['offer_evidence_plan'],
      tone: 'serious',
    } })
    expect(fetcher).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('returns timeout after 8 seconds instead of throwing', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn(() => new Promise<Response>(() => {}))

    let outcome: Awaited<ReturnType<typeof requestYanxinReply>> | undefined
    void requestYanxinReply(baseRequest, fetcher).then(result => { outcome = result })
    await vi.advanceTimersByTimeAsync(8_000)

    expect(outcome).toEqual({ ok: false, reason: 'timeout' })
  })

  it.each([
    ['non-2xx', async () => new Response('{}', { status: 503 }), 'http'],
    ['invalid JSON', async () => new Response('{', { status: 200 }), 'invalid'],
    ['unknown signal', async () => new Response(JSON.stringify({ replyText: '收到', taskSignals: ['unlock_now'], tone: 'warm' }), { status: 200 }), 'invalid'],
    ['an extra response field', async () => new Response(JSON.stringify({ replyText: '收到', taskSignals: [], tone: 'warm', unlockNodeId: 'E201' }), { status: 200 }), 'invalid'],
  ])('returns a typed failure for %s', async (_name, fetcher, reason) => {
    await expect(requestYanxinReply(baseRequest, fetcher)).resolves.toEqual({ ok: false, reason })
  })
})
