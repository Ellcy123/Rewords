# Active Feed and Recommended Gifts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the complete W001-to-W400 route while archiving resolved videos, keeping wrong choices playable, and making the correct gift and its acquisition path visible.

**Architecture:** Add explicit resolution state and keep feed membership as the active-play projection of that state. Put recommendation decisions in a pure selector, persistence migration in the persistence boundary, and keep UI components limited to rendering option states and dispatching semantic actions.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 4, Testing Library, CSS.

## Global Constraints

- Keep W300, W301, and W400 in the playable route.
- Do not add chapters or a visible second-phase concept.
- Correctly resolved videos leave the feed; wrong outcomes do not remove their source.
- The correct gift is always marked “推荐赠送”, but is never automatically selected or sent.
- Version-1 saves migrate without losing coins, inventory, progress, settings, or alternate fates.
- Do not add the rewarded coin minigame in this change.

---

### Task 1: Resolution State and Active Feed

**Files:**
- Modify: `刷到你了/web-prototype/src/engine/state.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/web-prototype/src/engine/feed.ts`
- Modify: `刷到你了/web-prototype/src/tests/reducer.test.ts`
- Modify: `刷到你了/web-prototype/src/tests/feed.test.ts`

**Interfaces:**
- Produces: `GameState.resolvedNodeIds: NodeId[]`.
- Produces: reducer behavior where successful non-wrong gifts resolve and remove their target, `NODE_FINISHED` resolves W200 and activates W300, and finishing W400 resolves it and completes the game.
- Consumes: existing `TRIGGERS`, `NODE_BY_ID`, and `feedNodeIds`.

- [ ] **Step 1: Write failing reducer and feed tests**

Add assertions equivalent to:

```ts
it('archives a correctly resolved source but keeps a wrong source active', () => {
  const correctStart = { ...createInitialState(), inventory: { ...createInitialState().inventory, ladder: 1 } }
  const correct = gameReducer(correctStart, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'ladder' })
  expect(correct.resolvedNodeIds).toContain('W001')
  expect(correct.feedNodeIds).not.toContain('W001')
  expect(correct.feedNodeIds).toContain('W101')

  const wrongStart = { ...createInitialState(), inventory: { ...createInitialState().inventory, technician: 1 } }
  const wrong = gameReducer(wrongStart, { type: 'GIVE_ITEM', targetNodeId: 'W001', itemId: 'technician' })
  expect(wrong.resolvedNodeIds).not.toContain('W001')
  expect(wrong.feedNodeIds).toContain('W001')
})

it('resolves W200 into W300 and filters resolved nodes from ranking', () => {
  const state = { ...createInitialState(), feedNodeIds: ['W200'], unlockedNodeIds: ['W200'], currentNodeId: 'W200' } as ReturnType<typeof createInitialState>
  const next = gameReducer(state, { type: 'NODE_FINISHED', nodeId: 'W200' })
  expect(next.resolvedNodeIds).toContain('W200')
  expect(rankFeed(next)).toEqual(['W300'])
})
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --run src/tests/reducer.test.ts src/tests/feed.test.ts`

Expected: FAIL because `resolvedNodeIds` does not exist and resolved sources remain in `feedNodeIds`.

- [ ] **Step 3: Implement the minimal resolution model**

Add `resolvedNodeIds` to `GameState` and initialize it to `[]`. In `GIVE_ITEM`, apply this shape for non-wrong triggers:

```ts
const resolvedNodeIds = wrong ? state.resolvedNodeIds : appendUnique(state.resolvedNodeIds, action.targetNodeId)
const feedWithoutTarget = wrong ? state.feedNodeIds : state.feedNodeIds.filter(id => id !== action.targetNodeId)
return {
  ...state,
  inventory: { ...state.inventory, [action.itemId]: state.inventory[action.itemId] - 1 },
  triggeredKeys: [...state.triggeredKeys, key],
  resolvedNodeIds,
  unlockedNodeIds: appendUnique(state.unlockedNodeIds, trigger.resultNodeId),
  feedNodeIds: wrong ? state.feedNodeIds : appendUnique(feedWithoutTarget, trigger.resultNodeId),
  destinyNodeIds: wrong ? appendUnique(state.destinyNodeIds, trigger.resultNodeId) : state.destinyNodeIds,
  discoveredItemIds: trigger.discoverItemId ? appendUnique(state.discoveredItemIds, trigger.discoverItemId) : state.discoveredItemIds,
  pendingResultNodeId: trigger.resultNodeId,
}
```

Make `NODE_FINISHED` remove and resolve the finishing node before adding its configured unlock. Make `RESULT_FINISHED` resolve and remove W400 while setting `completed`. Filter resolved IDs defensively in `rankFeed`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/tests/reducer.test.ts src/tests/feed.test.ts`

Expected: both files PASS.

- [ ] **Step 5: Commit**

```bash
git add 刷到你了/web-prototype/src/engine/state.ts 刷到你了/web-prototype/src/engine/reducer.ts 刷到你了/web-prototype/src/engine/feed.ts 刷到你了/web-prototype/src/tests/reducer.test.ts 刷到你了/web-prototype/src/tests/feed.test.ts
git commit -m "feat: archive resolved videos from active feed"
```

### Task 2: Version-1 Save Migration and Recovery

**Files:**
- Modify: `刷到你了/web-prototype/src/engine/state.ts`
- Modify: `刷到你了/web-prototype/src/engine/persistence.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/web-prototype/src/tests/persistence.test.ts`
- Modify: `刷到你了/web-prototype/src/tests/reducer.test.ts`

**Interfaces:**
- Produces: schema version `2` and `migrateV1(value): GameState` inside the persistence boundary.
- Produces: `RECOVER_FEED` behavior that restores unresolved unlocked nodes only.
- Consumes: `GameState.resolvedNodeIds` from Task 1 and trigger keys formatted as `targetNodeId:itemId`.

- [ ] **Step 1: Write failing migration and recovery tests**

```ts
it('migrates a version-1 save and derives resolved sources', () => {
  const legacy = { ...createInitialState(), version: 1, triggeredKeys: ['W001:ladder'], unlockedNodeIds: ['W001', 'W101'], feedNodeIds: ['W001', 'W101'] }
  delete (legacy as Partial<typeof legacy>).resolvedNodeIds
  storage.setItem(SAVE_KEY, JSON.stringify(legacy))
  const result = loadGame(storage)
  expect(result.kind).toBe('loaded')
  if (result.kind === 'loaded') {
    expect(result.state.version).toBe(2)
    expect(result.state.resolvedNodeIds).toContain('W001')
    expect(result.state.feedNodeIds).toEqual(['W101'])
  }
})

it('recovers only unresolved unlocked nodes', () => {
  const state = { ...createInitialState(), feedNodeIds: [], resolvedNodeIds: ['W001'], unlockedNodeIds: ['W001', 'C001', 'K001'] }
  const recovered = gameReducer(state, { type: 'RECOVER_FEED' })
  expect(recovered.feedNodeIds).toEqual(['C001', 'K001'])
})
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- --run src/tests/persistence.test.ts src/tests/reducer.test.ts`

Expected: FAIL because version 1 is not migrated and recovery restores fixed roots.

- [ ] **Step 3: Implement migration and state normalization**

Set new states to `version: 2`. For a version-1 value, derive resolved targets from successful trigger keys by comparing them with non-wrong trigger definitions; add W200 when W300 is unlocked and W400 when completed. Preserve all existing fields, default absent arrays from a fresh state, and filter the derived resolved IDs from `feedNodeIds`.

Keep unknown versions on the existing `requires-reset` path. Change `RECOVER_FEED` to:

```ts
const recoverable = state.unlockedNodeIds.filter(id => !state.resolvedNodeIds.includes(id) && NODE_BY_ID[id].resultKind !== 'wrong')
return state.feedNodeIds.length ? state : { ...state, feedNodeIds: recoverable.length ? recoverable : state.completed ? [] : ['W001', 'C001', 'K001'].filter(id => !state.resolvedNodeIds.includes(id as NodeId)) as NodeId[] }
```

- [ ] **Step 4: Run persistence and reducer tests**

Run: `npm test -- --run src/tests/persistence.test.ts src/tests/reducer.test.ts`

Expected: both files PASS, including corrupt and unknown-version cases.

- [ ] **Step 5: Commit**

```bash
git add 刷到你了/web-prototype/src/engine/state.ts 刷到你了/web-prototype/src/engine/persistence.ts 刷到你了/web-prototype/src/engine/reducer.ts 刷到你了/web-prototype/src/tests/persistence.test.ts 刷到你了/web-prototype/src/tests/reducer.test.ts
git commit -m "feat: migrate saves to resolved video state"
```

### Task 3: Recommended Gift Selector and Acquisition Actions

**Files:**
- Create: `刷到你了/web-prototype/src/engine/recommendations.ts`
- Create: `刷到你了/web-prototype/src/tests/recommendations.test.ts`
- Modify: `刷到你了/web-prototype/src/content/triggers.ts`
- Modify: `刷到你了/web-prototype/src/commerce/GiftSheet.tsx`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Modify: `刷到你了/web-prototype/src/styles/sheets.css`

**Interfaces:**
- Produces: `selectGiftOptions(state: GameState, nodeId: NodeId): GiftOption[]`.
- Produces: `GiftOption` with `item`, `recommended`, `availability: 'owned' | 'buy' | 'find' | 'unavailable'`, and optional `destinationNodeId`.
- Produces: `GiftSheet` callbacks `onPurchase(itemId)` and `onFind(nodeId)`.
- Consumes: `findCorrectTrigger(nodeId)` and `findDiscoveryTrigger(itemId)` pure helpers.

- [ ] **Step 1: Write failing selector tests**

```ts
it('marks owned, purchasable, and undiscovered recommended gifts', () => {
  const owned = { ...createInitialState(), inventory: { ...createInitialState().inventory, ladder: 1 } }
  expect(selectGiftOptions(owned, 'W001').find(option => option.item.id === 'ladder')).toMatchObject({ recommended: true, availability: 'owned' })

  expect(selectGiftOptions(createInitialState(), 'W001').find(option => option.item.id === 'ladder')).toMatchObject({ recommended: true, availability: 'buy' })

  expect(selectGiftOptions(createInitialState(), 'W300').find(option => option.item.id === 'recorder')).toMatchObject({ recommended: true, availability: 'find', destinationNodeId: 'K001' })
})
```

- [ ] **Step 2: Run the selector test and confirm failure**

Run: `npm test -- --run src/tests/recommendations.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement pure recommendation selection**

```ts
export interface GiftOption {
  item: ItemDefinition
  recommended: boolean
  availability: 'owned' | 'buy' | 'find' | 'unavailable'
  destinationNodeId?: NodeId
}

export function selectGiftOptions(state: GameState, nodeId: NodeId): GiftOption[] {
  const correct = findCorrectTrigger(nodeId)
  return NODE_BY_ID[nodeId].selectableItemIds.map(itemId => {
    const item = ITEM_BY_ID[itemId]
    if (state.inventory[itemId] > 0) return { item, recommended: correct?.itemId === itemId, availability: 'owned' }
    if (state.discoveredItemIds.includes(itemId)) return { item, recommended: correct?.itemId === itemId, availability: 'buy' }
    const discovery = findDiscoveryTrigger(itemId)
    const destinationNodeId = discovery && state.feedNodeIds.includes(discovery.targetNodeId) ? discovery.targetNodeId : undefined
    return { item, recommended: correct?.itemId === itemId, availability: destinationNodeId ? 'find' : 'unavailable', destinationNodeId }
  })
}
```

Only non-wrong triggers qualify as correct or discovery triggers.

- [ ] **Step 4: Render and wire acquisition states**

Replace `selectAvailableGifts` usage in `GiftSheet` with `selectGiftOptions`. Render “推荐赠送” on the recommended card, “去购买” for `buy`, “去找线索” for `find`, and a disabled recovery label for `unavailable`. Keep all owned wrong gifts selectable.

In `FeedScreen`, extend the overlay state so `onPurchase(itemId)` opens `ProductSheet` directly and its close action returns to the originating gift sheet. Implement `onFind(nodeId)` by closing the sheet, setting the matching feed index, and dispatching `SET_CURRENT_NODE`.

- [ ] **Step 5: Run selector and app-flow tests**

Run: `npm test -- --run src/tests/recommendations.test.ts src/tests/app-flow.test.tsx`

Expected: PASS with the correct badge and both acquisition actions reachable by accessible button names.

- [ ] **Step 6: Commit**

```bash
git add 刷到你了/web-prototype/src/content/triggers.ts 刷到你了/web-prototype/src/engine/recommendations.ts 刷到你了/web-prototype/src/tests/recommendations.test.ts 刷到你了/web-prototype/src/commerce/GiftSheet.tsx 刷到你了/web-prototype/src/feed/FeedScreen.tsx 刷到你了/web-prototype/src/styles/sheets.css
git commit -m "feat: guide players with recommended gifts"
```

### Task 4: Records Sheet and Read-only Replay

**Files:**
- Create: `刷到你了/web-prototype/src/destiny/RecordsSheet.tsx`
- Create: `刷到你了/web-prototype/src/feed/ReplayOverlay.tsx`
- Modify: `刷到你了/web-prototype/src/engine/selectors.ts`
- Modify: `刷到你了/web-prototype/src/shell/BottomNav.tsx`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Modify: `刷到你了/web-prototype/src/styles/sheets.css`
- Modify: `刷到你了/web-prototype/src/styles/feed.css`
- Modify: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`

**Interfaces:**
- Produces: `selectResolvedNodes(state): VideoNode[]` in content story order.
- Produces: `RecordsSheet({ onClose, onReplay })` with “已改写” and “别的命运” tabs.
- Produces: `ReplayOverlay({ node, onClose })` with playback and no gifting or progression actions.
- Consumes: existing `selectDestinyNodes`, `StoryStage`, and `PlaybackProvider`.

- [ ] **Step 1: Write a failing records interaction test**

```tsx
it('separates resolved videos from alternate fates and replays without changing progress', async () => {
  const state = createInitialState()
  state.resolvedNodeIds = ['W001']
  state.destinyNodeIds = ['X001']
  render(<App storage={memoryStorage(state)} />)
  await userEvent.click(screen.getByRole('button', { name: '记录' }))
  expect(screen.getByRole('button', { name: '已改写' })).toBeTruthy()
  expect(screen.getByText('婚礼灯架事故')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: /重看婚礼灯架事故/ }))
  expect(screen.getByRole('button', { name: '关闭重看' })).toBeTruthy()
})
```

- [ ] **Step 2: Run the app-flow test and confirm failure**

Run: `npm test -- --run src/tests/app-flow.test.tsx`

Expected: FAIL because the navigation still says “命运” and no resolved archive exists.

- [ ] **Step 3: Implement records and replay components**

Return resolved nodes by filtering `NODES` against `resolvedNodeIds`, preserving content order. Build `RecordsSheet` with local tab state and use the existing destiny list visual pattern for both lists. Build `ReplayOverlay` from `StoryStage`, a close button, node account/headline/subtitle, and no product or gift callbacks.

Rename the nav label and callback to “记录”. Add `records` and `replay` overlay variants in `FeedScreen`; replay must not dispatch reducer actions.

- [ ] **Step 4: Run app-flow tests**

Run: `npm test -- --run src/tests/app-flow.test.tsx`

Expected: PASS, including existing wrong-outcome and completion scenarios updated to open “记录”.

- [ ] **Step 5: Commit**

```bash
git add 刷到你了/web-prototype/src/destiny/RecordsSheet.tsx 刷到你了/web-prototype/src/feed/ReplayOverlay.tsx 刷到你了/web-prototype/src/engine/selectors.ts 刷到你了/web-prototype/src/shell/BottomNav.tsx 刷到你了/web-prototype/src/feed/FeedScreen.tsx 刷到你了/web-prototype/src/styles/sheets.css 刷到你了/web-prototype/src/styles/feed.css 刷到你了/web-prototype/src/tests/app-flow.test.tsx
git commit -m "feat: add resolved and alternate fate records"
```

### Task 5: Continuous W200 Transition and Full-route Verification

**Files:**
- Modify: `刷到你了/web-prototype/src/feed/StoryStage.tsx`
- Modify: `刷到你了/web-prototype/src/feed/VideoCard.tsx`
- Modify: `刷到你了/web-prototype/src/feed/VideoFeed.tsx`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Modify: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`
- Create: `刷到你了/web-prototype/src/tests/complete-route.test.ts`
- Modify: `刷到你了/web-prototype/README.md`

**Interfaces:**
- Produces: optional `onPlaybackComplete` callback propagated from `StoryStage` through `VideoCard` and `VideoFeed`.
- Consumes: W200 `onCompleteUnlock` metadata and reducer actions from Task 1.

- [ ] **Step 1: Write failing automatic-transition and route tests**

Use fake timers to render a pending W200 result, advance its full duration, and assert W300 is shown without clicking “继续刷”. Add a reducer-level complete-route test that buys or grants required inventory, executes both resource routes and every main trigger, finishes W200, and finishes W400; assert `completed === true`, W400 is resolved, and every correctly replaced source is absent from `rankFeed`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- --run src/tests/app-flow.test.tsx src/tests/complete-route.test.ts`

Expected: FAIL because story playback has no completion callback and W200 still needs the result button.

- [ ] **Step 3: Implement one-shot playback completion**

Add an optional callback to `StoryStage` and invoke it once when the final beat is first reached for the active node. Reset the one-shot guard when `node.id` changes. Propagate the callback through `VideoCard` and `VideoFeed`.

In `FeedScreen`, pass the callback only when the current pending result has `onCompleteUnlock`. On W200 completion, dispatch `RESULT_FINISHED` and `NODE_FINISHED`; the reducer archives W200 and focuses W300. Keep the explicit W400 “完成婚礼” action and wrong-result collection action.

- [ ] **Step 4: Update README behavior notes**

Document that resolved videos move to Records, wrong results remain collectible, W200 flows directly to W300, and recommended gifts can open purchase or clue routes.

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all Vitest files pass, TypeScript exits 0, and Vite plus the Sites preparation script produce `dist/server/index.js`.

- [ ] **Step 6: Commit**

```bash
git add 刷到你了/web-prototype/src/feed/StoryStage.tsx 刷到你了/web-prototype/src/feed/VideoCard.tsx 刷到你了/web-prototype/src/feed/VideoFeed.tsx 刷到你了/web-prototype/src/feed/FeedScreen.tsx 刷到你了/web-prototype/src/tests/app-flow.test.tsx 刷到你了/web-prototype/src/tests/complete-route.test.ts 刷到你了/web-prototype/README.md
git commit -m "feat: make the wedding route continuous"
```

### Task 6: Mobile Smoke Test and Public Deployment

**Files:**
- Modify only if required by a verified defect: files already named in Tasks 1–5.
- Verify: `刷到你了/web-prototype/.openai/hosting.json`

**Interfaces:**
- Consumes: production build and existing Sites project configuration.
- Produces: a public deployment of the verified build at the existing试玩 URL.

- [ ] **Step 1: Start the production preview and test a mobile viewport**

Run: `npm run dev -- --host 127.0.0.1`

At a phone-sized viewport, verify swipe navigation, gift recommendation badges, direct purchase, clue navigation, Records tabs, W200 automatic transition, and W400 completion.

- [ ] **Step 2: Re-run checks after any verified smoke-test fix**

Run: `npm test && npm run typecheck && npm run build`

Expected: every command exits 0.

- [ ] **Step 3: Deploy the built site to the existing Sites project**

Use the hosting configuration in `.openai/hosting.json`, publish a new version, and keep access public.

- [ ] **Step 4: Verify the public response**

Open the public URL in a fresh session and verify HTTP 200, the title “刷到你了”, and the new “记录” plus “推荐赠送” UI.

- [ ] **Step 5: Commit any deployment metadata change**

If the deployment changes tracked metadata, commit only that metadata with message `chore: publish active feed prototype`.
