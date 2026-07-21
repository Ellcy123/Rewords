import type { NodeId } from '../content/types'
import type { RelationshipEvidenceCandidate } from '../relationship/personaState'
import type { TaskEvidenceCandidate } from '../relationship/taskEngine'

export type ChatRole = 'user' | 'assistant'
export type ChatDeliveryKind = 'reply' | 'proactive_report'
export type ChatDeliveryEffect = 'none' | 'unlock_e201'

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

export interface PendingChatDelivery {
  id: string
  kind: ChatDeliveryKind
  message: ChatMessage
  deliverAt: number
  aiEffects: ChatAiEffects
  effect: ChatDeliveryEffect
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
