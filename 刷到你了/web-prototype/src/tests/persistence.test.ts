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

  it('migrates a version-1 save and derives resolved sources', () => {
    const storage = memoryStorage()
    const legacy = {
      ...createInitialState(),
      version: 1,
      triggeredKeys: ['W001:ladder'],
      unlockedNodeIds: ['W001', 'W101'],
      feedNodeIds: ['W001', 'W101'],
    } as Record<string, unknown>
    delete legacy.resolvedNodeIds
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))
    const result = loadGame(storage)
    expect(result.kind).toBe('loaded')
    if (result.kind === 'loaded') {
      expect(result.state.version).toBe(3)
      expect(result.state.resolvedNodeIds).toEqual(['W001'])
      expect(result.state.feedNodeIds).toEqual(['W101'])
    }
  })

  it('moves a version-2 save stopped at W200 directly to W300', () => {
    const storage = memoryStorage()
    const legacy = {
      ...createInitialState(),
      version: 2,
      unlockedNodeIds: ['W001', 'W101', 'W200'],
      feedNodeIds: ['W200'],
      currentNodeId: 'W200',
      pendingResultNodeId: 'W200',
      viewedNodeIds: ['W200'],
      resolvedNodeIds: ['W001', 'W101', 'W200'],
    }
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))
    const result = loadGame(storage)
    expect(result.kind).toBe('loaded')
    if (result.kind === 'loaded') {
      expect(result.state.version).toBe(3)
      expect(result.state.currentNodeId).toBe('W300')
      expect(result.state.pendingResultNodeId).toBeNull()
      expect(result.state.unlockedNodeIds).toContain('W300')
      expect(result.state.feedNodeIds).toContain('W300')
      expect(JSON.stringify(result.state)).not.toContain('W200')
    }
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
