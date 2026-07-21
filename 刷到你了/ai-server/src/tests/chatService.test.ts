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
  it('keeps all untrusted dynamic text out of system instructions', async () => {
    const request = await captureModelRequest()

    expect(request.instructions).not.toContain(dynamicRequest.userText)
    expect(request.instructions).not.toContain(dynamicRequest.recentMessages[0]?.text)
    expect(request.instructions).not.toContain(dynamicRequest.memories[0]?.sourceText)
    expect(request.instructions).not.toContain(dynamicRequest.memories[0]?.interpretation)
    expect(request.instructions).not.toContain(dynamicRequest.openLoops[0]?.summary)
  })

  it('sends identified dynamic context as user JSON and excludes closed loops', async () => {
    const request = await captureModelRequest()
    const input = JSON.parse(request.input)

    expect(input).toEqual(expect.objectContaining({
      currentMessageId: dynamicRequest.currentMessageId,
      userText: dynamicRequest.userText,
      personaSnapshot: dynamicRequest.personaSnapshot,
      memories: dynamicRequest.memories,
      recentMessages: dynamicRequest.recentMessages,
    }))
    expect(input.openLoops).toEqual([dynamicRequest.openLoops[0]])
    expect(input.openLoops).not.toContainEqual(dynamicRequest.openLoops[1])
  })
})
