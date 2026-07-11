import { findTrigger } from '../content/triggers'
import type { ItemId, NodeId, TriggerDefinition } from '../content/types'
import type { GameState } from './state'

export type GiftResolution =
  | { kind: 'success'; trigger: TriggerDefinition; key: string }
  | { kind: 'already-triggered'; key: string }
  | { kind: 'not-selectable' }
  | { kind: 'missing-item' }

export const triggerKey = (targetNodeId: NodeId, itemId: ItemId) => `${targetNodeId}:${itemId}`

export function resolveGift(state: GameState, targetNodeId: NodeId, itemId: ItemId): GiftResolution {
  const trigger = findTrigger(targetNodeId, itemId)
  if (!trigger) return { kind: 'not-selectable' }
  const key = triggerKey(targetNodeId, itemId)
  if (state.triggeredKeys.includes(key)) return { kind: 'already-triggered', key }
  if ((state.inventory[itemId] ?? 0) < 1) return { kind: 'missing-item' }
  return { kind: 'success', trigger, key }
}
