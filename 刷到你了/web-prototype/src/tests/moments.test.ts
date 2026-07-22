import { describe, expect, it } from 'vitest'
import { MOMENT_BY_ID } from '../moments/catalog'
import { resolveMoment } from '../moments/resolveMoment'

describe('entertainment moment rules', () => {
  it('maps both PK choices to deterministic relationship evidence and task invitation', () => {
    const moment = MOMENT_BY_ID.PK_LAST_30_SECONDS

    expect(moment.entryNodeId).toBe('E001')
    expect(moment.choices.support).toMatchObject({
      resultNodeId: 'E101',
      coinCost: 30,
      evidenceTags: ['support', 'boundary_pressure'],
      invitedTaskId: 'YANXIN_UNCUT_EVIDENCE',
    })
    expect(moment.choices.hold_back).toMatchObject({
      resultNodeId: 'E102',
      coinCost: 0,
      evidenceTags: ['respect'],
      invitedTaskId: 'YANXIN_UNCUT_EVIDENCE',
    })
  })

  it('resolves once and never charges or emits the task invitation twice', () => {
    const first = resolveMoment('PK_LAST_30_SECONDS', 'support')
    expect(first).toMatchObject({
      kind: 'resolved',
      coinDelta: -30,
      unlockNodeId: 'E101',
      inviteTaskId: 'YANXIN_UNCUT_EVIDENCE',
    })

    const repeated = resolveMoment('PK_LAST_30_SECONDS', 'support', first.resolution)
    expect(repeated).toMatchObject({
      kind: 'already-resolved',
      coinDelta: 0,
      unlockNodeId: null,
      inviteTaskId: null,
    })
    expect(repeated.resolution).toEqual(first.resolution)
  })
})
