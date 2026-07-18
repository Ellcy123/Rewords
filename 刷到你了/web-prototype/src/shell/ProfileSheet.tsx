import { useState } from 'react'
import { selectProgress } from '../engine/selectors'
import { useGame } from '../game/useGame'
import { Sheet } from './Sheet'

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame()
  const [confirm, setConfirm] = useState(false)
  return <Sheet title="我的试玩" onClose={onClose}><div className="profile-hero"><span>刷</span><div><h3>普通用户 · 命运改写中</h3><p>所有进度只保存在这台设备。</p></div></div><div className="stats"><div><b>{selectProgress(state)}/10</b><span>主线节点</span></div><div><b>{state.destinyNodeIds.length}/6</b><span>别的命运</span></div><div><b>{state.coins}</b><span>金币</span></div></div><label className="setting-row"><span>声音反馈</span><input type="checkbox" checked={!state.muted} onChange={event => dispatch({ type: 'SET_MUTED', muted: !event.target.checked })} /></label><div className="about-card"><b>关于《刷到你了》</b><p>从一条视频取得物品，把它送进另一条视频，改写已经发生的失败。</p></div>{confirm ? <div className="reset-confirm"><p>确定清空本关进度吗？</p><button onClick={() => { dispatch({ type: 'RESET_GAME' }); onClose() }}>确认重新开始</button><button onClick={() => setConfirm(false)}>取消</button></div> : <button className="danger-button" onClick={() => setConfirm(true)}>重新开始</button>}</Sheet>
}
