import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { SAVE_KEY } from '../engine/persistence'
import { createInitialState } from '../engine/state'
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

function stateWithChat() {
  const state = createInitialState()
  state.feedNodeIds = ['E101']
  state.unlockedNodeIds.push('E001', 'E101')
  state.currentNodeId = 'E101'
  state.resolvedMomentIds = ['PK_LAST_30_SECONDS']
  state.relationshipEvidence = [{ id: 'PK_LAST_30_SECONDS:support', kind: 'support', sourceMomentId: 'PK_LAST_30_SECONDS' }]
  state.characterTasks.YANXIN_UNCUT_EVIDENCE = createCharacterTaskState('YANXIN_UNCUT_EVIDENCE', 'invited')
  state.messages = [{ id: 'first', role: 'assistant', text: '刚才你在最后那一下站出来，我看见了。', createdAt: 1 }]
  return state
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('AI-backed private messages', () => {
  it('shows the user message immediately, then softly delivers a validated AI reply', async () => {
    vi.useFakeTimers()
    let finishRequest!: (response: Response) => void
    const fetcher = vi.fn(() => new Promise<Response>(resolve => { finishRequest = resolve }))
    vi.stubGlobal('fetch', fetcher)
    render(<App storage={memoryStorage(stateWithChat())} />)
    fireEvent.click(screen.getByRole('button', { name: '私信，1 条未读' }))

    const input = screen.getByRole('textbox', { name: '给炎鑫发消息' })
    fireEvent.change(input, { target: { value: '你可以找完整时间戳' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))

    expect(screen.getByText('你可以找完整时间戳')).toBeTruthy()
    expect(input.hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: '发送消息' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText('我去把原片找出来。')).toBeNull()

    await act(async () => finishRequest(new Response(JSON.stringify({
      replyText: '我去把原片找出来。',
      taskSignals: ['acknowledge_pressure'],
      tone: 'serious',
    }), { status: 200 })))
    expect(screen.queryByText('我去把原片找出来。')).toBeNull()
    fireEvent.change(input, { target: { value: '那我等你' } })
    expect(screen.getByRole('button', { name: '发送消息' }).hasAttribute('disabled')).toBe(true)
    await act(async () => vi.advanceTimersByTimeAsync(2_250))

    expect(screen.getByText('我去把原片找出来。')).toBeTruthy()
    expect(screen.getByRole('button', { name: '发送消息' }).hasAttribute('disabled')).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).not.toMatch(/输入中|倒计时|在线|直播中|办事中|休息中/)
  })

  it('uses the stage-aware reply after an AI failure and keeps the delay', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    render(<App storage={memoryStorage(stateWithChat())} />)
    fireEvent.click(screen.getByRole('button', { name: '私信，1 条未读' }))
    fireEvent.change(screen.getByRole('textbox', { name: '给炎鑫发消息' }), { target: { value: '你还好吗' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))

    await act(async () => Promise.resolve())
    expect(screen.queryByText('我不是非要你替我出头。', { exact: false })).toBeNull()
    await act(async () => vi.advanceTimersByTimeAsync(2_250))
    expect(screen.getByText('我不是非要你替我出头。', { exact: false })).toBeTruthy()
  })

  it('recovers an in-flight request with one fallback after a reload', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    const storage = memoryStorage(stateWithChat())
    const first = render(<App storage={storage} />)
    fireEvent.click(screen.getByRole('button', { name: '私信，1 条未读' }))
    fireEvent.change(screen.getByRole('textbox', { name: '给炎鑫发消息' }), { target: { value: '等你消息' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await act(async () => Promise.resolve())
    first.unmount()

    render(<App storage={storage} />)
    await act(async () => vi.advanceTimersByTimeAsync(8_250))
    fireEvent.click(screen.getByRole('button', { name: '私信，1 条未读' }))
    expect(screen.getAllByText('我不是非要你替我出头。', { exact: false })).toHaveLength(1)
  })
})
