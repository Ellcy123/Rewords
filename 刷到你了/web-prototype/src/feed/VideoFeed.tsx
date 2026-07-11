import type { CSSProperties } from 'react'
import type { VideoNode } from '../content/types'
import { useFeedNavigation } from './useFeedNavigation'
import { VideoCard } from './VideoCard'

interface Props {
  nodes: VideoNode[]
  index: number
  onIndexChange: (index: number) => void
  locked?: boolean
  onProduct?: (node: VideoNode) => void
  onGift?: (node: VideoNode) => void
  onComments?: (node: VideoNode) => void
}

const FEED_SLOTS = [-1, 0, 1] as const
const SETTLE_EASING = 'cubic-bezier(.2,.72,.2,1)'

export function VideoFeed({ nodes, index, onIndexChange, locked = false, onProduct, onGift, onComments }: Props) {
  const navigation = useFeedNavigation({ count: nodes.length, index, onChange: onIndexChange, locked })
  const { onTransitionEnd, ...feedHandlers } = navigation.handlers
  if (!nodes[index] && !nodes[0]) return null

  return (
    <div
      className="video-feed"
      data-testid="video-feed"
      data-feed-phase={navigation.phase}
      {...feedHandlers}
    >
      {FEED_SLOTS.map(slot => {
        const node = nodes[index + slot]
        const active = slot === 0
        const style: CSSProperties = {
          transform: `translate3d(0, calc(${slot * 100}% + ${navigation.offset}px), 0)`,
          transitionProperty: 'transform',
          transitionDuration: `${navigation.transitionMs}ms`,
          transitionTimingFunction: SETTLE_EASING,
        }
        if (!node) {
          return <div
            key={`empty-${slot}`}
            className="feed-slot feed-slot--empty"
            data-testid="feed-slot"
            data-feed-slot={slot}
            aria-hidden="true"
            style={style}
          />
        }
        return (
          <div
            key={node.id}
            className="feed-slot"
            data-testid="feed-slot"
            data-feed-slot={slot}
            data-feed-active={active ? 'true' : 'false'}
            data-node-id={node.id}
            aria-hidden={active ? undefined : true}
            inert={active ? undefined : true}
            style={style}
            onTransitionEnd={active ? onTransitionEnd : undefined}
          >
            <VideoCard
              node={node}
              active={active}
              onProduct={() => onProduct?.(node)}
              onGift={() => onGift?.(node)}
              onComments={() => onComments?.(node)}
            />
          </div>
        )
      })}
    </div>
  )
}
