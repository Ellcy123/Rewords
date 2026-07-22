import { ITEM_BY_ID } from '../content/items'
import { NODES, NODE_BY_ID } from '../content/nodes'
import type { ItemDefinition, NodeId, VideoNode } from '../content/types'
import type { GameState } from './state'
import { getCheckoutQuote } from './economy'

export const selectDiscoveredItems = (state: GameState): ItemDefinition[] => state.discoveredItemIds.map(id => ITEM_BY_ID[id])
export const selectOwnedItems = (state: GameState): ItemDefinition[] => state.discoveredItemIds.filter(id => state.inventory[id] > 0).map(id => ITEM_BY_ID[id])
export const selectAvailableGifts = (state: GameState, nodeId: NodeId): ItemDefinition[] => NODE_BY_ID[nodeId].selectableItemIds.filter(id => state.discoveredItemIds.includes(id)).map(id => ITEM_BY_ID[id])
export const selectDestinyNodes = (state: GameState): VideoNode[] => state.destinyNodeIds.map(id => NODE_BY_ID[id])
export const selectResolvedNodes = (state: GameState): VideoNode[] => NODES.filter(node => state.resolvedNodeIds.includes(node.id) && node.resultKind !== 'wrong')
export const selectProgress = (state: GameState): number => state.unlockedNodeIds.filter(id => !id.startsWith('X')).length
export const selectCanOpenYanxinChat = (state: GameState): boolean => state.resolvedMomentIds.includes('PK_LAST_30_SECONDS')
  || state.messages.length > 0
export const selectYanxinTaskStage = (state: GameState) => state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage
export const selectCanViewRelationshipVideo = (state: GameState): boolean => state.unlockedNodeIds.includes('E201')
export const selectCanGenerateEnding = (state: GameState): boolean => state.completed && state.ending === null
export const selectPostEndingChat = (state: GameState): boolean => state.ending !== null
export const selectItemCheckoutQuote = getCheckoutQuote
export const selectUnreadMessageCount = (state: GameState): number => state.messages.filter(message => (
  message.role === 'assistant' && !state.readMessageIds.includes(message.id)
)).length
