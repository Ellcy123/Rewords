import { useEffect, useRef, useState } from 'react'
import type { VideoNode } from '../content/types'
import { usePlayback } from './PlaybackContext'

interface StageProps {
  node: VideoNode
  active: boolean
}

interface FallbackProps extends StageProps {
  paused: boolean
  toggle: () => void
}

function FallbackStoryStage({ node, active, paused, toggle }: FallbackProps) {
  const [beatIndex, setBeatIndex] = useState(0)
  useEffect(() => { setBeatIndex(0) }, [node.id])
  useEffect(() => {
    if (!active || paused || node.beats.length < 2) return
    const timer = window.setInterval(
      () => setBeatIndex(value => (value + 1) % node.beats.length),
      Math.max(1500, node.duration * 1000 / node.beats.length),
    )
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

export function StoryStage({ node, active }: StageProps) {
  const { paused, toggle } = usePlayback()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [mediaFailed, setMediaFailed] = useState(false)
  const media = node.media

  useEffect(() => {
    setCurrentTime(0)
    setMediaFailed(false)
  }, [node.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !media || mediaFailed) return
    if (active && !paused) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [active, media, mediaFailed, paused])

  if (!media || mediaFailed) {
    return <FallbackStoryStage node={node} active={active} paused={paused} toggle={toggle} />
  }

  const caption = media.captions.find(cue => cue.start <= currentTime && currentTime < cue.end)

  return (
    <button className={`story-stage story-stage--media motif-${node.visualMotif}`} aria-label="暂停或继续视频" onClick={toggle}>
      <video
        ref={videoRef}
        className="story-video"
        aria-label={`${node.title}视频`}
        src={media.src}
        poster={media.poster}
        playsInline
        loop
        muted
        preload="metadata"
        onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
        onError={() => setMediaFailed(true)}
      />
      {caption && (
        <strong className="media-caption" data-caption-style={caption.style}>
          {caption.text}
        </strong>
      )}
      {paused && active && <span className="pause-badge">已暂停</span>}
    </button>
  )
}
