import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

function ControlledFeed({ initialIndex = 1, nodes = NODES.slice(0, 3) }: { initialIndex?: number; nodes?: typeof NODES }) {
  const [index, setIndex] = useState(initialIndex)
  return (
    <div data-testid="controlled-feed" data-index={index}>
      <PlaybackProvider>
        <VideoFeed nodes={nodes} index={index} onIndexChange={setIndex} />
      </PlaybackProvider>
    </div>
  )
}

afterEach(() => vi.useRealTimers())

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

  it('loops forward from the last card to the first without remounting it', () => {
    render(<ControlledFeed initialIndex={2} />)
    const feed = screen.getByTestId('video-feed')
    Object.defineProperty(feed, 'clientHeight', { configurable: true, value: 1000 })
    const current = document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="0"]')
    const incoming = document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="1"]')
    if (!current || !incoming) throw new Error('Expected circular feed cards were not rendered')
    expect(incoming.dataset.nodeId).toBe('W001')

    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 700 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 400 })
    fireEvent.transitionEnd(current)

    expect(screen.getByTestId('controlled-feed').dataset.index).toBe('0')
    expect(document.querySelector('.feed-slot[data-feed-slot="0"]')).toBe(incoming)
  })

  it('loops backward from the first card to the last without remounting it', () => {
    render(<ControlledFeed initialIndex={0} />)
    const feed = screen.getByTestId('video-feed')
    Object.defineProperty(feed, 'clientHeight', { configurable: true, value: 1000 })
    const current = document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="0"]')
    const incoming = document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="-1"]')
    if (!current || !incoming) throw new Error('Expected circular feed cards were not rendered')
    expect(incoming.dataset.nodeId).toBe('W300')

    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 300 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 600 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 600 })
    fireEvent.transitionEnd(current)

    expect(screen.getByTestId('controlled-feed').dataset.index).toBe('2')
    expect(document.querySelector('.feed-slot[data-feed-slot="0"]')).toBe(incoming)
  })

  it('renders distinct previous and next occurrences for a two-card loop', () => {
    render(<ControlledFeed initialIndex={0} nodes={NODES.slice(0, 2)} />)
    const slots = screen.getAllByTestId('feed-slot')
    expect(slots.map(slot => slot.dataset.nodeId)).toEqual(['W101', 'W001', 'W101'])
    expect(slots[0]).not.toBe(slots[2])
  })

  it('uses empty neighbors when only one card remains', () => {
    render(<ControlledFeed initialIndex={0} nodes={NODES.slice(0, 1)} />)
    const slots = screen.getAllByTestId('feed-slot')
    expect(slots.map(slot => slot.dataset.nodeId)).toEqual([undefined, 'W001', undefined])
  })

  it('keeps the previewed card current when settlement uses the timeout fallback', () => {
    vi.useFakeTimers()
    render(<ControlledFeed initialIndex={0} />)
    const feed = screen.getByTestId('video-feed')
    Object.defineProperty(feed, 'clientHeight', { configurable: true, value: 1000 })
    const incoming = document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="1"]')
    if (!incoming) throw new Error('Expected the incoming feed card')
    expect(incoming.dataset.nodeId).toBe('W101')

    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 700 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 400 })
    act(() => vi.advanceTimersByTime(321))

    expect(document.querySelector('.feed-slot[data-feed-slot="0"]')).toBe(incoming)
    act(() => vi.advanceTimersByTime(1000))
    expect(document.querySelector('.feed-slot[data-feed-slot="0"]')).toBe(incoming)
  })
})
