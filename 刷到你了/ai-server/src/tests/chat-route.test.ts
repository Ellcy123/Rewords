import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.js'
import { generateYanxinChat, ProviderUnavailableError } from '../chatService.js'
import { ChatRequestSchema } from '../contracts.js'

const validRequest = {
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

const validModelResponse = {
  replyText: '我会把完整时间戳再核一遍。',
  tone: 'serious',
  characterIntents: ['fan_maintenance'],
  taskEvidence: [],
  relationshipEvidence: [],
  memoryCandidates: [],
  openLoopUpdates: [],
}

const validModelOutput = JSON.stringify(validModelResponse)

afterEach(() => vi.useRealTimers())

describe('POST /api/chat', () => {
  it('returns a Zod-revalidated response from an injected fake model', async () => {
    const modelClient = { generate: vi.fn(async () => validModelOutput) }
    const app = createApp({ modelClient, model: 'fake-model' })
    const response = await request(app).post('/api/chat').send(validRequest)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(JSON.parse(validModelOutput))
    expect(modelClient.generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'fake-model' }))
  })

  it('ends an unresolved fake provider after seven virtual seconds', async () => {
    vi.useFakeTimers()
    const responsePromise = generateYanxinChat(
      ChatRequestSchema.parse(validRequest),
      { generate: vi.fn(() => new Promise(() => {})) },
      'fake-model',
      7_000,
    )
    const timeoutAssertion = expect(responsePromise).rejects.toMatchObject({ reason: 'provider_timeout' })
    await vi.advanceTimersByTimeAsync(7_000)

    await timeoutAssertion
  })

  it('returns 503 when the injected provider reports a timeout', async () => {
    const app = createApp({
      modelClient: { generate: vi.fn(async () => { throw new ProviderUnavailableError('provider_timeout') }) },
      model: 'fake-model',
    })

    await expect(request(app).post('/api/chat').send(validRequest))
      .resolves.toMatchObject({ status: 503, body: { code: 'AI_UNAVAILABLE' } })
  })

  it('returns 503 when the injected provider errors', async () => {
    const app = createApp({
      modelClient: { generate: vi.fn(async () => { throw new Error('provider unavailable') }) },
      model: 'fake-model',
    })

    await expect(request(app).post('/api/chat').send(validRequest))
      .resolves.toMatchObject({ status: 503, body: { code: 'AI_UNAVAILABLE' } })
  })

  it.each([
    ['malformed JSON', '{'],
    ['an invalid reply', JSON.stringify({ ...validModelResponse, replyText: 'English reply' })],
    ['an invalid enum', JSON.stringify({ ...validModelResponse, tone: 'invented' })],
    ['an AI-authored score', JSON.stringify({ ...validModelResponse, relationshipScoreDelta: 3 })],
    ['ungrounded state-changing evidence', JSON.stringify({
      ...validModelResponse,
      relationshipEvidence: [{ kind: 'showed_specific_care', sourceMessageId: 'assistant-history' }],
    })],
  ])('returns 503 invalid_provider_output when the provider emits %s', async (_name, providerOutput) => {
    const records: Array<{ fallbackReason: string | null }> = []
    const app = createApp({
      modelClient: { generate: vi.fn(async () => providerOutput) },
      model: 'fake-model',
      logger: record => records.push(record),
    })

    const response = await request(app).post('/api/chat').send(validRequest)

    expect(response).toMatchObject({ status: 503, body: { code: 'AI_UNAVAILABLE' } })
    expect(records).toEqual([expect.objectContaining({ fallbackReason: 'invalid_provider_output' })])
  })

  it('rate limits the twenty-first request from one IP in a minute', async () => {
    const app = createApp({
      modelClient: { generate: vi.fn(async () => validModelOutput) },
      model: 'fake-model',
    })
    for (let index = 0; index < 20; index += 1) {
      await expect(request(app).post('/api/chat').send(validRequest)).resolves.toMatchObject({ status: 200 })
    }

    await expect(request(app).post('/api/chat').send(validRequest)).resolves.toMatchObject({ status: 429 })
  })

  it('writes only safe request metadata to its injected logger', async () => {
    const records: unknown[] = []
    const secret = 'secret-not-for-logs'
    const app = createApp({
      modelClient: { generate: vi.fn(async () => { throw new Error(secret) }) },
      model: 'fake-model',
      logger: (record: unknown) => records.push(record),
    })

    await request(app).post('/api/chat').send({ ...validRequest, userText: '这段文字不能进入日志' })

    expect(records).toHaveLength(1)
    expect(records[0]).toEqual(expect.objectContaining({ status: 503, fallbackReason: 'provider_error' }))
    expect(Object.keys(records[0] as object).sort()).toEqual(['fallbackReason', 'latencyMs', 'requestId', 'status'])
    expect(JSON.stringify(records)).not.toContain(secret)
    expect(JSON.stringify(records)).not.toContain('这段文字不能进入日志')
  })
})
