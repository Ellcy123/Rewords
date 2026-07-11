import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NODE_BY_ID } from '../content/nodes'
import { PlaybackProvider } from '../feed/PlaybackContext'
import { StoryStage } from '../feed/StoryStage'

describe('StoryStage', () => {
  it('reports the first completed playback cycle once', () => {
    vi.useFakeTimers()
    try {
      const onPlaybackComplete = vi.fn()
      render(<PlaybackProvider><StoryStage node={NODE_BY_ID.W200} active onPlaybackComplete={onPlaybackComplete} /></PlaybackProvider>)
      act(() => vi.advanceTimersByTime(20_000))
      expect(onPlaybackComplete).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
