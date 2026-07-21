import { describe, expect, it } from 'vitest'
import { createYanxinPersonaState } from '../relationship/personaState'
import { createInitialState } from '../engine/state'

describe('Yanxin persona state', () => {
  it('starts Yanxin as a noticed viewer with neutral bounded dimensions', () => {
    const state = createInitialState()
    expect(state.yanxinPersona.relationship.identity).toBe('new_viewer')
    expect(state.yanxinPersona.relationship.dimensions).toEqual({
      closeness: 0, trust: 0, respect: 0, suspicion: 0, boundaryPressure: 0,
    })
  })

  it('creates a guarded post-PK persona with no relationship changes', () => {
    expect(createYanxinPersonaState()).toMatchObject({
      relationship: { identity: 'new_viewer', changes: [] },
      shortTerm: { emotion: 'guarded', currentActivity: 'post_pk' },
    })
  })
})
