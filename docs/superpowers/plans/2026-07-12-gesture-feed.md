# Gesture-driven Video Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace instant feed index swaps with a finger-following three-card vertical gesture and matching desktop snap animation.

**Architecture:** Keep gesture mechanics in `useFeedNavigation` as a small idle/dragging/settling state machine. `VideoFeed` renders previous/current/next slots using the hook's shared offset and transition duration; the parent index changes only when settling completes.

**Tech Stack:** React 19, TypeScript 7, Pointer Events, CSS transforms, Vitest 4, Testing Library.

## Global Constraints

- Render at most previous, current, and next full-screen cards.
- Commit at 20% viewport distance or `0.55 px/ms` velocity.
- Use 0.28 boundary resistance, 8 px click-suppression threshold, and 240 ms settling.
- Only the current card is active playback.
- Wheel and keyboard use the same settling path.
- Overlays lock navigation and reduced-motion shortens transitions.

---

### Task 1: Gesture Navigation State Machine

**Files:**
- Modify: `刷到你了/web-prototype/src/feed/useFeedNavigation.ts`
- Create: `刷到你了/web-prototype/src/tests/feed-navigation.test.tsx`

**Interfaces:**
- Produces: `useFeedNavigation(options)` returning `offset`, `phase`, `transitionMs`, and feed event handlers.
- Produces: `onTransitionEnd()` that commits the pending index exactly once.
- Consumes: `{ count, index, onChange, locked }`.

- [ ] **Step 1: Write failing hook harness tests**

Create a test harness that applies all returned handlers to a fixed-height div and exposes `data-offset` and `data-phase`. Cover these behaviors:

```tsx
it('tracks the pointer before release and commits beyond 20 percent', () => {
  const onChange = vi.fn()
  render(<Harness count={3} index={1} onChange={onChange} />)
  const feed = screen.getByTestId('feed')
  fireEvent.pointerDown(feed, { pointerId: 1, clientY: 600 })
  fireEvent.pointerMove(feed, { pointerId: 1, clientY: 300 })
  expect(feed.dataset.offset).toBe('-300')
  expect(feed.dataset.phase).toBe('dragging')
  fireEvent.pointerUp(feed, { pointerId: 1, clientY: 300 })
  expect(feed.dataset.phase).toBe('settling')
  fireEvent.transitionEnd(feed)
  expect(onChange).toHaveBeenCalledWith(2)
})

it('applies resistance at the first item and rebounds', () => {
  render(<Harness count={3} index={0} onChange={vi.fn()} />)
  const feed = screen.getByTestId('feed')
  fireEvent.pointerDown(feed, { pointerId: 1, clientY: 300 })
  fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })
  expect(Number(feed.dataset.offset)).toBeCloseTo(28)
  fireEvent.pointerUp(feed, { pointerId: 1, clientY: 400 })
  fireEvent.transitionEnd(feed)
  expect(feed.dataset.phase).toBe('idle')
})
```

Also test small-drag rebound, velocity commit, locked navigation, and drag click suppression.

- [ ] **Step 2: Run the hook tests and verify failure**

Run: `npm test -- --run src/tests/feed-navigation.test.tsx`

Expected: FAIL because the hook exposes only instant pointer-up and wheel navigation.

- [ ] **Step 3: Implement the minimal state machine**

Use constants:

```ts
const DISTANCE_RATIO = 0.2
const VELOCITY_THRESHOLD = 0.55
const BOUNDARY_RESISTANCE = 0.28
const CLICK_SUPPRESSION_DISTANCE = 8
const SETTLE_MS = 240
```

Track pointer id, start Y/time, viewport height, pending direction, and a fallback timer in refs. During drag, update offset directly. On release, settle to `-direction * viewportHeight` or zero. `onTransitionEnd` clears the fallback, calls `onChange(index + direction)` when valid, resets offset/phase, and ignores duplicate events. Prevent the next captured click after movement at or above 8 px.

Wheel and key handlers call the same `beginSettle(direction)` function. Locked changes cancel refs, timers, offset, and phase.

- [ ] **Step 4: Run hook tests**

Run: `npm test -- --run src/tests/feed-navigation.test.tsx`

Expected: all state-machine tests PASS.

- [ ] **Step 5: Commit**

```bash
git add 刷到你了/web-prototype/src/feed/useFeedNavigation.ts 刷到你了/web-prototype/src/tests/feed-navigation.test.tsx
git commit -m "feat: add finger-following feed gestures"
```

### Task 2: Three-card Rendering and Motion Styling

**Files:**
- Modify: `刷到你了/web-prototype/src/feed/VideoFeed.tsx`
- Modify: `刷到你了/web-prototype/src/feed/VideoCard.tsx`
- Rewrite: `刷到你了/web-prototype/src/styles/feed.css`
- Create: `刷到你了/web-prototype/src/tests/video-feed.test.tsx`
- Modify: `刷到你了/web-prototype/src/tests/app-flow.test.tsx`

**Interfaces:**
- Produces: slot values `-1 | 0 | 1` with `data-feed-slot` and transform styles.
- Consumes: navigation `offset`, `phase`, `transitionMs`, and handlers from Task 1.

- [ ] **Step 1: Write failing three-card tests**

```tsx
it('renders adjacent cards while only the current card is active', () => {
  const { container } = render(<PlaybackProvider><VideoFeed nodes={nodes} index={1} onIndexChange={vi.fn()} /></PlaybackProvider>)
  expect(container.querySelectorAll('[data-feed-slot]')).toHaveLength(3)
  expect(container.querySelector('[data-feed-slot="0"]')).toHaveAttribute('data-node-id', nodes[1].id)
  expect(container.querySelector('[data-feed-active="true"]')).toHaveAttribute('data-node-id', nodes[1].id)
})

it('moves all slots with the shared pointer offset', () => {
  const { container } = render(<PlaybackProvider><VideoFeed nodes={nodes} index={1} onIndexChange={vi.fn()} /></PlaybackProvider>)
  const feed = container.querySelector('.video-feed')!
  fireEvent.pointerDown(feed, { pointerId: 1, clientY: 600 })
  fireEvent.pointerMove(feed, { pointerId: 1, clientY: 400 })
  expect(container.querySelector('[data-feed-slot="0"]')).toHaveStyle({ transform: 'translate3d(0, calc(0% + -200px), 0)' })
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- --run src/tests/video-feed.test.tsx`

Expected: FAIL because VideoFeed renders only one card.

- [ ] **Step 3: Render and style three slots**

Map valid indices `[index - 1, index, index + 1]` to slots. Each slot is absolute and uses:

```ts
transform: `translate3d(0, calc(${slot * 100}% + ${navigation.offset}px), 0)`,
transition: navigation.phase === 'settling'
  ? `transform ${navigation.transitionMs}ms cubic-bezier(.2,.72,.2,1)`
  : 'none'
```

Pass `active={slot === 0}` and expose slot/active data attributes on `VideoCard`. Attach transition completion to the current slot. Apply `touch-action:none`, `will-change:transform`, overflow clipping, and stacking order in CSS. Consolidate the duplicated existing feed stylesheet while preserving product, actions, nav, and replay styles.

- [ ] **Step 4: Update application navigation tests**

Use fake timers or fire `transitionEnd` after ArrowDown/ArrowUp in existing tests, then assert the next headline. Verify product/gift clicks still work without drag.

- [ ] **Step 5: Run feed and app tests**

Run: `npm test -- --run src/tests/video-feed.test.tsx src/tests/feed-navigation.test.tsx src/tests/app-flow.test.tsx`

Expected: all files PASS.

- [ ] **Step 6: Commit**

```bash
git add 刷到你了/web-prototype/src/feed/VideoFeed.tsx 刷到你了/web-prototype/src/feed/VideoCard.tsx 刷到你了/web-prototype/src/styles/feed.css 刷到你了/web-prototype/src/tests/video-feed.test.tsx 刷到你了/web-prototype/src/tests/app-flow.test.tsx
git commit -m "feat: render a three-card sliding feed"
```

### Task 3: Regression Verification and Deployment

**Files:**
- Modify: `刷到你了/web-prototype/README.md`
- Verify: `刷到你了/web-prototype/.openai/hosting.json`

**Interfaces:**
- Consumes: Tasks 1–2 and existing Sites configuration.
- Produces: public deployment on the existing试玩 URL.

- [ ] **Step 1: Document the gesture behavior**

Add the three-card, 20%/velocity commit, boundary rebound, wheel, keyboard, and reduced-motion behavior to README.

- [ ] **Step 2: Run complete verification**

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass, TypeScript exits 0, and Sites worker output is generated.

- [ ] **Step 3: Commit documentation**

```bash
git add 刷到你了/web-prototype/README.md
git commit -m "docs: describe gesture-driven feed"
```

- [ ] **Step 4: Publish and verify**

Push the exact committed source, package the validated build, save and publicly deploy a new Sites version, then verify HTTP 200 and the shipped gesture constants/styles on the existing public URL.
