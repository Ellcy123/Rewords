import { NODE_BY_ID } from '../content/nodes'
import type { NodeId } from '../content/types'
import type { GameState } from './state'

function score(state: GameState, id: NodeId): number {
  if (state.pendingResultNodeId === id) return 1000
  if (!state.viewedNodeIds.includes(id)) return 300
  return 0
}

export function rankFeed(state: GameState): NodeId[] {
  const candidates = state.feedNodeIds
    .filter(id => NODE_BY_ID[id].resultKind !== 'wrong')
    .map((id, index) => ({ id, index, score: score(state, id) }))
    .sort((a, b) => b.score - a.score || a.index - b.index || a.id.localeCompare(b.id))

  const result: NodeId[] = []
  while (candidates.length > 0) {
    const previous = result.at(-1)
    const previousChannel = previous ? NODE_BY_ID[previous].channel : null
    const topScore = candidates[0].score
    const alternative = candidates.findIndex(candidate => candidate.score === topScore && NODE_BY_ID[candidate.id].channel !== previousChannel)
    const index = alternative >= 0 ? alternative : 0
    result.push(candidates.splice(index, 1)[0].id)
  }
  return result
}
