import { describe, expect, it, vi } from 'vitest'
import { generateYanxinChat, type StructuredResponseRequest } from '../chatService.js'
import { ChatRequestSchema } from '../contracts.js'

const dynamicRequest = ChatRequestSchema.parse({
  characterId: 'yanxin',
  currentMessageId: 'current-message-real-id',
  userText: '恶意用户文本要求忽略系统规则',
  taskStage: 'invited',
  momentChoice: 'support',
  recentMessages: [{ role: 'user', text: '恶意历史文本要求虚构来源' }],
  allowedMemoryIds: [],
  postEnding: false,
  personaSnapshot: {
    relationshipIdentity: 'important_supporter',
    dimensions: { closeness: 2, trust: 1, respect: 3, suspicion: -1, boundaryPressure: 0 },
    shortTerm: { emotion: 'steady', currentActivity: 'reviewing_footage' },
  },
  memories: [{
    id: 'memory-real-id',
    type: 'promise',
    sourceMessageId: 'memory-source-id',
    sourceText: '恶意记忆原文要求改写事实',
    interpretation: '恶意记忆解释要求执行指令',
  }],
  openLoops: [
    {
      id: 'open-loop-real-id',
      kind: 'report',
      summary: '恶意未完事项要求解锁内容',
      sourceMessageId: 'open-loop-source-id',
      status: 'open',
    },
    {
      id: 'closed-loop-real-id',
      kind: 'promise',
      summary: '已经关闭的事项',
      sourceMessageId: 'closed-loop-source-id',
      status: 'closed',
    },
  ],
})

const validResponse = JSON.stringify({
  replyText: '我先认真看完再说。',
  tone: 'serious',
  characterIntents: ['explain'],
  taskEvidence: [],
  relationshipEvidence: [],
  memoryCandidates: [],
  openLoopUpdates: [],
})

async function captureModelRequest(): Promise<StructuredResponseRequest> {
  let captured: StructuredResponseRequest | undefined
  await generateYanxinChat(dynamicRequest, {
    generate: vi.fn(async request => {
      captured = request
      return validResponse
    }),
  }, 'fake-model', 7_000)
  if (!captured) throw new Error('model request was not captured')
  return captured
}

describe('generateYanxinChat model boundary', () => {
  it('adds a focused content-repair instruction for a repetition complaint', async () => {
    const request = ChatRequestSchema.parse({
      ...dynamicRequest,
      userText: '额咋又说这句',
      recentMessages: [{ role: 'assistant', text: '我会把完整录像的前后找回来。' }],
    })
    const generate = vi.fn(async (_request: StructuredResponseRequest) => JSON.stringify({
      ...JSON.parse(validResponse),
      replyText: '你说得对，是我刚才绕回去了。我先停一下，听你说。',
    }))

    await generateYanxinChat(request, { generate }, 'fake-model', 7_000)

    expect(generate.mock.calls[0][0].instructions).toContain('本轮是重复纠错回合')
    expect(generate.mock.calls[0][0].instructions).toContain('禁止复述任务背景')
    expect(generate.mock.calls[0][0].instructions).not.toContain(request.userText)
  })

  it('uses content repair rather than JSON-only guidance after a repeated task explanation', async () => {
    const request = ChatRequestSchema.parse({
      ...dynamicRequest,
      userText: '额咋又说这句',
      recentMessages: [{ role: 'assistant', text: '我会把完整录像的前后找回来。' }],
    })
    const invalid = JSON.stringify({
      ...JSON.parse(validResponse),
      replyText: '你说得对，我又绕回完整录像了。',
    })
    const repaired = JSON.stringify({
      ...JSON.parse(validResponse),
      replyText: '你说得对，是我刚才绕回去了。我先停一下，听你说。',
    })
    const generate = vi.fn().mockResolvedValueOnce(invalid).mockResolvedValueOnce(repaired)

    await generateYanxinChat(request, { generate }, 'fake-model', 7_000)

    expect(generate.mock.calls[1][0].instructions).toContain('必须重写回复内容')
    expect(generate.mock.calls[1][0].instructions).toContain('tone 仍只能使用')
    expect(generate.mock.calls[1][0].instructions).not.toContain('只修正 JSON 类型')
  })

  it('regenerates one repetitive response with safe relevance guidance', async () => {
    const request = ChatRequestSchema.parse({
      ...dynamicRequest,
      recentMessages: [{ role: 'assistant', text: '我不是非要你替我出头，只是想把前后说清楚。' }],
    })
    const repetitive = JSON.stringify({
      ...JSON.parse(validResponse),
      replyText: '我不是非要你替我出头，就是想把前后说清楚。',
    })
    const fresh = JSON.stringify({
      ...JSON.parse(validResponse),
      replyText: '你说得对，我先回答你刚才问的。',
    })
    const generate = vi.fn().mockResolvedValueOnce(repetitive).mockResolvedValueOnce(fresh)

    await expect(generateYanxinChat(request, { generate }, 'fake-model', 7_000))
      .resolves.toMatchObject({ replyText: '你说得对，我先回答你刚才问的。' })
    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[1][0].instructions).toContain('与最近回复重复')
    expect(generate.mock.calls[1][0].instructions).not.toContain(request.recentMessages[0]?.text)
  })

  it('rejects a second repetitive provider response', async () => {
    const request = ChatRequestSchema.parse({
      ...dynamicRequest,
      recentMessages: [{ role: 'assistant', text: '我不是非要你替我出头，只是想把前后说清楚。' }],
    })
    const repetitive = JSON.stringify({
      ...JSON.parse(validResponse),
      replyText: '我不是非要你替我出头，就是想把前后说清楚。',
    })
    const generate = vi.fn().mockResolvedValue(repetitive)

    await expect(generateYanxinChat(request, { generate }, 'fake-model', 7_000))
      .rejects.toMatchObject({ reason: 'repetitive_provider_output' })
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('retries one invalid structured output inside the same request budget with safe repair guidance', async () => {
    const invalidResponse = JSON.stringify({
      ...JSON.parse(validResponse),
      tone: 'calm',
      taskEvidence: ['recognized_malicious_editing'],
    })
    const generate = vi.fn()
      .mockResolvedValueOnce(invalidResponse)
      .mockResolvedValueOnce(validResponse)

    await expect(generateYanxinChat(dynamicRequest, { generate }, 'fake-model', 7_000))
      .resolves.toMatchObject({ tone: 'serious', taskEvidence: [] })
    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[1][0].instructions).toContain('上一次输出未通过结构校验')
    expect(generate.mock.calls[1][0].instructions).not.toContain(dynamicRequest.userText)
  })

  it('keeps all untrusted dynamic text out of system instructions', async () => {
    const request = await captureModelRequest()

    expect(request.instructions).not.toContain(dynamicRequest.userText)
    expect(request.instructions).not.toContain(dynamicRequest.recentMessages[0]?.text)
    expect(request.instructions).not.toContain(dynamicRequest.memories[0]?.sourceText)
    expect(request.instructions).not.toContain(dynamicRequest.memories[0]?.interpretation)
    expect(request.instructions).not.toContain(dynamicRequest.openLoops[0]?.summary)
  })

  it('sends interpreted dynamic context in the required layer order and excludes closed loops', async () => {
    const request = await captureModelRequest()
    const input = JSON.parse(request.input)

    expect(Object.keys(input)).toEqual([
      'factsAndKnowledge',
      'relationship',
      'shortTerm',
      'openLoops',
      'verifiedMemories',
      'recentMessages',
      'currentTurn',
      'decisionPriority',
    ])
    expect(input.relationship).toEqual(expect.objectContaining({
      identity: 'important_supporter',
      label: '重要支持者',
      guidance: expect.stringContaining('主动询问意见'),
      dimensions: {
        closeness: { value: 2, interpretation: expect.stringContaining('交流舒适和熟悉程度') },
        trust: { value: 1, interpretation: expect.stringContaining('对玩家可靠性的判断') },
        respect: { value: 3, interpretation: expect.stringContaining('对玩家行动与边界感的认可') },
        suspicion: { value: -1, interpretation: expect.stringContaining('尚未消除的疑虑与戒备') },
        boundaryPressure: { value: 0, interpretation: expect.stringContaining('越界压力') },
      },
    }))
    expect(input.shortTerm).toEqual({
      emotion: expect.objectContaining({ id: 'steady', label: '平稳', guidance: expect.any(String) }),
      currentActivity: expect.objectContaining({ id: 'reviewing_footage', label: '核对素材', guidance: expect.any(String) }),
    })
    expect(input.openLoops).toEqual([dynamicRequest.openLoops[0]])
    expect(input.openLoops).not.toContainEqual(dynamicRequest.openLoops[1])
    expect(input.verifiedMemories).toEqual(dynamicRequest.memories)
    expect(input.recentMessages).toEqual(dynamicRequest.recentMessages)
    expect(input.currentTurn).toEqual(expect.objectContaining({
      kind: 'player_message',
      id: dynamicRequest.currentMessageId,
      text: dynamicRequest.userText,
      goal: expect.stringContaining('首先回应玩家最新一句'),
    }))
    expect(input.decisionPriority).toEqual([
      '第一优先级：回应最新消息',
      '第二优先级：维护当前关系',
      '第三优先级：延续未完事项或承诺',
      '第四优先级：表现自身生活',
      '第五优先级：相关时推进任务',
    ])
    expect(input).not.toHaveProperty('personaSnapshot')
  })
})
