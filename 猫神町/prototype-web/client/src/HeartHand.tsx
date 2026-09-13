import { useEffect, useRef, useState } from "react";
import { heartCatalog, heartKinds, type DemoBootstrap, type GameState, type HeartKind, type HeartPreview, type HeartDirectorResult } from "../../packages/shared/src/index.ts";
import { gameApi } from "./api.ts";

export function HeartHand({ state, bootstrap, busy = false, onUse, onPreview, onObservationChange }: {
  state: GameState; bootstrap: DemoBootstrap; busy?: boolean;
  onUse?: (cardId: string | null, previewId?: string) => Promise<boolean>;
  onPreview?: (cardId: string) => Promise<HeartPreview>;
  onObservationChange?: () => void;
}) {
  const [selected, setSelected] = useState<HeartKind | null>(null);
  const [preview, setPreview] = useState<HeartPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const cache = useRef(new Map<string, HeartPreview>());
  const [director, setDirector] = useState<HeartDirectorResult | null>(null);
  const [directorPending, setDirectorPending] = useState(false);
  const [directorError, setDirectorError] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const interactive = !!onUse;
  useEffect(() => {
    if (!interactive) return;
    let alive = true;
    setDirector(null); setDirectorError(false); setDirectorPending(true);
    void gameApi.heartDirector(state.revision).then(result => {
      if (alive && result.revision === state.revision) setDirector(result);
    }).catch(() => { if (alive) setDirectorError(true); }).finally(() => {
      if (alive) { setDirectorPending(false); onObservationChange?.(); }
    });
    return () => { alive = false; };
  }, [state.revision, interactive]);
  useEffect(() => {
    requestId.current++; cache.current.clear(); setPreview(null); setSelected(null); setLoading(false); setError(null);
    return () => { requestId.current++; };
  }, [state.revision]);
  const card = state.heartCards.find(c => c.kind === selected);
  async function select(kind: HeartKind | null) {
    const id = ++requestId.current;
    setSelected(kind); setPreview(null); setError(null); setLoading(false);
    const candidate = state.heartCards.find(c => c.kind === kind);
    if (!candidate || !onPreview) return;
    const cached = cache.current.get(candidate.id);
    if (cached) { setPreview(cached); return; }
    setLoading(true);
    try {
      const result = await onPreview(candidate.id);
      if (requestId.current !== id) return;
      cache.current.set(candidate.id, result); setPreview(result);
    } catch (e) {
      if (requestId.current === id) setError(e instanceof Error ? e.message : "回复预览暂时不可用，请重试。");
    } finally { if (requestId.current === id) { setLoading(false); onObservationChange?.(); } }
  }
  async function confirm() {
    if (!card || !preview || !onUse) return;
    const id = requestId.current;
    const ok = await onUse(card.id, preview.id);
    if (!ok && requestId.current === id) {
      cache.current.clear(); setPreview(null);
      setError("确认未完成，请先重新预览；进度以当前会面为准。");
    }
  }
  return <section className="heart-hand" aria-label="心绪牌">
    <div className="heart-heading"><strong>拾绪 · 心绪牌</strong><small>{state.heartCards.length} 张留在心中</small></div>
    <p className="heart-hint">{onUse ? "先选心绪，看看遥准备怎么接话。确认才消耗一张；可以换牌，也可以收起。" : "在任意人物的新会面中选择「拾绪」。九种态度，来自对方实际流露的情绪，不是案件证据。"}</p>
    {onUse && <div className="heart-director" aria-label="心绪导演推荐">
      <strong>这一刻，可以怎么接？</strong>
      {directorPending && <p role="status">导演正在看刚才的对话……不用等，也可以自己选牌。</p>}
      {directorError && <p>推荐暂时不可用，你仍可以自行选牌。</p>}
      {director && <>
        <p>{director.status === "offline" ? "固定演示 · 非AI判断" : director.status === "ai" ? "AI心绪导演 · 仅供参考" : "推荐不可用"}</p>
        <div className="heart-recommendations">{director.recommendations.map(rec => <button type="button" key={rec.kind}
          disabled={busy || loading || !state.heartCards.some(c => c.kind === rec.kind)}
          onClick={() => void select(rec.kind)} aria-label={`试试${heartCatalog[rec.kind].name}：${rec.angle}`}>
          <span>{heartCatalog[rec.kind].name} · {rec.angle}</span><small>{rec.reason}</small>
        </button>)}</div>
        <small>{director.message}</small>
      </>}
    </div>}
    {onUse && <button className="heart-catalog-toggle" type="button" aria-expanded={showCatalog} onClick={() => setShowCatalog(!showCatalog)}>{showCatalog ? "只看已持有的心绪" : "查看完整九种心绪"}</button>}
    <div className="heart-cards">
      {heartKinds.filter(kind => !onUse || showCatalog || state.heartCards.some(c => c.kind === kind)).map(kind => {
        const count = state.heartCards.filter(c => c.kind === kind).length;
        return <button key={kind} type="button" className={`heart-card heart-${kind} ${selected === kind ? "chosen" : ""}`}
          disabled={busy || loading || count === 0} aria-pressed={selected === kind}
          aria-label={`${heartCatalog[kind].name}，${count}张，${heartCatalog[kind].description}`}
          onClick={() => void select(selected === kind ? null : kind)}>
          <span className="heart-count">{count ? `× ${count}` : "未拾得"}</span>
          <span className="heart-art" aria-hidden="true"><i /><i /><i /></span>
          <strong>{heartCatalog[kind].name}</strong><small>{heartCatalog[kind].description}</small>
          {director?.recommendations.some(rec => rec.kind === kind) && <span className="heart-recommended">{director.status === "ai" ? "导演推荐" : "演示方向"}</span>}
        </button>;
      })}
    </div>
    {!state.heartCards.length && <p className="heart-empty">手中还没有心绪。听听对方说什么；明确的情绪流露会自动留下卡牌。</p>}
    {card && <div className="heart-preview">
      {onUse ? <>
        <p className="heart-reply-label">朝雾遥准备这样回应 · {heartCatalog[card.kind].name}</p>
        {loading && <p role="status">遥正在斟酌这句话……尚未出牌</p>}
        {preview && <>
          {preview.stageDirection && <p className="heart-reply-action">{preview.stageDirection}</p>}
          <blockquote className="heart-reply-line">{preview.line}</blockquote>
          <p className="heart-reply-note">{preview.provider === "mock" ? "固定演示 · " : ""}确认后就说这句，对方的回应随后揭晓。</p>
        </>}
        {error && <p role="alert">{error} <button disabled={busy || loading} type="button" onClick={() => void select(selected)}>重新预览</button></p>}
        <button type="button" disabled={busy || loading || !preview || preview.cardId !== card.id || preview.revision !== state.revision}
          onClick={() => void confirm()}>就这样说 · 消耗 1 张</button>
      </> : <>
        <p>「{heartCatalog[card.kind].name}」 · {card.sourceType === "test" ? "测试补给" : `第 ${card.day} 天，从${bootstrap.npcs.find(n => n.id === card.sourceNpcId)?.name ?? "对方"}处拾得`}</p>
        <blockquote>{card.sourceText}</blockquote>
      </>}
      <button type="button" className="heart-cancel" disabled={busy || loading} onClick={() => void select(null)}>收起</button>
    </div>}
    {onUse && <button className="heart-listen" type="button" disabled={busy || loading} onClick={() => onUse(null)}>顺着聊下去 <small>不消耗 · 交给遥自然回应</small></button>}
    {busy && <p role="status" className="heart-pending">正在生成这次交流……成功后才会消耗心绪。</p>}
  </section>;
}
