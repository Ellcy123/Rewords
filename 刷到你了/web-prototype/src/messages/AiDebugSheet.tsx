import { useState } from 'react'
import type { AiTurnDebugRecord } from './types'

function list(values: string[]): string {
  return values.length ? values.join('、') : '无'
}

export function AiDebugSheet({ records }: { records: AiTurnDebugRecord[] }) {
  const [open, setOpen] = useState(false)
  return <aside className="ai-debug-sheet" aria-label="AI 调试溯源">
    <button type="button" onClick={() => setOpen(value => !value)}>
      {open ? '收起 AI 调试记录' : '查看 AI 调试记录'}
    </button>
    {open && <div className="ai-debug-sheet__body">
      <h2>AI 调试溯源</h2>
      {records.length === 0 && <p>尚无 AI 回合记录。</p>}
      {[...records].reverse().map(record => <article key={record.id}>
        <h3>{record.id}</h3>
        <dl>
          <dt>回合类型</dt><dd>{record.turnKind}</dd>
          <dt>关系身份</dt><dd>{record.relationshipIdentity}</dd>
          <dt>五维状态</dt><dd>{Object.entries(record.dimensions).map(([key, value]) => `${key}:${value}`).join(' · ')}</dd>
          <dt>任务阶段</dt><dd>{record.taskStage}</dd>
          <dt>记忆 ID</dt><dd>{list(record.memoryIdsRead)}</dd>
          <dt>未完事项 ID</dt><dd>{list(record.openLoopIdsRead)}</dd>
          <dt>人物意图</dt><dd>{list(record.characterIntents)}</dd>
          <dt>任务证据</dt><dd>{list(record.acceptedTaskEvidence.map(item => `${item.kind}@${item.sourceMessageId}`))}</dd>
          <dt>关系证据</dt><dd>{list(record.acceptedRelationshipEvidence.map(item => `${item.kind}@${item.sourceMessageId}`))}</dd>
          <dt>记忆候选</dt><dd>{list(record.acceptedMemoryCandidates.map(item => `${item.type}@${item.sourceMessageId}`))}</dd>
          <dt>未完事项候选</dt><dd>{list(record.acceptedOpenLoopUpdates.map(item => `${item.kind}:${item.status}@${item.sourceMessageId}`))}</dd>
          <dt>拒绝原因</dt><dd>{list(record.rejectedCandidates.map(item => `${item.category}:${item.reason}@${item.sourceId}`))}</dd>
          <dt>降级</dt><dd>{record.fallbackUsed ? '是' : '否'}</dd>
        </dl>
      </article>)}
    </div>}
  </aside>
}
