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
      expect(result.state.version).toBe(4)
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
      expect(result.state.version).toBe(4)
      expect(result.state.currentNodeId).toBe('W300')
      expect(result.state.pendingResultNodeId).toBeNull()
      expect(result.state.unlockedNodeIds).toContain('W300')
      expect(result.state.feedNodeIds).toContain('W300')
      expect(JSON.stringify(result.state)).not.toContain('W200')
    }
  })

  it('migrates an exact version-3 fixture without changing core progress', () => {
    const storage = memoryStorage()
    const legacy = {
      version: 3,
      coins: 47,
      inventory: { ladder: 1, technician: 0, recorder: 1, projector: 0 },
      discoveredItemIds: ['ladder', 'technician', 'recorder'],
      unlockedNodeIds: ['W001', 'W101', 'W300'],
      viewedNodeIds: ['W001'],
      resolvedNodeIds: ['W001', 'W101'],
      feedNodeIds: ['W300'],
      triggeredKeys: ['W001:ladder', 'W101:technician'],
      destinyNodeIds: [],
      currentNodeId: 'W300',
      pendingResultNodeId: null,
      completed: false,
      tutorialStep: 'done',
      muted: true,
    }
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))
    const result = loadGame(storage)
    expect(result.kind).toBe('loaded')
    if (result.kind === 'loaded') {
      expect(result.state).toMatchObject({
        version: 4,
        coins: 47,
        inventory: legacy.inventory,
        currentNodeId: 'W300',
        resolvedNodeIds: ['W001', 'W101'],
        completed: false,
        relationshipEvidence: [],
        resolvedMomentIds: [],
        messages: [],
        pendingChatDeliveries: [],
        sharedMemories: [],
        claimedActivityTaskIds: [],
        ledger: [],
        ending: null,
      })
    }
  })

  it('falls back only malformed version-4 array fields', () => {
    const storage = memoryStorage()
    const stored = {
      ...createInitialState(),
      coins: 61,
      viewedNodeIds: ['W001'],
      relationshipEvidence: 'broken',
      messages: [{ id: 'm1', role: 'assistant', text: '还在。', createdAt: 10 }],
      pendingChatDeliveries: [{ broken: true }],
    }
    storage.setItem(SAVE_KEY, JSON.stringify(stored))
    const result = loadGame(storage)
    expect(result.kind).toBe('loaded')
    if (result.kind === 'loaded') {
      expect(result.state.coins).toBe(61)
      expect(result.state.viewedNodeIds).toEqual(['W001'])
      expect(result.state.relationshipEvidence).toEqual([])
      expect(result.state.messages).toEqual(stored.messages)
      expect(result.state.pendingChatDeliveries).toEqual([])
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
