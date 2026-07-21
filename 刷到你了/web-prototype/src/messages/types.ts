import type { NodeId } from '../content/types'
import type { RelationshipEvidenceCandidate } from '../relationship/personaState'
import type { RelationshipIdentity, YanxinPersonaState } from '../relationship/personaState'
import type { CharacterTaskStage, TaskEvidenceCandidate } from '../relationship/taskEngine'
import type { CharacterIntent, ChatFailureReason, ChatTurnKind } from './aiClient'

export type ChatRole = 'user' | 'assistant' | 'system'
export type ChatDeliveryKind = 'reply' | 'proactive_report' | 'system_notice' | 'system_fallback_checkpoint'
export type ChatDeliveryEffect = 'none' | 'unlock_e201'
export type ChatDeliverySource = 'system_fallback'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  createdAt: number
}

export type MemoryType = 'player_stance' | 'promise' | 'shared_joke' | 'conflict' | 'preference'

export interface LongTermMemory {
  id: string
  type: MemoryType
  sourceMessageId: string
  sourceText: string
  interpretation: string
  createdAt: number
  lastReferencedAt: number
  active: boolean
}

export interface MemoryCandidate {
  type: MemoryType
  sourceMessageId: string
  interpretation: string
}

export interface OpenLoop {
  id: string
  kind: 'promise' | 'topic' | 'conflict' | 'report'
  summary: string
  sourceMessageId: string
  status: 'open' | 'closed'
  createdAt: number
}

export interface OpenLoopUpdate {
  kind: OpenLoop['kind']
  summary: string
  sourceMessageId: string
  status: OpenLoop['status']
}

export interface ChatAiEffects {
  taskEvidence: TaskEvidenceCandidate[]
  relationshipEvidence: RelationshipEvidenceCandidate[]
  memoryCandidates: MemoryCandidate[]
  openLoopUpdates: OpenLoopUpdate[]
}

export interface AiDebugRejectedCandidate {
  category: 'provider_response'
  sourceId: string
  reason: ChatFailureReason
}

export interface AiTurnDebugRecord {
  id: string
  createdAt: number
  personaCoreId: 'yanxin-v1'
  turnKind: ChatTurnKind
  relationshipIdentity: RelationshipIdentity
  dimensions: YanxinPersonaState['relationship']['dimensions']
  shortTerm: YanxinPersonaState['shortTerm']
  taskStage: CharacterTaskStage
  recentMessageIdsRead: string[]
  relationshipChangeSourceIdsRead: string[]
  memoryIdsRead: string[]
  openLoopIdsRead: string[]
  characterIntents: CharacterIntent[]
  acceptedTaskEvidence: TaskEvidenceCandidate[]
  acceptedRelationshipEvidence: RelationshipEvidenceCandidate[]
  acceptedMemoryCandidates: Array<Pick<MemoryCandidate, 'type' | 'sourceMessageId'>>
  acceptedOpenLoopUpdates: Array<Pick<OpenLoopUpdate, 'kind' | 'sourceMessageId' | 'status'>>
  rejectedCandidates: AiDebugRejectedCandidate[]
  fallbackUsed: boolean
}

export interface PendingChatDelivery {
  id: string
  kind: ChatDeliveryKind
  message: ChatMessage
  deliverAt: number
  aiEffects: ChatAiEffects
  effect: ChatDeliveryEffect
  source?: ChatDeliverySource
}

export interface ChatDeliveryInput extends Omit<PendingChatDelivery, 'deliverAt'> {
  createdAt: number
  readyAt: number
}

export interface SharedMemory {
  id: string
  text: string
  sourceNodeId?: NodeId
  createdAt: number
}
