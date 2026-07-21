import type { MomentChoiceId } from '../moments/types'
import type { RelationshipIdentity } from '../relationship/personaState'
import type { CharacterTaskStage } from '../relationship/taskEngine'
import type { ChatAiEffects } from './types'

export interface FallbackReply {
  text: string
  aiEffects: ChatAiEffects
}

export type FallbackTopic = 'care' | 'spending' | 'evidence' | 'promise' | 'other'
export type FallbackPurpose =
  | 'receive_care'
  | 'respect_hold_back'
  | 'thank_support'
  | 'set_spending_boundary'
  | 'acknowledge_task'
  | 'continue_open_loop'
  | 'ordinary_chat'

export interface YanxinFallbackContext {
  relationshipIdentity: RelationshipIdentity
  momentChoice: MomentChoiceId
  boundaryPressure: number
  latestMessage: { id: string; text: string }
  taskStage: CharacterTaskStage
}

const EMPTY_AI_EFFECTS: ChatAiEffects = {
  taskEvidence: [],
  relationshipEvidence: [],
  memoryCandidates: [],
  openLoopUpdates: [],
}

const IDENTITY_LEAD: Record<RelationshipIdentity, string> = {
  new_viewer: '刚认识，你先别替我操心太多。',
  familiar_fan: '你一直在，我知道。',
  important_supporter: '你已经帮过我一次了，这次我会记得分寸。',
  private_relationship: '跟你说这些，我不用绕弯子。',
}

const PURPOSE_LINES: Record<FallbackPurpose, string[]> = {
  receive_care: [
    '我没事，先把水喝了再继续看。',
    '谢谢你惦记，我缓一会儿就好。',
    '别把我的事全揽过去，我会照顾好自己。',
  ],
  respect_hold_back: [
    '刚才你没有跟着起哄，这样就很好。',
    '你肯停在自己的边界里，我反而放心。',
    '不替我硬撑也没关系，我明白你的意思。',
  ],
  thank_support: [
    '刚才那一下我收到了，但别再为我透支。',
    '谢谢你站出来，后面的事让我自己来。',
    '你的心意够了，别把它变成压力。',
  ],
  set_spending_boundary: [
    '钱先留在你手里，别拿来证明什么。',
    '别再刷了，这件事不该让你补。',
    '我领情，但花到这里就停。',
  ],
  acknowledge_task: [
    '那段剪辑不对劲，我会把前后都核清。',
    '完整证据要看，不急着替谁下结论。',
    '原片和时间点我会重新对一遍。',
  ],
  continue_open_loop: [
    '你说过的话我记着，等我核完再回你。',
    '这件事先留着，我不会当没听见。',
    '等有能落地的结果，我再把话说全。',
  ],
  ordinary_chat: [
    '嗯，今天先这样，别把话说得太满。',
    '我在，等手头这点事过完再聊。',
    '你先说，我听着。',
  ],
}

function emptyAiEffects(): ChatAiEffects {
  return {
    taskEvidence: [...EMPTY_AI_EFFECTS.taskEvidence],
    relationshipEvidence: [...EMPTY_AI_EFFECTS.relationshipEvidence],
    memoryCandidates: [...EMPTY_AI_EFFECTS.memoryCandidates],
    openLoopUpdates: [...EMPTY_AI_EFFECTS.openLoopUpdates],
  }
}

function classifyTopic(text: string): FallbackTopic {
  if (/(还好吗|没事吧|休息|照顾|累了|难受|care|rest)/i.test(text)) return 'care'
  if (/(刷|钱|打赏|花钱|上票|礼物|spend|money)/i.test(text)) return 'spending'
  if (/(恶意|剪辑|完整|证据|原片|时间戳|evidence)/i.test(text)) return 'evidence'
  if (/(答应|等你|说好了|记得|promise)/i.test(text)) return 'promise'
  return 'other'
}

function selectPurpose(context: YanxinFallbackContext, topic: FallbackTopic): FallbackPurpose {
  if (context.boundaryPressure >= 2 || topic === 'spending') return 'set_spending_boundary'
  if (topic === 'care') return 'receive_care'
  if (topic === 'evidence') return 'acknowledge_task'
  if (topic === 'promise') return 'continue_open_loop'
  if (context.taskStage === 'committed' || context.taskStage === 'published') return 'ordinary_chat'
  if (context.momentChoice === 'support') return 'thank_support'
  if (context.momentChoice === 'hold_back') return 'respect_hold_back'
  return 'ordinary_chat'
}

function stableHash(value: string): number {
  let hash = 0
  for (const char of value) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return hash
}

export function getYanxinFallbackReply(context: YanxinFallbackContext, variationSeed: number): FallbackReply {
  const purpose = selectPurpose(context, classifyTopic(context.latestMessage.text))
  const lines = PURPOSE_LINES[purpose]
  const index = (stableHash(context.latestMessage.id) + Math.abs(Math.trunc(variationSeed))) % lines.length
  return {
    text: `${IDENTITY_LEAD[context.relationshipIdentity]}${lines[index]}`,
    aiEffects: emptyAiEffects(),
  }
}
