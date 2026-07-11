import { CircleUserRound, Compass, Gift, History, ShoppingBag } from 'lucide-react'

export function BottomNav({ onDestiny, onGift, onInventory, onProfile }: { onDestiny?: () => void; onGift?: () => void; onInventory?: () => void; onProfile?: () => void }) {
  return <nav className="bottom-nav" aria-label="主导航">
    <button className="active"><Compass />推荐</button>
    <button onClick={onDestiny}><History />命运</button>
    <button className="nav-gift" onClick={onGift}><Gift />改命</button>
    <button onClick={onInventory}><ShoppingBag />背包</button>
    <button onClick={onProfile}><CircleUserRound />我的</button>
  </nav>
}
