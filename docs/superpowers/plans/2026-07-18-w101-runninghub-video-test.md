# W101 RunningHub Video Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Produce one continuity-matched W101 ladder-and-wrong-repair video and a validated external caption timeline without burning game subtitles into the media.

**Architecture:** Edit the approved W001 keyframe to add a believable ladder and groomsman while preserving the wedding scene, then use the verified RunningHub LTX2.3 AI App for one image-to-video task. Preserve the raw MP4, generate only a thumbnail, store captions as JSON, query actual task consumption, and record all non-secret provenance.

**Tech Stack:** OpenAI image generation/editing, RunningHub AI App API, curl, jq, FFmpeg/ffprobe, Git

## Global Constraints

- Scope is only `W101《有梯子，但不会修》`.
- Use W001 as the visual continuity reference.
- Use `webappId=2031277395491164161` with nodes `3/image`, `65/text`, `83/value=8`, and `219/value=false`.
- Submit one paid task by default and no more than two total.
- Do not burn game subtitles into the video.
- Keep captions in JSON and use left-closed, right-open time intervals in seconds.
- Never persist or print the RunningHub API Key.
- Preserve the user-created untracked `刷到你了/assets/video-tests/.DS_Store` without staging or modifying it.

---

## File Structure

- Create: `刷到你了/assets/video-tests/W101/W101_keyframe_v1.png`
- Create: `刷到你了/assets/video-tests/W101/W101_ltx_raw_v1.mp4`
- Create: `刷到你了/assets/video-tests/W101/W101_thumbnail_v1.jpg`
- Create: `刷到你了/assets/video-tests/W101/W101_captions.json`
- Create: `刷到你了/assets/video-tests/W101/generation-notes.md`

### Task 1: Edit and approve the W101 keyframe

**Files:**
- Reference: `刷到你了/assets/video-tests/W001/W001_keyframe_v1.png`
- Create: `刷到你了/assets/video-tests/W101/W101_keyframe_v1.png`

**Interfaces:**
- Consumes: approved W001 keyframe and W101 story script.
- Produces: one exact 9:16 PNG suitable for RunningHub upload.

- [x] **Step 1: Inspect the W001 reference at original resolution**

Use `view_image` and lock these invariants: bride identity and dress, warm ivory wedding venue, black overhead truss, vertical composition, photoreal mobile-drama style.

- [x] **Step 2: Edit the reference with the built-in image generator**

Add one complete silver extension ladder and one young Chinese groomsman in a pale gray shirt and dark trousers standing safely near its top. He reaches toward the wrong truss control while the bride watches from below. Preserve the locked invariants; avoid text, logos, injury, impossible ladder geometry, malformed hands, duplicate bride, and direct impact.

- [x] **Step 3: Copy the selected output into the project and normalize it**

Copy the generated image to `W101_keyframe_v1.png`. Run `sips -g pixelWidth -g pixelHeight`; if needed, center-crop to the largest exact 9:16 rectangle without stretching.

- [x] **Step 4: Visually approve before any paid request**

Reject the keyframe unless the ladder is complete, the groomsman plausibly stands on it, his repairing hand is readable, the truss remains overhead, and the bride/venue continuity is recognizable.

- [x] **Step 5: Verify the PNG**

Run `file '刷到你了/assets/video-tests/W101/W101_keyframe_v1.png'`. Expected: valid portrait PNG.

### Task 2: Generate the raw W101 video

**Files:**
- Create: `刷到你了/assets/video-tests/W101/W101_ltx_raw_v1.mp4`

**Interfaces:**
- Consumes: approved W101 keyframe and an API Key read with terminal echo disabled.
- Produces: one task ID, one raw MP4, and actual consumption data.

- [x] **Step 1: Read the API Key only into an interactive process**

Use `stty -echo`, `read -r RUNNINGHUB_API_KEY`, then `stty echo`. Do not persist the value.

- [x] **Step 2: Upload the W101 keyframe**

POST multipart data to `https://www.runninghub.cn/openapi/v2/media/upload/binary` with bearer authentication. Parse `.data.fileName` and print only `upload: ok`.

- [x] **Step 3: Submit one AI App task**

Use this prompt exactly for attempt one:

```text
Continue naturally from this exact wedding frame. The groomsman stands on the same silver extension ladder and confidently twists the wrong small truss fastener with one hand. A separate true safety latch beside his hand suddenly snaps open, making the heavy overhead lighting truss tilt and drop. He freezes, grips the ladder and looks down in panic. The bride below looks up and steps backward while nearby guests recoil and scatter. Keep the ladder fully visible and structurally stable throughout the shot. Rapid but smooth camera pullback, believable metal, fabric, hair and body physics, immediate action in the first second, strong white flash before any impact. Preserve the same bride, groomsman, ladder, venue, lighting and truss. Polished realistic Chinese mobile short-drama cinematography. No injury, no blood, no body impact, no text, no subtitles, no logo, no watermark.
```

Build the request in memory with `jq -n`; use `fieldValue="8"` and `fieldValue="false"` to match the app's exposed node values. Require `.code == 0` and a non-empty `.data.taskId`.

- [x] **Step 4: Poll without duplicate submission**

POST the task ID to `https://www.runninghub.cn/openapi/v2/query` every 10 seconds for at most 20 minutes. Stop on `SUCCESS` or `FAILED`. Do not resubmit while queued or running.

- [x] **Step 5: Download the first result**

Download `.results[0].url` to `W101_ltx_raw_v1.mp4` without logging the signed URL.

- [x] **Step 6: Query actual task consumption**

POST the task ID to `/task/openapi/outputs` and retain only `consumeCoins`, `consumeMoney`, `taskCostTime`, `fileType`, and `nodeId` in memory for the notes.

- [x] **Step 7: Validate whether a retry is justified**

Use `ffprobe`, full decode, and an eight-frame contact sheet. Retry only if the ladder disappears, the repair action is absent, the truss stays static, or the scene is unrelated. Ordinary motion blur is acceptable.

### Task 3: Create configuration, thumbnail, and notes

**Files:**
- Create: `刷到你了/assets/video-tests/W101/W101_captions.json`
- Create: `刷到你了/assets/video-tests/W101/W101_thumbnail_v1.jpg`
- Create: `刷到你了/assets/video-tests/W101/generation-notes.md`

**Interfaces:**
- Consumes: successful raw MP4, task metadata, image/video prompts.
- Produces: validated caption configuration, thumbnail, and credential-free provenance.

- [x] **Step 1: Create the caption JSON**

Write exactly three cues with fields `start`, `end`, `text`, and `style`: `0–2.2 result`, `2.2–5 explanation`, and `5–8 comment`, using the approved Chinese text from the design.

- [x] **Step 2: Validate caption semantics**

Run `jq empty`. Then verify each cue has `start < end`, cues do not overlap, the first cue starts at 0, and the final `end` does not exceed the ffprobe duration.

- [x] **Step 3: Extract a thumbnail**

Use `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y -ss 0.5 -i W101_ltx_raw_v1.mp4 -frames:v 1 -q:v 2 W101_thumbnail_v1.jpg`. Visually confirm the ladder, groomsman, bride, and truss are visible.

- [x] **Step 4: Write generation notes**

Record exact prompts, app ID, task ID, submission count, actual coin consumption, runtime, media metadata, acceptance results, and why no retry was used. Exclude the key, Authorization header, upload path, and signed result URL.

### Task 4: Verify, commit, and push

**Files:**
- Verify all W101 files and this plan.

**Interfaces:**
- Consumes: all completed W101 assets.
- Produces: one verified commit synchronized to `origin/main`.

- [x] **Step 1: Run final media and security checks**

Run `git diff --check`, full FFmpeg decode, ffprobe metadata, JSON validation, file type checks, and searches for bearer tokens, API assignments, and recognizable key fragments. Expected: all checks pass with no credential match.

- [x] **Step 2: Mark this plan complete**

Replace all remaining unchecked task boxes with checked boxes and rerun `git diff --check`.

- [x] **Step 3: Stage only W101 and plan files**

Do not stage `刷到你了/assets/video-tests/.DS_Store`.

- [x] **Step 4: Commit**

```bash
git commit -m "feat: add W101 RunningHub video test"
```

- [x] **Step 5: Push and verify synchronization**

Push `main` to `origin/main`, then verify `HEAD == origin/main` and the worktree contains only the pre-existing untracked `.DS_Store`.
