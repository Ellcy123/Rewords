import { useMemo, useState } from 'react'
import { GiftSheet } from '../commerce/GiftSheet'
import { InventorySheet } from '../commerce/InventorySheet'
import { ProductSheet } from '../commerce/ProductSheet'
import { PurchaseFeedback } from '../commerce/PurchaseFeedback'
import { ITEM_BY_ID } from '../content/items'
import { NODE_BY_ID } from '../content/nodes'
import type { ItemId, NodeId } from '../content/types'
import { CompletionOverlay } from '../destiny/CompletionOverlay'
import { RecordsSheet } from '../destiny/RecordsSheet'
import { rankFeed } from '../engine/feed'
import type { CheckoutQuote } from '../engine/economy'
import { useGame } from '../game/useGame'
import { BottomNav } from '../shell/BottomNav'
import { CommentsSheet } from '../shell/CommentsSheet'
import { ProfileSheet } from '../shell/ProfileSheet'
import { TutorialCue } from '../tutorial/TutorialCue'
import { PlaybackProvider } from './PlaybackContext'
import { ReplayOverlay } from './ReplayOverlay'
import { VideoFeed } from './VideoFeed'

type Overlay =
  | { type: 'product'; itemId: ItemId; returnToGiftNodeId?: NodeId }
  | { type: 'gift' | 'comments' | 'replay'; nodeId: NodeId }
  | { type: 'inventory' | 'records' | 'profile' }

interface PurchaseReceipt extends CheckoutQuote { itemId: ItemId }

export function FeedScreen() {
  const { state, dispatch } = useGame()
  const nodes = useMemo(() => {
    const ranked = rankFeed(state)
    const ids = state.pendingResultNodeId && !ranked.includes(state.pendingResultNodeId)
      ? [state.pendingResultNodeId, ...ranked]
      : ranked
    return ids.map(id => NODE_BY_ID[id])
  }, [state])
  const focusNodeId = state.pendingResultNodeId ?? state.currentNodeId
  const index = Math.max(0, nodes.findIndex(node => node.id === focusNodeId))
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseReceipt | null>(null)
  const current = nodes[index] ?? nodes[0]
  const feedLocked = !!overlay || completionOpen || state.pendingResultNodeId !== null

  const change = (next: number) => {
    if (nodes[next]) dispatch({ type: 'SET_CURRENT_NODE', nodeId: nodes[next].id })
  }

  const jumpToNode = (nodeId: NodeId) => {
    const nextIndex = nodes.findIndex(node => node.id === nodeId)
    if (nextIndex < 0) return
    setOverlay(null)
    dispatch({ type: 'SET_CURRENT_NODE', nodeId })
  }

  const finishResult = () => {
    if (!current) return
    dispatch({ type: 'RESULT_FINISHED', nodeId: current.id })
    if (current.id === 'W400') setCompletionOpen(true)
  }

  return (
    <PlaybackProvider
      muted={state.muted}
      onMutedChange={muted => dispatch({ type: 'SET_MUTED', muted })}
    >
      <main className="phone-shell">
        <VideoFeed
          nodes={nodes}
          index={index}
          onIndexChange={change}
          locked={feedLocked}
          onProduct={node => node.productItemId && setOverlay({ type: 'product', itemId: node.productItemId })}
          onGift={node => setOverlay({ type: 'gift', nodeId: node.id })}
          onComments={node => setOverlay({ type: 'comments', nodeId: node.id })}
          likedNodeIds={state.likedNodeIds}
          favoritedNodeIds={state.favoritedNodeIds}
          onLike={node => dispatch({ type: 'VIDEO_LIKED', nodeId: node.id })}
          onFavorite={node => dispatch({ type: 'VIDEO_FAVORITED', nodeId: node.id })}
          onViewed={node => dispatch({ type: 'NODE_VIEWED', nodeId: node.id })}
        />
        {state.pendingResultNodeId === current?.id && (
          <button className="result-continue" onClick={finishResult}>
            {current.resultKind === 'wrong' ? '收进命运记录' : current.id === 'W400' ? '完成婚礼' : '继续刷'}
          </button>
        )}
        <TutorialCue step={state.tutorialStep} />
        <BottomNav
          onRecords={() => setOverlay({ type: 'records' })}
          onGift={() => current && setOverlay({ type: 'gift', nodeId: current.id })}
          onInventory={() => setOverlay({ type: 'inventory' })}
          onProfile={() => setOverlay({ type: 'profile' })}
        />
        {overlay?.type === 'product' && (
          <ProductSheet
            item={ITEM_BY_ID[overlay.itemId]}
            onClose={() => setOverlay(overlay.returnToGiftNodeId ? { type: 'gift', nodeId: overlay.returnToGiftNodeId } : null)}
            onPurchased={(item, quote) => {
              setPurchaseReceipt({ itemId: item.id, ...quote })
              setOverlay(overlay.returnToGiftNodeId ? { type: 'gift', nodeId: overlay.returnToGiftNodeId } : null)
            }}
          />
        )}
        {overlay?.type === 'gift' && (
          <GiftSheet
            node={NODE_BY_ID[overlay.nodeId]}
            onClose={() => setOverlay(null)}
            onPurchase={itemId => setOverlay({ type: 'product', itemId, returnToGiftNodeId: overlay.nodeId })}
            onFind={jumpToNode}
          />
        )}
        {overlay?.type === 'comments' && <CommentsSheet node={NODE_BY_ID[overlay.nodeId]} onClose={() => setOverlay(null)} />}
        {overlay?.type === 'inventory' && <InventorySheet onClose={() => setOverlay(null)} />}
        {overlay?.type === 'records' && <RecordsSheet onClose={() => setOverlay(null)} onReplay={nodeId => setOverlay({ type: 'replay', nodeId })} />}
        {overlay?.type === 'replay' && <ReplayOverlay node={NODE_BY_ID[overlay.nodeId]} onClose={() => setOverlay({ type: 'records' })} />}
        {overlay?.type === 'profile' && <ProfileSheet onClose={() => setOverlay(null)} />}
        {purchaseReceipt && (
          <PurchaseFeedback
            item={ITEM_BY_ID[purchaseReceipt.itemId]}
            paidAmount={purchaseReceipt.playerPaidAmount}
            subsidyAmount={purchaseReceipt.subsidyAmount}
            onDone={() => {
              setPurchaseReceipt(null)
              dispatch({ type: 'ADVANCE_TUTORIAL', step: 'gift' })
            }}
          />
        )}
        {completionOpen && (
          <CompletionOverlay
            onContinue={() => setCompletionOpen(false)}
            onReset={() => {
              dispatch({ type: 'RESET_GAME' })
              setCompletionOpen(false)
            }}
          />
        )}
      </main>
    </PlaybackProvider>
  )
}
