import { describe, expect, it, vi } from 'vitest'
import { buildAllowedContext } from '../allowedContext.js'
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
  allowedMemoryIds: ['yanxin_evidence_method_helped_bride'],
  postEnding: false,
}

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

  it('maps only server-owned facts, including the shared evidence memory', async () => {
    const context = buildAllowedContext(ChatRequestSchema.parse(validRequest))
    expect(context.character).toEqual({ id: 'yanxin', name: '炎鑫' })
    expect(context.task).toEqual(expect.objectContaining({ id: 'YANXIN_UNCUT_EVIDENCE' }))
    expect(context.relationshipProduct).toEqual({ id: 'recorder', name: '带摄像头的录音笔' })
    expect(context.memories).toEqual([expect.objectContaining({ id: 'yanxin_evidence_method_helped_bride' })])
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
