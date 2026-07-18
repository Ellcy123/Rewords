import type { ItemDefinition } from '../content/types'
import { useGame } from '../game/useGame'
import { Sheet } from '../shell/Sheet'

interface Props {
  item: ItemDefinition
  onClose: () => void
  onPurchased: (item: ItemDefinition) => void
}

export function ProductSheet({ item, onClose, onPurchased }: Props) {
  const { state, dispatch } = useGame()
  const owned = state.inventory[item.id]
  const canBuy = state.coins >= item.price

  const buy = () => {
    if (!canBuy) return
    dispatch({ type: 'BUY_ITEM', itemId: item.id })
    onPurchased(item)
  }

  return (
    <Sheet title="商品详情" onClose={onClose}>
      <div className="product-hero">
        <span>{item.icon}</span>
        <div><h3>{item.name}</h3><p>{item.description}</p></div>
      </div>
      <div className="balance"><span>余额</span><b>{state.coins} 金币</b></div>
      <div className="owned-line">{item.shortName} ×{owned}</div>
      {canBuy
        ? <button className="primary-button" aria-label={`购买 ${item.price} 金币`} onClick={buy}>购买 {item.price} 金币</button>
        : <button className="primary-button" onClick={() => dispatch({ type: 'CLAIM_DEMO_COINS' })}>领取试玩金币</button>}
    </Sheet>
  )
}
