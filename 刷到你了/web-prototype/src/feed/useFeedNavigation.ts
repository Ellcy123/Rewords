import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  MouseEventHandler,
  PointerEventHandler,
  TransitionEventHandler,
  WheelEventHandler,
} from 'react'

interface FeedNavigationOptions {
  count: number
  index: number
  onChange: (nextIndex: number) => void
  locked: boolean
  loop?: boolean
}

export type FeedNavigationPhase = 'idle' | 'dragging' | 'settling'

const DISTANCE_THRESHOLD = 0.2
const VELOCITY_THRESHOLD = 0.55
const BOUNDARY_RESISTANCE = 0.28
const CLICK_SUPPRESSION_DISTANCE = 8
const WHEEL_THRESHOLD = 60
const SETTLE_DURATION = 240
const WHEEL_GESTURE_COOLDOWN = 540
const WHEEL_QUIET_PERIOD = 180

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useFeedNavigation({ count, index, onChange, locked, loop = false }: FeedNavigationOptions) {
  const [offset, setOffset] = useState(0)
  const [phase, setPhase] = useState<FeedNavigationPhase>('idle')
  const [transitionMs, setTransitionMs] = useState(0)
  const phaseRef = useRef<FeedNavigationPhase>('idle')
  const pointerId = useRef<number | null>(null)
  const pointerStartY = useRef(0)
  const pointerStartTime = useRef(0)
  const maxMovement = useRef(0)
  const viewportHeight = useRef(0)
  const pendingDirection = useRef<-1 | 0 | 1>(0)
  const suppressClick = useRef(false)
  const wheelTotal = useRef(0)
  const wheelBlockedUntil = useRef(0)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSettleTimer = useCallback(() => {
    if (settleTimer.current !== null) {
      clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
  }, [])

  const setNavigationPhase = useCallback((nextPhase: FeedNavigationPhase) => {
    phaseRef.current = nextPhase
    setPhase(nextPhase)
  }, [])

  const reset = useCallback(() => {
    clearSettleTimer()
    pointerId.current = null
    pendingDirection.current = 0
    wheelTotal.current = 0
    setOffset(0)
    setTransitionMs(0)
    setNavigationPhase('idle')
  }, [clearSettleTimer, setNavigationPhase])

  const finishSettle = useCallback(() => {
    if (phaseRef.current !== 'settling') return
    clearSettleTimer()
    const direction = pendingDirection.current
    pendingDirection.current = 0
    setOffset(0)
    setTransitionMs(0)
    setNavigationPhase('idle')
    if (direction !== 0) onChange(index + direction)
  }, [clearSettleTimer, index, onChange, setNavigationPhase])

  const canMove = useCallback((direction: -1 | 1) => count > 1 && (
    loop || (index + direction >= 0 && index + direction < count)
  ), [count, index, loop])

  const beginSettle = useCallback((requestedDirection: -1 | 0 | 1, height: number) => {
    if (locked || phaseRef.current === 'settling') return
    const direction = requestedDirection !== 0 && canMove(requestedDirection)
      ? requestedDirection
      : 0
    const duration = prefersReducedMotion() ? 40 : SETTLE_DURATION
    const safeHeight = height || viewportHeight.current || window.innerHeight || 1
    pendingDirection.current = direction
    setTransitionMs(duration)
    setNavigationPhase('settling')
    setOffset(direction === 0 ? 0 : -direction * safeHeight)
    clearSettleTimer()
    settleTimer.current = setTimeout(finishSettle, duration + 80)
  }, [canMove, clearSettleTimer, finishSettle, locked, setNavigationPhase])

  useEffect(() => () => clearSettleTimer(), [clearSettleTimer])

  useEffect(() => {
    reset()
  }, [count, index, locked, reset])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (locked || phaseRef.current !== 'idle') return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      wheelBlockedUntil.current = Date.now() + WHEEL_GESTURE_COOLDOWN
      beginSettle(event.key === 'ArrowDown' ? 1 : -1, viewportHeight.current || window.innerHeight)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [beginSettle, locked])

  const onPointerDown: PointerEventHandler<HTMLDivElement> = event => {
    if (locked || phaseRef.current !== 'idle') return
    pointerId.current = event.pointerId
    pointerStartY.current = event.clientY
    pointerStartTime.current = Date.now()
    maxMovement.current = 0
    suppressClick.current = false
    viewportHeight.current = event.currentTarget.clientHeight || window.innerHeight || 1
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setTransitionMs(0)
    setNavigationPhase('dragging')
  }

  const onPointerMove: PointerEventHandler<HTMLDivElement> = event => {
    if (phaseRef.current !== 'dragging' || event.pointerId !== pointerId.current) return
    const rawOffset = event.clientY - pointerStartY.current
    maxMovement.current = Math.max(maxMovement.current, Math.abs(rawOffset))
    const pullingPastStart = !loop && index === 0 && rawOffset > 0
    const pullingPastEnd = !loop && index === count - 1 && rawOffset < 0
    setOffset((pullingPastStart || pullingPastEnd) ? rawOffset * BOUNDARY_RESISTANCE : rawOffset)
  }

  const releasePointer = (element: HTMLDivElement, id: number) => {
    if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id)
    pointerId.current = null
  }

  const onPointerUp: PointerEventHandler<HTMLDivElement> = event => {
    if (phaseRef.current !== 'dragging' || event.pointerId !== pointerId.current) return
    const rawOffset = event.clientY - pointerStartY.current
    const elapsed = Math.max(1, Date.now() - pointerStartTime.current)
    const velocity = rawOffset / elapsed
    const height = viewportHeight.current || event.currentTarget.clientHeight || window.innerHeight || 1
    const shouldCommit = Math.abs(rawOffset) >= height * DISTANCE_THRESHOLD ||
      Math.abs(velocity) >= VELOCITY_THRESHOLD
    suppressClick.current = maxMovement.current >= CLICK_SUPPRESSION_DISTANCE ||
      Math.abs(rawOffset) >= CLICK_SUPPRESSION_DISTANCE
    wheelBlockedUntil.current = Date.now() + WHEEL_GESTURE_COOLDOWN
    releasePointer(event.currentTarget, event.pointerId)
    if (rawOffset === 0) {
      setOffset(0)
      setTransitionMs(0)
      setNavigationPhase('idle')
      return
    }
    beginSettle(shouldCommit ? (rawOffset < 0 ? 1 : -1) : 0, height)
  }

  const onPointerCancel: PointerEventHandler<HTMLDivElement> = event => {
    if (phaseRef.current !== 'dragging' || event.pointerId !== pointerId.current) return
    wheelBlockedUntil.current = Date.now() + WHEEL_GESTURE_COOLDOWN
    releasePointer(event.currentTarget, event.pointerId)
    beginSettle(0, viewportHeight.current)
  }

  const onWheel: WheelEventHandler<HTMLDivElement> = event => {
    if (locked) return
    const now = Date.now()
    if (phaseRef.current !== 'idle' || now < wheelBlockedUntil.current) {
      wheelTotal.current = 0
      wheelBlockedUntil.current = Math.max(wheelBlockedUntil.current, now + WHEEL_QUIET_PERIOD)
      return
    }
    wheelTotal.current += event.deltaY
    if (Math.abs(wheelTotal.current) < WHEEL_THRESHOLD) return
    const direction = wheelTotal.current > 0 ? 1 : -1
    wheelTotal.current = 0
    wheelBlockedUntil.current = now + WHEEL_GESTURE_COOLDOWN
    viewportHeight.current = event.currentTarget.clientHeight || window.innerHeight || 1
    beginSettle(direction, viewportHeight.current)
  }

  const onClickCapture: MouseEventHandler<HTMLDivElement> = event => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const onTransitionEnd: TransitionEventHandler<HTMLDivElement> = event => {
    if (event.target !== event.currentTarget) return
    finishSettle()
  }

  return {
    offset,
    phase,
    transitionMs,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onWheel,
      onClickCapture,
      onTransitionEnd,
    },
  }
}
