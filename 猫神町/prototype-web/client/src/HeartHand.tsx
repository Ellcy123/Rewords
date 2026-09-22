import { useEffect, useState } from "react";
import { heartCatalog, heartKinds, type DemoBootstrap, type GameState, type HeartKind, type HeartOptions, type HeartDirectorResult } from "../../packages/shared/src/index.ts";
import { gameApi } from "./api.ts";

export function HeartHand({ state, bootstrap, busy = false, onUse, onObservationChange }: {
  state: GameState; bootstrap: DemoBootstrap; busy?: boolean;
  onUse?: (cardId: string | null, previewId?: string) => Promise<boolean>;
  onObservationChange?: () => void;
}) {
  const [selected, setSelected] = useState<HeartKind | null>(null);
  const [prepared, setPrepared] = useState<HeartOptions | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [director, setDirector] = useState<HeartDirectorResult | null>(null);
  const [directorPending, setDirectorPending] = useState(false);
  const interactive = !!onUse;
  useEffect(() => {
    setSelected(null); setPrepared(null); setPreparationError(null);
    if (!interactive) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async (retryFailed = false) => {
      try {
        const result = await gameApi.heartOptions(state.revision, retryFailed);
        if (!alive || result.revision !== state.revision) return;
        setPrepared(result);
        if (!result.complete) timer = setTimeout(() => void poll(), 1000);
        else onObservationChange?.();
      } catch (error) {
        if (alive) setPreparationError(error instanceof Error ? error.message : "回应暂时没有准备好。");
      }
    };
    void poll(retry > 0);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [state.revision, interactive, retry]);
  useEffect(() => {
    if (!interactive) return;
    let alive = true;
    setDirector(null); setDirectorPending(true);
    void gameApi.heartDirector(state.revision).then(result => {
      if (alive && result.revision === state.revision) setDirector(result);
    }).catch(() => {}).finally(() => {
      if (alive) { setDirectorPending(false); onObservationChange?.(); }
    });
    return () => { alive = false; };
  }, [state.revision, interactive]);

  // A previous revision may remain in React state for a render before its effect
  // cleans up. It must never expose a clickable stale branch.
  const ready = prepared?.revision === state.revision ? prepared.options : [];
  const optionFor = (kind: HeartKind) => ready.find(option => option.cardId && state.heartCards.some(card => card.id === option.cardId && card.kind === kind));
  const preview = selected ? optionFor(selected) : undefined;
  const card = interactive ? state.heartCards.find(card => card.id === preview?.cardId) : state.heartCards.find(card => card.kind === selected);
  const listen = ready.find(option => option.cardId === null);
  const preparing = interactive && !preparationError && (!prepared || prepared.revision !== state.revision || !prepared.complete);
  const visibleKinds = heartKinds.filter(kind => !interactive || !!optionFor(kind));
  async function confirm(cardId: string | null, previewId: string) {
    if (!onUse) return;
    const ok = await onUse(cardId, previewId);
    if (!ok) { setPrepared(null); setSelected(null); setRetry(value => value + 1); }
  }
  return <section className="heart-hand" aria-label="心绪牌">
    <div className="heart-heading"><strong>拾绪 · 心绪牌</strong><small>{state.heartCards.length} 张留在心中</small></div>
    <p className="heart-hint">{interactive ? "选心绪查看遥的回复，确认才消耗一张。" : "在任意人物的新会面中选择「拾绪」。九种态度，来自对方实际流露的情绪，不是案件证据。"}</p>
    {preparing && <p role="status" className="heart-pending">{ready.length ? "其余回应还在准备，已出现的可以直接选择。" : "回应已在阅读对白时开始准备，还需要一点时间……"}</p>}
    {preparationError && <p role="alert">{preparationError}</p>}
    {interactive && (preparationError || prepared?.complete && !ready.length) && <div className="heart-empty">
      <p>这次回应准备未成功，卡牌与进度已保留。可以重试，或结束这次会面。</p>
      <button type="button" disabled={busy} onClick={() => setRetry(value => value + 1)}>重新准备回应</button>
    </div>}
    {interactive && <div className="heart-director" aria-label="心绪导演推荐">
      <strong>这一刻，可以怎么接？</strong>
      {directorPending && <p>正在整理接话建议……</p>}
      {director && <>
        <p>{director.status === "offline" ? "固定演示 · 非AI判断" : director.status === "ai" ? "AI心绪导演 · 仅供参考" : "推荐暂不可用"}</p>
        <div className="heart-recommendations">{director.recommendations.filter(rec => !!optionFor(rec.kind)).map(rec => <button type="button" key={rec.kind}
          disabled={busy} onClick={() => setSelected(rec.kind)} aria-label={`试试${heartCatalog[rec.kind].name}：${rec.angle}`}>
          <span>{heartCatalog[rec.kind].name} · {rec.angle}</span><small>{rec.reason}</small>
        </button>)}</div>
      </>}
    </div>}
    <div className="heart-cards">
      {visibleKinds.map(kind => {
        const count = state.heartCards.filter(card => card.kind === kind).length;
        return <button key={kind} type="button" className={`heart-card heart-${kind} ${selected === kind ? "chosen" : ""}`}
          disabled={busy || count === 0} aria-pressed={selected === kind}
          aria-label={`${heartCatalog[kind].name}，${count}张，${heartCatalog[kind].description}`}
          onClick={() => setSelected(selected === kind ? null : kind)}>
          <span className="heart-count">{count ? `× ${count}` : "未拾得"}</span>
          <span className="heart-art" aria-hidden="true"><i /><i /><i /></span>
          <strong>{heartCatalog[kind].name}</strong><small>{heartCatalog[kind].description}</small>
          {director?.recommendations.some(rec => rec.kind === kind) && <span className="heart-recommended">{director.status === "ai" ? "导演推荐" : "演示方向"}</span>}
        </button>;
      })}
    </div>
    {!state.heartCards.length && <p className="heart-empty">手中还没有心绪。听听对方说什么；明确的情绪流露会自动留下卡牌。</p>}
    {card && <div className="heart-preview">
      {interactive && preview ? <>
        <p className="heart-reply-label">朝雾遥准备这样回应 · {heartCatalog[card.kind].name}</p>
        {preview.stageDirection && <p className="heart-reply-action">{preview.stageDirection}</p>}
        <blockquote className="heart-reply-line">{preview.line}</blockquote>
        <p className="heart-reply-note">{preview.provider === "mock" ? "固定演示 · " : ""}确认后就说这句，对方的回应随后揭晓。</p>
        <button type="button" disabled={busy} onClick={() => void confirm(card.id, preview.id)}>就这样说 · 消耗 1 张</button>
      </> : <>
        <p>「{heartCatalog[card.kind].name}」 · {card.sourceType === "test" ? "测试补给" : `第 ${card.day} 天，从${bootstrap.npcs.find(npc => npc.id === card.sourceNpcId)?.name ?? "对方"}处拾得`}</p>
        <blockquote>{card.sourceText}</blockquote>
      </>}
      <button type="button" className="heart-cancel" disabled={busy} onClick={() => setSelected(null)}>收起</button>
    </div>}
    {interactive && listen && <button className="heart-listen" type="button" disabled={busy} onClick={() => void confirm(null, listen.id)}>顺着聊下去 <small>不消耗 · 交给遥自然回应</small></button>}
    {interactive && prepared?.complete && ready.length > 0 && ready.length < new Set(state.heartCards.map(card => card.kind)).size + 1 &&
      <button type="button" disabled={busy} onClick={() => setRetry(value => value + 1)}>再准备其他回应</button>}
    {busy && <p role="status" className="heart-pending">正在确认回应……</p>}
  </section>;
}
