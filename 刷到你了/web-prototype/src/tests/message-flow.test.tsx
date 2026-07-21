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
    ['上票帮他守住最后 30 秒（30）', '他在全场感谢里单独叫了你的名字', 'support', '我知道你刚刚替我守了那场。后来网上才出现一段截掉前后的画面，我想先把事情从头告诉你。'],
    ['先不跟着场面上头', '输掉 PK 后，他没有追问你为什么', 'hold_back', '你刚才没有跟着场面上头，我明白。后来网上才出现一段截掉前后的画面，我想先把事情从头告诉你。'],
  ] as const)('delays an AI-generated first private message after choosing %s', async (choiceLabel, resultHeadline, expectedChoice, generatedMessage) => {
    vi.useFakeTimers()
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual(expect.objectContaining({
        turnKind: 'first_contact',
        userText: '',
        taskStage: 'invited',
        momentChoice: expectedChoice,
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
      taskStage: 'invited',
      fallbackUsed: false,
      characterIntents: ['explain'],
    })
    expect(document.body.textContent).not.toContain('有人只截了最后十秒，我想把完整那段找回来')
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
})
