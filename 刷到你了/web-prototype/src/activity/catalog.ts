import type { GameState, ActivityTaskId } from '../engine/state'

export interface ActivityTaskDefinition {
  id: ActivityTaskId
  title: string
  target: number
  reward: number
  unit: string
}

export const ACTIVITY_TASKS: ActivityTaskDefinition[] = [
  { id: 'WATCH_THREE', title: '完整看完不同视频', target: 3, reward: 10, unit: '条' },
  { id: 'LIKE_THREE', title: '点赞不同视频', target: 3, reward: 10, unit: '条' },
  { id: 'FAVORITE_TWO', title: '收藏不同视频', target: 2, reward: 10, unit: '条' },
]

export const ACTIVITY_TASK_BY_ID = Object.fromEntries(
  ACTIVITY_TASKS.map(task => [task.id, task]),
) as Record<ActivityTaskId, ActivityTaskDefinition>

export function getActivityProgress(state: GameState, taskId: ActivityTaskId): number {
  if (taskId === 'WATCH_THREE') return state.viewedNodeIds.length
  if (taskId === 'LIKE_THREE') return state.likedNodeIds.length
  return state.favoritedNodeIds.length
}
