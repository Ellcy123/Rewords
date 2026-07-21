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

function aiResponse(replyText: string, effects: {
  taskEvidence?: Array<{ kind: 'recognized_malicious_editing' | 'accepted_complete_evidence_plan'; sourceMessageId: string }>
  relationshipEvidence?: Array<{ kind: 'offered_actionable_help'; sourceMessageId: string }>
  memoryCandidates?: Array<{ type: 'promise'; sourceMessageId: string; interpretation: string }>
  openLoopUpdates?: Array<{ kind: 'report'; sourceMessageId: string; summary: string; status: 'open' | 'closed' }>
} = {}): Response {
  return new Response(JSON.stringify({
    replyText,
    tone: 'serious',
    characterIntents: [],
    taskEvidence: effects.taskEvidence ?? [],
    relationshipEvidence: effects.relationshipEvidence ?? [],
    memoryCandidates: effects.memoryCandidates ?? [],
    openLoopUpdates: effects.openLoopUpdates ?? [],
  }), { status: 200 })
}

function openMessages(): void {
  const button = screen.getAllByRole('button').find(candidate => candidate.textContent?.includes('私信'))
  if (!button) throw new Error('Message navigation button not found')
  fireEvent.click(button)
}

function composer(): { input: HTMLInputElement; send: HTMLButtonElement } {
  const input = screen.getByRole('textbox') as HTMLInputElement
  const send = input.closest('form')?.querySelector('button')
  if (!(send instanceof HTMLButtonElement)) throw new Error('Message composer button not found')
  return { input, send }
}

function savedState(storage: Storage): ReturnType<typeof stateWithChat> {
  return JSON.parse(storage.getItem(SAVE_KEY)!)
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('AI-backed private messages', () => {
  it('shows the user message immediately, then softly delivers a validated AI reply', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
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

    await act(async () => finishRequest(aiResponse('我去把原片找出来。', {
      taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: 'user-10000-1' }],
    })))
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

  it('does not advance a task through softly delivered offline fallback replies', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const fetcher = vi.fn(async () => { throw new Error('ai-server offline') })
    vi.stubGlobal('fetch', fetcher)
    const storage = memoryStorage(stateWithChat())
    render(<App storage={storage} />)
    openMessages()

    for (const [turn, userText] of ['offline user turn one', 'offline user turn two'].entries()) {
      const { input, send } = composer()
      fireEvent.change(input, { target: { value: userText } })
      fireEvent.click(send)
      await act(async () => Promise.resolve())

      const beforeDelivery = savedState(storage)
      expect(beforeDelivery.messages.filter(message => message.role === 'user').map(message => message.text)).toEqual(
        ['offline user turn one', 'offline user turn two'].slice(0, turn + 1),
      )
      expect(beforeDelivery.messages.filter(message => message.role === 'assistant' && message.id.startsWith('yanxin-reply-'))).toHaveLength(turn)
      expect(beforeDelivery.pendingChatDeliveries.filter(delivery => delivery.kind === 'reply')).toHaveLength(1)

      await act(async () => vi.advanceTimersByTimeAsync(2_250))
      expect(savedState(storage).messages.filter(message => message.role === 'assistant' && message.id.startsWith('yanxin-reply-'))).toHaveLength(turn + 1)
    }

    await act(async () => vi.advanceTimersByTimeAsync(10_000))
    const settled = savedState(storage)
    expect(settled.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('invited')
    expect(settled.messages.filter(message => message.id === 'yanxin-progress-report')).toHaveLength(0)
    expect(settled.unlockedNodeIds).not.toContain('E201')
    expect(fetcher).toHaveBeenCalledTimes(2)
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

  it('advances through two grounded evidence deliveries before scheduling one progress report', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const sourceMessageIds: string[] = []
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { currentMessageId: string; taskStage: 'invited' | 'understood' }
      sourceMessageIds.push(request.currentMessageId)
      return aiResponse('我会按完整证据继续核对', {
        taskEvidence: [{
          kind: request.taskStage === 'invited'
            ? 'recognized_malicious_editing'
            : 'accepted_complete_evidence_plan',
          sourceMessageId: request.currentMessageId,
        }],
      })
    })
    vi.stubGlobal('fetch', fetcher)
    const storage = memoryStorage(stateWithChat())
    render(<App storage={storage} />)
    openMessages()

    for (const turn of [1, 2]) {
      const { input, send } = composer()
      fireEvent.change(input, { target: { value: `empty-signal-${turn}` } })
      fireEvent.click(send)
      await act(async () => Promise.resolve())
      await act(async () => vi.advanceTimersByTimeAsync(2_250))
      expect(savedState(storage).characterTasks.YANXIN_UNCUT_EVIDENCE).toMatchObject({
        stage: turn === 1 ? 'understood' : 'committed',
        lastEvidenceSourceId: sourceMessageIds.at(-1),
      })
    }

    const beforeReport = savedState(storage)
    expect(beforeReport.characterTasks.YANXIN_UNCUT_EVIDENCE).toMatchObject({
      stage: 'committed',
      emittedEffects: ['schedule_progress_report'],
    })
    expect(beforeReport.pendingChatDeliveries.filter(delivery => delivery.kind === 'proactive_report')).toHaveLength(1)
    expect(beforeReport.unlockedNodeIds).not.toContain('E201')

    await act(async () => vi.advanceTimersByTimeAsync(4_250))
    const afterReport = savedState(storage)
    expect(afterReport.messages.filter(message => message.id === 'yanxin-progress-report')).toHaveLength(1)
    expect(afterReport.pendingChatDeliveries.filter(delivery => delivery.kind === 'proactive_report')).toHaveLength(0)
    expect(afterReport.unlockedNodeIds.filter(id => id === 'E201')).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('delivers one persisted fallback when an abandoned request completes after reload', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    let resolveRequest!: (response: Response) => void
    const fetcher = vi.fn(() => new Promise<Response>(resolve => { resolveRequest = resolve }))
    vi.stubGlobal('fetch', fetcher)
    const storage = memoryStorage(stateWithChat())
    const first = render(<App storage={storage} />)
    openMessages()
    const { input, send } = composer()
    fireEvent.change(input, { target: { value: 'persist this recovery reply' } })
    fireEvent.click(send)
    await act(async () => Promise.resolve())
    first.unmount()

    expect(savedState(storage).pendingChatDeliveries.filter(delivery => delivery.kind === 'reply')).toHaveLength(1)
    render(<App storage={storage} />)
    await act(async () => {
      resolveRequest(aiResponse('late abandoned completion', {
        taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: 'user-10000-1' }],
      }))
      await Promise.resolve()
    })
    await act(async () => vi.advanceTimersByTimeAsync(8_250))

    const recovered = savedState(storage)
    expect(recovered.messages.filter(message => message.role === 'assistant' && message.id.startsWith('yanxin-reply-'))).toHaveLength(1)
    expect(recovered.messages.some(message => message.text === 'late abandoned completion')).toBe(false)
    expect(recovered.pendingChatDeliveries.filter(delivery => delivery.kind === 'reply')).toHaveLength(0)
    expect(recovered.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('invited')

    await act(async () => vi.advanceTimersByTimeAsync(10_000))
    expect(savedState(storage).messages.filter(message => message.role === 'assistant' && message.id.startsWith('yanxin-reply-'))).toHaveLength(1)
  })

  it('keeps pending replies single-flight and does not advance without new evidence', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const resolvers: Array<(response: Response) => void> = []
    const fetcher = vi.fn(() => new Promise<Response>(resolve => resolvers.push(resolve)))
    vi.stubGlobal('fetch', fetcher)
    const storage = memoryStorage(stateWithChat())
    render(<App storage={storage} />)
    openMessages()

    let current = composer()
    fireEvent.change(current.input, { target: { value: 'first user turn' } })
    fireEvent.click(current.send)
    fireEvent.change(current.input, { target: { value: 'blocked second user turn' } })
    fireEvent.click(current.send)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(savedState(storage).messages.filter(message => message.role === 'user').map(message => message.text)).toEqual(['first user turn'])

    await act(async () => {
      resolvers.shift()!(aiResponse('第一次回复', {
        taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: 'user-10000-1' }],
      }))
      await Promise.resolve()
    })
    await act(async () => vi.advanceTimersByTimeAsync(2_250))
    expect(savedState(storage).characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('understood')

    current = composer()
    fireEvent.change(current.input, { target: { value: 'second user turn' } })
    fireEvent.click(current.send)
    fireEvent.change(current.input, { target: { value: 'blocked third user turn' } })
    fireEvent.click(current.send)
    expect(fetcher).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolvers.shift()!(aiResponse('第二次回复'))
      await Promise.resolve()
    })
    await act(async () => vi.advanceTimersByTimeAsync(2_250))

    const finalState = savedState(storage)
    expect(finalState.messages.slice(-4).map(message => `${message.role}:${message.text}`)).toEqual([
      'user:first user turn',
      'assistant:第一次回复',
      'user:second user turn',
      'assistant:第二次回复',
    ])
    expect(finalState.characterTasks.YANXIN_UNCUT_EVIDENCE).toMatchObject({
      stage: 'understood',
      lastEvidenceSourceId: 'user-10000-1',
    })
    expect(finalState.pendingChatDeliveries).toHaveLength(0)
  })
})
