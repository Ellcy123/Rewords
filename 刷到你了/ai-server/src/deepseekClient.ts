import OpenAI from 'openai'
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'
import type { ChatModelClient, StructuredResponseRequest } from './chatService.js'

interface DeepSeekCompletionResult {
  choices: Array<{ message: { content: string | null } }>
}

type DeepSeekCompletionRequest = ChatCompletionCreateParamsNonStreaming & {
  thinking: { type: 'disabled' }
}

export interface DeepSeekChatClient {
  chat: {
    completions: {
      create(request: DeepSeekCompletionRequest): Promise<DeepSeekCompletionResult>
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

function jsonInstructions(instructions: string, schema: StructuredResponseRequest['schema']): string {
  return [
    instructions,
    '只输出一个 JSON 对象，不要输出 Markdown、代码围栏或解释。',
    'JSON 必须严格使用这个形状：',
    '{"replyText":"一条中文私信","tone":"warm","characterIntents":["fan_maintenance"],"taskEvidence":[],"relationshipEvidence":[],"memoryCandidates":[],"openLoopUpdates":[]}',
    'characterIntents 最多两个，只能使用 fan_maintenance、thank、banter、probe、explain、share、confirm_promise、set_boundary、handle_conflict、end_topic、advance_task。',
    'taskEvidence、relationshipEvidence、memoryCandidates、openLoopUpdates 必须是 JSON 数组；没有候选时输出空数组。',
    'tone 只能使用 guarded、warm、teasing、serious。',
    '输出必须逐项符合以下 JSON Schema，包括数组元素对象的字段和枚举：',
    JSON.stringify(schema),
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
          { role: 'system', content: jsonInstructions(request.instructions, request.schema) },
          { role: 'user', content: request.input },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1_000,
        thinking: { type: 'disabled' },
        stream: false,
      })
      const content = completion.choices[0]?.message.content
      if (!content?.trim()) throw new Error('DeepSeek returned empty content')
      return content
    },
  }
}
