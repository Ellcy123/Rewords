import { z } from 'zod'

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

const replyTextPattern = /^[\p{Script=Han}，。！？、；：…（）《》“”‘’—]+$/u

export const ChatRequestSchema = z.object({
  characterId: z.literal('yanxin'),
  userText: z.string().trim().min(1).max(300),
  taskStage: z.enum(['locked', 'invited', 'understood', 'committed', 'published']),
  momentChoice: z.enum(['support', 'hold_back']),
  recentMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().trim().min(1).max(300),
  }).strict()).max(12),
  allowedMemoryIds: z.array(AllowedMemoryIdSchema).max(AllowedMemoryIds.length),
  postEnding: z.boolean(),
}).strict()

export const ChatResponseSchema = z.object({
  replyText: z.string().trim().min(1).max(120).refine(
    value => replyTextPattern.test(value),
    'replyText must contain only Chinese characters and Chinese punctuation',
  ),
  taskSignals: z.array(z.enum(TaskSignals)).max(2),
  tone: z.enum(Tones),
}).strict()

export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export type AllowedMemoryId = z.infer<typeof AllowedMemoryIdSchema>

export const ChatResponseJsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['replyText', 'taskSignals', 'tone'],
  properties: {
    replyText: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
      pattern: '^[\\p{Script=Han}，。！？、；：…（）《》“”‘’—]+$',
    },
    taskSignals: {
      type: 'array',
      maxItems: 2,
      items: { type: 'string', enum: [...TaskSignals] },
    },
    tone: {
      type: 'string',
      enum: [...Tones],
    },
  },
}
