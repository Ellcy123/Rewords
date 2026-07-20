import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp } from './app.js'
import { createOpenAIChatModel } from './openaiClient.js'

export interface ServerConfig {
  apiKey: string
  model: string
  port: number
}

export function loadServerConfig(environment: NodeJS.ProcessEnv): ServerConfig {
  const apiKey = environment.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('Missing required environment variable: OPENAI_API_KEY')

  const model = environment.OPENAI_MODEL?.trim()
  if (!model) throw new Error('Missing required environment variable: OPENAI_MODEL')

  const portText = environment.PORT?.trim() || '8787'
  const port = Number(portText)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return { apiKey, model, port }
}

export function startServer(environment: NodeJS.ProcessEnv = process.env) {
  const config = loadServerConfig(environment)
  const app = createApp({
    model: config.model,
    modelClient: createOpenAIChatModel(config.apiKey),
  })
  return app.listen(config.port)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startServer()
}
