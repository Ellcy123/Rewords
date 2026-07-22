import OpenAI from 'openai'
import type { Response, ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses'
import type { ChatModelClient, StructuredResponseRequest } from './chatService.js'

export interface OpenAIResponsesClient {
  responses: {
    create(request: ResponseCreateParamsNonStreaming): Promise<Pick<Response, 'output_text'>>
  }
}

function createSdkResponsesClient(apiKey: string): OpenAIResponsesClient {
  const client = new OpenAI({ apiKey })
  return {
    responses: {
      create: request => client.responses.create(request),
    },
  }
}

export function createOpenAIChatModel(
  apiKey: string,
  client: OpenAIResponsesClient = createSdkResponsesClient(apiKey),
): ChatModelClient {
  return {
    async generate(request: StructuredResponseRequest): Promise<string> {
      const responseRequest = {
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
      } satisfies ResponseCreateParamsNonStreaming
      const response = await client.responses.create(responseRequest)
      return response.output_text
    },
  }
}
