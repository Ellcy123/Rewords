import { useState } from 'react'
import type { NodeId, VideoNode } from '../content/types'
import { selectDestinyNodes, selectResolvedNodes } from '../engine/selectors'
import { useGame } from '../game/useGame'
import { Sheet } from '../shell/Sheet'

function RecordList({ nodes, onReplay, empty }: { nodes: VideoNode[]; onReplay: (id: NodeId) => void; empty: string }) {
  if (!nodes.length) return <div className="empty-state"><b>{empty}</b><p>继续改写视频，这里会留下可以重看的记录。</p></div>
  return <div className="destiny-list">{nodes.map(node => <button key={node.id} aria-label={`重看${node.title}`} onClick={() => onReplay(node.id)}><span>{node.id}</span><div><b>{node.title}</b><p>{node.subtitle}</p></div><em>重看</em></button>)}</div>
}

export function RecordsSheet({ onClose, onReplay }: { onClose: () => void; onReplay: (id: NodeId) => void }) {
  const { state } = useGame()
  const [tab, setTab] = useState<'resolved' | 'destiny'>('resolved')
  const resolved = selectResolvedNodes(state)
  const destiny = selectDestinyNodes(state)
  return <Sheet title={`视频记录 ${resolved.length + destiny.length}`} onClose={onClose}>
    <div className="record-tabs"><button className={tab === 'resolved' ? 'active' : ''} onClick={() => setTab('resolved')}>已改写</button><button className={tab === 'destiny' ? 'active' : ''} onClick={() => setTab('destiny')}>别的命运</button></div>
    {tab === 'resolved' ? <RecordList nodes={resolved} onReplay={onReplay} empty="还没有改写完成的视频" /> : <RecordList nodes={destiny} onReplay={onReplay} empty="还没有发现别的命运" />}
  </Sheet>
}
