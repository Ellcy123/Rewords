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

afterEach(() => vi.useRealTimers())

describe('PK to Yanxin message flow', () => {
  it('does not let the player message Yanxin before their first contact', () => {
    render(<App storage={memoryStorage(createInitialState())} />)
    fireEvent.click(screen.getByRole('button', { name: '私信' }))
    expect(screen.getByText('等你们真正认识后，私信会出现在这里。')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: '给炎鑫发消息' })).toBeNull()
  })

  it.each([
    ['上票帮他守住最后 30 秒（30）', '他在全场感谢里单独叫了你的名字', '刚才你在最后那一下站出来，我看见了'],
    ['先不跟着场面上头', '输掉 PK 后，他没有追问你为什么', '刚才你没跟着场面上头，我也看见了'],
  ] as const)('delays the first private message after choosing %s', (choiceLabel, resultHeadline, messageCopy) => {
    vi.useFakeTimers()
    render(<App storage={memoryStorage(stateAtPk())} />)

    fireEvent.click(screen.getByRole('button', { name: '决定要不要上票' }))
    fireEvent.click(screen.getByRole('button', { name: choiceLabel }))
    expect(screen.getAllByText(resultHeadline).length).toBeGreaterThan(0)
    expect(screen.queryByText(messageCopy, { exact: false })).toBeNull()
    expect(screen.getByRole('button', { name: '私信' }).textContent).not.toContain('1')

    act(() => vi.advanceTimersByTime(4_250))
    const messagesButton = screen.getByRole('button', { name: '私信，1 条未读' })
    fireEvent.click(messagesButton)
    expect(screen.getByText(messageCopy, { exact: false })).toBeTruthy()
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
