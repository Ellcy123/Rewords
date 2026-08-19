import type { MomentDefinition, MomentId } from './types'

export const MOMENTS: MomentDefinition[] = [
  {
    id: 'PK_LAST_30_SECONDS',
    entryNodeId: 'E001',
    choices: {
      support: {
        id: 'support',
        label: '上票，帮炎鑫守住这一局',
        resultNodeId: 'E101',
        coinCost: 30,
        evidenceTags: ['support', 'boundary_pressure'],
        invitedTaskId: 'YANXIN_UNCUT_EVIDENCE',
      },
      hold_back: {
        id: 'hold_back',
        label: '不上票，先看看他怎么处理',
        resultNodeId: 'E102',
        coinCost: 0,
        evidenceTags: ['respect'],
        invitedTaskId: 'YANXIN_UNCUT_EVIDENCE',
      },
    },
  },
]

export const MOMENT_BY_ID = Object.fromEntries(
  MOMENTS.map(moment => [moment.id, moment]),
) as Record<MomentId, MomentDefinition>
