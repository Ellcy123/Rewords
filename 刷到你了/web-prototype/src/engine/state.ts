import type { ItemId, NodeId } from '../content/types'

export type TutorialStep = 'product' | 'gift' | 'target' | 'done'

export interface GameState {
  version: 3
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
}

export function createInitialState(): GameState {
  return {
    version: 3,
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
  }
}
