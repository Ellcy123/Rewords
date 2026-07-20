import type { MomentChoiceId } from './types'
import { Sheet } from '../shell/Sheet'

interface Props {
  coins: number
  onClose: () => void
  onChoose: (choiceId: MomentChoiceId) => void
}

export function MomentSheet({ coins, onClose, onChoose }: Props) {
  return <Sheet title="PK 最后 30 秒" onClose={onClose}>
    <div className="moment-summary">
      <span>30s</span>
      <div><b>炎鑫还差最后一点</b><p>你怎么回应，会成为你们之后聊天里的共同经历。</p></div>
    </div>
    <div className="moment-actions">
      <button aria-label="上票帮他守住最后 30 秒（30）" className="moment-support" disabled={coins < 30} onClick={() => onChoose('support')}>
        <b>上票帮他守住最后 30 秒（30）</b>
        <span>{coins < 30 ? '当前余额不足' : '在关键时刻站出来'}</span>
      </button>
      <button aria-label="先不跟着场面上头" className="moment-hold" onClick={() => onChoose('hold_back')}>
        <b>先不跟着场面上头</b>
        <span>留下来看看他会怎么处理</span>
      </button>
    </div>
  </Sheet>
}
