import { Check, RotateCcw } from 'lucide-react'

export function CompletionOverlay({ onContinue, onReset }: { onContinue: () => void; onReset: () => void }) {
  return <section className="completion-overlay"><div className="completion-orbit"><Check /></div><p>第一关 · 婚礼逆天改命</p><h2>婚礼顺利结束</h2><strong>让婚礼顺利结束——已完成</strong><span>改命已经有了结果，你与人物建立的关系仍然会继续。</span><button className="primary-button" onClick={onContinue}>继续看看他们的消息</button><button className="text-button" onClick={onReset}><RotateCcw />重新开始</button></section>
}
