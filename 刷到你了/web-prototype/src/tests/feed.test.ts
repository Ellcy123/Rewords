import { describe, expect, it } from 'vitest'
import { rankFeed } from '../engine/feed'
import { createInitialState } from '../engine/state'

describe('rankFeed', () => {
  it('keeps the initial roots stable', () => {
    expect(rankFeed(createInitialState())).toEqual(['W001', 'C001', 'K001'])
  })

  it('puts a pending result first and excludes wrong endings', () => {
    const state = { ...createInitialState(), feedNodeIds: ['W001', 'C001', 'K001', 'W101'], unlockedNodeIds: ['W001', 'C001', 'K001', 'W101', 'X001'], pendingResultNodeId: 'W101', destinyNodeIds: ['X001'] } as ReturnType<typeof createInitialState>
    expect(rankFeed(state)[0]).toBe('W101')
    expect(rankFeed(state)).not.toContain('X001')
  })

  it('is deterministic and alternates equal-score channels', () => {
    const state = { ...createInitialState(), feedNodeIds: ['W001', 'W101', 'C001', 'K001'], unlockedNodeIds: ['W001', 'W101', 'C001', 'K001'] } as ReturnType<typeof createInitialState>
    expect(rankFeed(state)).toEqual(rankFeed(state))
    const ranked = rankFeed(state)
    expect(ranked.slice(0, 3)).not.toEqual(['W001', 'W101', 'C001'])
  })

  it('excludes resolved videos even when stale feed data still contains them', () => {
    const state = { ...createInitialState(), resolvedNodeIds: ['W001'] } as ReturnType<typeof createInitialState>
    expect(rankFeed(state)).toEqual(['C001', 'K001'])
  })
})
