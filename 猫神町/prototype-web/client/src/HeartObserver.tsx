import { useEffect, useState } from "react";
import { heartCatalog, type HeartObservation } from "../../packages/shared/src/index.ts";
import { gameApi } from "./api.ts";

const statusLabels = { candidate: "候选生成中", validated: "预览已校验 · 未出牌", rejected: "候选未通过", expired: "未选候选已失效", waiting_playback: "已出牌 · 后果待播放", applied: "后果已执行", continued: "已出牌 · 对话已推进" };

export function HeartObserver({ revision, refreshKey = 0, initiallyOpen = false }: { revision: number; refreshKey?: number; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [items, setItems] = useState<HeartObservation[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void gameApi.heartObservations().then(result => { if (alive) { setItems(result); setError(false); } })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [open, revision, refreshKey, refresh]);
  return <details className="heart-observer" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>开发观察 · 推荐为什么出现，事情有没有发生</summary>
    {open && <div>
      <p>本段对白生成 → 阅读期间准备末尾各个回应 → 抵达选择节点后展示可用选项 → 玩家确认 → NPC回应逐句播放 → 有合法后果时执行</p>
      <p>导演不读秘密、不代选、不保证收益。下方只显示输入摘要和已发生事件；未播放的 NPC 回应不会提前展示。</p>
      <button type="button" onClick={() => setRefresh(n => n + 1)}>刷新观察记录</button>
      {error && <p role="alert">观察记录暂时无法读取，不影响正常游戏。</p>}
      {!items.length && <p>还没有心绪选择记录。与任意人物开始拾绪，听到需要回应的时刻后再来查看。</p>}
      {items.map((item, index) => <details key={item.nodeId} open={index === 0} className="heart-observation-node">
        <summary>{item.npcName} · {item.selected ?? "等待玩家选择"}</summary>
        {item.input ? <>
          <blockquote>已播原句：{item.input.quote}</blockquote>
          <p>看到了：{item.input.played.length}条已播见闻、{item.input.knownMaterials.length}份已读材料、{item.input.recentChoices.length}次近期选择。</p>
          <p>手牌：{item.input.held.map(h => `${heartCatalog[h.kind].name} × ${h.count}`).join("、") || "无"}</p>
          <p>可尝试的系统行动：{item.input.actions.map(a => a.label).join("；") || "无"}。可用不等于对方同意。</p>
          <details><summary>展开导演实际收到的公开信息</summary><pre>{JSON.stringify(item.input, null, 2)}</pre></details>
        </> : <p>这是从存档恢复的实际出牌记录。此前推荐与未选预览不写入存档，无法还原。</p>}
        <p>{item.director?.message ?? "尚无推荐结果；玩家预览、出牌不依赖导演完成。"}</p>
        {item.director?.recommendations.map(rec => <p key={rec.kind}>{heartCatalog[rec.kind].name} · {rec.angle}：{rec.reason}</p>)}
        {item.attempts.map(attempt => <div key={attempt.cardId} className={`heart-observation-attempt status-${attempt.status}`}>
          <strong>{heartCatalog[attempt.kind].name} · {statusLabels[attempt.status]}</strong>
          {attempt.line && <blockquote>遥的预览：{attempt.line}</blockquote>}
          <p>{attempt.detail}</p>
        </div>)}
        <p>实际选择：{item.selected ?? "未选择，未消耗心绪"}</p>
        {item.actualEvents.length ? <ul>{item.actualEvents.map(e => <li key={e.id}>{e.text} <small>（{e.id}）</small></li>)}</ul> : <p>尚无此节点的出牌或后果事件。</p>}
      </details>)}
    </div>}
  </details>;
}
