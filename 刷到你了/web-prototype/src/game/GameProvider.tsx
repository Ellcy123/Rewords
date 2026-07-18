import { createContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react'
import { gameReducer, type GameAction } from '../engine/reducer'
import { loadGame, saveGame, SAVE_KEY, type LoadResult } from '../engine/persistence'
import { createInitialState, type GameState } from '../engine/state'

export interface GameContextValue { state: GameState; dispatch: Dispatch<GameAction>; loadResult: LoadResult }
export const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children, storage }: { children: ReactNode; storage: Storage }) {
  const [initial] = useState(() => loadGame(storage))
  const [blocked, setBlocked] = useState(initial.kind === 'requires-reset')
  const [state, dispatch] = useReducer(gameReducer, initial.kind === 'requires-reset' ? createInitialState() : initial.state)
  useEffect(() => { if (!blocked) saveGame(storage, state) }, [blocked, state, storage])
  useEffect(() => { if (!blocked && state.feedNodeIds.length === 0) dispatch({ type: 'RECOVER_FEED' }) }, [blocked, state.feedNodeIds.length])
  const value = useMemo(() => ({ state, dispatch, loadResult: initial }), [state, initial])
  if (blocked) return <main className="save-recovery"><span>存档版本不兼容</span><h1>存档需要更新</h1><p>旧存档不会覆盖当前内容。重新开始后即可进入试玩。</p><button onClick={() => { storage.removeItem(SAVE_KEY); dispatch({ type: 'RESET_GAME' }); setBlocked(false) }}>安全重新开始</button></main>
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
