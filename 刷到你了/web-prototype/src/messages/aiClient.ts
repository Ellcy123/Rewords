import type { MomentChoiceId } from '../moments/types'
import type { YanxinPersonaState } from '../relationship/personaState'
import type { CharacterTaskStage } from '../relationship/taskEngine'
import type { LongTermMemory, MemoryCandidate, OpenLoop, OpenLoopUpdate } from './types'

export type CharacterIntent = 'fan_maintenance' | 'thank' | 'banter' | 'probe' | 'explain' | 'share' | 'confirm_promise' | 'set_boundary' | 'handle_conflict' | 'end_topic' | 'advance_task'
export type TaskEvidenceKind = 'recognized_malicious_editing' | 'accepted_complete_evidence_plan'
export type RelationshipEvidenceKind = 'showed_specific_care' | 'respected_boundary' | 'offered_actionable_help' | 'kept_promise' | 'contradicted_action_evidence' | 'revealed_unexplained_knowledge' | 'pressured_after_refusal' | 'public_financial_support'
export type ChatTurnKind = 'first_contact' | 'player_message' | 'progress_report'

export const AllowedMemoryIds = [
  'yanxin_pk_choice_support',
  'yanxin_pk_choice_hold_back',
  'yanxin_evidence_task_completed',
  'yanxin_evidence_method_helped_bride',
  'bride_wedding_result_completed',
] as const

export type AllowedMemoryId = (typeof AllowedMemoryIds)[number]

export interface TaskEvidenceCandidate {
  kind: TaskEvidenceKind
  sourceMessageId: string
}

export interface RelationshipEvidenceCandidate {
  kind: RelationshipEvidenceKind
  sourceMessageId: string
}

export type ChatMemory = Pick<LongTermMemory, 'id' | 'type' | 'sourceMessageId' | 'sourceText' | 'interpretation'>
export type ChatOpenLoop = Pick<OpenLoop, 'id' | 'kind' | 'summary' | 'sourceMessageId' | 'status'>

export interface ChatRequest {
  characterId: 'yanxin'
  turnKind: ChatTurnKind
  currentMessageId: string
  userText: string
  taskStage: CharacterTaskStage
  momentChoice: MomentChoiceId
  recentMessages: Array<{ role: 'user' | 'assistant'; text: string }>
  allowedMemoryIds: AllowedMemoryId[]
  postEnding: boolean
  personaSnapshot: {
    relationshipIdentity: YanxinPersonaState['relationship']['identity']
    dimensions: YanxinPersonaState['relationship']['dimensions']
    shortTerm: YanxinPersonaState['shortTerm']
  }
  memories: ChatMemory[]
  openLoops: ChatOpenLoop[]
}

export interface ChatResponse {
  replyText: string
  tone: 'guarded' | 'warm' | 'teasing' | 'serious'
  characterIntents: CharacterIntent[]
  taskEvidence: TaskEvidenceCandidate[]
  relationshipEvidence: RelationshipEvidenceCandidate[]
  memoryCandidates: MemoryCandidate[]
  openLoopUpdates: OpenLoopUpdate[]
}

export type ChatFailureReason = 'timeout' | 'network' | 'http' | 'invalid'
export type ChatResult = { ok: true; data: ChatResponse } | { ok: false; reason: ChatFailureReason }

const CHARACTER_INTENTS = new Set<CharacterIntent>(['fan_maintenance', 'thank', 'banter', 'probe', 'explain', 'share', 'confirm_promise', 'set_boundary', 'handle_conflict', 'end_topic', 'advance_task'])
const TASK_EVIDENCE_KINDS = new Set<TaskEvidenceKind>(['recognized_malicious_editing', 'accepted_complete_evidence_plan'])
const RELATIONSHIP_EVIDENCE_KINDS = new Set<RelationshipEvidenceKind>(['showed_specific_care', 'respected_boundary', 'offered_actionable_help', 'kept_promise', 'contradicted_action_evidence', 'revealed_unexplained_knowledge', 'pressured_after_refusal', 'public_financial_support'])
const MEMORY_TYPES = new Set<MemoryCandidate['type']>(['player_stance', 'promise', 'shared_joke', 'conflict', 'preference'])
const OPEN_LOOP_KINDS = new Set<OpenLoopUpdate['kind']>(['promise', 'topic', 'conflict', 'report'])
const OPEN_LOOP_STATUSES = new Set<OpenLoopUpdate['status']>(['open', 'closed'])
const TONES = new Set<ChatResponse['tone']>(['guarded', 'warm', 'teasing', 'serious'])
const CHINESE_PUNCTUATION = new Set(Array.from('，。！？、；：…（）《》“”‘’—'))
const HAN_CHARACTER = /^\p{Script=Han}$/u
const ALLOWED_MEMORY_IDS = new Set<string>(AllowedMemoryIds)

export function isAllowedMemoryId(value: string): value is AllowedMemoryId {
  return ALLOWED_MEMORY_IDS.has(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(',') === [...keys].sort().join(',')
}

function isBoundedString(value: unknown, maximum = 120): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Array.from(value).length <= maximum
}

function isChineseReply(value: unknown): value is string {
  return isBoundedString(value)
    && Array.from(value.replaceAll('PK', '')).every(character => HAN_CHARACTER.test(character) || CHINESE_PUNCTUATION.has(character))
}

function isTaskEvidence(value: unknown): value is TaskEvidenceCandidate {
  if (!isRecord(value) || !hasExactKeys(value, ['kind', 'sourceMessageId'])) return false
  return TASK_EVIDENCE_KINDS.has(value.kind as TaskEvidenceKind) && isBoundedString(value.sourceMessageId)
}

function isRelationshipEvidence(value: unknown): value is RelationshipEvidenceCandidate {
  if (!isRecord(value) || !hasExactKeys(value, ['kind', 'sourceMessageId'])) return false
  return RELATIONSHIP_EVIDENCE_KINDS.has(value.kind as RelationshipEvidenceKind) && isBoundedString(value.sourceMessageId)
}

function isMemoryCandidate(value: unknown): value is MemoryCandidate {
  if (!isRecord(value) || !hasExactKeys(value, ['type', 'sourceMessageId', 'interpretation'])) return false
  return MEMORY_TYPES.has(value.type as MemoryCandidate['type'])
    && isBoundedString(value.sourceMessageId)
    && isBoundedString(value.interpretation)
}

function isOpenLoopUpdate(value: unknown): value is OpenLoopUpdate {
  if (!isRecord(value) || !hasExactKeys(value, ['kind', 'summary', 'sourceMessageId', 'status'])) return false
  return OPEN_LOOP_KINDS.has(value.kind as OpenLoopUpdate['kind'])
    && isBoundedString(value.summary)
    && isBoundedString(value.sourceMessageId)
    && OPEN_LOOP_STATUSES.has(value.status as OpenLoopUpdate['status'])
}

function isChatResponse(value: unknown): value is ChatResponse {
  if (!isRecord(value)) return false
  if (!hasExactKeys(value, ['replyText', 'tone', 'characterIntents', 'taskEvidence', 'relationshipEvidence', 'memoryCandidates', 'openLoopUpdates'])) return false
  const candidate = value as Partial<ChatResponse>
  return isChineseReply(candidate.replyText)
    && typeof candidate.tone === 'string'
    && TONES.has(candidate.tone as ChatResponse['tone'])
    && Array.isArray(candidate.characterIntents)
    && candidate.characterIntents.length <= 2
    && candidate.characterIntents.every(intent => CHARACTER_INTENTS.has(intent))
    && Array.isArray(candidate.taskEvidence)
    && candidate.taskEvidence.length <= 2
    && candidate.taskEvidence.every(isTaskEvidence)
    && Array.isArray(candidate.relationshipEvidence)
    && candidate.relationshipEvidence.length <= 3
    && candidate.relationshipEvidence.every(isRelationshipEvidence)
    && Array.isArray(candidate.memoryCandidates)
    && candidate.memoryCandidates.length <= 2
    && candidate.memoryCandidates.every(isMemoryCandidate)
    && Array.isArray(candidate.openLoopUpdates)
    && candidate.openLoopUpdates.length <= 2
    && candidate.openLoopUpdates.every(isOpenLoopUpdate)
}

function boundText(value: string, maximum: number): string {
  return Array.from(value).slice(0, maximum).join('')
}

function boundDimension(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(-5, Math.min(5, Math.trunc(value)))
}

function boundRequest(request: ChatRequest): ChatRequest {
  return {
    characterId: 'yanxin',
    turnKind: request.turnKind,
    currentMessageId: boundText(request.currentMessageId, 120),
    userText: boundText(request.userText, 300),
    taskStage: request.taskStage,
    momentChoice: request.momentChoice,
    recentMessages: request.recentMessages.slice(-12).map(message => ({
      role: message.role,
      text: boundText(message.text, 300),
    })),
    allowedMemoryIds: [...new Set(request.allowedMemoryIds.filter(isAllowedMemoryId))].slice(0, AllowedMemoryIds.length),
    postEnding: request.postEnding,
    personaSnapshot: {
      relationshipIdentity: request.personaSnapshot.relationshipIdentity,
      dimensions: {
        closeness: boundDimension(request.personaSnapshot.dimensions.closeness),
        trust: boundDimension(request.personaSnapshot.dimensions.trust),
        respect: boundDimension(request.personaSnapshot.dimensions.respect),
        suspicion: boundDimension(request.personaSnapshot.dimensions.suspicion),
        boundaryPressure: boundDimension(request.personaSnapshot.dimensions.boundaryPressure),
      },
      shortTerm: { ...request.personaSnapshot.shortTerm },
    },
    memories: request.memories.slice(-10).map(memory => ({
      id: boundText(memory.id, 120),
      type: memory.type,
      sourceMessageId: boundText(memory.sourceMessageId, 120),
      sourceText: boundText(memory.sourceText, 300),
      interpretation: boundText(memory.interpretation, 120),
    })),
    openLoops: request.openLoops.slice(-5).map(openLoop => ({
      id: boundText(openLoop.id, 120),
      kind: openLoop.kind,
      summary: boundText(openLoop.summary, 120),
      sourceMessageId: boundText(openLoop.sourceMessageId, 120),
      status: openLoop.status,
    })),
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
