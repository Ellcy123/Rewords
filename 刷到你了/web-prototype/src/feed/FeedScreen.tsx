import { useEffect, useMemo, useState } from 'react'
import { NODE_BY_ID } from '../content/nodes'
import { ITEM_BY_ID } from '../content/items'
import type { ItemId, NodeId } from '../content/types'
import { GiftSheet } from '../commerce/GiftSheet'
import { InventorySheet } from '../commerce/InventorySheet'
import { ProductSheet } from '../commerce/ProductSheet'
import { rankFeed } from '../engine/feed'
import { DestinySheet } from '../destiny/DestinySheet'
import { CompletionOverlay } from '../destiny/CompletionOverlay'
import { useGame } from '../game/useGame'
import { BottomNav } from '../shell/BottomNav'
import { CommentsSheet } from '../shell/CommentsSheet'
import { ProfileSheet } from '../shell/ProfileSheet'
import { TutorialCue } from '../tutorial/TutorialCue'
import { PlaybackProvider } from './PlaybackContext'
import { VideoFeed } from './VideoFeed'

type Overlay =
  | { type: 'product'; itemId: ItemId; returnToGiftNodeId?: NodeId }
  | { type: 'gift' | 'comments'; nodeId: NodeId }
  | { type: 'inventory' | 'destiny' | 'profile' }

export function FeedScreen() {
  const { state, dispatch } = useGame()
  const nodes = useMemo(() => {
    const ranked = rankFeed(state)
    const ids = state.pendingResultNodeId && !ranked.includes(state.pendingResultNodeId) ? [state.pendingResultNodeId, ...ranked] : ranked
    return ids.map(id => NODE_BY_ID[id])
  }, [state])
  const currentIndex = Math.max(0, nodes.findIndex(node => node.id === state.currentNodeId))
  const [index, setIndex] = useState(currentIndex)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [completionOpen, setCompletionOpen] = useState(false)
  useEffect(() => {
    if (state.pendingResultNodeId) setIndex(Math.max(0, nodes.findIndex(node => node.id === state.pendingResultNodeId)))
  }, [nodes, state.pendingResultNodeId])
  const change = (next: number) => {
    setIndex(next)
    if (nodes[next]) dispatch({ type: 'SET_CURRENT_NODE', nodeId: nodes[next].id })
  }
  const current = nodes[index] ?? nodes[0]
  const jumpToNode = (nodeId: NodeId) => {
    const nextIndex = nodes.findIndex(node => node.id === nodeId)
    if (nextIndex < 0) return
    setOverlay(null)
    setIndex(nextIndex)
    dispatch({ type: 'SET_CURRENT_NODE', nodeId })
  }
  const finishResult = () => {
    if (!current) return
    dispatch({ type: 'RESULT_FINISHED', nodeId: current.id })
    if (current.onCompleteUnlock) dispatch({ type: 'NODE_FINISHED', nodeId: current.id })
    if (current.id === 'W400') setCompletionOpen(true)
  }
  return <PlaybackProvider><main className="phone-shell"><VideoFeed nodes={nodes} index={index} onIndexChange={change} locked={!!overlay || completionOpen} onProduct={node => node.productItemId && setOverlay({ type: 'product', itemId: node.productItemId })} onGift={node => setOverlay({ type: 'gift', nodeId: node.id })} onComments={node => setOverlay({ type: 'comments', nodeId: node.id })} />{state.pendingResultNodeId === current?.id && <button className="result-continue" onClick={finishResult}>{current.resultKind === 'wrong' ? '收进命运记录' : current.id === 'W400' ? '完成婚礼' : '继续刷'}</button>}<TutorialCue step={state.tutorialStep} /><BottomNav onDestiny={() => setOverlay({ type: 'destiny' })} onGift={() => current && setOverlay({ type: 'gift', nodeId: current.id })} onInventory={() => setOverlay({ type: 'inventory' })} onProfile={() => setOverlay({ type: 'profile' })} />{overlay?.type === 'product' && <ProductSheet item={ITEM_BY_ID[overlay.itemId]} onClose={() => setOverlay(overlay.returnToGiftNodeId ? { type: 'gift', nodeId: overlay.returnToGiftNodeId } : null)} />}{overlay?.type === 'gift' && <GiftSheet node={NODE_BY_ID[overlay.nodeId]} onClose={() => setOverlay(null)} onPurchase={itemId => setOverlay({ type: 'product', itemId, returnToGiftNodeId: overlay.nodeId })} onFind={jumpToNode} />}{overlay?.type === 'comments' && <CommentsSheet node={NODE_BY_ID[overlay.nodeId]} onClose={() => setOverlay(null)} />}{overlay?.type === 'inventory' && <InventorySheet onClose={() => setOverlay(null)} />}{overlay?.type === 'destiny' && <DestinySheet onClose={() => setOverlay(null)} onReplay={() => setOverlay(null)} />}{overlay?.type === 'profile' && <ProfileSheet onClose={() => setOverlay(null)} />}{completionOpen && <CompletionOverlay onContinue={() => setCompletionOpen(false)} onReset={() => { dispatch({ type: 'RESET_GAME' }); setCompletionOpen(false) }} />}</main></PlaybackProvider>
}
