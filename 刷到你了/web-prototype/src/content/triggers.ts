import type { ItemId, NodeId, TriggerDefinition } from './types'

export const TRIGGERS: TriggerDefinition[] = [
  { targetNodeId: 'W001', itemId: 'ladder', resultNodeId: 'W101', kind: 'main' },
  { targetNodeId: 'K001', itemId: 'ladder', resultNodeId: 'K101', kind: 'resource', discoverItemId: 'recorder' },
  { targetNodeId: 'C001', itemId: 'recorder', resultNodeId: 'C101', kind: 'resource', discoverItemId: 'projector' },
  { targetNodeId: 'W101', itemId: 'technician', resultNodeId: 'W200', kind: 'main' },
  { targetNodeId: 'W300', itemId: 'recorder', resultNodeId: 'W301', kind: 'main' },
  { targetNodeId: 'W301', itemId: 'projector', resultNodeId: 'W400', kind: 'completion' },
  { targetNodeId: 'W001', itemId: 'technician', resultNodeId: 'X001', kind: 'wrong' },
  { targetNodeId: 'W101', itemId: 'ladder', resultNodeId: 'X004', kind: 'wrong' },
  { targetNodeId: 'W300', itemId: 'technician', resultNodeId: 'X012', kind: 'wrong' },
  { targetNodeId: 'W301', itemId: 'recorder', resultNodeId: 'X016', kind: 'wrong' },
  { targetNodeId: 'C001', itemId: 'ladder', resultNodeId: 'X021', kind: 'wrong' },
  { targetNodeId: 'K001', itemId: 'technician', resultNodeId: 'X028', kind: 'wrong' },
]

export function findTrigger(targetNodeId: NodeId, itemId: ItemId): TriggerDefinition | undefined {
  return TRIGGERS.find(trigger => trigger.targetNodeId === targetNodeId && trigger.itemId === itemId)
}
