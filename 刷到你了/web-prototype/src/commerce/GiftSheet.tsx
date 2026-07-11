import { useState } from 'react'
import type { ItemId, NodeId, VideoNode } from '../content/types'
import { selectGiftOptions } from '../engine/recommendations'
import { useGame } from '../game/useGame'
import { Sheet } from '../shell/Sheet'

interface Props {
  node: VideoNode
  onClose: () => void
  onPurchase: (itemId: ItemId) => void
  onFind: (nodeId: NodeId) => void
}

export function GiftSheet({ node, onClose, onPurchase, onFind }: Props) {
  const { state, dispatch } = useGame()
  const [selected, setSelected] = useState<ItemId | null>(null)
  const options = selectGiftOptions(state, node.id)

  return <Sheet title={`送入 ${node.title}`} onClose={onClose}>
    <p className="sheet-intro">礼物会被送回这条视频发生之前。推荐能推进主线，但你仍然可以故意选错。</p>
    <div className="gift-grid">{options.map(option => {
      const { item } = option
      return <div key={item.id} className={`gift-card ${selected === item.id ? 'selected' : ''} ${option.recommended ? 'recommended' : ''}`}>
        {option.recommended && <em className="recommend-badge">推荐赠送</em>}
        <span>{item.icon}</span><b>{item.shortName}</b>
        {option.availability === 'owned' && <button aria-label={`选择${item.shortName}`} onClick={() => setSelected(item.id)}>持有 ×{state.inventory[item.id]} · 选择</button>}
        {option.availability === 'buy' && <button aria-label={`购买${option.recommended ? '推荐' : ''}${item.shortName}`} onClick={() => onPurchase(item.id)}>去购买 · {item.price} 金币</button>}
        {option.availability === 'find' && option.destinationNodeId && <button aria-label={`寻找${option.recommended ? '推荐' : ''}${item.shortName}线索`} onClick={() => onFind(option.destinationNodeId!)}>去找线索</button>}
        {option.availability === 'unavailable' && <small>线索暂时无法定位</small>}
      </div>
    })}</div>
    <button className="primary-button" disabled={!selected} onClick={() => {
      if (!selected) return
      dispatch({ type: 'GIVE_ITEM', targetNodeId: node.id, itemId: selected })
      dispatch({ type: 'ADVANCE_TUTORIAL', step: 'done' })
      onClose()
    }}>确认送入命运</button>
  </Sheet>
}
