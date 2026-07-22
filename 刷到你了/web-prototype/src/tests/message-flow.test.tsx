import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { SAVE_KEY } from '../engine/persistence'
import { createInitialState } from '../engine/state'

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

function stateAtPk(coins = 100) {
  const state = createInitialState()
  state.coins = coins
  state.unlockedNodeIds.push('E001')
  state.feedNodeIds = ['E001']
  state.currentNodeId = 'E001'
  return state
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('PK to Yanxin message flow', () => {
  it('does not let the player message Yanxin before their first contact', () => {
    render(<App storage={memoryStorage(createInitialState())} />)
    fireEvent.click(screen.getByRole('button', { name: '私信' }))
    expect(screen.getByText('等你们真正认识后，私信会出现在这里。')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: '给炎鑫发消息' })).toBeNull()
  })

  it.each([
    ['上票帮他守住最后 30 秒（30）', '他在全场感谢里单独叫了你的名字', 'support', '刚才最后那一下我看见了，谢了。你平时也会看这种PK吗？'],
    ['先不跟着场面上头', '输掉 PK 后，他没有追问你为什么', 'hold_back', '刚才你没跟着场面上头，我反而松口气。你平时也看这种PK吗？'],
  ] as const)('delays an AI-generated first private message after choosing %s', async (choiceLabel, resultHeadline, expectedChoice, generatedMessage) => {
    vi.useFakeTimers()
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual(expect.objectContaining({
        turnKind: 'first_contact',
        userText: '',
        taskStage: 'locked',
        momentChoice: expectedChoice,
        allowedMemoryIds: expect.not.arrayContaining(['yanxin_circulating_clip_viewed']),
      }))
      return new Response(JSON.stringify({
        replyText: generatedMessage,
        tone: 'serious',
        characterIntents: ['explain'],
        taskEvidence: [],
        relationshipEvidence: [],
        memoryCandidates: [],
        openLoopUpdates: [],
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetcher)
    const storage = memoryStorage(stateAtPk())
    render(<App storage={storage} />)

    fireEvent.click(screen.getByRole('button', { name: '决定要不要上票' }))
    fireEvent.click(screen.getByRole('button', { name: choiceLabel }))
    expect(screen.getAllByText(resultHeadline).length).toBeGreaterThan(0)
    expect(screen.queryByText(generatedMessage)).toBeNull()
    expect(screen.getByRole('button', { name: '私信' }).textContent).not.toContain('1')
    fireEvent.click(screen.getByRole('button', { name: '私信' }))
    expect(screen.queryByRole('textbox', { name: '给炎鑫发消息' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '推荐' }))

    await act(async () => Promise.resolve())
    await act(async () => vi.advanceTimersByTimeAsync(4_250))
    const messagesButton = screen.getByRole('button', { name: '私信，1 条未读' })
    fireEvent.click(messagesButton)
    expect(screen.getByText(generatedMessage)).toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(1)
    const saved = JSON.parse(storage.getItem(SAVE_KEY)!)
    expect(saved.aiDebugTurns.at(-1)).toMatchObject({
      turnKind: 'first_contact',
      taskStage: 'locked',
      fallbackUsed: false,
      characterIntents: ['explain'],
    })
    expect(document.body.textContent).not.toContain('有人只截了最后十秒，我想把完整那段找回来')
    expect(generatedMessage).not.toMatch(/十秒|剪辑|原片|录像|证据/)
    expect(screen.getByRole('button', { name: '私信' }).textContent).not.toContain('1')
    expect(document.body.textContent).not.toMatch(/好感|关系值|在线|直播中|办事中|休息中|输入中|倒计时/)
  })

  it('disables only support when the player cannot afford the PK spend', () => {
    render(<App storage={memoryStorage(stateAtPk(20))} />)
    fireEvent.click(screen.getByRole('button', { name: '决定要不要上票' }))

    expect(screen.getByRole('button', { name: '上票帮他守住最后 30 秒（30）' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: '先不跟着场面上头' }).hasAttribute('disabled')).toBe(false)
    expect(document.body.textContent).not.toMatch(/正确|错误|好感/)
  })

  it('asks about the circulating clip only after E103 was actually viewed', async () => {
    vi.useFakeTimers()
    const generatedMessage = '刚刷到那个片段了吧，你觉得那句话放在那里像什么意思？'
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual(expect.objectContaining({
        turnKind: 'clip_followup',
        userText: '',
        taskStage: 'invited',
        allowedMemoryIds: expect.arrayContaining(['yanxin_circulating_clip_viewed']),
      }))
      return new Response(JSON.stringify({
        replyText: generatedMessage,
        tone: 'warm',
        characterIntents: ['probe'],
        taskEvidence: [],
        relationshipEvidence: [],
        memoryCandidates: [],
        openLoopUpdates: [],
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetcher)
    const state = createInitialState()
    state.resolvedMomentIds = ['PK_LAST_30_SECONDS']
    state.unlockedNodeIds.push('E103')
    state.viewedNodeIds.push('E103')
    state.characterTasks.YANXIN_UNCUT_EVIDENCE = {
      ...state.characterTasks.YANXIN_UNCUT_EVIDENCE,
      stage: 'invited',
      familiarityExchangeSourceIds: ['user-one', 'user-two'],
      circulatingClipUnlocked: true,
    }
    state.sharedMemories.push({
      id: 'yanxin_circulating_clip_viewed',
      text: '玩家已经看过网上流传的炎鑫下播前十秒剪辑。',
      sourceNodeId: 'E103',
      createdAt: 0,
    })
    state.messages = [
      { id: 'yanxin-first-contact', role: 'assistant', text: '刚才那局我记住了。', createdAt: 1 },
      { id: 'user-one', role: 'user', text: '你还挺不服气。', createdAt: 2 },
      { id: 'yanxin-one', role: 'assistant', text: '被你看出来了。', createdAt: 3 },
      { id: 'user-two', role: 'user', text: '那先喝口水。', createdAt: 4 },
      { id: 'yanxin-two', role: 'assistant', text: '听你的。', createdAt: 5 },
    ]
    state.readMessageIds = state.messages.map(message => message.id)
    state.readMessageIds = ['yanxin-first-contact', 'yanxin-one', 'yanxin-two']

    render(<App storage={memoryStorage(state)} />)
    await act(async () => Promise.resolve())
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(generatedMessage)).toBeNull()
    await act(async () => vi.advanceTimersByTimeAsync(4_250))
    fireEvent.click(screen.getByRole('button', { name: '私信，1 条未读' }))
    expect(screen.getByText(generatedMessage)).toBeTruthy()
  })
})
