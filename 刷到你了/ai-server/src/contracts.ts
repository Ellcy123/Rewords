import { z } from 'zod'
import type { ResponseFormatTextJSONSchemaConfig } from 'openai/resources/responses/responses'

export const TaskSignals = [
  'acknowledge_pressure',
  'offer_evidence_plan',
  'respect_boundary',
] as const

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
  return Array.from(value).every(character => isHanCharacter(character) || ChinesePunctuation.has(character))
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
  currentMessageId: IdSchema,
  userText: codePointString(1, 300, 'userText'),
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

export function parseChatResponseForRequest(request: ChatRequest, value: unknown): ChatResponse {
  const applicableEvidence = new Set<TaskEvidenceKind>(request.postEnding ? [] : ApplicableTaskEvidenceByStage[request.taskStage])
  return ChatResponseSchema.superRefine((response, context) => {
    if (response.taskEvidence.some(evidence => !applicableEvidence.has(evidence.kind))) {
      context.addIssue({
        code: 'custom',
        path: ['taskEvidence'],
        message: 'taskEvidence contains evidence that does not apply to the request state',
      })
    }
  }).parse(value)
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
