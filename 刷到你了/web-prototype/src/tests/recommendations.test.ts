import { describe, expect, it } from 'vitest'
import { selectGiftOptions } from '../engine/recommendations'
import { createInitialState } from '../engine/state'

describe('gift recommendations', () => {
  it('marks an owned correct gift as recommended and selectable', () => {
    const state = createInitialState()
    state.inventory.ladder = 1
    expect(selectGiftOptions(state, 'W001').find(option => option.item.id === 'ladder')).toMatchObject({
      recommended: true,
      availability: 'owned',
    })
  })

  it('sends a discovered correct gift to purchase when none is owned', () => {
    expect(selectGiftOptions(createInitialState(), 'W001').find(option => option.item.id === 'ladder')).toMatchObject({
      recommended: true,
      availability: 'buy',
    })
  })

  it('routes an undiscovered correct gift to its active discovery video', () => {
    expect(selectGiftOptions(createInitialState(), 'W300').find(option => option.item.id === 'recorder')).toMatchObject({
      recommended: true,
      availability: 'find',
      destinationNodeId: 'K001',
    })
  })

  it('does not expose a clue route that is no longer active', () => {
    const state = createInitialState()
    state.feedNodeIds = state.feedNodeIds.filter(id => id !== 'K001')
    expect(selectGiftOptions(state, 'W300').find(option => option.item.id === 'recorder')).toMatchObject({
      recommended: true,
      availability: 'unavailable',
    })
  })
})
