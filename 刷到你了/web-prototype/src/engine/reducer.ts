import { ITEM_BY_ID } from '../content/items'
import { NODE_BY_ID } from '../content/nodes'
import type { ItemId, NodeId } from '../content/types'
import { resolveGift } from './trigger'
import { createInitialState, type GameState, type TutorialStep } from './state'

export type GameAction =
  | { type: 'BUY_ITEM'; itemId: ItemId }
  | { type: 'GIVE_ITEM'; targetNodeId: NodeId; itemId: ItemId }
  | { type: 'RESULT_FINISHED'; nodeId: NodeId }
  | { type: 'NODE_FINISHED'; nodeId: NodeId }
  | { type: 'NODE_VIEWED'; nodeId: NodeId }
  | { type: 'SET_CURRENT_NODE'; nodeId: NodeId }
  | { type: 'CLAIM_DEMO_COINS' }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'ADVANCE_TUTORIAL'; step: TutorialStep }
  | { type: 'RESET_GAME' }
  | { type: 'RECOVER_FEED' }

const appendUnique = <T,>(list: T[], value: T): T[] => list.includes(value) ? list : [...list, value]

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'BUY_ITEM': {
      const item = ITEM_BY_ID[action.itemId]
      if (!state.discoveredItemIds.includes(action.itemId) || state.coins < item.price) return state
      return { ...state, coins: state.coins - item.price, inventory: { ...state.inventory, [action.itemId]: state.inventory[action.itemId] + 1 } }
    }
    case 'GIVE_ITEM': {
      const resolution = resolveGift(state, action.targetNodeId, action.itemId)
      if (resolution.kind !== 'success') return state
      const { trigger, key } = resolution
      const wrong = trigger.kind === 'wrong'
      return {
        ...state,
        inventory: { ...state.inventory, [action.itemId]: state.inventory[action.itemId] - 1 },
        triggeredKeys: [...state.triggeredKeys, key],
        unlockedNodeIds: appendUnique(state.unlockedNodeIds, trigger.resultNodeId),
        feedNodeIds: wrong ? state.feedNodeIds : appendUnique(state.feedNodeIds, trigger.resultNodeId),
        destinyNodeIds: wrong ? appendUnique(state.destinyNodeIds, trigger.resultNodeId) : state.destinyNodeIds,
        discoveredItemIds: trigger.discoverItemId ? appendUnique(state.discoveredItemIds, trigger.discoverItemId) : state.discoveredItemIds,
        pendingResultNodeId: trigger.resultNodeId,
      }
    }
    case 'NODE_FINISHED': {
      const unlock = NODE_BY_ID[action.nodeId].onCompleteUnlock
      if (!unlock) return state
      return { ...state, unlockedNodeIds: appendUnique(state.unlockedNodeIds, unlock), feedNodeIds: appendUnique(state.feedNodeIds, unlock), pendingResultNodeId: unlock }
    }
    case 'RESULT_FINISHED':
      return { ...state, pendingResultNodeId: null, viewedNodeIds: appendUnique(state.viewedNodeIds, action.nodeId), completed: state.completed || action.nodeId === 'W400' }
    case 'NODE_VIEWED':
      if (state.viewedNodeIds.includes(action.nodeId)) return state
      return { ...state, viewedNodeIds: [...state.viewedNodeIds, action.nodeId], coins: state.coins + 5 }
    case 'SET_CURRENT_NODE':
      return state.currentNodeId === action.nodeId ? state : { ...state, currentNodeId: action.nodeId }
    case 'CLAIM_DEMO_COINS':
      return { ...state, coins: state.coins + 100 }
    case 'SET_MUTED':
      return { ...state, muted: action.muted }
    case 'ADVANCE_TUTORIAL':
      return { ...state, tutorialStep: action.step }
    case 'RESET_GAME':
      return createInitialState()
    case 'RECOVER_FEED':
      return state.feedNodeIds.length ? state : { ...state, feedNodeIds: ['W001', 'C001', 'K001'], unlockedNodeIds: ['W001', 'C001', 'K001'].reduce((list, id) => appendUnique(list, id as NodeId), state.unlockedNodeIds) }
  }
}
