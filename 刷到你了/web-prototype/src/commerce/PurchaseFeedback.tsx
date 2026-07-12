import type { AnimationEvent } from 'react'
import type { ItemDefinition } from '../content/types'

export function PurchaseFeedback({ item, onDone }: { item: ItemDefinition; onDone: () => void }) {
  const label = `购买成功：已扣除 ${item.price} 金币，${item.shortName}已放入背包`
  const finish = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onDone()
  }

  return (
    <div className="purchase-feedback" role="status" aria-label={label} onAnimationEnd={finish}>
      <span className="purchase-debit">-{item.price} 金币</span>
      <span className="purchase-flyer" aria-hidden="true">{item.icon}</span>
      <span className="purchase-added">已放入背包</span>
    </div>
  )
}
