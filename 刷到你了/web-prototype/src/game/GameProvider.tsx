import { createContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { gameReducer, type GameAction } from '../engine/reducer'
import { loadGame, saveGame, SAVE_KEY, type LoadResult } from '../engine/persistence'
import { createInitialState, type GameState } from '../engine/state'
import {
  YANXIN_FIRST_CONTACT_UNAVAILABLE_NOTICE,
  YANXIN_PROGRESS_UNAVAILABLE_NOTICE,
  YANXIN_SYSTEM_FALLBACK_CHECKPOINT,
} from '../messages/character'
import { isAllowedMemoryId, requestYanxinReply, type ChatRequest, type ChatTurnKind } from '../messages/aiClient'
import { createAiTurnDebugRecord } from '../messages/debug'
import { scheduleChatDelivery } from '../messages/delivery'
import type { ChatMessage, ChatDeliveryEffect } from '../messages/types'

export interface GameContextValue { state: GameState; dispatch: Dispatch<GameAction>; loadResult: LoadResult }
export const GameContext = createContext<GameContextValue | null>(null)

const EMPTY_AI_EFFECTS = { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] }

function proactiveRequest(state: GameState, turnKind: Exclude<ChatTurnKind, 'player_message'>, currentMessageId: string): ChatRequest {
  const recentMessages = state.messages
    .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => message.role !== 'system')
    .slice(-12)
  return {
    characterId: 'yanxin',
    turnKind,
    currentMessageId,
    userText: '',
    taskStage: state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage,
    momentChoice: state.relationshipEvidence.some(evidence => evidence.kind === 'support') ? 'support' : 'hold_back',
    recentMessages: recentMessages.map(message => ({ role: message.role, text: message.text })),
    allowedMemoryIds: state.sharedMemories.map(memory => memory.id).filter(isAllowedMemoryId),
    postEnding: state.ending !== null,
    personaSnapshot: {
      relationshipIdentity: state.yanxinPersona.relationship.identity,
      dimensions: { ...state.yanxinPersona.relationship.dimensions },
      shortTerm: { ...state.yanxinPersona.shortTerm },
    },
    memories: state.longTermMemories.filter(memory => memory.active).slice(-10).map(memory => ({
      id: memory.id,
      type: memory.type,
      sourceMessageId: memory.sourceMessageId,
      sourceText: memory.sourceText,
      interpretation: memory.interpretation,
    })),
    openLoops: state.openLoops.slice(-5).map(openLoop => ({
      id: openLoop.id,
      kind: openLoop.kind,
      summary: openLoop.summary,
      sourceMessageId: openLoop.sourceMessageId,
      status: openLoop.status,
    })),
  }
}

export function GameProvider({ children, storage }: { children: ReactNode; storage: Storage }) {
  const [initial] = useState(() => loadGame(storage))
  const [blocked, setBlocked] = useState(initial.kind === 'requires-reset')
  const [state, dispatch] = useReducer(gameReducer, initial.kind === 'requires-reset' ? createInitialState() : initial.state)
  const proactiveRequestsStarted = useRef(new Set<string>())
  useEffect(() => { if (!blocked) saveGame(storage, state) }, [blocked, state, storage])
  useEffect(() => { if (!blocked && state.feedNodeIds.length === 0) dispatch({ type: 'RECOVER_FEED' }) }, [blocked, state.feedNodeIds.length])
  useEffect(() => {
    if (blocked) return
    const flush = () => dispatch({ type: 'CHAT_DUE_DELIVERIES_FLUSHED', now: Date.now() })
    flush()
    if (!state.pendingChatDeliveries.length) return
    const timer = window.setInterval(flush, 250)
    return () => window.clearInterval(timer)
  }, [blocked, state.pendingChatDeliveries.length])
  useEffect(() => {
    if (blocked) return
    const task = state.characterTasks.YANXIN_UNCUT_EVIDENCE
    if (task.stage === 'locked') {
      proactiveRequestsStarted.current.clear()
      return
    }
    const hasAssistantContact = state.messages.some(message => message.role === 'assistant')
      || state.pendingChatDeliveries.some(delivery => delivery.message.role === 'assistant')
    const firstContactAttempted = hasAssistantContact
      || state.messages.some(message => message.id.startsWith('yanxin-first-contact'))
      || state.pendingChatDeliveries.some(delivery => delivery.message.id.startsWith('yanxin-first-contact'))
    const reportExists = state.messages.some(message => message.id.startsWith('yanxin-progress-report'))
      || state.pendingChatDeliveries.some(delivery => delivery.message.id.startsWith('yanxin-progress-report'))
      || task.unlockedResponseNodeIds.includes('E201')

    let config: {
      requestKey: string
      turnKind: Exclude<ChatTurnKind, 'player_message'>
      currentMessageId: string
      messageId: string
      failureNotice: string
      effect: ChatDeliveryEffect
    } | null = null
    if (task.stage === 'invited' && state.resolvedMomentIds.includes('PK_LAST_30_SECONDS') && !firstContactAttempted) {
      config = {
        requestKey: 'first_contact',
        turnKind: 'first_contact',
        currentMessageId: 'game-event:PK_LAST_30_SECONDS:first-contact',
        messageId: 'yanxin-first-contact',
        failureNotice: YANXIN_FIRST_CONTACT_UNAVAILABLE_NOTICE,
        effect: 'none',
      }
    } else if (
      task.stage === 'committed'
      && task.emittedEffects.includes('schedule_progress_report')
      && !reportExists
    ) {
      config = {
        requestKey: 'progress_report',
        turnKind: 'progress_report',
        currentMessageId: 'game-event:YANXIN_UNCUT_EVIDENCE:progress-report',
        messageId: 'yanxin-progress-report',
        failureNotice: YANXIN_PROGRESS_UNAVAILABLE_NOTICE,
        effect: 'unlock_e201',
      }
    }
    if (!config || proactiveRequestsStarted.current.has(config.requestKey)) return
    proactiveRequestsStarted.current.add(config.requestKey)
    const requestStartedAt = Date.now()
    const selected = config
    void requestYanxinReply(proactiveRequest(state, selected.turnKind, selected.currentMessageId)).then(result => {
      const readyAt = Date.now()
      if (!result.ok) dispatch({ type: 'CHAT_PROVIDER_FAILED' })
      dispatch({
        type: 'CHAT_AI_DEBUG_RECORDED',
        record: createAiTurnDebugRecord({
          state,
          turnKind: selected.turnKind,
          sourceId: selected.currentMessageId,
          createdAt: readyAt,
          result,
        }),
      })
      const messageId = result.ok ? selected.messageId : `${selected.messageId}-system-${readyAt}`
      dispatch({
        type: 'CHAT_DELIVERY_SCHEDULED',
        delivery: scheduleChatDelivery({
          id: `delivery-${messageId}`,
          kind: result.ok ? 'proactive_report' : 'system_notice',
          message: {
            id: messageId,
            role: result.ok ? 'assistant' : 'system',
            text: result.ok ? result.data.replyText : selected.failureNotice,
            createdAt: readyAt,
          },
          createdAt: requestStartedAt,
          readyAt,
          aiEffects: EMPTY_AI_EFFECTS,
          effect: selected.effect,
          source: result.ok ? undefined : 'system_fallback',
        }),
      })
    })
  }, [blocked, state])
  useEffect(() => {
    if (blocked || state.yanxinProviderFailureCount < 2) return
    const task = state.characterTasks.YANXIN_UNCUT_EVIDENCE
    if (task.stage !== 'invited' && task.stage !== 'understood') return
    const checkpointStage = task.stage === 'invited' ? 'understood' : 'committed'
    const checkpointId = `yanxin-system-fallback-checkpoint-${checkpointStage}`
    const checkpointExists = state.messages.some(message => message.id === checkpointId)
      || state.pendingChatDeliveries.some(delivery => delivery.message.id === checkpointId)
    if (checkpointExists) return
    const now = Date.now()
    dispatch({
      type: 'CHAT_DELIVERY_SCHEDULED',
      delivery: scheduleChatDelivery({
        id: `delivery-${checkpointId}`,
        kind: 'system_fallback_checkpoint',
        message: { id: checkpointId, role: 'system', text: YANXIN_SYSTEM_FALLBACK_CHECKPOINT, createdAt: now },
        createdAt: now,
        readyAt: now,
        aiEffects: { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] },
        effect: 'none',
        source: 'system_fallback',
      }),
    })
    dispatch({ type: 'CHAT_SYSTEM_FALLBACK_CHECKPOINT_SCHEDULED' })
  }, [blocked, state.yanxinProviderFailureCount, state.characterTasks.YANXIN_UNCUT_EVIDENCE, state.messages, state.pendingChatDeliveries])
  const value = useMemo(() => ({ state, dispatch, loadResult: initial }), [state, initial])
  if (blocked) return <main className="save-recovery"><span>存档版本不兼容</span><h1>存档需要更新</h1><p>旧存档不会覆盖当前内容。重新开始后即可进入试玩。</p><button onClick={() => { storage.removeItem(SAVE_KEY); dispatch({ type: 'RESET_GAME' }); setBlocked(false) }}>安全重新开始</button></main>
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
