import type { ChatDeliveryInput, PendingChatDelivery } from './types'

function sampledDelay(min: number, max: number, random: () => number): number {
  const sample = Math.min(1, Math.max(0, random()))
  return Math.round(min + (max - min) * sample)
}

export function scheduleChatDelivery(
  input: ChatDeliveryInput,
  random: () => number = Math.random,
): PendingChatDelivery {
  const delay = input.kind === 'reply'
    ? sampledDelay(800, 2_000, random)
    : sampledDelay(1_500, 4_000, random)
  const target = input.createdAt + delay
  return {
    id: input.id,
    kind: input.kind,
    message: input.message,
    deliverAt: input.kind === 'reply' ? Math.max(input.readyAt, target) : target,
    aiEffects: {
      taskEvidence: [...input.aiEffects.taskEvidence],
      relationshipEvidence: [...input.aiEffects.relationshipEvidence],
      memoryCandidates: [...input.aiEffects.memoryCandidates],
      openLoopUpdates: [...input.aiEffects.openLoopUpdates],
    },
    effect: input.effect,
    source: input.source,
  }
}

export function collectDueChatDeliveries(
  deliveries: PendingChatDelivery[],
  now: number,
): { due: PendingChatDelivery[]; pending: PendingChatDelivery[] } {
  const due: PendingChatDelivery[] = []
  const pending: PendingChatDelivery[] = []
  for (const delivery of deliveries) {
    if (delivery.deliverAt <= now) due.push(delivery)
    else pending.push(delivery)
  }
  return { due, pending }
}
