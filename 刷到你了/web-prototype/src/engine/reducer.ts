import { ITEM_BY_ID } from '../content/items'
import { NODE_BY_ID } from '../content/nodes'
import type { ItemId, NodeId } from '../content/types'
import { collectDueChatDeliveries } from '../messages/delivery'
import type { ChatMessage, PendingChatDelivery } from '../messages/types'
import type { MomentResolution } from '../moments/types'
import { applyRelationshipEvidence } from '../relationship/relationshipEngine'
import {
  applyTaskSignal,
  createCharacterTaskState,
  markRelationshipResponseViewed,
  recordTaskRelevantFallback,
  type CharacterTaskId,
  type TaskSignal,
} from '../relationship/taskEngine'
import { resolveGift } from './trigger'
import { ACTIVITY_TASK_BY_ID, getActivityProgress } from '../activity/catalog'
import { getCheckoutQuote } from './economy'
import { createInitialState, type ActivityTaskId, type EndingRecord, type GameState, type TutorialStep } from './state'

export type GameAction =
  | { type: 'BUY_ITEM'; itemId: ItemId }
  | { type: 'GIVE_ITEM'; targetNodeId: NodeId; itemId: ItemId }
  | { type: 'RESULT_FINISHED'; nodeId: NodeId }
  | { type: 'NODE_VIEWED'; nodeId: NodeId }
  | { type: 'SET_CURRENT_NODE'; nodeId: NodeId }
  | { type: 'VIDEO_LIKED'; nodeId: NodeId }
  | { type: 'VIDEO_FAVORITED'; nodeId: NodeId }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'ADVANCE_TUTORIAL'; step: TutorialStep }
  | { type: 'RESET_GAME' }
  | { type: 'RECOVER_FEED' }
  | { type: 'MOMENT_RESOLVED'; resolution: MomentResolution }
  | { type: 'CHAT_USER_SENT'; message: ChatMessage }
  | { type: 'CHAT_MESSAGES_READ' }
  | { type: 'CHAT_DELIVERY_SCHEDULED'; delivery: PendingChatDelivery }
  | { type: 'CHAT_DELIVERY_REPLACED'; delivery: PendingChatDelivery }
  | { type: 'CHAT_DUE_DELIVERIES_FLUSHED'; now: number }
  | { type: 'TASK_SIGNAL_RECEIVED'; taskId: CharacterTaskId; signal: TaskSignal }
  | { type: 'ACTIVITY_TASK_CLAIMED'; taskId: ActivityTaskId }
  | { type: 'ENDING_SAVED'; ending: EndingRecord }

const appendUnique = <T,>(list: T[], value: T): T[] => list.includes(value) ? list : [...list, value]

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOMENT_RESOLVED': {
      const resolution = action.resolution
      if (
        !state.unlockedNodeIds.includes('E001')
        || state.resolvedMomentIds.includes(resolution.momentId)
        || state.coins < resolution.coinCost
      ) return state
      const relationshipEvidence = resolution.evidenceTags.reduce(
        (list, kind) => appendUnique(list, {
          id: `${resolution.momentId}:${kind}`,
          kind,
          sourceMomentId: resolution.momentId,
        }),
        state.relationshipEvidence,
      )
      const yanxinPersona = resolution.choiceId === 'support'
        ? applyRelationshipEvidence(state.yanxinPersona, {
          kind: 'public_financial_support',
          sourceMessageId: `game-event:${resolution.momentId}`,
        }, 0).state
        : state.yanxinPersona
      const activeFeed = state.feedNodeIds.filter(id => id !== 'E001')
      return {
        ...state,
        coins: state.coins - resolution.coinCost,
        relationshipEvidence,
        yanxinPersona,
        resolvedMomentIds: [...state.resolvedMomentIds, resolution.momentId],
        characterTasks: {
          ...state.characterTasks,
          [resolution.invitedTaskId]: createCharacterTaskState(resolution.invitedTaskId, 'invited'),
        },
        resolvedNodeIds: appendUnique(state.resolvedNodeIds, 'E001'),
        unlockedNodeIds: appendUnique(state.unlockedNodeIds, resolution.resultNodeId),
        feedNodeIds: appendUnique(activeFeed, resolution.resultNodeId),
        currentNodeId: resolution.resultNodeId,
        ledger: resolution.coinCost > 0 ? [...state.ledger, {
          id: `moment:${resolution.momentId}`,
          reason: 'moment_spend',
          amount: -resolution.coinCost,
          grossAmount: resolution.coinCost,
          playerPaidAmount: resolution.coinCost,
          subsidyAmount: 0,
        }] : state.ledger,
      }
    }
    case 'CHAT_USER_SENT':
      if (state.messages.some(message => message.id === action.message.id)) return state
      return { ...state, messages: [...state.messages, action.message] }
    case 'CHAT_MESSAGES_READ': {
      const readMessageIds = state.messages.map(message => message.id)
      if (readMessageIds.length === state.readMessageIds.length && readMessageIds.every(id => state.readMessageIds.includes(id))) return state
      return { ...state, readMessageIds }
    }
    case 'CHAT_DELIVERY_SCHEDULED':
      if (
        state.pendingChatDeliveries.some(delivery => delivery.id === action.delivery.id)
        || state.messages.some(message => message.id === action.delivery.message.id)
      ) return state
      return { ...state, pendingChatDeliveries: [...state.pendingChatDeliveries, action.delivery] }
    case 'CHAT_DELIVERY_REPLACED': {
      const index = state.pendingChatDeliveries.findIndex(delivery => delivery.id === action.delivery.id)
      if (index < 0 || state.pendingChatDeliveries[index].message.id !== action.delivery.message.id) return state
      const pendingChatDeliveries = [...state.pendingChatDeliveries]
      pendingChatDeliveries[index] = action.delivery
      return { ...state, pendingChatDeliveries }
    }
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
        const taskBeforeSignals = task
        for (const signal of delivery.taskSignals) task = applyTaskSignal(task, signal).state
        if (delivery.kind === 'reply' && task === taskBeforeSignals) {
          task = recordTaskRelevantFallback(task).state
        }
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
      if (getActivityProgress(state, action.taskId) < ACTIVITY_TASK_BY_ID[action.taskId].target) return state
      return {
        ...state,
        coins: state.coins + ACTIVITY_TASK_BY_ID[action.taskId].reward,
        claimedActivityTaskIds: [...state.claimedActivityTaskIds, action.taskId],
        ledger: [...state.ledger, {
          id: `activity:${action.taskId}`,
          reason: 'activity_reward',
          amount: ACTIVITY_TASK_BY_ID[action.taskId].reward,
        }],
      }
    case 'ENDING_SAVED':
      return state.ending ? state : { ...state, ending: action.ending }
    case 'BUY_ITEM': {
      const item = ITEM_BY_ID[action.itemId]
      const quote = getCheckoutQuote(state, action.itemId)
      if (!quote.canPurchase) return state
      const purchaseNumber = state.ledger.filter(entry => entry.id.startsWith(`purchase:${action.itemId}:`)).length + 1
      return {
        ...state,
        coins: state.coins - quote.playerPaidAmount,
        inventory: { ...state.inventory, [action.itemId]: state.inventory[action.itemId] + 1 },
        ledger: [...state.ledger, {
          id: `purchase:${action.itemId}:${purchaseNumber}`,
          reason: quote.subsidyAmount > 0 ? 'solvency_subsidy' : 'item_purchase',
          amount: -quote.playerPaidAmount,
          grossAmount: item.price,
          playerPaidAmount: quote.playerPaidAmount,
          subsidyAmount: quote.subsidyAmount,
        }],
      }
    }
    case 'GIVE_ITEM': {
      const resolution = resolveGift(state, action.targetNodeId, action.itemId)
      if (resolution.kind !== 'success') return state
      const { trigger, key } = resolution
      const wrong = trigger.kind === 'wrong'
      const interactiveResult = !wrong && NODE_BY_ID[trigger.resultNodeId].selectableItemIds.length > 0
      const resolvedNodeIds = wrong ? state.resolvedNodeIds : appendUnique(state.resolvedNodeIds, action.targetNodeId)
      const activeFeed = wrong ? state.feedNodeIds : state.feedNodeIds.filter(id => id !== action.targetNodeId)
      const mainReward = !wrong
        && (['W001', 'W101', 'W300'] as NodeId[]).includes(action.targetNodeId)
        && !state.ledger.some(entry => entry.id === `main:${action.targetNodeId}`)
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
        coins: state.coins + (mainReward ? 10 : 0),
        ledger: mainReward ? [...state.ledger, {
          id: `main:${action.targetNodeId}`,
          reason: 'main_reward',
          amount: 10,
        }] : state.ledger,
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
      const discoverItemId = NODE_BY_ID[action.nodeId].onCompleteDiscoverItemId
      return {
        ...state,
        viewedNodeIds,
        discoveredItemIds: discoverItemId ? appendUnique(state.discoveredItemIds, discoverItemId) : state.discoveredItemIds,
        characterTasks: taskTransition.state === state.characterTasks.YANXIN_UNCUT_EVIDENCE
          ? state.characterTasks
          : { ...state.characterTasks, YANXIN_UNCUT_EVIDENCE: taskTransition.state },
      }
    }
    case 'VIDEO_LIKED':
      if (state.likedNodeIds.includes(action.nodeId)) return state
      return { ...state, likedNodeIds: [...state.likedNodeIds, action.nodeId] }
    case 'VIDEO_FAVORITED':
      if (state.favoritedNodeIds.includes(action.nodeId)) return state
      return { ...state, favoritedNodeIds: [...state.favoritedNodeIds, action.nodeId] }
    case 'SET_CURRENT_NODE':
      return state.currentNodeId === action.nodeId ? state : { ...state, currentNodeId: action.nodeId }
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
