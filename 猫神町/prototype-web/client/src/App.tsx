import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  type DemoBootstrap,
  type AiLogEntry,
  type AiPromptStructure,
  type AiProviderStatus,
  type DialogueOption,
  type GameActionResponse,
  type GameState,
  type Item,
  type RuleSlotId,
  resolvePlayerLine
} from "../../packages/shared/src/index.ts";
import { gameApi } from "./api.ts";

type ViewId = "map" | "location" | "inventory" | "shrine" | "ending" | "debug";

const periodLabel = {
  morning: "上午",
  afternoon: "下午",
  evening: "傍晚",
  night: "夜间"
} as const;

const navItems: Array<{ id: Exclude<ViewId, "location" | "ending">; label: string; icon: string }> = [
  { id: "map", label: "地图", icon: "⌖" },
  { id: "inventory", label: "背包", icon: "▣" },
  { id: "shrine", label: "规则", icon: "◇" },
  { id: "debug", label: "调试", icon: "⌘" }
];

function routeForState(state: GameState): ViewId {
  if (state.phase === "ending") return "ending";
  if (state.phase === "location" || state.phase === "encounter") return "location";
  if (state.phase === "night") return "shrine";
  return "map";
}

function formatClock(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function formatDuration(minutes: number) {
  if (minutes % 60 === 0) return `${minutes / 60} 小时`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

export function App() {
  const [bootstrap, setBootstrap] = useState<DemoBootstrap | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null);
  const [aiLogs, setAiLogs] = useState<AiLogEntry[]>([]);
  const [aiPromptStructure, setAiPromptStructure] = useState<AiPromptStructure | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<ViewId>("map");
  const [selectedSlot, setSelectedSlot] = useState<RuleSlotId>("faith");
  const [candidateItemId, setCandidateItemId] = useState<string | null>(null);
  const [candidateGiftId, setCandidateGiftId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [dialogueBeatIndex, setDialogueBeatIndex] = useState(0);
  const [pendingPlayerLine, setPendingPlayerLine] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      gameApi.bootstrap(),
      gameApi.state(),
      gameApi.aiStatus(),
      gameApi.aiLogs(),
      gameApi.aiPromptStructure()
    ])
      .then(([loadedBootstrap, loadedState, loadedAiStatus, loadedAiLogs, loadedPromptStructure]) => {
        if (!alive) return;
        setBootstrap(loadedBootstrap);
        setGameState(loadedState);
        setAiStatus(loadedAiStatus);
        setAiLogs(loadedAiLogs);
        setAiPromptStructure(loadedPromptStructure);
        setView(routeForState(loadedState));
      })
      .catch((error: unknown) => {
        if (alive) setLoadError(error instanceof Error ? error.message : "未知错误");
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setDialogueBeatIndex(0);
  }, [gameState?.currentDialogue]);

  const inventoryItems = useMemo(() => {
    if (!bootstrap || !gameState) return [];
    return bootstrap.items.filter((item) => gameState.itemOwners[item.id] === "player");
  }, [bootstrap, gameState]);

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

  if (!bootstrap || !gameState) {
    return (
      <main className="boot-screen">
        <div className="cat-loader" aria-label="正在载入"><span>猫</span></div>
        <p>正在恢复猫神町的存档……</p>
      </main>
    );
  }

  const state = gameState;
  const player = bootstrap.player ?? {
    name: "朝雾遥",
    age: 21,
    publicRole: "猫神社七日代理管理人",
    occupation: "旧物整理员",
    publicBackground: "刚刚收到七日委任书并来到猫神町。",
    coreDesire: "查清委任书的来源。",
    startingMystery: "委任书没有寄件人。"
  };

  const selectedLocation = bootstrap.locations.find(
    (location) => location.id === gameState.currentLocationId
  );
  const activeNpc = bootstrap.npcs.find((npc) => npc.id === gameState.activeNpcId);
  const sceneNpc = bootstrap.npcs.find(
    (npc) => (gameState.npcStates[npc.id]?.currentLocationId ?? npc.initialLocationId) === gameState.currentLocationId
  );
  const candidateItem = bootstrap.items.find((item) => item.id === candidateItemId);
  const candidateConcept = bootstrap.concepts.find(
    (concept) => concept.id === candidateItem?.carriedConceptId
  );
  const candidateGift = bootstrap.items.find((item) => item.id === candidateGiftId);
  const dailyEvent = bootstrap.dailyEvents.find((event) => event.day === gameState.day)!;
  const isNight = gameState.phase === "night";
  const isEnding = gameState.phase === "ending";
  const canStartConversation = gameState.currentMinute + gameState.conversationDurationMinutes <= gameState.nightStartMinute;

  function changeView(nextView: ViewId) {
    setView(nextView);
    setActionError(null);
  }

  async function perform(action: () => Promise<GameActionResponse>, optimisticPlayerLine?: string) {
    setBusy(true);
    if (optimisticPlayerLine) setPendingPlayerLine(optimisticPlayerLine);
    setActionError(null);
    setNotice(null);
    try {
      const response = await action();
      setGameState(response.state);
      setNotice(response.notice);
      setCandidateGiftId(null);
      if (candidateItemId && response.state.itemOwners[candidateItemId] !== "player") {
        setCandidateItemId(null);
      }
      setView(routeForState(response.state));
      void gameApi.aiLogs().then(setAiLogs).catch(() => undefined);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPendingPlayerLine(null);
      setBusy(false);
    }
  }

  async function restartGame() {
    setResetConfirmOpen(false);
    setCandidateItemId(null);
    setCandidateGiftId(null);
    setSelectedSlot("faith");
    await perform(gameApi.reset);
  }

  function enterLocation(locationId: string) {
    if (state.phase === "location" || state.phase === "encounter") {
      if (state.currentLocationId === locationId) changeView("location");
      else setActionError(state.phase === "encounter" ? "请先结束当前会面，再前往其他地点。" : "请先离开当前地点，再前往其他地方。");
      return;
    }
    if (state.phase === "night") {
      setActionError("已经入夜。今晚只能前往猫神社处理规则或结束今天。");
      return;
    }
    void perform(() => gameApi.travel(locationId));
  }

  function renderDialogue(modeLabel: string) {
    const dialogue = state.currentDialogue;
    if (!activeNpc || !dialogue) return null;
    const selectedChoiceBeat = state.lastPlayerChoice
      ? { speakerId: player.id, line: state.lastPlayerChoice, stageDirection: undefined, emotion: "回应" }
      : null;
    const dialogueBeats = [
      ...(selectedChoiceBeat ? [selectedChoiceBeat] : []),
      { speakerId: dialogue.speakerId, line: dialogue.line, stageDirection: dialogue.stageDirection, emotion: dialogue.emotion },
      ...dialogue.continuations.map((beat) => ({
        ...beat,
        speakerId: beat.speakerId ?? dialogue.speakerId
      }))
    ];
    const visibleBeatIndex = Math.min(dialogueBeatIndex, dialogueBeats.length - 1);
    const isWaitingForNpc = Boolean(pendingPlayerLine);
    const visibleBeat = pendingPlayerLine
      ? { speakerId: player.id, line: pendingPlayerLine, stageDirection: undefined, emotion: "回应" }
      : dialogueBeats[visibleBeatIndex]!;
    const isLastBeat = visibleBeatIndex === dialogueBeats.length - 1;
    const isPlayerBeat = visibleBeat.speakerId === player.id || visibleBeat.speakerId === "player";
    const visibleSpeakerName = isPlayerBeat ? player.name : activeNpc.name;
    const playerLineForOption = (option: DialogueOption) => resolvePlayerLine(option);
    return (
      <div className="dialogue-panel">
        <div className={`portrait-placeholder ${isPlayerBeat ? "player-speaking" : ""}`} style={{ "--npc-accent": isPlayerBeat ? "#a7554b" : activeNpc.accent } as CSSProperties}>
          <span>{visibleSpeakerName.slice(0, 1)}</span>
          <small>{isPlayerBeat ? "回应" : visibleBeat.emotion}</small>
        </div>
        <div className="dialogue-content">
          <div className="dialogue-name-row">
            <strong>{visibleSpeakerName}</strong>
            <span>{isPlayerBeat ? `主角 · ${modeLabel}` : `${dialogue.debug.provider === "deepseek" ? "DeepSeek" : dialogue.debug.provider === "mock_fallback" ? "Mock 保底" : "Mock"} · ${modeLabel}`}</span>
          </div>
          {visibleBeat.stageDirection && <p className="stage-direction">{visibleBeat.stageDirection}</p>}
          {isPlayerBeat
            ? <p className="player-dialogue-line" aria-label={`${player.name}说`} key={`${visibleBeat.line}-${visibleBeatIndex}`}><span>{player.name}</span>{visibleBeat.line}</p>
            : <p className="dialogue-line" key={`${visibleBeat.line}-${visibleBeatIndex}`}>{visibleBeat.line}</p>}
          {isWaitingForNpc && <p className="pending-response-note">{activeNpc.name}正在回应……</p>}
          {!isWaitingForNpc && !isLastBeat && (
            <div className="dialogue-continue-row">
              <span>{visibleBeatIndex + 1} / {dialogueBeats.length}</span>
              <button disabled={busy} type="button" onClick={() => setDialogueBeatIndex((index) => index + 1)}>下一句 →</button>
            </div>
          )}
          {isLastBeat && !isWaitingForNpc && dialogue.options.length > 0 && (
            <div className="dialogue-options">
              {dialogue.options.map((option) => (
                <button
                  disabled={busy}
                  key={option.id}
                  type="button"
                  onClick={() => void perform(
                    () => state.interactionMode === "gift"
                      ? gameApi.answerGift(option.id)
                      : gameApi.chooseTalk(option.id),
                    playerLineForOption(option)
                  )}
                >
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
          )}
          {isLastBeat && dialogue.options.length === 0 && !isWaitingForNpc && (
            <p className="conversation-done">这段话已经说完。你可以结束本次会面。</p>
          )}
          <button className="end-meeting" disabled={busy} type="button" onClick={() => void perform(gameApi.completeEncounter)}>
            结束本次会面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => changeView(isEnding ? "ending" : "map")}>
          <span className="brand-mark">猫</span>
          <span><strong>{bootstrap.meta.title}</strong><small>{bootstrap.meta.phase}</small></span>
        </button>
        <div className="topbar-tools">
          <div className="player-chip" aria-label="主角身份">
            <span>{player.publicRole}</span>
            <strong>{player.name}</strong>
          </div>
          <div className="time-panel" aria-label="当前时间">
            <span className="day-chip">第 {gameState.day} 天</span>
            <span>{periodLabel[gameState.period]}</span>
            <span className="clock-chip" aria-label={`当前时间 ${formatClock(gameState.currentMinute)}`}>{formatClock(gameState.currentMinute)}</span>
            <small>{isEnding ? "状态已冻结" : isNight ? "夜间" : `距入夜 ${formatDuration(gameState.nightStartMinute - gameState.currentMinute)}`}</small>
          </div>
          <button className="restart-button" type="button" onClick={() => setResetConfirmOpen(true)}>↻ 重新开始</button>
        </div>
      </header>

      {(notice || actionError) && (
        <div className={`status-toast ${actionError ? "error" : ""}`} role="status">
          <span>{actionError ?? notice}</span>
          <button type="button" aria-label="关闭提示" onClick={() => { setNotice(null); setActionError(null); }}>×</button>
        </div>
      )}

      {resetConfirmOpen && (
        <div className="reset-modal-backdrop" role="presentation">
          <section aria-labelledby="reset-title" aria-modal="true" className="reset-modal" role="dialog">
            <span className="eyebrow">重新开始游戏</span>
            <h2 id="reset-title">要回到第 1 天 09:00 吗？</h2>
            <p>当前七天进度、物品所有权、世界规则和事件记录都会被清空。这个操作不能撤销。</p>
            <div className="reset-modal-actions">
              <button type="button" onClick={() => setResetConfirmOpen(false)}>继续当前游戏</button>
              <button className="danger" disabled={busy} type="button" onClick={() => void restartGame()}>确认重新开始</button>
            </div>
          </section>
        </div>
      )}

      <main className="content-shell" aria-busy={busy}>
        {view === "map" && (
          <section className="view map-view">
            <div className="view-heading">
              <div><span className="eyebrow">镇内地图</span><h1>今天要去哪里？</h1></div>
              <p>地图不显示人物位置。移动到地点花费 1 小时；抵达后是否继续交谈，由你现场决定。</p>
            </div>

            <div className="day-progress" aria-label="七日进度">
              {bootstrap.dailyEvents.map((event) => (
                <span className={event.day < gameState.day ? "past" : event.day === gameState.day ? "current" : "future"} key={event.id}>
                  <i>{event.day}</i><small>{event.day === gameState.day ? "今天" : `D${event.day}`}</small>
                </span>
              ))}
            </div>
            <article className="daily-event-card">
              <div><span className="eyebrow">今日事件 · Day {dailyEvent.day}</span><h2>{dailyEvent.title}</h2></div>
              <p>{dailyEvent.summary}</p>
              <strong>今日线索：{dailyEvent.objective}</strong>
            </article>

            {(gameState.phase === "location" || gameState.phase === "encounter") && selectedLocation && (
              <div className="phase-callout">
                <div>
                  <strong>{gameState.phase === "encounter" ? `与 ${activeNpc?.name} 的会面仍在进行` : `你正在${selectedLocation.name}`}</strong>
                  <small>{gameState.phase === "encounter" ? `地点：${selectedLocation.name}` : "尚未开始会面，可以返回场景点击人物。"}</small>
                </div>
                <button type="button" onClick={() => changeView("location")}>{gameState.phase === "encounter" ? "继续会面" : "返回场景"} →</button>
              </div>
            )}
            {isNight && (
              <div className="phase-callout night-callout">
                <div><strong>夜间猫神社已经开放</strong><small>你可以修改一次规则，也可以直接结束今天。</small></div>
                <button type="button" onClick={() => changeView("shrine")}>前往供奉位 →</button>
              </div>
            )}
            {gameState.phase === "action" && (
              <div className="phase-callout wait-callout">
                <div><strong>已经完成今天想做的事？</strong><small>可以直接整理见闻到十八点，不必用无意义的移动消耗时间。</small></div>
                <button disabled={busy} type="button" onClick={() => void perform(gameApi.waitUntilNight)}>等待入夜 →</button>
              </div>
            )}

            <div className="map-paper">
              <div className="river-line" aria-hidden="true" /><div className="rail-line" aria-hidden="true" />
              <div className="map-grid">
                {bootstrap.locations.map((location, index) => (
                  <button
                    className={`location-card location-${index + 1}`}
                    disabled={busy || gameState.phase !== "action"}
                    key={location.id}
                    style={{ "--accent": location.accent } as CSSProperties}
                    type="button"
                    onClick={() => enterLocation(location.id)}
                  >
                    <span className="location-index">0{index + 1}</span>
                    <span className="location-sketch" aria-hidden="true">{location.id === "loc_shrine" ? "⛩" : location.id === "loc_station" ? "駅" : "店"}</span>
                    <strong>{location.name}</strong><small>{location.subtitle}</small>
                    <span className="location-meta">移动耗时 {formatDuration(location.travelMinutes)}</span>
                  </button>
                ))}
              </div>
              <div className="map-note">人物会按作息移动 · 当前地图不提供头像提示</div>
            </div>
          </section>
        )}

        {view === "location" && selectedLocation && sceneNpc && (
          <section className="view location-view">
            {gameState.phase === "location" ? (
              <button className="back-button" disabled={busy} type="button" onClick={() => void perform(gameApi.leaveLocation)}>← 离开地点，返回地图</button>
            ) : (
              <button className="back-button" type="button" onClick={() => changeView("map")}>← 暂时查看地图</button>
            )}
            <div className="meeting-cost-note">
              {gameState.phase === "location"
                ? `已抵达但尚未开始会面；点击人物后再选择交谈或赠礼。`
                : `会面已经开始；交谈或确认赠礼将花费 ${formatDuration(gameState.conversationDurationMinutes)}。`}
            </div>
            <div className="location-stage" style={{ "--location-accent": selectedLocation.accent } as CSSProperties}>
              <div className="stage-copy">
                <span className="eyebrow">{selectedLocation.cityAspect}</span><h1>{selectedLocation.name}</h1>
                <p>{selectedLocation.description}</p><small>{selectedLocation.atmosphere}</small>
              </div>
              <div className="stage-horizon" aria-hidden="true"><span className="roof-shape" /><span className="window-shape" /><span className="ground-shape" /></div>
              <div className="chibi-row">
                <button
                  className={`chibi-card ${gameState.phase === "encounter" ? "selected" : ""}`}
                  disabled={busy || gameState.phase !== "location" || !canStartConversation}
                  type="button"
                  onClick={() => void perform(gameApi.startEncounter)}
                >
                  <span className="chibi" style={{ "--npc-accent": sceneNpc.accent } as CSSProperties}><i className="chibi-hair" /><i className="chibi-face">• ᴗ •</i><i className="chibi-body" /></span>
                  <strong>{sceneNpc.name}</strong><small>{sceneNpc.occupation}</small>
                  <span>{gameState.phase === "location" ? (canStartConversation ? "点击开始会面" : "今天已没有会面时间") : "会面中"}</span>
                </button>
              </div>
            </div>

            {gameState.phase === "location" && (
              <div className="scene-entry-note">
                <span className="eyebrow">场景探索 · {formatClock(gameState.currentMinute)}</span>
                <h2>你还没有与任何人会面</h2>
                <p>看看地点和在场人物。想交流时点击人物；直接离开只计算已经发生的移动时间。</p>
              </div>
            )}

            {gameState.phase === "encounter" && !gameState.interactionMode && (
              <div className="meeting-entry">
                <div><span className="eyebrow">会面方式 · {formatClock(gameState.currentMinute)}</span><h2>你打算怎样开始？</h2><p>直接离开不再花时间。交谈会在开始时计时；选择赠礼可在确认交出前返回且不计时。</p></div>
                <div className="meeting-actions">
                  <button disabled={busy || !canStartConversation} type="button" onClick={() => void perform(() => gameApi.selectMode("talk"))}><strong>交谈 · {formatDuration(gameState.conversationDurationMinutes)}</strong><small>{canStartConversation ? "根据人设、当前情况与世界规则闲聊" : "今天剩余时间不足"}</small></button>
                  <button disabled={busy || inventoryItems.length === 0 || !canStartConversation} type="button" onClick={() => void perform(() => gameApi.selectMode("gift"))}><strong>赠送礼物 · {formatDuration(gameState.conversationDurationMinutes)}</strong><small>{!canStartConversation ? "今天剩余时间不足" : inventoryItems.length ? "确认礼物后计时，再围绕礼物交谈" : "背包里没有可赠送的东西"}</small></button>
                </div>
                <button className="skip-meeting" disabled={busy} type="button" onClick={() => void perform(gameApi.completeEncounter)}>结束会面，返回地图</button>
              </div>
            )}

            {gameState.interactionMode === "talk" && renderDialogue("交谈")}

            {gameState.interactionMode === "gift" && !gameState.giftItemId && (
              <div className="gift-panel">
                <div className="gift-heading"><div><span className="eyebrow">赠送礼物</span><h2>要把什么交给 {sceneNpc.name}？</h2></div><button disabled={busy} type="button" onClick={() => void perform(gameApi.cancelMode)}>← 返回会面选择</button></div>
                <div className="gift-grid">
                  {inventoryItems.map((item) => (
                    <button className={candidateGiftId === item.id ? "selected" : ""} key={item.id} type="button" onClick={() => setCandidateGiftId(item.id)}>
                      <span>{item.icon}</span><strong>{item.baseName}</strong><small>{item.baseUse}</small>
                    </button>
                  ))}
                </div>
                {candidateGift && (
                  <div className="gift-confirm">
                    <p>确认把“{candidateGift.baseName}”交给 {sceneNpc.name}？<strong>确认后物品立刻离开背包，并推进 {formatDuration(gameState.conversationDurationMinutes)}；不能撤销。</strong></p>
                    <button disabled={busy} type="button" onClick={() => void perform(() => gameApi.gift(candidateGift.id))}>确认赠送</button>
                    <button disabled={busy} type="button" onClick={() => setCandidateGiftId(null)}>先不选这件</button>
                  </div>
                )}
              </div>
            )}

            {gameState.interactionMode === "gift" && gameState.giftItemId && renderDialogue("礼物对话")}
          </section>
        )}

        {view === "inventory" && (
          <section className="view inventory-view">
            <div className="view-heading"><div><span className="eyebrow">随身物品</span><h1>背包</h1></div><p>只显示仍属于你的物品。赠送或供奉后，它会立刻从这里消失。</p></div>
            <div className="inventory-layout">
              <div className="inventory-grid">
                {inventoryItems.map((item) => <ItemCard key={item.id} item={item} />)}
                {inventoryItems.length === 0 && <div className="empty-inventory"><span>空</span><p>你已经没有随身物品了。</p></div>}
                {Array.from({ length: Math.max(0, 6 - inventoryItems.length) }, (_, index) => <div className="item-card empty-item" key={`empty-${index}`}><span>＋</span><small>空位</small></div>)}
              </div>
              <aside className="info-card player-profile-card">
                <span className="eyebrow">你的身份</span>
                <h2>{player.name} · {player.age} 岁</h2>
                <strong>{player.occupation}／{player.publicRole}</strong>
                <p>{player.publicBackground}</p>
                <div className="profile-mystery"><span>私人目标</span>{player.coreDesire}</div>
                <div className="profile-mystery"><span>起点谜团</span>{player.startingMystery}</div>
                <hr />
                <span className="eyebrow">所有权规则</span>
                <h2>东西交出去，就不再属于你</h2>
                <p>所有权由服务端统一记录。刷新网页后，已经送出或供奉的物品也不会回到背包。</p>
                <button type="button" onClick={() => changeView("shrine")}>查看世界规则 →</button>
              </aside>
            </div>
          </section>
        )}

        {view === "shrine" && (
          <section className="view shrine-view">
            <div className="view-heading"><div><span className="eyebrow">猫神社 · 供奉位</span><h1>让物品承载的概念成为规则</h1></div><p>{isNight ? "今晚可以修改一次规则，也可以跳过。" : `白天可以预览，${formatClock(gameState.nightStartMinute)} 入夜后才能确认供奉。`}</p></div>
            <div className={`night-status ${isNight ? "open" : "closed"}`}><strong>{isNight ? "夜间供奉位已开放" : "供奉位尚未开放"}</strong><span>{isNight ? (gameState.ruleChangedThisNight ? "今晚已经修改过规则，可以结束今天。" : "选择一件物品，或直接结束今天。") : `当前 ${formatClock(gameState.currentMinute)}，请先安排剩余时间。`}</span></div>
            <div className="shrine-layout">
              <div className="rule-slots">
                {bootstrap.ruleSlots.map((slot) => (
                  <button className={`rule-slot ${selectedSlot === slot.id ? "selected" : ""}`} key={slot.id} type="button" onClick={() => { setSelectedSlot(slot.id); setCandidateItemId(null); }}>
                    <span>{slot.label}</span><strong>{slot.question}</strong><small>{gameState.activeRules[slot.id]?.displayText ?? slot.emptyText}</small>
                  </button>
                ))}
              </div>
              <div className="offering-area">
                <div className={`offering-altar ${candidateItem ? "has-item" : ""}`}>
                  <span className="altar-label">{selectedSlot === "faith" ? "信仰供奉位" : "审美供奉位"}</span>
                  {candidateItem && candidateConcept ? (
                    <><span className="offering-icon">{candidateItem.icon}</span><small>载体：{candidateItem.baseName}</small><span className="reveal-label">承载概念已显现</span><h2>{candidateConcept.slotText[selectedSlot]}</h2><button className="confirm-rule" disabled={busy || !isNight || gameState.ruleChangedThisNight} type="button" onClick={() => void perform(() => gameApi.changeRule(selectedSlot, candidateItem.id))}>{!isNight ? "夜间才能确认" : gameState.ruleChangedThisNight ? "今晚已经修改过" : "确认供奉"}</button></>
                  ) : (
                    <><span className="empty-circle">◇</span><h2>选择一件物品放到候选区</h2><p>候选预览不会消耗物品；确认供奉后才转移所有权。</p></>
                  )}
                </div>
                <div className="carrier-tray"><div><span className="eyebrow">背包中的载体</span><small>选择后才显示抽象概念</small></div><div className="carrier-list">{inventoryItems.map((item) => <button className={candidateItemId === item.id ? "selected" : ""} key={item.id} type="button" onClick={() => setCandidateItemId(item.id)}><span>{item.icon}</span><strong>{item.baseName}</strong></button>)}</div></div>
                {inventoryItems.length === 0 && <p className="prototype-notice">背包为空，目前没有可以供奉的载体。</p>}
                {isNight && <div className="end-day-panel"><p>{gameState.day === 7 ? "这是最后一个夜晚。结束后状态将冻结，并根据七日事实生成结局。" : gameState.ruleChangedThisNight ? "规则已经写入全镇状态。" : "不必每晚修改规则，你可以选择跳过。"}</p><button disabled={busy} type="button" onClick={() => void perform(gameApi.endDay)}>{gameState.day === 7 ? (busy ? "正在生成结局……" : "结束第七天，生成结局") : gameState.ruleChangedThisNight ? "结束今天" : "今晚不修改，结束今天"}</button></div>}
              </div>
            </div>
          </section>
        )}

        {view === "ending" && gameState.ending && (
          <section className="view ending-view">
            <div className="ending-hero">
              <span className="eyebrow">Day 7 · 世界状态已冻结</span>
              <h1>{gameState.ending.title}</h1>
              <p>{gameState.ending.subtitle}</p>
              <div className="ending-seal">终</div>
            </div>
            <article className="ending-narration">
              <span className="eyebrow">七日结局</span>
              <p>{gameState.ending.narration}</p>
            </article>
            <div className="ending-outcomes">
              {gameState.ending.npcOutcomes.map((outcome) => {
                const npc = bootstrap.npcs.find((candidate) => candidate.id === outcome.npcId)!;
                return (
                  <article key={outcome.npcId} style={{ "--npc-accent": npc.accent } as CSSProperties}>
                    <span>{npc.name} · 关系 {gameState.npcStates[npc.id]?.relationship ?? 0}</span>
                    <h2>{outcome.headline}</h2>
                    <p>{outcome.text}</p>
                  </article>
                );
              })}
            </div>
            <blockquote>{gameState.ending.closingLine}</blockquote>
            <div className="ending-facts">
              <div><span>赠礼回收</span>{gameState.ending.factSummary.gifts.map((fact) => <p key={fact}>{fact}</p>)}</div>
              <div><span>规则回收</span>{gameState.ending.factSummary.rules.map((fact) => <p key={fact}>{fact}</p>)}</div>
            </div>
            <div className="ending-actions">
              <small>{gameState.ending.provider === "deepseek" ? "本结局由 DeepSeek 根据七日事实生成" : "AI 不可用，本结局使用事实保底结构生成"}</small>
              <button type="button" onClick={() => setResetConfirmOpen(true)}>重新开始七天</button>
            </div>
          </section>
        )}

        {view === "debug" && (
          <section className="view debug-view">
            <div className="view-heading"><div><span className="eyebrow">开发调试</span><h1>存档状态与事件链</h1></div><p>所有时间推进、物品转移与规则改写均由服务端校验并写入单一存档。</p></div>
            <div className="debug-toolbar"><span>存档修订 #{gameState.revision} · 事件 {gameState.eventLog.length} 条</span><button type="button" onClick={() => setResetConfirmOpen(true)}>重新开始游戏</button></div>
            <div className="debug-grid">
              <article><h2>当前状态</h2><pre>{JSON.stringify({ day: gameState.day, time: formatClock(gameState.currentMinute), period: gameState.period, phase: gameState.phase, conversationDurationMinutes: gameState.conversationDurationMinutes, currentLocationId: gameState.currentLocationId, activeNpcId: gameState.activeNpcId, interactionMode: gameState.interactionMode, giftItemId: gameState.giftItemId, activeRules: gameState.activeRules, storyFlags: gameState.storyFlags, ending: gameState.ending }, null, 2)}</pre></article>
              <article><h2>物品所有权</h2><pre>{JSON.stringify(bootstrap.items.map((item) => ({ item: item.baseName, owner: gameState.itemOwners[item.id], concept: bootstrap.concepts.find((concept) => concept.id === item.carriedConceptId)?.label })), null, 2)}</pre></article>
              <article className="debug-wide"><h2>NPC 独立状态、位置与结构化记忆</h2><pre>{JSON.stringify(bootstrap.npcs.map((npc) => ({ name: npc.name, godView: npc.godView, locationId: gameState.npcStates[npc.id]?.currentLocationId ?? npc.initialLocationId, relationship: gameState.npcStates[npc.id]?.relationship ?? 0, memories: gameState.npcStates[npc.id]?.memories ?? [] })), null, 2)}</pre></article>
              <article><h2>AI Provider</h2><pre>{JSON.stringify(aiStatus ?? { configured: false }, null, 2)}</pre></article>
              <article><h2>纱夜 Prompt 层级</h2><pre>{JSON.stringify(aiPromptStructure ?? { status: "loading" }, null, 2)}</pre></article>
              <article className="debug-wide"><h2>AI 调试日志（不保存隐藏推理）</h2><pre>{JSON.stringify(aiLogs, null, 2)}</pre></article>
              <article className="debug-wide"><h2>事件日志</h2><pre>{JSON.stringify(gameState.eventLog, null, 2)}</pre></article>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="主要页面">
        {navItems.map((item) => <button className={view === item.id || (item.id === "map" && view === "location") ? "active" : ""} key={item.id} type="button" onClick={() => changeView(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}
        {gameState.ending && <button className={view === "ending" ? "active" : ""} type="button" onClick={() => changeView("ending")}><span>终</span><small>结局</small></button>}
      </nav>
      <div className="build-notice">{bootstrap.meta.notice}</div>
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  return <article className="item-card"><span className="item-icon">{item.icon}</span><div><span className="item-category">{item.category}</span><h2>{item.baseName}</h2><p>{item.baseUse}</p></div><span className="condition">状态：{item.condition}</span></article>;
}
