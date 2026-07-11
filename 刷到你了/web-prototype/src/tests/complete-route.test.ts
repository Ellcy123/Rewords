import { describe, expect, it } from 'vitest'
import type { ItemId } from '../content/types'
import { rankFeed } from '../engine/feed'
import { gameReducer } from '../engine/reducer'
import { createInitialState, type GameState } from '../engine/state'

function grant(state: GameState, itemId: ItemId, count = 1): GameState {
  return { ...state, inventory: { ...state.inventory, [itemId]: state.inventory[itemId] + count } }
}

describe('complete wedding route', () => {
  it('reaches W400 while every correctly replaced source leaves the active feed', () => {
    let state = grant(createInitialState(), 'ladder', 2)
    state = grant(state, 'technician')

    state = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'K001', itemId: 'ladder' })
    state = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'ladder' })
    state = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'W101', itemId: 'technician' })
    state = gameReducer(state, { type: 'RESULT_FINISHED', nodeId: 'W200' })
    state = gameReducer(state, { type: 'NODE_FINISHED', nodeId: 'W200' })

    state = grant(state, 'recorder', 2)
    state = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'C001', itemId: 'recorder' })
    state = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'W300', itemId: 'recorder' })
    state = grant(state, 'projector')
    state = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'W301', itemId: 'projector' })
    state = gameReducer(state, { type: 'RESULT_FINISHED', nodeId: 'W400' })

    expect(state.completed).toBe(true)
    expect(state.resolvedNodeIds).toEqual(expect.arrayContaining(['K001', 'W001', 'W101', 'W200', 'C001', 'W300', 'W301', 'W400']))
    expect(state.resolvedNodeIds.filter(id => rankFeed(state).includes(id))).toEqual([])
  })
})
