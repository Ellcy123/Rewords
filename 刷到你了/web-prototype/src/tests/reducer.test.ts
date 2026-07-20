import { describe, expect, it } from 'vitest'
import { gameReducer } from '../engine/reducer'
import { createInitialState } from '../engine/state'
import { resolveMoment } from '../moments/resolveMoment'
import { scheduleChatDelivery } from '../messages/delivery'

const buy = (state: ReturnType<typeof createInitialState>, itemId: 'ladder' | 'technician' | 'recorder' | 'projector') => gameReducer(state, { type: 'BUY_ITEM', itemId })

describe('game reducer', () => {
  it('starts with the three roots and tutorial money', () => {
    const state = createInitialState()
    expect(state.coins).toBe(100)
    expect(state.feedNodeIds).toEqual(['W001', 'C001', 'K001'])
    expect(state.discoveredItemIds).toEqual(['ladder', 'technician'])
  })

  it('buys and gives a correct item', () => {
    const bought = buy(createInitialState(), 'ladder')
    expect(bought.coins).toBe(80)
    expect(bought.inventory.ladder).toBe(1)
    const result = gameReducer(bought, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'ladder' })
    expect(result.inventory.ladder).toBe(0)
    expect(result.pendingResultNodeId).toBeNull()
    expect(result.currentNodeId).toBe('W101')
    expect(result.unlockedNodeIds).toContain('W101')
    expect(result.resolvedNodeIds).toContain('W001')
    expect(result.feedNodeIds).not.toContain('W001')
    expect(result.feedNodeIds).toContain('W101')
    expect(result.coins).toBe(90)
    expect(result.ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: 'item_purchase', amount: -20 }),
      expect.objectContaining({ reason: 'main_reward', amount: 10 }),
    ]))
  })

  it('records wrong results without replacing the route and is idempotent', () => {
    const bought = buy(createInitialState(), 'technician')
    const wrong = gameReducer(bought, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'technician' })
    expect(wrong.destinyNodeIds).toEqual(['X001'])
    expect(wrong.feedNodeIds).not.toContain('X001')
    expect(wrong.resolvedNodeIds).not.toContain('W001')
    expect(wrong.feedNodeIds).toContain('W001')
    const replay = gameReducer({ ...wrong, inventory: { ...wrong.inventory, technician: 1 } }, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'technician' })
    expect(replay.inventory.technician).toBe(1)
    expect(replay.destinyNodeIds).toEqual(['X001'])
  })

  it('opens W300 immediately after the technician resolves W101', () => {
    const state = createInitialState()
    state.inventory.technician = 1
    state.unlockedNodeIds.push('W101')
    state.feedNodeIds.push('W101')
    const result = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'W101', itemId: 'technician' })
    expect(result.currentNodeId).toBe('W300')
    expect(result.pendingResultNodeId).toBeNull()
    expect(result.feedNodeIds).toContain('W300')
    expect(result.unlockedNodeIds).toContain('E001')
    expect(result.feedNodeIds).toContain('E001')
  })

  it('completes on W400 result', () => {
    const complete = gameReducer({ ...createInitialState(), feedNodeIds: ['W400'], pendingResultNodeId: 'W400' }, { type: 'RESULT_FINISHED', nodeId: 'W400' })
    expect(complete.completed).toBe(true)
    expect(complete.resolvedNodeIds).toContain('W400')
  })

  it('uses checkout-only subsidy for one missing dependency without increasing spendable balance', () => {
    const empty = { ...createInitialState(), coins: 5 }
    const subsidized = gameReducer(empty, { type: 'BUY_ITEM', itemId: 'ladder' })
    expect(subsidized.coins).toBe(0)
    expect(subsidized.inventory.ladder).toBe(1)
    expect(subsidized.ledger.at(-1)).toMatchObject({
      reason: 'solvency_subsidy', grossAmount: 20, playerPaidAmount: 5, subsidyAmount: 15,
    })
    expect(gameReducer(subsidized, { type: 'BUY_ITEM', itemId: 'ladder' })).toEqual(subsidized)

    const noLongerNeeded = { ...empty, coins: 0, resolvedNodeIds: ['W001' as const] }
    expect(gameReducer(noLongerNeeded, { type: 'BUY_ITEM', itemId: 'ladder' })).toEqual(noLongerNeeded)
  })

  it('does not grant infinite view income and claims each finite activity reward once', () => {
    let state = createInitialState()
    const initialCoins = state.coins
    state = gameReducer(state, { type: 'NODE_VIEWED', nodeId: 'W001' })
    state = gameReducer(state, { type: 'NODE_VIEWED', nodeId: 'C001' })
    state = gameReducer(state, { type: 'NODE_VIEWED', nodeId: 'K001' })
    expect(state.coins).toBe(initialCoins)
    state = gameReducer(state, { type: 'ACTIVITY_TASK_CLAIMED', taskId: 'WATCH_THREE' })
    expect(state.coins).toBe(initialCoins + 10)
    expect(gameReducer(state, { type: 'ACTIVITY_TASK_CLAIMED', taskId: 'WATCH_THREE' })).toEqual(state)

    state = gameReducer(state, { type: 'VIDEO_LIKED', nodeId: 'W001' })
    state = gameReducer(state, { type: 'VIDEO_LIKED', nodeId: 'W001' })
    state = gameReducer(state, { type: 'VIDEO_LIKED', nodeId: 'C001' })
    expect(gameReducer(state, { type: 'ACTIVITY_TASK_CLAIMED', taskId: 'LIKE_THREE' })).toEqual(state)
    state = gameReducer(state, { type: 'VIDEO_LIKED', nodeId: 'K001' })
    state = gameReducer(state, { type: 'ACTIVITY_TASK_CLAIMED', taskId: 'LIKE_THREE' })
    expect(state.coins).toBe(initialCoins + 20)

    state = gameReducer(state, { type: 'VIDEO_FAVORITED', nodeId: 'W001' })
    state = gameReducer(state, { type: 'VIDEO_FAVORITED', nodeId: 'C001' })
    state = gameReducer(state, { type: 'VIDEO_FAVORITED', nodeId: 'C001' })
    state = gameReducer(state, { type: 'ACTIVITY_TASK_CLAIMED', taskId: 'FAVORITE_TWO' })
    expect(state.coins).toBe(initialCoins + 30)
  })

  it('can subsidize a required item again after a wrong branch consumes it', () => {
    let state = { ...createInitialState(), coins: 0 }
    state = gameReducer(state, { type: 'BUY_ITEM', itemId: 'technician' })
    expect(state.inventory.technician).toBe(1)
    state = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'technician' })
    expect(state.inventory.technician).toBe(0)
    const restored = gameReducer(state, { type: 'BUY_ITEM', itemId: 'technician' })
    expect(restored.inventory.technician).toBe(1)
    expect(restored.coins).toBe(0)
    expect(restored.ledger.filter(entry => entry.reason === 'solvency_subsidy')).toHaveLength(2)
  })

  it('does not subsidize a third recorder for the optional X016 mistake', () => {
    const state: ReturnType<typeof createInitialState> = {
      ...createInitialState(),
      coins: 0,
      discoveredItemIds: ['ladder', 'technician', 'recorder'],
      resolvedNodeIds: ['C001', 'W300'],
    }
    expect(gameReducer(state, { type: 'BUY_ITEM', itemId: 'recorder' }))
      .toEqual(state)
  })

  it('recovers only unresolved unlocked nodes', () => {
    const empty = {
      ...createInitialState(),
      feedNodeIds: [],
      resolvedNodeIds: ['W001'],
      unlockedNodeIds: ['W001', 'C001', 'K001'],
    } as ReturnType<typeof createInitialState>
    expect(gameReducer(empty, { type: 'RECOVER_FEED' }).feedNodeIds).toEqual(['C001', 'K001'])
  })

  it('applies a moment resolution once, including evidence, spend and task invitation', () => {
    const resolution = resolveMoment('PK_LAST_30_SECONDS', 'support').resolution
    const beforeEntry = createInitialState()
    expect(gameReducer(beforeEntry, { type: 'MOMENT_RESOLVED', resolution })).toEqual(beforeEntry)
    beforeEntry.unlockedNodeIds.push('E001')
    beforeEntry.feedNodeIds.push('E001')
    const first = gameReducer(beforeEntry, { type: 'MOMENT_RESOLVED', resolution })
    const repeated = gameReducer(first, { type: 'MOMENT_RESOLVED', resolution })

    expect(first.coins).toBe(70)
    expect(first.resolvedMomentIds).toEqual(['PK_LAST_30_SECONDS'])
    expect(first.relationshipEvidence.map(evidence => evidence.kind)).toEqual(['support', 'boundary_pressure'])
    expect(first.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('invited')
    expect(first.unlockedNodeIds).toContain('E101')
    expect(repeated).toEqual(first)
  })

  it('deduplicates user messages, scheduled deliveries, delivered effects and E201 unlock', () => {
    const userMessage = { id: 'u1', role: 'user' as const, text: '我可以帮你找完整证据。', createdAt: 1_000 }
    const entryState = createInitialState()
    entryState.unlockedNodeIds.push('E001')
    entryState.feedNodeIds.push('E001')
    let state = gameReducer(entryState, {
      type: 'MOMENT_RESOLVED',
      resolution: resolveMoment('PK_LAST_30_SECONDS', 'hold_back').resolution,
    })
    state = gameReducer(state, { type: 'CHAT_USER_SENT', message: userMessage })
    state = gameReducer(state, { type: 'CHAT_USER_SENT', message: userMessage })
    expect(state.messages).toEqual([userMessage])

    state = gameReducer(state, { type: 'TASK_SIGNAL_RECEIVED', taskId: 'YANXIN_UNCUT_EVIDENCE', signal: 'acknowledge_pressure' })
    state = gameReducer(state, { type: 'TASK_SIGNAL_RECEIVED', taskId: 'YANXIN_UNCUT_EVIDENCE', signal: 'offer_evidence_plan' })
    expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('committed')
    const report = { id: 'a1', role: 'assistant' as const, text: '完整那段也发了。', createdAt: 2_000 }
    const delivery = scheduleChatDelivery({
      id: 'd1', kind: 'proactive_report', message: report, createdAt: 2_000, readyAt: 2_000,
      taskSignals: [], effect: 'unlock_e201',
    }, () => 0)
    state = gameReducer(state, { type: 'CHAT_DELIVERY_SCHEDULED', delivery })
    state = gameReducer(state, { type: 'CHAT_DELIVERY_SCHEDULED', delivery })
    expect(state.pendingChatDeliveries).toHaveLength(1)

    state = gameReducer(state, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })
    const repeated = gameReducer(state, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })
    expect(state.messages.filter(message => message.id === 'a1')).toHaveLength(1)
    expect(state.unlockedNodeIds.filter(id => id === 'E201')).toHaveLength(1)
    expect(state.feedNodeIds.filter(id => id === 'E201')).toHaveLength(1)
    expect(repeated).toEqual(state)
  })

  it('ignores an E201 delivery effect before the character task is committed', () => {
    const report = { id: 'early-message', role: 'assistant' as const, text: '不该提前解锁。', createdAt: 0 }
    const delivery = scheduleChatDelivery({
      id: 'early-delivery', kind: 'proactive_report', message: report, createdAt: 0, readyAt: 0,
      taskSignals: [], effect: 'unlock_e201',
    }, () => 0)
    const scheduled = gameReducer(createInitialState(), { type: 'CHAT_DELIVERY_SCHEDULED', delivery })
    const flushed = gameReducer(scheduled, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })
    expect(flushed.unlockedNodeIds).not.toContain('E201')
    expect(flushed.feedNodeIds).not.toContain('E201')
  })

  it('saves activity claims and an ending at most once', () => {
    let state = createInitialState()
    state.viewedNodeIds = ['W001', 'C001', 'K001']
    state = gameReducer(state, { type: 'ACTIVITY_TASK_CLAIMED', taskId: 'WATCH_THREE' })
    state = gameReducer(state, { type: 'ACTIVITY_TASK_CLAIMED', taskId: 'WATCH_THREE' })
    expect(state.claimedActivityTaskIds).toEqual(['WATCH_THREE'])

    const ending = { id: 'ending-1', letter: '写给你的信', generatedAt: '2026-07-20T00:00:00.000Z', futureClaimId: 'walk-tomorrow' }
    state = gameReducer(state, { type: 'ENDING_SAVED', ending })
    expect(gameReducer(state, { type: 'ENDING_SAVED', ending: { ...ending, id: 'ending-2' } }).ending).toEqual(ending)
  })
})
