import { describe, expect, it } from 'vitest'
import { collectDueChatDeliveries, scheduleChatDelivery } from '../messages/delivery'

const message = { id: 'm1', role: 'assistant' as const, text: '我晚点把完整那段发你。', createdAt: 1_000 }

describe('soft-time chat delivery', () => {
  it('samples reply delay from request start but never precedes readyAt', () => {
    const earliest = scheduleChatDelivery({
      id: 'd1', kind: 'reply', message, createdAt: 1_000, readyAt: 1_200, taskSignals: [], effect: 'none',
    }, () => 0)
    const latest = scheduleChatDelivery({
      id: 'd2', kind: 'reply', message, createdAt: 1_000, readyAt: 3_500, taskSignals: [], effect: 'none',
    }, () => 1)

    expect(earliest.deliverAt).toBe(1_800)
    expect(latest.deliverAt).toBe(3_500)
  })

  it('samples proactive reports between 1500 and 4000 ms after creation', () => {
    expect(scheduleChatDelivery({
      id: 'd1', kind: 'proactive_report', message, createdAt: 1_000, readyAt: 1_000, taskSignals: [], effect: 'unlock_e201',
    }, () => 0).deliverAt).toBe(2_500)
    expect(scheduleChatDelivery({
      id: 'd2', kind: 'proactive_report', message, createdAt: 1_000, readyAt: 1_000, taskSignals: [], effect: 'unlock_e201',
    }, () => 1).deliverAt).toBe(5_000)
  })

  it('flushes overdue deliveries immediately and keeps future ones pending', () => {
    const due = scheduleChatDelivery({
      id: 'due', kind: 'reply', message, createdAt: 0, readyAt: 0, taskSignals: [], effect: 'none',
    }, () => 0)
    const future = { ...due, id: 'future', deliverAt: 10_000 }
    expect(collectDueChatDeliveries([future, due], 5_000)).toEqual({ due: [due], pending: [future] })
  })
})
