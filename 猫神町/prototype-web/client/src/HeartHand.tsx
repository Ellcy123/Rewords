import { useState } from "react";
import { heartCatalog, heartKinds, type DemoBootstrap, type GameState, type HeartKind } from "../../packages/shared/src/index.ts";

export function HeartHand({ state, bootstrap, busy = false, onUse }: {
  state: GameState; bootstrap: DemoBootstrap; busy?: boolean; onUse?: (cardId: string | null) => void;
}) {
  const [selected, setSelected] = useState<HeartKind | null>(null);
  const card = state.heartCards.find(c => c.kind === selected);
  return <section className="heart-hand" aria-label="心绪牌">
    <div className="heart-heading"><strong>拾绪 · 心绪牌</strong><small>{state.heartCards.length} 张留在心中</small></div>
    <p className="heart-hint">{onUse ? "选择遥的态度，而不是对方的答案。每次出示消耗一张。" : "在小春的新会面中选择「拾绪试玩」。从对方流露的情绪中获得，不是案件证据。"}</p>
    <div className="heart-cards">
      {heartKinds.map(kind => {
        const count = state.heartCards.filter(c => c.kind === kind).length;
        return <button key={kind} type="button" className={`heart-card heart-${kind} ${selected === kind ? "chosen" : ""}`}
          disabled={busy || count === 0} aria-pressed={selected === kind}
          aria-label={`${heartCatalog[kind].name}，${count}张，${heartCatalog[kind].description}`}
          onClick={() => setSelected(selected === kind ? null : kind)}>
          <span className="heart-count">{count ? `× ${count}` : "未拾得"}</span>
          <span className="heart-art" aria-hidden="true"><i /><i /><i /></span>
          <strong>{heartCatalog[kind].name}</strong><small>{heartCatalog[kind].description}</small>
        </button>;
      })}
    </div>
    {!state.heartCards.length && <p className="heart-empty">手中还没有心绪。听听对方说什么；明确的情绪流露会自动留下卡牌。</p>}
    {card && <div className="heart-preview">
      <p>「{heartCatalog[card.kind].name}」 · {card.sourceType === "test" ? "测试补给" : `第 ${card.day} 天，从${bootstrap.npcs.find(n => n.id === card.sourceNpcId)?.name ?? "对方"}处拾得`}</p>
      <blockquote>{card.sourceText}</blockquote>
      {onUse && <button type="button" disabled={busy} onClick={() => onUse(card.id)}>出示「{heartCatalog[card.kind].name}」 · 消耗 1 张</button>}
      <button type="button" className="heart-cancel" disabled={busy} onClick={() => setSelected(null)}>收起</button>
    </div>}
    {onUse && <button className="heart-listen" type="button" disabled={busy} onClick={() => onUse(null)}>顺着聊下去 <small>不消耗 · 交给遥自然回应</small></button>}
    {busy && <p role="status" className="heart-pending">正在生成这次交流……成功后才会消耗心绪。</p>}
  </section>;
}
