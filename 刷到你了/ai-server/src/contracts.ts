import { z } from 'zod'
import type { ResponseFormatTextJSONSchemaConfig } from 'openai/resources/responses/responses'

export const TaskSignals = [
  'acknowledge_pressure',
  'offer_evidence_plan',
  'respect_boundary',
] as const

export const Tones = ['guarded', 'warm', 'teasing', 'serious'] as const

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
const TransactionOrGiftPattern = /购买|出售|卖给|送给|送你|赠送|换成|商品/

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
    || (TransactionOrGiftPattern.test(value) && !value.includes('录音笔'))
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

export const ChatRequestSchema = z.object({
  characterId: z.literal('yanxin'),
  userText: codePointString(1, 300, 'userText'),
  taskStage: z.enum(['locked', 'invited', 'understood', 'committed', 'published']),
  momentChoice: z.enum(['support', 'hold_back']),
  recentMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: codePointString(1, 300, 'recentMessages.text'),
  }).strict()).max(12),
  allowedMemoryIds: z.array(AllowedMemoryIdSchema).max(AllowedMemoryIds.length),
  postEnding: z.boolean(),
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
  taskSignals: z.array(z.enum(TaskSignals)).max(2),
  tone: z.enum(Tones),
}).strict()

export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export type AllowedMemoryId = z.infer<typeof AllowedMemoryIdSchema>

const ApplicableSignalsByStage = {
  locked: [],
  invited: ['acknowledge_pressure', 'respect_boundary'],
  understood: ['offer_evidence_plan'],
  committed: [],
  published: [],
} as const satisfies Record<ChatRequest['taskStage'], readonly (typeof TaskSignals)[number][]>

export function parseChatResponseForRequest(request: ChatRequest, value: unknown): ChatResponse {
  const applicableSignals = new Set(request.postEnding ? [] : ApplicableSignalsByStage[request.taskStage])
  return ChatResponseSchema.superRefine((response, context) => {
    if (response.taskSignals.some(signal => !applicableSignals.has(signal))) {
      context.addIssue({
        code: 'custom',
        path: ['taskSignals'],
        message: 'taskSignals contain a signal that does not apply to the request state',
      })
    }
  }).parse(value)
}

export const ChatResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['replyText', 'taskSignals', 'tone'],
  properties: {
    replyText: { type: 'string' },
    taskSignals: {
      type: 'array',
      items: { type: 'string', enum: [...TaskSignals] },
    },
    tone: {
      type: 'string',
      enum: [...Tones],
    },
  },
} satisfies ResponseFormatTextJSONSchemaConfig['schema']
