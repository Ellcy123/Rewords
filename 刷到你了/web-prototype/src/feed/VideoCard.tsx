import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Bookmark, Heart, MessageCircle, Share2, ShoppingCart, Sparkles, Volume2, VolumeX } from 'lucide-react'
import type { CaptionCue, VideoNode } from '../content/types'
import { ITEM_BY_ID } from '../content/items'
import { usePlayback } from './PlaybackContext'
import { StoryStage } from './StoryStage'

interface Props {
  node: VideoNode
  active: boolean
  onProduct?: () => void
  onGift?: () => void
  onComments?: () => void
  liked?: boolean
  favorited?: boolean
  onLike?: () => void
  onFavorite?: () => void
  onViewed?: () => void
}

export function VideoCard({ node, active, onProduct, onGift, onComments, liked = false, favorited = false, onLike, onFavorite, onViewed }: Props) {
  const product = node.productItemId ? ITEM_BY_ID[node.productItemId] : null
  const { muted, toggleSound } = usePlayback()
  const [captionState, setCaptionState] = useState<{ nodeId: string; cue: CaptionCue | null }>({ nodeId: node.id, cue: null })
  const caption = captionState.nodeId === node.id ? captionState.cue : null
  const onViewedRef = useRef(onViewed)
  useEffect(() => { onViewedRef.current = onViewed }, [onViewed])
  useEffect(() => {
    if (!active || !onViewedRef.current) return
    const timer = window.setTimeout(() => onViewedRef.current?.(), node.duration * 1_000)
    return () => window.clearTimeout(timer)
  }, [active, node.id, node.duration])
  const updateCaption = useCallback(
    (cue: CaptionCue | null) => setCaptionState({ nodeId: node.id, cue }),
    [node.id],
  )
  const handleSoundToggle = (event: MouseEvent<HTMLButtonElement>) => {
    const video = event.currentTarget.closest('.video-card')?.querySelector('video')
    if (video) {
      video.muted = !muted
      if (muted) void video.play().catch(() => undefined)
    }
    toggleSound()
  }

  return (
    <article className={`video-card channel-${node.channel}`} data-node-id={node.id}>
      <StoryStage node={node} active={active} onCaptionChange={updateCaption} />
      <header className="feed-tabs"><span>关注</span><b>推荐</b></header>
      <aside className="action-rail">
        <button aria-label="点赞" aria-pressed={liked} className={liked ? 'is-engaged' : undefined} onClick={onLike}><Heart fill={liked ? 'currentColor' : 'none'} /><small>12.8万</small></button>
        <button aria-label="评论" onClick={onComments}><MessageCircle /><small>{node.comments.length * 1280}</small></button>
        <button aria-label="收藏" aria-pressed={favorited} className={favorited ? 'is-engaged' : undefined} onClick={onFavorite}><Bookmark fill={favorited ? 'currentColor' : 'none'} /><small>收藏</small></button>
        <button aria-label="分享"><Share2 /><small>分享</small></button>
        <button
          className="sound-toggle"
          aria-label={muted ? '开启声音' : '关闭声音'}
          onPointerDown={event => event.stopPropagation()}
          onClick={handleSoundToggle}
        >
          {muted ? <VolumeX /> : <Volume2 />}
          <small>{muted ? '声音' : '有声'}</small>
        </button>
      </aside>
      <section className="video-copy">
        <b>{node.account}</b>
        <h1>{node.headline}</h1>
        {caption && <strong className="media-caption" data-caption-style={caption.style}>{caption.text}</strong>}
        <p>{node.subtitle}</p>
        {product && (
          <button
            className="product-chip"
            aria-label={`小黄车 · ${product.name} · ${product.price} 金币 · 去看看`}
            onClick={onProduct}
          >
            <span className="product-thumb" aria-hidden="true">{product.icon}</span>
            <span className="product-info">
              <small className="product-cart-label"><ShoppingCart />小黄车</small>
              <strong>{product.name}</strong>
              <small className="product-price">{product.price} 金币</small>
            </span>
            <span className="product-cta">去看看</span>
          </button>
        )}
      </section>
      <button className={`gift-fab ${node.selectableItemIds.length ? 'is-active' : ''}`} aria-label="改命礼物" onClick={onGift} disabled={!node.selectableItemIds.length}><Sparkles />改命礼物</button>
    </article>
  )
}
