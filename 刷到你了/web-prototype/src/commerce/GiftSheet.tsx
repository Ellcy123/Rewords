import { useState } from 'react'
import type { ItemId, VideoNode } from '../content/types'
import { selectAvailableGifts } from '../engine/selectors'
import { useGame } from '../game/useGame'
import { Sheet } from '../shell/Sheet'

export function GiftSheet({ node, onClose }: { node: VideoNode; onClose: () => void }) {
  const { state, dispatch } = useGame()
  const [selected, setSelected] = useState<ItemId | null>(null)
  const items = selectAvailableGifts(state, node.id)
  return <Sheet title={`送入 ${node.title}`} onClose={onClose}><p className="sheet-intro">礼物会被送回这条视频发生之前。每次投放都会产生一条新的命运。</p><div className="gift-grid">{items.map(item => <button key={item.id} className={selected === item.id ? 'selected' : ''} aria-label={`选择${item.shortName}`} disabled={state.inventory[item.id] < 1} onClick={() => setSelected(item.id)}><span>{item.icon}</span><b>{item.shortName}</b><small>{state.inventory[item.id] ? `持有 ×${state.inventory[item.id]}` : '尚未购买'}</small></button>)}</div><button className="primary-button" disabled={!selected} onClick={() => { if (!selected) return; dispatch({ type: 'GIVE_ITEM', targetNodeId: node.id, itemId: selected }); dispatch({ type: 'ADVANCE_TUTORIAL', step: 'done' }); onClose() }}>确认送入命运</button></Sheet>
}
