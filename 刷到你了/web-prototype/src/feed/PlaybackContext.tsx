import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface PlaybackValue {
  paused: boolean
  muted: boolean
  toggle: () => void
  toggleSound: () => void
  setPaused: (paused: boolean) => void
}
const PlaybackContext = createContext<PlaybackValue | null>(null)

interface PlaybackProviderProps {
  children: ReactNode
  muted?: boolean
  onMutedChange?: (muted: boolean) => void
}

export function PlaybackProvider({ children, muted: controlledMuted, onMutedChange }: PlaybackProviderProps) {
  const [paused, setPaused] = useState(false)
  const [localMuted, setLocalMuted] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const preferenceMuted = controlledMuted ?? localMuted
  const muted = preferenceMuted || !audioUnlocked

  const updateMuted = (nextMuted: boolean) => {
    if (controlledMuted === undefined) setLocalMuted(nextMuted)
    onMutedChange?.(nextMuted)
  }

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPaused(true) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const value = useMemo(() => ({
    paused,
    muted,
    setPaused,
    toggle: () => setPaused(value => !value),
    toggleSound: () => {
      if (muted) {
        setAudioUnlocked(true)
        updateMuted(false)
        setPaused(false)
      } else {
        updateMuted(true)
      }
    },
  }), [muted, paused, controlledMuted, onMutedChange])
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

export function usePlayback() {
  const value = useContext(PlaybackContext)
  if (!value) throw new Error('usePlayback must be used inside PlaybackProvider')
  return value
}
