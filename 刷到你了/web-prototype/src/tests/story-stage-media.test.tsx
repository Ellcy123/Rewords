import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NODE_BY_ID } from '../content/nodes'
import { PlaybackProvider } from '../feed/PlaybackContext'
import { StoryStage } from '../feed/StoryStage'

describe('StoryStage formal video media', () => {
  const play = vi.fn<() => Promise<void>>()
  const pause = vi.fn<() => void>()

  beforeEach(() => {
    play.mockReset().mockResolvedValue(undefined)
    pause.mockReset()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause)
  })

  afterEach(() => vi.restoreAllMocks())

  it('renders configured video and derives captions from currentTime', () => {
    render(<PlaybackProvider><StoryStage node={NODE_BY_ID.W001} active /></PlaybackProvider>)
    const video = screen.getByLabelText('婚礼灯架事故视频') as HTMLVideoElement
    expect(video.getAttribute('src')).toBe('/media/W001_ltx_raw_v1.mp4')
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 2.5 })
    fireEvent.timeUpdate(video)
    const caption = screen.getByText('婚礼未完成')
    expect(caption.getAttribute('data-caption-style')).toBe('explanation')
  })

  it('falls back to the CSS story stage after media failure', () => {
    render(<PlaybackProvider><StoryStage node={NODE_BY_ID.W001} active /></PlaybackProvider>)
    fireEvent.error(screen.getByLabelText('婚礼灯架事故视频'))
    expect(screen.queryByLabelText('婚礼灯架事故视频')).toBeNull()
    expect(screen.getByText(NODE_BY_ID.W001.beats[0].text)).toBeTruthy()
  })

  it('keeps unconfigured nodes on the CSS story stage', () => {
    const unconfigured = { ...NODE_BY_ID.C001, media: undefined }
    render(<PlaybackProvider><StoryStage node={unconfigured} active /></PlaybackProvider>)
    expect(screen.queryByLabelText('王妃翻墙私逃视频')).toBeNull()
    expect(screen.getByText(NODE_BY_ID.C001.beats[0].text)).toBeTruthy()
  })

  it('plays only while active and pauses after becoming inactive', () => {
    const view = render(<PlaybackProvider><StoryStage node={NODE_BY_ID.W001} active /></PlaybackProvider>)
    expect(play).toHaveBeenCalledTimes(1)
    view.rerender(<PlaybackProvider><StoryStage node={NODE_BY_ID.W001} active={false} /></PlaybackProvider>)
    expect(pause).toHaveBeenCalled()
  })

})
