import type { TutorialStep } from '../engine/state'

export function TutorialCue({ step }: { step: TutorialStep }) {
  const copy = step === 'product' ? '先看看其他视频里挂了什么' : step === 'gift' ? '物品可以送给其他视频' : step === 'target' ? '这里的命运可以被改写' : ''
  return copy ? <div key={step} className={`tutorial-cue tutorial-${step}`} role="status">{copy}</div> : null
}
