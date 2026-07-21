import type { NodeId } from '../content/types'

export type CharacterTaskId = 'YANXIN_UNCUT_EVIDENCE'
export type CharacterTaskStage = 'locked' | 'invited' | 'understood' | 'committed' | 'published'
export type TaskEvidenceKind = 'recognized_malicious_editing' | 'accepted_complete_evidence_plan'
export type TaskTransitionEffect = 'schedule_progress_report' | 'mark_published'

export interface TaskEvidenceCandidate {
  kind: TaskEvidenceKind
  sourceMessageId: string
}

export interface CharacterTaskState {
  taskId: CharacterTaskId
  stage: CharacterTaskStage
  lastEvidenceSourceId: string | null
  emittedEffects: TaskTransitionEffect[]
  unlockedResponseNodeIds: NodeId[]
}

export interface TaskTransitionResult {
  state: CharacterTaskState
  effects: TaskTransitionEffect[]
}

export function createCharacterTaskState(
  taskId: CharacterTaskId,
  stage: CharacterTaskStage = 'locked',
): CharacterTaskState {
  return {
    taskId,
    stage,
    lastEvidenceSourceId: null,
    emittedEffects: [],
    unlockedResponseNodeIds: [],
  }
}

function enterStage(state: CharacterTaskState, stage: CharacterTaskStage): TaskTransitionResult {
  if (state.stage === stage) return { state, effects: [] }
  if (stage !== 'committed' || state.emittedEffects.includes('schedule_progress_report')) {
    return { state: { ...state, stage }, effects: [] }
  }
  return {
    state: {
      ...state,
      stage,
      emittedEffects: [...state.emittedEffects, 'schedule_progress_report'],
    },
    effects: ['schedule_progress_report'],
  }
}

export function applyTaskEvidence(
  state: CharacterTaskState,
  evidence: TaskEvidenceCandidate,
): TaskTransitionResult {
  if (state.stage === 'invited' && evidence.kind === 'recognized_malicious_editing') {
    return enterStage({ ...state, lastEvidenceSourceId: evidence.sourceMessageId }, 'understood')
  }
  if (state.stage === 'understood' && evidence.kind === 'accepted_complete_evidence_plan') {
    return enterStage({ ...state, lastEvidenceSourceId: evidence.sourceMessageId }, 'committed')
  }
  return { state, effects: [] }
}

export function markRelationshipResponseViewed(
  state: CharacterTaskState,
  nodeId: NodeId,
): TaskTransitionResult {
  if (nodeId !== 'E201' || state.stage !== 'committed' || !state.unlockedResponseNodeIds.includes(nodeId)) {
    return { state, effects: [] }
  }
  if (state.emittedEffects.includes('mark_published')) return { state, effects: [] }
  return {
    state: {
      ...state,
      stage: 'published',
      emittedEffects: [...state.emittedEffects, 'mark_published'],
    },
    effects: ['mark_published'],
  }
}
