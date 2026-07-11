import { createContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react'
import { gameReducer, type GameAction } from '../engine/reducer'
import { loadGame, saveGame, type LoadResult } from '../engine/persistence'
import type { GameState } from '../engine/state'

export interface GameContextValue { state: GameState; dispatch: Dispatch<GameAction>; loadResult: LoadResult }
export const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children, storage }: { children: ReactNode; storage: Storage }) {
  const [initial] = useState(() => loadGame(storage))
  const [state, dispatch] = useReducer(gameReducer, initial.kind === 'requires-reset' ? ({} as GameState) : initial.state)
  useEffect(() => { if (initial.kind !== 'requires-reset') saveGame(storage, state) }, [initial.kind, state, storage])
  const value = useMemo(() => ({ state, dispatch, loadResult: initial }), [state, initial])
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
