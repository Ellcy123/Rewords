import type { ContentCatalog } from './types'

function duplicates(values: string[]): string[] {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return [...repeated]
}

export function validateContent(catalog: ContentCatalog): string[] {
  const errors: string[] = []
  const nodeIds = new Set(catalog.nodes.map(node => node.id as string))
  const itemIds = new Set(catalog.items.map(item => item.id as string))
  const triggerKeys = new Set(
    catalog.triggers.map(trigger => `${trigger.targetNodeId}:${trigger.itemId}`),
  )

  for (const id of duplicates(catalog.nodes.map(node => node.id as string))) {
    errors.push(`duplicate node id: ${id}`)
  }
  for (const id of duplicates(catalog.items.map(item => item.id as string))) {
    errors.push(`duplicate item id: ${id}`)
  }

  for (const node of catalog.nodes) {
    if (node.duration < 1 || node.duration > 15) errors.push(`invalid duration: ${node.id}`)
    if (node.media) {
      if (!node.media.src.trim()) errors.push(`invalid media src: ${node.id}`)
      if (!node.media.poster.trim()) errors.push(`invalid media poster: ${node.id}`)
      node.media.captions.forEach((cue, index) => {
        if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start) {
          errors.push(`invalid caption range: ${node.id}:${index}`)
        }
        if (!cue.text.trim()) errors.push(`empty caption text: ${node.id}:${index}`)
        if (cue.end > node.duration) errors.push(`caption exceeds duration: ${node.id}:${index}`)
        const previous = node.media?.captions[index - 1]
        if (previous && cue.start < previous.end) {
          errors.push(`overlapping captions: ${node.id}:${index - 1}:${index}`)
        }
      })
    }
    if (node.resultKind === 'wrong' && node.selectableItemIds.length > 0) {
      errors.push(`wrong result exposes gifts: ${node.id}`)
    }
    for (const itemId of node.selectableItemIds) {
      if (!itemIds.has(itemId)) errors.push(`unknown selectable item: ${node.id}:${itemId}`)
      if (!triggerKeys.has(`${node.id}:${itemId}`)) {
        errors.push(`selectable item has no trigger: ${node.id}:${itemId}`)
      }
    }
  }

  for (const trigger of catalog.triggers) {
    if (!nodeIds.has(trigger.targetNodeId)) errors.push(`unknown target node: ${trigger.targetNodeId}`)
    if (!nodeIds.has(trigger.resultNodeId)) errors.push(`unknown result node: ${trigger.resultNodeId}`)
    if (!itemIds.has(trigger.itemId)) errors.push(`unknown trigger item: ${trigger.itemId}`)
    if (trigger.discoverItemId && !itemIds.has(trigger.discoverItemId)) {
      errors.push(`unknown discovered item: ${trigger.discoverItemId}`)
    }
  }
  return errors
}
