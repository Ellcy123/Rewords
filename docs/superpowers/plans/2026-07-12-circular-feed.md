# Circular Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three-card recommendation feed loop infinitely in both directions without remounting the incoming video card.

**Architecture:** `VideoFeed` keeps an unbounded virtual position and maps it to the parent’s finite node index with safe modulo. `useFeedNavigation` gains an opt-in loop mode that removes first/last boundaries when at least two items exist. The three rendered cards are keyed by virtual position so the incoming card remains the same DOM element through settlement.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite

## Global Constraints

- More than one video loops in both directions for touch, wheel, and arrow keys.
- One video never changes index and rebounds after dragging.
- Preserve the existing 20% distance threshold, 0.55 px/ms velocity threshold, click suppression, locked state, and 240ms transition.
- Parent game state continues to receive only finite indexes from `0` through `count - 1`.
- Do not remount the incoming card during `3 → 1` or `1 → 3` settlement.

---

### Task 1: Loop-capable gesture state machine

**Files:**
- Modify: `刷到你了/web-prototype/src/feed/useFeedNavigation.ts`
- Test: `刷到你了/web-prototype/src/tests/feed-navigation.test.tsx`

**Interfaces:**
- Consumes: `{ count, index, onChange, locked, loop?: boolean }`
- Produces: the existing navigation return value; in loop mode `onChange` receives an unbounded adjacent virtual position.

- [ ] **Step 1: Write failing loop boundary tests**

Extend the test harness with `loop?: boolean`, then add tests which assert that ArrowDown from virtual position `2` returns `3`, ArrowUp from `0` returns `-1`, a drag past index `0` has no `0.28` boundary resistance in loop mode, and `count={1}` still rebounds without calling `onChange`.

```tsx
fireEvent.keyDown(window, { key: 'ArrowDown' })
fireEvent.transitionEnd(feed)
expect(onChange).toHaveBeenCalledWith(3)

fireEvent.keyDown(window, { key: 'ArrowUp' })
fireEvent.transitionEnd(feed)
expect(onChange).toHaveBeenCalledWith(-1)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/tests/feed-navigation.test.tsx`

Expected: FAIL because `loop` is not accepted and edge navigation still settles to direction `0`.

- [ ] **Step 3: Implement the minimal loop option**

Add `loop?: boolean` to `FeedNavigationOptions`, default it to `false`, and centralize direction eligibility:

```ts
const canMove = (direction: -1 | 1) => count > 1 && (
  loop || (index + direction >= 0 && index + direction < count)
)
```

Use `canMove()` in `beginSettle`. Apply boundary resistance only when `loop` is false; keep all other gesture behavior unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run src/tests/feed-navigation.test.tsx`

Expected: all gesture navigation tests pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add 刷到你了/web-prototype/src/feed/useFeedNavigation.ts 刷到你了/web-prototype/src/tests/feed-navigation.test.tsx
git commit -m "feat: allow circular feed gestures"
```

### Task 2: Virtual-position three-card ring

**Files:**
- Modify: `刷到你了/web-prototype/src/feed/VideoFeed.tsx`
- Test: `刷到你了/web-prototype/src/tests/video-feed.test.tsx`

**Interfaces:**
- Consumes: finite `index` from `FeedScreen` and virtual adjacent positions from `useFeedNavigation`.
- Produces: `onIndexChange(modulo(nextVirtualPosition, nodes.length))` and three slots keyed by virtual position.

- [ ] **Step 1: Write failing forward and backward wrap tests**

Add a controlled feed that can start at index `0` or `2`. Assert:

```tsx
// At index 2, the next slot is W001. After upward settlement it is the
// exact same element and becomes slot 0.
expect(incoming.dataset.nodeId).toBe('W001')
expect(document.querySelector('.feed-slot[data-feed-slot="0"]')).toBe(incoming)

// At index 0, the previous slot is W300. After downward settlement it is
// the exact same element and becomes slot 0.
expect(previous.dataset.nodeId).toBe('W300')
expect(document.querySelector('.feed-slot[data-feed-slot="0"]')).toBe(previous)
```

Also assert that a two-node feed renders three uniquely keyed physical slots and a one-node feed renders only its current video plus empty neighbors.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/tests/video-feed.test.tsx`

Expected: FAIL because the last/first neighbor is currently empty and settlement cannot wrap.

- [ ] **Step 3: Implement safe modulo and virtual position**

Add:

```ts
function modulo(value: number, count: number) {
  return ((value % count) + count) % count
}
```

Store `position` locally. Derive the active virtual position as the stored position when its modulo matches the parent index, otherwise use the parent index for immediate external alignment. Pass the virtual position and `loop` to the navigation hook. On settlement, store the new virtual position and report its modulo to the parent.

For each slot, calculate `slotPosition = virtualPosition + slot`, select `nodes[modulo(slotPosition, nodes.length)]`, and use `key={slotPosition}`. When only one node exists, leave non-current slots empty.

- [ ] **Step 4: Run focused feed and application flow tests**

Run: `npm test -- --run src/tests/video-feed.test.tsx src/tests/app-flow.test.tsx`

Expected: all circular feed and existing game flow tests pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add 刷到你了/web-prototype/src/feed/VideoFeed.tsx 刷到你了/web-prototype/src/tests/video-feed.test.tsx
git commit -m "feat: loop the three-card video feed"
```

### Task 3: Full verification and production release

**Files:**
- Modify: `刷到你了/web-prototype/README.md`

**Interfaces:**
- Consumes: the completed circular feed.
- Produces: verified production build and the next public Sites version.

- [ ] **Step 1: Document circular controls**

Update the existing gesture bullet to state that feeds with multiple videos loop in both directions and a single video rebounds.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
```

Expected: zero test failures, typecheck exit `0`, and Vite production build exit `0`.

- [ ] **Step 3: Commit documentation**

```bash
git add 刷到你了/web-prototype/README.md
git commit -m "docs: describe circular feed controls"
```

- [ ] **Step 4: Publish and verify**

Package the exact HEAD build, push it to the existing Sites source repository from `.openai/hosting.json`, save a new version, deploy it, poll to `succeeded`, then fetch the public URL with cache bypass and confirm the built JavaScript contains virtual-position keys and safe modulo mapping.

