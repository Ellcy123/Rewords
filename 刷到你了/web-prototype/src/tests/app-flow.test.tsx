import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profiler } from 'react'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { SAVE_KEY } from '../engine/persistence'
import { createInitialState } from '../engine/state'
import '../styles/commerce.css'

function memoryStorage(initial?: object): Storage {
  const values = new Map<string, string>()
  if (initial) values.set(SAVE_KEY, JSON.stringify(initial))
  return { get length() { return values.size }, clear: () => values.clear(), getItem: key => values.get(key) ?? null, key: index => [...values.keys()][index] ?? null, removeItem: key => { values.delete(key) }, setItem: (key, value) => { values.set(key, value) } }
}

function unavailableStorage(): Storage {
  const denied = () => { throw new DOMException('Storage access denied', 'SecurityError') }
  return {
    get length() { return denied() },
    clear: denied,
    getItem: denied,
    key: denied,
    removeItem: denied,
    setItem: denied,
  }
}

function finishFeedTransition() {
  const currentSlot = document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="0"]')
  if (!currentSlot) throw new Error('Current feed slot was not rendered')
  fireEvent.transitionEnd(currentSlot)
}

describe('app shell', () => {
  it('records finite like and favorite progress in the profile', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    const like = screen.getByRole('button', { name: '点赞' })
    const favorite = screen.getByRole('button', { name: '收藏' })
    await user.click(like)
    await user.click(like)
    await user.click(favorite)
    expect(like.getAttribute('aria-pressed')).toBe('true')
    expect(favorite.getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByRole('button', { name: '我的' }))
    expect(screen.getByText('点赞不同视频 1/3')).toBeTruthy()
    expect(screen.getByText('收藏不同视频 1/2')).toBeTruthy()
  })

  it('claims a completed operation task once from the profile', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.viewedNodeIds = ['W001', 'C001', 'K001']
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: '我的' }))
    const claim = screen.getByRole('button', { name: '领取完整看完不同视频 10 金币' })
    expect(claim.className).toContain('is-claimable')
    await user.click(claim)
    expect(screen.getByText('已领取', { selector: 'button' })).toBeTruthy()
    expect(screen.getByText('已领取', { selector: 'button' }).className).toContain('is-claimed')
    expect(screen.getByText('110')).toBeTruthy()
  })

  it('renders the first short video and navigates by keyboard', async () => {
    render(<App storage={memoryStorage()} />)
    expect(screen.getAllByText('婚礼开始第 7 秒，新娘死亡').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '改命礼物' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeTruthy()
    await userEvent.keyboard('{ArrowDown}')
    finishFeedTransition()
    const currentSlot = document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="0"]')
    expect(currentSlot?.textContent).toContain('王妃翻墙私逃，被抓现行')
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

  it('routes an undiscovered recommended gift to its delivered relationship video', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.unlockedNodeIds.push('W300', 'E201')
    state.feedNodeIds.push('W300', 'E201')
    state.currentNodeId = 'W300'
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: '改命礼物' }))
    await user.click(screen.getByRole('button', { name: '寻找推荐录音笔线索' }))
    expect(screen.getAllByText('“你说的证据，我弄到了。”').length).toBeGreaterThan(0)
  })

  it('shows checkout-only subsidy without adding it to the visible balance', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.coins = 5
    state.currentNodeId = 'C001'
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: /小黄车.*刺客同款多功能梯子/ }))
    expect(screen.getByText('平台体验补助抵扣 15 金币，本次余额支付 5。')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '购买 5 金币' }))
    expect(screen.getByRole('status', { name: '购买成功：余额支付 5 金币，平台补助 15 金币，梯子已放入背包' })).toBeTruthy()
    expect(screen.queryByText('领取试玩金币')).toBeNull()
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

  it('never commits an unrelated current video while a gift rewrites the feed', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.inventory.ladder = 1
    const committedCurrentIds: string[] = []
    render(
      <Profiler id="app" onRender={() => {
        const current = document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="0"]')
        if (current?.dataset.nodeId) committedCurrentIds.push(current.dataset.nodeId)
      }}>
        <App storage={memoryStorage(state)} />
      </Profiler>,
    )
    await user.click(screen.getByRole('button', { name: '改命礼物' }))
    await user.click(screen.getByRole('button', { name: /选择梯子/ }))
    committedCurrentIds.length = 0

    await user.click(screen.getByRole('button', { name: '确认送入命运' }))

    expect(committedCurrentIds).not.toContain('C001')
    expect(committedCurrentIds.at(-1)).toBe('W101')
  })

  it('buys a product and rewrites a video', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.keyboard('{ArrowDown}')
    finishFeedTransition()
    await user.click(screen.getByRole('button', { name: /刺客同款多功能梯子/ }))
    await user.click(screen.getByRole('button', { name: '购买 20 金币' }))
    const feedback = screen.getByRole('status', { name: '购买成功：已扣除 20 金币，梯子已放入背包' })
    const flyer = feedback.querySelector<HTMLElement>('.purchase-flyer')
    if (!flyer) throw new Error('Expected purchased item to fly toward the backpack')
    const rewardCard = screen.getByText('获得 梯子 ×1').closest<HTMLElement>('.purchase-reward-card')
    if (!rewardCard) throw new Error('Expected a readable purchased-item card')
    expect(screen.getByText('-20 金币')).toBeTruthy()
    expect(screen.getByText('梯子 ×1 已放入背包')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '商品详情' })).toBeNull()
    expect(getComputedStyle(rewardCard).animationName).toBe('purchase-reward-show')
    expect(getComputedStyle(flyer).animationName).toBe('item-fly-to-backpack')
    fireEvent.animationEnd(feedback)
    await user.click(screen.getByRole('button', { name: '背包' }))
    expect(screen.getByText('梯子 ×1')).toBeTruthy()
    await user.keyboard('{Escape}')
    await user.keyboard('{ArrowUp}')
    finishFeedTransition()
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
    await user.click(screen.getByRole('button', { name: '我的' }))
    await user.click(screen.getByRole('button', { name: '查看命运记录' }))
    await user.click(screen.getByRole('button', { name: '别的命运' }))
    expect(screen.getByText('师傅到了但没有梯子')).toBeTruthy()
  })

  it('does not start a swipe while a result is waiting to be recorded', () => {
    const state = createInitialState()
    state.pendingResultNodeId = 'X001'
    state.unlockedNodeIds.push('X001')
    state.destinyNodeIds.push('X001')
    render(<App storage={memoryStorage(state)} />)
    const feed = screen.getByTestId('video-feed')
    Object.defineProperty(feed, 'clientHeight', { configurable: true, value: 1000 })
    expect(document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="0"]')?.dataset.nodeId).toBe('X001')
    expect(screen.getByRole('button', { name: '收进命运记录' })).toBeTruthy()

    fireEvent.pointerDown(feed, { pointerId: 1, clientY: 700 })
    fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })

    expect(feed.dataset.feedPhase).toBe('idle')
    expect(document.querySelector<HTMLElement>('.feed-slot[data-feed-slot="0"]')?.style.transform).toBe('translate3d(0, calc(0% + 0px), 0)')
  })

  it('separates resolved videos from alternate fates and replays without changing progress', async () => {
    const user = userEvent.setup()
    const state = createInitialState()
    state.resolvedNodeIds = ['W001']
    state.destinyNodeIds = ['X001']
    render(<App storage={memoryStorage(state)} />)
    await user.click(screen.getByRole('button', { name: '我的' }))
    await user.click(screen.getByRole('button', { name: '查看命运记录' }))
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

  it('still enters the game when a mobile browser blocks local storage', () => {
    render(<App storage={unavailableStorage()} />)
    expect(screen.getAllByText('婚礼开始第 7 秒，新娘死亡').length).toBeGreaterThan(0)
  })

  it('still enters when a mobile WebView blocks the localStorage property', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => { throw new DOMException('Storage property denied', 'SecurityError') },
    })
    try {
      render(<App />)
      expect(screen.getAllByText('婚礼开始第 7 秒，新娘死亡').length).toBeGreaterThan(0)
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original)
    }
  })
})
