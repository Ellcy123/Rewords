import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { useGame } from '../game/useGame'
import { scheduleChatDelivery } from './delivery'
import { YANXIN_REPLY_UNAVAILABLE_NOTICE } from './character'
import { isAllowedMemoryId, requestYanxinReply } from './aiClient'
import { createAiTurnDebugRecord } from './debug'
import type { ChatMessage, PendingChatDelivery } from './types'

export function MessageSheet() {
  const { state, dispatch } = useGame()
  const [text, setText] = useState('')
  const [requesting, setRequesting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const taskStage = state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage
  const hasContact = state.messages.length > 0
  const replyPending = state.pendingChatDeliveries.some(delivery => delivery.kind === 'reply')

  useEffect(() => { dispatch({ type: 'CHAT_MESSAGES_READ' }) }, [dispatch, state.messages.length])
  useEffect(() => {
    const list = listRef.current
    if (list && typeof list.scrollTo === 'function') {
      list.scrollTo({ top: list.scrollHeight })
    }
  }, [state.messages.length])

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || requesting || replyPending) return
    const now = Date.now()
    const userMessageId = `user-${now}-${state.messages.length}`
    const messageId = `yanxin-reply-${now}-${state.messages.length}`
    dispatch({ type: 'CHAT_USER_SENT', message: { id: userMessageId, role: 'user', text: trimmed, createdAt: now } })
    const recoveryDelivery: PendingChatDelivery = {
      id: `delivery-${messageId}`,
      kind: 'reply',
      message: { id: messageId, role: 'system', text: YANXIN_REPLY_UNAVAILABLE_NOTICE, createdAt: now },
      deliverAt: now + 8_000,
      aiEffects: { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] },
      effect: 'none',
      sourceMessageId: userMessageId,
    }
    dispatch({ type: 'CHAT_DELIVERY_SCHEDULED', delivery: recoveryDelivery })
    setText('')
    setRequesting(true)
    const recentMessages = state.messages
      .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => message.role !== 'system')
      .slice(-12)
    const allowedMemoryIds = [
      ...state.sharedMemories.map(memory => memory.id).filter(isAllowedMemoryId),
      ...(state.viewedNodeIds.includes('E103') ? ['yanxin_circulating_clip_viewed' as const] : []),
    ]
    const memories = state.longTermMemories.filter(memory => memory.active).slice(-10)
    const openLoops = state.openLoops.slice(-5)
    const result = await requestYanxinReply({
      characterId: 'yanxin',
      turnKind: 'player_message',
      currentMessageId: userMessageId,
      userText: trimmed,
      taskStage,
      momentChoice: state.relationshipEvidence.some(evidence => evidence.kind === 'support') ? 'support' : 'hold_back',
      recentMessages: recentMessages.map(message => ({ role: message.role, text: message.text })),
      allowedMemoryIds,
      postEnding: state.ending !== null,
      personaSnapshot: {
        relationshipIdentity: state.yanxinPersona.relationship.identity,
        dimensions: { ...state.yanxinPersona.relationship.dimensions },
        shortTerm: { ...state.yanxinPersona.shortTerm },
      },
      memories: memories.map(memory => ({
        id: memory.id,
        type: memory.type,
        sourceMessageId: memory.sourceMessageId,
        sourceText: memory.sourceText,
        interpretation: memory.interpretation,
      })),
      openLoops: openLoops.map(openLoop => ({
        id: openLoop.id,
        kind: openLoop.kind,
        summary: openLoop.summary,
        sourceMessageId: openLoop.sourceMessageId,
        status: openLoop.status,
      })),
    })
    const replyText = result.ok ? result.data.replyText : YANXIN_REPLY_UNAVAILABLE_NOTICE
    const aiEffects = result.ok
      ? {
          taskEvidence: result.data.taskEvidence,
          relationshipEvidence: result.data.relationshipEvidence,
          memoryCandidates: result.data.memoryCandidates,
          openLoopUpdates: result.data.openLoopUpdates,
        }
      : { taskEvidence: [], relationshipEvidence: [], memoryCandidates: [], openLoopUpdates: [] }
    dispatch({ type: result.ok ? 'CHAT_PROVIDER_SUCCEEDED' : 'CHAT_PROVIDER_FAILED' })
    const readyAt = Date.now()
    const debugRecord = createAiTurnDebugRecord({
      state,
      turnKind: 'player_message',
      sourceId: userMessageId,
      createdAt: readyAt,
      result,
    })
    dispatch({ type: 'CHAT_AI_DEBUG_RECORDED', record: debugRecord })
    const message: ChatMessage = {
      id: messageId,
      role: result.ok ? 'assistant' : 'system',
      text: replyText,
      createdAt: readyAt,
    }
    dispatch({
      type: 'CHAT_DELIVERY_REPLACED',
      delivery: scheduleChatDelivery({
        id: `delivery-${message.id}`,
        kind: 'reply',
        message,
        createdAt: now,
        readyAt,
        aiEffects,
        effect: 'none',
        sourceMessageId: userMessageId,
      }),
    })
    setRequesting(false)
  }

  const fallbackAvailable = state.yanxinProviderFailureCount >= 2
    && state.resolvedMomentIds.includes('PK_LAST_30_SECONDS')
    && taskStage !== 'committed'
    && taskStage !== 'published'

  return <section className="message-screen" aria-label="与炎鑫的私信">
    <header className="message-header">
      <span className="yanxin-avatar">炎</span>
      <div><h2>炎鑫</h2><p>你们的消息</p></div>
    </header>
    <div className="message-list" ref={listRef}>
      {state.messages.length === 0 && <div className="message-empty">
        {taskStage === 'locked' ? '等你们真正认识后，私信会出现在这里。' : '炎鑫还没发来消息。'}
      </div>}
      {state.messages.map(message => <article key={message.id} className={`message-bubble message-${message.role}`}>
        <p>{message.text}</p>
      </article>)}
      {fallbackAvailable && <aside className="message-recovery" aria-label="离线保障">
        <p>AI 对话连续失败，你可以手动使用离线保障继续试玩。</p>
        <button type="button" onClick={() => dispatch({ type: 'CHAT_SYSTEM_FALLBACK_CONFIRMED' })}>
          {taskStage === 'locked' ? '使用离线保障，解锁争议视频' : '使用离线保障，继续取证'}
        </button>
      </aside>}
    </div>
    {hasContact && <form className="message-composer" onSubmit={send}>
      <input value={text} maxLength={300} onChange={event => setText(event.target.value)} placeholder="给炎鑫发消息" aria-label="给炎鑫发消息" />
      <button aria-label="发送消息" disabled={!text.trim() || requesting || replyPending}><Send /></button>
    </form>}
  </section>
}
