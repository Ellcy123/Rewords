export type RelationshipDimension = 'closeness' | 'trust' | 'respect' | 'suspicion' | 'boundaryPressure'
export type RelationshipIdentity = 'new_viewer' | 'familiar_fan' | 'important_supporter' | 'private_relationship'
export type RelationshipEvidenceKind = 'showed_specific_care' | 'respected_boundary' | 'offered_actionable_help' | 'kept_promise' | 'contradicted_action_evidence' | 'revealed_unexplained_knowledge' | 'pressured_after_refusal' | 'public_financial_support'

export interface RelationshipEvidenceCandidate {
  kind: RelationshipEvidenceKind
  sourceMessageId: string
}

export interface RelationshipChange {
  id: string
  dimension: RelationshipDimension
  delta: -2 | -1 | 1 | 2
  sourceId: string
  evidenceKind: RelationshipEvidenceKind
  createdAt: number
}

export interface RelationshipState {
  identity: RelationshipIdentity
  dimensions: Record<RelationshipDimension, number>
  changes: RelationshipChange[]
}

export interface YanxinShortTermState {
  emotion: 'guarded' | 'steady' | 'warm' | 'pressured'
  currentActivity: 'post_pk' | 'reviewing_footage' | 'testing_device' | 'following_up'
}

export interface YanxinPersonaState {
  relationship: RelationshipState
  shortTerm: YanxinShortTermState
}

export function createYanxinPersonaState(): YanxinPersonaState {
  return {
    relationship: {
      identity: 'new_viewer',
      dimensions: {
        closeness: 0,
        trust: 0,
        respect: 0,
        suspicion: 0,
        boundaryPressure: 0,
      },
      changes: [],
    },
    shortTerm: {
      emotion: 'guarded',
      currentActivity: 'post_pk',
    },
  }
}
