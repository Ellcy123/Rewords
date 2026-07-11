import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface PlaybackValue { paused: boolean; toggle: () => void; setPaused: (paused: boolean) => void }
const PlaybackContext = createContext<PlaybackValue | null>(null)

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPaused(true) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  const value = useMemo(() => ({ paused, setPaused, toggle: () => setPaused(value => !value) }), [paused])
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

export function usePlayback() {
  const value = useContext(PlaybackContext)
  if (!value) throw new Error('usePlayback must be used inside PlaybackProvider')
  return value
}
