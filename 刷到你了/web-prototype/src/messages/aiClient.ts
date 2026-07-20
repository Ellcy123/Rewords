import type { MomentChoiceId } from '../moments/types'
import type { CharacterTaskStage, TaskSignal } from '../relationship/taskEngine'

export interface ChatRequest {
  characterId: 'yanxin'
  userText: string
  taskStage: CharacterTaskStage
  momentChoice: MomentChoiceId
  recentMessages: Array<{ role: 'user' | 'assistant'; text: string }>
  allowedMemoryIds: string[]
  postEnding: boolean
}

export interface ChatResponse {
  replyText: string
  taskSignals: TaskSignal[]
  tone: 'guarded' | 'warm' | 'teasing' | 'serious'
}

export type ChatFailureReason = 'timeout' | 'network' | 'http' | 'invalid'
export type ChatResult = { ok: true; data: ChatResponse } | { ok: false; reason: ChatFailureReason }

const SIGNALS = new Set<TaskSignal>(['acknowledge_pressure', 'offer_evidence_plan', 'respect_boundary'])
const TONES = new Set<ChatResponse['tone']>(['guarded', 'warm', 'teasing', 'serious'])

function isChatResponse(value: unknown): value is ChatResponse {
  if (!value || typeof value !== 'object') return false
  const keys = Object.keys(value).sort()
  if (keys.join(',') !== 'replyText,taskSignals,tone') return false
  const candidate = value as Partial<ChatResponse>
  return typeof candidate.replyText === 'string'
    && candidate.replyText.trim().length > 0
    && Array.from(candidate.replyText).length <= 120
    && Array.isArray(candidate.taskSignals)
    && candidate.taskSignals.length <= 2
    && candidate.taskSignals.every(signal => SIGNALS.has(signal))
    && typeof candidate.tone === 'string'
    && TONES.has(candidate.tone as ChatResponse['tone'])
}

function boundRequest(request: ChatRequest): ChatRequest {
  return {
    ...request,
    userText: Array.from(request.userText).slice(0, 300).join(''),
    recentMessages: request.recentMessages.slice(-12).map(message => ({
      role: message.role,
      text: Array.from(message.text).slice(0, 300).join(''),
    })),
    allowedMemoryIds: [...request.allowedMemoryIds],
  }
}

export async function requestYanxinReply(
  request: ChatRequest,
  fetcher: typeof fetch = fetch,
): Promise<ChatResult> {
  const controller = new AbortController()
  let timedOut = false
  let timeoutId: number | undefined

  try {
    const requestPromise = fetcher('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boundRequest(request)),
      signal: controller.signal,
    })
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = window.setTimeout(() => {
        timedOut = true
        controller.abort()
        reject(new DOMException('AI request timed out', 'AbortError'))
      }, 8_000)
    })
    const response = await Promise.race([requestPromise, timeoutPromise])
    if (!response.ok) return { ok: false, reason: 'http' }
    let data: unknown
    try {
      data = await response.json()
    } catch {
      return { ok: false, reason: 'invalid' }
    }
    return isChatResponse(data) ? { ok: true, data } : { ok: false, reason: 'invalid' }
  } catch {
    return { ok: false, reason: timedOut ? 'timeout' : 'network' }
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
}
