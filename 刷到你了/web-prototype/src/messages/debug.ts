import type { GameState } from '../engine/state'
import { isAllowedMemoryId, type ChatResult, type ChatTurnKind } from './aiClient'
import type { AiTurnDebugRecord, ChatMessage } from './types'

export function createAiTurnDebugRecord({
  state,
  turnKind,
  sourceId,
  createdAt,
  result,
}: {
  state: GameState
  turnKind: ChatTurnKind
  sourceId: string
  createdAt: number
  result: ChatResult
}): AiTurnDebugRecord {
  const recentMessages = state.messages
    .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => message.role !== 'system')
    .slice(-12)
  const allowedMemoryIds = state.sharedMemories.map(memory => memory.id).filter(isAllowedMemoryId)
  const memories = state.longTermMemories.filter(memory => memory.active).slice(-10)
  const openLoops = state.openLoops.slice(-5)

  return {
    id: `debug-${sourceId}`,
    createdAt,
    personaCoreId: 'yanxin-v1',
    turnKind,
    relationshipIdentity: state.yanxinPersona.relationship.identity,
    dimensions: { ...state.yanxinPersona.relationship.dimensions },
    shortTerm: { ...state.yanxinPersona.shortTerm },
    taskStage: state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage,
    recentMessageIdsRead: recentMessages.map(message => message.id),
    relationshipChangeSourceIdsRead: [...new Set(state.yanxinPersona.relationship.changes.slice(-20).map(change => change.sourceId))],
    memoryIdsRead: [...new Set([...allowedMemoryIds, ...memories.map(memory => memory.id)])],
    openLoopIdsRead: openLoops.map(openLoop => openLoop.id),
    characterIntents: result.ok ? [...result.data.characterIntents] : [],
    acceptedTaskEvidence: result.ok ? result.data.taskEvidence.map(evidence => ({ ...evidence })) : [],
    acceptedRelationshipEvidence: result.ok ? result.data.relationshipEvidence.map(evidence => ({ ...evidence })) : [],
    acceptedMemoryCandidates: result.ok
      ? result.data.memoryCandidates.map(candidate => ({ type: candidate.type, sourceMessageId: candidate.sourceMessageId }))
      : [],
    acceptedOpenLoopUpdates: result.ok
      ? result.data.openLoopUpdates.map(update => ({ kind: update.kind, sourceMessageId: update.sourceMessageId, status: update.status }))
      : [],
    rejectedCandidates: result.ok ? [] : [{ category: 'provider_response', sourceId, reason: result.reason }],
    fallbackUsed: !result.ok,
  }
}
