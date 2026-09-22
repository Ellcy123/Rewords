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
  resolvePlayerLine, separateDialogueText, narrationSentences, dialoguePlaybackFinished
} from "../../packages/shared/src/index.ts";
import { gameApi } from "./api.ts";
import { HeartHand } from "./HeartHand.tsx";
import { HeartObserver } from "./HeartObserver.tsx";

type ViewId = "map" | "location" | "inventory" | "journal" | "shrine" | "ending" | "debug";

const periodLabel = {
  morning: "上午",
  afternoon: "下午",
  evening: "傍晚",
  night: "夜间"
} as const;

const navItems: Array<{ id: Exclude<ViewId, "location" | "ending">; label: string; icon: string }> = [
  { id: "map", label: "地图", icon: "⌖" },
  { id: "inventory", label: "背包", icon: "▣" },
  { id: "journal", label: "档案", icon: "▤" },
  { id: "shrine", label: "规则", icon: "◇" },
  { id: "debug", label: "调试", icon: "⌘" }
];

function routeForState(state: GameState): ViewId {
  if (state.phase === "ending") return "ending";
  if (state.phase === "location" || state.phase === "encounter" || state.phase === "incident") return "location";
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
  const [pendingPlayerLine, setPendingPlayerLine] = useState<string | null>(null);
  const [heartObservationRefresh, setHeartObservationRefresh] = useState(0);
  const [archiveTab, setArchiveTab] = useState<"characters" | "events">("characters");
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);

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
          <button type="button" onClick={() => window.location.reload()}>重新连接</button>
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
  const sceneNpcs = bootstrap.npcs.filter(
    (npc) => gameState.npcStates[npc.id]?.currentLocationId === gameState.currentLocationId && gameState.npcStates[npc.id]?.lifeState !== "dead"
  );
  const sceneNpc = activeNpc ?? sceneNpcs[0];
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
    if (nextView === "journal" && !busy) void refreshArchive();
  }

  async function refreshArchive() {
    setBusy(true); setActionError(null);
    try {
      const response = await gameApi.syncArchive(state.revision);
      setGameState(response.state); setNotice(response.notice);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "档案整理失败");
      try { setGameState(await gameApi.state()); } catch { /* Keep the last visible archive. */ }
    } finally { setBusy(false); }
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
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "操作失败");
      // A lost HTTP response may follow a committed spend. Recover, never replay the POST.
      try { const recovered = await gameApi.state(); setGameState(recovered); setView(routeForState(recovered)); } catch { /* Keep last known state with the original error. */ }
      return false;
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
    const visibleBeatIndex = Math.min(state.dialogueBeatIndex, dialogueBeats.length - 1);
    const isWaitingForNpc = Boolean(pendingPlayerLine);
    const visibleBeat = pendingPlayerLine
      ? { speakerId: player.id, line: pendingPlayerLine, stageDirection: undefined, emotion: "回应" }
      : dialogueBeats[visibleBeatIndex]!;
    const isLastBeat = dialoguePlaybackFinished(state);
    const isPlayerBeat = visibleBeat.speakerId === player.id || visibleBeat.speakerId === "player";
    const visibleSpeakerName = isPlayerBeat ? player.name : activeNpc.name;
    const display = separateDialogueText(visibleBeat.line, visibleBeat.stageDirection, visibleSpeakerName);
    const isNarration = !isWaitingForNpc && state.dialogueNarrationIndex !== null;
    const narrationText = isNarration ? narrationSentences(display.stageDirection)[state.dialogueNarrationIndex!] : null;
    const playerLineForOption = (option: DialogueOption) => resolvePlayerLine(option);
    const canContinue = dialogue.heart?.canContinue ?? dialogue.options.length > 0;
    const lastSpoken = state.eventLog.filter(e => e.type === "dialogue_generated" || e.type === "narration_generated").at(-1);
    const pickup = state.eventLog.filter(e => e.type === "heart_gathered" && e.details.sourceEventId === lastSpoken?.id).at(-1);
    return (
      <div className={`dialogue-panel ${isNarration ? "narration-panel" : ""}`}>
        <div className={`portrait-placeholder ${isPlayerBeat ? "player-speaking" : ""}`} style={{ "--npc-accent": isPlayerBeat ? "#a7554b" : activeNpc.accent } as CSSProperties}>
          <span>{visibleSpeakerName.slice(0, 1)}</span>
          <small>{isNarration ? "此刻" : isPlayerBeat ? "回应" : visibleBeat.emotion}</small>
        </div>
        <div className="dialogue-content">
          <div className="dialogue-name-row">
            <strong>{isNarration ? "旁白" : visibleSpeakerName}</strong>
            <span>{isNarration ? `此刻 · ${visibleSpeakerName}` : isPlayerBeat ? `主角 · ${modeLabel}` : `${dialogue.debug.provider === "deepseek" ? "DeepSeek" : dialogue.heart && dialogue.debug.provider === "mock" ? "固定演示对白" : dialogue.debug.provider === "mock_fallback" ? "Mock 保底" : "Mock"} · ${modeLabel}`}</span>
          </div>
          {isNarration
            ? <div className="narration-beat" aria-label="旁白" aria-live="polite" key={`${visibleBeatIndex}-${state.dialogueNarrationIndex}-${narrationText}`}><span aria-hidden="true">◇</span><p>{narrationText}</p></div>
            : isPlayerBeat
              ? <p className="player-dialogue-line" aria-label={`${player.name}说`} key={`${display.line}-${visibleBeatIndex}`}><span>{player.name}</span>{display.line}</p>
              : <p className="dialogue-line" key={`${display.line}-${visibleBeatIndex}`}>{display.line}</p>}
          {isWaitingForNpc && <p className="pending-response-note">{activeNpc.name}正在回应……</p>}
          {dialogue.heart && pickup && <p className="heart-pickup" role="status" key={pickup.id}>✧ {pickup.details.text}</p>}
          {!isWaitingForNpc && !isLastBeat && (
            <div className="dialogue-continue-row">
              <span>{isNarration ? "动作与神情 · 点击继续" : `${visibleBeatIndex + 1} / ${dialogueBeats.length}`}</span>
              <button disabled={busy} type="button" onClick={() => void perform(() => gameApi.nextBeat(state.revision))}>下一句 →</button>
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
          {isLastBeat && dialogue.heart?.canContinue && (dialogue.heart.choicePoint
            ? <><p className="heart-choice-prompt">这一刻，你想以怎样的心绪回应？</p><HeartHand key={state.revision} state={state} bootstrap={bootstrap!} busy={busy}
                onObservationChange={() => setHeartObservationRefresh(n => n + 1)}
                onUse={(cardId, previewId) => perform(() => gameApi.useHeart(cardId, state.revision, previewId))} /></>
            : <div className="dialogue-continue-row"><span>这是旧存档留下的普通断点。</span><button disabled={busy} type="button" onClick={() => void perform(() => gameApi.useHeart(null, state.revision))}>衔接到下一决策点 →</button></div>)}
          {dialogue.heart && <><p className="heart-trial-note">七人拾绪 · 九种态度。多数回应会推动实际后果；没有合适后果时，也会转向新的交流焦点。</p><HeartObserver revision={state.revision} refreshKey={heartObservationRefresh} /></>}
          {isLastBeat && !canContinue && !isWaitingForNpc && (
            <p className="conversation-done">本次交谈已结束。返回场景，继续你的行程吧。</p>
          )}
          {isLastBeat && (dialogue.options.length > 0 || dialogue.heart?.canContinue) && !isWaitingForNpc && state.interactionMode === "talk" && (
            <details className="evidence-tools">
              <summary>出示材料／转告消息</summary>
              <p>出示不转移所有权。已送出的实物不能再次出示。</p>
              <div className="dialogue-options">
                {inventoryItems.filter(i => /^E\d+$/.test(i.id)).map(i => (
                  <button disabled={busy} key={i.id} onClick={() => void perform(() => gameApi.present(i.id))}>出示{i.baseName}</button>
                ))}
                {state.storyFlags.includes("chiyo_retracted") && activeNpc.id !== "npc_chiyo" &&
                  <button disabled={busy} onClick={() => void perform(gameApi.tellRetraction)}>转告千代改口</button>}
              </div>
            </details>
          )}
          {dialogue.heart?.spendEventId && dialogue.heart.consequence && !dialogue.heart.consequenceApplied && <p className="heart-pending" role="status">这张牌的后果待播放。请继续看完对方的决定，进度已保存。</p>}
          <button className="end-meeting" disabled={busy || !!(dialogue.heart?.spendEventId && dialogue.heart.consequence && !dialogue.heart.consequenceApplied)} type="button" onClick={() => void perform(gameApi.completeEncounter)}>
            {isLastBeat && !canContinue ? "返回场景" : "结束本次会面"}
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
        {gameState.eventLog.some(e => e.type === "heart_consequence" || e.type === "heart_activity") && <aside className="meeting-plans" aria-label="心绪事件">
          <strong>交流带来的变化</strong>
          {gameState.eventLog.filter(e => e.type === "heart_consequence" || e.type === "heart_activity").slice(-2).map(e => <p key={e.id}>{e.details.text}</p>)}
          {gameState.npcStates.npc_koharu.sortingHelp === "offered" && <>
            <p>待办：和小春一起整理遗物 · 30 分钟。邀请会保留，需与小春在同一地点完成。</p>
            <button type="button" disabled={busy || gameState.npcStates.npc_koharu.currentLocationId !== gameState.currentLocationId ||
              gameState.npcStates.npc_koharu.unavailableUntil > (gameState.day - 1) * 1440 + gameState.currentMinute || gameState.currentMinute + 30 > 1080 ||
              !(gameState.phase === "location" || (gameState.phase === "encounter" && gameState.activeNpcId === "npc_koharu" && dialoguePlaybackFinished(gameState)))}
              onClick={() => void perform(() => gameApi.completeHeartActivity(gameState.revision))}>一起整理遗物 · 30 分钟</button>
          </>}
        </aside>}
        {Object.values(gameState.npcStates).some(n => n.actionPlan) && <aside className="meeting-plans" aria-label="会面约定">
          <strong>会面约定</strong>
          {Object.values(gameState.npcStates).filter(n => n.actionPlan).map(n => {
            const p = n.actionPlan!;
            const time = (v: number) => `第${Math.floor(v / 1440) + 1}天 ${formatClock(v % 1440)}`;
            return <p key={p.id}>{bootstrap.npcs.find(npc => npc.id === n.npcId)?.name} · {bootstrap.locations.find(l => l.id === p.locationId)?.name} · {time(p.arriveAt)}，等到 {time(p.waitUntil)}
              <small> · {{ planned: "已约定（不代表已到场）", waiting: "等待中", completed: "已见面", expired: "等候已结束", cancelled: "已取消" }[p.status]}</small></p>;
          })}
        </aside>}
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
              {state.phase === "incident" && <div className="phase-callout"><strong>白石旅馆的现场还等你处理</strong><button onClick={() => changeView("location")}>返回现场 →</button></div>}
              <div className="river-line" aria-hidden="true" /><div className="rail-line" aria-hidden="true" />
              <div className="map-grid">
                {bootstrap.locations.filter(l => state.discoveredLocationIds.includes(l.id)).map((location, index) => (
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
              <div className="map-note">听到具体地点后地图才会新增 · 已发现地点没有门禁 · 地图不显示人物位置</div>
            </div>
          </section>
        )}

        {view === "location" && selectedLocation && (
          <section className="view location-view">
            {gameState.phase === "location" ? (
              <button className="back-button" disabled={busy} type="button" onClick={() => void perform(gameApi.leaveLocation)}>← 离开地点，返回地图</button>
            ) : (
              <button className="back-button" type="button" onClick={() => changeView("map")}>← 暂时查看地图</button>
            )}
            <div className="meeting-cost-note">
              {gameState.phase === "location"
                ? "点击人物只查看互动，不锁定对白；选择拾绪或送礼后才开始会面。"
                : gameState.interactionMode === "gift" && !gameState.giftItemId
                  ? `已选择送礼并锁定人物；确认交出礼物才花费 ${formatDuration(gameState.conversationDurationMinutes)}，也可以取消。`
                  : "当前对白已锁定；结束后可以继续探索或与其他人物互动。"}
            </div>
            <div className="location-stage" style={{ "--location-accent": selectedLocation.accent } as CSSProperties}>
              <div className="stage-copy">
                <span className="eyebrow">{selectedLocation.cityAspect}</span><h1>{selectedLocation.name}</h1>
                <p>{selectedLocation.description}</p><small>{selectedLocation.atmosphere}</small>
              </div>
              <div className="stage-horizon" aria-hidden="true"><span className="roof-shape" /><span className="window-shape" /><span className="ground-shape" /></div>
              <div className="chibi-row">
                {sceneNpcs.map(sceneNpc => (
                <button
                  key={sceneNpc.id}
                  className={`chibi-card ${gameState.activeNpcId === sceneNpc.id ? "selected" : ""}`}
                  disabled={busy || gameState.phase !== "location" || state.npcStates[sceneNpc.id].lifeState !== "alive" || state.npcStates[sceneNpc.id].unavailableUntil > (state.day - 1) * 1440 + state.currentMinute}
                  type="button"
                  onClick={() => void perform(() => gameApi.startEncounter(sceneNpc.id))}
                >
                  <span className="chibi" style={{ "--npc-accent": sceneNpc.accent } as CSSProperties}><i className="chibi-hair" /><i className="chibi-face">• ᴗ •</i><i className="chibi-body" /></span>
                  <strong>{sceneNpc.name}</strong><small>{state.npcStates[sceneNpc.id].lifeState === "injured" ? "受伤休养中，暂不能交谈" : sceneNpc.occupation}</small>
                  <span>{state.npcStates[sceneNpc.id].unavailableUntil > (state.day - 1) * 1440 + state.currentMinute ? `暂不接待 · ${formatClock(state.npcStates[sceneNpc.id].unavailableUntil % 1440)}后再来` : gameState.phase === "location" ? (gameState.activeNpcId === sceneNpc.id ? "已选中 · 尚未开始对白" : "点击查看互动") : gameState.activeNpcId === sceneNpc.id ? "会面中" : "在场"}</span>
                </button>
                ))}
                {sceneNpcs.length === 0 && <p>这里暂时没有能交谈的人，你仍然可以查看现场。</p>}
              </div>
            </div>

            {gameState.phase === "location" && (
              <div className="scene-entry-note">
                <span className="eyebrow">场景探索 · {formatClock(gameState.currentMinute)}</span>
                <h2>{activeNpc ? `已选中${activeNpc.name}，尚未开始对白` : "选择人物或继续探索"}</h2>
                <p>点击人物后仍可换人或离开。选择拾绪或送礼才锁定这次会面；收起选择不会生成对白或改变人物记忆。</p>
                <div className="scene-materials">
                  {bootstrap.items.filter(i => state.itemOwners[i.id] === selectedLocation.id).map(i => (
                    <article key={i.id}><strong>{i.icon} {i.baseName}</strong>
                      <button disabled={busy} onClick={() => void perform(() => gameApi.inspect(i.id))}>查看</button>
                      <button disabled={busy} onClick={() => void perform(() => gameApi.inspect(i.id, true))}>拿走</button>
                    </article>
                  ))}
                </div>
                {selectedLocation.id === "loc_inn" && state.incident?.stage === "resolved" && <p className="prototype-notice">{state.incident.resolvedText}</p>}
                <button disabled={busy || state.currentMinute + 30 > state.nightStartMinute} onClick={() => void perform(() => gameApi.wait(30))}>在这里等半小时</button>
                <button disabled={busy} onClick={() => void perform(gameApi.waitUntilNight)}>在这里等到入夜</button>
              </div>
            )}

            {state.phase === "incident" && state.incident && (
              <div className="dialogue-panel incident-panel">
                <div className="dialogue-content">
                  <span className="eyebrow">你撞见的现场 · {formatClock(state.currentMinute)}</span>
                  <h2>{state.incident.stage === "contact" ? "律想单独谈谈" : state.incident.stage === "threat" ? "千代被挡住了去路" : "律正在袭击千代"}</h2>
                  <p>{state.incident.stage === "attack" ? "律抓住千代，将她推向柜台。她抓着桌沿，站不稳。" : "律站在柜台前压低声音。千代攥着手里的纸，看了你一眼。"}</p>
                  <div className="dialogue-options">
                    <button disabled={busy} onClick={() => void perform(() => gameApi.incidentChoice("intervene"))}>{state.incident.stage === "attack" ? "拦住他！" : "我也留下。"}</button>
                    <button disabled={busy} onClick={() => void perform(() => gameApi.incidentChoice("help"))}>出去找人</button>
                    <button disabled={busy} onClick={() => void perform(() => gameApi.incidentChoice("leave"))}>退开离开</button>
                  </div>
                  <small>离开后事件会继续。求助需要你实际赶路，不会立刻有人出现。</small>
                </div>
              </div>
            )}

            {gameState.phase === "location" && activeNpc && !gameState.interactionMode && (
              <div className="meeting-entry">
                <div><span className="eyebrow">互动选择 · 尚未锁定 · {formatClock(gameState.currentMinute)}</span><h2>与{activeNpc.name}怎样开始？</h2><p>拾绪就是交谈。选择后才开始并计时；送礼在选择后锁定人物、确认交出时计时。现在可以直接换人或离开。</p></div>
                <div className="meeting-actions">
                  {activeNpc && <button className="heart-entry" disabled={busy || !canStartConversation} type="button" onClick={() => void perform(() => gameApi.startHearts(state.revision))}><strong>✧ 拾绪 · {formatDuration(gameState.conversationDurationMinutes)}</strong><small>{busy ? `正在等待${activeNpc.name}开口……` : "九种态度 · 心绪推荐 · 回复先预览"}</small></button>}
                  <button disabled={busy || inventoryItems.length === 0 || !canStartConversation} type="button" onClick={() => void perform(() => gameApi.selectMode("gift", state.revision))}><strong>送礼 · {formatDuration(gameState.conversationDurationMinutes)}</strong><small>{!canStartConversation ? "今天剩余时间不足" : inventoryItems.length ? "选择后锁定人物，确认交出时计时" : "背包里没有可赠送的东西"}</small></button>
                </div>
                {!canStartConversation && <p>今天已没有足够的互动时间，仍可查看人物或继续探索。</p>}
                <button className="skip-meeting" disabled={busy} type="button" onClick={() => void perform(gameApi.completeEncounter)}>收起选择 · 不开始对白</button>
              </div>
            )}

            {gameState.interactionMode === "talk" && renderDialogue("拾绪")}

            {gameState.interactionMode === "gift" && !gameState.giftItemId && sceneNpc && (
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
            <HeartHand state={state} bootstrap={bootstrap} busy={busy} />
            <div className="view-heading"><div><span className="eyebrow">随身物品</span><h1>背包</h1></div><p>只显示仍属于你的物品。赠送或供奉后，它会立刻从这里消失。</p></div>
            <div className="inventory-layout">
              <div className="inventory-grid">
                {inventoryItems.map((item) => <div key={item.id}><ItemCard item={item} />{/^E\d+$/.test(item.id) && <button disabled={busy || isEnding} onClick={() => void perform(() => gameApi.inspect(item.id))}>阅读材料</button>}</div>)}
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
            <section className="material-records" aria-label="已读材料记录">
              <div className="journal-divider"><span>已读材料</span></div>
              <div className="view-heading compact"><div><span className="eyebrow">内容记录 · 不等于随身持有</span><h2>看过的证物与文件</h2></div><p>阅读过的内容会保留在这里；原件是否在你手中，以背包状态为准。</p></div>
              {state.evidenceJournal.length === 0 && <p className="archive-empty">还没有读过材料。去找小春，或看看商店街的公开旧报。</p>}
              <div className="material-record-grid">
                {state.evidenceJournal.map(entry => <article className="info-card" key={entry.id}>
                  <span className="eyebrow">{entry.id} · 第{entry.day}天 · {entry.source}</span><h2>{entry.name}</h2>
                  <p>{entry.text}</p><small>{state.itemOwners[entry.id] === "player" ? "原件目前由你保管" : "只保留了阅读记录，原件不在背包"}</small>
                </article>)}
              </div>
            </section>
          </section>
        )}

        {view === "journal" && (
          <section className="view">
            <div className="view-heading"><div><span className="eyebrow">档案官 AI · 只读已见内容</span><h1>调查档案</h1></div><p>人物与事件分开整理，但可以相互关联。NPC的说法默认是待核实记录，不会自动变成真相。</p></div>
            <div className="archive-status">
              <span>{state.investigationArchive.status === "ai" ? "AI 档案已启用" : state.investigationArchive.status === "unavailable" ? "档案官暂时不可用" : "等待首次整理"}</span>
              <small>{state.investigationArchive.pending ? "还有较早见闻待整理" : "已跟进当前记录"}</small>
              <button disabled={busy} type="button" onClick={() => void refreshArchive()}>{busy ? "档案官正在整理……" : "整理最新见闻"}</button>
            </div>
            <div className="archive-tabs" role="tablist" aria-label="档案类型">
              <button className={archiveTab === "characters" ? "active" : ""} onClick={() => { setArchiveTab("characters"); setSelectedArchiveId(null); }} role="tab">人物档案 <small>{state.investigationArchive.characters.length}</small></button>
              <button className={archiveTab === "events" ? "active" : ""} onClick={() => { setArchiveTab("events"); setSelectedArchiveId(null); }} role="tab">事件档案 <small>{state.investigationArchive.events.length}</small></button>
            </div>
            {archiveTab === "characters" ? <div className="archive-grid">
              {state.investigationArchive.characters.map(character => <article className={`archive-card ${selectedArchiveId === character.id ? "selected" : ""}`} key={character.id}>
                <button className="archive-card-heading" onClick={() => setSelectedArchiveId(selectedArchiveId === character.id ? null : character.id)}><span>人</span><div><h2>{character.name}</h2><small>{character.identity}</small></div></button>
                <p>{character.summary}</p>
                {selectedArchiveId === character.id && <div className="archive-detail">
                  {character.claims.map(claim => <div className="archive-claim" key={claim.id}><span data-status={claim.status}>{({ reported: "他人说法", observed: "亲眼所见", documented: "材料记载", confirmed: "已确认", disputed: "存在矛盾" } as const)[claim.status]}</span><p>{claim.text}</p><small>第{claim.learnedDay}天 {formatClock(claim.learnedMinute)} · {claim.sourceEventIds.length}个来源</small></div>)}
                  {!!character.relatedEventIds.length && <div className="archive-links"><strong>相关事件</strong>{character.relatedEventIds.map(id => { const event = state.investigationArchive.events.find(e => e.id === id); return event && <button key={id} onClick={() => { setArchiveTab("events"); setSelectedArchiveId(id); }}>{event.title}</button>; })}</div>}
                </div>}
              </article>)}
              {!state.investigationArchive.characters.length && <p className="archive-empty">还没有解锁人物档案。档案官只会记录已经明确出现的人。</p>}
            </div> : <div className="archive-grid">
              {state.investigationArchive.events.map(event => <article className={`archive-card event-card ${selectedArchiveId === event.id ? "selected" : ""}`} key={event.id}>
                <button className="archive-card-heading" onClick={() => setSelectedArchiveId(selectedArchiveId === event.id ? null : event.id)}><span>事</span><div><h2>{event.title}</h2><small>{({ reported: "听闻", investigating: "调查中", confirmed: "已确认", resolved: "已收束", disputed: "存在矛盾" } as const)[event.status]}</small></div></button>
                <p>{event.summary}</p>
                {selectedArchiveId === event.id && <div className="archive-detail">
                  {!!event.participantIds.length && <div className="archive-links"><strong>参与人</strong>{event.participantIds.map(id => { const character = state.investigationArchive.characters.find(c => c.id === id); return character && <button key={id} onClick={() => { setArchiveTab("characters"); setSelectedArchiveId(id); }}>{character.name}</button>; })}</div>}
                  {event.claims.map(claim => <div className="archive-claim" key={claim.id}><span data-status={claim.status}>{({ reported: "他人说法", observed: "亲眼所见", documented: "材料记载", confirmed: "已确认", disputed: "存在矛盾" } as const)[claim.status]}</span><p>{claim.text}</p><small>第{claim.learnedDay}天 {formatClock(claim.learnedMinute)} · {claim.sourceEventIds.length}个来源</small></div>)}
                </div>}
              </article>)}
              {!state.investigationArchive.events.length && <p className="archive-empty">还没有解锁事件档案。只有能说清参与者、行为或后果的事才会单独建档。</p>}
            </div>}
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
            <div className="rule-echoes">
              <h2>镇上的回声</h2>
              <p>这里记下你亲耳听过的回应。规则会更换，人们说过的话仍会留下。</p>
              {gameState.eventLog.filter(event => event.type === "rule_callback").length === 0
                ? <p className="prototype-notice">还没有听到镇民的回应。供奉后，去和他们聊聊吧。</p>
                : <ul>{gameState.eventLog.filter(event => event.type === "rule_callback").slice(-7).reverse().map(event => <li key={event.id}>
                    <strong>{bootstrap.npcs.find(npc => npc.id === event.actorId)?.name ?? "镇民"} · 第 {event.day} 天</strong>
                    {event.details.ruleText && <p><small>关于「{event.details.ruleText}」</small></p>}
                    <p>{event.details.quote ?? event.details.text}</p>
                  </li>)}</ul>}
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
            <HeartObserver revision={gameState.revision} refreshKey={heartObservationRefresh} initiallyOpen />
            <div className="debug-grid">
              <article><h2>当前状态</h2><pre>{JSON.stringify({ day: gameState.day, time: formatClock(gameState.currentMinute), period: gameState.period, phase: gameState.phase, conversationDurationMinutes: gameState.conversationDurationMinutes, currentLocationId: gameState.currentLocationId, activeNpcId: gameState.activeNpcId, interactionMode: gameState.interactionMode, giftItemId: gameState.giftItemId, activeRules: gameState.activeRules, storyFlags: gameState.storyFlags, ending: gameState.ending }, null, 2)}</pre></article>
              <article><h2>物品所有权</h2><pre>{JSON.stringify(bootstrap.items.map((item) => ({ item: item.baseName, owner: gameState.itemOwners[item.id], concept: bootstrap.concepts.find((concept) => concept.id === item.carriedConceptId)?.label })), null, 2)}</pre></article>
              <article className="debug-wide"><h2>NPC 独立状态、位置与结构化记忆</h2><pre>{JSON.stringify(bootstrap.npcs.map((npc) => ({ name: npc.name, godView: npc.godView, locationId: gameState.npcStates[npc.id]?.currentLocationId ?? npc.initialLocationId, relationship: gameState.npcStates[npc.id]?.relationship ?? 0, memories: gameState.npcStates[npc.id]?.memories ?? [] })), null, 2)}</pre></article>
              <article><h2>AI Provider</h2><pre>{JSON.stringify(aiStatus ?? { configured: false }, null, 2)}</pre></article>
              <article><h2>全员对白结构</h2><pre>{JSON.stringify(aiPromptStructure ?? { status: "loading" }, null, 2)}</pre></article>
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
