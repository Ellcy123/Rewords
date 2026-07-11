import { TRIGGERS } from '../content/triggers'
import { NODE_BY_ID } from '../content/nodes'
import type { NodeId } from '../content/types'
import { createInitialState, type GameState } from './state'

export const SAVE_KEY = 'shuadaonile.save.v1'

export type LoadResult =
  | { kind: 'fresh'; state: GameState }
  | { kind: 'loaded'; state: GameState }
  | { kind: 'requires-reset'; raw: string }

type StoredState = Partial<Omit<GameState,
  | 'version'
  | 'unlockedNodeIds'
  | 'viewedNodeIds'
  | 'resolvedNodeIds'
  | 'feedNodeIds'
  | 'destinyNodeIds'
  | 'currentNodeId'
  | 'pendingResultNodeId'
>> & {
  version?: number
  unlockedNodeIds?: string[]
  viewedNodeIds?: string[]
  resolvedNodeIds?: string[]
  feedNodeIds?: string[]
  destinyNodeIds?: string[]
  currentNodeId?: string
  pendingResultNodeId?: string | null
}

export function saveGame(storage: Storage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state))
}

function appendUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list : [...list, value]
}

function isNodeId(value: string): value is NodeId {
  return value in NODE_BY_ID
}

function normalizeNodeIds(values: string[] | undefined, fallback: NodeId[] = []): NodeId[] {
  return [...new Set((values ?? fallback).filter(isNodeId))]
}

function repairLegacyW200(value: StoredState): StoredState {
  const lists = [value.unlockedNodeIds, value.feedNodeIds, value.viewedNodeIds, value.resolvedNodeIds]
  const reachedW200 = value.currentNodeId === 'W200' || value.pendingResultNodeId === 'W200' || lists.some(list => list?.includes('W200'))
  if (!reachedW200) return value

  const withoutW200 = (list: string[] | undefined) => (list ?? []).filter(id => id !== 'W200')
  const resolvedNodeIds = withoutW200(value.resolvedNodeIds)
  const shouldActivateW300 = !value.completed && !resolvedNodeIds.includes('W300')
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
  const currentNodeId = value.currentNodeId && isNodeId(value.currentNodeId) ? value.currentNodeId : fresh.currentNodeId
  const pendingResultNodeId = value.pendingResultNodeId && isNodeId(value.pendingResultNodeId) ? value.pendingResultNodeId : null
  return {
    ...fresh,
    ...value,
    version: 3,
    inventory: { ...fresh.inventory, ...value.inventory },
    unlockedNodeIds: normalizeNodeIds(value.unlockedNodeIds, fresh.unlockedNodeIds),
    viewedNodeIds: normalizeNodeIds(value.viewedNodeIds),
    resolvedNodeIds: normalizeNodeIds(value.resolvedNodeIds),
    feedNodeIds: normalizeNodeIds(value.feedNodeIds, fresh.feedNodeIds),
    destinyNodeIds: normalizeNodeIds(value.destinyNodeIds),
    currentNodeId,
    pendingResultNodeId,
  }
}

function migrateV1(value: StoredState): GameState {
  const triggerKeys = value.triggeredKeys ?? []
  let resolvedNodeIds = TRIGGERS
    .filter(trigger => trigger.kind !== 'wrong' && triggerKeys.includes(`${trigger.targetNodeId}:${trigger.itemId}`))
    .map(trigger => trigger.targetNodeId)

  if (value.completed) resolvedNodeIds = appendUnique(resolvedNodeIds, 'W400')

  const migrated = normalizeState({ ...value, resolvedNodeIds })
  return { ...migrated, feedNodeIds: migrated.feedNodeIds.filter(id => !resolvedNodeIds.includes(id)) }
}

export function loadGame(storage: Storage, now: () => number = Date.now): LoadResult {
  const raw = storage.getItem(SAVE_KEY)
  if (!raw) return { kind: 'fresh', state: createInitialState() }
  try {
    const value = repairLegacyW200(JSON.parse(raw) as StoredState)
    if (value.version === 1) return { kind: 'loaded', state: migrateV1(value) }
    if (value.version === 2 || value.version === 3) return { kind: 'loaded', state: normalizeState(value) }
    return { kind: 'requires-reset', raw }
  } catch {
    storage.setItem(`shuadaonile.save-corrupt-${now()}`, raw)
    storage.removeItem(SAVE_KEY)
    return { kind: 'fresh', state: createInitialState() }
  }
}
