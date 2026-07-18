import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TutorialCue } from '../tutorial/TutorialCue'
import '../styles/sheets.css'
import '../styles/tutorial.css'

describe('tutorial cue', () => {
  it('floats upward and fades without blocking feed gestures', () => {
    const { rerender } = render(<TutorialCue step="gift" />)
    const cue = screen.getByText('物品可以送给其他视频')
    const style = getComputedStyle(cue)

    expect(getComputedStyle(cue).pointerEvents).toBe('none')
    expect(style.top).toBe('55%')
    expect(style.bottom).toBe('auto')
    expect(style.animationName).toBe('tutorial-float-up')
    expect(style.animationIterationCount).toBe('1')
    expect(style.animationFillMode).toBe('forwards')

    rerender(<TutorialCue step="target" />)
    expect(screen.getByText('这里的命运可以被改写')).not.toBe(cue)
  })
})
