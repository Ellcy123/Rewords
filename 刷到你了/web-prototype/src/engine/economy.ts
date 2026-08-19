import { ITEM_BY_ID } from '../content/items'
import type { ItemId } from '../content/types'
import type { GameState } from './state'

export interface CheckoutQuote {
  canPurchase: boolean
  grossAmount: number
  playerPaidAmount: number
  subsidyAmount: number
}

function remainingRequiredCount(state: GameState, itemId: ItemId): number {
  if (itemId === 'recorder') {
    return Number(!state.resolvedNodeIds.includes('C001')) + Number(!state.resolvedNodeIds.includes('W300'))
  }
  const item = ITEM_BY_ID[itemId]
  return item.mainlineUseNodeIds.filter(nodeId => !state.resolvedNodeIds.includes(nodeId)).length
}

export function getCheckoutQuote(state: GameState, itemId: ItemId): CheckoutQuote {
  const item = ITEM_BY_ID[itemId]
  if (!state.discoveredItemIds.includes(itemId)) {
    return { canPurchase: false, grossAmount: item.price, playerPaidAmount: 0, subsidyAmount: 0 }
  }
  if (state.coins >= item.price) {
    return { canPurchase: true, grossAmount: item.price, playerPaidAmount: item.price, subsidyAmount: 0 }
  }
  const eligibleForSubsidy = item.requiredForMainline
    && state.inventory[itemId] === 0
    && remainingRequiredCount(state, itemId) > 0
  if (!eligibleForSubsidy) {
    return { canPurchase: false, grossAmount: item.price, playerPaidAmount: 0, subsidyAmount: 0 }
  }
  return {
    canPurchase: true,
    grossAmount: item.price,
    playerPaidAmount: state.coins,
    subsidyAmount: item.price - state.coins,
  }
}
