import { useState, type CSSProperties } from 'react'
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

function modulo(value: number, count: number) {
  return ((value % count) + count) % count
}

export function VideoFeed({ nodes, index, onIndexChange, locked = false, onProduct, onGift, onComments }: Props) {
  const [position, setPosition] = useState(index)
  const virtualPosition = nodes.length > 0 && modulo(position, nodes.length) === index ? position : index
  const changePosition = (nextPosition: number) => {
    setPosition(nextPosition)
    if (nodes.length > 0) onIndexChange(modulo(nextPosition, nodes.length))
  }
  const navigation = useFeedNavigation({ count: nodes.length, index: virtualPosition, onChange: changePosition, locked, loop: true })
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
        const slotPosition = virtualPosition + slot
        const node = nodes.length === 1 && slot !== 0
          ? undefined
          : nodes[modulo(slotPosition, nodes.length)]
        const active = slot === 0
        const style: CSSProperties = {
          transform: `translate3d(0, calc(${slot * 100}% + ${navigation.offset}px), 0)`,
          transitionProperty: 'transform',
          transitionDuration: `${navigation.transitionMs}ms`,
          transitionTimingFunction: SETTLE_EASING,
        }
        if (!node) {
          return <div
            key={`empty-${slotPosition}`}
            className="feed-slot feed-slot--empty"
            data-testid="feed-slot"
            data-feed-slot={slot}
            data-feed-position={slotPosition}
            aria-hidden="true"
            style={style}
          />
        }
        return (
          <div
            key={slotPosition}
            className="feed-slot"
            data-testid="feed-slot"
            data-feed-slot={slot}
            data-feed-position={slotPosition}
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
