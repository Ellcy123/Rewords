import type { ItemId, NodeId } from '../content/types'
import type { ChatMessage, PendingChatDelivery, SharedMemory } from '../messages/types'
import type { MomentId, RelationshipEvidenceTag } from '../moments/types'
import { createCharacterTaskState, type CharacterTaskId, type CharacterTaskState } from '../relationship/taskEngine'

export type TutorialStep = 'product' | 'gift' | 'target' | 'done'
export type ActivityTaskId = 'WATCH_THREE' | 'LIKE_THREE' | 'FAVORITE_TWO'
export type EconomyReason = 'main_reward' | 'activity_reward' | 'moment_spend' | 'item_purchase' | 'solvency_subsidy'

export interface RelationshipEvidence {
  id: string
  kind: RelationshipEvidenceTag
  sourceMomentId: MomentId
}

export interface EconomyEntry {
  id: string
  reason: EconomyReason
  amount: number
  grossAmount?: number
  playerPaidAmount?: number
  subsidyAmount?: number
}

export interface EndingRecord {
  id: string
  letter: string
  generatedAt: string
  futureClaimId: string
}

export interface GameState {
  version: 4
  coins: number
  inventory: Record<ItemId, number>
  discoveredItemIds: ItemId[]
  unlockedNodeIds: NodeId[]
  viewedNodeIds: NodeId[]
  resolvedNodeIds: NodeId[]
  feedNodeIds: NodeId[]
  triggeredKeys: string[]
  destinyNodeIds: NodeId[]
  currentNodeId: NodeId
  pendingResultNodeId: NodeId | null
  completed: boolean
  tutorialStep: TutorialStep
  muted: boolean
  relationshipEvidence: RelationshipEvidence[]
  characterTasks: Record<CharacterTaskId, CharacterTaskState>
  resolvedMomentIds: MomentId[]
  messages: ChatMessage[]
  pendingChatDeliveries: PendingChatDelivery[]
  sharedMemories: SharedMemory[]
  claimedActivityTaskIds: ActivityTaskId[]
  ledger: EconomyEntry[]
  ending: EndingRecord | null
}

export function createInitialState(): GameState {
  return {
    version: 4,
    coins: 100,
    inventory: { ladder: 0, technician: 0, recorder: 0, projector: 0 },
    discoveredItemIds: ['ladder', 'technician'],
    unlockedNodeIds: ['W001', 'C001', 'K001'],
    viewedNodeIds: [],
    resolvedNodeIds: [],
    feedNodeIds: ['W001', 'C001', 'K001'],
    triggeredKeys: [],
    destinyNodeIds: [],
    currentNodeId: 'W001',
    pendingResultNodeId: null,
    completed: false,
    tutorialStep: 'product',
    muted: false,
    relationshipEvidence: [],
    characterTasks: {
      YANXIN_UNCUT_EVIDENCE: createCharacterTaskState('YANXIN_UNCUT_EVIDENCE'),
    },
    resolvedMomentIds: [],
    messages: [],
    pendingChatDeliveries: [],
    sharedMemories: [],
    claimedActivityTaskIds: [],
    ledger: [],
    ending: null,
  }
}
