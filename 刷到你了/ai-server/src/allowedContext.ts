import type { AllowedMemoryId, ChatRequest } from './contracts.js'
import { YANXIN_PROFILE, type YanxinProfile } from './persona/yanxinProfile.js'

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

type PersonaSnapshot = ChatRequest['personaSnapshot']
type RelationshipIdentity = PersonaSnapshot['relationshipIdentity']
type RelationshipDimension = keyof PersonaSnapshot['dimensions']

const RELATIONSHIP_GUIDANCE = {
  new_viewer: {
    label: '新认识的观众',
    guidance: '保持礼貌和必要距离，不假定熟悉、付出或共同经历。',
  },
  familiar_fan: {
    label: '熟悉的粉丝',
    guidance: '可以承接已验证的聊天习惯，但不把熟悉等同私交或承诺。',
  },
  important_supporter: {
    label: '重要支持者',
    guidance: '承认持续支持与具体关心，但不以金钱衡量亲疏，也不提供交易式特殊待遇。',
  },
  private_relationship: {
    label: '私下关系较近的人',
    guidance: '可以更直接坦诚，但仍不承诺独占、永久关系、现实见面或婚姻。',
  },
} as const satisfies Record<RelationshipIdentity, { label: string; guidance: string }>

const DIMENSION_MEANINGS = {
  closeness: '交流舒适和熟悉程度，不等于现实关系承诺',
  trust: '对玩家可靠性的判断，不允许因此补造事实',
  respect: '对玩家行动与边界感的认可',
  suspicion: '尚未消除的疑虑与戒备',
  boundaryPressure: '感受到的越界压力，越高越需要清楚设限',
} as const satisfies Record<RelationshipDimension, string>

const EMOTION_GUIDANCE = {
  guarded: { label: '戒备', guidance: '语气克制，先确认含义和事实。' },
  steady: { label: '平稳', guidance: '自然回应，不刻意放大情绪。' },
  warm: { label: '温和', guidance: '可以表达具体感谢或关心，但不升级关系承诺。' },
  pressured: { label: '受压', guidance: '减少讨好，必要时清楚说明边界。' },
} as const satisfies Record<PersonaSnapshot['shortTerm']['emotion'], { label: string; guidance: string }>

const ACTIVITY_GUIDANCE = {
  post_pk: { label: 'PK 后整理状态', guidance: '可以承接刚结束的公开场面，不假定后续任务已发生。' },
  reviewing_footage: { label: '核对素材', guidance: '只说明正在核对，不提前宣告证据结论。' },
  testing_device: { label: '测试设备', guidance: '只谈已给定的录音笔用途，不发生交易或赠送。' },
  following_up: { label: '后续跟进', guidance: '承接已验证事项，不重新开启已经完成的主线。' },
} as const satisfies Record<PersonaSnapshot['shortTerm']['currentActivity'], { label: string; guidance: string }>

function dimensionBand(value: number): '低' | '中' | '高' {
  if (value <= -2) return '低'
  if (value >= 2) return '高'
  return '中'
}

function buildDimension(value: number, dimension: RelationshipDimension) {
  return {
    value,
    interpretation: `${dimensionBand(value)}；${DIMENSION_MEANINGS[dimension]}`,
  }
}

export interface AllowedContext {
  character: { id: 'yanxin'; name: '炎鑫' }
  profile: YanxinProfile
  scene: {
    channel: 'private_message'
    publicFace: YanxinProfile['publicFace']
    privateFace: YanxinProfile['privateFace']
  }
  task: {
    id: 'YANXIN_UNCUT_EVIDENCE'
    objective: '找回未剪辑的完整证据并公开回应'
    stage: ChatRequest['taskStage']
    stageGuidance: string
  }
  momentChoice: { id: 'support' | 'hold_back'; fact: string }
  relationshipProduct: { id: 'recorder'; name: '带摄像头的录音笔' }
  memories: MemoryFact[]
  relationship: {
    identity: RelationshipIdentity
    label: string
    guidance: string
    dimensions: Record<RelationshipDimension, { value: number; interpretation: string }>
  }
  shortTerm: {
    emotion: { id: PersonaSnapshot['shortTerm']['emotion']; label: string; guidance: string }
    currentActivity: { id: PersonaSnapshot['shortTerm']['currentActivity']; label: string; guidance: string }
  }
  openLoops: ChatRequest['openLoops']
  verifiedMemories: ChatRequest['memories']
  postEnding: boolean
  currentMessage: { id: string; text: string }
  userText: string
  recentMessages: ChatRequest['recentMessages']
}

export function buildAllowedContext(request: ChatRequest): AllowedContext {
  return {
    character: { id: 'yanxin', name: '炎鑫' },
    profile: YANXIN_PROFILE,
    scene: {
      channel: 'private_message',
      publicFace: YANXIN_PROFILE.publicFace,
      privateFace: YANXIN_PROFILE.privateFace,
    },
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
    relationship: {
      identity: request.personaSnapshot.relationshipIdentity,
      ...RELATIONSHIP_GUIDANCE[request.personaSnapshot.relationshipIdentity],
      dimensions: {
        closeness: buildDimension(request.personaSnapshot.dimensions.closeness, 'closeness'),
        trust: buildDimension(request.personaSnapshot.dimensions.trust, 'trust'),
        respect: buildDimension(request.personaSnapshot.dimensions.respect, 'respect'),
        suspicion: buildDimension(request.personaSnapshot.dimensions.suspicion, 'suspicion'),
        boundaryPressure: buildDimension(request.personaSnapshot.dimensions.boundaryPressure, 'boundaryPressure'),
      },
    },
    shortTerm: {
      emotion: {
        id: request.personaSnapshot.shortTerm.emotion,
        ...EMOTION_GUIDANCE[request.personaSnapshot.shortTerm.emotion],
      },
      currentActivity: {
        id: request.personaSnapshot.shortTerm.currentActivity,
        ...ACTIVITY_GUIDANCE[request.personaSnapshot.shortTerm.currentActivity],
      },
    },
    openLoops: request.openLoops,
    verifiedMemories: request.memories,
    postEnding: request.postEnding,
    currentMessage: { id: request.currentMessageId, text: request.userText },
    userText: request.userText,
    recentMessages: request.recentMessages,
  }
}
