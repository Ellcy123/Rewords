import { useEffect, useState } from 'react'
import type { VideoNode } from '../content/types'
import { usePlayback } from './PlaybackContext'

export function StoryStage({ node, active }: { node: VideoNode; active: boolean }) {
  const { paused, toggle } = usePlayback()
  const [beatIndex, setBeatIndex] = useState(0)
  useEffect(() => { setBeatIndex(0) }, [node.id])
  useEffect(() => {
    if (!active || paused || node.beats.length < 2) return
    const timer = window.setInterval(() => setBeatIndex(value => (value + 1) % node.beats.length), Math.max(1500, node.duration * 1000 / node.beats.length))
    return () => window.clearInterval(timer)
  }, [active, node, paused])
  const beat = node.beats[beatIndex]
  return (
    <button className={`story-stage story-stage--${node.channel} motif-${node.visualMotif}`} aria-label="暂停或继续视频" onClick={toggle}>
      <div className="scene-light" />
      <div className="scene-prop scene-prop--left" />
      <div className="scene-person"><span /></div>
      <div className="scene-prop scene-prop--right" />
      {node.channel === 'knowledge' && <span className="rec-badge">● REC</span>}
      {node.channel === 'costume' && <span className="episode-badge">短剧 · 第八集</span>}
      <div className="story-beat" key={`${node.id}-${beatIndex}`}>
        <strong>{beat.text}</strong>
        {beat.detail && <span>{beat.detail}</span>}
      </div>
      {paused && active && <span className="pause-badge">已暂停</span>}
    </button>
  )
}
