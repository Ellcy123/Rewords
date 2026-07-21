import { z } from 'zod'
import { buildAllowedContext } from './allowedContext.js'
import {
  ChatResponseJsonSchema,
  isRepetitionComplaint,
  parseChatResponseForRequest,
  type ChatRequest,
  type ChatResponse,
} from './contracts.js'
import { createYanxinInstructions, createYanxinPrompt } from './prompts/yanxin.js'
import { isRepetitiveReply } from './replyQuality.js'
import type { ResponseFormatTextJSONSchemaConfig } from 'openai/resources/responses/responses'

export interface StructuredResponseRequest {
  model: string
  instructions: string
  input: string
  schema: ResponseFormatTextJSONSchemaConfig['schema']
}

export interface ChatModelClient {
  generate(request: StructuredResponseRequest): Promise<unknown>
}

export type FallbackReason = 'provider_timeout' | 'provider_error' | 'invalid_provider_output' | 'repetitive_provider_output'

class RepetitiveProviderOutputError extends Error {
  constructor() {
    super('repetitive_provider_output')
    this.name = 'RepetitiveProviderOutputError'
  }
}

export class ProviderUnavailableError extends Error {
  constructor(readonly reason: FallbackReason) {
    super(reason)
    this.name = 'ProviderUnavailableError'
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new ProviderUnavailableError('provider_timeout')), timeoutMs)
  })

  try {
    return await Promise.race([operation, timeout])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

function parseProviderOutput(request: ChatRequest, output: unknown): ChatResponse {
  const candidate = typeof output === 'string' ? JSON.parse(output) : output
  return parseChatResponseForRequest(request, candidate)
}

function repairGuidance(error: z.ZodError | SyntaxError | RepetitiveProviderOutputError): string {
  if (error instanceof RepetitiveProviderOutputError) {
    return '上一次回复与最近回复重复。重新理解玩家当前消息并生成有实质新内容的回答，不得复述、近义改写或解释上一条回复。'
  }
  if (error instanceof z.ZodError && error.issues.some(issue => issue.message === 'repair response must not repeat the task background')) {
    return '上一次没有完成对话纠错。必须重写回复内容：只承认自己刚才重复并把话题交还给玩家，禁止复述任务背景或为重复辩解。JSON 结构保持完整，tone 仍只能使用 guarded、warm、teasing、serious。'
  }
  if (error instanceof z.ZodError && error.issues.some(issue => issue.message === 'reply must not invent a shared viewing of the circulating clip')) {
    return '上一次回复虚构了双方共同看过网络剪辑。必须重写回复内容：玩家没有看过网上流传的十秒剪辑，只能说明你已经核对完成，不能使用“咱们看到”“我们看过”或同类共同经历表述。JSON 结构保持完整，tone 仍只能使用 guarded、warm、teasing、serious。'
  }
  if (error instanceof z.ZodError && error.issues.some(issue => issue.message === 'progress report must describe completed publication')) {
    return '上一次把已经完成的主动报备写成了未来计划。必须重写回复内容：完整证据已经核对完成，整理后的版本也已经发出；只能报备已完成结果，不能说准备、晚点、稍后或再发。JSON 结构保持完整，tone 仍只能使用 guarded、warm、teasing、serious。'
  }
  const issues = error instanceof z.ZodError
    ? error.issues.map(issue => `${issue.path.join('.') || 'root'}:${issue.code}:${issue.message}`).join('、')
    : 'root:invalid_json'
  return `上一次输出未通过结构校验（${issues}）。只修正 JSON 类型、字段和枚举，不添加解释或额外字段。`
}

function turnSpecificInstructions(request: ChatRequest): string {
  if (request.turnKind === 'player_message' && isRepetitionComplaint(request.userText)) {
    return '【本轮强制要求】本轮是重复纠错回合。只处理玩家对重复的反馈：承认自己的表达问题并让玩家继续说。禁止复述任务背景，禁止解释为什么重复，禁止把责任推给玩家。'
  }
  return ''
}

export async function generateYanxinChat(
  request: ChatRequest,
  modelClient: ChatModelClient,
  model: string,
  timeoutMs: number,
): Promise<ChatResponse> {
  const context = buildAllowedContext(request)
  const modelRequest: StructuredResponseRequest = {
    model,
    instructions: [createYanxinInstructions(), turnSpecificInstructions(request)].filter(Boolean).join('\n'),
    input: JSON.stringify(createYanxinPrompt(context)),
    schema: ChatResponseJsonSchema,
  }
  try {
    return await withTimeout((async () => {
      let attemptRequest = modelRequest
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const output = await modelClient.generate(attemptRequest)
          const parsed = parseProviderOutput(request, output)
          if (isRepetitiveReply(parsed.replyText, request.recentMessages)) {
            throw new RepetitiveProviderOutputError()
          }
          return parsed
        } catch (error) {
          if (attempt === 0 && (
            error instanceof z.ZodError
            || error instanceof SyntaxError
            || error instanceof RepetitiveProviderOutputError
          )) {
            attemptRequest = {
              ...modelRequest,
              instructions: `${modelRequest.instructions}\n${repairGuidance(error)}`,
            }
            continue
          }
          throw error
        }
      }
      throw new ProviderUnavailableError('invalid_provider_output')
    })(), timeoutMs)
  } catch (error) {
    if (error instanceof ProviderUnavailableError) throw error
    if (error instanceof RepetitiveProviderOutputError) {
      throw new ProviderUnavailableError('repetitive_provider_output')
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      throw new ProviderUnavailableError('invalid_provider_output')
    }
    throw new ProviderUnavailableError('provider_error')
  }
}
