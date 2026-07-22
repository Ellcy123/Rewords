import type { AnimationEvent } from 'react'
import type { ItemDefinition } from '../content/types'

export function PurchaseFeedback({ item, paidAmount = item.price, subsidyAmount = 0, onDone }: { item: ItemDefinition; paidAmount?: number; subsidyAmount?: number; onDone: () => void }) {
  const label = subsidyAmount > 0
    ? `购买成功：余额支付 ${paidAmount} 金币，平台补助 ${subsidyAmount} 金币，${item.shortName}已放入背包`
    : `购买成功：已扣除 ${paidAmount} 金币，${item.shortName}已放入背包`
  const finish = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onDone()
  }

  return (
    <div className="purchase-feedback" role="status" aria-label={label} onAnimationEnd={finish}>
      <div className="purchase-reward-card">
        <small>购买成功</small>
        <span className="purchase-reward-icon" aria-hidden="true">{item.icon}</span>
        <strong>获得 {item.shortName} ×1</strong>
        <span className="purchase-debit">-{paidAmount} 金币</span>
        {subsidyAmount > 0 && <span className="purchase-subsidy">平台补助 {subsidyAmount} 金币</span>}
      </div>
      <span className="purchase-flyer" aria-hidden="true">{item.icon}</span>
      <span className="purchase-added">{item.shortName} ×1 已放入背包</span>
    </div>
  )
}
