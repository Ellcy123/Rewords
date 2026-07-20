import { describe, expect, it } from 'vitest'
import { gameReducer } from '../engine/reducer'
import { createInitialState } from '../engine/state'

const buy = (state: ReturnType<typeof createInitialState>, itemId: 'ladder' | 'technician' | 'recorder' | 'projector') => gameReducer(state, { type: 'BUY_ITEM', itemId })

describe('game reducer', () => {
  it('starts with the three roots and tutorial money', () => {
    const state = createInitialState()
    expect(state.coins).toBe(100)
    expect(state.feedNodeIds).toEqual(['W001', 'C001', 'K001'])
    expect(state.discoveredItemIds).toEqual(['ladder', 'technician'])
  })

  it('buys and gives a correct item', () => {
    const bought = buy(createInitialState(), 'ladder')
    expect(bought.coins).toBe(80)
    expect(bought.inventory.ladder).toBe(1)
    const result = gameReducer(bought, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'ladder' })
    expect(result.inventory.ladder).toBe(0)
    expect(result.pendingResultNodeId).toBeNull()
    expect(result.currentNodeId).toBe('W101')
    expect(result.unlockedNodeIds).toContain('W101')
    expect(result.resolvedNodeIds).toContain('W001')
    expect(result.feedNodeIds).not.toContain('W001')
    expect(result.feedNodeIds).toContain('W101')
  })

  it('records wrong results without replacing the route and is idempotent', () => {
    const bought = buy(createInitialState(), 'technician')
    const wrong = gameReducer(bought, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'technician' })
    expect(wrong.destinyNodeIds).toEqual(['X001'])
    expect(wrong.feedNodeIds).not.toContain('X001')
    expect(wrong.resolvedNodeIds).not.toContain('W001')
    expect(wrong.feedNodeIds).toContain('W001')
    const replay = gameReducer({ ...wrong, inventory: { ...wrong.inventory, technician: 1 } }, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'technician' })
    expect(replay.inventory.technician).toBe(1)
    expect(replay.destinyNodeIds).toEqual(['X001'])
  })

  it('opens W300 immediately after the technician resolves W101', () => {
    const state = createInitialState()
    state.inventory.technician = 1
    state.unlockedNodeIds.push('W101')
    state.feedNodeIds.push('W101')
    const result = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'W101', itemId: 'technician' })
    expect(result.currentNodeId).toBe('W300')
    expect(result.pendingResultNodeId).toBeNull()
    expect(result.feedNodeIds).toContain('W300')
    expect(result.unlockedNodeIds).toContain('E001')
    expect(result.feedNodeIds).toContain('E001')
  })

  it('completes on W400 result', () => {
    const complete = gameReducer({ ...createInitialState(), feedNodeIds: ['W400'], pendingResultNodeId: 'W400' }, { type: 'RESULT_FINISHED', nodeId: 'W400' })
    expect(complete.completed).toBe(true)
    expect(complete.resolvedNodeIds).toContain('W400')
  })

  it('does not buy without coins and can claim demo coins', () => {
    const empty = { ...createInitialState(), coins: 0 }
    expect(gameReducer(empty, { type: 'BUY_ITEM', itemId: 'ladder' })).toEqual(empty)
    expect(gameReducer(empty, { type: 'CLAIM_DEMO_COINS' }).coins).toBe(100)
  })

  it('recovers only unresolved unlocked nodes', () => {
    const empty = {
      ...createInitialState(),
      feedNodeIds: [],
      resolvedNodeIds: ['W001'],
      unlockedNodeIds: ['W001', 'C001', 'K001'],
    } as ReturnType<typeof createInitialState>
    expect(gameReducer(empty, { type: 'RECOVER_FEED' }).feedNodeIds).toEqual(['C001', 'K001'])
  })
})
