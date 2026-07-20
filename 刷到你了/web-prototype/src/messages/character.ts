import type { ChatMessage } from './types'
import type { MomentChoiceId } from '../moments/types'

export const YANXIN_PROGRESS_REPORT = '我试完了，完整那段也发了。你之前说得对，光留最后十秒没用。'

const FIRST_CONTACT: Record<MomentChoiceId, string> = {
  support: '刚才你在最后那一下站出来，我看见了。谢谢，但下次别为了我勉强花。还有件事，有人只截了最后十秒，我想把完整那段找回来。',
  hold_back: '刚才你没跟着场面上头，我也看见了。别担心，我不是来查账的。倒是有人只截了最后十秒，我想把完整那段找回来。',
}

export function createYanxinFirstContact(choiceId: MomentChoiceId, createdAt: number): ChatMessage {
  return {
    id: `yanxin-first-${choiceId}`,
    role: 'assistant',
    text: FIRST_CONTACT[choiceId],
    createdAt,
  }
}
