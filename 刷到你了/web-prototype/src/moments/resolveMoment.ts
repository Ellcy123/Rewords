import { MOMENT_BY_ID } from './catalog'
import type { MomentChoiceId, MomentId, MomentResolution, MomentResolutionResult } from './types'

export function resolveMoment(
  momentId: MomentId,
  choiceId: MomentChoiceId,
  previous?: MomentResolution,
): MomentResolutionResult {
  if (previous?.momentId === momentId) {
    return {
      kind: 'already-resolved',
      resolution: previous,
      coinDelta: 0,
      unlockNodeId: null,
      inviteTaskId: null,
    }
  }

  const choice = MOMENT_BY_ID[momentId].choices[choiceId]
  const resolution: MomentResolution = {
    momentId,
    choiceId,
    resultNodeId: choice.resultNodeId,
    coinCost: choice.coinCost,
    evidenceTags: [...choice.evidenceTags],
    invitedTaskId: choice.invitedTaskId,
  }
  return {
    kind: 'resolved',
    resolution,
    coinDelta: -choice.coinCost,
    unlockNodeId: choice.resultNodeId,
    inviteTaskId: choice.invitedTaskId,
  }
}
