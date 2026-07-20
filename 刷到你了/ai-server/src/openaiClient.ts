import OpenAI from 'openai'
import type { ChatModelClient, StructuredResponseRequest } from './chatService.js'

interface ResponsesApi {
  create(request: {
    model: string
    instructions: string
    input: string
    text: {
      format: {
        type: 'json_schema'
        name: string
        strict: true
        schema: Record<string, unknown>
      }
    }
  }): Promise<{ output_text: string }>
}

export interface OpenAIResponsesClient {
  responses: ResponsesApi
}

export function createOpenAIChatModel(
  apiKey: string,
  client: OpenAIResponsesClient = new OpenAI({ apiKey }) as unknown as OpenAIResponsesClient,
): ChatModelClient {
  return {
    async generate(request: StructuredResponseRequest): Promise<string> {
      const response = await client.responses.create({
        model: request.model,
        instructions: request.instructions,
        input: request.input,
        text: {
          format: {
            type: 'json_schema',
            name: 'yanxin_chat_response',
            strict: true,
            schema: request.schema,
          },
        },
      })
      return response.output_text
    },
  }
}
