import { describe, expect, it } from 'vitest'
import { createYanxinPersonaState } from '../relationship/personaState'
import { applyRelationshipEvidence } from '../relationship/relationshipEngine'
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

  it('treats care and respected boundaries as evidence, not AI-authored scores', () => {
    let persona = createYanxinPersonaState()
    persona = applyRelationshipEvidence(persona, {
      kind: 'showed_specific_care', sourceMessageId: 'user-1',
    }, 100).state
    persona = applyRelationshipEvidence(persona, {
      kind: 'respected_boundary', sourceMessageId: 'user-2',
    }, 200).state

    expect(persona.relationship.dimensions.trust).toBe(1)
    expect(persona.relationship.dimensions.respect).toBe(2)
    expect(persona.relationship.changes.every(change => change.sourceId.startsWith('user-'))).toBe(true)
  })

  it('does not make one purchase or one compliment a private relationship', () => {
    const result = applyRelationshipEvidence(createYanxinPersonaState(), {
      kind: 'public_financial_support', sourceMessageId: 'moment-pk',
    }, 100)

    expect(result.state.relationship.identity).not.toBe('private_relationship')
  })

  it('deduplicates evidence and derives a private relationship only after four accepted sources', () => {
    let persona = createYanxinPersonaState()
    for (const [kind, sourceMessageId] of [
      ['showed_specific_care', 'user-1'],
      ['respected_boundary', 'user-2'],
      ['offered_actionable_help', 'user-3'],
      ['kept_promise', 'user-4'],
    ] as const) {
      persona = applyRelationshipEvidence(persona, { kind, sourceMessageId }, 100).state
    }

    const duplicate = applyRelationshipEvidence(persona, {
      kind: 'kept_promise', sourceMessageId: 'user-4',
    }, 200)

    expect(persona.relationship.identity).toBe('private_relationship')
    expect(duplicate.state).toEqual(persona)
  })
})
