import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestYanxinReply, type ChatRequest } from '../messages/aiClient'

const baseRequest: ChatRequest = {
  characterId: 'yanxin',
  currentMessageId: 'user-current',
  userText: '我觉得可以找完整录像',
  taskStage: 'invited',
  momentChoice: 'support',
  recentMessages: [],
  allowedMemoryIds: [],
  postEnding: false,
  personaSnapshot: {
    relationshipIdentity: 'new_viewer',
    dimensions: { closeness: 0, trust: 0, respect: 0, suspicion: 0, boundaryPressure: 0 },
    shortTerm: { emotion: 'guarded', currentActivity: 'post_pk' },
  },
  memories: [],
  openLoops: [],
}

const validResponse = {
  replyText: '收到，我会继续核对。',
  tone: 'serious',
  characterIntents: ['fan_maintenance'],
  taskEvidence: [],
  relationshipEvidence: [],
  memoryCandidates: [],
  openLoopUpdates: [],
}

afterEach(() => {
  vi.useRealTimers()
})

describe('requestYanxinReply', () => {
  it('posts a bounded request and returns a validated response', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.userText).toHaveLength(300)
      expect(body.currentMessageId).toBe('user-current')
      expect(body.personaSnapshot.dimensions).toEqual({
        closeness: 5,
        trust: -5,
        respect: 0,
        suspicion: 1,
        boundaryPressure: -1,
      })
      expect(body.recentMessages).toHaveLength(12)
      expect(body.recentMessages[0].text).toBe('第 3 条')
      expect(body.memories).toHaveLength(10)
      expect(body.openLoops).toHaveLength(5)
      return new Response(JSON.stringify({
        replyText: '行，我去把完整时间戳翻出来。',
        tone: 'serious',
        characterIntents: ['advance_task'],
        taskEvidence: [{ kind: 'accepted_complete_evidence_plan', sourceMessageId: 'user-current' }],
        relationshipEvidence: [],
        memoryCandidates: [],
        openLoopUpdates: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    const result = await requestYanxinReply({
      ...baseRequest,
      userText: '你'.repeat(301),
      personaSnapshot: {
        ...baseRequest.personaSnapshot,
        dimensions: { closeness: 99, trust: -99, respect: 0, suspicion: 1, boundaryPressure: -1 },
      },
      recentMessages: Array.from({ length: 14 }, (_, index) => ({ role: 'user' as const, text: `第 ${index + 1} 条` })),
      memories: Array.from({ length: 12 }, (_, index) => ({
        id: `memory-${index}`,
        type: 'promise' as const,
        sourceMessageId: `user-${index}`,
        sourceText: '我等你核对。',
        interpretation: '玩家答应等待核对。',
      })),
      openLoops: Array.from({ length: 7 }, (_, index) => ({
        id: `loop-${index}`,
        kind: 'report' as const,
        summary: '等待核对结果',
        sourceMessageId: `user-${index}`,
        status: 'open' as const,
      })),
    }, fetcher)

    expect(result).toEqual({ ok: true, data: {
      replyText: '行，我去把完整时间戳翻出来。',
      tone: 'serious',
      characterIntents: ['advance_task'],
      taskEvidence: [{ kind: 'accepted_complete_evidence_plan', sourceMessageId: 'user-current' }],
      relationshipEvidence: [],
      memoryCandidates: [],
      openLoopUpdates: [],
    } })
    expect(fetcher).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('filters, deduplicates, and bounds allowed game-event memories', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.allowedMemoryIds).toEqual([
        'yanxin_pk_choice_support',
        'yanxin_pk_choice_hold_back',
        'yanxin_evidence_task_completed',
        'yanxin_evidence_method_helped_bride',
        'bride_wedding_result_completed',
      ])
      return new Response(JSON.stringify(validResponse), { status: 200 })
    })
    const request = {
      ...baseRequest,
      allowedMemoryIds: [
        'invalid-memory',
        'yanxin_pk_choice_support',
        'yanxin_pk_choice_support',
        'yanxin_pk_choice_hold_back',
        'yanxin_evidence_task_completed',
        'yanxin_evidence_method_helped_bride',
        'bride_wedding_result_completed',
        'unexpected-sixth-value',
      ],
    } as unknown as ChatRequest

    await expect(requestYanxinReply(request, fetcher)).resolves.toMatchObject({ ok: true })
  })

  it('bounds each memory and open-loop identifier and text field by Unicode code point', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(Array.from(body.memories[0].id)).toHaveLength(120)
      expect(Array.from(body.memories[0].sourceMessageId)).toHaveLength(120)
      expect(Array.from(body.memories[0].sourceText)).toHaveLength(300)
      expect(Array.from(body.memories[0].interpretation)).toHaveLength(120)
      expect(Array.from(body.openLoops[0].id)).toHaveLength(120)
      expect(Array.from(body.openLoops[0].sourceMessageId)).toHaveLength(120)
      expect(Array.from(body.openLoops[0].summary)).toHaveLength(120)
      return new Response(JSON.stringify(validResponse), { status: 200 })
    })
    const nonBmpHan = String.fromCodePoint(0x20000)

    await expect(requestYanxinReply({
      ...baseRequest,
      memories: [{
        id: nonBmpHan.repeat(121),
        type: 'promise',
        sourceMessageId: nonBmpHan.repeat(121),
        sourceText: nonBmpHan.repeat(301),
        interpretation: nonBmpHan.repeat(121),
      }],
      openLoops: [{
        id: nonBmpHan.repeat(121),
        kind: 'report',
        summary: nonBmpHan.repeat(121),
        sourceMessageId: nonBmpHan.repeat(121),
        status: 'open',
      }],
    }, fetcher)).resolves.toMatchObject({ ok: true })
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
    ['unknown intent', async () => new Response(JSON.stringify({ ...validResponse, characterIntents: ['unlock_now'] }), { status: 200 }), 'invalid'],
    ['an extra response field', async () => new Response(JSON.stringify({ ...validResponse, unlockNodeId: 'E201' }), { status: 200 }), 'invalid'],
    ['a nested extra response field', async () => new Response(JSON.stringify({
      ...validResponse,
      memoryCandidates: [{ type: 'promise', sourceMessageId: 'user-current', interpretation: '玩家答应等待核对。', scoreDelta: 1 }],
    }), { status: 200 }), 'invalid'],
    ['too many open-loop updates', async () => new Response(JSON.stringify({
      ...validResponse,
      openLoopUpdates: Array.from({ length: 3 }, () => ({ kind: 'report', summary: '等待结果', sourceMessageId: 'user-current', status: 'open' })),
    }), { status: 200 }), 'invalid'],
    ['a non-Chinese reply', async () => new Response(JSON.stringify({ ...validResponse, replyText: 'hello' }), { status: 200 }), 'invalid'],
  ])('returns a typed failure for %s', async (_name, fetcher, reason) => {
    await expect(requestYanxinReply(baseRequest, fetcher)).resolves.toEqual({ ok: false, reason })
  })
})
