import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NODE_BY_ID } from '../content/nodes'
import { PlaybackProvider } from '../feed/PlaybackContext'
import { VideoCard } from '../feed/VideoCard'

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
})
