import { useEffect, useMemo, useState } from 'react'
import { NODE_BY_ID } from '../content/nodes'
import { rankFeed } from '../engine/feed'
import { useGame } from '../game/useGame'
import { BottomNav } from '../shell/BottomNav'
import { PlaybackProvider } from './PlaybackContext'
import { VideoFeed } from './VideoFeed'

export function FeedScreen() {
  const { state, dispatch } = useGame()
  const nodes = useMemo(() => rankFeed(state).map(id => NODE_BY_ID[id]), [state])
  const currentIndex = Math.max(0, nodes.findIndex(node => node.id === state.currentNodeId))
  const [index, setIndex] = useState(currentIndex)
  useEffect(() => {
    if (state.pendingResultNodeId) setIndex(Math.max(0, nodes.findIndex(node => node.id === state.pendingResultNodeId)))
  }, [nodes, state.pendingResultNodeId])
  const change = (next: number) => {
    setIndex(next)
    if (nodes[next]) dispatch({ type: 'SET_CURRENT_NODE', nodeId: nodes[next].id })
  }
  return <PlaybackProvider><main className="phone-shell"><VideoFeed nodes={nodes} index={index} onIndexChange={change} /><BottomNav /></main></PlaybackProvider>
}
