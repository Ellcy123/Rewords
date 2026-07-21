import { z } from 'zod'
import type { ResponseFormatTextJSONSchemaConfig } from 'openai/resources/responses/responses'

export const TaskSignals = [
  'acknowledge_pressure',
  'offer_evidence_plan',
  'respect_boundary',
] as const

export const ChatTurnKinds = ['first_contact', 'player_message', 'progress_report'] as const

export const Tones = ['guarded', 'warm', 'teasing', 'serious'] as const

export const CharacterIntents = [
  'fan_maintenance',
  'thank',
  'banter',
  'probe',
  'explain',
  'share',
  'confirm_promise',
  'set_boundary',
  'handle_conflict',
  'end_topic',
  'advance_task',
] as const

export const TaskEvidenceKinds = [
  'recognized_malicious_editing',
  'accepted_complete_evidence_plan',
] as const

export const RelationshipEvidenceKinds = [
  'showed_specific_care',
  'respected_boundary',
  'offered_actionable_help',
  'kept_promise',
  'contradicted_action_evidence',
  'revealed_unexplained_knowledge',
  'pressured_after_refusal',
  'public_financial_support',
] as const

export const MemoryTypes = ['player_stance', 'promise', 'shared_joke', 'conflict', 'preference'] as const
export const OpenLoopKinds = ['promise', 'topic', 'conflict', 'report'] as const
export const OpenLoopStatuses = ['open', 'closed'] as const

export const AllowedMemoryIds = [
  'yanxin_pk_choice_support',
  'yanxin_pk_choice_hold_back',
  'yanxin_evidence_task_completed',
  'yanxin_evidence_method_helped_bride',
  'bride_wedding_result_completed',
] as const

const AllowedMemoryIdSchema = z.enum(AllowedMemoryIds)

const ChinesePunctuation = new Set(Array.from('，。！？、；：…（）《》“”‘’—'))
const HanCharacterPattern = /^\p{Script=Han}$/u
const NodeIdPattern = /[A-Z]\d{3}/i
const DirectContentAccessClaimPattern = /(?:节点|视频|内容|入口).{0,12}(?:开(?:通|放|启|了)?|打开|解锁)|(?:我|为你|给你|已|已经|会|将|现在|马上).{0,12}(?:开(?:通|放|启|了)?|打开|解锁).{0,12}(?:节点|视频|内容|入口)/
const TransactionOrTransferPattern = /给你|送你|送给|赠送|卖给|出售|售卖|购买|买|卖|换成|商品/
const CollectiveClipViewingPattern = /(?:(?:咱们|我们).{0,10}(?:看到|看过).{0,10}(?:十秒|那段|剪辑))|(?:(?:十秒|那段|剪辑).{0,10}(?:咱们|我们).{0,10}(?:看到|看过))/
const PlayerClipViewingPattern = /(?:你.{0,10}(?:看到|看过).{0,10}(?:十秒|那段|剪辑))|(?:(?:十秒|那段|剪辑).{0,10}你.{0,10}(?:看到|看过))/
const PlayerDidNotViewPattern = /你.{0,8}(?:没|没有|未).{0,3}(?:看到|看过)/

function inventsSharedClipViewing(value: string): boolean {
  return CollectiveClipViewingPattern.test(value)
    || (PlayerClipViewingPattern.test(value) && !PlayerDidNotViewPattern.test(value))
}

function codePointLength(value: string): number {
  return Array.from(value).length
}

function hasLengthBetween(value: string, minimum: number, maximum: number): boolean {
  const length = codePointLength(value)
  return length >= minimum && length <= maximum
}

function codePointString(minimum: number, maximum: number, label: string) {
  return z.string().trim().superRefine((value, context) => {
    if (!hasLengthBetween(value, minimum, maximum)) {
      context.addIssue({
        code: 'custom',
        message: `${label} must contain ${minimum}-${maximum} Unicode code points`,
      })
    }
  })
}

function isHanCharacter(character: string): boolean {
  return HanCharacterPattern.test(character)
}

function isChineseReplyText(value: string): boolean {
  return Array.from(value.replaceAll('PK', '')).every(
    character => isHanCharacter(character) || ChinesePunctuation.has(character),
  )
}

function isForbiddenDomainClaim(value: string): boolean {
  return value.includes('金币')
    || NodeIdPattern.test(value)
    || DirectContentAccessClaimPattern.test(value)
    || TransactionOrTransferPattern.test(value)
    || value.includes('无人机')
}

const ReplyTextSchema = codePointString(1, 120, 'replyText').superRefine((value, context) => {
  if (!isChineseReplyText(value)) {
    context.addIssue({ code: 'custom', message: 'replyText must contain only Chinese characters and Chinese punctuation' })
  }
  if (isForbiddenDomainClaim(value)) {
    context.addIssue({ code: 'custom', message: 'replyText contains a forbidden domain claim' })
  }
})

const IdSchema = codePointString(1, 120, 'id')
const SourceMessageIdSchema = codePointString(1, 120, 'sourceMessageId')
const InterpretationSchema = codePointString(1, 120, 'interpretation')
const SummarySchema = codePointString(1, 120, 'summary')

const RelationshipDimensionsSchema = z.object({
  closeness: z.number().int().min(-5).max(5),
  trust: z.number().int().min(-5).max(5),
  respect: z.number().int().min(-5).max(5),
  suspicion: z.number().int().min(-5).max(5),
  boundaryPressure: z.number().int().min(-5).max(5),
}).strict()

const PersonaSnapshotSchema = z.object({
  relationshipIdentity: z.enum(['new_viewer', 'familiar_fan', 'important_supporter', 'private_relationship']),
  dimensions: RelationshipDimensionsSchema,
  shortTerm: z.object({
    emotion: z.enum(['guarded', 'steady', 'warm', 'pressured']),
    currentActivity: z.enum(['post_pk', 'reviewing_footage', 'testing_device', 'following_up']),
  }).strict(),
}).strict()

const MemorySchema = z.object({
  id: IdSchema,
  type: z.enum(MemoryTypes),
  sourceMessageId: SourceMessageIdSchema,
  sourceText: codePointString(1, 300, 'sourceText'),
  interpretation: InterpretationSchema,
}).strict()

const OpenLoopSchema = z.object({
  id: IdSchema,
  kind: z.enum(OpenLoopKinds),
  summary: SummarySchema,
  sourceMessageId: SourceMessageIdSchema,
  status: z.enum(OpenLoopStatuses),
}).strict()

const TaskEvidenceSchema = z.object({
  kind: z.enum(TaskEvidenceKinds),
  sourceMessageId: SourceMessageIdSchema,
}).strict()

const RelationshipEvidenceSchema = z.object({
  kind: z.enum(RelationshipEvidenceKinds),
  sourceMessageId: SourceMessageIdSchema,
}).strict()

const MemoryCandidateSchema = z.object({
  type: z.enum(MemoryTypes),
  sourceMessageId: SourceMessageIdSchema,
  interpretation: InterpretationSchema,
}).strict()

const OpenLoopUpdateSchema = z.object({
  kind: z.enum(OpenLoopKinds),
  summary: SummarySchema,
  sourceMessageId: SourceMessageIdSchema,
  status: z.enum(OpenLoopStatuses),
}).strict()

export const ChatRequestSchema = z.object({
  characterId: z.literal('yanxin'),
  turnKind: z.enum(ChatTurnKinds).default('player_message'),
  currentMessageId: IdSchema,
  userText: codePointString(0, 300, 'userText'),
  taskStage: z.enum(['locked', 'invited', 'understood', 'committed', 'published']),
  momentChoice: z.enum(['support', 'hold_back']),
  recentMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: codePointString(1, 300, 'recentMessages.text'),
  }).strict()).max(12),
  allowedMemoryIds: z.array(AllowedMemoryIdSchema).max(AllowedMemoryIds.length),
  postEnding: z.boolean(),
  personaSnapshot: PersonaSnapshotSchema,
  memories: z.array(MemorySchema).max(10),
  openLoops: z.array(OpenLoopSchema).max(5),
}).strict().superRefine((request, context) => {
  const memories = new Set(request.allowedMemoryIds)
  const addIssue = (path: Array<string>, message: string) => context.addIssue({ code: 'custom', path, message })
  const hasSupportChoice = memories.has('yanxin_pk_choice_support')
  const hasHoldBackChoice = memories.has('yanxin_pk_choice_hold_back')
  const hasEvidenceCompletion = memories.has('yanxin_evidence_task_completed')
  const hasBrideHelped = memories.has('yanxin_evidence_method_helped_bride')
  const hasWeddingCompletion = memories.has('bride_wedding_result_completed')

  if (request.turnKind === 'player_message' && codePointLength(request.userText) === 0) {
    addIssue(['userText'], 'player_message requires non-empty userText')
  }
  if (request.turnKind !== 'player_message' && codePointLength(request.userText) !== 0) {
    addIssue(['userText'], 'proactive turns require empty userText')
  }
  if (request.turnKind === 'first_contact' && request.taskStage !== 'invited') {
    addIssue(['taskStage'], 'first_contact requires invited stage')
  }
  if (request.turnKind === 'progress_report' && request.taskStage !== 'committed') {
    addIssue(['taskStage'], 'progress_report requires committed stage')
  }

  if (hasSupportChoice && request.momentChoice !== 'support') {
    addIssue(['allowedMemoryIds'], 'support PK memory must match momentChoice')
  }
  if (hasHoldBackChoice && request.momentChoice !== 'hold_back') {
    addIssue(['allowedMemoryIds'], 'hold-back PK memory must match momentChoice')
  }
  if (hasSupportChoice && hasHoldBackChoice) {
    addIssue(['allowedMemoryIds'], 'both PK choice memories cannot be present')
  }
  if (request.postEnding && request.taskStage !== 'published') {
    addIssue(['taskStage'], 'postEnding requires published stage')
  }
  if (request.postEnding && !hasWeddingCompletion) {
    addIssue(['allowedMemoryIds'], 'postEnding requires wedding completion memory')
  }
  if (hasEvidenceCompletion && request.taskStage !== 'published') {
    addIssue(['allowedMemoryIds'], 'evidence completion memory requires published stage')
  }
  if (hasBrideHelped && (request.taskStage !== 'published' || !hasWeddingCompletion)) {
    addIssue(['allowedMemoryIds'], 'bride-helped memory requires published stage and wedding completion memory')
  }
})

export const ChatResponseSchema = z.object({
  replyText: ReplyTextSchema,
  tone: z.enum(Tones),
  characterIntents: z.array(z.enum(CharacterIntents)).max(2),
  taskEvidence: z.array(TaskEvidenceSchema).max(2),
  relationshipEvidence: z.array(RelationshipEvidenceSchema).max(3),
  memoryCandidates: z.array(MemoryCandidateSchema).max(2),
  openLoopUpdates: z.array(OpenLoopUpdateSchema).max(2),
}).strict()

export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export type AllowedMemoryId = z.infer<typeof AllowedMemoryIdSchema>
export type CharacterIntent = (typeof CharacterIntents)[number]
export type TaskEvidenceKind = (typeof TaskEvidenceKinds)[number]
export type RelationshipEvidenceKind = (typeof RelationshipEvidenceKinds)[number]

const ApplicableTaskEvidenceByStage = {
  locked: [],
  invited: ['recognized_malicious_editing'],
  understood: ['accepted_complete_evidence_plan'],
  committed: [],
  published: [],
} as const satisfies Record<ChatRequest['taskStage'], readonly TaskEvidenceKind[]>

export function isRepetitionComplaint(userText: string): boolean {
  return /重复|说过了|刚才说过|又.{0,5}(?:说|发).{0,5}(?:这|同样|一样)|怎么又说|咋又说/.test(userText)
}

function hasSemanticTaskEvidence(request: ChatRequest, kind: TaskEvidenceKind): boolean {
  const userText = request.userText
  if (kind === 'recognized_malicious_editing') {
    const deniesEditing = /(?:不是|并非|不算|不觉得|没觉得).{0,8}(?:恶意剪辑|断章取义|被剪)/.test(userText)
      || /(?:恶意剪辑|断章取义|被剪).{0,8}(?:不存在|不成立|不算)/.test(userText)
    if (deniesEditing) return false
    return /恶意剪辑|断章取义|被剪|原片|原视频|原录像|完整(?:录像|视频|素材|证据|上下文|前后)/.test(userText)
  }
  const refusesPlan = /(?:不想|不愿|不要|别|不能|不可以|拒绝|算了).{0,12}(?:找|查|核对|保存|记录|提供|发送|整理|对照|确认|帮)/.test(userText)
    || /(?:找|查|核对|保存|记录|提供|发送|整理|对照|确认|帮).{0,12}(?:算了|不行|不可以|不要)/.test(userText)
  if (refusesPlan) return false
  const mentionsEvidence = /完整|原片|原视频|录像|素材|证据|时间戳|录音|画面|前后/.test(userText)
  const proposesAction = /找|查|核对|保存|记录|提供|发送|整理|对照|确认|接受|可以|愿意|帮/.test(userText)
  if (mentionsEvidence && proposesAction) return true

  const shortAffirmative = /^(?:好啊?|可以|行啊?|愿意|没问题|那就这样)[。！？]?$/.test(userText)
  if (!shortAffirmative) return false
  const previousAssistant = [...request.recentMessages].reverse().find(message => message.role === 'assistant')?.text ?? ''
  const mentionsPlan = /完整|原片|原视频|录像|素材|证据|时间戳|前后/.test(previousAssistant)
  const invitesAgreement = /一起|要不要|可以吗|愿意|帮|等.{0,8}(?:找|查|核对)|(?:找|查|核对).{0,8}(?:完整|原片|素材)/.test(previousAssistant)
  return mentionsPlan && invitesAgreement
}

function requiresSpendingBoundary(request: ChatRequest): boolean {
  const mentionsSpending = /上票|打赏|刷钱|花钱|消费|冲动/.test(request.userText)
  const expressesConcern = /怕|担心|冲动|劝|停|过度/.test(request.userText)
  return mentionsSpending && (expressesConcern || request.personaSnapshot.dimensions.boundaryPressure >= 2)
}

export function parseChatResponseForRequest(request: ChatRequest, value: unknown): ChatResponse {
  const applicableEvidence = new Set<TaskEvidenceKind>(request.postEnding ? [] : ApplicableTaskEvidenceByStage[request.taskStage])
  const suppliedOpenLoopIds = new Set(
    request.openLoops.filter(openLoop => openLoop.status === 'open').map(openLoop => openLoop.id),
  )
  const normalizedValue = request.turnKind !== 'player_message'
    && typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    ? {
        ...value,
        taskEvidence: [],
        relationshipEvidence: [],
        memoryCandidates: [],
        openLoopUpdates: [],
      }
    : value
  const parsed = ChatResponseSchema.superRefine((response, context) => {
    if (inventsSharedClipViewing(response.replyText)) {
      context.addIssue({
        code: 'custom',
        path: ['replyText'],
        message: 'reply must not invent a shared viewing of the circulating clip',
      })
    }
    if (
      request.turnKind === 'progress_report'
      && /(?:准备|打算).{0,8}(?:发|公开)|(?:晚点|稍后|等我).{0,8}(?:发|公开)|再发/.test(response.replyText)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['replyText'],
        message: 'progress report must describe completed publication',
      })
    }
    if (
      request.turnKind === 'player_message'
      && isRepetitionComplaint(request.userText)
      && /十秒|剪辑|被剪|完整|原片|录像|素材|证据|前因|前后/.test(response.replyText)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['replyText'],
        message: 'repair response must not repeat the task background',
      })
    }
    response.taskEvidence.forEach((evidence, index) => {
      if (evidence.sourceMessageId !== request.currentMessageId) {
        context.addIssue({
          code: 'custom',
          path: ['taskEvidence', index, 'sourceMessageId'],
          message: 'taskEvidence must cite the current player message',
        })
      }
      if (!applicableEvidence.has(evidence.kind)) {
        context.addIssue({
          code: 'custom',
          path: ['taskEvidence', index, 'kind'],
          message: 'taskEvidence contains evidence that does not apply to the request state',
        })
      }
      if (!hasSemanticTaskEvidence(request, evidence.kind)) {
        context.addIssue({
          code: 'custom',
          path: ['taskEvidence', index, 'kind'],
          message: 'taskEvidence is not grounded in the current message meaning',
        })
      }
    })

    if (requiresSpendingBoundary(request) && !response.characterIntents.includes('set_boundary')) {
      context.addIssue({
        code: 'custom',
        path: ['characterIntents'],
        message: 'characterIntents must include set_boundary for a spending concern',
      })
    }

    response.relationshipEvidence.forEach((evidence, index) => {
      if (evidence.sourceMessageId !== request.currentMessageId) {
        context.addIssue({
          code: 'custom',
          path: ['relationshipEvidence', index, 'sourceMessageId'],
          message: 'relationshipEvidence must cite the current player message',
        })
      }
    })

    response.memoryCandidates.forEach((candidate, index) => {
      if (candidate.sourceMessageId !== request.currentMessageId) {
        context.addIssue({
          code: 'custom',
          path: ['memoryCandidates', index, 'sourceMessageId'],
          message: 'memoryCandidates must cite the current player message',
        })
      }
    })

    response.openLoopUpdates.forEach((update, index) => {
      const hasGroundedSource = update.status === 'closed'
        ? suppliedOpenLoopIds.has(update.sourceMessageId)
        : update.sourceMessageId === request.currentMessageId
      if (!hasGroundedSource) {
        context.addIssue({
          code: 'custom',
          path: ['openLoopUpdates', index, 'sourceMessageId'],
          message: update.status === 'closed'
            ? 'closed openLoopUpdates must cite a supplied open loop'
            : 'open openLoopUpdates must cite the current player message',
        })
      }
    })
  }).parse(normalizedValue)
  if (request.turnKind !== 'player_message') return parsed
  const inferredEvidence = [...applicableEvidence].find(kind => hasSemanticTaskEvidence(request, kind))
  if (!inferredEvidence || parsed.taskEvidence.some(evidence => evidence.kind === inferredEvidence)) return parsed
  return {
    ...parsed,
    taskEvidence: [...parsed.taskEvidence, {
      kind: inferredEvidence,
      sourceMessageId: request.currentMessageId,
    }],
  }
}

export const ChatResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'replyText',
    'tone',
    'characterIntents',
    'taskEvidence',
    'relationshipEvidence',
    'memoryCandidates',
    'openLoopUpdates',
  ],
  properties: {
    replyText: { type: 'string' },
    tone: {
      type: 'string',
      enum: [...Tones],
    },
    characterIntents: {
      type: 'array',
      items: { type: 'string', enum: [...CharacterIntents] },
      maxItems: 2,
    },
    taskEvidence: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'sourceMessageId'],
        properties: {
          kind: { type: 'string', enum: [...TaskEvidenceKinds] },
          sourceMessageId: { type: 'string' },
        },
      },
    },
    relationshipEvidence: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'sourceMessageId'],
        properties: {
          kind: { type: 'string', enum: [...RelationshipEvidenceKinds] },
          sourceMessageId: { type: 'string' },
        },
      },
    },
    memoryCandidates: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'sourceMessageId', 'interpretation'],
        properties: {
          type: { type: 'string', enum: [...MemoryTypes] },
          sourceMessageId: { type: 'string' },
          interpretation: { type: 'string' },
        },
      },
    },
    openLoopUpdates: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'summary', 'sourceMessageId', 'status'],
        properties: {
          kind: { type: 'string', enum: [...OpenLoopKinds] },
          summary: { type: 'string' },
          sourceMessageId: { type: 'string' },
          status: { type: 'string', enum: [...OpenLoopStatuses] },
        },
      },
    },
  },
} satisfies ResponseFormatTextJSONSchemaConfig['schema']
