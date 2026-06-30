const app = document.querySelector("#app");

const state = {
  levelIndex: 0,
  stats: { 体面: 0, 怀疑: 0, 灵感: 0, 人情: 0 },
  selected: [],
  crafted: [],
  tray: [],
  extracted: [],
  targetResult: "",
  phase: "choose",
  pending: null,
  history: [],
  sentence: ""
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function byName(level, name) {
  return level.results.find((card) => card.name === name);
}

function comboKey(names) {
  return [...names].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")).join("+");
}

function getCombo(level, selectedNames) {
  if (selectedNames.length !== 2) return null;
  const direct = selectedNames.join("+");
  const reversed = [...selectedNames].reverse().join("+");
  const sorted = comboKey(selectedNames);
  return level.combos[direct] || level.combos[reversed] || level.combos[sorted] || null;
}

function addDelta(target, delta) {
  Object.entries(delta || {}).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + value;
  });
  return target;
}

function formatDelta(delta) {
  const entries = STAT_KEYS.map((key) => [key, delta[key] || 0]).filter(([, value]) => value !== 0);
  if (!entries.length) return "数值不变";
  return entries.map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`).join(" / ");
}

function poolTokens(level) {
  return level.sceneItems.flatMap((item) =>
    item.chars.map((char, index) => ({
      char,
      source: item.name,
      sourceArt: item.art,
      id: `${item.name}-${index}-${char}`
    }))
  );
}

function extractedTokens(level) {
  const extracted = new Set(state.extracted);
  return poolTokens(level).filter((token) => extracted.has(token.source));
}

function tokenById(level, id) {
  return poolTokens(level).find((token) => token.id === id);
}

function countChars(chars) {
  return chars.reduce((map, char) => {
    map[char] = (map[char] || 0) + 1;
    return map;
  }, {});
}

function sameCharBag(a, b) {
  const left = countChars(a);
  const right = countChars(b);
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => (left[key] || 0) === (right[key] || 0));
}

function craftedTokenIds(crafted = state.crafted) {
  return new Set(crafted.flatMap((entry) => entry.tokenIds));
}

function trayTokens(level) {
  return state.tray.map((id) => tokenById(level, id)).filter(Boolean);
}

function maxRecipeLength(level) {
  return Math.max(...level.results.map((card) => card.recipe.length));
}

function currentMatch(level) {
  const chars = trayTokens(level).map((token) => token.char);
  if (!chars.length) return null;
  return level.results.find(
    (card) => !state.selected.includes(card.name) && sameCharBag(chars, card.recipe)
  );
}

function partialMatches(level) {
  const chars = trayTokens(level).map((token) => token.char);
  if (!chars.length) return [];
  const current = countChars(chars);
  return level.results.filter((card) => {
    if (state.selected.includes(card.name)) return false;
    const recipe = countChars(card.recipe);
    return Object.entries(current).every(([char, count]) => count <= (recipe[char] || 0));
  });
}

function targetCard(level) {
  return state.targetResult ? byName(level, state.targetResult) : null;
}

function targetProgress(level, card) {
  if (!card) return null;
  const consumed = craftedTokenIds();
  const available = countChars(
    extractedTokens(level)
      .filter((token) => !consumed.has(token.id))
      .map((token) => token.char)
  );
  const inTray = countChars(trayTokens(level).map((token) => token.char));
  return card.recipe.map((char) => ({
    char,
    available: available[char] || 0,
    inTray: inTray[char] || 0
  }));
}

function remainingTokens(level, crafted = state.crafted) {
  const consumed = craftedTokenIds(crafted);
  return extractedTokens(level).filter((token) => !consumed.has(token.id));
}

function conditionalDelta(level, selectedNames) {
  const delta = {};
  const allHistoryCards = state.history.flatMap((entry) => entry.selected);
  const previous = state.history[state.history.length - 1]?.selected || [];

  if (level.id === "rain-gallery") {
    if (selectedNames.includes("名单") && allHistoryCards.includes("请柬")) addDelta(delta, { 怀疑: -1 });
    if (selectedNames.includes("舞伴") && allHistoryCards.includes("水晶鞋")) addDelta(delta, { 体面: 1 });
  }

  if (level.id === "silver-ballroom") {
    if (selectedNames.includes("王子") && (allHistoryCards.includes("水晶鞋") || previous.includes("舞伴"))) {
      addDelta(delta, { 体面: 1 });
    }
    if (selectedNames.includes("密信") && (previous.includes("侍女") || previous.includes("后门"))) {
      addDelta(delta, { 灵感: 1 });
    }
  }

  if (level.id === "first-dance") {
    if (previous.includes("王子") && selectedNames.includes("共舞")) addDelta(delta, { 体面: 1 });
    if (previous.includes("王子") && selectedNames.includes("退场")) addDelta(delta, { 怀疑: 1 });
    if (previous.includes("假面") && selectedNames.includes("揭面")) addDelta(delta, { 怀疑: 1, 体面: 1 });
    if (previous.includes("假面") && selectedNames.includes("退场")) addDelta(delta, { 怀疑: -1 });
    if (previous.includes("密信") && selectedNames.includes("换杯")) addDelta(delta, { 人情: 1 });
    if (previous.includes("密信") && selectedNames.includes("共舞")) addDelta(delta, { 怀疑: 1 });
    if (previous.includes("礼物") && (selectedNames.includes("换杯") || selectedNames.includes("共舞"))) {
      addDelta(delta, { 体面: 1 });
    }
  }

  return delta;
}

function buildOutcome(level) {
  const selectedNames = [...state.selected];
  const cards = selectedNames.map((name) => byName(level, name));
  const combo = getCombo(level, selectedNames);
  const delta = {};
  cards.forEach((card) => addDelta(delta, card.effect));
  if (combo) addDelta(delta, combo.effect);
  addDelta(delta, conditionalDelta(level, selectedNames));

  return {
    cards,
    crafted: state.crafted.map((entry) => ({ ...entry, tokenIds: [...entry.tokenIds] })),
    combo,
    delta,
    leftover: remainingTokens(level)
  };
}

function toggleToken(id) {
  if (state.phase !== "choose") return;
  const level = LEVELS[state.levelIndex];
  if (craftedTokenIds().has(id)) return;
  if (!extractedTokens(level).some((token) => token.id === id)) return;

  if (state.tray.includes(id)) {
    state.tray = state.tray.filter((tokenId) => tokenId !== id);
  } else if (state.selected.length < 2 && state.tray.length < maxRecipeLength(level)) {
    state.tray = [...state.tray, id];
  }
  render();
}

function selectResultCard(name) {
  if (state.phase !== "choose") return;
  if (state.selected.includes(name)) return;
  const level = LEVELS[state.levelIndex];
  const match = currentMatch(level);
  if (match?.name === name) {
    craftTray();
    return;
  }
  state.targetResult = state.targetResult === name ? "" : name;
  render();
}

function extractItem(name) {
  if (state.phase !== "choose") return;
  if (!state.extracted.includes(name)) {
    state.extracted = [...state.extracted, name];
    render();
  }
}

function craftTray() {
  const level = LEVELS[state.levelIndex];
  const match = currentMatch(level);
  if (!match || state.selected.length >= 2) return;

  state.selected = [...state.selected, match.name];
  state.crafted = [...state.crafted, { name: match.name, tokenIds: [...state.tray] }];
  if (state.targetResult === match.name) state.targetResult = "";
  state.tray = [];
  render();
}

function finishCrafting() {
  if (!state.selected.length) return;
  const level = LEVELS[state.levelIndex];
  state.pending = buildOutcome(level);
  state.sentence = "";
  state.phase = "resolve";
  render();
}

function autoSentence() {
  const leftover = state.pending.leftover.map((token) => token.char);
  const midpoint = Math.ceil(leftover.length / 2);
  const first = leftover.slice(0, midpoint).join("");
  const second = leftover.slice(midpoint).join("");
  state.sentence = second ? `我在${first}了，你在${second}。` : `我在${first}了。`;
  render();
}

function scoreSentence(sentence, leftoverTokens, level) {
  const normalized = sentence.replace(/[，。！？、,.!?\s]/g, "");
  const remaining = countChars(leftoverTokens.map((token) => token.char));
  const seen = countChars([...normalized]);
  let covered = 0;
  Object.entries(remaining).forEach(([char, count]) => {
    covered += Math.min(count, seen[char] || 0);
  });

  const coverage = leftoverTokens.length ? covered / leftoverTokens.length : 1;
  const baseHits = BASE_WORDS.filter((word) => normalized.includes(word)).length;
  const itemHits = level.sceneItems.filter((item) => normalized.includes(item.name)).length;
  const atmosphericHits = ["灰", "雨", "银", "舞", "灯", "信", "面", "鞋", "门", "王"].filter((char) =>
    normalized.includes(char)
  ).length;
  const compactnessPenalty = Math.max(0, normalized.length - leftoverTokens.length - 8) * 1.2;
  const leftoverPressure = Math.max(0, leftoverTokens.length - 12) * 1.3;

  const reasonable = clamp(
    Math.round(34 + coverage * 35 + baseHits * 5 + itemHits * 7 - compactnessPenalty - leftoverPressure),
    0,
    100
  );
  const abstract = clamp(
    Math.round(22 + Math.max(0, leftoverTokens.length - 6) * 2.4 + (1 - coverage) * 20 + (baseHits < 2 ? 10 : 0)),
    0,
    100
  );
  const poetic = clamp(Math.round(20 + atmosphericHits * 6 + itemHits * 5 + (sentence.includes("，") ? 6 : 0)), 0, 100);
  const burden = clamp(
    Math.round(leftoverTokens.length * 2.6 + (1 - coverage) * 38 + (reasonable < 45 ? 18 : 0) + (abstract > 70 ? 8 : 0)),
    0,
    100
  );

  let feedback = "句子勉强收住了剩余字，代价可控。";
  if (coverage < 0.9) feedback = "有些剩余字没有被安放，舞会会把这些碎片重新推回她身上。";
  else if (reasonable >= 68 && burden <= 45) feedback = "这句话虽然古怪，但能说通，像把杂物收进了一只临时口袋。";
  else if (poetic >= 68 && abstract >= 55) feedback = "它不太像日常话，却有一种童话式的偏光，荒诞里带着一点美。";
  else if (burden >= 72) feedback = "剩余字太拥挤了，像一串没藏好的证据，怀疑会顺着它们长出来。";

  return { coverage, reasonable, abstract, poetic, burden, feedback };
}

function remainingDelta(score) {
  const delta = {};
  if (score.coverage < 0.9) addDelta(delta, { 怀疑: 1 });
  if (score.burden >= 72) addDelta(delta, { 怀疑: 1, 体面: -1 });
  if (score.reasonable < 38) addDelta(delta, { 怀疑: 1 });
  if (score.poetic >= 70 && score.burden < 76) addDelta(delta, { 灵感: 1 });
  if (score.reasonable >= 72 && score.burden <= 42) addDelta(delta, { 体面: 1 });
  return delta;
}

function scorePreviewHtml(score, delta) {
  const rows = [
    ["合理", score.reasonable],
    ["抽象", score.abstract],
    ["诗意", score.poetic],
    ["负担", score.burden]
  ];
  return `
    <div class="score-grid">
      ${rows.map(([label, value]) => `
        <div class="score-row">
          <span>${label}</span>
          <i><b style="width:${value}%"></b></i>
          <strong>${value}</strong>
        </div>
      `).join("")}
    </div>
    <p class="score-feedback">${score.feedback}</p>
    <p class="score-delta">${formatDelta(delta)}</p>
  `;
}

function settleLevel() {
  if (!state.pending) return;
  const level = LEVELS[state.levelIndex];
  const sentence = state.sentence.trim();
  if (!sentence) return;

  const score = scoreSentence(sentence, state.pending.leftover, level);
  const restDelta = remainingDelta(score);
  const totalDelta = {};
  addDelta(totalDelta, state.pending.delta);
  addDelta(totalDelta, restDelta);
  Object.entries(totalDelta).forEach(([key, value]) => {
    state.stats[key] = clamp((state.stats[key] || 0) + value, -9, 18);
  });

  state.history.push({
    level: level.title,
    selected: [...state.selected],
    crafted: state.pending.crafted,
    combo: state.pending.combo?.name || "",
    sentence,
    score,
    resultDelta: { ...state.pending.delta },
    restDelta,
    totalDelta
  });

  state.selected = [];
  state.crafted = [];
  state.tray = [];
  state.extracted = [];
  state.targetResult = "";
  state.pending = null;
  state.sentence = "";
  state.phase = "choose";
  state.levelIndex += 1;
  render();
}

function replayLevel() {
  state.phase = "choose";
  state.pending = null;
  state.selected = [];
  state.crafted = [];
  state.tray = [];
  state.extracted = [];
  state.targetResult = "";
  state.sentence = "";
  render();
}

function resetGame() {
  state.levelIndex = 0;
  state.stats = { 体面: 0, 怀疑: 0, 灵感: 0, 人情: 0 };
  state.selected = [];
  state.crafted = [];
  state.tray = [];
  state.extracted = [];
  state.targetResult = "";
  state.phase = "choose";
  state.pending = null;
  state.history = [];
  state.sentence = "";
  render();
}

function carryText(level) {
  if (!state.history.length || !level.carry) return "";
  const previous = state.history[state.history.length - 1];
  const parts = previous.selected.map((name) => level.carry[name]).filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

function renderStats() {
  return `
    <section class="stat-strip" aria-label="当前数值">
      ${STAT_KEYS.map((key) => {
        const value = state.stats[key] || 0;
        const fill = clamp((value + 4) * 7, 6, 100);
        return `
          <div class="stat">
            <div class="stat-top"><span>${key}</span><strong>${value}</strong></div>
            <div class="stat-bar"><i style="width:${fill}%"></i></div>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderProgress() {
  return `
    <nav class="level-progress" aria-label="关卡进度">
      ${LEVELS.map((level, index) => {
        const done = index < state.levelIndex;
        const active = index === state.levelIndex;
        return `<span class="${done ? "done" : ""} ${active ? "active" : ""}">${index + 1}. ${level.shortTitle}</span>`;
      }).join("")}
    </nav>
  `;
}

function renderSceneItems(level) {
  const consumed = craftedTokenIds();
  const tray = new Set(state.tray);
  const extracted = new Set(state.extracted);
  const target = targetCard(level);
  const targetNeed = countChars(target?.recipe || []);
  return `
    <section class="panel scene-panel">
      <div class="panel-heading">
        <h2>场景物品</h2>
        <span>${state.extracted.length}/${level.sceneItems.length} 已提取</span>
      </div>
      <div class="scene-card-grid">
        ${level.sceneItems.map((item, itemIndex) => {
          const isExtracted = extracted.has(item.name);
          return `
          <article class="scene-card item-card ${isExtracted ? "extracted" : ""}" title="${isExtracted ? item.image : "未知物品"}">
            <button class="object-art" data-item="${item.name}" ${isExtracted ? "disabled" : ""} aria-label="${isExtracted ? item.name : `提取未知物品 ${itemIndex + 1} 的全部文字`}">
              <span class="object-shape"></span>
              <i></i>
            </button>
            <div>
              <h3>${isExtracted ? item.name : `未知物品 ${itemIndex + 1}`}</h3>
              <p>${isExtracted ? item.image : "点开前不知道它会拆出什么字。"}</p>
              ${isExtracted ? "" : `<small class="demo-label">demo 标注：${item.name}</small>`}
              ${isExtracted
                ? `<div class="char-row extracted-row">
                    ${item.chars.map((char, index) => {
                      const id = `${item.name}-${index}-${char}`;
                      const isUsed = consumed.has(id);
                      const inTray = tray.has(id);
                      const isNeeded = targetNeed[char] && !isUsed;
                      return `
                        <span class="char-chip ${isUsed ? "used" : ""} ${inTray ? "in-tray" : ""} ${isNeeded ? "needed" : ""}" title="${char} 来自 ${item.name}">
                          ${char}
                        </span>
                      `;
                    }).join("")}
                  </div>`
                : `<div class="extract-hint">点击物品，提取整组文字</div>`}
            </div>
          </article>
        `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderCraftPanel(level) {
  const match = currentMatch(level);
  const partial = partialMatches(level);
  const tokens = trayTokens(level);
  const canFinish = state.selected.length;
  const target = targetCard(level);
  const progress = targetProgress(level, target);
  return `
    <section class="panel craft-panel">
      <div class="panel-heading">
        <h2>炼字槽</h2>
        <span>${state.selected.length}/2 结果</span>
      </div>
      <div class="tray">
        ${tokens.length
          ? tokens.map((token) => `
              <button class="pool-chip tray-chip" data-token="${token.id}" title="来自 ${token.source}">
                ${token.char}<small>${token.source}</small>
              </button>
            `).join("")
          : `<span class="empty-tray">先点物品提取整组文字，再从字池取字</span>`}
      </div>
      <div class="match-box ${match ? "ready" : ""}">
        ${match
          ? `<b>可以炼成：${match.name}</b><span>当前炼字槽已组成一个合法结果。</span>`
          : partial.length
            ? `<b>有 ${partial.length} 个结果可能成立</b><span>继续从已提取文字里取字。</span>`
            : tokens.length
              ? `<b>未匹配到配方</b><span>当前字组不能炼成结果卡</span>`
              : `<b>还没有取字</b><span>物品上的字才是可用材料</span>`}
      </div>
      <div class="crafted-row">
        ${state.crafted.length
          ? state.crafted.map((entry) => `<span>${entry.name}</span>`).join("")
          : `<span class="muted">尚未炼成结果卡</span>`}
      </div>
      ${target ? `
        <div class="target-box">
          <b>当前目标：${target.name}</b>
          <div class="target-progress">
            ${progress.map((item) => `
              <span class="${item.inTray ? "in-tray" : item.available ? "available" : ""}">
                ${item.char}<small>${item.inTray ? "槽中" : item.available ? "已提取" : "未找到"}</small>
              </span>
            `).join("")}
          </div>
        </div>
      ` : ""}
      <p class="craft-note">
        点物品前不知道它是什么；点击后会一次性拆出整组文字。只结算已提取但没用掉的字，未点开的物品不会变成剩字。
      </p>
      <div class="action-row">
        <button class="secondary" id="craftButton" ${match ? "" : "disabled"}>炼成${match ? `「${match.name}」` : ""}</button>
        <button class="primary" id="finishButton" ${canFinish ? "" : "disabled"}>结算本关</button>
        <button class="ghost" id="clearButton" ${state.tray.length ? "" : "disabled"}>清空炼字槽</button>
      </div>
    </section>
  `;
}

function renderResultCards(level) {
  const match = currentMatch(level);
  return `
    <section class="panel result-panel">
      <div class="panel-heading">
        <h2>结果卡牌</h2>
        <span>已炼 ${state.selected.length}/2</span>
      </div>
      <div class="result-grid">
        ${level.results.map((card) => {
          const crafted = state.selected.includes(card.name);
          const matched = match?.name === card.name;
          const targeted = state.targetResult === card.name;
          return `
            <button type="button" class="result-card ${crafted ? "crafted" : ""} ${matched ? "matched" : ""} ${targeted ? "targeted" : ""}"
              data-result="${card.name}" title="${card.aha}">
              <span class="card-art">${card.name}</span>
              <span class="card-title">${matched && !crafted ? `可以炼成：${card.name}` : card.name}</span>
              <span class="card-branch">${crafted ? "已炼成" : targeted ? "当前目标" : card.branch}</span>
              ${crafted || matched
                ? `<span class="recipe">${card.recipe.map((char) => `<b>${char}</b>`).join("")}</span>`
                : `<span class="recipe-hidden">配方待试出</span>`}
              <span class="effect">${formatDelta(card.effect)}</span>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderCharPool(level) {
  const consumed = craftedTokenIds();
  const tray = new Set(state.tray);
  const tokens = extractedTokens(level);
  const target = targetCard(level);
  const targetNeed = countChars(target?.recipe || []);
  return `
    <section class="panel pool-panel">
      <div class="panel-heading">
        <h2>已提取文字</h2>
        <span>${tokens.length} 字 · ${BASE_WORDS.join(" / ")}</span>
      </div>
      <div class="pool">
        ${tokens.length ? tokens.map((token) => {
          const used = consumed.has(token.id);
          const inTray = tray.has(token.id);
          const needed = targetNeed[token.char] && !used;
          return `
            <button class="pool-chip char-button ${used ? "used" : ""} ${inTray ? "in-tray" : ""} ${needed ? "needed" : ""}"
              data-token="${token.id}" ${used || state.selected.length >= 2 ? "disabled" : ""}
              title="${token.source}">
              ${token.char}
            </button>
          `;
        }).join("") : `<span class="empty-tray">还没有文字。点击一个物品会一次性提取它的全部字。</span>`}
      </div>
    </section>
  `;
}

function renderResolve(level) {
  const pending = state.pending;
  const leftoverChars = pending.leftover.map((token) => token.char);
  return `
    <section class="panel resolve-panel">
      <div class="panel-heading">
        <h2>炼成结果</h2>
        <span>${formatDelta(pending.delta)}</span>
      </div>
      <div class="outcome-list">
        ${pending.cards.map((card) => {
          const crafted = pending.crafted.find((entry) => entry.name === card.name);
          const sourceLine = crafted.tokenIds
            .map((id) => tokenById(level, id))
            .filter(Boolean)
            .map((token) => `${token.char}（${token.source}）`)
            .join(" + ");
          return `
            <article class="outcome-card">
              <div class="mini-art strong">${card.name}</div>
              <div>
                <h3>${card.name}</h3>
                <p class="source-line">${sourceLine}</p>
                <p>${card.story}</p>
                <small>${card.aha}</small>
              </div>
            </article>
          `;
        }).join("")}
        ${pending.combo ? `
          <article class="combo-card">
            <h3>${pending.combo.name}</h3>
            <p>${pending.combo.story}</p>
            <small>${pending.combo.impact}</small>
          </article>
        ` : ""}
      </div>
      <div class="leftover-box">
        <div class="panel-heading tight">
          <h2>剩余字</h2>
          <span>${leftoverChars.length} 字</span>
        </div>
        <div class="pool leftover">
          ${pending.leftover.map((token) => `<span class="pool-chip" title="${token.source}">${token.char}</span>`).join("")}
        </div>
      </div>
      <label class="sentence-label" for="sentenceInput">剩字句</label>
      <textarea id="sentenceInput" rows="3">${state.sentence}</textarea>
      <div id="scorePreview" class="score-preview">
        ${state.sentence.trim()
          ? scorePreviewHtml(
              scoreSentence(state.sentence, pending.leftover, level),
              remainingDelta(scoreSentence(state.sentence, pending.leftover, level))
            )
          : ""}
      </div>
      <div class="action-row">
        <button class="secondary" id="autoSentence">套用一句</button>
        <button class="primary" id="settleButton" ${state.sentence.trim() ? "" : "disabled"}>${state.levelIndex === LEVELS.length - 1 ? "完成试玩" : "进入下一关"}</button>
        <button class="ghost" id="replayButton">重炼本关</button>
      </div>
    </section>
  `;
}

function renderHistory() {
  if (!state.history.length) return "";
  return `
    <section class="panel history-panel">
      <div class="panel-heading">
        <h2>已发生</h2>
        <span>${state.history.length}</span>
      </div>
      <div class="history-list">
        ${state.history.map((entry, index) => `
          <article>
            <b>${index + 1}. ${entry.selected.join(" + ")}${entry.combo ? `｜${entry.combo}` : ""}</b>
            <span>${formatDelta(entry.totalDelta)}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderFinale() {
  const suspicion = state.stats.怀疑 || 0;
  const dignity = state.stats.体面 || 0;
  const inspiration = state.stats.灵感 || 0;
  const favor = state.stats.人情 || 0;
  let ending = "她没有成为舞会中心，却带着足够多的线索和余地离开灯光。";
  if (dignity >= 8 && suspicion <= 5) ending = "她在舞会中站稳了脚步，像一个故事终于承认了自己的主角。";
  else if (suspicion >= 8) ending = "她获得了太多目光，也留下了太多疑问。下一声钟响前，盘问已经在路上。";
  else if (inspiration >= 8) ending = "她把尴尬、旧物和谎言都炼成了童话的材料。现实还很硬，但故事开始发光。";
  else if (favor >= 5) ending = "她没有独自赢下舞会，却让几个人欠下了沉默、礼物或秘密。";

  return `
    <main class="finale">
      <section class="panel finale-card">
        <p class="eyebrow">四关试玩完成</p>
        <h1>午夜之前</h1>
        <p>${ending}</p>
        ${renderStats()}
        ${renderHistory()}
        <div class="action-row">
          <button class="primary" id="resetButton">重新试玩</button>
        </div>
      </section>
    </main>
  `;
}

function renderLevel() {
  const level = LEVELS[state.levelIndex];
  const carry = carryText(level);

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">词语炼金</p>
        <h1>${level.title}</h1>
      </div>
      <button class="ghost compact" id="resetButton">重开</button>
    </header>
    ${renderProgress()}
    ${renderStats()}
    <main class="layout ${level.sceneClass}">
      <section class="story-panel">
        <div class="scene-visual">
          <div class="scene-moon"></div>
          <div class="scene-lines"></div>
          <strong>${level.shortTitle}</strong>
        </div>
        <div class="story-copy">
          ${carry ? `<p class="carry">${carry}</p>` : ""}
          <p>${level.premise}</p>
          <dl>
            <div><dt>目标</dt><dd>${level.goal}</dd></div>
            <div><dt>重点</dt><dd>${level.focus}</dd></div>
          </dl>
        </div>
      </section>
      <section class="workspace">
        <div class="left-stack">
          ${renderSceneItems(level)}
          ${renderCharPool(level)}
          ${renderHistory()}
        </div>
        <div class="right-stack">
          ${state.phase === "choose" ? `${renderCraftPanel(level)}${renderResultCards(level)}` : renderResolve(level)}
        </div>
      </section>
    </main>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-token]").forEach((button) => {
    button.addEventListener("click", () => toggleToken(button.dataset.token));
  });
  document.querySelectorAll("[data-item]").forEach((button) => {
    button.addEventListener("click", () => extractItem(button.dataset.item));
  });
  document.querySelectorAll("[data-result]").forEach((button) => {
    button.addEventListener("click", () => selectResultCard(button.dataset.result));
  });
  document.querySelector("#craftButton")?.addEventListener("click", craftTray);
  document.querySelector("#finishButton")?.addEventListener("click", finishCrafting);
  document.querySelector("#clearButton")?.addEventListener("click", () => {
    state.tray = [];
    render();
  });
  document.querySelector("#autoSentence")?.addEventListener("click", autoSentence);
  document.querySelector("#settleButton")?.addEventListener("click", settleLevel);
  document.querySelector("#replayButton")?.addEventListener("click", replayLevel);
  document.querySelector("#resetButton")?.addEventListener("click", resetGame);
  document.querySelector("#sentenceInput")?.addEventListener("input", (event) => {
    state.sentence = event.target.value;
    const button = document.querySelector("#settleButton");
    if (button) button.disabled = !state.sentence.trim();
    const preview = document.querySelector("#scorePreview");
    if (preview) {
      if (state.sentence.trim() && state.pending) {
        const level = LEVELS[state.levelIndex];
        const score = scoreSentence(state.sentence, state.pending.leftover, level);
        preview.innerHTML = scorePreviewHtml(score, remainingDelta(score));
      } else {
        preview.innerHTML = "";
      }
    }
  });
}

function render() {
  app.innerHTML = state.levelIndex >= LEVELS.length ? renderFinale() : renderLevel();
  bindEvents();
}

render();
