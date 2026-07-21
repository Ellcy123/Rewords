import { ITEM_BY_ID } from '../content/items'
import { NODE_BY_ID } from '../content/nodes'
import { TRIGGERS } from '../content/triggers'
import type { ItemId, NodeId } from '../content/types'
import type {
  ChatAiEffects,
  ChatMessage,
  LongTermMemory,
  MemoryCandidate,
  OpenLoop,
  OpenLoopUpdate,
  PendingChatDelivery,
  SharedMemory,
} from '../messages/types'
import type { MomentId } from '../moments/types'
import {
  createYanxinPersonaState,
  type RelationshipChange,
  type RelationshipDimension,
  type RelationshipEvidenceKind,
  type RelationshipIdentity,
  type YanxinPersonaState,
  type YanxinShortTermState,
} from '../relationship/personaState'
import type { CharacterTaskState, TaskEvidenceKind, TaskTransitionEffect } from '../relationship/taskEngine'
import {
  createInitialState,
  type ActivityTaskId,
  type EconomyEntry,
  type EndingRecord,
  type GameState,
  type RelationshipEvidence,
  type TutorialStep,
} from './state'

export const SAVE_KEY = 'shuadaonile.save.v1'

export type LoadResult =
  | { kind: 'fresh'; state: GameState }
  | { kind: 'loaded'; state: GameState }
  | { kind: 'requires-reset'; raw: string }

type StoredState = Record<string, unknown>

export function saveGame(storage: Storage, state: GameState): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // Some mobile WebViews expose Storage but deny writes. Gameplay should
    // remain available for the current session even when progress cannot persist.
  }
}

function appendUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list : [...list, value]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isNodeId(value: unknown): value is NodeId {
  return typeof value === 'string' && value in NODE_BY_ID
}

function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && value in ITEM_BY_ID
}

function validArray<T>(value: unknown, guard: (entry: unknown) => entry is T, fallback: T[] = []): T[] {
  return Array.isArray(value) && value.every(guard) ? [...value] : [...fallback]
}

function nodeIds(value: unknown, fallback: NodeId[] = []): NodeId[] {
  if (!Array.isArray(value)) return [...fallback]
  return [...new Set(value.filter(isNodeId))]
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const relationshipDimensions: RelationshipDimension[] = ['closeness', 'trust', 'respect', 'suspicion', 'boundaryPressure']
const relationshipIdentities: RelationshipIdentity[] = ['new_viewer', 'familiar_fan', 'important_supporter', 'private_relationship']
const relationshipEvidenceKinds: RelationshipEvidenceKind[] = [
  'showed_specific_care',
  'respected_boundary',
  'offered_actionable_help',
  'kept_promise',
  'contradicted_action_evidence',
  'revealed_unexplained_knowledge',
  'pressured_after_refusal',
  'public_financial_support',
]
const yanxinEmotions: YanxinShortTermState['emotion'][] = ['guarded', 'steady', 'warm', 'pressured']
const yanxinActivities: YanxinShortTermState['currentActivity'][] = ['post_pk', 'reviewing_footage', 'testing_device', 'following_up']

function clampRelationshipDimension(value: unknown, fallback: number): number {
  if (!isFiniteNumber(value)) return fallback
  return Math.min(5, Math.max(-5, value))
}

function isRelationshipChange(value: unknown): value is RelationshipChange {
  return isRecord(value)
    && typeof value.id === 'string'
    && relationshipDimensions.includes(value.dimension as RelationshipDimension)
    && (value.delta === -2 || value.delta === -1 || value.delta === 1 || value.delta === 2)
    && typeof value.sourceId === 'string'
    && relationshipEvidenceKinds.includes(value.evidenceKind as RelationshipEvidenceKind)
    && isFiniteNumber(value.createdAt)
}

function normalizeYanxinPersona(value: unknown, fallback: YanxinPersonaState): YanxinPersonaState {
  if (!isRecord(value)) return fallback
  const relationship = isRecord(value.relationship) ? value.relationship : {}
  const dimensions = isRecord(relationship.dimensions) ? relationship.dimensions : {}
  const shortTerm = isRecord(value.shortTerm) ? value.shortTerm : {}

  return {
    relationship: {
      identity: relationshipIdentities.includes(relationship.identity as RelationshipIdentity)
        ? relationship.identity as RelationshipIdentity
        : fallback.relationship.identity,
      dimensions: Object.fromEntries(relationshipDimensions.map(dimension => [
        dimension,
        clampRelationshipDimension(dimensions[dimension], fallback.relationship.dimensions[dimension]),
      ])) as YanxinPersonaState['relationship']['dimensions'],
      changes: validArray(relationship.changes, isRelationshipChange).slice(-20),
    },
    shortTerm: {
      emotion: yanxinEmotions.includes(shortTerm.emotion as YanxinShortTermState['emotion'])
        ? shortTerm.emotion as YanxinShortTermState['emotion']
        : fallback.shortTerm.emotion,
      currentActivity: yanxinActivities.includes(shortTerm.currentActivity as YanxinShortTermState['currentActivity'])
        ? shortTerm.currentActivity as YanxinShortTermState['currentActivity']
        : fallback.shortTerm.currentActivity,
    },
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  return isRecord(value)
    && typeof value.id === 'string'
    && (value.role === 'user' || value.role === 'assistant')
    && typeof value.text === 'string'
    && isFiniteNumber(value.createdAt)
}

const taskEvidenceKinds: TaskEvidenceKind[] = ['recognized_malicious_editing', 'accepted_complete_evidence_plan']
const memoryCandidateTypes: MemoryCandidate['type'][] = ['player_stance', 'promise', 'shared_joke', 'conflict', 'preference']
const openLoopUpdateKinds: OpenLoopUpdate['kind'][] = ['promise', 'topic', 'conflict', 'report']

function normalizeAiEffects(value: unknown): ChatAiEffects | null {
  if (!isRecord(value)) return null
  const taskEvidence = validArray(value.taskEvidence, (candidate): candidate is ChatAiEffects['taskEvidence'][number] => (
    isRecord(candidate)
    && taskEvidenceKinds.includes(candidate.kind as TaskEvidenceKind)
    && typeof candidate.sourceMessageId === 'string'
  ))
  const relationshipEvidence = validArray(value.relationshipEvidence, (candidate): candidate is ChatAiEffects['relationshipEvidence'][number] => (
    isRecord(candidate)
    && relationshipEvidenceKinds.includes(candidate.kind as RelationshipEvidenceKind)
    && typeof candidate.sourceMessageId === 'string'
  ))
  const memoryCandidates = validArray(value.memoryCandidates, (candidate): candidate is MemoryCandidate => (
    isRecord(candidate)
    && memoryCandidateTypes.includes(candidate.type as MemoryCandidate['type'])
    && typeof candidate.sourceMessageId === 'string'
    && typeof candidate.interpretation === 'string'
  ))
  const openLoopUpdates = validArray(value.openLoopUpdates, (update): update is OpenLoopUpdate => (
    isRecord(update)
    && openLoopUpdateKinds.includes(update.kind as OpenLoopUpdate['kind'])
    && typeof update.summary === 'string'
    && typeof update.sourceMessageId === 'string'
    && (update.status === 'open' || update.status === 'closed')
  ))
  if (
    taskEvidence.length !== (Array.isArray(value.taskEvidence) ? value.taskEvidence.length : -1)
    || relationshipEvidence.length !== (Array.isArray(value.relationshipEvidence) ? value.relationshipEvidence.length : -1)
    || memoryCandidates.length !== (Array.isArray(value.memoryCandidates) ? value.memoryCandidates.length : -1)
    || openLoopUpdates.length !== (Array.isArray(value.openLoopUpdates) ? value.openLoopUpdates.length : -1)
  ) return null
  return { taskEvidence, relationshipEvidence, memoryCandidates, openLoopUpdates }
}

function normalizePendingDelivery(value: unknown): PendingChatDelivery | null {
  if (
    !isRecord(value)
    || typeof value.id !== 'string'
    || (value.kind !== 'reply' && value.kind !== 'proactive_report' && value.kind !== 'system_fallback_checkpoint')
    || !isChatMessage(value.message)
    || !isFiniteNumber(value.deliverAt)
    || (value.effect !== 'none' && value.effect !== 'unlock_e201')
    || (value.source !== undefined && value.source !== 'system_fallback')
    || (value.kind === 'system_fallback_checkpoint' && value.source !== 'system_fallback')
  ) return null
  const aiEffects = value.aiEffects === undefined
    ? { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] }
    : normalizeAiEffects(value.aiEffects)
  if (!aiEffects) return null
  return {
    id: value.id,
    kind: value.kind,
    message: value.message,
    deliverAt: value.deliverAt,
    aiEffects,
    effect: value.effect,
    source: value.source === 'system_fallback' ? value.source : undefined,
  }
}

function normalizePendingDeliveries(value: unknown): PendingChatDelivery[] {
  if (!Array.isArray(value)) return []
  return value.map(normalizePendingDelivery).filter((delivery): delivery is PendingChatDelivery => delivery !== null)
}

const momentIds: MomentId[] = ['PK_LAST_30_SECONDS']
function isMomentId(value: unknown): value is MomentId {
  return momentIds.includes(value as MomentId)
}

function isRelationshipEvidence(value: unknown): value is RelationshipEvidence {
  return isRecord(value)
    && typeof value.id === 'string'
    && (value.kind === 'support' || value.kind === 'boundary_pressure' || value.kind === 'respect')
    && isMomentId(value.sourceMomentId)
}

function isSharedMemory(value: unknown): value is SharedMemory {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.text === 'string'
    && isFiniteNumber(value.createdAt)
    && (value.sourceNodeId === undefined || isNodeId(value.sourceNodeId))
}

const memoryTypes: LongTermMemory['type'][] = ['player_stance', 'promise', 'shared_joke', 'conflict', 'preference']
function isLongTermMemory(value: unknown): value is LongTermMemory {
  return isRecord(value)
    && typeof value.id === 'string'
    && memoryTypes.includes(value.type as LongTermMemory['type'])
    && typeof value.sourceMessageId === 'string'
    && typeof value.sourceText === 'string'
    && typeof value.interpretation === 'string'
    && isFiniteNumber(value.createdAt)
    && isFiniteNumber(value.lastReferencedAt)
    && typeof value.active === 'boolean'
}

const openLoopKinds: OpenLoop['kind'][] = ['promise', 'topic', 'conflict', 'report']
function isOpenLoop(value: unknown): value is OpenLoop {
  return isRecord(value)
    && typeof value.id === 'string'
    && openLoopKinds.includes(value.kind as OpenLoop['kind'])
    && typeof value.summary === 'string'
    && typeof value.sourceMessageId === 'string'
    && (value.status === 'open' || value.status === 'closed')
    && isFiniteNumber(value.createdAt)
}

function normalizeLongTermMemories(value: unknown, messages: ChatMessage[]): LongTermMemory[] {
  const playerMessages = new Map(messages.filter(message => message.role === 'user').map(message => [message.id, message]))
  const keys = new Set<string>()
  const memories: LongTermMemory[] = []
  let activeCount = 0
  for (const memory of validArray(value, isLongTermMemory)) {
    const source = playerMessages.get(memory.sourceMessageId)
    const key = `${memory.type}:${memory.sourceMessageId}`
    if (!source || source.text !== memory.sourceText || keys.has(key) || (memory.active && activeCount >= 30)) continue
    keys.add(key)
    if (memory.active) activeCount += 1
    memories.push({ ...memory, interpretation: Array.from(memory.interpretation).slice(0, 120).join('') })
  }
  return memories
}

function normalizeOpenLoops(value: unknown, messages: ChatMessage[]): OpenLoop[] {
  const playerMessageIds = new Set(messages.filter(message => message.role === 'user').map(message => message.id))
  const keys = new Set<string>()
  const loops: OpenLoop[] = []
  let openCount = 0
  for (const loop of validArray(value, isOpenLoop)) {
    const key = `${loop.kind}:${loop.sourceMessageId}`
    if (!playerMessageIds.has(loop.sourceMessageId) || keys.has(key) || (loop.status === 'open' && openCount >= 10)) continue
    keys.add(key)
    if (loop.status === 'open') openCount += 1
    loops.push({ ...loop, summary: Array.from(loop.summary).slice(0, 120).join('') })
  }
  return loops
}

const activityTaskIds: ActivityTaskId[] = ['WATCH_THREE', 'LIKE_THREE', 'FAVORITE_TWO']
function isActivityTaskId(value: unknown): value is ActivityTaskId {
  return activityTaskIds.includes(value as ActivityTaskId)
}

function isEconomyEntry(value: unknown): value is EconomyEntry {
  return isRecord(value)
    && typeof value.id === 'string'
    && ['main_reward', 'activity_reward', 'moment_spend', 'item_purchase', 'solvency_subsidy'].includes(String(value.reason))
    && isFiniteNumber(value.amount)
}

function isEnding(value: unknown): value is EndingRecord {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.letter === 'string'
    && typeof value.generatedAt === 'string'
    && typeof value.futureClaimId === 'string'
}

const taskStages = ['locked', 'invited', 'understood', 'committed', 'published'] as const
const transitionEffects: TaskTransitionEffect[] = ['schedule_progress_report', 'mark_published']
interface StoredCharacterTask {
  taskId: CharacterTaskState['taskId']
  stage: CharacterTaskState['stage']
  lastEvidenceSourceId?: unknown
  lastCheckpointSource?: unknown
  emittedEffects: TaskTransitionEffect[]
  unlockedResponseNodeIds: NodeId[]
}

function isCharacterTask(value: unknown): value is StoredCharacterTask {
  return isRecord(value)
    && value.taskId === 'YANXIN_UNCUT_EVIDENCE'
    && taskStages.includes(value.stage as typeof taskStages[number])
    && Array.isArray(value.emittedEffects)
    && value.emittedEffects.every(effect => transitionEffects.includes(effect as TaskTransitionEffect))
    && Array.isArray(value.unlockedResponseNodeIds)
    && value.unlockedResponseNodeIds.every(isNodeId)
}

function normalizeCharacterTask(value: unknown, fallback: CharacterTaskState): CharacterTaskState {
  if (!isCharacterTask(value)) return fallback
  return {
    taskId: value.taskId,
    stage: value.stage,
    lastEvidenceSourceId: typeof value.lastEvidenceSourceId === 'string' ? value.lastEvidenceSourceId : null,
    lastCheckpointSource: value.lastCheckpointSource === 'ai' || value.lastCheckpointSource === 'system_fallback'
      ? value.lastCheckpointSource
      : null,
    emittedEffects: [...value.emittedEffects],
    unlockedResponseNodeIds: [...value.unlockedResponseNodeIds],
  }
}

function repairLegacyW200(value: StoredState): StoredState {
  const listKeys = ['unlockedNodeIds', 'feedNodeIds', 'viewedNodeIds', 'resolvedNodeIds'] as const
  const reachedW200 = value.currentNodeId === 'W200'
    || value.pendingResultNodeId === 'W200'
    || listKeys.some(key => Array.isArray(value[key]) && value[key].includes('W200'))
  if (!reachedW200) return value

  const withoutW200 = (candidate: unknown) => Array.isArray(candidate)
    ? candidate.filter(id => id !== 'W200')
    : []
  const resolvedNodeIds = withoutW200(value.resolvedNodeIds)
  const shouldActivateW300 = value.completed !== true && !resolvedNodeIds.includes('W300')
  const unlockedNodeIds = appendUnique(withoutW200(value.unlockedNodeIds), 'W300')
  const feedWithoutW200 = withoutW200(value.feedNodeIds)

  return {
    ...value,
    unlockedNodeIds,
    feedNodeIds: shouldActivateW300 ? appendUnique(feedWithoutW200, 'W300') : feedWithoutW200,
    viewedNodeIds: withoutW200(value.viewedNodeIds),
    resolvedNodeIds,
    currentNodeId: value.currentNodeId === 'W200' ? 'W300' : value.currentNodeId,
    pendingResultNodeId: value.pendingResultNodeId === 'W200' ? null : value.pendingResultNodeId,
  }
}

function normalizeState(value: StoredState): GameState {
  const fresh = createInitialState()
  const storedInventory = isRecord(value.inventory) ? value.inventory : null
  const inventory = storedInventory
    ? Object.fromEntries((Object.keys(fresh.inventory) as ItemId[]).map(id => [
      id,
      isFiniteNumber(storedInventory[id]) ? storedInventory[id] : fresh.inventory[id],
    ])) as Record<ItemId, number>
    : fresh.inventory
  const characterTasks = {
    YANXIN_UNCUT_EVIDENCE: normalizeCharacterTask(
      isRecord(value.characterTasks) ? value.characterTasks.YANXIN_UNCUT_EVIDENCE : undefined,
      fresh.characterTasks.YANXIN_UNCUT_EVIDENCE,
    ),
  }
  const tutorialSteps: TutorialStep[] = ['product', 'gift', 'target', 'done']
  const messages = validArray(value.messages, isChatMessage)

  return {
    version: 5,
    coins: isFiniteNumber(value.coins) ? value.coins : fresh.coins,
    inventory,
    discoveredItemIds: validArray(value.discoveredItemIds, isItemId, fresh.discoveredItemIds),
    unlockedNodeIds: nodeIds(value.unlockedNodeIds, fresh.unlockedNodeIds),
    viewedNodeIds: nodeIds(value.viewedNodeIds),
    likedNodeIds: nodeIds(value.likedNodeIds),
    favoritedNodeIds: nodeIds(value.favoritedNodeIds),
    resolvedNodeIds: nodeIds(value.resolvedNodeIds),
    feedNodeIds: nodeIds(value.feedNodeIds, fresh.feedNodeIds),
    triggeredKeys: validArray(value.triggeredKeys, isString),
    destinyNodeIds: nodeIds(value.destinyNodeIds),
    currentNodeId: isNodeId(value.currentNodeId) ? value.currentNodeId : fresh.currentNodeId,
    pendingResultNodeId: value.pendingResultNodeId === null || isNodeId(value.pendingResultNodeId)
      ? value.pendingResultNodeId
      : null,
    completed: typeof value.completed === 'boolean' ? value.completed : fresh.completed,
    tutorialStep: tutorialSteps.includes(value.tutorialStep as TutorialStep) ? value.tutorialStep as TutorialStep : fresh.tutorialStep,
    muted: typeof value.muted === 'boolean' ? value.muted : fresh.muted,
    relationshipEvidence: validArray(value.relationshipEvidence, isRelationshipEvidence),
    characterTasks,
    resolvedMomentIds: validArray(value.resolvedMomentIds, isMomentId),
    messages,
    readMessageIds: validArray(value.readMessageIds, isString),
    pendingChatDeliveries: normalizePendingDeliveries(value.pendingChatDeliveries),
    yanxinProviderFailureCount: isFiniteNumber(value.yanxinProviderFailureCount)
      ? Math.max(0, Math.floor(value.yanxinProviderFailureCount))
      : 0,
    sharedMemories: validArray(value.sharedMemories, isSharedMemory),
    longTermMemories: normalizeLongTermMemories(value.longTermMemories, messages),
    openLoops: normalizeOpenLoops(value.openLoops, messages),
    claimedActivityTaskIds: validArray(value.claimedActivityTaskIds, isActivityTaskId),
    ledger: validArray(value.ledger, isEconomyEntry),
    ending: value.ending === null || value.ending === undefined ? null : isEnding(value.ending) ? value.ending : null,
    yanxinPersona: normalizeYanxinPersona(value.yanxinPersona, fresh.yanxinPersona),
  }
}

function migrateV1(value: StoredState): GameState {
  const triggerKeys = validArray(value.triggeredKeys, isString)
  let resolvedNodeIds = TRIGGERS
    .filter(trigger => trigger.kind !== 'wrong' && triggerKeys.includes(`${trigger.targetNodeId}:${trigger.itemId}`))
    .map(trigger => trigger.targetNodeId)

  if (value.completed === true) resolvedNodeIds = appendUnique(resolvedNodeIds, 'W400')

  const migrated = normalizeState({ ...value, resolvedNodeIds })
  return { ...migrated, feedNodeIds: migrated.feedNodeIds.filter(id => !resolvedNodeIds.includes(id)) }
}

export function loadGame(storage: Storage, now: () => number = Date.now): LoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(SAVE_KEY)
  } catch {
    return { kind: 'fresh', state: createInitialState() }
  }
  if (!raw) return { kind: 'fresh', state: createInitialState() }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) throw new Error('Save root must be an object')
    const value = repairLegacyW200(parsed)
    if (value.version === 1) return { kind: 'loaded', state: migrateV1(value) }
    if (value.version === 2 || value.version === 3 || value.version === 4 || value.version === 5) {
      return { kind: 'loaded', state: normalizeState(value) }
    }
    return { kind: 'requires-reset', raw }
  } catch {
    try {
      storage.setItem(`shuadaonile.save-corrupt-${now()}`, raw)
      storage.removeItem(SAVE_KEY)
    } catch {
      // Storage cleanup is best-effort in restricted mobile browsers.
    }
    return { kind: 'fresh', state: createInitialState() }
  }
}
