# Web Prototype Real Video Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Merge the complete `feature/shuadaonile-web-prototype` history into `main`, integrate W001 and W101 raw live-action videos through typed node media configuration, and open a verified local test URL.

**Architecture:** Preserve the existing CSS `StoryStage` as the fallback for nodes without formal video. Add an optional typed `media` property to `VideoNode`; when present, `StoryStage` synchronizes an HTML `<video>` element with the existing playback context and derives the visible caption from `video.currentTime`. Copy source media into Vite `public/media` so development and production builds use stable root-relative URLs.

**Tech Stack:** Git, React 19, TypeScript, Vite 8, Vitest, Testing Library, HTML5 video, CSS

## Global Constraints

- Merge `feature/shuadaonile-web-prototype` into `main` with history preserved.
- Work on the explicitly authorized current `main` branch; do not create another feature branch.
- W001 and W101 use raw MP4 files without burned game subtitles.
- Captions are selected from `video.currentTime`; do not use an independent caption timer.
- Other nodes retain the current CSS story stage and beat animation.
- Video load or play failure falls back to the CSS story stage.
- Do not move, overwrite, or edit source files under `刷到你了/assets/video-tests/`.
- Do not stage or modify `刷到你了/assets/video-tests/.DS_Store`.
- Run the complete existing test suite, typecheck, production build, and browser smoke test.
- Keep the local Vite server running at handoff and open its URL in the user's browser.

---

## File Structure

- Merge: all tracked files from `feature/shuadaonile-web-prototype`
- Modify: `刷到你了/web-prototype/src/content/types.ts`
- Modify: `刷到你了/web-prototype/src/content/nodes.ts`
- Modify: `刷到你了/web-prototype/src/content/validate.ts`
- Modify: `刷到你了/web-prototype/src/feed/StoryStage.tsx`
- Modify: `刷到你了/web-prototype/src/styles/stage.css`
- Modify: `刷到你了/web-prototype/src/tests/content.test.ts`
- Create: `刷到你了/web-prototype/src/tests/story-stage-media.test.tsx`
- Create: `刷到你了/web-prototype/public/media/W001_ltx_raw_v1.mp4`
- Create: `刷到你了/web-prototype/public/media/W001_thumbnail_v1.jpg`
- Create: `刷到你了/web-prototype/public/media/W101_ltx_raw_v1.mp4`
- Create: `刷到你了/web-prototype/public/media/W101_thumbnail_v1.jpg`
- Modify: `docs/superpowers/plans/2026-07-18-web-prototype-real-video-integration.md`

### Task 1: Merge the complete prototype and establish a clean baseline

**Files:**
- Merge: `feature/shuadaonile-web-prototype` into `main`
- Verify: `刷到你了/web-prototype/package.json`

**Interfaces:**
- Consumes: the preserved feature branch and current main assets.
- Produces: a main checkout containing both the prototype and source video assets.

- [x] **Step 1: Remove only the stale worktree registration**

Run `git worktree prune --verbose`, then `git worktree list --porcelain`. Expected: `/private/tmp/rewords-shuadaonile-web-prototype` no longer appears; the feature branch and commits remain.

- [x] **Step 2: Merge the prototype history into main**

Run:

```bash
git merge --no-ff feature/shuadaonile-web-prototype -m "merge: bring web prototype onto main"
```

Expected: a clean merge commit; `刷到你了/web-prototype/package.json` and its complete `src/` tree exist while W001/W101 source assets remain unchanged.

- [x] **Step 3: Install the locked dependencies**

From `刷到你了/web-prototype`, run `npm ci`. Expected: dependencies install from `package-lock.json` without modifying it.

- [x] **Step 4: Verify the merged baseline before media changes**

Run `npm test`, `npm run typecheck`, and `npm run build`. Expected: all existing tests pass, typecheck exits 0, and Vite produces the Sites build output.

### Task 2: Add typed and validated media configuration

**Files:**
- Modify: `刷到你了/web-prototype/src/content/types.ts`
- Modify: `刷到你了/web-prototype/src/content/nodes.ts`
- Modify: `刷到你了/web-prototype/src/content/validate.ts`
- Modify: `刷到你了/web-prototype/src/tests/content.test.ts`

**Interfaces:**
- Consumes: existing `VideoNode` definitions and W001/W101 caption timelines.
- Produces: `CaptionCue`, `VideoMedia`, optional `VideoNode.media`, and content validation errors.

- [x] **Step 1: Write failing media configuration tests**

Add tests to `src/tests/content.test.ts` that assert:

```ts
it('configures W001 and W101 with raw videos and synchronized captions', () => {
  expect(NODE_BY_ID.W001.media?.src).toBe('/media/W001_ltx_raw_v1.mp4')
  expect(NODE_BY_ID.W001.media?.captions).toEqual([
    { start: 0, end: 2.2, text: '婚礼开始第 7 秒，新娘死亡', style: 'result' },
    { start: 2.2, end: 5, text: '婚礼未完成', style: 'explanation' },
    { start: 5, end: 8, text: '这么高，谁够得到？', style: 'comment' },
  ])
  expect(NODE_BY_ID.W101.media?.src).toBe('/media/W101_ltx_raw_v1.mp4')
  expect(NODE_BY_ID.W101.media?.captions.at(-1)?.end).toBe(8)
})

it('rejects invalid and overlapping media captions', () => {
  const invalid = fakeNode('W001')
  invalid.media = {
    src: '',
    poster: '/media/poster.jpg',
    captions: [
      { start: 2, end: 1, text: '', style: 'result' },
      { start: 0.5, end: 11, text: 'overlap', style: 'comment' },
    ],
  }
  expect(validateContent({ items: [], nodes: [invalid], triggers: [] })).toEqual(expect.arrayContaining([
    'invalid media src: W001',
    'invalid caption range: W001:0',
    'empty caption text: W001:0',
    'caption exceeds duration: W001:1',
    'overlapping captions: W001:0:1',
  ]))
})
```

- [x] **Step 2: Run the focused content test and verify red state**

Run `npm test -- --run src/tests/content.test.ts`. Expected: TypeScript/test failures because `media` does not exist and W001/W101 are not configured.

- [x] **Step 3: Add media types**

Add to `src/content/types.ts`:

```ts
export type CaptionStyle = 'result' | 'explanation' | 'comment'

export interface CaptionCue {
  start: number
  end: number
  text: string
  style: CaptionStyle
}

export interface VideoMedia {
  src: string
  poster: string
  captions: CaptionCue[]
}
```

Add `media?: VideoMedia` to `VideoNode`.

- [x] **Step 4: Configure W001 and W101**

Add these exact `media` values in `src/content/nodes.ts`:

```ts
media: {
  src: '/media/W001_ltx_raw_v1.mp4',
  poster: '/media/W001_thumbnail_v1.jpg',
  captions: [
    { start: 0, end: 2.2, text: '婚礼开始第 7 秒，新娘死亡', style: 'result' },
    { start: 2.2, end: 5, text: '婚礼未完成', style: 'explanation' },
    { start: 5, end: 8, text: '这么高，谁够得到？', style: 'comment' },
  ],
}
```

```ts
media: {
  src: '/media/W101_ltx_raw_v1.mp4',
  poster: '/media/W101_thumbnail_v1.jpg',
  captions: [
    { start: 0, end: 2.2, text: '有梯子，新娘还是死了', style: 'result' },
    { start: 2.2, end: 5, text: '他解决了身高，没有解决专业', style: 'explanation' },
    { start: 5, end: 8, text: '够得到，不等于会修', style: 'comment' },
  ],
}
```

- [x] **Step 5: Validate media configuration**

In `validateContent`, for each node with media, validate non-empty `src` and `poster`, each cue's finite numeric range and non-empty text, `end <= node.duration`, cue ordering, and non-overlap. Emit the exact messages asserted by the test.

- [x] **Step 6: Run the focused test and verify green state**

Run `npm test -- --run src/tests/content.test.ts`. Expected: all content tests pass.

### Task 3: Render and synchronize live-action video with CSS fallback

**Files:**
- Modify: `刷到你了/web-prototype/src/feed/StoryStage.tsx`
- Modify: `刷到你了/web-prototype/src/styles/stage.css`
- Create: `刷到你了/web-prototype/src/tests/story-stage-media.test.tsx`

**Interfaces:**
- Consumes: `VideoNode.media`, `active`, and playback context `paused`.
- Produces: synchronized `<video>`, current caption overlay, and automatic CSS fallback.

- [x] **Step 1: Write failing StoryStage media tests**

Create `src/tests/story-stage-media.test.tsx` with tests that render `StoryStage` inside `PlaybackProvider` and assert:

```ts
it('renders configured video and derives captions from currentTime', () => {
  render(<PlaybackProvider><StoryStage node={NODE_BY_ID.W001} active /></PlaybackProvider>)
  const video = screen.getByLabelText('婚礼灯架事故视频') as HTMLVideoElement
  expect(video.getAttribute('src')).toBe('/media/W001_ltx_raw_v1.mp4')
  Object.defineProperty(video, 'currentTime', { configurable: true, value: 2.5 })
  fireEvent.timeUpdate(video)
  expect(screen.getByText('婚礼未完成')).toHaveAttribute('data-caption-style', 'explanation')
})

it('falls back to the CSS story stage after media failure', () => {
  render(<PlaybackProvider><StoryStage node={NODE_BY_ID.W001} active /></PlaybackProvider>)
  fireEvent.error(screen.getByLabelText('婚礼灯架事故视频'))
  expect(screen.queryByLabelText('婚礼灯架事故视频')).not.toBeInTheDocument()
  expect(screen.getByText(NODE_BY_ID.W001.beats[0].text)).toBeInTheDocument()
})

it('keeps unconfigured nodes on the CSS story stage', () => {
  render(<PlaybackProvider><StoryStage node={NODE_BY_ID.C001} active /></PlaybackProvider>)
  expect(screen.queryByRole('video')).not.toBeInTheDocument()
  expect(screen.getByText(NODE_BY_ID.C001.beats[0].text)).toBeInTheDocument()
})
```

Also mock `HTMLMediaElement.prototype.play` and `pause`, and assert active/unpaused calls `play`, while inactive or paused calls `pause`.

- [x] **Step 2: Run the focused StoryStage test and verify red state**

Run `npm test -- --run src/tests/story-stage-media.test.tsx`. Expected: failure because `StoryStage` still renders only CSS beats.

- [x] **Step 3: Implement video playback and fallback**

In `StoryStage.tsx`:

- keep the current CSS renderer in a focused internal `FallbackStoryStage` component;
- keep a `videoRef`, `currentTime`, and `mediaFailed` state;
- reset time and failure when `node.id` changes;
- call `video.play().catch(() => undefined)` only when active and not paused;
- call `video.pause()` otherwise;
- render `<video aria-label={`${node.title}视频`} playsInline loop preload="metadata" poster={media.poster}>`;
- update `currentTime` from `onTimeUpdate`;
- set `mediaFailed` from `onError`;
- choose the cue satisfying `start <= currentTime && currentTime < end`;
- render its text with `data-caption-style={cue.style}`;
- preserve the existing click-to-toggle behavior and pause badge.

- [x] **Step 4: Add video and caption styles**

In `src/styles/stage.css`, add `.story-video` as an absolute full-stage element with `width:100%`, `height:100%`, `object-fit:cover`, and a black background. Add `.media-caption` above the bottom interaction safe area with centered white bold text, dark stroke/shadow, and style-specific accents that do not cover the existing product/gift controls.

- [x] **Step 5: Run focused media tests and verify green state**

Run `npm test -- --run src/tests/story-stage-media.test.tsx src/tests/video-card.test.tsx`. Expected: all tests pass.

### Task 4: Copy production media, verify the full app, and open it

**Files:**
- Create: four files under `刷到你了/web-prototype/public/media/`
- Modify: `docs/superpowers/plans/2026-07-18-web-prototype-real-video-integration.md`

**Interfaces:**
- Consumes: verified source MP4/JPEG files and completed React integration.
- Produces: a static-build-compatible prototype, a running local server, and synchronized main.

- [x] **Step 1: Copy the four selected media files**

Copy W001/W101 raw MP4s and thumbnails from `刷到你了/assets/video-tests/{W001,W101}/` to the exact `public/media` names in the file structure. Do not copy burned-caption W001 media.

- [x] **Step 2: Verify media integrity**

Use `cmp` to confirm each public copy is byte-identical to its source. Use `ffprobe` to require both videos to be H.264, 832×1536, about 8.041667 seconds, and 24 fps. Use `file` for both JPEGs.

- [x] **Step 3: Run all automated verification**

From `刷到你了/web-prototype`, run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass, typecheck exits 0, and build exits 0 with all four `/media` assets present in output.

- [x] **Step 4: Mark the plan complete and run repository checks**

Replace all `- [x]` with `- [x]`. Run `git diff --check`, confirm no changes under source `assets/video-tests`, and confirm `.DS_Store` is unstaged.

- [x] **Step 5: Commit the integration**

Stage only the prototype changes, public media, and this plan. Commit with:

```bash
git commit -m "feat: play real wedding videos in prototype"
```

- [x] **Step 6: Start and open the local test URL**

Run `npm run dev -- --host 127.0.0.1 --port 4173`, keep the process alive, wait for `http://127.0.0.1:4173/` to return HTTP 200, and open that URL in the available browser. Verify W001 loads without a media 404 or console error, swipe/keyboard navigation works, and W101 appears after the configured ladder trigger.

- [x] **Step 7: Push and verify synchronization**

Push `main` to `origin/main`. Verify `git rev-parse HEAD` equals `git rev-parse origin/main`, the server remains running, and the only unrelated worktree entry is the pre-existing untracked `.DS_Store`.
