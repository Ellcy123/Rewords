import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp } from './app.js'
import { createDeepSeekChatModel } from './deepseekClient.js'
import { createOpenAIChatModel } from './openaiClient.js'

export interface ServerConfig {
  provider: 'openai' | 'deepseek'
  apiKey: string
  model: string
  port: number
}

export function loadServerConfig(environment: NodeJS.ProcessEnv): ServerConfig {
  const provider = environment.AI_PROVIDER?.trim().toLowerCase() || 'openai'
  if (provider !== 'openai' && provider !== 'deepseek') {
    throw new Error('AI_PROVIDER must be openai or deepseek')
  }
  const keyName = provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'OPENAI_API_KEY'
  const modelName = provider === 'deepseek' ? 'DEEPSEEK_MODEL' : 'OPENAI_MODEL'
  const apiKey = environment[keyName]?.trim()
  if (!apiKey) throw new Error(`Missing required environment variable: ${keyName}`)

  const model = environment[modelName]?.trim()
  if (!model) throw new Error(`Missing required environment variable: ${modelName}`)

  const portText = environment.PORT?.trim() || '8787'
  const port = Number(portText)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return { provider, apiKey, model, port }
}

export function startServer(environment: NodeJS.ProcessEnv = process.env) {
  const config = loadServerConfig(environment)
  const app = createApp({
    model: config.model,
    modelClient: config.provider === 'deepseek'
      ? createDeepSeekChatModel(config.apiKey)
      : createOpenAIChatModel(config.apiKey),
  })
  return app.listen(config.port)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.loadEnvFile(resolve(process.cwd(), '.env'))
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }
  startServer()
}
