import { useCallback, useEffect, useRef } from 'react'
import type { PointerEventHandler, WheelEventHandler } from 'react'

interface FeedNavigationOptions {
  count: number
  index: number
  onChange: (nextIndex: number) => void
  locked: boolean
}

export function useFeedNavigation({ count, index, onChange, locked }: FeedNavigationOptions) {
  const pointerStart = useRef<number | null>(null)
  const wheelTotal = useRef(0)
  const wheelLockedUntil = useRef(0)
  const go = useCallback((delta: number) => {
    if (locked) return
    onChange(Math.max(0, Math.min(count - 1, index + delta)))
  }, [count, index, locked, onChange])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') go(1)
      if (event.key === 'ArrowUp') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onPointerDown: PointerEventHandler = event => { pointerStart.current = event.clientY }
  const onPointerUp: PointerEventHandler = event => {
    if (pointerStart.current === null) return
    const delta = pointerStart.current - event.clientY
    pointerStart.current = null
    if (Math.abs(delta) > 48) go(delta > 0 ? 1 : -1)
  }
  const onWheel: WheelEventHandler = event => {
    const now = Date.now()
    if (now < wheelLockedUntil.current || locked) return
    wheelTotal.current += event.deltaY
    if (Math.abs(wheelTotal.current) >= 60) {
      go(wheelTotal.current > 0 ? 1 : -1)
      wheelTotal.current = 0
      wheelLockedUntil.current = now + 350
    }
  }
  return { onPointerDown, onPointerUp, onWheel }
}
