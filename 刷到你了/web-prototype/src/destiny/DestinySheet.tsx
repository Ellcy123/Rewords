import { selectDestinyNodes } from '../engine/selectors'
import { useGame } from '../game/useGame'
import { Sheet } from '../shell/Sheet'

export function DestinySheet({ onClose, onReplay }: { onClose: () => void; onReplay: (id: string) => void }) {
  const { state } = useGame()
  const nodes = selectDestinyNodes(state)
  return <Sheet title={`命运记录 ${nodes.length}/6`} onClose={onClose}>{nodes.length ? <div className="destiny-list">{nodes.map(node => <button key={node.id} onClick={() => onReplay(node.id)}><span>{node.id}</span><div><b>{node.title}</b><p>{node.subtitle}</p></div><em>重看</em></button>)}</div> : <div className="empty-state"><b>还没有发现别的命运</b><p>把不同的礼物送进视频，也许世界会认真回应你的错误。</p></div>}</Sheet>
}
