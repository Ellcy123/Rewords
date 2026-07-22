import { describe, expect, it } from 'vitest'
import { gameReducer } from '../engine/reducer'
import { createInitialState } from '../engine/state'
import { resolveMoment } from '../moments/resolveMoment'
import { scheduleChatDelivery } from '../messages/delivery'
import type { PendingChatDelivery } from '../messages/types'

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

  it('applies a moment resolution once while keeping the evidence task locked', () => {
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
    expect(first.yanxinPersona.relationship.dimensions).toMatchObject({
      closeness: 1,
      boundaryPressure: 1,
    })
    expect(first.yanxinPersona.relationship.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        evidenceKind: 'public_financial_support',
        sourceId: 'game-event:PK_LAST_30_SECONDS',
      }),
    ]))
    expect(first.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('locked')
    expect(first.unlockedNodeIds).toContain('E101')
    expect(repeated).toEqual(first)
  })

  it('unlocks the public ten-second clip after two delivered player replies without inviting the task', () => {
    const entry = createInitialState()
    entry.resolvedMomentIds = ['PK_LAST_30_SECONDS']
    entry.messages = [{
      id: 'yanxin-first-contact', role: 'assistant', text: '刚才那局我记住了。', createdAt: 0,
    }]

    let state = entry
    for (let index = 1; index <= 2; index += 1) {
      state = gameReducer(state, {
        type: 'CHAT_USER_SENT',
        message: { id: `user-casual-${index}`, role: 'user', text: `普通聊天${index}`, createdAt: index },
      })
      const delivery = scheduleChatDelivery({
        id: `casual-delivery-${index}`,
        kind: 'reply',
        message: { id: `yanxin-reply-${index}`, role: 'assistant', text: `普通回复${index}`, createdAt: index },
        createdAt: index,
        readyAt: index,
        aiEffects: { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] },
        effect: 'none',
        sourceMessageId: `user-casual-${index}`,
      }, () => 0)
      state = gameReducer(state, { type: 'CHAT_DELIVERY_SCHEDULED', delivery })
      state = gameReducer(state, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })
      expect(state.unlockedNodeIds.includes('E103')).toBe(index === 2)
    }

    expect(state.feedNodeIds).toContain('E103')
    expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('locked')
    const afterClip = gameReducer(state, { type: 'NODE_VIEWED', nodeId: 'E103' })
    expect(afterClip.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('invited')
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

    state.characterTasks.YANXIN_UNCUT_EVIDENCE = {
      ...state.characterTasks.YANXIN_UNCUT_EVIDENCE,
      stage: 'committed',
      emittedEffects: ['schedule_progress_report'],
    }
    expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('committed')
    const report = { id: 'a1', role: 'assistant' as const, text: '完整那段也发了。', createdAt: 2_000 }
    const delivery = scheduleChatDelivery({
      id: 'd1', kind: 'proactive_report', message: report, createdAt: 2_000, readyAt: 2_000,
      aiEffects: { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] }, effect: 'unlock_e201',
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

  it('settles all grounded AI effects once when the reply is delivered', () => {
    const userMessage = {
      id: 'user-evidence', role: 'user' as const, text: '这是恶意剪辑，我答应等你核对完。', createdAt: 1_000,
    }
    let state = createInitialState()
    state.characterTasks.YANXIN_UNCUT_EVIDENCE = {
      ...state.characterTasks.YANXIN_UNCUT_EVIDENCE,
      stage: 'invited',
    }
    state = gameReducer(state, { type: 'CHAT_USER_SENT', message: userMessage })
    const delivery = {
      id: 'delivery-ai-effects',
      kind: 'reply',
      message: { id: 'assistant-ai-effects', role: 'assistant', text: '我会核对完整证据。', createdAt: 2_000 },
      deliverAt: 2_000,
      effect: 'none',
      aiEffects: {
        taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: userMessage.id }],
        relationshipEvidence: [{ kind: 'offered_actionable_help', sourceMessageId: userMessage.id }],
        memoryCandidates: [{ type: 'promise', sourceMessageId: userMessage.id, interpretation: '玩家答应等待核对。' }],
        openLoopUpdates: [{ kind: 'report', sourceMessageId: userMessage.id, summary: '等待核对结果', status: 'open' }],
      },
    } as PendingChatDelivery
    state = gameReducer(state, { type: 'CHAT_DELIVERY_SCHEDULED', delivery })

    expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('invited')
    expect(state.longTermMemories).toEqual([])

    const settled = gameReducer(state, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })
    const repeated = gameReducer(settled, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })

    expect(settled.messages.at(-1)?.id).toBe('assistant-ai-effects')
    expect(settled.characterTasks.YANXIN_UNCUT_EVIDENCE).toMatchObject({
      stage: 'understood', lastEvidenceSourceId: userMessage.id,
    })
    expect(settled.yanxinPersona.relationship.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ evidenceKind: 'offered_actionable_help', sourceId: userMessage.id }),
    ]))
    expect(settled.longTermMemories).toEqual([
      expect.objectContaining({ type: 'promise', sourceMessageId: userMessage.id }),
    ])
    expect(settled.openLoops).toEqual([
      expect.objectContaining({ kind: 'report', sourceMessageId: userMessage.id, status: 'open' }),
    ])
    expect(repeated).toEqual(settled)
  })

  it('ignores injected AI effects on a system fallback checkpoint delivery', () => {
    const userMessage = { id: 'user-injected', role: 'user' as const, text: '我会等你核对', createdAt: 1_000 }
    let state = createInitialState()
    state.characterTasks.YANXIN_UNCUT_EVIDENCE = {
      ...state.characterTasks.YANXIN_UNCUT_EVIDENCE,
      stage: 'invited',
    }
    state = gameReducer(state, { type: 'CHAT_USER_SENT', message: userMessage })
    const delivery: PendingChatDelivery = {
      id: 'system-checkpoint-injected-effects',
      kind: 'system_fallback_checkpoint',
      source: 'system_fallback',
      message: { id: 'system-checkpoint-message', role: 'assistant', text: '系统保障', createdAt: 2_000 },
      deliverAt: 2_000,
      effect: 'unlock_e201',
      aiEffects: {
        taskEvidence: [{ kind: 'accepted_complete_evidence_plan', sourceMessageId: userMessage.id }],
        relationshipEvidence: [{ kind: 'offered_actionable_help', sourceMessageId: userMessage.id }],
        memoryCandidates: [{ type: 'promise', sourceMessageId: userMessage.id, interpretation: '注入记忆' }],
        openLoopUpdates: [{ kind: 'report', sourceMessageId: userMessage.id, summary: '注入线索', status: 'open' }],
      },
    }
    state = gameReducer(state, { type: 'CHAT_DELIVERY_SCHEDULED', delivery })

    const settled = gameReducer(state, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })

    expect(settled.characterTasks.YANXIN_UNCUT_EVIDENCE).toMatchObject({
      stage: 'invited',
      lastEvidenceSourceId: null,
      lastCheckpointSource: null,
    })
    expect(settled.yanxinPersona.relationship.changes).toEqual([])
    expect(settled.longTermMemories).toEqual([])
    expect(settled.openLoops).toEqual([])
    expect(settled.unlockedNodeIds).not.toContain('E201')
  })

  it('does not advance a locked task from ordinary replies without player-linked deliveries', () => {
    const entryState = createInitialState()
    entryState.unlockedNodeIds.push('E001')
    let state = gameReducer(entryState, {
      type: 'MOMENT_RESOLVED',
      resolution: resolveMoment('PK_LAST_30_SECONDS', 'hold_back').resolution,
    })
    for (const turn of [1, 2, 3, 4]) {
      const delivery = scheduleChatDelivery({
        id: `no-signal-${turn}`,
        kind: 'reply',
        message: { id: `reply-${turn}`, role: 'assistant', text: '我在听。', createdAt: turn },
        createdAt: turn,
        readyAt: turn,
        aiEffects: { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] },
        effect: 'none',
      }, () => 0)
      state = gameReducer(state, { type: 'CHAT_DELIVERY_SCHEDULED', delivery })
      state = gameReducer(state, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })
    }
    expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('locked')
    expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.emittedEffects).toEqual([])
  })

  it('ignores an E201 delivery effect before the character task is committed', () => {
    const report = { id: 'early-message', role: 'assistant' as const, text: '不该提前解锁。', createdAt: 0 }
    const delivery = scheduleChatDelivery({
      id: 'early-delivery', kind: 'proactive_report', message: report, createdAt: 0, readyAt: 0,
      aiEffects: { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] }, effect: 'unlock_e201',
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
