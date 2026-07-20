import { describe, expect, it } from 'vitest'
import {
  applyTaskSignal,
  createCharacterTaskState,
  markRelationshipResponseViewed,
  recordTaskRelevantFallback,
} from '../relationship/taskEngine'

describe('Yanxin relationship task', () => {
  it('only accepts whitelisted semantic signals', () => {
    const invited = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'invited')
    expect(applyTaskSignal(invited, 'acknowledge_pressure').state.stage).toBe('understood')
    expect(applyTaskSignal(invited, 'say_anything' as never)).toEqual({ state: invited, effects: [] })
  })

  it('enters committed once and schedules one progress report without unlocking E201', () => {
    const invited = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'invited')
    const understood = applyTaskSignal(invited, 'acknowledge_pressure').state
    const committed = applyTaskSignal(understood, 'offer_evidence_plan')

    expect(committed.state.stage).toBe('committed')
    expect(committed.effects).toEqual(['schedule_progress_report'])
    expect(committed.state.unlockedResponseNodeIds).not.toContain('E201')

    const repeated = applyTaskSignal(committed.state, 'offer_evidence_plan')
    expect(repeated.effects).toEqual([])
    expect(repeated.state).toEqual(committed.state)
  })

  it('uses two task-relevant fallback turns to advance one stage', () => {
    const invited = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'invited')
    const once = recordTaskRelevantFallback(invited)
    const twice = recordTaskRelevantFallback(once.state)

    expect(once.state).toMatchObject({ stage: 'invited', relevantFallbackTurns: 1 })
    expect(twice.state).toMatchObject({ stage: 'understood', relevantFallbackTurns: 0 })
  })

  it('publishes only after the delivered relationship response is viewed', () => {
    const committed = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'committed')
    const unlocked = { ...committed, unlockedResponseNodeIds: ['E201' as const] }
    const result = markRelationshipResponseViewed(unlocked, 'E201')

    expect(result.state.stage).toBe('published')
    expect(result.effects).toEqual(['mark_published'])
    expect(markRelationshipResponseViewed(result.state, 'E201').effects).toEqual([])
  })
})
