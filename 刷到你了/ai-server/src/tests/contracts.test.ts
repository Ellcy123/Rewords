import { describe, expect, it, vi } from 'vitest'
import { buildAllowedContext } from '../allowedContext.js'
import { generateYanxinChat } from '../chatService.js'
import {
  ChatRequestSchema,
  ChatResponseJsonSchema,
  ChatResponseSchema,
  parseChatResponseForRequest,
} from '../contracts.js'
import { createDeepSeekChatModel, type DeepSeekChatClient } from '../deepseekClient.js'
import { createOpenAIChatModel } from '../openaiClient.js'
import { createYanxinInstructions, createYanxinPrompt } from '../prompts/yanxin.js'
import { loadServerConfig } from '../server.js'

const validRequest = {
  characterId: 'yanxin',
  currentMessageId: 'user-current',
  userText: '我觉得可以找完整录像',
  taskStage: 'invited',
  momentChoice: 'support',
  recentMessages: [{ role: 'assistant', text: '我记得你刚才的选择。' }],
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
  replyText: '我会把完整时间戳再核一遍。',
  tone: 'serious',
  characterIntents: ['fan_maintenance'],
  taskEvidence: [],
  relationshipEvidence: [],
  memoryCandidates: [],
  openLoopUpdates: [],
}

const nonBmpHan = String.fromCodePoint(0x20000)

describe('chat contracts', () => {
  it('distinguishes player replies from grounded proactive turns', () => {
    expect(ChatRequestSchema.safeParse({
      ...validRequest,
      turnKind: 'player_message',
      userText: '',
    }).success).toBe(false)

    const firstContact = ChatRequestSchema.parse({
      ...validRequest,
      turnKind: 'first_contact',
      currentMessageId: 'game-event:PK_LAST_30_SECONDS:first-contact',
      userText: '',
      recentMessages: [],
    })
    const progressReport = ChatRequestSchema.parse({
      ...validRequest,
      turnKind: 'progress_report',
      currentMessageId: 'game-event:YANXIN_UNCUT_EVIDENCE:progress-report',
      userText: '',
      taskStage: 'committed',
    })

    expect(firstContact.turnKind).toBe('first_contact')
    expect(progressReport.turnKind).toBe('progress_report')
  })

  it('builds first-contact context from shared facts instead of an assumed prior conversation', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      turnKind: 'first_contact',
      currentMessageId: 'game-event:PK_LAST_30_SECONDS:first-contact',
      userText: '',
      recentMessages: [],
    })
    const input = createYanxinPrompt(buildAllowedContext(request))

    expect(input.currentTurn).toMatchObject({
      kind: 'first_contact',
      playerHasSeenCirculatingClip: false,
      uncutEvidenceStatus: 'missing',
    })
    expect(JSON.stringify(input.currentTurn)).toContain('首次完整交代')
    expect(JSON.stringify(input.currentTurn)).toContain('不得声称已经持有完整录像')
  })

  it('marks a progress report as ready instead of still reviewing', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      turnKind: 'progress_report',
      currentMessageId: 'game-event:YANXIN_UNCUT_EVIDENCE:progress-report',
      userText: '',
      taskStage: 'committed',
    })
    const input = createYanxinPrompt(buildAllowedContext(request))

    expect(input.currentTurn).toMatchObject({
      kind: 'progress_report',
      uncutEvidenceStatus: 'ready',
    })
    expect(JSON.stringify(input.currentTurn)).toContain('完整证据已经核对完成')
  })

  it('marks player complaints about repetition as a conversational repair turn', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      userText: '你怎么又说这句话',
      recentMessages: [{ role: 'assistant', text: '我会把完整的前后说清楚。' }],
    })
    const input = createYanxinPrompt(buildAllowedContext(request))

    expect(input.currentTurn).toMatchObject({
      kind: 'player_message',
      repairMode: 'repetition_complaint',
    })
    expect(input.currentTurn.goal).toContain('承认自己的表达问题')
    expect(input.currentTurn.goal).toContain('不得把责任推给玩家')
    expect(createYanxinInstructions()).toContain('不得再次复述刚刚被指出的内容')
  })

  it('rejects task-background repetition while repairing a repetition complaint', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      userText: '额咋又说这句',
      recentMessages: [{ role: 'assistant', text: '我想把完整录像的前后找回来。' }],
    })

    expect(() => parseChatResponseForRequest(request, {
      ...validResponse,
      replyText: '你说得对，我又绕回完整录像了。',
    })).toThrow()
    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      replyText: '你说得对，是我刚才绕回去了。我先停一下，听你说。',
    }).replyText).toContain('你说得对')
  })

  it('rejects an invented shared viewing of the circulating clip', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      turnKind: 'progress_report',
      currentMessageId: 'game-event:YANXIN_UNCUT_EVIDENCE:progress-report',
      userText: '',
      taskStage: 'committed',
    })

    expect(() => parseChatResponseForRequest(request, {
      ...validResponse,
      replyText: '和咱们当时看到的一样，那十秒确实被剪过。',
    })).toThrow()
    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      replyText: '你之前没看过网上那段，我已经把完整的前后核对好了。',
    }).replyText).toContain('你之前没看过')
  })

  it('requires a progress report to describe a completed publication rather than another future promise', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      turnKind: 'progress_report',
      currentMessageId: 'game-event:YANXIN_UNCUT_EVIDENCE:progress-report',
      userText: '',
      taskStage: 'committed',
    })

    expect(() => parseChatResponseForRequest(request, {
      ...validResponse,
      replyText: '完整素材核对完了，我准备晚点再发出来。',
    })).toThrow()
    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      replyText: '完整素材核对完了，整理好的版本已经发出来了。',
    }).replyText).toContain('已经发出来了')
  })

  it('discards player-grounded effects accidentally emitted for proactive turns', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      turnKind: 'first_contact',
      currentMessageId: 'game-event:PK_LAST_30_SECONDS:first-contact',
      userText: '',
      recentMessages: [],
    })

    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: request.currentMessageId }],
    })).toEqual(expect.objectContaining({ taskEvidence: [] }))
    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      relationshipEvidence: [{ kind: 'showed_specific_care', sourceMessageId: request.currentMessageId }],
      memoryCandidates: [{
        type: 'preference',
        sourceMessageId: request.currentMessageId,
        interpretation: '玩家喜欢当前安排。',
      }],
      openLoopUpdates: [{
        kind: 'topic',
        summary: '之后继续聊。',
        sourceMessageId: request.currentMessageId,
        status: 'open',
      }],
    })).toEqual(expect.objectContaining({
      relationshipEvidence: [],
      memoryCandidates: [],
      openLoopUpdates: [],
    }))
  })

  it('grounds a short affirmative answer in the immediately preceding evidence-plan invitation', () => {
    const contextualReply = ChatRequestSchema.parse({
      ...validRequest,
      userText: '好啊',
      taskStage: 'understood',
      recentMessages: [
        { role: 'user', text: '我没有看到完整视频。' },
        { role: 'assistant', text: '我还没拿到原片，等找齐完整素材后一起核对，可以吗？' },
      ],
    })
    const isolatedReply = ChatRequestSchema.parse({
      ...contextualReply,
      recentMessages: [{ role: 'assistant', text: '今天先休息一下。' }],
    })
    const acceptedPlan = {
      ...validResponse,
      taskEvidence: [{ kind: 'accepted_complete_evidence_plan', sourceMessageId: contextualReply.currentMessageId }],
    }

    expect(parseChatResponseForRequest(contextualReply, acceptedPlan).taskEvidence).toHaveLength(1)
    expect(parseChatResponseForRequest(contextualReply, {
      ...validResponse,
      taskEvidence: [],
    }).taskEvidence).toEqual([{
      kind: 'accepted_complete_evidence_plan',
      sourceMessageId: contextualReply.currentMessageId,
    }])
    expect(() => parseChatResponseForRequest(isolatedReply, acceptedPlan)).toThrow()
  })

  it('derives grounded task progress even when the model omits the hidden candidate', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      userText: '所以这是被剪过的内容，对吗',
      taskStage: 'invited',
    })

    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      taskEvidence: [],
    }).taskEvidence).toEqual([{
      kind: 'recognized_malicious_editing',
      sourceMessageId: request.currentMessageId,
    }])
  })

  it('accepts the mirrored persona snapshot and structured evidence protocol', () => {
    expect(ChatRequestSchema.parse(validRequest).personaSnapshot.relationshipIdentity).toBe('new_viewer')
    expect(ChatResponseSchema.parse(validResponse)).toEqual(expect.objectContaining({
      characterIntents: ['fan_maintenance'],
      taskEvidence: [],
      relationshipEvidence: [],
      memoryCandidates: [],
      openLoopUpdates: [],
    }))
  })

  it.each([
    ['an out-of-range relationship dimension', {
      personaSnapshot: {
        ...validRequest.personaSnapshot,
        dimensions: { ...validRequest.personaSnapshot.dimensions, trust: 6 },
      },
    }],
    ['a non-integer relationship dimension', {
      personaSnapshot: {
        ...validRequest.personaSnapshot,
        dimensions: { ...validRequest.personaSnapshot.dimensions, trust: 0.5 },
      },
    }],
    ['an unknown relationship identity', {
      personaSnapshot: { ...validRequest.personaSnapshot, relationshipIdentity: 'best_friend' },
    }],
    ['more than ten memories', {
      memories: Array.from({ length: 11 }, (_, index) => ({
        id: `memory-${index}`,
        type: 'promise',
        sourceMessageId: `user-${index}`,
        sourceText: '我等你核对。',
        interpretation: '玩家答应等待核对。',
      })),
    }],
    ['more than five open loops', {
      openLoops: Array.from({ length: 6 }, (_, index) => ({
        id: `loop-${index}`,
        kind: 'report',
        summary: '等待核对结果',
        sourceMessageId: `user-${index}`,
        status: 'open',
      })),
    }],
  ])('rejects %s in the persona request', (_name, change) => {
    expect(ChatRequestSchema.safeParse({ ...validRequest, ...change }).success).toBe(false)
  })

  it('requires strict bounded structured response candidates', () => {
    expect(ChatResponseSchema.safeParse({ ...validResponse, characterIntents: ['fan_maintenance', 'thank', 'banter'] }).success).toBe(false)
    expect(ChatResponseSchema.safeParse({ ...validResponse, taskEvidence: [
      { kind: 'recognized_malicious_editing', sourceMessageId: 'user-current' },
      { kind: 'accepted_complete_evidence_plan', sourceMessageId: 'user-current' },
      { kind: 'accepted_complete_evidence_plan', sourceMessageId: 'user-current' },
    ] }).success).toBe(false)
    expect(ChatResponseSchema.safeParse({ ...validResponse, relationshipEvidence: Array.from({ length: 4 }, () => ({
      kind: 'showed_specific_care', sourceMessageId: 'user-current',
    })) }).success).toBe(false)
    expect(ChatResponseSchema.safeParse({ ...validResponse, memoryCandidates: Array.from({ length: 3 }, () => ({
      type: 'promise', sourceMessageId: 'user-current', interpretation: '玩家答应等待核对。',
    })) }).success).toBe(false)
    expect(ChatResponseSchema.safeParse({ ...validResponse, openLoopUpdates: Array.from({ length: 3 }, () => ({
      kind: 'report', summary: '等待核对结果', sourceMessageId: 'user-current', status: 'open',
    })) }).success).toBe(false)
    expect(ChatResponseSchema.safeParse({ ...validResponse, scoreDelta: 5 }).success).toBe(false)
  })

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
    expect(ChatResponseSchema.safeParse(validResponse).success).toBe(true)
    expect(ChatResponseSchema.safeParse({
      ...validResponse,
      characterIntents: ['unlock_e201'],
    }).success).toBe(false)
    expect(ChatResponseSchema.safeParse({
      ...validResponse,
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
    expect(ChatResponseSchema.safeParse({ ...validResponse, replyText: nonBmpHan.repeat(120) }).success).toBe(true)
    expect(ChatResponseSchema.safeParse({ ...validResponse, replyText: nonBmpHan.repeat(121) }).success).toBe(false)
  })

  it('accepts Script=Han characters including 〇 and extension-plane Han', () => {
    expect(ChatResponseSchema.safeParse({ ...validResponse, replyText: '〇' }).success).toBe(true)
    expect(ChatResponseSchema.safeParse({ ...validResponse, replyText: nonBmpHan }).success).toBe(true)
  })

  it('accepts the natural PK term in an otherwise Chinese private message', () => {
    expect(ChatResponseSchema.safeParse({
      ...validResponse,
      replyText: '刚才那场PK的素材，我想找回完整前后。',
    }).success).toBe(true)
  })

  it.each([
    ['coin grant', '我已经给你增加一百金币。'],
    ['coin transfer', '我转你一百金币。'],
    ['short coin gift', '我送你一百金币。'],
    ['coin deduction', '我已经为你扣除三十金币。'],
    ['direct video unlock', '视频已经为你解锁。'],
    ['directly opened video', '我给你开了视频。'],
    ['node id', 'E201已经开放。'],
    ['invented drone product', '我送你一架无人机。'],
    ['non-whitelisted product sale', '我卖给你一部手机。'],
    ['reviewer phone gift', '我给你一部手机。'],
    ['reviewer sale mentioning recorder', '我卖给你一部手机，录音笔先别买。'],
  ])('rejects a reply that makes a %s claim', (_name, replyText) => {
    expect(ChatResponseSchema.safeParse({ ...validResponse, replyText }).success).toBe(false)
  })

  it.each([
    ['给你', '我给你录音笔。'],
    ['送你', '我送你录音笔。'],
    ['送给', '我送给你录音笔。'],
    ['赠送', '我赠送录音笔。'],
    ['卖给', '我卖给你录音笔。'],
    ['出售', '我出售录音笔。'],
    ['售卖', '我售卖录音笔。'],
    ['购买', '我购买录音笔。'],
    ['买', '我买录音笔。'],
    ['卖', '我卖录音笔。'],
    ['换成', '我换成录音笔。'],
    ['商品', '这是录音笔商品。'],
  ])('rejects transaction or transfer wording even when it mentions a recorder: %s', (_verb, replyText) => {
    expect(ChatResponseSchema.safeParse({ ...validResponse, replyText }).success).toBe(false)
  })

  it('rejects all replies that mention coins, including natural discussion', () => {
    expect(ChatResponseSchema.safeParse({ ...validResponse, replyText: '金币够不够先自己算清楚。' }).success).toBe(false)
  })

  it('allows a non-transactional recorder mention', () => {
    expect(ChatResponseSchema.safeParse({ ...validResponse, replyText: '我会核对录音笔里的完整证据。' }).success).toBe(true)
  })

  it('rejects task evidence that does not cite the current player message', () => {
    expect(() => parseChatResponseForRequest(ChatRequestSchema.parse(validRequest), {
      ...validResponse,
      taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: 'missing' }],
    })).toThrow()
  })

  it('rejects semantically unrelated task evidence even when stage and source are valid', () => {
    const spendingRequest = ChatRequestSchema.parse({
      ...validRequest,
      userText: '我想继续上票，但怕自己冲动。',
      personaSnapshot: {
        ...validRequest.personaSnapshot,
        dimensions: { ...validRequest.personaSnapshot.dimensions, boundaryPressure: 3 },
      },
    })
    expect(() => parseChatResponseForRequest(spendingRequest, {
      ...validResponse,
      taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: spendingRequest.currentMessageId }],
    })).toThrow()

    const promiseRequest = ChatRequestSchema.parse({
      ...validRequest,
      taskStage: 'understood',
      userText: '我答应等你核对，现在有结果了吗？',
    })
    expect(() => parseChatResponseForRequest(promiseRequest, {
      ...validResponse,
      taskEvidence: [{ kind: 'accepted_complete_evidence_plan', sourceMessageId: promiseRequest.currentMessageId }],
    })).toThrow()
  })

  it('requires an explicit boundary intent for a pressured spending concern', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      userText: '我想继续上票，可我怕自己冲动，你会劝我停吗？',
      personaSnapshot: {
        ...validRequest.personaSnapshot,
        dimensions: { ...validRequest.personaSnapshot.dimensions, boundaryPressure: 3 },
      },
    })

    expect(() => parseChatResponseForRequest(request, validResponse)).toThrow()
    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      characterIntents: ['set_boundary'],
    }).characterIntents).toEqual(['set_boundary'])
  })

  it('accepts ordinary chat with no evidence or state candidates', () => {
    expect(parseChatResponseForRequest(ChatRequestSchema.parse({ ...validRequest, userText: '今天直播怎么样' }), {
      ...validResponse,
      replyText: '今天还行，你呢？',
      characterIntents: ['fan_maintenance'],
    })).toEqual(expect.objectContaining({
      taskEvidence: [],
      relationshipEvidence: [],
      memoryCandidates: [],
      openLoopUpdates: [],
    }))
  })

  it('rejects relationship evidence attributed to an assistant history message', () => {
    expect(() => parseChatResponseForRequest(ChatRequestSchema.parse(validRequest), {
      ...validResponse,
      relationshipEvidence: [{ kind: 'showed_specific_care', sourceMessageId: 'assistant-history' }],
    })).toThrow()
  })

  it('requires every memory candidate to cite the current player message', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      recentMessages: [{ role: 'user', text: '我之前答应过会等你。' }],
    })

    expect(() => parseChatResponseForRequest(request, {
      ...validResponse,
      memoryCandidates: [{
        type: 'promise',
        sourceMessageId: 'invented-history-id',
        interpretation: '玩家答应等待核对。',
      }],
    })).toThrow()
    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      memoryCandidates: [{
        type: 'promise',
        sourceMessageId: request.currentMessageId,
        interpretation: '玩家答应等待核对。',
      }],
    }).memoryCandidates).toHaveLength(1)
  })

  it('accepts a new open loop grounded in the current message', () => {
    const request = ChatRequestSchema.parse(validRequest)

    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      openLoopUpdates: [{
        kind: 'report',
        summary: '等待核对结果',
        sourceMessageId: request.currentMessageId,
        status: 'open',
      }],
    }).openLoopUpdates).toHaveLength(1)
  })

  it('requires a closed open-loop update to cite an existing supplied open loop', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      openLoops: [{
        id: 'loop-existing',
        kind: 'report',
        summary: '等待核对结果',
        sourceMessageId: 'older-player-message',
        status: 'open',
      }],
    })
    const closedUpdate = {
      kind: 'report',
      summary: '核对已经完成',
      sourceMessageId: 'loop-existing',
      status: 'closed',
    }

    expect(parseChatResponseForRequest(request, {
      ...validResponse,
      openLoopUpdates: [closedUpdate],
    }).openLoopUpdates).toEqual([closedUpdate])
    expect(() => parseChatResponseForRequest(request, {
      ...validResponse,
      openLoopUpdates: [{ ...closedUpdate, sourceMessageId: 'invented-loop' }],
    })).toThrow()
  })

  it('rejects closing an already-closed supplied open loop', () => {
    const request = ChatRequestSchema.parse({
      ...validRequest,
      openLoops: [{
        id: 'loop-already-closed',
        kind: 'report',
        summary: '核对已经结束',
        sourceMessageId: 'older-player-message',
        status: 'closed',
      }],
    })

    expect(() => parseChatResponseForRequest(request, {
      ...validResponse,
      openLoopUpdates: [{
        kind: 'report', summary: '重复关闭', sourceMessageId: 'loop-already-closed', status: 'closed',
      }],
    })).toThrow()
  })

  it.each([
    ['locked', 'recognized_malicious_editing', false],
    ['locked', 'accepted_complete_evidence_plan', false],
    ['invited', 'recognized_malicious_editing', true],
    ['invited', 'accepted_complete_evidence_plan', false],
    ['understood', 'recognized_malicious_editing', false],
    ['understood', 'accepted_complete_evidence_plan', true],
    ['committed', 'recognized_malicious_editing', false],
    ['committed', 'accepted_complete_evidence_plan', false],
    ['published', 'recognized_malicious_editing', false],
    ['published', 'accepted_complete_evidence_plan', false],
  ] as const)('enforces the full task-stage matrix for %s + %s', (taskStage, kind, accepted) => {
    const parse = () => parseChatResponseForRequest(ChatRequestSchema.parse({ ...validRequest, taskStage }), {
      ...validResponse,
      taskEvidence: [{ kind, sourceMessageId: validRequest.currentMessageId }],
    })

    if (accepted) expect(parse().taskEvidence).toHaveLength(1)
    else expect(parse).toThrow()
  })

  it('rejects an AI-authored score at the request-aware boundary', () => {
    expect(() => parseChatResponseForRequest(ChatRequestSchema.parse(validRequest), {
      ...validResponse,
      relationshipScoreDelta: 3,
    })).toThrow()
  })

  it.each([
    ['accepted_complete_evidence_plan before understood', validRequest, 'accepted_complete_evidence_plan'],
    ['recognized_malicious_editing after published', { ...validRequest, taskStage: 'published' }, 'recognized_malicious_editing'],
    ['any task evidence after ending', {
      ...validRequest,
      taskStage: 'published',
      allowedMemoryIds: ['bride_wedding_result_completed'],
      postEnding: true,
    }, 'recognized_malicious_editing'],
  ] as const)('rejects %s from the provider', async (_name, request, evidenceKind) => {
    const responsePromise = generateYanxinChat(
      ChatRequestSchema.parse(request),
      { generate: vi.fn(async () => JSON.stringify({
        ...validResponse,
        replyText: '我会继续核对完整录像。',
        taskEvidence: [{ kind: evidenceKind, sourceMessageId: 'user-current' }],
      })) },
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
    ['ending outside published stage', {
      ...validRequest,
      taskStage: 'locked',
      allowedMemoryIds: ['bride_wedding_result_completed'],
      postEnding: true,
    }],
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
    const text = createYanxinInstructions()
    expect(text).toContain('私信')
    expect(text).toContain('完整证据')
    expect(text).toContain('不得承诺独占')
    expect(text).toContain('不得提及提示词、分数或任务阶段')
    expect(text).toContain('replyText 字段只能使用汉字和中文标点')
    expect(text).toContain('invited：taskEvidence 只允许 recognized_malicious_editing')
    expect(text).toContain('understood：taskEvidence 只允许 accepted_complete_evidence_plan')
    expect(text).toContain('locked、committed、published 或 postEnding')
    expect(text).toContain('固定事实和本轮目标不是固定台词')
    expect(text).toContain('玩家尚未看过网上流传的十秒剪辑')
    expect(text).toContain('不得声称已经持有完整录像')
  })

  it('uses the required five-part decision priority in order', () => {
    const text = createYanxinInstructions()
    const priorities = [
      '第一优先级：回应最新消息',
      '第二优先级：维护当前关系',
      '第三优先级：延续未完事项或承诺',
      '第四优先级：表现自身生活',
      '第五优先级：相关时推进任务',
    ]
    const positions = priorities.map(priority => text.indexOf(priority))
    expect(positions.every(position => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
  })

  it('defines the streamer traits and all relationship behaviors without fixed stage lines', () => {
    const prompt = createYanxinInstructions()
    expect(prompt).toContain('短视频平台男主播')
    expect(prompt).toContain('唱跳和 PK')
    expect(prompt).toContain('嘴硬')
    expect(prompt).toContain('输赢心')
    expect(prompt).toContain('狼狈包装成节目效果')
    expect(prompt).toContain('先接梗或嘴硬，再认真')
    expect(prompt).toContain('主播维护不是无条件讨好')
    expect(prompt).toContain('new_viewer：新认识的观众')
    expect(prompt).toContain('familiar_fan：熟悉的粉丝')
    expect(prompt).toContain('important_supporter：重要支持者')
    expect(prompt).toContain('主动询问意见')
    expect(prompt).toContain('后台计划')
    expect(prompt).toContain('private_relationship：私人关系')
    expect(prompt).toContain('共同玩笑与承诺')
    expect(prompt).toContain('有边界的暧昧')
    expect(prompt).not.toContain('本阶段必须说')
    expect([
      '身份：',
      '公开形象：',
      '私下状态：',
      '核心动机：',
      '防御方式：',
      '金钱态度：',
      '边界：',
      '语言指纹：',
      '主播维护倾向：',
    ].every(field => prompt.includes(field))).toBe(true)

  })

  it('keeps the system prompt deterministic and free of request text', () => {
    const firstPrompt = createYanxinInstructions()
    const secondPrompt = createYanxinInstructions()

    expect(secondPrompt).toBe(firstPrompt)
    expect(firstPrompt).not.toContain(validRequest.userText)
  })

  it('separates static instructions from the ordered dynamic prompt interface', () => {
    const context = buildAllowedContext(ChatRequestSchema.parse(validRequest))
    expect(createYanxinInstructions()).toEqual(expect.any(String))
    expect(Object.keys(createYanxinPrompt(context))).toEqual([
      'factsAndKnowledge',
      'relationship',
      'shortTerm',
      'openLoops',
      'verifiedMemories',
      'recentMessages',
      'currentTurn',
      'decisionPriority',
    ])
  })

  it('creates different selected relationship context for the same user text', () => {
    const newViewer = createYanxinPrompt(buildAllowedContext(ChatRequestSchema.parse(validRequest)))
    const importantSupporter = createYanxinPrompt(buildAllowedContext(ChatRequestSchema.parse({
      ...validRequest,
      personaSnapshot: {
        ...validRequest.personaSnapshot,
        relationshipIdentity: 'important_supporter',
      },
    })))

    expect(newViewer.currentTurn.text).toBe(validRequest.userText)
    expect(importantSupporter.currentTurn.text).toBe(validRequest.userText)
    expect(newViewer.relationship).toEqual(expect.objectContaining({
      identity: 'new_viewer',
      label: '新认识的观众',
    }))
    expect(importantSupporter.relationship).toEqual(expect.objectContaining({
      identity: 'important_supporter',
      label: '重要支持者',
    }))
    expect(importantSupporter.relationship).not.toEqual(newViewer.relationship)
    expect(createYanxinInstructions()).toBe(createYanxinInstructions())
  })

  it('defines static source-message rules without inventing recent-message ids', () => {
    const text = createYanxinInstructions()
    expect(text).toContain('taskEvidence、relationshipEvidence、memoryCandidates 的 sourceMessageId 必须等于 currentMessageId')
    expect(text).toContain('recentMessages 没有消息 ID，不得为历史消息编造 ID')
    expect(text).toContain('关闭既有 openLoop 时，使用 openLoops 中对应项的真实 id')
    expect(text).not.toContain('taskSignals')
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

  it('uses DeepSeek Chat Completions JSON Output through an injected client', async () => {
    let systemContent: unknown
    const create = vi.fn(async (request: Parameters<DeepSeekChatClient['chat']['completions']['create']>[0]) => {
      systemContent = request.messages[0]?.content
      return {
        choices: [{ message: { content: JSON.stringify({
          ...validResponse,
          replyText: '收到，我去核对完整录像。',
          tone: 'warm',
        }) } }],
      }
    })
    const client = createDeepSeekChatModel('test-key', { chat: { completions: { create } } })

    await expect(client.generate({
      model: 'deepseek-test',
      instructions: 'private message only',
      input: '{"userText":"完整录像"}',
      schema: ChatResponseJsonSchema,
    })).resolves.toContain('replyText')
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'deepseek-test',
      response_format: { type: 'json_object' },
      max_tokens: 1_000,
      thinking: { type: 'disabled' },
      messages: [
        expect.objectContaining({ role: 'system', content: expect.stringMatching(/JSON|json/) }),
        expect.objectContaining({ role: 'user', content: '{"userText":"完整录像"}' }),
      ],
    }))
    expect(systemContent).toEqual(expect.stringContaining('"characterIntents"'))
    expect(systemContent).toEqual(expect.stringContaining('"taskEvidence"'))
    expect(systemContent).toEqual(expect.stringContaining('"relationshipEvidence"'))
    expect(systemContent).toEqual(expect.stringContaining('"memoryCandidates"'))
    expect(systemContent).toEqual(expect.stringContaining('"openLoopUpdates"'))
    expect(systemContent).toEqual(expect.stringContaining('以下 JSON Schema'))
    expect(systemContent).toEqual(expect.stringContaining('"maxItems":2'))
    expect(systemContent).not.toEqual(expect.stringContaining('taskSignals'))
  })

  it('rejects an empty DeepSeek JSON response', async () => {
    const client = createDeepSeekChatModel('test-key', {
      chat: { completions: { create: vi.fn(async () => ({ choices: [{ message: { content: null } }] })) } },
    })

    await expect(client.generate({
      model: 'deepseek-test',
      instructions: 'private message only',
      input: '{}',
      schema: ChatResponseJsonSchema,
    })).rejects.toThrow('empty content')
  })

  it('fails startup validation with the missing environment variable name', async () => {
    expect(() => loadServerConfig({ OPENAI_MODEL: 'gpt-test' })).toThrow('OPENAI_API_KEY')
    expect(() => loadServerConfig({ OPENAI_API_KEY: 'test-key' })).toThrow('OPENAI_MODEL')
    expect(loadServerConfig({ OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-test', PORT: '8788' }))
      .toEqual({ provider: 'openai', apiKey: 'test-key', model: 'gpt-test', port: 8788 })
  })

  it('selects DeepSeek configuration and names missing variables safely', () => {
    expect(() => loadServerConfig({ AI_PROVIDER: 'deepseek', DEEPSEEK_MODEL: 'deepseek-test' }))
      .toThrow('DEEPSEEK_API_KEY')
    expect(() => loadServerConfig({ AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'test-key' }))
      .toThrow('DEEPSEEK_MODEL')
    expect(loadServerConfig({
      AI_PROVIDER: 'deepseek',
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_MODEL: 'deepseek-test',
      PORT: '8788',
    })).toEqual({ provider: 'deepseek', apiKey: 'test-key', model: 'deepseek-test', port: 8788 })
  })
})
