import { TRIGGERS } from '../content/triggers'
import { createInitialState, type GameState } from './state'

export const SAVE_KEY = 'shuadaonile.save.v1'

export type LoadResult =
  | { kind: 'fresh'; state: GameState }
  | { kind: 'loaded'; state: GameState }
  | { kind: 'requires-reset'; raw: string }

type StoredState = Partial<Omit<GameState, 'version'>> & { version?: number }

export function saveGame(storage: Storage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state))
}

function appendUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list : [...list, value]
}

function normalizeState(value: StoredState): GameState {
  const fresh = createInitialState()
  return {
    ...fresh,
    ...value,
    version: 2,
    inventory: { ...fresh.inventory, ...value.inventory },
    resolvedNodeIds: value.resolvedNodeIds ?? [],
  }
}

function migrateV1(value: StoredState): GameState {
  const triggerKeys = value.triggeredKeys ?? []
  let resolvedNodeIds = TRIGGERS
    .filter(trigger => trigger.kind !== 'wrong' && triggerKeys.includes(`${trigger.targetNodeId}:${trigger.itemId}`))
    .map(trigger => trigger.targetNodeId)

  if (value.unlockedNodeIds?.includes('W300')) resolvedNodeIds = appendUnique(resolvedNodeIds, 'W200')
  if (value.completed) resolvedNodeIds = appendUnique(resolvedNodeIds, 'W400')

  const migrated = normalizeState({ ...value, resolvedNodeIds })
  return { ...migrated, feedNodeIds: migrated.feedNodeIds.filter(id => !resolvedNodeIds.includes(id)) }
}

export function loadGame(storage: Storage, now: () => number = Date.now): LoadResult {
  const raw = storage.getItem(SAVE_KEY)
  if (!raw) return { kind: 'fresh', state: createInitialState() }
  try {
    const value = JSON.parse(raw) as StoredState
    if (value.version === 1) return { kind: 'loaded', state: migrateV1(value) }
    if (value.version !== 2) return { kind: 'requires-reset', raw }
    return { kind: 'loaded', state: normalizeState(value) }
  } catch {
    storage.setItem(`shuadaonile.save-corrupt-${now()}`, raw)
    storage.removeItem(SAVE_KEY)
    return { kind: 'fresh', state: createInitialState() }
  }
}
