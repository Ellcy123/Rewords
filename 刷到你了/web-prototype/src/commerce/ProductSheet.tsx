import type { ItemDefinition } from '../content/types'
import { selectItemCheckoutQuote } from '../engine/selectors'
import type { CheckoutQuote } from '../engine/economy'
import { useGame } from '../game/useGame'
import { Sheet } from '../shell/Sheet'

interface Props {
  item: ItemDefinition
  onClose: () => void
  onPurchased: (item: ItemDefinition, quote: CheckoutQuote) => void
}

export function ProductSheet({ item, onClose, onPurchased }: Props) {
  const { state, dispatch } = useGame()
  const owned = state.inventory[item.id]
  const quote = selectItemCheckoutQuote(state, item.id)

  const buy = () => {
    if (!quote.canPurchase) return
    dispatch({ type: 'BUY_ITEM', itemId: item.id })
    onPurchased(item, quote)
  }

  return (
    <Sheet title="商品详情" onClose={onClose}>
      <div className="product-hero">
        <span>{item.icon}</span>
        <div><h3>{item.name}</h3><p>{item.description}</p></div>
      </div>
      <div className="balance"><span>余额</span><b>{state.coins} 金币</b></div>
      <div className="owned-line">{item.shortName} ×{owned}</div>
      {quote.subsidyAmount > 0 && <p className="checkout-subsidy">平台体验补助抵扣 {quote.subsidyAmount} 金币，本次余额支付 {quote.playerPaidAmount}。</p>}
      <button
        className="primary-button"
        aria-label={quote.canPurchase ? `购买 ${quote.playerPaidAmount} 金币` : '余额不足'}
        onClick={buy}
        disabled={!quote.canPurchase}
      >{quote.canPurchase ? `购买 ${quote.playerPaidAmount} 金币` : '余额不足'}</button>
    </Sheet>
  )
}
