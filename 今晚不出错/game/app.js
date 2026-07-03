const DATA_FILES = {
  script: "data/script.json",
  rules: "data/rules.json",
  cards: "data/cards.json",
  danmaku: "data/danmaku.json",
  titles: "data/titles.json"
};

const ASSETS = {
  normal: "assets/anchor-normal.svg",
  stuck: "assets/anchor-stuck.svg",
  water: "assets/anchor-water.svg",
  cough: "assets/anchor-cough.svg",
  red: "assets/anchor-red.svg"
};

const HISTORY_KEY = "tonight_no_mistakes_runs";
const SCORE_META = {
  avgRating: { label: "收视率均值", suffix: "", better: "higher" },
  fixRate: { label: "纠错率", suffix: "%", better: "higher" },
  accidents: { label: "社死指数", suffix: "", better: "lower" },
  waterCount: { label: "喝水次数", suffix: "", better: "lower" }
};

const els = {
  app: document.querySelector("#app"),
  startScreen: document.querySelector("#startScreen"),
  startButton: document.querySelector("#startButton"),
  summaryScreen: document.querySelector("#summaryScreen"),
  summaryTitle: document.querySelector("#summaryTitle"),
  summaryCompare: document.querySelector("#summaryCompare"),
  scoreGrid: document.querySelector("#scoreGrid"),
  replayList: document.querySelector("#replayList"),
  restartButton: document.querySelector("#restartButton"),
  copyButton: document.querySelector("#copyButton"),
  teleprompterBody: document.querySelector("#teleprompterBody"),
  choicePopover: document.querySelector("#choicePopover"),
  ratingText: document.querySelector("#ratingText"),
  ratingFill: document.querySelector("#ratingFill"),
  ratingCanvas: document.querySelector("#ratingCanvas"),
  ratingWrap: document.querySelector("#ratingWrap"),
  flashLayer: document.querySelector("#flashLayer"),
  actLabel: document.querySelector("#actLabel"),
  clockChip: document.querySelector("#clockChip"),
  insertDoneButton: document.querySelector("#insertDoneButton"),
  anchorImg: document.querySelector("#anchorImg"),
  anchorStage: document.querySelector("#anchorStage"),
  directorBubble: document.querySelector("#directorBubble"),
  danmakuLayer: document.querySelector("#danmakuLayer"),
  handRow: document.querySelector("#handRow"),
  rulesRow: document.querySelector("#rulesRow"),
  waterButton: document.querySelector("#waterButton"),
  coughButton: document.querySelector("#coughButton"),
  waterCount: document.querySelector("#waterCount"),
  coughCount: document.querySelector("#coughCount")
};

let rawData = null;
let data = null;
let maps = null;
let state = null;
let rafId = 0;
let danmakuClock = 0;
let handRenderClock = 0;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tokenKey(sentenceId, tokenIndex) {
  return `${sentenceId}:${tokenIndex}`;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function tokenLength(token) {
  return Math.max(1, [...token.t].filter((char) => !/[，。！？、,.!?]/.test(char)).length);
}

function isPunctuationToken(token) {
  return /^[，。！？、,.!?；;：:]$/.test(token?.t || "");
}

function isTokenInteractive(token) {
  return token?.interactive !== false && !isPunctuationToken(token);
}

function tokenDuration(token, speed) {
  const roleFactor = ["sponsor", "segue"].includes(token?.role)
    ? 0.48
    : ["breaking", "sponsor-fail", "breaking-fail"].includes(token?.role)
      ? 0.56
      : 1;
  if (/[。！？.!?]/.test(token?.t || "")) return 0.72 * roleFactor;
  if (/[，、,；;：:]/.test(token?.t || "")) return 0.42 * roleFactor;
  return Math.max(0.22, (tokenLength(token) / speed) * roleFactor);
}

function getCardTimeout(card) {
  return card.timeoutSec ?? card.deadline ?? 30;
}

function getCardLabel(card) {
  return card.label || card.name || card.id;
}

function getGapReadText(card) {
  return card.gapReadText || card.readText || getCardLabel(card);
}

function getAwkwardText(card) {
  return card.awkwardText || card.readText || getGapReadText(card);
}

function getSegueText(card, hook) {
  const template = card.segueTemplate || getGapReadText(card);
  return formatTemplate(template, { hook });
}

function hasHookCard(card) {
  return card?.type === "sponsor" && Array.isArray(card.hooks) && card.hooks.length > 0;
}

function tokenMatchesHook(text, hooks = []) {
  const normalized = String(text || "").replace(/\s+/g, "");
  const ordered = [...hooks].sort((a, b) => b.length - a.length);
  return ordered.find((hook) => normalized.includes(String(hook).replace(/\s+/g, ""))) || null;
}

function splitTextToTokens(text, role) {
  const tokens = [];
  let buffer = "";

  const flush = () => {
    while (buffer.length > 0) {
      const take = Math.min(buffer.length, buffer.length <= 4 ? buffer.length : 3);
      tokens.push({ t: buffer.slice(0, take), role, interactive: false });
      buffer = buffer.slice(take);
    }
  };

  [...text].forEach((char) => {
    if (isPunctuationToken({ t: char })) {
      flush();
      tokens.push({ t: char, role, interactive: false });
      return;
    }
    buffer += char;
  });
  flush();
  return tokens;
}

function findParagraphLocationById(paragraphId) {
  for (let actIndex = 0; actIndex < data.script.acts.length; actIndex += 1) {
    const paragraphIndex = data.script.acts[actIndex].paragraphs.findIndex((paragraph) => paragraph.id === paragraphId);
    if (paragraphIndex !== -1) return { actIndex, paragraphIndex };
  }
  return null;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const min = String(Math.floor(total / 60)).padStart(2, "0");
  const sec = String(total % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

async function loadData() {
  if (window.TONIGHT_DATA) {
    rawData = clone(window.TONIGHT_DATA);
    return;
  }

  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, url]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} 加载失败`);
      return [key, await response.json()];
    })
  );
  rawData = Object.fromEntries(entries);
}

function prepareRunData() {
  data = clone(rawData);
  maps = {
    cardsById: new Map(data.cards.cards.map((card) => [card.id, card])),
    sentenceById: new Map(),
    paragraphById: new Map(),
    paragraphLocationById: new Map(),
    rulesByParagraph: new Map(),
    cardsBySpawn: new Map()
  };

  data.script.acts.forEach((act, actIndex) => {
    act.paragraphs.forEach((paragraph, paragraphIndex) => {
      maps.paragraphById.set(paragraph.id, paragraph);
      maps.paragraphLocationById.set(paragraph.id, { actIndex, paragraphIndex });
      paragraph.sentences.forEach((sentence) => {
        sentence.errors = sentence.errors || [];
        maps.sentenceById.set(sentence.id, sentence);
      });
    });
  });

  data.rules.rules.forEach((rule) => {
    const list = maps.rulesByParagraph.get(rule.announceAt) || [];
    list.push(rule);
    maps.rulesByParagraph.set(rule.announceAt, list);
  });

  data.cards.cards.forEach((card) => {
    if (!card.spawnAt) return;
    const list = maps.cardsBySpawn.get(card.spawnAt) || [];
    list.push(card);
    maps.cardsBySpawn.set(card.spawnAt, list);
  });
}

function createInitialState() {
  return {
    status: "idle",
    actIndex: 0,
    paragraphIndex: 0,
    sentenceIndex: 0,
    tokenIndex: 0,
    tokenElapsed: 0,
    elapsed: 0,
    rating: 50,
    ratingSamples: [50],
    lastSampleAt: 0,
    gapPause: 0,
    previewPause: 0,
    pause: 0,
    choice: null,
    activeRules: [],
    announcedRuleIds: new Set(),
    injectedRuleIds: new Set(),
    tokenStates: new Map(),
    countedErrorKeys: new Set(),
    pendingCards: [],
    selectedCardInstanceId: null,
    insertMode: false,
    rereadHookWindow: null,
    queuedBreakingParagraphId: null,
    returnTo: null,
    cardSeq: 0,
    runtimeSeq: 0,
    dutyIssuedAt: new Map(),
    lastRedzoneBurstAt: -99,
    sentenceHadAccident: false,
    sentenceSkipped: false,
    sentenceMisclickFreeUsed: false,
    audioCtx: null,
    lastFrameAt: 0,
    logs: [],
    copyText: "",
    stats: {
      totalErrors: 0,
      fixedErrors: 0,
      accidents: 0,
      commonErrors: 0,
      fixWrongCount: 0,
      misclicks: 0,
      waterCount: 0,
      coughCount: 0,
      coughLeft: 2,
      sponsorTotal: 0,
      sponsorOnTime: 0,
      sponsorTimeout: 0
    }
  };
}

function currentAct() {
  return data.script.acts[state.actIndex];
}

function currentParagraph() {
  return currentAct().paragraphs[state.paragraphIndex];
}

function currentSentence() {
  return currentParagraph().sentences[state.sentenceIndex];
}

function currentToken() {
  const sentence = currentSentence();
  return sentence ? sentence.tokens[state.tokenIndex] : null;
}

function getError(sentence, tokenIndex) {
  return (sentence.errors || []).find((error) => error.tokenIndex === tokenIndex) || null;
}

function getTokenText(sentence, tokenIndex) {
  const key = tokenKey(sentence.id, tokenIndex);
  const tokenState = state.tokenStates.get(key);
  return tokenState?.replacement || sentence.tokens[tokenIndex].t;
}

function sentenceText(sentence) {
  return sentence.tokens.map((_, index) => getTokenText(sentence, index)).join("");
}

function originalSentenceText(sentence) {
  return sentence.tokens.map((token) => token.t).join("");
}

function markSentenceErrors(sentence) {
  (sentence.errors || []).forEach((error) => {
    const key = tokenKey(sentence.id, error.tokenIndex);
    if (!state.countedErrorKeys.has(key)) {
      state.countedErrorKeys.add(key);
      state.stats.totalErrors += 1;
    }
  });
}

function startGame() {
  prepareRunData();
  state = createInitialState();
  state.status = "running";
  ensureAudio();
  els.startScreen.hidden = true;
  els.summaryScreen.hidden = true;
  els.choicePopover.hidden = true;
  danmakuClock = 0;
  handRenderClock = 0;
  startParagraph(0, firstVisibleParagraphIndex(data.script.acts[0], 0));
  setAnchorState("normal");
  renderAll();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
}

function firstVisibleParagraphIndex(act, startAt) {
  for (let index = startAt; index < act.paragraphs.length; index += 1) {
    if (!act.paragraphs[index].hidden) return index;
  }
  return -1;
}

function startParagraph(actIndex, paragraphIndex) {
  state.actIndex = actIndex;
  state.paragraphIndex = paragraphIndex;
  state.sentenceIndex = 0;
  state.tokenIndex = 0;
  state.tokenElapsed = 0;
  state.gapPause = 0;
  state.previewPause = currentParagraph()?.runtimeType === "sponsor" ? 0.8 : currentParagraph()?.hidden ? 1.1 : 2.5;
  state.pause = state.previewPause;
  state.sentenceHadAccident = false;
  state.sentenceSkipped = false;
  state.sentenceMisclickFreeUsed = false;

  const paragraph = currentParagraph();
  announceRulesForParagraph(paragraph.id);
  issueDutyCardsForParagraph(paragraph);
  issueSpawnCardsForParagraph(paragraph.id);
  markSentenceErrors(currentSentence());
  renderAll();
}

function announceRulesForParagraph(paragraphId) {
  const rules = maps.rulesByParagraph.get(paragraphId) || [];
  rules.forEach((rule) => {
    if (state.announcedRuleIds.has(rule.id)) return;
    state.announcedRuleIds.add(rule.id);
    state.activeRules.push(rule);
    injectRuleHits(rule);
    showDirector(rule.announce);
    recordLog({
      type: "rule",
      label: `新台规：${rule.title}`,
      detail: rule.announce
    });
  });
}

function injectRuleHits(rule) {
  if (state.injectedRuleIds.has(rule.id)) return;
  state.injectedRuleIds.add(rule.id);
  (rule.hitTokens || []).forEach((hit) => {
    const sentence = maps.sentenceById.get(hit.sentenceId);
    if (!sentence) return;
    const exists = sentence.errors.some(
      (error) => error.ruleId === rule.id && error.tokenIndex === hit.tokenIndex
    );
    if (exists) return;
    sentence.errors.push({
      tokenIndex: hit.tokenIndex,
      type: "rule",
      correct: hit.correct,
      distractors: hit.distractors,
      difficulty: 2,
      ruleId: rule.id
    });
  });
}

function issueDutyCardsForParagraph(paragraph) {
  if (paragraph.hidden || paragraph.runtime) return;
  state.activeRules
    .filter((rule) => rule.type === "duty" && rule.duty?.cardId)
    .forEach((rule) => {
      const lastIssuedAt = state.dutyIssuedAt.get(rule.id);
      const intervalSec = rule.duty.intervalSec ?? 60;
      const shouldIssue = lastIssuedAt == null || state.elapsed - lastIssuedAt >= intervalSec;
      if (!shouldIssue) return;
      if (state.pendingCards.some((item) => item.cardId === rule.duty.cardId)) return;
      issueCard(rule.duty.cardId, "duty");
      state.dutyIssuedAt.set(rule.id, state.elapsed);
    });
}

function issueSpawnCardsForParagraph(paragraphId) {
  const cards = maps.cardsBySpawn.get(paragraphId) || [];
  cards.forEach((card) => issueCard(card.id, "script"));
}

function issueCard(cardId, reason) {
  const card = maps.cardsById.get(cardId);
  if (!card) return;
  if (state.pendingCards.some((item) => item.cardId === cardId)) return;

  const instance = {
    instanceId: `card-${++state.cardSeq}`,
    cardId,
    reason,
    remaining: getCardTimeout(card),
    total: getCardTimeout(card)
  };

  state.pendingCards.push(instance);
  if (card.type === "sponsor") state.stats.sponsorTotal += 1;
  burstDanmaku(card.type === "breaking" ? "breaking" : "sponsor", 5);
  showDirector(
    card.type === "breaking"
      ? "导播：突发稿来了，拖到任意两个词之间，排好点结束。"
      : `导播：${getCardLabel(card)}来了，拖到任意两个词之间，点结束后他再念。`
  );
}

function gameLoop(now) {
  if (!state || state.status !== "running") return;
  const dt = state.lastFrameAt ? Math.min(0.08, (now - state.lastFrameAt) / 1000) : 0;
  state.lastFrameAt = now;

  if (state.insertMode) {
    rafId = requestAnimationFrame(gameLoop);
    return;
  }

  state.elapsed += dt;
  tickRatingSamples();
  tickCards(dt);
  tickDanmaku(dt);
  tickClock();
  const rereadExpired = expireRereadHookWindow();
  if (rereadExpired) renderTeleprompter();

  if (state.choice) {
    tickChoice(dt);
  } else if (state.pause > 0) {
    state.pause = Math.max(0, state.pause - dt);
    state.previewPause = Math.min(state.previewPause, state.pause);
    if (state.pause === 0) {
      state.previewPause = 0;
      setAnchorState(state.rating <= 20 ? "red" : "normal");
      renderTeleprompter();
    }
  } else if (state.gapPause > 0) {
    state.gapPause = Math.max(0, state.gapPause - dt);
    if (state.gapPause === 0) moveToNextParagraph();
  } else {
    tickCursor(dt);
  }

  rafId = requestAnimationFrame(gameLoop);
}

function tickRatingSamples() {
  if (state.elapsed - state.lastSampleAt < 1) return;
  state.lastSampleAt = state.elapsed;
  state.ratingSamples.push(state.rating);
  if (state.ratingSamples.length > 240) state.ratingSamples.shift();
  drawRatingChart();
}

function tickClock() {
  els.clockChip.textContent = formatTime(state.elapsed);
}

function tickCards(dt) {
  if (!state.pendingCards.length) return;
  let changed = false;
  state.pendingCards.forEach((instance) => {
    instance.remaining -= dt;
    if (instance.remaining <= 0) changed = true;
  });

  const timedOut = state.pendingCards.filter((instance) => instance.remaining <= 0);
  timedOut.forEach(handleCardTimeout);
  if (timedOut.length) {
    state.pendingCards = state.pendingCards.filter((instance) => instance.remaining > 0);
    if (!state.pendingCards.some((item) => item.instanceId === state.selectedCardInstanceId)) {
      state.selectedCardInstanceId = null;
    }
    renderAll();
    return;
  }

  handRenderClock += dt;
  if (changed || handRenderClock > 0.2) {
    handRenderClock = 0;
    renderHand();
  }
}

function tickDanmaku(dt) {
  danmakuClock += dt;
  const rate = data.danmaku.burst.normalPerSec || 0.8;
  if (danmakuClock < 1 / rate) return;
  danmakuClock = 0;
  addDanmaku("idle");
}

function tickChoice(dt) {
  state.choice.remaining -= dt;
  const countdown = els.choicePopover.querySelector("[data-choice-countdown]");
  if (countdown) countdown.textContent = `${Math.ceil(Math.max(0, state.choice.remaining))}s`;
  if (state.choice.remaining <= 0) submitChoice(null);
}

function tickCursor(dt) {
  const token = currentToken();
  if (!token) return;
  const duration = tokenDuration(token, currentAct().cursorSpeed);
  state.tokenElapsed += dt;
  if (state.tokenElapsed < duration) return;

  processTokenBeforeLeaving();
  playSound(isPunctuationToken(token) ? "softTick" : "tick");
  state.tokenElapsed = 0;
  state.tokenIndex += 1;

  const sentence = currentSentence();
  if (state.tokenIndex >= sentence.tokens.length) {
    finishSentence();
  }

  renderTeleprompter();
  renderRating();
}

function processTokenBeforeLeaving() {
  const sentence = currentSentence();
  const tokenIndex = state.tokenIndex;
  const token = sentence.tokens[tokenIndex];
  if (token?.finishEvent && !token.finishEvent.done) {
    finishTokenReadEvent(token.finishEvent);
  }

  const error = getError(sentence, tokenIndex);
  if (!error) return;

  const key = tokenKey(sentence.id, tokenIndex);
  const tokenState = state.tokenStates.get(key);
  if (["corrected", "skipped", "smooth-hook", "clash-hook"].includes(tokenState?.status)) return;
  if (tokenState?.status === "accident") return;

  const wasWrongChoice = tokenState?.status === "wrong-choice";
  const spoken = tokenState?.replacement || sentence.tokens[tokenIndex].t;
  const pool = wasWrongChoice ? "err_fixwrong" : `err_${error.type}`;
  const penalty = wasWrongChoice ? -4 : error.type === "rule" ? -4 : -5;

  state.tokenStates.set(key, {
    status: "accident",
    replacement: spoken,
    error
  });

  state.stats.accidents += 1;
  if (error.type === "common") state.stats.commonErrors += 1;
  state.sentenceHadAccident = true;
  adjustRating(penalty);
  showFeedback(
    "bad",
    `${wasWrongChoice ? "改错失败" : error.type === "rule" ? "违反台规" : "播出事故"} ${formatDelta(penalty)}`
  );
  burstDanmaku(pool, wasWrongChoice ? 7 : 8);
  playSound("bad");
  setAnchorState(state.rating <= 20 ? "red" : "stuck");
  recordLog({
    type: wasWrongChoice ? "fixwrong" : "accident",
    label: wasWrongChoice ? "改错失败" : error.type === "rule" ? "违反台规" : "播出事故",
    sentence: originalSentenceText(sentence),
    spoken,
    correct: error.correct,
    danmaku: pickPool(pool)
  });
}

function finishSentence() {
  const sentence = currentSentence();
  if (sentence.finishEvent && !sentence.finishEvent.done) {
    finishInsertedRead(sentence);
  } else if (!sentence.inserted && !state.sentenceHadAccident && !state.sentenceSkipped) {
    adjustRating(1);
    if (Math.random() < 0.28) addDanmaku("clean", true);
  }
  state.sentenceIndex += 1;
  state.tokenIndex = 0;
  state.tokenElapsed = 0;
  state.sentenceHadAccident = false;
  state.sentenceSkipped = false;

  const paragraph = currentParagraph();
  if (state.sentenceIndex >= paragraph.sentences.length) {
    completeParagraph(paragraph);
    state.gapPause = paragraph.gapAfter ? 1.8 : 0.35;
    renderTeleprompter();
    return;
  }

  markSentenceErrors(currentSentence());
  state.sentenceMisclickFreeUsed = false;
}

function finishInsertedRead(sentence) {
  const event = sentence.finishEvent;
  finishReadEvent(event, sentenceText(sentence));
}

function finishTokenReadEvent(event) {
  finishReadEvent(event, event.spokenText || "");
}

function finishReadEvent(event, spokenText) {
  if (!event || event.done) return;
  event.done = true;

  if (event.kind === "smooth" || event.kind === "safe") {
    if (event.cardType !== "breaking") state.stats.sponsorOnTime += 1;
    adjustRating(event.delta);
    showFeedback("good", `${event.kind === "smooth" ? "丝滑口播" : "口播"}播完 ${formatDelta(event.delta)}`);
    burstDanmaku(event.kind === "smooth" ? "smooth" : "praise_sponsor", 9);
    playSound("ding");
    showDirector(`导播：${event.cardLabel}播完了，甲方这口气顺了。`);
    recordLog({
      type: event.kind === "smooth" ? "sponsor-smooth" : "sponsor",
      label: event.kind === "smooth" ? "丝滑口播播出" : "赞助口播播出",
      sentence: event.sourceSentence,
      spoken: spokenText,
      detail: event.cardLabel
    });
    return;
  }

  if (event.kind === "breaking") {
    adjustRating(event.delta);
    showFeedback("good", `突发稿播完 ${formatDelta(event.delta)}`);
    burstDanmaku("breaking", 7);
    playSound("ding");
    recordLog({
      type: "breaking",
      label: "突发稿播出",
      sentence: event.sourceSentence,
      spoken: spokenText,
      detail: event.cardLabel
    });
    return;
  }

  state.stats.accidents += 1;
  adjustRating(event.delta);
  playSound("bad");
  setAnchorState(state.rating <= 20 ? "red" : "stuck");

  if (event.kind === "clash") {
    showFeedback("bad", `气氛撞车 ${formatDelta(event.delta)}`);
    burstDanmaku("clash", 10);
    recordLog({
      type: "sponsor-clash",
      label: "气氛撞车",
      sentence: event.sourceSentence,
      spoken: spokenText,
      correct: "沉重新闻别硬接口播"
    });
    return;
  }

  showFeedback("bad", `${event.cardType === "sponsor" ? "尬接口播" : "突发稿硬插"} ${formatDelta(event.delta)}`);
  burstDanmaku(event.cardType === "sponsor" ? "sponsor_fail" : "breaking", 10);
  recordLog({
    type: "card-mid-sentence",
    label: event.cardType === "sponsor" ? "赞助词尬插" : "突发稿硬插",
    sentence: event.sourceSentence,
    spoken: spokenText,
    correct: "应该找空档或钩子词"
  });
}

function completeParagraph(paragraph) {
  if (paragraph.runtimeType !== "sponsor" || paragraph.rewarded) return;
  paragraph.rewarded = true;
  const reward = paragraph.sourceCard?.rewards?.onTime || 4;
  state.stats.sponsorOnTime += 1;
  adjustRating(reward);
  showFeedback("good", `口播完整播出 +${reward}`);
  burstDanmaku("praise_sponsor", 8);
  playSound("ding");
  showDirector("导播：甲方满意，刚才那段口播算钱。");
  recordLog({
    type: "sponsor",
    label: "赞助口播播出",
    detail: paragraph.sourceCard ? getGapReadText(paragraph.sourceCard) : sentenceText(paragraph.sentences[0])
  });
}

function moveToNextParagraph() {
  const paragraph = currentParagraph();
  if (!paragraph.hidden && state.queuedBreakingParagraphId) {
    const returnTo = findNextVisibleLocation(state.actIndex, state.paragraphIndex + 1);
    state.returnTo = returnTo;
    const location = findParagraphLocationById(state.queuedBreakingParagraphId);
    state.queuedBreakingParagraphId = null;
    if (location) {
      startParagraph(location.actIndex, location.paragraphIndex);
      return;
    }
  }

  if (paragraph.hidden && state.returnTo) {
    const target = state.returnTo;
    state.returnTo = null;
    startParagraph(target.actIndex, target.paragraphIndex);
    return;
  }

  const next = findNextVisibleLocation(state.actIndex, state.paragraphIndex + 1);
  if (!next) {
    endGame("complete");
    return;
  }
  startParagraph(next.actIndex, next.paragraphIndex);
}

function findNextVisibleLocation(actIndex, startParagraphIndex) {
  for (let a = actIndex; a < data.script.acts.length; a += 1) {
    const act = data.script.acts[a];
    const start = a === actIndex ? startParagraphIndex : 0;
    const paragraphIndex = firstVisibleParagraphIndex(act, start);
    if (paragraphIndex !== -1) return { actIndex: a, paragraphIndex };
  }
  return null;
}

function isTokenSpoken(sentenceIndex, tokenIndex) {
  if (sentenceIndex < state.sentenceIndex) return true;
  if (sentenceIndex > state.sentenceIndex) return false;
  return tokenIndex < state.tokenIndex;
}

function handleTokenClick(event) {
  if (state.status !== "running" || state.choice) return;
  if (state.insertMode) return;
  const tokenEl = event.currentTarget;
  const sentenceId = tokenEl.dataset.sentenceId;
  const tokenIndex = Number(tokenEl.dataset.tokenIndex);
  const sentenceIndex = Number(tokenEl.dataset.sentenceIndex);
  const sentence = maps.sentenceById.get(sentenceId);
  if (!sentence) return;

  if (!isTokenInteractive(sentence.tokens[tokenIndex])) return;

  if (state.selectedCardInstanceId) {
    if (isTokenSpoken(sentenceIndex, tokenIndex)) return;
    placeSelectedCardMidSentence(sentence, tokenIndex);
    return;
  }

  if (isTokenSpoken(sentenceIndex, tokenIndex)) return;

  const key = tokenKey(sentence.id, tokenIndex);
  const tokenState = state.tokenStates.get(key);
  if (tokenState?.status === "corrected" || tokenState?.status === "accident") return;

  const error = getError(sentence, tokenIndex);
  if (error) {
    openChoice(sentence, tokenIndex, error, tokenEl);
  } else {
    handleMisclick(sentence, sentenceIndex, tokenIndex);
  }
}

function openChoice(sentence, tokenIndex, error, tokenEl) {
  state.choice = {
    sentenceId: sentence.id,
    tokenIndex,
    error,
    remaining: 3.5,
    options: shuffle([error.correct, ...(error.distractors || [])])
  };
  setAnchorState("stuck");
  renderChoicePopover(tokenEl);
}

function renderChoicePopover(tokenEl) {
  const choice = state.choice;
  if (!choice) {
    els.choicePopover.hidden = true;
    return;
  }

  els.choicePopover.innerHTML = `
    <div class="choice-title">
      <span>他卡住了，正确的说法是——</span>
      <strong data-choice-countdown>${Math.ceil(choice.remaining)}s</strong>
    </div>
    <div class="choice-list">
      ${choice.options
        .map((option) => `<button class="choice-option" type="button" data-choice="${escapeHtml(option)}">${escapeHtml(option)}</button>`)
        .join("")}
    </div>
  `;
  els.choicePopover.hidden = false;
  els.choicePopover.querySelectorAll(".choice-option").forEach((button) => {
    button.addEventListener("click", () => submitChoice(button.dataset.choice));
  });

  const panelRect = document.querySelector(".teleprompter-panel").getBoundingClientRect();
  const tokenRect = tokenEl.getBoundingClientRect();
  const popRect = els.choicePopover.getBoundingClientRect();
  const left = clamp(tokenRect.left - panelRect.left, 12, panelRect.width - popRect.width - 12);
  let top = tokenRect.bottom - panelRect.top + 8;
  if (top + popRect.height > panelRect.height - 10) {
    top = tokenRect.top - panelRect.top - popRect.height - 8;
  }
  els.choicePopover.style.left = `${Math.max(12, left)}px`;
  els.choicePopover.style.top = `${Math.max(12, top)}px`;
}

function submitChoice(value) {
  if (!state.choice) return;
  const { sentenceId, tokenIndex, error } = state.choice;
  const sentence = maps.sentenceById.get(sentenceId);
  const key = tokenKey(sentenceId, tokenIndex);

  if (value === error.correct) {
    state.tokenStates.set(key, {
      status: "corrected",
      replacement: error.correct,
      error
    });
    state.stats.fixedErrors += 1;
    adjustRating(3);
    showFeedback("good", "改对了 +3");
    burstDanmaku("praise", 7);
    playSound("ding");
    openRereadHookWindow(sentence, tokenIndex, error.correct);
    recordLog({
      type: "fix",
      label: "成功纠错",
      sentence: originalSentenceText(sentence),
      spoken: sentence.tokens[tokenIndex].t,
      correct: error.correct
    });
  } else if (value == null) {
    recordLog({
      type: "choice-timeout",
      label: "纠错超时",
      sentence: originalSentenceText(sentence),
      spoken: sentence.tokens[tokenIndex].t,
      correct: error.correct
    });
  } else {
    const replacement = value || sentence.tokens[tokenIndex].t;
    state.tokenStates.set(key, {
      status: "wrong-choice",
      replacement,
      error
    });
    state.stats.fixWrongCount += 1;
    showFeedback("bad", "改错方向了，这句还是要出事故");
    burstDanmaku("err_fixwrong", 4);
    playSound("bad");
  }

  state.choice = null;
  els.choicePopover.hidden = true;
  state.pause = 0.18;
  setAnchorState(state.rating <= 20 ? "red" : "normal");
  renderAll();
}

function openRereadHookWindow(sentence, tokenIndex, hookText) {
  const hasPendingHook = state.pendingCards.some((instance) => {
    const card = maps.cardsById.get(instance.cardId);
    return hasHookCard(card) && tokenMatchesHook(hookText, card.hooks);
  });
  if (!hasPendingHook) return;

  state.rereadHookWindow = {
    sentenceId: sentence.id,
    tokenIndex,
    hookText,
    until: state.elapsed + 0.8
  };
  showFeedback("neutral", "这个词能接口播");
}

function handleMisclick(sentence, sentenceIndex, tokenIndex) {
  const key = tokenKey(sentence.id, tokenIndex);
  state.tokenStates.set(key, {
    status: "misclick",
    replacement: sentence.tokens[tokenIndex].t
  });
  state.stats.misclicks += 1;
  const freeMisclick = !state.sentenceMisclickFreeUsed;
  state.sentenceMisclickFreeUsed = true;
  if (freeMisclick) {
    showFeedback("neutral", "手滑一次不算");
    burstDanmaku("misclick_soft", 2);
  } else {
    state.sentenceHadAccident = true;
    adjustRating(-1);
    burstDanmaku("misclick", 3);
    playSound("bad");
  }
  recordLog({
    type: "misclick",
    label: freeMisclick ? "误点提醒" : "误点",
    sentence: originalSentenceText(sentence),
    spoken: sentence.tokens[tokenIndex].t,
    correct: freeMisclick ? "手滑一次不算，再点就要扣了" : "别点它"
  });
  renderAll();
}

function handleCardTimeout(instance) {
  const card = maps.cardsById.get(instance.cardId);
  const delta = card.rewards?.timeout || -6;
  adjustRating(delta);

  if (card.type === "sponsor") {
    state.stats.sponsorTimeout += 1;
    showFeedback("bad", `广告超时 ${formatDelta(delta)}`);
    burstDanmaku("sponsor_fail", 8);
    recordLog({
      type: "sponsor-timeout",
      label: "赞助超时",
      detail: `${getCardLabel(card)} 没赶上空档，广告爸爸不高兴`
    });
  } else if (card.type === "breaking") {
    state.queuedBreakingParagraphId = card.paragraphRef;
    showFeedback("bad", `突发稿砸脸 ${formatDelta(delta)}`);
    burstDanmaku("breaking", 8);
    recordLog({
      type: "breaking-timeout",
      label: "突发稿超时",
      detail: "导播决定稍后强插"
    });
  }
}

function selectedCardInstance() {
  return state.pendingCards.find((item) => item.instanceId === state.selectedCardInstanceId) || null;
}

function selectedCard() {
  const instance = selectedCardInstance();
  return instance ? maps.cardsById.get(instance.cardId) : null;
}

function selectCard(instanceId) {
  state.selectedCardInstanceId = state.selectedCardInstanceId === instanceId ? null : instanceId;
  renderHand();
  renderTeleprompter();
}

function beginInsertMode(instanceId, options = {}) {
  if (!state || state.status !== "running" || state.choice) return;
  const instance = state.pendingCards.find((item) => item.instanceId === instanceId);
  if (!instance) return;
  state.selectedCardInstanceId = instanceId;
  state.insertMode = true;
  showFeedback("neutral", "拖到两个词之间，点结束后开念");
  showDirector("导播：播报先停一下，把卡拖到任意两个词之间，排好点结束。");
  if (options.fromDrag) {
    renderTeleprompter();
    renderInsertControls();
  } else {
    renderAll();
  }
}

function endInsertMode() {
  if (!state?.insertMode) return;
  state.insertMode = false;
  state.selectedCardInstanceId = null;
  if (state.previewPause > 0) {
    state.previewPause = 0;
    state.pause = 0;
  }
  state.tokenElapsed = 0;
  showFeedback("neutral", "继续播");
  setAnchorState(state.rating <= 20 ? "red" : "normal");
  renderAll();
}

function findNextRealTokenIndex(sentence, startIndex) {
  for (let index = startIndex; index < sentence.tokens.length; index += 1) {
    if (!isPunctuationToken(sentence.tokens[index])) return index;
  }
  return -1;
}

function tokenHasUnresolvedError(sentence, tokenIndex) {
  const error = getError(sentence, tokenIndex);
  if (!error) return false;
  const tokenState = state.tokenStates.get(tokenKey(sentence.id, tokenIndex));
  return !["corrected", "skipped", "smooth-hook", "clash-hook"].includes(tokenState?.status);
}

function expireRereadHookWindow() {
  if (state.rereadHookWindow && state.elapsed > state.rereadHookWindow.until) {
    state.rereadHookWindow = null;
    return true;
  }
  return false;
}

function findHookWindow(card) {
  if (!hasHookCard(card) || !state || state.status !== "running") return null;
  expireRereadHookWindow();

  if (state.rereadHookWindow) {
    const reread = state.rereadHookWindow;
    const hook = tokenMatchesHook(reread.hookText, card.hooks);
    const sentence = maps.sentenceById.get(reread.sentenceId);
    if (hook && sentence) {
      return {
        sentence,
        tokenIndex: reread.tokenIndex,
        hook,
        fromReread: true,
        unresolvedError: false,
        paragraph: currentParagraph()
      };
    }
  }

  if (state.choice || state.pause > 0 || state.gapPause > 0) return null;
  const sentence = currentSentence();
  if (!sentence) return null;

  const candidateIndexes = [state.tokenIndex, findNextRealTokenIndex(sentence, state.tokenIndex + 1)]
    .filter((index) => index >= 0 && index < sentence.tokens.length);
  const seen = new Set();
  for (const tokenIndex of candidateIndexes) {
    if (seen.has(tokenIndex)) continue;
    seen.add(tokenIndex);
    const hook = tokenMatchesHook(getTokenText(sentence, tokenIndex), card.hooks);
    if (!hook) continue;
    return {
      sentence,
      tokenIndex,
      hook,
      fromReread: false,
      unresolvedError: tokenHasUnresolvedError(sentence, tokenIndex),
      paragraph: currentParagraph()
    };
  }
  return null;
}

function consumeCardInstance(instance) {
  state.pendingCards = state.pendingCards.filter((item) => item.instanceId !== instance.instanceId);
  if (state.selectedCardInstanceId === instance.instanceId) state.selectedCardInstanceId = null;
}

function insertReadSentenceAt(paragraph, insertIndex, text, role, finishEvent) {
  const insertedSentence = {
    id: `rt_insert_${++state.runtimeSeq}s1`,
    inserted: true,
    insertedRole: role,
    tokens: splitTextToTokens(text, role),
    errors: [],
    finishEvent
  };

  const safeIndex = clamp(insertIndex, 0, paragraph.sentences.length);
  paragraph.sentences.splice(safeIndex, 0, insertedSentence);
  maps.sentenceById.set(insertedSentence.id, insertedSentence);
  if (safeIndex < state.sentenceIndex) state.sentenceIndex += 1;
  return insertedSentence;
}

function insertReadSentenceAfter(targetSentence, text, role, finishEvent) {
  const paragraph = currentParagraph();
  const sentenceIndex = paragraph.sentences.findIndex((sentence) => sentence.id === targetSentence.id);
  if (sentenceIndex === -1) return null;
  return insertReadSentenceAt(paragraph, sentenceIndex + 1, text, role, finishEvent);
}

function shiftTokenStates(sentenceId, startIndex, offset) {
  const nextStates = new Map();
  state.tokenStates.forEach((value, key) => {
    const [keySentenceId, rawIndex] = key.split(":");
    const index = Number(rawIndex);
    if (keySentenceId === sentenceId && index >= startIndex) {
      nextStates.set(tokenKey(sentenceId, index + offset), value);
    } else {
      nextStates.set(key, value);
    }
  });
  state.tokenStates = nextStates;
}

function insertReadTokensAt(sentence, insertIndex, text, role, finishEvent) {
  const tokens = splitTextToTokens(text, role);
  if (!tokens.length) return [];
  const safeIndex = clamp(insertIndex, 0, sentence.tokens.length);
  const runId = `rt_run_${++state.runtimeSeq}`;
  tokens.forEach((token) => {
    token.inserted = true;
    token.insertedRunId = runId;
  });
  if (finishEvent) {
    finishEvent.spokenText = text;
    tokens[tokens.length - 1].finishEvent = finishEvent;
  }

  shiftTokenStates(sentence.id, safeIndex, tokens.length);
  sentence.tokens.splice(safeIndex, 0, ...tokens);
  (sentence.errors || []).forEach((error) => {
    if (error.tokenIndex >= safeIndex) error.tokenIndex += tokens.length;
  });
  if (sentence === currentSentence() && safeIndex < state.tokenIndex) {
    state.tokenIndex += tokens.length;
  }
  return tokens;
}

function isTokenInsertionSlotAvailable(sentenceIndex, tokenIndex) {
  const paragraph = currentParagraph();
  const sentence = paragraph?.sentences[sentenceIndex];
  if (!sentence || tokenIndex < 0 || tokenIndex > sentence.tokens.length) return false;
  if (sentenceIndex > state.sentenceIndex) return true;
  if (sentenceIndex < state.sentenceIndex) return false;
  return tokenIndex >= state.tokenIndex;
}

function tokenInsertionContext(sentence, tokenIndex) {
  const before = sentence.tokens[tokenIndex - 1]?.t;
  const after = sentence.tokens[tokenIndex]?.t;
  if (before && after) return `插在「${before}」和「${after}」之间`;
  if (after) return `插在「${after}」之前`;
  if (before) return `插在「${before}」之后`;
  return `插入句子`;
}

function placeCardAtTokenSlot(instance, sentenceId, sentenceIndex, tokenIndex) {
  const card = maps.cardsById.get(instance.cardId);
  const sentence = maps.sentenceById.get(sentenceId);
  if (!card || !sentence || !isTokenInsertionSlotAvailable(sentenceIndex, tokenIndex)) {
    showFeedback("neutral", "这里已经播过去了，换后面的词缝");
    return false;
  }

  const context = tokenInsertionContext(sentence, tokenIndex);
  if (card.type === "sponsor") {
    insertReadTokensAt(sentence, tokenIndex, getGapReadText(card), "sponsor", {
      kind: "safe",
      delta: card.rewards?.onTime ?? 3,
      cardType: card.type,
      cardLabel: getCardLabel(card),
      sourceSentence: context
    });
    showDirector(`导播：${getCardLabel(card)}插进这个词缝了，点结束后从这里念。`);
  } else if (card.type === "breaking") {
    const breakingParagraph = maps.paragraphById.get(card.paragraphRef);
    const sourceTexts = breakingParagraph?.sentences?.length
      ? breakingParagraph.sentences.map((sourceSentence) => sourceSentence.tokens.map((token) => token.t).join(""))
      : [getCardLabel(card)];
    const joinedText = sourceTexts.join("");
    insertReadTokensAt(sentence, tokenIndex, joinedText, "breaking", {
      kind: "breaking",
      delta: card.rewards?.onTime ?? 1,
      cardType: card.type,
      cardLabel: getCardLabel(card),
      sourceSentence: context
    });
    showDirector("导播：突发稿插进这个词缝了，点结束后他会直接念进去。");
  }

  consumeCardInstance(instance);
  showFeedback("neutral", "已插入词缝，点结束开始念");
  renderAll();
  return true;
}

function applySmoothSegue(instance, card, hookWindow) {
  const sentence = hookWindow.sentence;
  const hookText = getTokenText(sentence, hookWindow.tokenIndex);
  const segueText = getSegueText(card, hookWindow.hook);
  const reward = card.rewards?.smooth ?? 8;
  const inserted = insertReadSentenceAfter(sentence, segueText, "segue", {
    kind: "smooth",
    delta: reward,
    cardLabel: getCardLabel(card),
    sourceSentence: originalSentenceText(sentence)
  });
  if (!inserted) return false;
  state.tokenStates.set(tokenKey(sentence.id, hookWindow.tokenIndex), {
    status: "smooth-hook",
    replacement: hookText
  });
  consumeCardInstance(instance);
  state.rereadHookWindow = null;

  showFeedback("neutral", "口播已插入，当前句后念");
  showDirector(`导播：接住了，${getCardLabel(card)}这段排在当前句后。`);
  renderAll();
  return true;
}

function applyClashSegue(instance, card, hookWindow) {
  const sentence = hookWindow.sentence;
  const hookText = getTokenText(sentence, hookWindow.tokenIndex);
  const segueText = getSegueText(card, hookWindow.hook);
  const delta = card.rewards?.clash ?? -8;
  const inserted = insertReadSentenceAfter(sentence, segueText, "sponsor-fail", {
    kind: "clash",
    delta,
    cardLabel: getCardLabel(card),
    sourceSentence: originalSentenceText(sentence)
  });
  if (!inserted) return false;
  state.tokenStates.set(tokenKey(sentence.id, hookWindow.tokenIndex), {
    status: "clash-hook",
    replacement: hookText
  });
  consumeCardInstance(instance);
  state.rereadHookWindow = null;

  showFeedback("neutral", "口播插进去了，但气氛不太对");
  showDirector("导播：词是接上了，空气好像没接上。");
  renderAll();
  return true;
}

function attemptHookSegue() {
  if (!state || state.status !== "running" || state.choice || state.insertMode) return false;
  const instance = selectedCardInstance();
  const card = selectedCard();
  if (!instance || !card) {
    showFeedback("neutral", "先选一张口播卡");
    return false;
  }
  if (!hasHookCard(card)) {
    showFeedback("neutral", "这张卡只能拖到段落空档");
    return false;
  }

  const hookWindow = findHookWindow(card);
  if (!hookWindow) {
    const sentence = currentSentence();
    if (state.pause > 0 || state.gapPause > 0 || !sentence) {
      showFeedback("neutral", "等钩子词亮起来再按 V");
      return false;
    }
    burstDanmaku("hookmiss", 4);
    showDirector("导播：没接上词，只能硬塞了。");
    if (sentence) placeSelectedCardMidSentence(sentence, Math.min(state.tokenIndex, sentence.tokens.length - 1));
    return true;
  }

  if (hookWindow.unresolvedError) {
    burstDanmaku("hookmiss", 5);
    showDirector("导播：那词本身就是错的，先救稿子再接广告。");
    placeSelectedCardMidSentence(hookWindow.sentence, hookWindow.tokenIndex);
    return true;
  }

  if (hookWindow.paragraph?.mood === "heavy") {
    return applyClashSegue(instance, card, hookWindow);
  }

  return applySmoothSegue(instance, card, hookWindow);
}

function placeSelectedCardInGap() {
  if (!state.selectedCardInstanceId) return;
  const instance = selectedCardInstance();
  if (!instance) return;
  placeCardInGap(instance);
}

function placeCardInGap(instance) {
  const card = maps.cardsById.get(instance.cardId);
  if (!card) return;

  if (card.type === "sponsor") {
    insertRuntimeSponsorParagraph(card);
    burstDanmaku("sponsor", 6);
    showDirector("导播：口播排上了，下一段他会完整念出来。");
    recordLog({
      type: "sponsor-queued",
      label: "赞助口播排入",
      detail: getGapReadText(card)
    });
  } else if (card.type === "breaking") {
    state.queuedBreakingParagraphId = card.paragraphRef;
    adjustRating(card.rewards?.onTime || 1);
    burstDanmaku("breaking", 7);
    showDirector("导播：突发稿排上了，当前段落结束后切过去。");
    recordLog({
      type: "breaking",
      label: "突发稿排入",
      detail: getCardLabel(card)
    });
  }

  state.pendingCards = state.pendingCards.filter((item) => item.instanceId !== instance.instanceId);
  state.selectedCardInstanceId = null;
  renderAll();
}

function insertRuntimeSponsorParagraph(card) {
  const id = `rt_sponsor_${++state.runtimeSeq}`;
  const sentence = {
    id: `${id}s1`,
    tokens: splitTextToTokens(getGapReadText(card), "sponsor"),
    errors: []
  };
  const paragraph = {
    id,
    title: `赞助口播：${getCardLabel(card)}`,
    runtime: true,
    runtimeType: "sponsor",
    sourceCard: clone(card),
    gapAfter: false,
    sentences: [sentence]
  };

  currentAct().paragraphs.splice(state.paragraphIndex + 1, 0, paragraph);
  maps.paragraphById.set(paragraph.id, paragraph);
  maps.sentenceById.set(sentence.id, sentence);
}

function placeSelectedCardMidSentence(sentence, tokenIndex) {
  const instance = selectedCardInstance();
  if (!instance) return;
  const card = maps.cardsById.get(instance.cardId);
  const insertedText = getAwkwardText(card);
  const delta = card.rewards?.awkward ?? card.rewards?.midSentence ?? -5;
  const inserted = insertReadSentenceAfter(sentence, insertedText, card.type === "sponsor" ? "sponsor-fail" : "breaking-fail", {
    kind: "awkward",
    delta,
    cardType: card.type,
    cardLabel: getCardLabel(card),
    sourceSentence: originalSentenceText(sentence)
  });
  if (!inserted) return;

  showFeedback("neutral", `${card.type === "sponsor" ? "尬插口播" : "突发硬插"}已排入`);
  showDirector(card.type === "sponsor" ? "导播：行吧，硬插也会念，场面你负责。" : "导播：突发稿硬排进去了，等他念完。");
  consumeCardInstance(instance);
  renderAll();
}

function useWater() {
  if (state.status !== "running" || state.choice || state.insertMode) return;
  state.stats.waterCount += 1;
  state.pause = 3;
  setAnchorState("water");
  const penalty = state.stats.waterCount <= 2 ? 0 : -Math.min(6, state.stats.waterCount - 1);
  if (penalty) adjustRating(penalty);
  burstDanmaku("water", 7, { n: state.stats.waterCount });
  recordLog({
    type: "water",
    label: "喝水暂停",
    detail: `第 ${state.stats.waterCount} 杯`
  });
  renderAll();
}

function useCough() {
  if (state.status !== "running" || state.choice || state.insertMode || state.stats.coughLeft <= 0) return;
  const sentence = currentSentence();
  for (let index = state.tokenIndex; index < sentence.tokens.length; index += 1) {
    state.tokenStates.set(tokenKey(sentence.id, index), {
      status: "skipped",
      replacement: sentence.tokens[index].t
    });
  }
  state.stats.coughLeft -= 1;
  state.stats.coughCount += 1;
  state.sentenceSkipped = true;
  adjustRating(-3);
  burstDanmaku("cough", 8);
  setAnchorState("cough");
  recordLog({
    type: "cough",
    label: "咳嗽跳句",
    sentence: originalSentenceText(sentence),
    detail: "本句跳过，不判事故"
  });
  state.pause = 0.7;
  state.tokenIndex = sentence.tokens.length;
  finishSentence();
  renderAll();
}

function formatDelta(delta) {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function getRunHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (run) =>
        run &&
        Number.isFinite(run.avgRating) &&
        Number.isFinite(run.fixRate) &&
        Number.isFinite(run.accidents) &&
        Number.isFinite(run.waterCount)
    );
  } catch {
    return [];
  }
}

function saveRunHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20)));
  } catch {
    // localStorage can be unavailable in some privacy modes; summary still works without history.
  }
}

function bestRunBy(history, key, better = "higher") {
  if (!history.length) return null;
  return history.reduce((best, run) => {
    if (!best) return run;
    return better === "lower" ? (run[key] < best[key] ? run : best) : run[key] > best[key] ? run : best;
  }, null);
}

function formatScoreValue(key, value) {
  const meta = SCORE_META[key];
  if (key === "fixRate") return `${Math.round(value)}${meta.suffix}`;
  return `${Math.round(value)}${meta.suffix}`;
}

function scoreTrend(key, current, previous) {
  if (!previous) return { text: "首播", className: "neutral" };
  const delta = Math.round(current - previous[key]);
  if (delta === 0) return { text: "持平", className: "neutral" };
  const meta = SCORE_META[key];
  const improved = meta.better === "lower" ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? "↑" : "↓";
  return {
    text: `${arrow}${Math.abs(delta)}`,
    className: improved ? "better" : "worse"
  };
}

function isNewRecord(key, current, history) {
  if (!history.length) return true;
  const meta = SCORE_META[key];
  const best = bestRunBy(history, key, meta.better);
  if (!best) return true;
  return meta.better === "lower" ? current < best[key] : current > best[key];
}

function buildScoreCard(key, current, previous, history) {
  const meta = SCORE_META[key];
  const trend = scoreTrend(key, current, previous);
  const record = isNewRecord(key, current, history);
  return `
    <div class="score-card ${trend.className}">
      ${record ? `<em class="record-badge">新纪录</em>` : ""}
      <span>${meta.label}</span>
      <b>${formatScoreValue(key, current)}</b>
      <small class="score-delta ${trend.className}">${trend.text}</small>
    </div>
  `;
}

function formatRunBrief(run) {
  if (!run) return "";
  return `${run.title}，均值 ${Math.round(run.avgRating)}`;
}

function buildSummaryCompare(currentRun, previousRun, history) {
  if (!history.length) {
    return `你的第 ${currentRun.runNo} 场直播｜首播，从这场起开始记录`;
  }
  const bestAvg = bestRunBy(history, "avgRating", "higher");
  return `你的第 ${currentRun.runNo} 场直播｜上一场：${formatRunBrief(previousRun)}｜历史最佳均值 ${Math.round(
    bestAvg?.avgRating ?? currentRun.avgRating
  )}`;
}

function showFeedback(kind, text) {
  if (!state || state.status !== "running") return;
  const banner = document.createElement("div");
  banner.className = `event-banner ${kind}`;
  banner.textContent = text;
  els.app.appendChild(banner);
  window.setTimeout(() => banner.remove(), 1500);
}

function floatRatingDelta(delta) {
  if (!els.ratingWrap) return;
  const float = document.createElement("span");
  float.className = `rating-float ${delta > 0 ? "up" : "down"}`;
  float.textContent = formatDelta(delta);
  float.style.left = `${52 + Math.floor(Math.random() * 30)}%`;
  els.ratingWrap.appendChild(float);
  window.setTimeout(() => float.remove(), 1100);
}

function flashScreen(delta) {
  if (!els.flashLayer || Math.abs(delta) < 2) return;
  els.flashLayer.classList.remove("flash-good", "flash-bad");
  void els.flashLayer.offsetWidth;
  els.flashLayer.classList.add(delta > 0 ? "flash-good" : "flash-bad");
}

function pulseRatingText(delta) {
  els.ratingText.classList.remove("pulse-up", "pulse-down");
  void els.ratingText.offsetWidth;
  els.ratingText.classList.add(delta > 0 ? "pulse-up" : "pulse-down");
}

function adjustRating(delta) {
  if (!delta) return;
  state.rating = clamp(state.rating + delta, 0, 100);
  if (state.status === "running") {
    floatRatingDelta(delta);
    flashScreen(delta);
    pulseRatingText(delta);
  }
  if (state.rating <= 20) {
    els.app.classList.add("red-alert");
    els.anchorStage.classList.add("redzone");
    if (delta < 0 && state.elapsed - state.lastRedzoneBurstAt > 5) {
      state.lastRedzoneBurstAt = state.elapsed;
      burstDanmaku("redzone", 4);
    }
  } else {
    els.app.classList.remove("red-alert");
    els.anchorStage.classList.remove("redzone");
  }
  renderRating();
  if (state.rating <= 0) endGame("dead");
}

function setAnchorState(mode) {
  let next = mode;
  if (mode === "normal" && state?.rating <= 20) next = "red";
  els.anchorImg.src = ASSETS[next] || ASSETS.normal;
  els.anchorImg.classList.toggle("is-stuck", next === "stuck");
  els.anchorStage.classList.toggle("redzone", state?.rating <= 20);
}

function showDirector(text) {
  els.directorBubble.textContent = text;
  els.directorBubble.hidden = false;
  window.clearTimeout(showDirector.timer);
  showDirector.timer = window.setTimeout(() => {
    els.directorBubble.hidden = true;
  }, 4200);
}

function ensureAudio() {
  if (state.audioCtx) return state.audioCtx;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  state.audioCtx = new AudioContext();
  return state.audioCtx;
}

function playSound(type) {
  const ctx = ensureAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  const config = {
    tick: [760, 0.018, 0.018],
    softTick: [480, 0.012, 0.014],
    ding: [980, 0.08, 0.07],
    bad: [190, 0.12, 0.09]
  }[type] || [640, 0.04, 0.03];

  osc.type = type === "bad" ? "sawtooth" : "sine";
  osc.frequency.setValueAtTime(config[0], now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(config[2], now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + config[1]);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + config[1] + 0.02);
}

function pickPool(poolName, values = {}) {
  const list = data.danmaku.pools[poolName] || data.danmaku.pools.idle || [];
  return formatTemplate(pick(list), values);
}

function addDanmaku(poolName = "idle", hot = false, values = {}) {
  const text = pickPool(poolName, values);
  const item = document.createElement("span");
  item.className = `danmaku${hot ? " hot" : ""}`;
  item.textContent = text;
  item.style.top = `${Math.floor(Math.random() * 86)}%`;
  item.style.setProperty("--fly-duration", `${7 + Math.random() * 4}s`);
  els.danmakuLayer.appendChild(item);
  item.addEventListener("animationend", () => item.remove());
}

function burstDanmaku(poolName, count = 8, values = {}) {
  for (let index = 0; index < count; index += 1) {
    window.setTimeout(() => addDanmaku(poolName, true, values), index * 70);
  }
}

function formatTemplate(text, values) {
  return String(text).replace(/\{(\w+)}/g, (_, key) => values[key] ?? "");
}

function recordLog(entry) {
  state.logs.push({
    time: formatTime(state.elapsed),
    ...entry
  });
  if (state.logs.length > 40) state.logs.shift();
}

function renderAll() {
  renderTeleprompter();
  renderHand();
  renderRules();
  renderResources();
  renderRating();
  renderActLabel();
  renderInsertControls();
}

function renderActLabel() {
  els.actLabel.textContent = `${currentAct().title} / ${currentParagraph().title}`;
}

function renderInsertControls() {
  if (!els.insertDoneButton) return;
  els.insertDoneButton.hidden = !state?.insertMode;
}

function renderRating() {
  els.ratingText.textContent = Math.round(state.rating);
  els.ratingFill.style.width = `${state.rating}%`;
  drawRatingChart();
}

function drawRatingChart() {
  const canvas = els.ratingCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const samples = state?.ratingSamples || [50];
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let y = 8; y < height; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = state?.rating <= 20 ? "#d84a4a" : "#53c66f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  samples.forEach((value, index) => {
    const x = samples.length === 1 ? 0 : (index / (samples.length - 1)) * width;
    const y = height - (value / 100) * (height - 4) - 2;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderTokenInsertionSlot(sentence, sentenceIndex, tokenIndex) {
  if (!state.insertMode) return "";
  const available = isTokenInsertionSlotAvailable(sentenceIndex, tokenIndex);
  return `
    <span class="token-insert-slot${available ? "" : " disabled"}"
      data-token-insert-sentence-id="${sentence.id}"
      data-token-insert-sentence-index="${sentenceIndex}"
      data-token-insert-index="${tokenIndex}"
      title="${available ? "拖卡插到这个词缝" : "这里已经播过去了"}"></span>
  `;
}

function renderTeleprompter() {
  if (!state) return;
  const paragraph = currentParagraph();
  const activeCard = selectedCard();
  const activeHookWindow = !state.insertMode && activeCard ? findHookWindow(activeCard) : null;
  const pendingHookCards = state.pendingCards
    .map((instance) => maps.cardsById.get(instance.cardId))
    .filter(hasHookCard);
  els.teleprompterBody.classList.toggle("mood-heavy", paragraph.mood === "heavy");
  els.teleprompterBody.classList.toggle("has-reread-window", Boolean(state.rereadHookWindow));
  const html = [
    `<p class="paragraph-title">${escapeHtml(paragraph.title)}${paragraph.hidden ? " / 插播" : ""}</p>`
  ];
  if (state.previewPause > 0) {
    html.push(`<div class="preview-banner">新稿子来了，先扫一眼哪里不对劲</div>`);
  }

  paragraph.sentences.forEach((sentence, sentenceIndex) => {
    const sentenceClasses = ["sentence"];
    if (sentence.inserted) {
      sentenceClasses.push("inserted-sentence");
      sentenceClasses.push(["sponsor-fail", "breaking-fail"].includes(sentence.insertedRole) ? "inserted-bad" : "inserted-good");
    }
    html.push(`<p class="${sentenceClasses.join(" ")}">`);
    if (state.insertMode) html.push(renderTokenInsertionSlot(sentence, sentenceIndex, 0));
    sentence.tokens.forEach((token, tokenIndex) => {
      const key = tokenKey(sentence.id, tokenIndex);
      const tokenState = state.tokenStates.get(key);
      const error = getError(sentence, tokenIndex);
      const tokenText = getTokenText(sentence, tokenIndex);
      const selectedHook = !state.insertMode && activeCard ? tokenMatchesHook(tokenText, activeCard.hooks) : null;
      const anyHook =
        selectedHook ||
        (!state.insertMode && state.actIndex === 0
          ? pendingHookCards.find((card) => tokenMatchesHook(tokenText, card.hooks))
          : null);
      const classes = ["token"];
      if (!isTokenInteractive(token)) classes.push("no-click");
      if (token.role === "sponsor") classes.push("sponsor-token");
      if (token.role === "segue") classes.push("segue-token");
      if (token.role === "breaking") classes.push("breaking-token");
      if (token.role === "sponsor-fail" || token.role === "breaking-fail") classes.push("implant-token");
      if (sentenceIndex === state.sentenceIndex && tokenIndex === state.tokenIndex && !state.gapPause) {
        classes.push("current");
      }
      if (isTokenSpoken(sentenceIndex, tokenIndex)) classes.push("spoken");
      if (tokenState?.status) classes.push(tokenState.status);
      if (error?.type === "rule") classes.push("rule-hint");
      if (anyHook && !isTokenSpoken(sentenceIndex, tokenIndex)) classes.push("hook-hint");
      if (activeHookWindow?.sentence?.id === sentence.id && activeHookWindow.tokenIndex === tokenIndex) {
        classes.push("hook-window");
      }
      html.push(
        `<span class="${classes.join(" ")}" data-sentence-id="${sentence.id}" data-sentence-index="${sentenceIndex}" data-token-index="${tokenIndex}">${escapeHtml(tokenText)}</span>`
      );
      if (state.insertMode) html.push(renderTokenInsertionSlot(sentence, sentenceIndex, tokenIndex + 1));
    });
    html.push(`</p>`);
  });

  if (paragraph.gapAfter) {
    const active = state.selectedCardInstanceId ? " active" : "";
    html.push(`<div class="paragraph-gap${active}" data-gap="true">这里能插播（把卡拖过来）</div>`);
  }

  const next = findNextVisibleLocation(state.actIndex, state.paragraphIndex + 1);
  if (next) {
    const preview = data.script.acts[next.actIndex].paragraphs[next.paragraphIndex];
    const previewText = preview.sentences
      .slice(0, 2)
      .map((sentence) => sentence.tokens.map((token) => token.t).join(""))
      .join("");
    html.push(`
      <div class="next-preview">
        <strong>下一段预读 / ${escapeHtml(preview.title)}</strong>
        <span>${escapeHtml(previewText)}</span>
      </div>
    `);
  }

  els.teleprompterBody.innerHTML = html.join("");
  els.teleprompterBody.querySelectorAll(".token:not(.no-click)").forEach((token) => {
    token.addEventListener("click", handleTokenClick);
  });
  els.teleprompterBody.querySelectorAll("[data-token-insert-index]").forEach((slot) => {
    if (slot.classList.contains("disabled")) return;
    const sentenceId = slot.dataset.tokenInsertSentenceId;
    const sentenceIndex = Number(slot.dataset.tokenInsertSentenceIndex);
    const tokenIndex = Number(slot.dataset.tokenInsertIndex);
    slot.addEventListener("click", () => {
      const instance = selectedCardInstance();
      if (instance) placeCardAtTokenSlot(instance, sentenceId, sentenceIndex, tokenIndex);
    });
    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("drag-over");
      const instanceId = event.dataTransfer.getData("text/plain") || state.selectedCardInstanceId;
      const instance = state.pendingCards.find((item) => item.instanceId === instanceId);
      if (instance) placeCardAtTokenSlot(instance, sentenceId, sentenceIndex, tokenIndex);
    });
  });
  const gap = els.teleprompterBody.querySelector("[data-gap]");
  if (gap) {
    gap.addEventListener("click", placeSelectedCardInGap);
    gap.addEventListener("dragover", (event) => {
      event.preventDefault();
      gap.classList.add("drag-over");
    });
    gap.addEventListener("dragleave", () => gap.classList.remove("drag-over"));
    gap.addEventListener("drop", (event) => {
      event.preventDefault();
      gap.classList.remove("drag-over");
      const instanceId = event.dataTransfer.getData("text/plain");
      const instance = state.pendingCards.find((item) => item.instanceId === instanceId);
      if (instance) placeCardInGap(instance);
    });
  }
}

function renderHand() {
  if (!state.pendingCards.length) {
    els.handRow.innerHTML = `<div class="hand-empty">导播暂时没塞活给你</div>`;
    return;
  }
  els.handRow.innerHTML = state.pendingCards
    .map((instance) => {
      const card = maps.cardsById.get(instance.cardId);
      const selected = instance.instanceId === state.selectedCardInstanceId ? " selected" : "";
      const hooks = hasHookCard(card)
        ? `<span class="hook-badges">${card.hooks.map((hook) => `<i>${escapeHtml(hook)}</i>`).join("")}</span>`
        : "";
      return `
        <button class="card${selected}" type="button" draggable="true" data-card-instance="${instance.instanceId}">
          <strong>${escapeHtml(getCardLabel(card))}</strong>
          ${hooks}
          <span>${card.type === "sponsor" ? "拖到任意两个词之间，点结束后主播才念" : "拖到任意两个词之间，点结束后插播"}</span>
          <time>${Math.ceil(instance.remaining)}s</time>
        </button>
      `;
    })
    .join("");

  els.handRow.querySelectorAll(".card").forEach((cardEl) => {
    const instanceId = cardEl.dataset.cardInstance;
    cardEl.addEventListener("click", () => beginInsertMode(instanceId));
    cardEl.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", instanceId);
      beginInsertMode(instanceId, { fromDrag: true });
    });
  });
}

function renderRules() {
  if (!state.activeRules.length) {
    els.rulesRow.innerHTML = `<div class="rules-empty">台里暂时还没整活</div>`;
    return;
  }
  els.rulesRow.innerHTML = state.activeRules
    .map(
      (rule) => `
        <span class="rule-chip" title="${escapeHtml(rule.announce)}">
          <b>${escapeHtml(rule.icon || "规")}</b>
          ${escapeHtml(rule.title)}
        </span>
      `
    )
    .join("");
}

function renderResources() {
  els.waterCount.textContent = state.stats.waterCount;
  els.coughCount.textContent = state.stats.coughLeft;
  els.coughButton.disabled = state.stats.coughLeft <= 0;
}

function endGame(reason) {
  if (state.status === "ended") return;
  state.status = "ended";
  cancelAnimationFrame(rafId);
  els.choicePopover.hidden = true;
  setAnchorState(reason === "dead" ? "red" : "normal");
  buildSummary(reason);
  els.summaryScreen.hidden = false;
}

function buildSummary(reason) {
  const avgRating =
    state.ratingSamples.reduce((sum, value) => sum + value, 0) / Math.max(1, state.ratingSamples.length);
  const fixRate = state.stats.totalErrors ? state.stats.fixedErrors / state.stats.totalErrors : 1;
  const fixRatePercent = Math.round(fixRate * 100);
  const sponsorOnTimeRate = state.stats.sponsorTotal
    ? state.stats.sponsorOnTime / state.stats.sponsorTotal
    : 1;
  const title = chooseTitle({
    rating: state.rating,
    fixRate,
    waterCount: state.stats.waterCount,
    sponsorOnTimeRate,
    fixWrongCount: state.stats.fixWrongCount,
    commonErrors: state.stats.commonErrors
  });
  const history = getRunHistory();
  const previousRun = history[history.length - 1] || null;
  const currentRun = {
    runNo: history.length + 1,
    title,
    avgRating: Math.round(avgRating),
    fixRate: fixRatePercent,
    accidents: state.stats.accidents,
    waterCount: state.stats.waterCount,
    duration: Math.round(state.elapsed),
    outcome: reason === "dead" ? "被掐播" : "顺利下播",
    endedAt: Date.now()
  };

  els.summaryTitle.textContent = reason === "dead" ? `直播被掐断：${title}` : `顺利下播：${title}`;
  els.summaryCompare.textContent = buildSummaryCompare(currentRun, previousRun, history);
  els.scoreGrid.innerHTML = [
    buildScoreCard("avgRating", currentRun.avgRating, previousRun, history),
    buildScoreCard("fixRate", currentRun.fixRate, previousRun, history),
    buildScoreCard("accidents", currentRun.accidents, previousRun, history),
    buildScoreCard("waterCount", currentRun.waterCount, previousRun, history)
  ].join("");

  const replayLogs = state.logs.filter((log) =>
    [
      "accident",
      "fixwrong",
      "choice-timeout",
      "misclick",
      "sponsor",
      "sponsor-smooth",
      "sponsor-clash",
      "sponsor-timeout",
      "card-mid-sentence",
      "cough",
      "water"
    ].includes(log.type)
  );
  els.replayList.innerHTML = replayLogs.length
    ? replayLogs
        .slice(-8)
        .map(
          (log) => `
            <article class="replay-item">
              <strong>${escapeHtml(log.time)} / ${escapeHtml(log.label)}</strong>
              ${log.sentence ? `<p>原句：${escapeHtml(log.sentence)}</p>` : ""}
              ${log.spoken ? `<p>播出：${escapeHtml(log.spoken)}</p>` : ""}
              ${log.correct ? `<p>应为：${escapeHtml(log.correct)}</p>` : ""}
              ${log.detail ? `<p>${escapeHtml(log.detail)}</p>` : ""}
              ${log.danmaku ? `<p>高赞弹幕：${escapeHtml(log.danmaku)}</p>` : ""}
            </article>
          `
        )
        .join("")
    : `<article class="replay-item"><strong>全程无大事故</strong><p>导播第一次觉得自己像个人。</p></article>`;

  const avgTrend = scoreTrend("avgRating", currentRun.avgRating, previousRun).text;
  const fixTrend = scoreTrend("fixRate", currentRun.fixRate, previousRun).text;
  state.copyText = `《今晚不出错》第 ${currentRun.runNo} 场｜${title}｜均值 ${currentRun.avgRating}（${avgTrend}）｜纠错率 ${currentRun.fixRate}%（${fixTrend}）｜事故 ${currentRun.accidents}｜喝水 ${currentRun.waterCount} 次`;
  saveRunHistory([...history, currentRun]);
}

function chooseTitle(stats) {
  const priority = data.titles.priority || [];
  const titles = new Map(data.titles.titles.map((title) => [title.id, title]));
  for (const id of priority) {
    const title = titles.get(id);
    if (title && testCondition(title.cond, stats)) return title.name;
  }
  return "临时主播";
}

function testCondition(cond, stats) {
  const match = String(cond).match(/^(\w+)(>=|<=|==|>|<)([\d.]+)$/);
  if (!match) return false;
  const [, key, op, raw] = match;
  const left = Number(stats[key] ?? 0);
  const right = Number(raw);
  if (op === ">=") return left >= right;
  if (op === "<=") return left <= right;
  if (op === "==") return left === right;
  if (op === ">") return left > right;
  if (op === "<") return left < right;
  return false;
}

async function copySummary() {
  try {
    await navigator.clipboard.writeText(state.copyText);
    showToast("战绩已复制");
  } catch {
    const area = document.createElement("textarea");
    area.value = state.copyText;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    showToast("战绩已复制");
  }
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bindEvents() {
  els.startButton.addEventListener("click", startGame);
  els.restartButton.addEventListener("click", startGame);
  els.copyButton.addEventListener("click", copySummary);
  els.waterButton.addEventListener("click", useWater);
  els.coughButton.addEventListener("click", useCough);
  els.insertDoneButton?.addEventListener("click", endInsertMode);
  window.addEventListener("keydown", (event) => {
    if (!state || state.status !== "running") return;
    if (event.code === "Space") {
      event.preventDefault();
      useWater();
    }
    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      useCough();
    }
    if (event.key.toLowerCase() === "v") {
      event.preventDefault();
      attemptHookSegue();
    }
  });
}

async function init() {
  try {
    await loadData();
    prepareRunData();
    state = createInitialState();
    bindEvents();
    renderAll();
    drawRatingChart();
  } catch (error) {
    els.startScreen.hidden = false;
    els.startScreen.querySelector(".start-copy").innerHTML = `
      <p class="eyebrow">加载失败</p>
      <h2>需要通过本地服务器打开</h2>
      <p>${escapeHtml(error.message)}。请在 game 目录启动静态服务器后访问。</p>
    `;
    console.error(error);
  }
}

init();
