import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { useGame } from '../game/useGame'
import { scheduleChatDelivery } from './delivery'
import { getYanxinFallbackReply } from './fallbackReplies'
import { requestYanxinReply } from './aiClient'
import type { PendingChatDelivery } from './types'

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
    const fallback = getYanxinFallbackReply(taskStage)
    const userMessageId = `user-${now}-${state.messages.length}`
    const messageId = `yanxin-reply-${now}-${state.messages.length}`
    dispatch({ type: 'CHAT_USER_SENT', message: { id: userMessageId, role: 'user', text: trimmed, createdAt: now } })
    const recoveryDelivery: PendingChatDelivery = {
      id: `delivery-${messageId}`,
      kind: 'reply',
      message: { id: messageId, role: 'assistant', text: fallback.text, createdAt: now },
      deliverAt: now + 8_000,
      taskSignals: fallback.taskSignals,
      effect: 'none',
    }
    dispatch({ type: 'CHAT_DELIVERY_SCHEDULED', delivery: recoveryDelivery })
    setText('')
    setRequesting(true)
    const result = await requestYanxinReply({
      characterId: 'yanxin',
      currentMessageId: userMessageId,
      userText: trimmed,
      taskStage,
      momentChoice: state.relationshipEvidence.some(evidence => evidence.kind === 'support') ? 'support' : 'hold_back',
      recentMessages: state.messages.slice(-12).map(message => ({ role: message.role, text: message.text })),
      allowedMemoryIds: state.sharedMemories.map(memory => memory.id),
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
    })
    const replyText = result.ok ? result.data.replyText : fallback.text
    const taskSignals = result.ok
      ? result.data.taskEvidence.map(evidence => evidence.kind === 'recognized_malicious_editing'
          ? 'acknowledge_pressure' as const
          : 'offer_evidence_plan' as const)
      : fallback.taskSignals
    const readyAt = Date.now()
    const message = { id: messageId, role: 'assistant' as const, text: replyText, createdAt: readyAt }
    dispatch({
      type: 'CHAT_DELIVERY_REPLACED',
      delivery: scheduleChatDelivery({
        id: `delivery-${message.id}`,
        kind: 'reply',
        message,
        createdAt: now,
        readyAt,
        taskSignals,
        effect: 'none',
      }),
    })
    setRequesting(false)
  }

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
    </div>
    {hasContact && <form className="message-composer" onSubmit={send}>
      <input value={text} maxLength={300} onChange={event => setText(event.target.value)} placeholder="给炎鑫发消息" aria-label="给炎鑫发消息" />
      <button aria-label="发送消息" disabled={!text.trim() || requesting || replyPending}><Send /></button>
    </form>}
  </section>
}
