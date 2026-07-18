import { X } from 'lucide-react'
import type { VideoNode } from '../content/types'
import { StoryStage } from './StoryStage'

export function ReplayOverlay({ node, onClose }: { node: VideoNode; onClose: () => void }) {
  return <section className="replay-overlay" role="dialog" aria-label={`重看 ${node.title}`}>
    <StoryStage node={node} active />
    <button className="replay-close" aria-label="关闭重看" onClick={onClose}><X /></button>
    <div className="replay-copy"><b>{node.account}</b><h2>{node.headline}</h2><p>{node.subtitle}</p></div>
  </section>
}
