import { Bookmark, Heart, MessageCircle, Share2, Sparkles } from 'lucide-react'
import type { VideoNode } from '../content/types'
import { ITEM_BY_ID } from '../content/items'
import { StoryStage } from './StoryStage'

interface Props {
  node: VideoNode
  active: boolean
  onProduct?: () => void
  onGift?: () => void
  onComments?: () => void
  onPlaybackComplete?: () => void
}

export function VideoCard({ node, active, onProduct, onGift, onComments, onPlaybackComplete }: Props) {
  const product = node.productItemId ? ITEM_BY_ID[node.productItemId] : null
  return (
    <article className={`video-card channel-${node.channel}`} data-node-id={node.id}>
      <StoryStage node={node} active={active} onPlaybackComplete={onPlaybackComplete} />
      <header className="feed-tabs"><span>关注</span><b>推荐</b></header>
      <aside className="action-rail">
        <button aria-label="点赞"><Heart /><small>12.8万</small></button>
        <button aria-label="评论" onClick={onComments}><MessageCircle /><small>{node.comments.length * 1280}</small></button>
        <button aria-label="收藏"><Bookmark /><small>收藏</small></button>
        <button aria-label="分享"><Share2 /><small>分享</small></button>
      </aside>
      <section className="video-copy">
        <b>{node.account}</b>
        <h1>{node.headline}</h1>
        <p>{node.subtitle}</p>
        {product && <button className="product-chip" onClick={onProduct}><span>{product.icon}</span>{product.name}<em>›</em></button>}
      </section>
      <button className={`gift-fab ${node.selectableItemIds.length ? 'is-active' : ''}`} aria-label="改命礼物" onClick={onGift} disabled={!node.selectableItemIds.length}><Sparkles />改命礼物</button>
    </article>
  )
}
