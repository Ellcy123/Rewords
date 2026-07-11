import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { NODES } from '../content/nodes'
import { PlaybackProvider } from '../feed/PlaybackContext'
import { VideoFeed } from '../feed/VideoFeed'

function renderFeed(index = 1, onIndexChange = vi.fn()) {
  render(
    <PlaybackProvider>
      <VideoFeed nodes={NODES.slice(0, 3)} index={index} onIndexChange={onIndexChange} />
    </PlaybackProvider>,
  )
  const feed = screen.getByTestId('video-feed')
  Object.defineProperty(feed, 'clientHeight', { configurable: true, value: 1000 })
  return { feed, onIndexChange }
}

function ControlledFeed() {
  const [index, setIndex] = useState(1)
  return (
    <PlaybackProvider>
      <VideoFeed nodes={NODES.slice(0, 3)} index={index} onIndexChange={setIndex} />
    </PlaybackProvider>
  )
}

describe('three-card video feed', () => {
  it('renders previous, current, and next cards in fixed vertical slots', () => {
    renderFeed()
    const slots = screen.getAllByTestId('feed-slot')
    expect(slots).toHaveLength(3)
    expect(slots.map(slot => slot.dataset.feedSlot)).toEqual(['-1', '0', '1'])
    expect(slots.map(slot => slot.dataset.nodeId)).toEqual(['W001', 'W101', 'W300'])
    expect(slots[0].style.transform).toBe('translate3d(0, calc(-100% + 0px), 0)')
    expect(slots[1].style.transform).toBe('translate3d(0, calc(0% + 0px), 0)')
    expect(slots[2].style.transform).toBe('translate3d(0, calc(100% + 0px), 0)')
  })

  it('keeps only the current card interactive and playing', () => {
    renderFeed()
    const slots = screen.getAllByTestId('feed-slot')
    expect(slots[0].getAttribute('aria-hidden')).toBe('true')
    expect(slots[1].getAttribute('data-feed-active')).toBe('true')
    expect(slots[1].hasAttribute('aria-hidden')).toBe(false)
    expect(slots[2].getAttribute('aria-hidden')).toBe('true')
    expect(screen.getAllByRole('button', { name: '暂停或继续视频' })).toHaveLength(1)
  })

  it('moves all three slots with the pointer and commits after the current slot settles', () => {
    const { feed, onIndexChange } = renderFeed()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 700 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })
    const slots = screen.getAllByTestId('feed-slot')
    expect(slots[1].style.transform).toBe('translate3d(0, calc(0% + -300px), 0)')
    expect(slots[2].style.transform).toBe('translate3d(0, calc(100% + -300px), 0)')
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 400 })
    expect(slots[1].style.transitionDuration).toBe('240ms')
    expect(slots[1].style.transform).toBe('translate3d(0, calc(0% + -1000px), 0)')
    fireEvent.transitionEnd(slots[1])
    expect(onIndexChange).toHaveBeenCalledWith(2)
  })

  it('preserves card elements while the next card becomes current', () => {
    render(<ControlledFeed />)
    const feed = screen.getByTestId('video-feed')
    Object.defineProperty(feed, 'clientHeight', { configurable: true, value: 1000 })
    const oldCurrent = document.querySelector<HTMLElement>('.feed-slot[data-node-id="W101"]')
    const incoming = document.querySelector<HTMLElement>('.feed-slot[data-node-id="W300"]')
    if (!oldCurrent || !incoming) throw new Error('Expected feed cards were not rendered')

    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 700 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 400 })
    fireEvent.transitionEnd(oldCurrent)

    expect(document.querySelector('.feed-slot[data-feed-slot="0"]')).toBe(incoming)
    expect(document.querySelector('.feed-slot[data-feed-slot="-1"]')).toBe(oldCurrent)
  })
})
