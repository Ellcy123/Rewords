import { randomUUID } from 'node:crypto'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { generateYanxinChat, type ChatModelClient, type FallbackReason } from './chatService.js'
import { ChatRequestSchema } from './contracts.js'

export interface RequestLogRecord {
  requestId: string
  latencyMs: number
  status: number
  fallbackReason: FallbackReason | 'invalid_request' | 'rate_limited' | null
}

export interface CreateAppDependencies {
  modelClient: ChatModelClient
  model: string
  timeoutMs?: number
  logger?: (record: RequestLogRecord) => void
}

const defaultLogger = (record: RequestLogRecord) => console.info(JSON.stringify(record))

export function createApp({
  modelClient,
  model,
  timeoutMs = 7_000,
  logger = defaultLogger,
}: CreateAppDependencies) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))
  app.use((_request, response, next) => {
    const requestId = randomUUID()
    const startedAt = Date.now()
    response.on('finish', () => {
      logger({
        requestId,
        latencyMs: Math.max(0, Date.now() - startedAt),
        status: response.statusCode,
        fallbackReason: response.locals.fallbackReason ?? null,
      })
    })
    next()
  })

  app.use('/api/chat', rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, response) => {
      response.locals.fallbackReason = 'rate_limited'
      response.status(429).json({ code: 'RATE_LIMITED' })
    },
  }))

  app.post('/api/chat', async (request, response) => {
    const parsed = ChatRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      response.locals.fallbackReason = 'invalid_request'
      response.status(400).json({ code: 'INVALID_REQUEST' })
      return
    }

    try {
      const reply = await generateYanxinChat(parsed.data, modelClient, model, timeoutMs)
      response.status(200).json(reply)
    } catch (error) {
      response.locals.fallbackReason = error instanceof Error && error.name === 'ProviderUnavailableError'
        ? (error.message as FallbackReason)
        : 'provider_error'
      response.status(503).json({ code: 'AI_UNAVAILABLE' })
    }
  })

  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (response.headersSent) {
      next(error)
      return
    }
    response.locals.fallbackReason = 'invalid_request'
    response.status(400).json({ code: 'INVALID_REQUEST' })
  })

  return app
}
