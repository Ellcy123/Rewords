import type { ChatMessage, LongTermMemory, MemoryCandidate, OpenLoop, OpenLoopUpdate } from './types'

const MAX_ACTIVE_MEMORIES = 30
const MAX_OPEN_LOOPS = 10
const MAX_TEXT_CODE_POINTS = 120

function limitText(value: string): string {
  return Array.from(value).slice(0, MAX_TEXT_CODE_POINTS).join('')
}

function playerMessagesById(messages: ChatMessage[]): Map<string, ChatMessage> {
  return new Map(messages.filter(message => message.role === 'user').map(message => [message.id, message]))
}

function memoryKey(memory: Pick<LongTermMemory, 'type' | 'sourceMessageId'>): string {
  return `${memory.type}:${memory.sourceMessageId}`
}

function openLoopKey(loop: Pick<OpenLoop, 'kind' | 'sourceMessageId'>): string {
  return `${loop.kind}:${loop.sourceMessageId}`
}

export function applyMemoryCandidates(
  existing: LongTermMemory[],
  candidates: MemoryCandidate[],
  messages: ChatMessage[],
  now: number,
): LongTermMemory[] {
  const memories: LongTermMemory[] = []
  const keys = new Set<string>()
  let activeCount = 0
  for (const memory of existing) {
    const key = memoryKey(memory)
    if (keys.has(key) || (memory.active && activeCount >= MAX_ACTIVE_MEMORIES)) continue
    keys.add(key)
    if (memory.active) activeCount += 1
    memories.push(memory)
  }

  const playerMessages = playerMessagesById(messages)
  for (const candidate of candidates) {
    const key = memoryKey(candidate)
    const source = playerMessages.get(candidate.sourceMessageId)
    if (!source || keys.has(key) || activeCount >= MAX_ACTIVE_MEMORIES) continue
    keys.add(key)
    activeCount += 1
    memories.push({
      id: `memory-${candidate.type}-${candidate.sourceMessageId}`,
      type: candidate.type,
      sourceMessageId: candidate.sourceMessageId,
      sourceText: source.text,
      interpretation: limitText(candidate.interpretation),
      createdAt: now,
      lastReferencedAt: now,
      active: true,
    })
  }
  return memories
}

export function applyOpenLoopUpdates(
  existing: OpenLoop[],
  updates: OpenLoopUpdate[],
  messages: ChatMessage[],
  now: number,
): OpenLoop[] {
  const loops = new Map<string, OpenLoop>()
  for (const loop of existing) {
    const key = openLoopKey(loop)
    if (!loops.has(key)) loops.set(key, loop)
  }

  const playerMessages = playerMessagesById(messages)
  for (const update of updates) {
    const key = openLoopKey(update)
    if (!playerMessages.has(update.sourceMessageId)) continue
    const current = loops.get(key)
    loops.set(key, current
      ? { ...current, summary: limitText(update.summary), status: update.status }
      : {
          id: `open-loop-${update.kind}-${update.sourceMessageId}`,
          kind: update.kind,
          summary: limitText(update.summary),
          sourceMessageId: update.sourceMessageId,
          status: update.status,
          createdAt: now,
        })
  }

  const result: OpenLoop[] = []
  let openCount = 0
  for (const loop of loops.values()) {
    if (loop.status === 'open' && openCount >= MAX_OPEN_LOOPS) continue
    if (loop.status === 'open') openCount += 1
    result.push(loop)
  }
  return result
}
