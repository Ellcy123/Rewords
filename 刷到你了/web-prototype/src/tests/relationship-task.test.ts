import { describe, expect, it } from 'vitest'
import {
  applyTaskEvidence,
  commitTaskWithSystemFallback,
  createCharacterTaskState,
  inviteTaskAfterCirculatingClipViewed,
  markRelationshipResponseViewed,
  recordFamiliarityExchange,
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

  it('keeps the task locked until two successful exchanges unlock and the player views the circulating clip', () => {
    const locked = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE')
    const first = recordFamiliarityExchange(locked, 'user-one')
    expect(first.state).toMatchObject({
      stage: 'locked',
      familiarityExchangeSourceIds: ['user-one'],
      circulatingClipUnlocked: false,
    })
    expect(first.effects).toEqual([])

    const duplicate = recordFamiliarityExchange(first.state, 'user-one')
    expect(duplicate).toEqual({ state: first.state, effects: [] })

    const second = recordFamiliarityExchange(first.state, 'user-two')
    expect(second.state).toMatchObject({
      stage: 'locked',
      familiarityExchangeSourceIds: ['user-one', 'user-two'],
      circulatingClipUnlocked: true,
    })
    expect(second.effects).toEqual(['unlock_circulating_clip'])

    expect(inviteTaskAfterCirculatingClipViewed(first.state, 'E103')).toEqual({ state: first.state, effects: [] })
    const invited = inviteTaskAfterCirculatingClipViewed(second.state, 'E103')
    expect(invited.state.stage).toBe('invited')
    expect(invited.effects).toEqual([])
  })

  it('uses system fallback only after an explicit player choice', () => {
    const invited = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'invited')
    const committed = commitTaskWithSystemFallback(invited)

    expect(committed.state).toMatchObject({
      stage: 'committed',
      lastEvidenceSourceId: 'system_fallback',
      lastCheckpointSource: 'system_fallback',
    })
    expect(committed.effects).toEqual(['schedule_progress_report'])
    expect(commitTaskWithSystemFallback(committed.state)).toEqual({ state: committed.state, effects: [] })
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
