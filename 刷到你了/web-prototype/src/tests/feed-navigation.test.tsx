import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFeedNavigation } from '../feed/useFeedNavigation'

function Harness({ count = 3, index = 1, locked = false, loop = false, onChange = vi.fn() }: { count?: number; index?: number; locked?: boolean; loop?: boolean; onChange?: (index: number) => void }) {
  const navigation = useFeedNavigation({ count, index, locked, loop, onChange })
  return <div
    data-testid="feed"
    data-offset={navigation.offset}
    data-phase={navigation.phase}
    data-duration={navigation.transitionMs}
    {...navigation.handlers}
  />
}

function feedWithHeight(height = 1000): HTMLElement {
  const feed = screen.getByTestId('feed')
  Object.defineProperty(feed, 'clientHeight', { configurable: true, value: height })
  return feed
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('gesture feed navigation', () => {
  it('tracks the pointer before release and commits beyond twenty percent', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 600 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 300 })
    expect(feed.dataset.offset).toBe('-300')
    expect(feed.dataset.phase).toBe('dragging')
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 300 })
    expect(feed.dataset.offset).toBe('-1000')
    expect(feed.dataset.phase).toBe('settling')
    fireEvent.transitionEnd(feed)
    expect(onChange).toHaveBeenCalledWith(2)
    expect(feed.dataset.phase).toBe('idle')
  })

  it('rebounds after a small slow drag without changing index', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 500 })
    vi.setSystemTime(1000)
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 450 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 450 })
    expect(feed.dataset.offset).toBe('0')
    expect(feed.dataset.phase).toBe('settling')
    fireEvent.transitionEnd(feed)
    expect(onChange).not.toHaveBeenCalled()
    expect(feed.dataset.phase).toBe('idle')
  })

  it('commits a short fast flick by velocity', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 500 })
    vi.setSystemTime(50)
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 450 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 450 })
    fireEvent.transitionEnd(feed)
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('applies resistance at the first item and cannot leave the boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const onChange = vi.fn()
    render(<Harness index={0} onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 300 })
    vi.setSystemTime(1000)
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })
    expect(Number(feed.dataset.offset)).toBeCloseTo(28)
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 400 })
    fireEvent.transitionEnd(feed)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('uses the same settling path for keyboard navigation', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(feed.dataset.phase).toBe('settling')
    fireEvent.transitionEnd(feed)
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('continues forward past the last virtual position in loop mode', () => {
    const onChange = vi.fn()
    render(<Harness index={2} loop onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(feed.dataset.phase).toBe('settling')
    fireEvent.transitionEnd(feed)
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('continues backward before the first virtual position in loop mode', () => {
    const onChange = vi.fn()
    render(<Harness index={0} loop onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(feed.dataset.phase).toBe('settling')
    fireEvent.transitionEnd(feed)
    expect(onChange).toHaveBeenCalledWith(-1)
  })

  it('does not apply boundary resistance when the feed loops', () => {
    render(<Harness index={0} loop />)
    const feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 300 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })
    expect(feed.dataset.offset).toBe('100')
  })

  it('keeps a single-item loop stationary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const onChange = vi.fn()
    render(<Harness count={1} index={0} loop onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 500 })
    vi.setSystemTime(1000)
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 200 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 200 })
    fireEvent.transitionEnd(feed)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignores a synthetic wheel event after a pointer swipe settles', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const onChange = vi.fn()
    render(<Harness loop onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 600 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 300 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 300 })
    fireEvent.transitionEnd(feed)
    expect(onChange).toHaveBeenCalledTimes(1)

    vi.setSystemTime(100)
    fireEvent.wheel(feed, { deltaY: 70 })
    expect(feed.dataset.phase).toBe('idle')
    expect(onChange).toHaveBeenCalledTimes(1)

    vi.setSystemTime(700)
    fireEvent.wheel(feed, { deltaY: 70 })
    expect(feed.dataset.phase).toBe('settling')
    fireEvent.transitionEnd(feed)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('treats momentum wheel events as one navigation', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const onChange = vi.fn()
    render(<Harness loop onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.wheel(feed, { deltaY: 70 })
    fireEvent.transitionEnd(feed)
    expect(onChange).toHaveBeenCalledTimes(1)

    vi.setSystemTime(100)
    fireEvent.wheel(feed, { deltaY: 70 })
    expect(feed.dataset.phase).toBe('idle')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ignores gestures while locked', () => {
    const onChange = vi.fn()
    render(<Harness locked onChange={onChange} />)
    const feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 600 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 200 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 200 })
    expect(feed.dataset.offset).toBe('0')
    expect(feed.dataset.phase).toBe('idle')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('suppresses the click after a drag but preserves a tap click', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const { unmount } = render(<Harness />)
    let feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 500 })
    vi.setSystemTime(1000)
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 480 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 480 })
    expect(fireEvent.click(feed)).toBe(false)
    unmount()

    render(<Harness />)
    feed = feedWithHeight()
    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 500 })
    fireEvent.pointerUp(feed, { pointerId: 1, clientY: 500 })
    expect(fireEvent.click(feed)).toBe(true)
  })
})
