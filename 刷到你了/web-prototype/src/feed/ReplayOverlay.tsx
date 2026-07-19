import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import type { CaptionCue, VideoNode } from '../content/types'
import { StoryStage } from './StoryStage'

export function ReplayOverlay({ node, onClose }: { node: VideoNode; onClose: () => void }) {
  const [caption, setCaption] = useState<CaptionCue | null>(null)
  const updateCaption = useCallback((cue: CaptionCue | null) => setCaption(cue), [])

  return <section className="replay-overlay" role="dialog" aria-label={`重看 ${node.title}`}>
    <StoryStage node={node} active onCaptionChange={updateCaption} />
    <button className="replay-close" aria-label="关闭重看" onClick={onClose}><X /></button>
    <div className="replay-copy">
      <b>{node.account}</b>
      <h2>{node.headline}</h2>
      {caption && <strong className="media-caption" data-caption-style={caption.style}>{caption.text}</strong>}
      <p>{node.subtitle}</p>
    </div>
  </section>
}
