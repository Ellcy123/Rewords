import type { AnimationEvent } from 'react'
import type { ItemDefinition } from '../content/types'

export function PurchaseFeedback({ item, onDone }: { item: ItemDefinition; onDone: () => void }) {
  const label = `购买成功：已扣除 ${item.price} 金币，${item.shortName}已放入背包`
  const finish = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onDone()
  }

  return (
    <div className="purchase-feedback" role="status" aria-label={label} onAnimationEnd={finish}>
      <div className="purchase-reward-card">
        <small>购买成功</small>
        <span className="purchase-reward-icon" aria-hidden="true">{item.icon}</span>
        <strong>获得 {item.shortName} ×1</strong>
        <span className="purchase-debit">-{item.price} 金币</span>
      </div>
      <span className="purchase-flyer" aria-hidden="true">{item.icon}</span>
      <span className="purchase-added">{item.shortName} ×1 已放入背包</span>
    </div>
  )
}
