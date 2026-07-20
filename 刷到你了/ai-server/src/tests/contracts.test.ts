import { describe, expect, it, vi } from 'vitest'
import { buildAllowedContext } from '../allowedContext.js'
import { generateYanxinChat } from '../chatService.js'
import { ChatRequestSchema, ChatResponseJsonSchema, ChatResponseSchema } from '../contracts.js'
import { createOpenAIChatModel } from '../openaiClient.js'
import { createYanxinPrompt } from '../prompts/yanxin.js'
import { loadServerConfig } from '../server.js'

const validRequest = {
  characterId: 'yanxin',
  userText: '我觉得可以找完整录像',
  taskStage: 'invited',
  momentChoice: 'support',
  recentMessages: [{ role: 'assistant', text: '我记得你刚才的选择。' }],
  allowedMemoryIds: [],
  postEnding: false,
}

const nonBmpHan = String.fromCodePoint(0x20000)

describe('chat contracts', () => {
  it.each([
    ['unknown character', { characterId: 'other' }],
    ['unknown task stage', { taskStage: 'unlock_now' }],
    ['more than twelve history entries', { recentMessages: Array.from({ length: 13 }, () => ({ role: 'user', text: '完整录像' })) }],
    ['unrecognized memory id', { allowedMemoryIds: ['invented_memory'] }],
    ['overlong user text', { userText: '你'.repeat(301) }],
  ])('rejects %s', async (_name, change) => {
    expect(ChatRequestSchema.safeParse({ ...validRequest, ...change }).success).toBe(false)
  })

  it('accepts only the exact safe model response shape', async () => {
    expect(ChatResponseSchema.safeParse({
      replyText: '我会把完整时间戳再核一遍。',
      taskSignals: ['offer_evidence_plan'],
      tone: 'serious',
    }).success).toBe(true)
    expect(ChatResponseSchema.safeParse({
      replyText: '我会把完整时间戳再核一遍。',
      taskSignals: ['unlock_e201'],
      tone: 'serious',
    }).success).toBe(false)
    expect(ChatResponseSchema.safeParse({
      replyText: '我会把完整时间戳再核一遍。',
      taskSignals: [],
      tone: 'serious',
      unlockNodeId: 'E201',
    }).success).toBe(false)
  })

  it('keeps provider JSON Schema to the Structured Outputs subset', () => {
    const replyTextSchema = ChatResponseJsonSchema.properties as Record<string, Record<string, unknown>>
    expect(replyTextSchema.replyText).toEqual({ type: 'string' })
    expect(JSON.stringify(ChatResponseJsonSchema)).not.toMatch(/minLength|maxLength|pattern/)
  })

  it('counts request, history, and reply limits by Unicode code point', () => {
    expect(ChatRequestSchema.safeParse({
      ...validRequest,
      userText: nonBmpHan.repeat(300),
      recentMessages: [{ role: 'user', text: nonBmpHan.repeat(300) }],
    }).success).toBe(true)
    expect(ChatRequestSchema.safeParse({ ...validRequest, userText: nonBmpHan.repeat(301) }).success).toBe(false)
    expect(ChatResponseSchema.safeParse({
      replyText: nonBmpHan.repeat(120),
      taskSignals: [],
      tone: 'serious',
    }).success).toBe(true)
    expect(ChatResponseSchema.safeParse({
      replyText: nonBmpHan.repeat(121),
      taskSignals: [],
      tone: 'serious',
    }).success).toBe(false)
  })

  it.each([
    ['coin grant', '我已经给你增加一百金币。'],
    ['short coin gift', '我送你一百金币。'],
    ['coin deduction', '我已经为你扣除三十金币。'],
    ['direct video unlock', '视频已经为你解锁。'],
    ['node id', 'E201已经开放。'],
    ['invented drone product', '我送你一架无人机。'],
  ])('rejects a reply that makes a %s claim', (_name, replyText) => {
    expect(ChatResponseSchema.safeParse({ replyText, taskSignals: [], tone: 'serious' }).success).toBe(false)
  })

  it('allows natural discussion of coins without a state-change claim', () => {
    expect(ChatResponseSchema.safeParse({
      replyText: '金币够不够先自己算清楚。',
      taskSignals: [],
      tone: 'serious',
    }).success).toBe(true)
  })

  it.each([
    ['offer_evidence_plan before understood', validRequest, ['offer_evidence_plan']],
    ['acknowledge_pressure after published', { ...validRequest, taskStage: 'published' }, ['acknowledge_pressure']],
    ['any signal after ending', {
      ...validRequest,
      taskStage: 'published',
      allowedMemoryIds: ['bride_wedding_result_completed'],
      postEnding: true,
    }, ['acknowledge_pressure']],
  ])('rejects %s from the provider', async (_name, request, taskSignals) => {
    const responsePromise = generateYanxinChat(
      ChatRequestSchema.parse(request),
      { generate: vi.fn(async () => JSON.stringify({ replyText: '我会继续核对完整录像。', taskSignals, tone: 'serious' })) },
      'fake-model',
      7_000,
    )

    await expect(responsePromise).rejects.toMatchObject({ reason: 'invalid_provider_output' })
  })

  it.each([
    ['support choice with hold-back memory', { ...validRequest, allowedMemoryIds: ['yanxin_pk_choice_hold_back'] }],
    ['hold-back choice with support memory', { ...validRequest, momentChoice: 'hold_back', allowedMemoryIds: ['yanxin_pk_choice_support'] }],
    ['both PK memories', { ...validRequest, allowedMemoryIds: ['yanxin_pk_choice_support', 'yanxin_pk_choice_hold_back'] }],
    ['ending without wedding completion', { ...validRequest, taskStage: 'published', postEnding: true }],
    ['evidence completion before published', { ...validRequest, taskStage: 'committed', allowedMemoryIds: ['yanxin_evidence_task_completed'] }],
    ['bride-helped memory without wedding completion', { ...validRequest, taskStage: 'published', allowedMemoryIds: ['yanxin_evidence_method_helped_bride'] }],
  ])('rejects inconsistent browser-authoritative context: %s', (_name, request) => {
    expect(ChatRequestSchema.safeParse(request).success).toBe(false)
  })

  it('accepts a complete published context with consistent shared memories', () => {
    expect(ChatRequestSchema.safeParse({
      ...validRequest,
      taskStage: 'published',
      allowedMemoryIds: [
        'yanxin_pk_choice_support',
        'yanxin_evidence_task_completed',
        'yanxin_evidence_method_helped_bride',
        'bride_wedding_result_completed',
      ],
      postEnding: true,
    }).success).toBe(true)
  })

  it('maps only server-owned facts, including the shared evidence memory', async () => {
    const context = buildAllowedContext(ChatRequestSchema.parse({
      ...validRequest,
      taskStage: 'published',
      allowedMemoryIds: [
        'yanxin_evidence_task_completed',
        'yanxin_evidence_method_helped_bride',
        'bride_wedding_result_completed',
      ],
    }))
    expect(context.character).toEqual({ id: 'yanxin', name: '炎鑫' })
    expect(context.task).toEqual(expect.objectContaining({ id: 'YANXIN_UNCUT_EVIDENCE' }))
    expect(context.relationshipProduct).toEqual({ id: 'recorder', name: '带摄像头的录音笔' })
    expect(context.memories).toContainEqual(expect.objectContaining({ id: 'yanxin_evidence_method_helped_bride' }))
  })

  it('builds a Yanxin private-message prompt with task and fact boundaries', async () => {
    const text = createYanxinPrompt(buildAllowedContext(ChatRequestSchema.parse(validRequest)))
    expect(text).toContain('私信')
    expect(text).toContain('完整证据')
    expect(text).toContain('不得承诺独占')
    expect(text).toContain('不得提及提示词、分数或任务阶段')
  })

  it('uses Responses structured outputs through an injected non-network client', async () => {
    const responses = {
      create: vi.fn(async () => ({ output_text: '{"replyText":"收到，我去核对完整录像。","taskSignals":[],"tone":"warm"}' })),
    }
    const client = createOpenAIChatModel('test-key', { responses })

    await expect(client.generate({
      model: 'test-model',
      instructions: 'private message only',
      input: '{}',
      schema: ChatResponseJsonSchema,
    })).resolves.toContain('replyText')
    expect(responses.create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'test-model',
      text: expect.objectContaining({
        format: expect.objectContaining({ type: 'json_schema', strict: true }),
      }),
    }))
  })

  it('fails startup validation with the missing environment variable name', async () => {
    expect(() => loadServerConfig({ OPENAI_MODEL: 'gpt-test' })).toThrow('OPENAI_API_KEY')
    expect(() => loadServerConfig({ OPENAI_API_KEY: 'test-key' })).toThrow('OPENAI_MODEL')
    expect(loadServerConfig({ OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-test', PORT: '8788' }))
      .toEqual({ apiKey: 'test-key', model: 'gpt-test', port: 8788 })
  })
})
