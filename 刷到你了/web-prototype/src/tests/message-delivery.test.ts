import { act, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { SAVE_KEY } from '../engine/persistence'
import { createInitialState } from '../engine/state'
import { collectDueChatDeliveries, scheduleChatDelivery } from '../messages/delivery'
import { YANXIN_PROGRESS_REPORT } from '../messages/character'
import { createCharacterTaskState } from '../relationship/taskEngine'

const message = { id: 'm1', role: 'assistant' as const, text: '我晚点把完整那段发你。', createdAt: 1_000 }

describe('soft-time chat delivery', () => {
  it('samples reply delay from request start but never precedes readyAt', () => {
    const earliest = scheduleChatDelivery({
      id: 'd1', kind: 'reply', message, createdAt: 1_000, readyAt: 1_200, taskSignals: [], effect: 'none',
    }, () => 0)
    const latest = scheduleChatDelivery({
      id: 'd2', kind: 'reply', message, createdAt: 1_000, readyAt: 3_500, taskSignals: [], effect: 'none',
    }, () => 1)

    expect(earliest.deliverAt).toBe(1_800)
    expect(latest.deliverAt).toBe(3_500)
  })

  it('samples proactive reports between 1500 and 4000 ms after creation', () => {
    expect(scheduleChatDelivery({
      id: 'd1', kind: 'proactive_report', message, createdAt: 1_000, readyAt: 1_000, taskSignals: [], effect: 'unlock_e201',
    }, () => 0).deliverAt).toBe(2_500)
    expect(scheduleChatDelivery({
      id: 'd2', kind: 'proactive_report', message, createdAt: 1_000, readyAt: 1_000, taskSignals: [], effect: 'unlock_e201',
    }, () => 1).deliverAt).toBe(5_000)
  })

  it('flushes overdue deliveries immediately and keeps future ones pending', () => {
    const due = scheduleChatDelivery({
      id: 'due', kind: 'reply', message, createdAt: 0, readyAt: 0, taskSignals: [], effect: 'none',
    }, () => 0)
    const future = { ...due, id: 'future', deliverAt: 10_000 }
    expect(collectDueChatDeliveries([future, due], 5_000)).toEqual({ due: [due], pending: [future] })
  })
})

afterEach(() => vi.useRealTimers())

describe('progress report delivery', () => {
  it('delivers an overdue persisted message immediately after reload', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(5_000)
    const state = createInitialState()
    state.pendingChatDeliveries = [{
      id: 'persisted-delivery',
      kind: 'proactive_report',
      message: { id: 'persisted-message', role: 'assistant', text: '我到家了。', createdAt: 1_000 },
      deliverAt: 2_000,
      taskSignals: [],
      effect: 'none',
    }]
    const values = new Map([[SAVE_KEY, JSON.stringify(state)]])
    const storage: Storage = {
      get length() { return values.size }, clear: () => values.clear(), getItem: key => values.get(key) ?? null,
      key: index => [...values.keys()][index] ?? null, removeItem: key => { values.delete(key) }, setItem: (key, value) => { values.set(key, value) },
    }

    render(createElement(App, { storage }))
    await act(async () => Promise.resolve())
    fireEvent.click(screen.getByRole('button', { name: '私信，1 条未读' }))
    expect(screen.getByText('我到家了。')).toBeTruthy()
  })

  it('schedules one report in the background and does not duplicate it after reload', async () => {
    vi.useFakeTimers()
    const state = createInitialState()
    state.feedNodeIds = ['E101']
    state.unlockedNodeIds.push('E101')
    state.currentNodeId = 'E101'
    state.characterTasks.YANXIN_UNCUT_EVIDENCE = {
      ...createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'committed'),
      emittedEffects: ['schedule_progress_report'],
    }
    const values = new Map([[SAVE_KEY, JSON.stringify(state)]])
    const storage: Storage = {
      get length() { return values.size }, clear: () => values.clear(), getItem: key => values.get(key) ?? null,
      key: index => [...values.keys()][index] ?? null, removeItem: key => { values.delete(key) }, setItem: (key, value) => { values.set(key, value) },
    }

    const first = render(createElement(App, { storage }))
    await act(async () => vi.advanceTimersByTimeAsync(4_250))
    fireEvent.click(screen.getByRole('button', { name: '私信，1 条未读' }))
    expect(screen.getAllByText(YANXIN_PROGRESS_REPORT)).toHaveLength(1)
    first.unmount()

    render(createElement(App, { storage }))
    fireEvent.click(screen.getByRole('button', { name: '私信' }))
    expect(screen.getAllByText(YANXIN_PROGRESS_REPORT)).toHaveLength(1)
    const saved = JSON.parse(storage.getItem(SAVE_KEY)!)
    expect(saved.unlockedNodeIds.filter((id: string) => id === 'E201')).toHaveLength(1)
  })
})
