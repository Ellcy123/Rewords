# 《刷到你了》网页试玩原型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, mobile-first static web demo of 《刷到你了》 with 16 playable video nodes, four items, six curated wrong endings, local progress, and the complete wedding route.

**Architecture:** A React application renders a vertically snapping short-video feed from typed content data. Pure engine functions own trigger resolution, economy, feed ordering, and persistence; React components dispatch actions and render the resulting state. Each node uses a reusable animated storyboard renderer so the prototype remains playable without recorded footage and can later swap in MP4/WebM assets without changing game logic.

**Tech Stack:** React 19.2.7, React DOM 19.2.7, Vite 8.1.4, TypeScript 7.0.2, Vitest 4.1.10, `@vitejs/plugin-react` 6.0.3, Testing Library React 16.3.2, Testing Library User Event 14.6.1, jsdom 29.1.1, lucide-react 1.24.0, CSS, Web Audio API, localStorage.

## Global Constraints

- Project root: `刷到你了/web-prototype/`.
- Primary viewport: mobile portrait 9:16; desktop renders a centered phone canvas no larger than 430 × 932 CSS pixels.
- Supported inputs: touch swipe, pointer drag, mouse wheel, ArrowUp, and ArrowDown.
- Supported browsers: current mainstream iOS Safari, Android Chrome, desktop Chrome, Safari, and Edge.
- Content scope: W001, W101, W200, W300, W301, W400, C001, C101, K001, K101, X001, X004, X012, X016, X021, X028.
- Items: ladder, technician, recorder, projector.
- Every video communicates its result in the first second, core event within five seconds, and completes within fifteen seconds.
- No backend, login, real payment, advertising SDK, AI runtime generation, PWA, or unlisted branch content.
- Never show an unimplemented gift combination; `selectableItemIds` is the only gift list exposed by a node.
- Static content stays outside saved state; localStorage stores player actions and derived progress with schema version `1`.
- Game logic remains independent of React and browser APIs.
- Use TDD for engine, persistence, feed ranking, and interaction behavior.
- Do not modify or stage unrelated untracked files in the repository.

---

## File Map

```text
刷到你了/web-prototype/
├─ index.html                         Vite HTML entry and mobile meta tags
├─ package.json                       scripts and pinned dependencies
├─ package-lock.json                  npm lockfile
├─ tsconfig.json                      shared strict TypeScript options
├─ tsconfig.app.json                  browser build options
├─ tsconfig.node.json                 Vite configuration options
├─ vite.config.ts                     React and Vitest configuration
├─ src/
│  ├─ main.tsx                        React bootstrap
│  ├─ App.tsx                         app composition and provider wiring
│  ├─ content/
│  │  ├─ types.ts                     content model types
│  │  ├─ items.ts                     four item definitions
│  │  ├─ nodes.ts                     sixteen node definitions
│  │  ├─ triggers.ts                  six route triggers and six wrong triggers
│  │  └─ validate.ts                  content integrity checks
│  ├─ engine/
│  │  ├─ state.ts                     GameState and initial-state factory
│  │  ├─ reducer.ts                   game action reducer
│  │  ├─ trigger.ts                   pure trigger resolution
│  │  ├─ feed.ts                      deterministic feed ordering
│  │  ├─ persistence.ts               versioned localStorage adapter
│  │  └─ selectors.ts                 derived UI data
│  ├─ game/
│  │  ├─ GameProvider.tsx             context and persistence effects
│  │  └─ useGame.ts                   typed context hook
│  ├─ feed/
│  │  ├─ FeedScreen.tsx               feed state and overlays
│  │  ├─ VideoFeed.tsx                vertical snapping and input handling
│  │  ├─ VideoCard.tsx                short-video chrome
│  │  ├─ StoryStage.tsx               storyboard/media abstraction
│  │  ├─ PlaybackContext.tsx          single active node and pause state
│  │  └─ useFeedNavigation.ts         swipe/wheel/keyboard navigation
│  ├─ commerce/
│  │  ├─ ProductSheet.tsx             item detail and purchase
│  │  ├─ GiftSheet.tsx                curated gift list and confirmation
│  │  └─ InventorySheet.tsx           owned/discovered items
│  ├─ destiny/
│  │  ├─ DestinySheet.tsx             discovered results
│  │  └─ CompletionOverlay.tsx        W400 completion state
│  ├─ shell/
│  │  ├─ BottomNav.tsx                fixed app navigation
│  │  ├─ CommentsSheet.tsx            configured comments
│  │  ├─ ProfileSheet.tsx             progress/settings/reset
│  │  ├─ Sheet.tsx                    accessible single bottom sheet
│  │  └─ Toast.tsx                    short status feedback
│  ├─ tutorial/
│  │  └─ TutorialCue.tsx              three contextual onboarding cues
│  ├─ audio/
│  │  └─ feedback.ts                  lazy Web Audio feedback tones
│  ├─ styles/
│  │  ├─ reset.css                    global normalization
│  │  ├─ tokens.css                   colors, spacing, safe areas
│  │  ├─ app.css                      responsive phone shell
│  │  ├─ feed.css                     feed and short-video chrome
│  │  ├─ stage.css                    three channel styles and story animation
│  │  └─ sheets.css                   bottom sheets and overlays
│  └─ tests/
│     ├─ setup.ts                     jsdom and matchMedia stubs
│     ├─ content.test.ts              catalog validation
│     ├─ trigger.test.ts              complete trigger matrix
│     ├─ reducer.test.ts              economy/progression/idempotency
│     ├─ feed.test.ts                 deterministic ranking
│     ├─ persistence.test.ts          save/load/corruption/version tests
│     └─ app-flow.test.tsx            purchase, wrong ending, and full completion
└─ README.md                           run, test, build, content-extension guide
```

---

### Task 1: Scaffold the typed application and content contracts

**Files:**
- Create: `刷到你了/web-prototype/package.json`
- Create: `刷到你了/web-prototype/index.html`
- Create: `刷到你了/web-prototype/tsconfig.json`
- Create: `刷到你了/web-prototype/tsconfig.app.json`
- Create: `刷到你了/web-prototype/tsconfig.node.json`
- Create: `刷到你了/web-prototype/vite.config.ts`
- Create: `刷到你了/web-prototype/src/main.tsx`
- Create: `刷到你了/web-prototype/src/App.tsx`
- Create: `刷到你了/web-prototype/src/content/types.ts`
- Create: `刷到你了/web-prototype/src/content/validate.ts`
- Create: `刷到你了/web-prototype/src/tests/setup.ts`
- Test: `刷到你了/web-prototype/src/tests/content.test.ts`

**Interfaces:**
- Produces: `ItemDefinition`, `VideoNode`, `TriggerDefinition`, `StoryBeat`, `validateContent()`.
- Consumes: no earlier task interfaces.

- [ ] **Step 1: Create package and compiler configuration**

Use this package contract:

```json
{
  "name": "shuadaonile-web-prototype",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --pretty false"
  },
  "dependencies": {
    "lucide-react": "1.24.0",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.3",
    "jsdom": "29.1.1",
    "typescript": "7.0.2",
    "vite": "8.1.4",
    "vitest": "4.1.10"
  }
}
```

Configure strict TypeScript, `jsx: react-jsx`, `moduleResolution: Bundler`, DOM libraries, and Vitest `environment: jsdom`, `setupFiles: ['./src/tests/setup.ts']`.

- [ ] **Step 2: Install dependencies**

Run: `cd 刷到你了/web-prototype && npm install`

Expected: exit 0 and a new `package-lock.json` with no missing peer-dependency error.

- [ ] **Step 3: Write the failing content-contract test**

```ts
import { describe, expect, it } from 'vitest'
import { validateContent } from '../content/validate'

describe('validateContent', () => {
  it('rejects duplicate node ids and dangling trigger references', () => {
    const errors = validateContent({
      items: [],
      nodes: [fakeNode('W001'), fakeNode('W001')],
      triggers: [fakeTrigger('missing', 'ladder', 'also-missing')],
    })
    expect(errors).toContain('duplicate node id: W001')
    expect(errors).toContain('unknown target node: missing')
    expect(errors).toContain('unknown result node: also-missing')
  })
})
```

The test helper constructs a `VideoNode` with a 10-second duration, a single `StoryBeat`, empty comments, and empty item lists.

- [ ] **Step 4: Run the contract test and verify red**

Run: `npm test -- src/tests/content.test.ts`

Expected: FAIL because `types.ts` and `validate.ts` do not exist.

- [ ] **Step 5: Implement the content contracts and validator**

Define exact unions:

```ts
export type NodeId =
  | 'W001' | 'W101' | 'W200' | 'W300' | 'W301' | 'W400'
  | 'C001' | 'C101' | 'K001' | 'K101'
  | 'X001' | 'X004' | 'X012' | 'X016' | 'X021' | 'X028'
export type ItemId = 'ladder' | 'technician' | 'recorder' | 'projector'
export type Channel = 'wedding' | 'costume' | 'knowledge'
export type ResultKind = 'main' | 'resource' | 'wrong' | 'completion'
```

`validateContent()` returns a stable `string[]` covering duplicate IDs, unknown target/result/item references, duration outside `1..15`, result nodes incorrectly exposing gifts, and a node listing a selectable item without a matching trigger.

- [ ] **Step 6: Add the minimal app entry**

Render `<main>《刷到你了》加载中…</main>` from `App.tsx`; add mobile viewport and `theme-color: #050507` in `index.html`.

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test -- src/tests/content.test.ts && npm run typecheck`

Expected: all content tests PASS and TypeScript exits 0.

- [ ] **Step 8: Commit the foundation**

```bash
git add 刷到你了/web-prototype
git commit -m "feat: scaffold Shuadaonile web prototype"
```

---

### Task 2: Encode the sixteen-node catalog and trigger graph

**Files:**
- Create: `刷到你了/web-prototype/src/content/items.ts`
- Create: `刷到你了/web-prototype/src/content/nodes.ts`
- Create: `刷到你了/web-prototype/src/content/triggers.ts`
- Modify: `刷到你了/web-prototype/src/tests/content.test.ts`
- Test: `刷到你了/web-prototype/src/tests/trigger.test.ts`

**Interfaces:**
- Consumes: `ItemDefinition`, `VideoNode`, `TriggerDefinition`, `NodeId`, `ItemId` from Task 1.
- Produces: `ITEMS`, `NODES`, `NODE_BY_ID`, `TRIGGERS`, `findTrigger(targetNodeId, itemId)`.

- [ ] **Step 1: Write failing catalog tests**

Assert exact scope and route:

```ts
expect(NODES).toHaveLength(16)
expect(ITEMS.map(item => item.id)).toEqual([
  'ladder', 'technician', 'recorder', 'projector'
])
expect(validateContent({ items: ITEMS, nodes: NODES, triggers: TRIGGERS })).toEqual([])
expect(findTrigger('W001', 'ladder')?.resultNodeId).toBe('W101')
expect(findTrigger('K001', 'ladder')?.resultNodeId).toBe('K101')
expect(findTrigger('C001', 'recorder')?.resultNodeId).toBe('C101')
expect(findTrigger('W101', 'technician')?.resultNodeId).toBe('W200')
expect(findTrigger('W300', 'recorder')?.resultNodeId).toBe('W301')
expect(findTrigger('W301', 'projector')?.resultNodeId).toBe('W400')
```

Also assert the six wrong pairs map exactly to X001, X004, X012, X016, X021, and X028.

- [ ] **Step 2: Run catalog tests and verify red**

Run: `npm test -- src/tests/content.test.ts src/tests/trigger.test.ts`

Expected: FAIL because the catalog modules do not exist.

- [ ] **Step 3: Implement four items**

Use prices and source nodes:

| ID | Name | Price | Source |
|---|---|---:|---|
| ladder | 刺客同款多功能梯子 | 20 | C001 |
| technician | 同城空调师傅上门一次 | 25 | K001 |
| recorder | 带摄像头的录音笔 | 30 | K101 |
| projector | 婚庆大屏投影服务 | 35 | C101 |

Every item is repeatable and includes its exact one-sentence joke/usage description from the approved design documents.

- [ ] **Step 4: Implement sixteen node records**

Each node contains: exact title, channel, account name, duration, headline, summary, three to five timed `StoryBeat`s, subtitle, three comments, product ID when applicable, `selectableItemIds`, `resultKind`, and visual motif.

Use these gift lists:

```ts
W001: ['ladder', 'technician']
W101: ['technician', 'ladder']
W300: ['recorder', 'technician']
W301: ['projector', 'recorder']
C001: ['recorder', 'ladder']
K001: ['ladder', 'technician']
```

All other nodes expose `selectableItemIds: []`. W200 defines `onCompleteUnlock: 'W300'`. Wrong nodes are terminal and use the originating channel.

- [ ] **Step 5: Implement triggers**

Create twelve item triggers: six correct/resource and six wrong. Define the W200 automatic completion unlock separately in node data, not as an item trigger.

Correct trigger side effects:

```ts
W001 + ladder       => W101, kind main
K001 + ladder       => K101, kind resource, discover recorder
C001 + recorder     => C101, kind resource, discover projector
W101 + technician   => W200, kind main
W300 + recorder     => W301, kind main
W301 + projector    => W400, kind completion
```

- [ ] **Step 6: Run catalog and trigger tests**

Run: `npm test -- src/tests/content.test.ts src/tests/trigger.test.ts`

Expected: all tests PASS, including zero validation errors.

- [ ] **Step 7: Commit content data**

```bash
git add 刷到你了/web-prototype/src/content 刷到你了/web-prototype/src/tests
git commit -m "feat: add first-level content graph"
```

---

### Task 3: Build the progression engine, economy, and persistence

**Files:**
- Create: `刷到你了/web-prototype/src/engine/state.ts`
- Create: `刷到你了/web-prototype/src/engine/trigger.ts`
- Create: `刷到你了/web-prototype/src/engine/reducer.ts`
- Create: `刷到你了/web-prototype/src/engine/persistence.ts`
- Create: `刷到你了/web-prototype/src/engine/selectors.ts`
- Test: `刷到你了/web-prototype/src/tests/reducer.test.ts`
- Test: `刷到你了/web-prototype/src/tests/persistence.test.ts`

**Interfaces:**
- Consumes: content catalog from Task 2.
- Produces: `GameState`, `GameAction`, `createInitialState()`, `gameReducer()`, `resolveGift()`, `loadGame()`, `saveGame()`, `selectAvailableGifts()`.

- [ ] **Step 1: Write failing progression tests**

Test these exact rules:

```ts
const initial = createInitialState()
expect(initial.coins).toBe(100)
expect(initial.feedNodeIds).toEqual(['W001', 'C001', 'K001'])
expect(initial.discoveredItemIds).toEqual(['ladder', 'technician'])

const bought = gameReducer(initial, { type: 'BUY_ITEM', itemId: 'ladder' })
expect(bought.coins).toBe(80)
expect(bought.inventory.ladder).toBe(1)

const result = gameReducer(bought, {
  type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'ladder'
})
expect(result.inventory.ladder).toBe(0)
expect(result.pendingResultNodeId).toBe('W101')
expect(result.unlockedNodeIds).toContain('W101')
```

Add tests for wrong results entering destiny without replacing the current route, repeated triggers not consuming inventory, W200 completion unlocking W300, W400 setting `completed: true`, insufficient coins, and `CLAIM_DEMO_COINS` adding 100 coins.

- [ ] **Step 2: Write failing persistence tests**

Cover save/load, corrupt JSON copied to `shuadaonile.save-corrupt-<timestamp>`, unsupported version returning a `requiresReset` result, and static content absent from serialized JSON.

- [ ] **Step 3: Run engine tests and verify red**

Run: `npm test -- src/tests/reducer.test.ts src/tests/persistence.test.ts`

Expected: FAIL because engine files do not exist.

- [ ] **Step 4: Implement state and pure trigger resolution**

Use this state contract:

```ts
export interface GameState {
  version: 1
  coins: number
  inventory: Record<ItemId, number>
  discoveredItemIds: ItemId[]
  unlockedNodeIds: NodeId[]
  viewedNodeIds: NodeId[]
  feedNodeIds: NodeId[]
  triggeredKeys: string[]
  destinyNodeIds: NodeId[]
  currentNodeId: NodeId
  pendingResultNodeId: NodeId | null
  completed: boolean
  tutorialStep: 'product' | 'gift' | 'target' | 'done'
  muted: boolean
}
```

`resolveGift()` returns a discriminated union: `success`, `already-triggered`, `not-selectable`, or `missing-item`.

- [ ] **Step 5: Implement reducer actions**

Implement `BUY_ITEM`, `GIVE_ITEM`, `RESULT_FINISHED`, `NODE_VIEWED`, `CLAIM_DEMO_COINS`, `SET_CURRENT_NODE`, `SET_MUTED`, `ADVANCE_TUTORIAL`, and `RESET_GAME`. Reducer functions remain deterministic and never touch localStorage, time, audio, or DOM APIs.

- [ ] **Step 6: Implement persistence and selectors**

Use primary key `shuadaonile.save.v1`. Inject `Storage` and a `now(): number` function so persistence tests do not depend on global time. Selectors return discovered shop items, owned items, current curated gifts, current progress count, and ordered destiny records.

- [ ] **Step 7: Run engine tests and full typecheck**

Run: `npm test -- src/tests/reducer.test.ts src/tests/persistence.test.ts && npm run typecheck`

Expected: all tests PASS and TypeScript exits 0.

- [ ] **Step 8: Commit the engine**

```bash
git add 刷到你了/web-prototype/src/engine 刷到你了/web-prototype/src/tests
git commit -m "feat: add progression and save engine"
```

---

### Task 4: Implement deterministic feed ordering and navigation

**Files:**
- Create: `刷到你了/web-prototype/src/engine/feed.ts`
- Create: `刷到你了/web-prototype/src/feed/useFeedNavigation.ts`
- Test: `刷到你了/web-prototype/src/tests/feed.test.ts`

**Interfaces:**
- Consumes: `GameState`, `NodeId`, `NODE_BY_ID`.
- Produces: `rankFeed(state): NodeId[]` and `useFeedNavigation({ count, index, onChange, locked })`.

- [ ] **Step 1: Write failing ranking tests**

```ts
expect(rankFeed(createInitialState())).toEqual(['W001', 'C001', 'K001'])
expect(rankFeed(stateWithNewNode('W101'))[0]).toBe('W101')
expect(rankFeed(stateWithDestiny('X001'))).not.toContain('X001')
expect(rankFeed(stateWithViewedNodes())).toEqual(rankFeed(stateWithViewedNodes()))
```

Add a test that consecutive entries prefer different channels when an equally eligible alternative exists.

- [ ] **Step 2: Run feed tests and verify red**

Run: `npm test -- src/tests/feed.test.ts`

Expected: FAIL because `rankFeed` does not exist.

- [ ] **Step 3: Implement stable ranking**

Score pending/new node `1000`, unviewed `300`, current route `150`, and viewed `0`; exclude wrong nodes. Sort by score, then channel alternation pass, then original unlock index, then ID. Never use `Math.random()`.

- [ ] **Step 4: Implement the navigation hook**

The hook handles:

- pointer delta greater than 48 px;
- wheel delta accumulated to 60 px with a 350 ms cooldown;
- ArrowUp and ArrowDown;
- clamping to `0..count-1`;
- no navigation while `locked`.

Expose pointer and wheel handlers for the feed root and install/remove the keyboard listener in an effect.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/tests/feed.test.ts && npm run typecheck`

Expected: feed tests PASS and TypeScript exits 0.

- [ ] **Step 6: Commit feed logic**

```bash
git add 刷到你了/web-prototype/src/engine/feed.ts 刷到你了/web-prototype/src/feed 刷到你了/web-prototype/src/tests/feed.test.ts
git commit -m "feat: add deterministic video feed"
```

---

### Task 5: Build the responsive short-video shell and storyboard player

**Files:**
- Create: `刷到你了/web-prototype/src/game/GameProvider.tsx`
- Create: `刷到你了/web-prototype/src/game/useGame.ts`
- Create: `刷到你了/web-prototype/src/feed/PlaybackContext.tsx`
- Create: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Create: `刷到你了/web-prototype/src/feed/VideoFeed.tsx`
- Create: `刷到你了/web-prototype/src/feed/VideoCard.tsx`
- Create: `刷到你了/web-prototype/src/feed/StoryStage.tsx`
- Create: `刷到你了/web-prototype/src/shell/BottomNav.tsx`
- Create: `刷到你了/web-prototype/src/styles/reset.css`
- Create: `刷到你了/web-prototype/src/styles/tokens.css`
- Create: `刷到你了/web-prototype/src/styles/app.css`
- Create: `刷到你了/web-prototype/src/styles/feed.css`
- Create: `刷到你了/web-prototype/src/styles/stage.css`
- Modify: `刷到你了/web-prototype/src/App.tsx`
- Modify: `刷到你了/web-prototype/src/main.tsx`
- Test: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`

**Interfaces:**
- Consumes: state, selectors, ranking, and navigation from Tasks 3–4.
- Produces: rendered feed, `useGame()`, playback state, current-node selection.

- [ ] **Step 1: Write failing shell tests**

Render `<App />` with an in-memory storage adapter and assert:

```ts
expect(screen.getByText('婚礼开始第 7 秒，新娘死亡')).toBeVisible()
expect(screen.getByRole('button', { name: '改命礼物' })).toBeVisible()
expect(screen.getByRole('navigation', { name: '主导航' })).toBeVisible()
```

Advance with ArrowDown and assert the C001 account/title becomes current. Verify tapping the stage toggles the visible pause indicator.

- [ ] **Step 2: Run shell tests and verify red**

Run: `npm test -- src/tests/app-flow.test.tsx`

Expected: FAIL because the feed components do not exist.

- [ ] **Step 3: Implement provider and playback ownership**

`GameProvider` loads once, reduces actions, saves on state changes, and exposes `{ state, dispatch }`. `PlaybackContext` guarantees only the current node advances story time and pauses whenever a sheet is open or the document is hidden.

- [ ] **Step 4: Implement feed composition**

`VideoFeed` uses `transform: translate3d(0, -index * 100%, 0)` and one viewport-height card per node. `VideoCard` renders top tabs, account/title/subtitle, product card, right action rail, and the fixed gift button. Use lucide icons with text labels and `aria-label`s.

- [ ] **Step 5: Implement StoryStage**

Render a timed beat sequence using CSS variables and React state. Channel presentation:

- wedding: mauve/ivory stage lighting, clean subtitles, cinematic vignette;
- costume: crimson/gold palette, framed palace set, exaggerated hard-ad cards;
- knowledge: blue-gray room, `REC` badge, measurement overlays, jump-cut captions.

Wrong nodes add stronger shake, sticker, glitch, or split-screen effects according to `visualMotif`. Respect `prefers-reduced-motion` by replacing motion with opacity changes.

- [ ] **Step 6: Implement responsive shell CSS**

Use `100dvh`, `env(safe-area-inset-*)`, a 430 × 932 desktop cap, 44 px minimum hit targets, black desktop surround, and portrait-first media queries. Keep primary text contrast at or above 4.5:1.

- [ ] **Step 7: Run shell tests and build**

Run: `npm test -- src/tests/app-flow.test.tsx && npm run build`

Expected: tests PASS and Vite outputs `dist/` without TypeScript errors.

- [ ] **Step 8: Commit the playable feed shell**

```bash
git add 刷到你了/web-prototype
git commit -m "feat: build short-video feed shell"
```

---

### Task 6: Add products, inventory, gifts, tutorials, and feedback

**Files:**
- Create: `刷到你了/web-prototype/src/shell/Sheet.tsx`
- Create: `刷到你了/web-prototype/src/shell/Toast.tsx`
- Create: `刷到你了/web-prototype/src/commerce/ProductSheet.tsx`
- Create: `刷到你了/web-prototype/src/commerce/GiftSheet.tsx`
- Create: `刷到你了/web-prototype/src/commerce/InventorySheet.tsx`
- Create: `刷到你了/web-prototype/src/tutorial/TutorialCue.tsx`
- Create: `刷到你了/web-prototype/src/audio/feedback.ts`
- Create: `刷到你了/web-prototype/src/styles/sheets.css`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Modify: `刷到你了/web-prototype/src/feed/VideoCard.tsx`
- Modify: `刷到你了/web-prototype/src/styles/feed.css`
- Test: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`

**Interfaces:**
- Consumes: `BUY_ITEM`, `GIVE_ITEM`, inventory selectors, current node.
- Produces: one-sheet-at-a-time overlay state, purchase/gift flows, three tutorial cues, feedback tones.

- [ ] **Step 1: Add failing purchase and gift tests**

Test exact user flow:

```ts
await user.click(screen.getByRole('button', { name: /刺客同款多功能梯子/ }))
await user.click(screen.getByRole('button', { name: '购买 20 金币' }))
expect(screen.getByText('梯子 ×1')).toBeVisible()

await navigateTo('W001')
await user.click(screen.getByRole('button', { name: '改命礼物' }))
await user.click(screen.getByRole('button', { name: /梯子/ }))
await user.click(screen.getByRole('button', { name: '确认送入命运' }))
expect(await screen.findByText('有梯子，新娘还是死了')).toBeVisible()
```

Add tests for insufficient coins exposing “领取试玩金币”, only one sheet open, and unimplemented items absent from the gift sheet.

- [ ] **Step 2: Run interaction tests and verify red**

Run: `npm test -- src/tests/app-flow.test.tsx`

Expected: FAIL because commerce sheets do not exist.

- [ ] **Step 3: Implement accessible Sheet and Toast**

`Sheet` uses `role="dialog"`, `aria-modal="true"`, labelled title, Escape close, backdrop close, and focus return to its opener. `FeedScreen` owns a single discriminated overlay state so two sheets cannot coexist.

- [ ] **Step 4: Implement commerce flows**

`ProductSheet` shows item description, source, price, inventory, coins, purchase, and demo-coin action. `GiftSheet` shows only `selectAvailableGifts()` entries and disables zero-inventory entries with a direct “去购买” action. Confirmation dispatches `GIVE_ITEM` once and closes the sheet.

- [ ] **Step 5: Implement tutorial cues**

Use exact sequence: product-card pulse → “物品可以送入其他视频” toast → gift-button halo. Dispatch `ADVANCE_TUTORIAL` after the corresponding action. Never name the correct target or item in tutorial copy.

- [ ] **Step 6: Implement feedback audio**

Create `playFeedback('tap' | 'purchase' | 'rewrite' | 'destiny' | 'complete', muted)` using a lazily created `AudioContext`, short oscillator/gain envelopes, and no network assets. Catch suspended/unsupported audio without surfacing an error. Trigger audio only from user actions or result transitions.

- [ ] **Step 7: Run tests and build**

Run: `npm test -- src/tests/app-flow.test.tsx && npm run build`

Expected: interaction tests PASS and build exits 0.

- [ ] **Step 8: Commit interaction systems**

```bash
git add 刷到你了/web-prototype
git commit -m "feat: add shopping and fate gifts"
```

---

### Task 7: Add destiny records, comments, profile controls, and completion

**Files:**
- Create: `刷到你了/web-prototype/src/destiny/DestinySheet.tsx`
- Create: `刷到你了/web-prototype/src/destiny/CompletionOverlay.tsx`
- Create: `刷到你了/web-prototype/src/shell/CommentsSheet.tsx`
- Create: `刷到你了/web-prototype/src/shell/ProfileSheet.tsx`
- Modify: `刷到你了/web-prototype/src/shell/BottomNav.tsx`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Modify: `刷到你了/web-prototype/src/styles/sheets.css`
- Test: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`

**Interfaces:**
- Consumes: destiny/view/progress selectors and `RESET_GAME`, `SET_MUTED`.
- Produces: browsable destiny cards, comments, settings/reset, W400 completion overlay.

- [ ] **Step 1: Write failing wrong-ending and completion tests**

Trigger W001 + technician and assert X001 appears in 命运记录 while W001 remains solvable. Then run the full correct sequence and assert:

```ts
expect(await screen.findByRole('heading', { name: '婚礼顺利结束' })).toBeVisible()
expect(screen.getByText('让婚礼顺利结束——已完成')).toBeVisible()
expect(savedState.completed).toBe(true)
```

Test mute persistence and reset confirmation restoring the initial three nodes and 100 coins.

- [ ] **Step 2: Run final-flow tests and verify red**

Run: `npm test -- src/tests/app-flow.test.tsx`

Expected: FAIL because destiny/profile/completion components do not exist.

- [ ] **Step 3: Implement destiny and comments**

Destiny cards show node cover style, title, originating trigger, result type, and replay action. Replaying a destiny node does not add it to the main feed or award coins again. Comments render configured avatars, names, text, likes, and pinned state.

- [ ] **Step 4: Implement profile controls**

Show progress `unlocked correct nodes / 10`, destiny count `/ 6`, mute switch, content/about copy, and two-step reset confirmation. Do not render login, followers, editing, or cloud status.

- [ ] **Step 5: Implement completion overlay**

After W400 result finishes, show full-screen completion with “婚礼顺利结束”, progress summary, “继续收集命运”, and “重新开始”. Continuing closes the overlay and returns to feed without changing completion state.

- [ ] **Step 6: Run full tests and build**

Run: `npm test && npm run build`

Expected: all tests PASS and production build exits 0.

- [ ] **Step 7: Commit the complete game loop**

```bash
git add 刷到你了/web-prototype
git commit -m "feat: complete wedding prototype loop"
```

---

### Task 8: Harden loading, recovery, documentation, and browser presentation

**Files:**
- Create: `刷到你了/web-prototype/README.md`
- Modify: `刷到你了/web-prototype/src/feed/StoryStage.tsx`
- Modify: `刷到你了/web-prototype/src/game/GameProvider.tsx`
- Modify: `刷到你了/web-prototype/src/shell/ProfileSheet.tsx`
- Modify: `刷到你了/web-prototype/src/styles/app.css`
- Modify: `刷到你了/web-prototype/src/styles/stage.css`
- Modify: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`

**Interfaces:**
- Consumes: all earlier interfaces.
- Produces: final recoverable, documented, production-buildable demo.

- [ ] **Step 1: Add failing recovery tests**

Test document visibility pausing, reduced-motion class behavior, unsupported save showing a reset panel rather than the feed, and empty-feed recovery restoring at least W001/C001/K001.

- [ ] **Step 2: Run recovery tests and verify red**

Run: `npm test -- src/tests/app-flow.test.tsx src/tests/persistence.test.ts`

Expected: new recovery assertions FAIL.

- [ ] **Step 3: Implement recoverable fallback states**

StoryStage always renders headline/subtitle even if an optional media URL fails. GameProvider surfaces `requiresReset` as a dedicated screen. Empty feed calls a pure recovery function that restores the three roots without altering unlocked items or destiny history.

- [ ] **Step 4: Finish responsive and reduced-motion polish**

Verify CSS has `100dvh` fallback, safe areas, 430 × 932 cap, landscape message, `prefers-reduced-motion`, high-contrast captions, loading skeleton, disabled states, and 44 px hit targets.

- [ ] **Step 5: Write README**

Document exact commands:

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

Explain content file responsibilities, how to add one node/item/trigger, why selectable gifts must have triggers, localStorage keys, and the 16-node prototype scope.

- [ ] **Step 6: Run the complete automated gate**

Run: `npm test && npm run typecheck && npm run build`

Expected: zero failing tests, TypeScript exit 0, and Vite production build exit 0.

- [ ] **Step 7: Start the local production preview**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite prints a localhost URL and serves the feed without console errors.

- [ ] **Step 8: Perform browser QA**

Use the in-app browser to verify:

1. 390 × 844 mobile viewport: swipe/navigation, safe area, all sheets, full correct route;
2. 430 × 932 large phone: no clipped captions or controls;
3. 1440 × 1000 desktop: centered phone shell, wheel and keyboard navigation;
4. wrong-ending flow returns to the unresolved source;
5. refresh restores progress;
6. muted flow remains understandable;
7. W400 completion and continue/reset actions work.

Record every visual or interaction defect, fix it, rerun the affected automated test, and repeat the relevant browser path.

- [ ] **Step 9: Commit polish and documentation**

```bash
git add 刷到你了/web-prototype
git commit -m "test: verify polished web prototype"
```

---

### Task 9: Final verification and handoff

**Files:**
- Verify only; modify files only if a verification failure requires a focused fix.

**Interfaces:**
- Consumes: complete prototype.
- Produces: evidence-backed handoff.

- [ ] **Step 1: Inspect repository scope**

Run: `git status --short && git diff --check HEAD~8..HEAD`

Expected: no unintended staged files, no whitespace errors, and changes limited to the prototype plus its approved docs.

- [ ] **Step 2: Run fresh full verification**

Run: `cd 刷到你了/web-prototype && npm test && npm run typecheck && npm run build`

Expected: all tests PASS, typecheck exits 0, build exits 0.

- [ ] **Step 3: Inspect commit history**

Run: `git log --oneline -10`

Expected: small commits matching the task boundaries and no unrelated user files.

- [ ] **Step 4: Prepare handoff summary**

Report the implemented route, six wrong endings, device/browser checks, test count, build result, project path, run command, and any remaining content-production limitation. Do not claim video footage exists if a node is using the animated storyboard renderer.
