import { ITEM_BY_ID } from '../content/items'
import { NODE_BY_ID } from '../content/nodes'
import { findCorrectTrigger, findDiscoveryTrigger } from '../content/triggers'
import type { ItemDefinition, NodeId } from '../content/types'
import type { GameState } from './state'

export type GiftAvailability = 'owned' | 'buy' | 'find' | 'unavailable'

export interface GiftOption {
  item: ItemDefinition
  recommended: boolean
  availability: GiftAvailability
  destinationNodeId?: NodeId
}

export function selectGiftOptions(state: GameState, nodeId: NodeId): GiftOption[] {
  const correctItemId = findCorrectTrigger(nodeId)?.itemId
  return NODE_BY_ID[nodeId].selectableItemIds.map(itemId => {
    const item = ITEM_BY_ID[itemId]
    const recommended = correctItemId === itemId
    if (state.inventory[itemId] > 0) return { item, recommended, availability: 'owned' }
    if (state.discoveredItemIds.includes(itemId)) return { item, recommended, availability: 'buy' }

    const destinationNodeId = findDiscoveryTrigger(itemId)?.targetNodeId
    if (destinationNodeId && state.feedNodeIds.includes(destinationNodeId) && !state.resolvedNodeIds.includes(destinationNodeId)) {
      return { item, recommended, availability: 'find', destinationNodeId }
    }
    return { item, recommended, availability: 'unavailable' }
  })
}
