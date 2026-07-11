import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { SAVE_KEY } from '../engine/persistence'
import { createInitialState } from '../engine/state'

function memoryStorage(initial?: object): Storage {
  const values = new Map<string, string>()
  if (initial) values.set(SAVE_KEY, JSON.stringify(initial))
  return { get length() { return values.size }, clear: () => values.clear(), getItem: key => values.get(key) ?? null, key: index => [...values.keys()][index] ?? null, removeItem: key => { values.delete(key) }, setItem: (key, value) => { values.set(key, value) } }
}

describe('app shell', () => {
  it('renders the first short video and navigates by keyboard', async () => {
    render(<App storage={memoryStorage()} />)
    expect(screen.getAllByText('婚礼开始第 7 秒，新娘死亡').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '改命礼物' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeTruthy()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByText('王妃翻墙私逃，被抓现行').length).toBeGreaterThan(0)
  })

  it('toggles playback from the stage', async () => {
    render(<App storage={memoryStorage()} />)
    await userEvent.click(screen.getByRole('button', { name: '暂停或继续视频' }))
    expect(screen.getByText('已暂停')).toBeTruthy()
  })

  it('marks the correct gift as recommended and opens direct purchase', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(screen.getByRole('button', { name: '改命礼物' }))
    expect(screen.getByText('推荐赠送')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '购买推荐梯子' }))
    expect(screen.getByRole('heading', { name: '商品详情' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '购买 20 金币' })).toBeTruthy()
  })

  it('routes an undiscovered recommended gift to its clue video', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.unlockedNodeIds.push('W300')
    state.feedNodeIds.push('W300')
    state.currentNodeId = 'W300'
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: '改命礼物' }))
    await user.click(screen.getByRole('button', { name: '寻找推荐录音笔线索' }))
    expect(screen.getAllByText('结论：电脑先冻关机了').length).toBeGreaterThan(0)
  })

  it('enters the combined W300 immediately after giving the technician to W101', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.inventory.technician = 1
    state.unlockedNodeIds = ['W101']
    state.feedNodeIds = ['W101']
    state.currentNodeId = 'W101'
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: '改命礼物' }))
    await user.click(screen.getByRole('button', { name: /选择空调师傅/ }))
    await user.click(screen.getByRole('button', { name: '确认送入命运' }))
    expect(screen.getAllByText('新娘婚礼当天私会维修工？').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: '继续刷' })).toBeNull()
  })

  it('buys a product and rewrites a video', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.keyboard('{ArrowDown}')
    await user.click(screen.getByRole('button', { name: /刺客同款多功能梯子/ }))
    await user.click(screen.getByRole('button', { name: '购买 20 金币' }))
    expect(screen.getByText('梯子 ×1')).toBeTruthy()
    await user.keyboard('{Escape}')
    await user.keyboard('{ArrowUp}')
    await user.click(screen.getByRole('button', { name: '改命礼物' }))
    await user.click(screen.getByRole('button', { name: /选择梯子/ }))
    await user.click(screen.getByRole('button', { name: '确认送入命运' }))
    expect((await screen.findAllByText('有梯子，新娘还是死了')).length).toBeGreaterThan(0)
  })

  it('returns a wrong result to destiny records', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.inventory.technician = 1
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: '改命礼物' }))
    await user.click(screen.getByRole('button', { name: /选择空调师傅/ }))
    await user.click(screen.getByRole('button', { name: '确认送入命运' }))
    expect((await screen.findAllByText('师傅到了，还是够不着')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: '收进命运记录' }))
    await user.click(screen.getByRole('button', { name: '记录' }))
    await user.click(screen.getByRole('button', { name: '别的命运' }))
    expect(screen.getByText('师傅到了但没有梯子')).toBeTruthy()
  })

  it('separates resolved videos from alternate fates and replays without changing progress', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.resolvedNodeIds = ['W001']
    state.destinyNodeIds = ['X001']
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: '记录' }))
    expect(screen.getByRole('button', { name: '已改写' })).toBeTruthy()
    expect(screen.getByText('婚礼灯架事故')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '重看婚礼灯架事故' }))
    expect(screen.getByRole('button', { name: '关闭重看' })).toBeTruthy()
    expect(screen.getAllByText('婚礼开始第 7 秒，新娘死亡').length).toBeGreaterThan(0)
  })

  it('shows completion after finishing W400', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.discoveredItemIds = ['ladder', 'technician', 'recorder', 'projector']
    state.inventory.projector = 1
    state.unlockedNodeIds = ['W301']
    state.feedNodeIds = ['W301']
    state.currentNodeId = 'W301'
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: '改命礼物' }))
    await user.click(screen.getByRole('button', { name: /选择投影服务/ }))
    await user.click(screen.getByRole('button', { name: '确认送入命运' }))
    await user.click(await screen.findByRole('button', { name: '完成婚礼' }))
    expect(screen.getByRole('heading', { name: '婚礼顺利结束' })).toBeTruthy()
    expect(screen.getByText('让婚礼顺利结束——已完成')).toBeTruthy()
  })

  it('archives W200 and reveals W300 when playback finishes', () => {
    vi.useFakeTimers()
    try {
      const state = createInitialState()
      state.unlockedNodeIds = ['W200']
      state.feedNodeIds = ['W200']
      state.currentNodeId = 'W200'
      state.pendingResultNodeId = 'W200'
      render(<App storage={memoryStorage(state)} />)
      act(() => vi.advanceTimersByTime(9_000))
      expect(screen.getAllByText('新娘婚礼当天私会维修工？').length).toBeGreaterThan(0)
      expect(screen.queryByRole('button', { name: '继续刷' })).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows a safe reset screen for an unsupported save', () => {
    render(<App storage={memoryStorage({ version: 99 })} />)
    expect(screen.getByRole('heading', { name: '存档需要更新' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '安全重新开始' })).toBeTruthy()
  })

  it('recovers the root feed when saved feed is empty', () => {
    const state = createInitialState()
    state.feedNodeIds = []
    render(<App storage={memoryStorage(state)} />)
    expect(screen.getAllByText('婚礼开始第 7 秒，新娘死亡').length).toBeGreaterThan(0)
  })
})
