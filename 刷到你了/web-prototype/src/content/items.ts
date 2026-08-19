import type { ItemDefinition } from './types'

export const ITEMS: ItemDefinition[] = [
  { id: 'ladder', name: '刺客同款多功能梯子', shortName: '梯子', price: 20, sourceNodeIds: ['C001'], mainlineUseNodeIds: ['W001'], requiredForMainline: true, description: '三丈宫墙，一梯到顶；到了知识区也许还能翻另一种墙。', icon: '🪜', repeatable: true },
  { id: 'technician', name: '同城空调师傅上门一次', shortName: '空调师傅', price: 25, sourceNodeIds: ['K001'], mainlineUseNodeIds: ['W101'], requiredForMainline: true, description: '空调、吊顶、灯架，师傅顺手都能看。', icon: '🧰', repeatable: true },
  { id: 'recorder', name: '带摄像头的录音笔', shortName: '录音笔', price: 30, sourceNodeIds: ['E201'], mainlineUseNodeIds: ['W300'], requiredForMainline: true, description: '能录音，也顺便录点画面；厂家坚持认为这不算摄像笔。', icon: '🖊️', repeatable: true },
  { id: 'projector', name: '婚庆大屏投影服务', shortName: '投影服务', price: 35, sourceNodeIds: ['C101'], mainlineUseNodeIds: ['W301'], requiredForMainline: true, description: '婚庆大屏、投影、现场扩声，一套全包，古今宴席均可接单。', icon: '📽️', repeatable: true },
]

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map(item => [item.id, item])) as Record<ItemDefinition['id'], ItemDefinition>
