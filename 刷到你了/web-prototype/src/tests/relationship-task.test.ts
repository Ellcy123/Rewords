import { describe, expect, it } from 'vitest'
import {
  applyTaskEvidence,
  createCharacterTaskState,
  markRelationshipResponseViewed,
} from '../relationship/taskEngine'

describe('Yanxin relationship task', () => {
  it('advances from invited only with grounded malicious-editing evidence', () => {
    const invited = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'invited')
    const result = applyTaskEvidence(invited, {
      kind: 'recognized_malicious_editing',
      sourceMessageId: 'user-editing',
    })

    expect(result.state).toMatchObject({ stage: 'understood', lastEvidenceSourceId: 'user-editing' })
    expect(applyTaskEvidence(invited, {
      kind: 'accepted_complete_evidence_plan',
      sourceMessageId: 'user-plan-too-early',
    })).toEqual({ state: invited, effects: [] })
  })

  it('enters committed once and schedules one progress report without unlocking E201', () => {
    const invited = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'invited')
    const understood = applyTaskEvidence(invited, {
      kind: 'recognized_malicious_editing', sourceMessageId: 'user-editing',
    }).state
    const committed = applyTaskEvidence(understood, {
      kind: 'accepted_complete_evidence_plan', sourceMessageId: 'user-plan',
    })

    expect(committed.state.stage).toBe('committed')
    expect(committed.state.lastEvidenceSourceId).toBe('user-plan')
    expect(committed.effects).toEqual(['schedule_progress_report'])
    expect(committed.state.unlockedResponseNodeIds).not.toContain('E201')

    const repeated = applyTaskEvidence(committed.state, {
      kind: 'accepted_complete_evidence_plan', sourceMessageId: 'user-plan',
    })
    expect(repeated.effects).toEqual([])
    expect(repeated.state).toEqual(committed.state)
  })

  it('ignores unrelated evidence without accumulating turn progress', () => {
    const invited = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'invited')
    expect(applyTaskEvidence(invited, {
      kind: 'not-task-evidence' as never, sourceMessageId: 'user-chat',
    })).toEqual({ state: invited, effects: [] })
    expect(invited).not.toHaveProperty('relevantFallbackTurns')
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
