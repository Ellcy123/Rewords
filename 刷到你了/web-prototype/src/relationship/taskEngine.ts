import type { NodeId } from '../content/types'

export type CharacterTaskId = 'YANXIN_UNCUT_EVIDENCE'
export type CharacterTaskStage = 'locked' | 'invited' | 'understood' | 'committed' | 'published'
export type TaskSignal = 'acknowledge_pressure' | 'offer_evidence_plan' | 'respect_boundary'
export type TaskTransitionEffect = 'schedule_progress_report' | 'mark_published'

export interface CharacterTaskState {
  taskId: CharacterTaskId
  stage: CharacterTaskStage
  relevantFallbackTurns: number
  emittedEffects: TaskTransitionEffect[]
  unlockedResponseNodeIds: NodeId[]
}

export interface TaskTransitionResult {
  state: CharacterTaskState
  effects: TaskTransitionEffect[]
}

const SIGNALS = new Set<TaskSignal>([
  'acknowledge_pressure',
  'offer_evidence_plan',
  'respect_boundary',
])

export function createCharacterTaskState(
  taskId: CharacterTaskId,
  stage: CharacterTaskStage = 'locked',
): CharacterTaskState {
  return {
    taskId,
    stage,
    relevantFallbackTurns: 0,
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

export function applyTaskSignal(state: CharacterTaskState, signal: TaskSignal): TaskTransitionResult {
  if (!SIGNALS.has(signal)) return { state, effects: [] }
  if (state.stage === 'invited' && (signal === 'acknowledge_pressure' || signal === 'respect_boundary')) {
    return enterStage({ ...state, relevantFallbackTurns: 0 }, 'understood')
  }
  if (state.stage === 'understood' && signal === 'offer_evidence_plan') {
    return enterStage({ ...state, relevantFallbackTurns: 0 }, 'committed')
  }
  return { state, effects: [] }
}

export function recordTaskRelevantFallback(state: CharacterTaskState): TaskTransitionResult {
  if (state.stage !== 'invited' && state.stage !== 'understood') return { state, effects: [] }
  const relevantFallbackTurns = state.relevantFallbackTurns + 1
  if (relevantFallbackTurns < 2) {
    return { state: { ...state, relevantFallbackTurns }, effects: [] }
  }
  const nextStage = state.stage === 'invited' ? 'understood' : 'committed'
  return enterStage({ ...state, relevantFallbackTurns: 0 }, nextStage)
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
