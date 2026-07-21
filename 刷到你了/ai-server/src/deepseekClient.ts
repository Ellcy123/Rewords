import OpenAI from 'openai'
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'
import type { ChatModelClient, StructuredResponseRequest } from './chatService.js'

interface DeepSeekCompletionResult {
  choices: Array<{ message: { content: string | null } }>
}

export interface DeepSeekChatClient {
  chat: {
    completions: {
      create(request: ChatCompletionCreateParamsNonStreaming): Promise<DeepSeekCompletionResult>
    }
  }
}

function createSdkDeepSeekClient(apiKey: string): DeepSeekChatClient {
  const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' })
  return {
    chat: {
      completions: {
        create: request => client.chat.completions.create(request),
      },
    },
  }
}

function jsonInstructions(instructions: string): string {
  return [
    instructions,
    '只输出一个 JSON 对象，不要输出 Markdown、代码围栏或解释。',
    'JSON 必须严格使用这个形状：',
    '{"replyText":"一条中文私信","taskSignals":[],"tone":"warm"}',
    'taskSignals 只能使用 acknowledge_pressure、offer_evidence_plan、respect_boundary，最多两个。',
    'tone 只能使用 guarded、warm、teasing、serious。',
  ].join('\n')
}

export function createDeepSeekChatModel(
  apiKey: string,
  client: DeepSeekChatClient = createSdkDeepSeekClient(apiKey),
): ChatModelClient {
  return {
    async generate(request: StructuredResponseRequest): Promise<string> {
      const completion = await client.chat.completions.create({
        model: request.model,
        messages: [
          { role: 'system', content: jsonInstructions(request.instructions) },
          { role: 'user', content: request.input },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        stream: false,
      })
      const content = completion.choices[0]?.message.content
      if (!content?.trim()) throw new Error('DeepSeek returned empty content')
      return content
    },
  }
}
