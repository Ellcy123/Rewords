import { FeedScreen } from './feed/FeedScreen'
import { GameProvider } from './game/GameProvider'

const transientValues = new Map<string, string>()
const transientStorage: Storage = {
  get length() { return transientValues.size },
  clear: () => transientValues.clear(),
  getItem: key => transientValues.get(key) ?? null,
  key: index => [...transientValues.keys()][index] ?? null,
  removeItem: key => transientValues.delete(key),
  setItem: (key, value) => transientValues.set(key, value),
}

function getBrowserStorage(): Storage {
  try {
    return window.localStorage
  } catch {
    return transientStorage
  }
}

export function App({ storage }: { storage?: Storage }) {
  return <GameProvider storage={storage ?? getBrowserStorage()}><div className="app-frame"><FeedScreen /></div></GameProvider>
}
