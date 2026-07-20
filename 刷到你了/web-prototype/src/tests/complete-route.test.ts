import { describe, expect, it } from 'vitest'
import type { ItemId } from '../content/types'
import { rankFeed } from '../engine/feed'
import { gameReducer } from '../engine/reducer'
import { createInitialState, type GameState } from '../engine/state'
import { scheduleChatDelivery } from '../messages/delivery'
import type { MomentChoiceId } from '../moments/types'
import { resolveMoment } from '../moments/resolveMoment'

function purchaseAndGive(state: GameState, itemId: ItemId, targetNodeId: 'W001' | 'W101' | 'C001' | 'W300' | 'W301'): GameState {
  const purchased = gameReducer(state, { type: 'BUY_ITEM', itemId })
  expect(purchased.inventory[itemId]).toBeGreaterThan(state.inventory[itemId])
  return gameReducer(purchased, { type: 'GIVE_ITEM', targetNodeId, itemId })
}

function unlockRelationshipProduct(state: GameState, choiceId: MomentChoiceId): GameState {
  let next = gameReducer(state, {
    type: 'MOMENT_RESOLVED',
    resolution: resolveMoment('PK_LAST_30_SECONDS', choiceId).resolution,
  })
  next = gameReducer(next, { type: 'TASK_SIGNAL_RECEIVED', taskId: 'YANXIN_UNCUT_EVIDENCE', signal: 'acknowledge_pressure' })
  next = gameReducer(next, { type: 'TASK_SIGNAL_RECEIVED', taskId: 'YANXIN_UNCUT_EVIDENCE', signal: 'offer_evidence_plan' })
  const delivery = scheduleChatDelivery({
    id: `report-${choiceId}`,
    kind: 'proactive_report',
    message: { id: `message-${choiceId}`, role: 'assistant', text: '完整那段也发了。', createdAt: 0 },
    createdAt: 0,
    readyAt: 0,
    taskSignals: [],
    effect: 'unlock_e201',
  }, () => 0)
  next = gameReducer(next, { type: 'CHAT_DELIVERY_SCHEDULED', delivery })
  next = gameReducer(next, { type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: delivery.deliverAt })
  return gameReducer(next, { type: 'NODE_VIEWED', nodeId: 'E201' })
}

describe('complete wedding route', () => {
  it.each([
    ['support', 'C001', 'W300'],
    ['support', 'W300', 'C001'],
    ['hold_back', 'C001', 'W300'],
    ['hold_back', 'W300', 'C001'],
  ] as const)('reaches W400 after %s with recorder order %s → %s', (choiceId, firstRecorderTarget, secondRecorderTarget) => {
    let state = createInitialState()
    state = purchaseAndGive(state, 'ladder', 'W001')
    state = purchaseAndGive(state, 'technician', 'W101')
    state = unlockRelationshipProduct(state, choiceId)

    state = purchaseAndGive(state, 'recorder', firstRecorderTarget)
    state = purchaseAndGive(state, 'recorder', secondRecorderTarget)
    state = purchaseAndGive(state, 'projector', 'W301')
    state = gameReducer(state, { type: 'RESULT_FINISHED', nodeId: 'W400' })

    expect(state.completed).toBe(true)
    expect(state.resolvedNodeIds).toEqual(expect.arrayContaining(['W001', 'W101', 'C001', 'W300', 'W301', 'W400']))
    expect(state.resolvedNodeIds.filter(id => rankFeed(state).includes(id))).toEqual([])
    expect(state.ledger.filter(entry => entry.reason === 'item_purchase' || entry.reason === 'solvency_subsidy')
      .filter(entry => entry.id.includes('recorder'))).toHaveLength(2)
    expect(state.coins).toBeGreaterThanOrEqual(0)
  })
})
