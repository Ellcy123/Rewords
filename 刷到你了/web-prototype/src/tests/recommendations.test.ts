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

  it('keeps the relationship product unavailable before its response video is delivered', () => {
    expect(selectGiftOptions(createInitialState(), 'W300').find(option => option.item.id === 'recorder')).toMatchObject({
      recommended: true,
      availability: 'unavailable',
    })
  })

  it('routes an undiscovered relationship product to its active response video', () => {
    const state = createInitialState()
    state.unlockedNodeIds.push('E201')
    state.feedNodeIds.push('E201')
    expect(selectGiftOptions(state, 'W300').find(option => option.item.id === 'recorder')).toMatchObject({
      recommended: true,
      availability: 'find',
      destinationNodeId: 'E201',
    })
  })
})
