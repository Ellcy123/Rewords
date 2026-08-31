import { useEffect, useMemo, useState } from "react";
import {
  DemoBootstrapSchema,
  DialogueResultSchema,
  type DemoBootstrap,
  type DialogueResult,
  type Item,
  type Npc,
  type RuleSlotId
} from "../../packages/shared/src/index.ts";

type ViewId = "map" | "location" | "inventory" | "shrine" | "debug";

const periodLabel = {
  morning: "上午",
  afternoon: "下午",
  evening: "夜晚"
} as const;

const navItems: Array<{ id: ViewId; label: string; icon: string }> = [
  { id: "map", label: "地图", icon: "⌖" },
  { id: "inventory", label: "背包", icon: "▣" },
  { id: "shrine", label: "规则", icon: "◇" },
  { id: "debug", label: "调试", icon: "⌘" }
];

export function App() {
  const [bootstrap, setBootstrap] = useState<DemoBootstrap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>("map");
  const [selectedLocationId, setSelectedLocationId] = useState("loc_shrine");
  const [dialogueNpcId, setDialogueNpcId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<DialogueResult | null>(null);
  const [lastPlayerChoice, setLastPlayerChoice] = useState<string | null>(null);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [dialogueError, setDialogueError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<RuleSlotId>("faith");
  const [candidateItemId, setCandidateItemId] = useState<string | null>(null);
  const [prototypeNotice, setPrototypeNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBootstrap() {
      try {
        const response = await fetch("/api/bootstrap", { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        setBootstrap(DemoBootstrapSchema.parse(payload));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setLoadError(error instanceof Error ? error.message : "未知错误");
        }
      }
    }

    void loadBootstrap();
    return () => controller.abort();
  }, []);

  const selectedLocation = bootstrap?.locations.find(
    (location) => location.id === selectedLocationId
  );
  const dialogueNpc = bootstrap?.npcs.find((npc) => npc.id === dialogueNpcId);
  const inventoryItems = useMemo(() => {
    if (!bootstrap) return [];
    return bootstrap.initialState.inventoryItemIds
      .map((id) => bootstrap.items.find((item) => item.id === id))
      .filter((item): item is Item => Boolean(item));
  }, [bootstrap]);
  const candidateItem = bootstrap?.items.find((item) => item.id === candidateItemId);
  const candidateConcept = bootstrap?.concepts.find(
    (concept) => concept.id === candidateItem?.carriedConceptId
  );

  function changeView(nextView: ViewId) {
    setView(nextView);
    setPrototypeNotice(null);
    if (nextView !== "location") {
      setDialogueNpcId(null);
      setDialogue(null);
      setLastPlayerChoice(null);
    }
  }

  function enterLocation(locationId: string) {
    setSelectedLocationId(locationId);
    setDialogueNpcId(null);
    setDialogue(null);
    setLastPlayerChoice(null);
    setView("location");
  }

  async function requestDialogue(
    npc: Npc,
    selectedOptionId?: string,
    selectedOptionText?: string
  ) {
    if (!bootstrap) return;
    setDialogueNpcId(npc.id);
    setLastPlayerChoice(selectedOptionText ?? null);
    setDialogueLoading(true);
    setDialogueError(null);

    try {
      const response = await fetch("/api/dialogue/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcId: npc.id,
          locationId: selectedLocationId,
          day: bootstrap.initialState.day,
          period: bootstrap.initialState.period,
          activeRules: bootstrap.initialState.activeRules,
          selectedOptionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setDialogue(DialogueResultSchema.parse(await response.json()));
    } catch (error) {
      setDialogueError(error instanceof Error ? error.message : "Mock 对话失败");
    } finally {
      setDialogueLoading(false);
    }
  }

  function chooseDialogueOption(
    npc: Npc,
    option: DialogueResult["options"][number]
  ) {
    if (option.intent === "结束会面") {
      setDialogueNpcId(null);
      setDialogue(null);
      setLastPlayerChoice(null);
      setDialogueError(null);
      return;
    }

    void requestDialogue(npc, option.id, option.text);
  }

  if (loadError) {
    return (
      <main className="boot-screen">
        <div className="boot-card error-card">
          <span className="eyebrow">无法载入 Demo</span>
          <h1>前后端没有成功连接</h1>
          <p>{loadError}</p>
          <p className="muted">请在 prototype-web 目录运行 npm run dev。</p>
        </div>
      </main>
    );
  }

  if (!bootstrap) {
    return (
      <main className="boot-screen">
        <div className="cat-loader" aria-label="正在载入">
          <span>猫</span>
        </div>
        <p>正在打开猫神町……</p>
      </main>
    );
  }

  const state = bootstrap.initialState;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => changeView("map")}>
          <span className="brand-mark">猫</span>
          <span>
            <strong>{bootstrap.meta.title}</strong>
            <small>{bootstrap.meta.phase}</small>
          </span>
        </button>

        <div className="time-panel" aria-label="当前时间">
          <span className="day-chip">第 {state.day} 天</span>
          <span>{periodLabel[state.period]}</span>
          <span className="action-dots" aria-label={`剩余 ${state.actionsRemaining} 次行动`}>
            {Array.from({ length: state.actionsPerDay }, (_, index) => (
              <i key={index} className={index < state.actionsRemaining ? "active" : ""} />
            ))}
          </span>
          <small>剩余 {state.actionsRemaining} 次行动</small>
        </div>
      </header>

      <main className="content-shell">
        {view === "map" && (
          <section className="view map-view">
            <div className="view-heading">
              <div>
                <span className="eyebrow">镇内地图</span>
                <h1>今天要去哪里？</h1>
              </div>
              <p>地图不显示人物位置。进入地点后，才能确认谁在那里。</p>
            </div>

            <div className="map-paper">
              <div className="river-line" aria-hidden="true" />
              <div className="rail-line" aria-hidden="true" />
              <div className="map-grid">
                {bootstrap.locations.map((location, index) => (
                  <button
                    className={`location-card location-${index + 1}`}
                    key={location.id}
                    style={{ "--accent": location.accent } as React.CSSProperties}
                    type="button"
                    onClick={() => enterLocation(location.id)}
                  >
                    <span className="location-index">0{index + 1}</span>
                    <span className="location-sketch" aria-hidden="true">
                      {location.id === "loc_shrine" ? "⛩" : location.id === "loc_station" ? "駅" : "店"}
                    </span>
                    <strong>{location.name}</strong>
                    <small>{location.subtitle}</small>
                    <span className="location-meta">移动消耗 {location.travelCost} 次行动</span>
                  </button>
                ))}
              </div>
              <div className="map-note">人物会按作息移动 · 当前地图不提供头像提示</div>
            </div>
          </section>
        )}

        {view === "location" && selectedLocation && (
          <section className="view location-view">
            <button className="back-button" type="button" onClick={() => changeView("map")}>
              ← 返回地图
            </button>

            <div
              className="location-stage"
              style={{ "--location-accent": selectedLocation.accent } as React.CSSProperties}
            >
              <div className="stage-copy">
                <span className="eyebrow">{selectedLocation.cityAspect}</span>
                <h1>{selectedLocation.name}</h1>
                <p>{selectedLocation.description}</p>
                <small>{selectedLocation.atmosphere}</small>
              </div>

              <div className="stage-horizon" aria-hidden="true">
                <span className="roof-shape" />
                <span className="window-shape" />
                <span className="ground-shape" />
              </div>

              <div className="chibi-row">
                {bootstrap.npcs
                  .filter((npc) => npc.initialLocationId === selectedLocation.id)
                  .map((npc) => (
                    <button
                      className={`chibi-card ${dialogueNpcId === npc.id ? "selected" : ""}`}
                      key={npc.id}
                      type="button"
                      onClick={() => void requestDialogue(npc)}
                    >
                      <span className="chibi" style={{ "--npc-accent": npc.accent } as React.CSSProperties}>
                        <i className="chibi-hair" />
                        <i className="chibi-face">• ᴗ •</i>
                        <i className="chibi-body" />
                      </span>
                      <strong>{npc.name}</strong>
                      <small>{npc.occupation}</small>
                      <span>与她/他交谈</span>
                    </button>
                  ))}
              </div>
            </div>

            {(dialogueNpc || dialogueLoading || dialogueError) && (
              <div className="dialogue-panel">
                <div className="portrait-placeholder" style={{ "--npc-accent": dialogueNpc?.accent ?? "#777" } as React.CSSProperties}>
                  <span>{dialogueNpc?.name.slice(0, 1) ?? "…"}</span>
                  <small>{dialogue?.emotion ?? dialogueNpc?.emotion ?? "等待"}</small>
                </div>
                <div className="dialogue-content">
                  <div className="dialogue-name-row">
                    <strong>{dialogueNpc?.name ?? "正在连接"}</strong>
                    <span>MockDialogueProvider</span>
                  </div>
                  {dialogueLoading && <p className="dialogue-line muted">正在整理一句不会改变世界状态的话……</p>}
                  {dialogueError && <p className="dialogue-line error-text">{dialogueError}</p>}
                  {dialogue && !dialogueLoading && (
                    <>
                      {lastPlayerChoice && (
                        <p className="player-choice">
                          <span>你选择了</span>
                          {lastPlayerChoice}
                        </p>
                      )}
                      <p className="dialogue-line" key={dialogue.line}>{dialogue.line}</p>
                      <div className="dialogue-options">
                        {dialogue.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => dialogueNpc && chooseDialogueOption(dialogueNpc, option)}
                          >
                            <span>{option.text}</span>
                            <small>{option.intent}</small>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {view === "inventory" && (
          <section className="view inventory-view">
            <div className="view-heading">
              <div>
                <span className="eyebrow">随身物品</span>
                <h1>背包</h1>
              </div>
              <p>这里仅显示物品本体。它承载的规则概念不会提前写在名称里。</p>
            </div>

            <div className="inventory-layout">
              <div className="inventory-grid">
                {inventoryItems.map((item) => (
                  <article className="item-card" key={item.id}>
                    <span className="item-icon">{item.icon}</span>
                    <div>
                      <span className="item-category">{item.category}</span>
                      <h2>{item.baseName}</h2>
                      <p>{item.baseUse}</p>
                    </div>
                    <span className="condition">状态：{item.condition}</span>
                  </article>
                ))}
                {Array.from({ length: Math.max(0, 6 - inventoryItems.length) }, (_, index) => (
                  <div className="item-card empty-item" key={`empty-${index}`}>
                    <span>＋</span>
                    <small>空位</small>
                  </div>
                ))}
              </div>

              <aside className="info-card">
                <span className="eyebrow">Day 1 规则</span>
                <h2>东西交出去，就不再属于你</h2>
                <p>正式闭环将在 Day 2 接通。目前背包用于核对物品显示、基础用途和所有权数据。</p>
                <button type="button" onClick={() => changeView("shrine")}>前往猫神社预览规则 →</button>
              </aside>
            </div>
          </section>
        )}

        {view === "shrine" && (
          <section className="view shrine-view">
            <div className="view-heading">
              <div>
                <span className="eyebrow">猫神社 · 供奉位</span>
                <h1>让物品承载的概念成为规则</h1>
              </div>
              <p>先放入候选区查看完整规则；确认后才会消耗物品并改变世界。</p>
            </div>

            <div className="shrine-layout">
              <div className="rule-slots">
                {bootstrap.ruleSlots.map((slot) => (
                  <button
                    className={`rule-slot ${selectedSlot === slot.id ? "selected" : ""}`}
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot.id);
                      setCandidateItemId(null);
                      setPrototypeNotice(null);
                    }}
                  >
                    <span>{slot.label}</span>
                    <strong>{slot.question}</strong>
                    <small>{state.activeRules[slot.id] ?? slot.emptyText}</small>
                  </button>
                ))}
              </div>

              <div className="offering-area">
                <div className={`offering-altar ${candidateItem ? "has-item" : ""}`}>
                  <span className="altar-label">{selectedSlot === "faith" ? "信仰供奉位" : "审美供奉位"}</span>
                  {candidateItem && candidateConcept ? (
                    <>
                      <span className="offering-icon">{candidateItem.icon}</span>
                      <small>载体：{candidateItem.baseName}</small>
                      <span className="reveal-label">承载概念已显现</span>
                      <h2>{candidateConcept.slotText[selectedSlot]}</h2>
                      <button
                        className="confirm-rule"
                        type="button"
                        onClick={() => setPrototypeNotice("Day 1 只验证规则预览；正式确认、所有权转移和全镇 callback 将在 Day 2 接通。")}
                      >
                        确认供奉
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="empty-circle">◇</span>
                      <h2>选择一件物品放到这里</h2>
                      <p>物品进入候选区后，才显示它对应的抽象规则。</p>
                    </>
                  )}
                </div>

                <div className="carrier-tray">
                  <div>
                    <span className="eyebrow">可用载体</span>
                    <small>背包中不会提前显示概念</small>
                  </div>
                  <div className="carrier-list">
                    {inventoryItems.map((item) => (
                      <button
                        className={candidateItemId === item.id ? "selected" : ""}
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCandidateItemId(item.id);
                          setPrototypeNotice(null);
                        }}
                      >
                        <span>{item.icon}</span>
                        <strong>{item.baseName}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                {prototypeNotice && <p className="prototype-notice">{prototypeNotice}</p>}
              </div>
            </div>
          </section>
        )}

        {view === "debug" && (
          <section className="view debug-view">
            <div className="view-heading">
              <div>
                <span className="eyebrow">开发调试</span>
                <h1>世界状态与 Schema</h1>
              </div>
              <p>此页面在 Demo 阶段保留，用于定位事实、所有权、概念映射和 AI 错误。</p>
            </div>

            <div className="debug-grid">
              <article>
                <h2>运行状态</h2>
                <pre>{JSON.stringify({ view, selectedLocationId, dialogueNpcId, selectedSlot, candidateItemId, ...state }, null, 2)}</pre>
              </article>
              <article>
                <h2>物品 → 概念</h2>
                <pre>{JSON.stringify(bootstrap.items.map((item) => ({
                  item: item.baseName,
                  owner: item.initialOwnerId,
                  concept: bootstrap.concepts.find((concept) => concept.id === item.carriedConceptId)?.label
                })), null, 2)}</pre>
              </article>
              <article className="debug-wide">
                <h2>Mock 对话最后一次决策</h2>
                <pre>{JSON.stringify(dialogue?.debug ?? { provider: "mock", status: "尚未发起对话" }, null, 2)}</pre>
              </article>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="主要页面">
        {navItems.map((item) => (
          <button
            className={view === item.id || (item.id === "map" && view === "location") ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => changeView(item.id)}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>

      <div className="build-notice">{bootstrap.meta.notice}</div>
    </div>
  );
}
