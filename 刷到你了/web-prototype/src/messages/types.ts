import type { NodeId } from '../content/types'
import type { TaskSignal } from '../relationship/taskEngine'

export type ChatRole = 'user' | 'assistant'
export type ChatDeliveryKind = 'reply' | 'proactive_report'
export type ChatDeliveryEffect = 'none' | 'unlock_e201'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  createdAt: number
}

export interface PendingChatDelivery {
  id: string
  kind: ChatDeliveryKind
  message: ChatMessage
  deliverAt: number
  taskSignals: TaskSignal[]
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
