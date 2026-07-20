import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SAVE_KEY } from '../engine/persistence'
import { createInitialState } from '../engine/state'
import { GameProvider } from '../game/GameProvider'
import { useGame } from '../game/useGame'
import { scheduleChatDelivery } from '../messages/delivery'
import { createCharacterTaskState } from '../relationship/taskEngine'

function memoryStorage(initial: object): Storage {
  const values = new Map([[SAVE_KEY, JSON.stringify(initial)]])
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

function Probe() {
  const { state } = useGame()
  return <output>{state.messages.length}:{state.unlockedNodeIds.includes('E201') ? 'unlocked' : 'locked'}</output>
}

describe('GameProvider delivery hydration', () => {
  it('flushes an overdue committed progress report immediately after loading', async () => {
    const state = createInitialState()
    state.characterTasks.YANXIN_UNCUT_EVIDENCE = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'committed')
    state.pendingChatDeliveries = [scheduleChatDelivery({
      id: 'overdue',
      kind: 'proactive_report',
      message: { id: 'report', role: 'assistant', text: '完整那段也发了。', createdAt: 0 },
      createdAt: 0,
      readyAt: 0,
      taskSignals: [],
      effect: 'unlock_e201',
    }, () => 0)]

    render(<GameProvider storage={memoryStorage(state)}><Probe /></GameProvider>)
    await waitFor(() => expect(screen.getByText('1:unlocked')).toBeTruthy())
  })
})
