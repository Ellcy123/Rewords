import { describe, expect, it } from 'vitest'
import { loadGame, SAVE_KEY, saveGame } from '../engine/persistence'
import { createInitialState, type GameState } from '../engine/state'

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
    const state = createInitialState()
    state.characterTasks.YANXIN_UNCUT_EVIDENCE = {
      ...state.characterTasks.YANXIN_UNCUT_EVIDENCE,
      stage: 'understood',
      lastEvidenceSourceId: 'user-grounded-evidence',
    }
    saveGame(storage, state)
    expect(storage.getItem(SAVE_KEY)).not.toContain('婚礼灯架事故')
    expect(loadGame(storage, () => 42)).toEqual({ kind: 'loaded', state })
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
      expect(result.state.version).toBe(5)
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
      expect(result.state.version).toBe(5)
      expect(result.state.currentNodeId).toBe('W300')
      expect(result.state.pendingResultNodeId).toBeNull()
      expect(result.state.unlockedNodeIds).toContain('W300')
      expect(result.state.feedNodeIds).toContain('W300')
      expect(JSON.stringify(result.state)).not.toContain('W200')
    }
  })

  it('round trips version-5 structured memories and open loops', () => {
    const storage = memoryStorage()
    const state = createInitialState()
    state.messages = [{ id: 'user-1', role: 'user', text: '你先核对，我等你。', createdAt: 10 }]
    state.longTermMemories = [{
      id: 'memory-promise-user-1', type: 'promise', sourceMessageId: 'user-1',
      sourceText: '你先核对，我等你。', interpretation: '玩家答应等我核对完再判断。',
      createdAt: 20, lastReferencedAt: 20, active: true,
    }]
    state.openLoops = [{
      id: 'open-loop-report-user-1', kind: 'report', summary: '等待核对结果',
      sourceMessageId: 'user-1', status: 'open', createdAt: 20,
    }]

    saveGame(storage, state)

    expect(loadGame(storage)).toEqual({ kind: 'loaded', state })
  })

  it('migrates a version 4 save without losing chat or task progress', () => {
    const storage = memoryStorage()
    const message = { id: 'user-legacy', role: 'user' as const, text: '你先查清楚。', createdAt: 10 }
    const legacy = { ...createInitialState(), version: 4, messages: [message] }
    delete (legacy as Partial<GameState>).yanxinPersona
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))

    const loaded = loadGame(storage)

    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') return
    expect(loaded.state.version).toBe(5)
    expect(loaded.state.messages).toEqual([message])
    expect(loaded.state.characterTasks).toEqual(legacy.characterTasks)
    expect(loaded.state.yanxinPersona.relationship.identity).toBe('new_viewer')
  })

  it('migrates a legacy task without using its fallback turn count', () => {
    const storage = memoryStorage()
    const legacy = createInitialState() as unknown as Record<string, unknown>
    legacy.characterTasks = {
      YANXIN_UNCUT_EVIDENCE: {
        taskId: 'YANXIN_UNCUT_EVIDENCE',
        stage: 'invited',
        relevantFallbackTurns: 99,
        emittedEffects: [],
        unlockedResponseNodeIds: [],
      },
    }
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))

    const loaded = loadGame(storage)

    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') return
    expect(loaded.state.characterTasks.YANXIN_UNCUT_EVIDENCE).toEqual({
      taskId: 'YANXIN_UNCUT_EVIDENCE',
      stage: 'invited',
      lastEvidenceSourceId: null,
      lastCheckpointSource: null,
      emittedEffects: [],
      unlockedResponseNodeIds: [],
    })
  })

  it('migrates a legacy pending delivery without applying its task signals', () => {
    const storage = memoryStorage()
    const legacy = createInitialState() as unknown as Record<string, unknown>
    legacy.pendingChatDeliveries = [{
      id: 'legacy-delivery',
      kind: 'reply',
      message: { id: 'legacy-reply', role: 'assistant', text: '旧回复', createdAt: 10 },
      deliverAt: 20,
      taskSignals: ['acknowledge_pressure'],
      effect: 'none',
    }]
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))

    const loaded = loadGame(storage)

    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') return
    expect(loaded.state.pendingChatDeliveries).toEqual([{
      id: 'legacy-delivery',
      kind: 'reply',
      message: { id: 'legacy-reply', role: 'assistant', text: '旧回复', createdAt: 10 },
      deliverAt: 20,
      aiEffects: { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] },
      effect: 'none',
    }])
  })

  it('clamps persisted relationship dimensions and keeps only the newest twenty changes', () => {
    const storage = memoryStorage()
    const changes = Array.from({ length: 21 }, (_, index) => ({
      id: `change-${index}`,
      dimension: 'trust',
      delta: 1,
      sourceId: `source-${index}`,
      evidenceKind: 'kept_promise',
      createdAt: index,
    }))
    const stored = {
      ...createInitialState(),
      yanxinPersona: {
        ...createInitialState().yanxinPersona,
        relationship: {
          identity: 'familiar_fan',
          dimensions: { closeness: -7, trust: 8, respect: 3, suspicion: -3, boundaryPressure: 0 },
          changes,
        },
      },
    }
    storage.setItem(SAVE_KEY, JSON.stringify(stored))

    const loaded = loadGame(storage)

    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') return
    expect(loaded.state.yanxinPersona.relationship.dimensions).toEqual({
      closeness: -5, trust: 5, respect: 3, suspicion: -3, boundaryPressure: 0,
    })
    expect(loaded.state.yanxinPersona.relationship.changes).toEqual(changes.slice(-20))
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
        version: 5,
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

  it('falls back only malformed version-5 array fields', () => {
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
