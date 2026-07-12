import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TutorialCue } from '../tutorial/TutorialCue'
import '../styles/sheets.css'

describe('tutorial cue', () => {
  it('lets vertical feed gestures pass through the gift hint', () => {
    render(<TutorialCue step="gift" />)
    const cue = screen.getByText('物品可以送入其他视频')
    expect(getComputedStyle(cue).pointerEvents).toBe('none')
  })
})
