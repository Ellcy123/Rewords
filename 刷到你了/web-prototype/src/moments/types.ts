import type { NodeId } from '../content/types'
import type { CharacterTaskId } from '../relationship/taskEngine'

export type MomentId = 'PK_LAST_30_SECONDS'
export type MomentChoiceId = 'support' | 'hold_back'
export type RelationshipEvidenceTag = 'support' | 'boundary_pressure' | 'respect'

export interface MomentChoiceDefinition {
  id: MomentChoiceId
  label: string
  resultNodeId: NodeId
  coinCost: number
  evidenceTags: RelationshipEvidenceTag[]
  invitedTaskId: CharacterTaskId
}

export interface MomentDefinition {
  id: MomentId
  entryNodeId: NodeId
  choices: Record<MomentChoiceId, MomentChoiceDefinition>
}

export interface MomentResolution {
  momentId: MomentId
  choiceId: MomentChoiceId
  resultNodeId: NodeId
  coinCost: number
  evidenceTags: RelationshipEvidenceTag[]
  invitedTaskId: CharacterTaskId
}

export type MomentResolutionResult = {
  kind: 'resolved' | 'already-resolved'
  resolution: MomentResolution
  coinDelta: number
  unlockNodeId: NodeId | null
  inviteTaskId: CharacterTaskId | null
}
