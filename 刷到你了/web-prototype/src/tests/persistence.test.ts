import { describe, expect, it } from 'vitest'
import { loadGame, SAVE_KEY, saveGame } from '../engine/persistence'
import { createInitialState } from '../engine/state'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('persistence', () => {
  it('round trips versioned player state without static content', () => {
    const storage = memoryStorage()
    storage.clear()
    saveGame(storage, createInitialState())
    expect(storage.getItem(SAVE_KEY)).not.toContain('婚礼灯架事故')
    expect(loadGame(storage, () => 42)).toEqual({ kind: 'loaded', state: createInitialState() })
  })

  it('backs up corrupt JSON and returns a fresh state', () => {
    const storage = memoryStorage()
    storage.setItem(SAVE_KEY, '{bad')
    const result = loadGame(storage, () => 42)
    expect(storage.getItem('shuadaonile.save-corrupt-42')).toBe('{bad')
    expect(result.kind).toBe('fresh')
  })

  it('requires reset for unsupported versions', () => {
    const storage = memoryStorage()
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 99 }))
    expect(loadGame(storage, () => 42).kind).toBe('requires-reset')
  })
})
