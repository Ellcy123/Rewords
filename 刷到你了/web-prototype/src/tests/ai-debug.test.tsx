import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { gameReducer } from '../engine/reducer'
import { SAVE_KEY } from '../engine/persistence'
import { createInitialState } from '../engine/state'
import type { AiTurnDebugRecord } from '../messages/types'

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

function debugRecord(index = 1): AiTurnDebugRecord {
  return {
    id: `debug-${index}`,
    createdAt: index,
    personaCoreId: 'yanxin-v1',
    relationshipIdentity: 'familiar_fan',
    dimensions: { closeness: 1, trust: 2, respect: 1, suspicion: 0, boundaryPressure: 0 },
    shortTerm: { emotion: 'steady', currentActivity: 'reviewing_footage' },
    taskStage: 'invited',
    recentMessageIdsRead: [`message-${index}`],
    relationshipChangeSourceIdsRead: ['source-care'],
    memoryIdsRead: ['memory-1'],
    openLoopIdsRead: ['open-loop-1'],
    characterIntents: ['share'],
    acceptedTaskEvidence: [],
    acceptedRelationshipEvidence: [{ kind: 'showed_specific_care', sourceMessageId: `message-${index}` }],
    acceptedMemoryCandidates: [{ type: 'promise', sourceMessageId: `message-${index}` }],
    acceptedOpenLoopUpdates: [{ kind: 'report', sourceMessageId: `message-${index}`, status: 'open' }],
    rejectedCandidates: [],
    fallbackUsed: false,
  }
}

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('AI debug provenance', () => {
  it('records sanitized provenance and retains only the newest twenty turns', () => {
    let state = createInitialState()
    for (let index = 1; index <= 21; index += 1) {
      state = gameReducer(state, { type: 'CHAT_AI_DEBUG_RECORDED', record: debugRecord(index) })
    }

    expect(state.aiDebugTurns).toHaveLength(20)
    expect(state.aiDebugTurns[0].id).toBe('debug-2')
    expect(state.aiDebugTurns.at(-1)).toEqual(expect.objectContaining({
      relationshipIdentity: 'familiar_fan',
      memoryIdsRead: ['memory-1'],
      acceptedTaskEvidence: [],
      fallbackUsed: false,
    }))
    expect(JSON.stringify(state.aiDebugTurns)).not.toMatch(/api[_-]?key|system prompt|raw output|sk-/i)
  })

  it('keeps the debug sheet absent without the query and exposes it in development with debug=ai', () => {
    const state = createInitialState()
    state.aiDebugTurns = [debugRecord()]
    const storage = memoryStorage(state)

    const normal = render(<App storage={storage} />)
    expect(screen.queryByRole('complementary', { name: 'AI 调试溯源' })).toBeNull()
    normal.unmount()

    window.history.replaceState({}, '', '/?debug=ai')
    render(<App storage={storage} />)
    expect(screen.getByRole('complementary', { name: 'AI 调试溯源' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '查看 AI 调试记录' }))
    expect(screen.getByText('familiar_fan')).toBeTruthy()
    expect(screen.getByText('memory-1')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/system prompt|raw output|api[_-]?key|sk-/i)
  })
})
