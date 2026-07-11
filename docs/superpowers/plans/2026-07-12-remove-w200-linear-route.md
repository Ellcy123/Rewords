# Remove W200 Linear Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove W200 completely and make `W101 + technician` enter an immediately interactive W300 containing both the rescue and rumor story.

**Architecture:** Update the content graph so W300 is the direct trigger result, and let interactive main-result nodes become current without entering pending-result state. Migrate old W200 saves to schema version 3 at the persistence boundary, then delete the now-unused playback-completion transition from the UI.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 4, Testing Library, Sites hosting.

## Global Constraints

- The route is exactly `W001 -> W101 -> W300 -> W301 -> W400`.
- W200 must not be playable, recorded, timed, or referenced by fresh content.
- W300 must include repair, survival, recording, malicious edit, and accusation beats.
- W300 must accept the recorder immediately, without “继续刷”.
- Version-1 and version-2 saves must migrate without reset or progress loss.

---

### Task 1: Replace W200 with an Interactive W300

**Files:**
- Modify: `刷到你了/web-prototype/src/content/types.ts`
- Modify: `刷到你了/web-prototype/src/content/nodes.ts`
- Modify: `刷到你了/web-prototype/src/content/triggers.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/web-prototype/src/tests/content.test.ts`
- Modify: `刷到你了/web-prototype/src/tests/reducer.test.ts`
- Modify: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`

**Interfaces:**
- Produces: `findTrigger('W101', 'technician')?.resultNodeId === 'W300'`.
- Produces: successful results with selectable gifts set `currentNodeId` to the result and leave `pendingResultNodeId` null.
- Consumes: `NODE_BY_ID[resultNodeId].selectableItemIds` to identify interactive results.

- [ ] **Step 1: Write failing content and reducer tests**

```ts
it('routes the repaired wedding directly into the combined W300 story', () => {
  expect(NODE_BY_ID).not.toHaveProperty('W200')
  expect(findTrigger('W101', 'technician')?.resultNodeId).toBe('W300')
  expect(NODE_BY_ID.W300.beats.map(beat => beat.text).join(' ')).toContain('新娘活下来了')
  expect(NODE_BY_ID.W300.beats.map(beat => beat.text).join(' ')).toContain('私会维修工')
})

it('opens an interactive main result without a pending confirmation', () => {
  const state = createInitialState()
  state.inventory.technician = 1
  state.unlockedNodeIds.push('W101')
  state.feedNodeIds.push('W101')
  const result = gameReducer(state, { type: 'GIVE_ITEM', targetNodeId: 'W101', itemId: 'technician' })
  expect(result.currentNodeId).toBe('W300')
  expect(result.pendingResultNodeId).toBeNull()
  expect(result.feedNodeIds).toContain('W300')
})

it('enters the combined W300 immediately after giving the technician to W101', async () => {
  const state = createInitialState()
  state.inventory.technician = 1
  state.unlockedNodeIds = ['W101']
  state.feedNodeIds = ['W101']
  state.currentNodeId = 'W101'
  render(<App storage={memoryStorage(state)} />)
  await userEvent.click(screen.getByRole('button', { name: '改命礼物' }))
  await userEvent.click(screen.getByRole('button', { name: /选择空调师傅/ }))
  await userEvent.click(screen.getByRole('button', { name: '确认送入命运' }))
  expect(screen.getAllByText('新娘婚礼当天私会维修工？').length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: '继续刷' })).toBeNull()
})
```

- [ ] **Step 2: Run tests and verify the expected failures**

Run: `npm test -- --run src/tests/content.test.ts src/tests/reducer.test.ts src/tests/app-flow.test.tsx -t "directly|interactive|combined W300"`

Expected: FAIL because W200 exists, the trigger targets W200, and interactive results still become pending.

- [ ] **Step 3: Implement the direct content graph**

Remove W200 from `NodeId` and `NODES`. Change the W101 technician trigger to W300. Replace W300 beats with a single continuous sequence containing these exact story facts:

```ts
beats(
  [0, '空调师傅踩上梯子修好灯架'],
  [2, '这一次，新娘活下来了', '婚礼继续'],
  [5, '新娘握手感谢维修工', '伴娘举起了手机'],
  [8, '新娘婚礼当天私会维修工？', '前后内容被恶意剪掉'],
  [11, '“有完整证据吗？”'],
)
```

In `GIVE_ITEM`, calculate whether the result is interactive and focus it immediately:

```ts
const resultNode = NODE_BY_ID[trigger.resultNodeId]
const interactiveResult = !wrong && resultNode.selectableItemIds.length > 0
return {
  ...state,
  currentNodeId: interactiveResult ? trigger.resultNodeId : state.currentNodeId,
  pendingResultNodeId: interactiveResult ? null : trigger.resultNodeId,
  // preserve the existing inventory, trigger, resolved, unlocked, feed, destiny, and discovery updates
}
```

Remove W200-specific completion logic from reducer tests and update existing correct-gift expectations so W101 is immediate rather than pending.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/tests/content.test.ts src/tests/reducer.test.ts src/tests/complete-route.test.ts`

Expected: PASS with no W200 content reference.

- [ ] **Step 5: Commit**

```bash
git add 刷到你了/web-prototype/src/content/types.ts 刷到你了/web-prototype/src/content/nodes.ts 刷到你了/web-prototype/src/content/triggers.ts 刷到你了/web-prototype/src/engine/reducer.ts 刷到你了/web-prototype/src/tests/content.test.ts 刷到你了/web-prototype/src/tests/reducer.test.ts 刷到你了/web-prototype/src/tests/app-flow.test.tsx
git commit -m "feat: route wedding repair directly to W300"
```

### Task 2: Migrate W200 Saves to Schema Version 3

**Files:**
- Modify: `刷到你了/web-prototype/src/engine/state.ts`
- Modify: `刷到你了/web-prototype/src/engine/persistence.ts`
- Modify: `刷到你了/web-prototype/src/tests/persistence.test.ts`

**Interfaces:**
- Produces: `GameState.version: 3`.
- Produces: `repairLegacyW200(value)` that removes W200 and activates W300.
- Consumes: existing version-1 trigger-derived migration and version-2 saved state fields.

- [ ] **Step 1: Write a failing version-2 migration test**

```ts
it('moves a version-2 save stopped at W200 directly to W300', () => {
  const legacy = {
    ...createInitialState(),
    version: 2,
    unlockedNodeIds: ['W001', 'W101', 'W200'],
    feedNodeIds: ['W200'],
    currentNodeId: 'W200',
    pendingResultNodeId: 'W200',
    viewedNodeIds: ['W200'],
    resolvedNodeIds: ['W001', 'W101', 'W200'],
  }
  storage.setItem(SAVE_KEY, JSON.stringify(legacy))
  const result = loadGame(storage)
  expect(result.kind).toBe('loaded')
  if (result.kind === 'loaded') {
    expect(result.state.version).toBe(3)
    expect(result.state.currentNodeId).toBe('W300')
    expect(result.state.pendingResultNodeId).toBeNull()
    expect(JSON.stringify(result.state)).not.toContain('W200')
  }
})
```

- [ ] **Step 2: Run the persistence test and verify failure**

Run: `npm test -- --run src/tests/persistence.test.ts`

Expected: FAIL because the current schema is version 2 and retains W200.

- [ ] **Step 3: Implement version-3 normalization**

Set fresh state to version 3. Parse legacy arrays as strings before narrowing them to current `NodeId` values. If any legacy progress field contains W200, remove it, add W300 to unlocked and feed nodes, set current to W300 when current was W200, and clear a W200 pending result. Drop W200 from viewed and resolved records rather than recording it.

Apply the same repair after version-1 derivation and directly to version-2 saves. Version 3 saves use normal state normalization; unknown versions still require safe reset.

- [ ] **Step 4: Run persistence and type checks**

Run: `npm test -- --run src/tests/persistence.test.ts && npm run typecheck`

Expected: PASS for v1, v2, v3, corrupt, and unknown-version cases.

- [ ] **Step 5: Commit**

```bash
git add 刷到你了/web-prototype/src/engine/state.ts 刷到你了/web-prototype/src/engine/persistence.ts 刷到你了/web-prototype/src/tests/persistence.test.ts
git commit -m "feat: migrate W200 saves to W300"
```

### Task 3: Remove the Timed Transition and Publish

**Files:**
- Modify: `刷到你了/web-prototype/src/feed/StoryStage.tsx`
- Modify: `刷到你了/web-prototype/src/feed/VideoCard.tsx`
- Modify: `刷到你了/web-prototype/src/feed/VideoFeed.tsx`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Delete: `刷到你了/web-prototype/src/tests/story-stage.test.tsx`
- Modify: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`
- Modify: `刷到你了/web-prototype/src/tests/complete-route.test.ts`
- Modify: `刷到你了/web-prototype/README.md`

**Interfaces:**
- Removes: `onPlaybackComplete` from StoryStage, VideoCard, VideoFeed, and FeedScreen.
- Produces: immediate app-level W101-to-W300 interaction with no W200 or “继续刷”.
- Consumes: direct reducer behavior from Task 1 and migration from Task 2.

- [ ] **Step 1: Establish the direct-flow regression test as a green safety net**

```tsx
it('enters the combined W300 immediately after giving the technician to W101', async () => {
  const state = createInitialState()
  state.inventory.technician = 1
  state.unlockedNodeIds = ['W101']
  state.feedNodeIds = ['W101']
  state.currentNodeId = 'W101'
  render(<App storage={memoryStorage(state)} />)
  await userEvent.click(screen.getByRole('button', { name: '改命礼物' }))
  await userEvent.click(screen.getByRole('button', { name: /选择空调师傅/ }))
  await userEvent.click(screen.getByRole('button', { name: '确认送入命运' }))
  expect(screen.getAllByText('新娘婚礼当天私会维修工？').length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: '继续刷' })).toBeNull()
})
```

- [ ] **Step 2: Run the app-flow test before refactoring**

Run: `npm test -- --run src/tests/app-flow.test.tsx -t "combined W300"`

Expected: PASS after Task 1, proving the direct route remains protected while obsolete callback wiring is removed.

- [ ] **Step 3: Remove playback completion wiring**

Remove the callback prop, completed-cycle ref, and callback effect from StoryStage. Remove callback forwarding from VideoCard and VideoFeed. Remove the callback handler and `onCompleteUnlock` result-button exception from FeedScreen. Delete the obsolete StoryStage callback test.

Update the complete-route test to go directly from `GIVE_ITEM W101 technician` to W300. Update README with the five-node route and schema version 3.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass, TypeScript exits 0, and Sites output is generated.

- [ ] **Step 5: Commit**

```bash
git add 刷到你了/web-prototype/src/feed 刷到你了/web-prototype/src/tests 刷到你了/web-prototype/README.md
git commit -m "fix: remove W200 timed transition"
```

- [ ] **Step 6: Publish and verify**

Push the exact committed source to the existing Sites source repository, package the validated build, save a new version, deploy it publicly, and verify the public HTML returns HTTP 200 with W300 content and no W200 content.
