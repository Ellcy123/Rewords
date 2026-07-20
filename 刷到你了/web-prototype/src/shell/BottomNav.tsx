import { CircleUserRound, Compass, Gift, MessageCircle, ShoppingBag } from 'lucide-react'

interface Props {
  activeTab?: 'feed' | 'messages'
  unreadMessages?: number
  onFeed?: () => void
  onMessages?: () => void
  onGift?: () => void
  onInventory?: () => void
  onProfile?: () => void
}

export function BottomNav({ activeTab = 'feed', unreadMessages = 0, onFeed, onMessages, onGift, onInventory, onProfile }: Props) {
  return <nav className="bottom-nav" aria-label="主导航">
    <button className={activeTab === 'feed' ? 'active' : undefined} onClick={onFeed}><Compass />推荐</button>
    <button className={activeTab === 'messages' ? 'active' : undefined} onClick={onMessages} aria-label={unreadMessages ? `私信，${unreadMessages} 条未读` : '私信'}>
      <span className="nav-icon"><MessageCircle />{unreadMessages > 0 && <em>{unreadMessages}</em>}</span>私信
    </button>
    <button className="nav-gift" onClick={onGift}><Gift />改命</button>
    <button onClick={onInventory}><ShoppingBag />背包</button>
    <button onClick={onProfile}><CircleUserRound />我的</button>
  </nav>
}
