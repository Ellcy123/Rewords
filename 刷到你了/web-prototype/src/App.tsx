import { FeedScreen } from './feed/FeedScreen'
import { GameProvider } from './game/GameProvider'

export function App({ storage = window.localStorage }: { storage?: Storage }) {
  return <GameProvider storage={storage}><div className="app-frame"><FeedScreen /></div></GameProvider>
}
