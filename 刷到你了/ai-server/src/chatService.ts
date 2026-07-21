import { z } from 'zod'
import { buildAllowedContext } from './allowedContext.js'
import {
  ChatResponseJsonSchema,
  parseChatResponseForRequest,
  type ChatRequest,
  type ChatResponse,
} from './contracts.js'
import { createYanxinPrompt } from './prompts/yanxin.js'
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

export type FallbackReason = 'provider_timeout' | 'provider_error' | 'invalid_provider_output'

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

export async function generateYanxinChat(
  request: ChatRequest,
  modelClient: ChatModelClient,
  model: string,
  timeoutMs: number,
): Promise<ChatResponse> {
  const context = buildAllowedContext(request)
  try {
    const output = await withTimeout(modelClient.generate({
      model,
      instructions: createYanxinPrompt(),
      input: JSON.stringify({
        currentMessageId: request.currentMessageId,
        userText: request.userText,
        taskStage: request.taskStage,
        momentChoice: context.momentChoice,
        allowedMemories: context.memories,
        relationshipProduct: context.relationshipProduct,
        postEnding: request.postEnding,
        personaSnapshot: request.personaSnapshot,
        openLoops: request.openLoops.filter(loop => loop.status === 'open'),
        memories: request.memories,
        recentMessages: request.recentMessages,
      }),
      schema: ChatResponseJsonSchema,
    }), timeoutMs)
    return parseProviderOutput(request, output)
  } catch (error) {
    if (error instanceof ProviderUnavailableError) throw error
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      throw new ProviderUnavailableError('invalid_provider_output')
    }
    throw new ProviderUnavailableError('provider_error')
  }
}
