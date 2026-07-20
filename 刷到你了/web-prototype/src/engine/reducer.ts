import { ITEM_BY_ID } from '../content/items'
import { NODE_BY_ID } from '../content/nodes'
import type { ItemId, NodeId } from '../content/types'
import { resolveGift } from './trigger'
import { createInitialState, type GameState, type TutorialStep } from './state'

export type GameAction =
  | { type: 'BUY_ITEM'; itemId: ItemId }
  | { type: 'GIVE_ITEM'; targetNodeId: NodeId; itemId: ItemId }
  | { type: 'RESULT_FINISHED'; nodeId: NodeId }
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
      const interactiveResult = !wrong && NODE_BY_ID[trigger.resultNodeId].selectableItemIds.length > 0
      const resolvedNodeIds = wrong ? state.resolvedNodeIds : appendUnique(state.resolvedNodeIds, action.targetNodeId)
      const activeFeed = wrong ? state.feedNodeIds : state.feedNodeIds.filter(id => id !== action.targetNodeId)
      const unlockedNodeIds = (trigger.additionalUnlockNodeIds ?? []).reduce(
        (list, id) => appendUnique(list, id),
        appendUnique(state.unlockedNodeIds, trigger.resultNodeId),
      )
      const feedNodeIds = (trigger.additionalUnlockNodeIds ?? []).reduce(
        (list, id) => appendUnique(list, id),
        wrong ? state.feedNodeIds : appendUnique(activeFeed, trigger.resultNodeId),
      )
      return {
        ...state,
        inventory: { ...state.inventory, [action.itemId]: state.inventory[action.itemId] - 1 },
        triggeredKeys: [...state.triggeredKeys, key],
        resolvedNodeIds,
        unlockedNodeIds,
        feedNodeIds,
        destinyNodeIds: wrong ? appendUnique(state.destinyNodeIds, trigger.resultNodeId) : state.destinyNodeIds,
        discoveredItemIds: trigger.discoverItemId ? appendUnique(state.discoveredItemIds, trigger.discoverItemId) : state.discoveredItemIds,
        currentNodeId: interactiveResult ? trigger.resultNodeId : state.currentNodeId,
        pendingResultNodeId: interactiveResult ? null : trigger.resultNodeId,
      }
    }
    case 'RESULT_FINISHED': {
      const completesGame = action.nodeId === 'W400'
      return {
        ...state,
        pendingResultNodeId: null,
        viewedNodeIds: appendUnique(state.viewedNodeIds, action.nodeId),
        resolvedNodeIds: completesGame ? appendUnique(state.resolvedNodeIds, action.nodeId) : state.resolvedNodeIds,
        feedNodeIds: completesGame ? state.feedNodeIds.filter(id => id !== action.nodeId) : state.feedNodeIds,
        completed: state.completed || completesGame,
      }
    }
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
      if (state.feedNodeIds.length || state.completed) return state
      const recoverable = state.unlockedNodeIds.filter(id => !state.resolvedNodeIds.includes(id) && NODE_BY_ID[id].resultKind !== 'wrong')
      if (recoverable.length) return { ...state, feedNodeIds: recoverable }
      const roots = (['W001', 'C001', 'K001'] as NodeId[]).filter(id => !state.resolvedNodeIds.includes(id))
      return { ...state, feedNodeIds: roots, unlockedNodeIds: roots.reduce((list, id) => appendUnique(list, id), state.unlockedNodeIds) }
  }
}
