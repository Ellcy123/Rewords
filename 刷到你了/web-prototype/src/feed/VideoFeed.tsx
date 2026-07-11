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

export function VideoFeed({ nodes, index, onIndexChange, locked = false, onProduct, onGift, onComments }: Props) {
  const navigation = useFeedNavigation({ count: nodes.length, index, onChange: onIndexChange, locked })
  const current = nodes[index] ?? nodes[0]
  if (!current) return null
  return <div className="video-feed" {...navigation}><VideoCard node={current} active onProduct={() => onProduct?.(current)} onGift={() => onGift?.(current)} onComments={() => onComments?.(current)} /></div>
}
