export type FeedbackSound = 'tap' | 'purchase' | 'rewrite' | 'destiny' | 'complete'

export function playFeedback(kind: FeedbackSound, muted: boolean) {
  if (muted || typeof AudioContext === 'undefined') return
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = { tap: 260, purchase: 520, rewrite: 330, destiny: 150, complete: 660 }[kind]
    gain.gain.setValueAtTime(.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(.08, context.currentTime + .01)
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .18)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(); oscillator.stop(context.currentTime + .2)
  } catch { /* Sound is optional. */ }
}
