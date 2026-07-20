import { ITEM_BY_ID } from '../content/items'
import { NODE_BY_ID } from '../content/nodes'
import type { ItemId, NodeId } from '../content/types'
import { collectDueChatDeliveries } from '../messages/delivery'
import type { ChatMessage, PendingChatDelivery } from '../messages/types'
import type { MomentResolution } from '../moments/types'
import {
  applyTaskSignal,
  createCharacterTaskState,
  markRelationshipResponseViewed,
  type CharacterTaskId,
  type TaskSignal,
} from '../relationship/taskEngine'
import { resolveGift } from './trigger'
import { createInitialState, type ActivityTaskId, type EndingRecord, type GameState, type TutorialStep } from './state'

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
  | { type: 'MOMENT_RESOLVED'; resolution: MomentResolution }
  | { type: 'CHAT_USER_SENT'; message: ChatMessage }
  | { type: 'CHAT_DELIVERY_SCHEDULED'; delivery: PendingChatDelivery }
  | { type: 'CHAT_DUE_DELIVERIES_FLUSHED'; now: number }
  | { type: 'TASK_SIGNAL_RECEIVED'; taskId: CharacterTaskId; signal: TaskSignal }
  | { type: 'ACTIVITY_TASK_CLAIMED'; taskId: ActivityTaskId }
  | { type: 'ENDING_SAVED'; ending: EndingRecord }

const appendUnique = <T,>(list: T[], value: T): T[] => list.includes(value) ? list : [...list, value]

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOMENT_RESOLVED': {
      const resolution = action.resolution
      if (state.resolvedMomentIds.includes(resolution.momentId) || state.coins < resolution.coinCost) return state
      const relationshipEvidence = resolution.evidenceTags.reduce(
        (list, kind) => appendUnique(list, {
          id: `${resolution.momentId}:${kind}`,
          kind,
          sourceMomentId: resolution.momentId,
        }),
        state.relationshipEvidence,
      )
      const activeFeed = state.feedNodeIds.filter(id => id !== 'E001')
      return {
        ...state,
        coins: state.coins - resolution.coinCost,
        relationshipEvidence,
        resolvedMomentIds: [...state.resolvedMomentIds, resolution.momentId],
        characterTasks: {
          ...state.characterTasks,
          [resolution.invitedTaskId]: createCharacterTaskState(resolution.invitedTaskId, 'invited'),
        },
        resolvedNodeIds: appendUnique(state.resolvedNodeIds, 'E001'),
        unlockedNodeIds: appendUnique(state.unlockedNodeIds, resolution.resultNodeId),
        feedNodeIds: appendUnique(activeFeed, resolution.resultNodeId),
        currentNodeId: resolution.resultNodeId,
      }
    }
    case 'CHAT_USER_SENT':
      if (state.messages.some(message => message.id === action.message.id)) return state
      return { ...state, messages: [...state.messages, action.message] }
    case 'CHAT_DELIVERY_SCHEDULED':
      if (
        state.pendingChatDeliveries.some(delivery => delivery.id === action.delivery.id)
        || state.messages.some(message => message.id === action.delivery.message.id)
      ) return state
      return { ...state, pendingChatDeliveries: [...state.pendingChatDeliveries, action.delivery] }
    case 'CHAT_DUE_DELIVERIES_FLUSHED': {
      const { due, pending } = collectDueChatDeliveries(state.pendingChatDeliveries, action.now)
      if (!due.length) return state
      let messages = state.messages
      let unlockedNodeIds = state.unlockedNodeIds
      let feedNodeIds = state.feedNodeIds
      let characterTasks = state.characterTasks
      for (const delivery of due) {
        if (!messages.some(message => message.id === delivery.message.id)) {
          messages = [...messages, delivery.message]
        }
        let task = characterTasks.YANXIN_UNCUT_EVIDENCE
        for (const signal of delivery.taskSignals) task = applyTaskSignal(task, signal).state
        if (delivery.effect === 'unlock_e201' && task.stage === 'committed') {
          unlockedNodeIds = appendUnique(unlockedNodeIds, 'E201')
          feedNodeIds = appendUnique(feedNodeIds, 'E201')
          task = {
            ...task,
            unlockedResponseNodeIds: appendUnique(task.unlockedResponseNodeIds, 'E201'),
          }
        }
        if (task !== characterTasks.YANXIN_UNCUT_EVIDENCE) {
          characterTasks = { ...characterTasks, YANXIN_UNCUT_EVIDENCE: task }
        }
      }
      return { ...state, messages, pendingChatDeliveries: pending, unlockedNodeIds, feedNodeIds, characterTasks }
    }
    case 'TASK_SIGNAL_RECEIVED': {
      const current = state.characterTasks[action.taskId]
      const transition = applyTaskSignal(current, action.signal)
      if (transition.state === current) return state
      return { ...state, characterTasks: { ...state.characterTasks, [action.taskId]: transition.state } }
    }
    case 'ACTIVITY_TASK_CLAIMED':
      if (state.claimedActivityTaskIds.includes(action.taskId)) return state
      return { ...state, claimedActivityTaskIds: [...state.claimedActivityTaskIds, action.taskId] }
    case 'ENDING_SAVED':
      return state.ending ? state : { ...state, ending: action.ending }
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
      const discoverItemId = NODE_BY_ID[action.nodeId].onCompleteDiscoverItemId
      return {
        ...state,
        pendingResultNodeId: null,
        viewedNodeIds: appendUnique(state.viewedNodeIds, action.nodeId),
        resolvedNodeIds: completesGame ? appendUnique(state.resolvedNodeIds, action.nodeId) : state.resolvedNodeIds,
        feedNodeIds: completesGame ? state.feedNodeIds.filter(id => id !== action.nodeId) : state.feedNodeIds,
        completed: state.completed || completesGame,
        discoveredItemIds: discoverItemId ? appendUnique(state.discoveredItemIds, discoverItemId) : state.discoveredItemIds,
      }
    }
    case 'NODE_VIEWED': {
      if (state.viewedNodeIds.includes(action.nodeId)) return state
      const viewedNodeIds = [...state.viewedNodeIds, action.nodeId]
      const taskTransition = markRelationshipResponseViewed(state.characterTasks.YANXIN_UNCUT_EVIDENCE, action.nodeId)
      return {
        ...state,
        viewedNodeIds,
        coins: state.coins + 5,
        characterTasks: taskTransition.state === state.characterTasks.YANXIN_UNCUT_EVIDENCE
          ? state.characterTasks
          : { ...state.characterTasks, YANXIN_UNCUT_EVIDENCE: taskTransition.state },
      }
    }
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
