import { describe, expect, it } from 'vitest'
import {
  selectCanGenerateEnding,
  selectCanOpenYanxinChat,
  selectCanViewRelationshipVideo,
  selectPostEndingChat,
  selectYanxinTaskStage,
} from '../engine/selectors'
import { gameReducer } from '../engine/reducer'
import { createInitialState } from '../engine/state'
import { resolveMoment } from '../moments/resolveMoment'

describe('relationship selectors', () => {
  it('exposes capabilities without online state or delivery timing', () => {
    const initial = createInitialState()
    expect(selectCanOpenYanxinChat(initial)).toBe(false)
    expect(selectYanxinTaskStage(initial)).toBe('locked')
    expect(selectCanViewRelationshipVideo(initial)).toBe(false)

    const entryState = { ...initial, unlockedNodeIds: [...initial.unlockedNodeIds, 'E001' as const] }
    const invited = gameReducer(entryState, {
      type: 'MOMENT_RESOLVED',
      resolution: resolveMoment('PK_LAST_30_SECONDS', 'hold_back').resolution,
    })
    expect(selectCanOpenYanxinChat(invited)).toBe(true)
    expect(selectYanxinTaskStage(invited)).toBe('invited')

    const completed = { ...invited, completed: true }
    expect(selectCanGenerateEnding(completed)).toBe(true)
    expect(selectPostEndingChat(completed)).toBe(false)
    const withEnding = { ...completed, ending: { id: 'e1', letter: '信', generatedAt: 'now', futureClaimId: 'walk' } }
    expect(selectCanGenerateEnding(withEnding)).toBe(false)
    expect(selectPostEndingChat(withEnding)).toBe(true)
  })
})
