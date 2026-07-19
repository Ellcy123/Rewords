import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NODE_BY_ID } from '../content/nodes'
import { PlaybackProvider } from '../feed/PlaybackContext'
import { VideoCard } from '../feed/VideoCard'
import '../styles/feed.css'
import '../styles/stage.css'

describe('video product card', () => {
  it('presents a product link as a prominent yellow cart', () => {
    render(
      <PlaybackProvider>
        <VideoCard node={NODE_BY_ID.C001} active onProduct={vi.fn()} />
      </PlaybackProvider>,
    )

    const cart = screen.getByRole('button', { name: /小黄车.*刺客同款多功能梯子/ })
    expect(cart.textContent).toContain('20 金币')
    expect(cart.textContent).toContain('去看看')
  })

  it('keeps commerce controls away from the bottom navigation', () => {
    const fallbackNode = { ...NODE_BY_ID.C001, media: undefined }
    render(
      <PlaybackProvider>
        <VideoCard node={fallbackNode} active onProduct={vi.fn()} onGift={vi.fn()} />
      </PlaybackProvider>,
    )

    const cart = screen.getByRole('button', { name: /小黄车/ })
    const gift = screen.getByRole('button', { name: '改命礼物' })
    const channelBadge = screen.getByText('短剧 · 第八集')
    const copy = cart.closest('.video-copy')
    if (!copy) throw new Error('Expected product card inside video copy')

    expect(getComputedStyle(copy).bottom).toBe('118px')
    expect(getComputedStyle(gift).top).toBe('62px')
    expect(getComputedStyle(gift).left).toBe('12px')
    expect(getComputedStyle(gift).bottom).toBe('auto')
    expect(getComputedStyle(channelBadge).right).toBe('14px')
    expect(getComputedStyle(channelBadge).left).toBe('auto')
  })

  it('places timed captions directly below the live-room title', () => {
    render(
      <PlaybackProvider>
        <VideoCard node={NODE_BY_ID.W001} active />
      </PlaybackProvider>,
    )

    const video = screen.getByLabelText('婚礼灯架事故视频') as HTMLVideoElement
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 2.5 })
    fireEvent.timeUpdate(video)

    const caption = screen.getByText('婚礼未完成')
    expect(caption.parentElement?.classList.contains('video-copy')).toBe(true)
    expect(caption.previousElementSibling?.tagName).toBe('H1')
    expect(caption.nextElementSibling?.tagName).toBe('P')
    expect(getComputedStyle(caption).position).not.toBe('absolute')
    expect(getComputedStyle(caption).fontFamily).toContain('PingFang SC')
  })

  it('offers an explicit sound control for mobile playback', () => {
    render(
      <PlaybackProvider>
        <VideoCard node={NODE_BY_ID.W001} active />
      </PlaybackProvider>,
    )

    const video = screen.getByLabelText('婚礼灯架事故视频') as HTMLVideoElement
    expect(video.muted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '开启声音' }))
    expect(screen.getByRole('button', { name: '关闭声音' })).toBeTruthy()
    expect(video.muted).toBe(false)
  })

  it('keeps a sound-button tap out of the feed swipe gesture', () => {
    const onPointerDown = vi.fn()
    render(
      <div onPointerDown={onPointerDown}>
        <PlaybackProvider>
          <VideoCard node={NODE_BY_ID.W001} active />
        </PlaybackProvider>
      </div>,
    )

    fireEvent.pointerDown(screen.getByRole('button', { name: '开启声音' }))
    expect(onPointerDown).not.toHaveBeenCalled()
  })
})
