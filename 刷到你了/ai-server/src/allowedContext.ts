import type { AllowedMemoryId, ChatRequest } from './contracts.js'

interface MemoryFact {
  id: AllowedMemoryId
  fact: string
}

const MEMORY_FACTS: Record<AllowedMemoryId, MemoryFact> = {
  yanxin_pk_choice_support: {
    id: 'yanxin_pk_choice_support',
    fact: '玩家在 PK 最后 30 秒选择上票支持炎鑫。',
  },
  yanxin_pk_choice_hold_back: {
    id: 'yanxin_pk_choice_hold_back',
    fact: '玩家在 PK 最后 30 秒选择不跟着场面上头。',
  },
  yanxin_evidence_task_completed: {
    id: 'yanxin_evidence_task_completed',
    fact: '炎鑫已经完成找回未剪辑完整证据并公开回应的任务。',
  },
  yanxin_evidence_method_helped_bride: {
    id: 'yanxin_evidence_method_helped_bride',
    fact: '带摄像头的录音笔取得的完整证据方法帮助了新娘。',
  },
  bride_wedding_result_completed: {
    id: 'bride_wedding_result_completed',
    fact: '新娘的婚礼主线已经完成。',
  },
}

const STAGE_GUIDANCE = {
  locked: '尚未邀请玩家参与取证，不得假定已有共同经历。',
  invited: '可以回应玩家在 PK 后的选择，并自然说明想找回完整证据。',
  understood: '玩家已经理解取证方向，可以讨论核对完整素材的下一步。',
  committed: '取证计划已经确定，保持克制地说明正在核对完整素材。',
  published: '完整证据已经公开回应，后续聊天不得重新推进主线。',
} as const

export interface AllowedContext {
  character: { id: 'yanxin'; name: '炎鑫' }
  task: {
    id: 'YANXIN_UNCUT_EVIDENCE'
    objective: '找回未剪辑的完整证据并公开回应'
    stage: ChatRequest['taskStage']
    stageGuidance: string
  }
  momentChoice: { id: 'support' | 'hold_back'; fact: string }
  relationshipProduct: { id: 'recorder'; name: '带摄像头的录音笔' }
  memories: MemoryFact[]
  postEnding: boolean
  userText: string
  recentMessages: ChatRequest['recentMessages']
}

export function buildAllowedContext(request: ChatRequest): AllowedContext {
  return {
    character: { id: 'yanxin', name: '炎鑫' },
    task: {
      id: 'YANXIN_UNCUT_EVIDENCE',
      objective: '找回未剪辑的完整证据并公开回应',
      stage: request.taskStage,
      stageGuidance: STAGE_GUIDANCE[request.taskStage],
    },
    momentChoice: request.momentChoice === 'support'
      ? { id: 'support', fact: '玩家在 PK 最后 30 秒上票支持了你。' }
      : { id: 'hold_back', fact: '玩家在 PK 最后 30 秒选择不跟着场面上头。' },
    relationshipProduct: { id: 'recorder', name: '带摄像头的录音笔' },
    memories: [...new Set(request.allowedMemoryIds)].map(id => MEMORY_FACTS[id]),
    postEnding: request.postEnding,
    userText: request.userText,
    recentMessages: request.recentMessages,
  }
}
