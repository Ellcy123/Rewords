import { render, screen } from '@testing-library/react'
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
})
