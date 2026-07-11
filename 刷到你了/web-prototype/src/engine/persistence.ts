import { createInitialState, type GameState } from './state'

export const SAVE_KEY = 'shuadaonile.save.v1'

export type LoadResult =
  | { kind: 'fresh'; state: GameState }
  | { kind: 'loaded'; state: GameState }
  | { kind: 'requires-reset'; raw: string }

export function saveGame(storage: Storage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function loadGame(storage: Storage, now: () => number = Date.now): LoadResult {
  const raw = storage.getItem(SAVE_KEY)
  if (!raw) return { kind: 'fresh', state: createInitialState() }
  try {
    const value = JSON.parse(raw) as Partial<GameState>
    if (value.version !== 1) return { kind: 'requires-reset', raw }
    return { kind: 'loaded', state: value as GameState }
  } catch {
    storage.setItem(`shuadaonile.save-corrupt-${now()}`, raw)
    storage.removeItem(SAVE_KEY)
    return { kind: 'fresh', state: createInitialState() }
  }
}
