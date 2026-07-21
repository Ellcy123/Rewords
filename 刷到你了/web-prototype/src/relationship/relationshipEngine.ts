import type {
  RelationshipDimension,
  RelationshipEvidenceCandidate,
  RelationshipEvidenceKind,
  RelationshipIdentity,
  YanxinPersonaState,
} from './personaState'

export type { RelationshipEvidenceCandidate } from './personaState'

const EFFECTS: Record<RelationshipEvidenceKind, Partial<Record<RelationshipDimension, -2 | -1 | 1 | 2>>> = {
  showed_specific_care: { trust: 1, closeness: 1 },
  respected_boundary: { respect: 2, boundaryPressure: -1 },
  offered_actionable_help: { trust: 1, respect: 1 },
  kept_promise: { trust: 2, respect: 1 },
  contradicted_action_evidence: { trust: -1, suspicion: 1 },
  revealed_unexplained_knowledge: { suspicion: 2 },
  pressured_after_refusal: { respect: -1, boundaryPressure: 2 },
  public_financial_support: { closeness: 1, boundaryPressure: 1 },
}

const clampDimension = (value: number) => Math.max(-5, Math.min(5, value))

function deriveIdentity(state: YanxinPersonaState): RelationshipIdentity {
  const { dimensions, changes } = state.relationship
  const acceptedSources = new Set(changes.map(change => change.sourceId))
  const hasGameEventSource = changes.some(change => change.sourceId.startsWith('game-event:'))
  const hasPrivateRelationshipEvidence = dimensions.closeness > 0
    && dimensions.trust > 0
    && dimensions.respect > 0
    && acceptedSources.size >= 4
    && dimensions.boundaryPressure < 3

  if (hasPrivateRelationshipEvidence) return 'private_relationship'
  if (dimensions.trust > 0 && dimensions.respect > 0 && hasGameEventSource) return 'important_supporter'
  if (acceptedSources.size >= 2) return 'familiar_fan'
  return 'new_viewer'
}

export function applyRelationshipEvidence(
  state: YanxinPersonaState,
  evidence: RelationshipEvidenceCandidate,
  createdAt: number,
): { state: YanxinPersonaState } {
  const isDuplicate = state.relationship.changes.some(change => (
    change.evidenceKind === evidence.kind && change.sourceId === evidence.sourceMessageId
  ))
  if (isDuplicate) return { state }

  const changes = Object.entries(EFFECTS[evidence.kind]).map(([dimension, delta]) => ({
    id: `${evidence.kind}:${evidence.sourceMessageId}:${dimension}`,
    dimension: dimension as RelationshipDimension,
    delta: delta as -2 | -1 | 1 | 2,
    sourceId: evidence.sourceMessageId,
    evidenceKind: evidence.kind,
    createdAt,
  }))
  const dimensions = { ...state.relationship.dimensions }
  for (const change of changes) {
    dimensions[change.dimension] = clampDimension(dimensions[change.dimension] + change.delta)
  }

  const nextState: YanxinPersonaState = {
    ...state,
    relationship: {
      ...state.relationship,
      dimensions,
      changes: [...state.relationship.changes, ...changes],
    },
  }
  return {
    state: {
      ...nextState,
      relationship: {
        ...nextState.relationship,
        identity: deriveIdentity(nextState),
      },
    },
  }
}
