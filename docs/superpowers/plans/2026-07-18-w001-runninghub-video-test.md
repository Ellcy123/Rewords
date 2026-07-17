# W001 RunningHub Video Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Produce one browser-ready 9:16 W001 wedding-lighting-accident test video from a generated keyframe through the verified RunningHub LTX2.3 AI App.

**Architecture:** Generate and visually approve one clean still image first, then upload it to RunningHub and submit one image-to-video task. Preserve the raw result, add local captions with FFmpeg, export a game-ready MP4 and thumbnail, and record all non-secret generation metadata beside the assets.

**Tech Stack:** OpenAI image generation, RunningHub AI App API, curl, jq, FFmpeg/ffprobe, Git

## Global Constraints

- Scope is only `W001《婚礼灯架事故》`; do not modify the story tree or application runtime.
- Use `webappId=2031277395491164161` with nodes `3/image`, `65/text`, `83/value`, and `219/value=false`.
- Submit one paid video task by default and no more than two tasks total.
- The video must be vertical, show the accident in the first second, explain the failure within five seconds, and remain under 15 seconds.
- Do not show blood, wounds, direct bodily impact, third-party logos, platform UI, or generated text inside the keyframe.
- Never write the RunningHub API Key to project files, command output, generation notes, or Git history.
- Preserve the RunningHub raw result unchanged and create the game-ready version as a separate file.

---

## File Structure

- Create: `刷到你了/assets/video-tests/W001/W001_keyframe_v1.png` — approved 9:16 source frame.
- Create: `刷到你了/assets/video-tests/W001/W001_ltx_raw_v1.mp4` — untouched RunningHub result.
- Create: `刷到你了/assets/video-tests/W001/W001_captions.ass` — deterministic local caption timing and style.
- Create: `刷到你了/assets/video-tests/W001/W001_game_cut_v1.mp4` — browser-ready captioned export.
- Create: `刷到你了/assets/video-tests/W001/W001_thumbnail_v1.jpg` — representative feed thumbnail.
- Create: `刷到你了/assets/video-tests/W001/generation-notes.md` — prompts, task ID, checks, and generation count without credentials.

### Task 1: Generate and approve the W001 keyframe

**Files:**
- Create: `刷到你了/assets/video-tests/W001/W001_keyframe_v1.png`

**Interfaces:**
- Consumes: W001 script at `刷到你了/05_第一关_婚礼逆天改命/剧情节点/W_婚礼线/W001_婚礼灯架事故.md`.
- Produces: a local PNG path accepted by the RunningHub upload endpoint.

- [x] **Step 1: Create the output directory**

Use `apply_patch` to add the first tracked text artifact in the directory when needed; do not write credentials or generated binary data through shell redirection.

- [x] **Step 2: Generate a portrait keyframe**

Invoke the `imagegen` skill and generate one image with this complete direction:

```text
A vertical 9:16 cinematic frame from a polished Chinese mobile wedding drama. A modern indoor wedding stage filled with ivory flowers and warm practical lights. A young Chinese bride in an elegant white wedding dress stands at the visual center and has just looked upward in alarm. Four meters above her, a large professional black stage-lighting truss has visibly come loose and is beginning to tilt and fall; small dust particles and flower petals shake loose. Guests at the sides recoil and raise their hands, leaving a clear view between the bride and the failing truss. Strong depth, believable rigging geometry, realistic fabric and faces, dramatic but non-graphic danger, high-end short-drama cinematography, slight handheld urgency, enough empty space for the camera to pull backward. No impact, no injury, no blood, no text, no subtitles, no app interface, no logo, no watermark.
```

- [x] **Step 3: Normalize the image to exact 9:16 if required**

Run:

```bash
sips -g pixelWidth -g pixelHeight '刷到你了/assets/video-tests/W001/W001_keyframe_v1.png'
```

Expected: width-to-height ratio exactly `9:16`. If the generator returns `1024×1536`, assign its returned local path to `GENERATED_PATH`, then run `sips --cropToHeightWidth 1536 864 "$GENERATED_PATH" --out '刷到你了/assets/video-tests/W001/W001_keyframe_v1.png'` to center-crop without stretching.

- [x] **Step 4: Visually inspect the full-resolution keyframe**

Use `view_image` at original detail. Reject the frame before any paid video call if the bride has malformed hands or face, the truss is not clearly above her, the truss geometry cannot plausibly move, or the image contains text, injury, or a watermark.

- [x] **Step 5: Verify the file type**

Run:

```bash
file '刷到你了/assets/video-tests/W001/W001_keyframe_v1.png'
```

Expected: PNG image data with portrait dimensions and no decode error.

### Task 2: Upload the keyframe and generate the raw video

**Files:**
- Create: `刷到你了/assets/video-tests/W001/W001_ltx_raw_v1.mp4`

**Interfaces:**
- Consumes: `W001_keyframe_v1.png` and a RunningHub API Key read interactively with terminal echo disabled.
- Produces: a RunningHub `taskId` and downloaded raw MP4.

- [x] **Step 1: Ensure FFmpeg inspection tools are available**

Run `command -v ffmpeg && command -v ffprobe`. If absent, install the Homebrew `ffmpeg` formula after the platform permission prompt, then rerun the command. Also verify `ffmpeg -hide_banner -filters` contains `subtitles`; if the base formula lacks `libass`, install the official keg-only `ffmpeg-full` formula and use `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` and `/opt/homebrew/opt/ffmpeg-full/bin/ffprobe`. Expected: both inspection tools and the `subtitles` filter resolve before the paid task is submitted.

- [x] **Step 2: Read the API Key without persisting or echoing it**

Start an interactive shell command with:

```bash
stty -echo
read -r RUNNINGHUB_API_KEY
stty echo
```

Keep the value only in that process. Do not place it in `.env`, command arguments, JSON files, or logs.

- [x] **Step 3: Upload the keyframe**

Within the same shell process, call:

```bash
UPLOAD_JSON=$(curl -sS 'https://www.runninghub.cn/openapi/v2/media/upload/binary' \
  -H "Authorization: Bearer $RUNNINGHUB_API_KEY" \
  -F "file=@刷到你了/assets/video-tests/W001/W001_keyframe_v1.png")
FILE_NAME=$(printf '%s' "$UPLOAD_JSON" | jq -r '.data.fileName // empty')
test -n "$FILE_NAME"
```

Expected: exit 0 and a non-empty RunningHub `fileName`. Print only `upload: ok`, never the request or key.

- [x] **Step 4: Submit exactly one image-to-video task**

Build the request in memory with `jq -n` and submit it to `/task/openapi/ai-app/run`. Use this prompt verbatim for the first attempt:

```text
Continue naturally from this exact wedding frame. The loosened overhead lighting truss tilts farther and starts falling. The bride looks up in alarm and instinctively steps backward while guests at both sides recoil and scatter. The camera rapidly but smoothly pulls backward, keeping the bride and the falling truss clearly visible. Flower petals and light dust shake loose, warm wedding lights flicker, fabric and hair move with believable physics. Build immediate danger in the first second and end on a strong white flash before any impact. Preserve the same bride, dress, faces, venue, lighting and truss structure. Realistic polished Chinese mobile short-drama cinematography, coherent motion, no cuts, no injury, no blood, no body impact, no text, no subtitles, no logo, no watermark.
```

Build the exact request in memory:

```bash
VIDEO_PROMPT='Continue naturally from this exact wedding frame. The loosened overhead lighting truss tilts farther and starts falling. The bride looks up in alarm and instinctively steps backward while guests at both sides recoil and scatter. The camera rapidly but smoothly pulls backward, keeping the bride and the falling truss clearly visible. Flower petals and light dust shake loose, warm wedding lights flicker, fabric and hair move with believable physics. Build immediate danger in the first second and end on a strong white flash before any impact. Preserve the same bride, dress, faces, venue, lighting and truss structure. Realistic polished Chinese mobile short-drama cinematography, coherent motion, no cuts, no injury, no blood, no body impact, no text, no subtitles, no logo, no watermark.'
REQUEST_JSON=$(jq -n \
  --arg apiKey "$RUNNINGHUB_API_KEY" \
  --arg webappId '2031277395491164161' \
  --arg fileName "$FILE_NAME" \
  --arg prompt "$VIDEO_PROMPT" \
  '{webappId: $webappId, apiKey: $apiKey, nodeInfoList: [
    {nodeId: "3", fieldName: "image", fieldValue: $fileName},
    {nodeId: "65", fieldName: "text", fieldValue: $prompt},
    {nodeId: "83", fieldName: "value", fieldValue: 8},
    {nodeId: "219", fieldName: "value", fieldValue: false}
  ]}')
SUBMIT_JSON=$(curl -sS 'https://www.runninghub.cn/task/openapi/ai-app/run' \
  -H "Authorization: Bearer $RUNNINGHUB_API_KEY" \
  -H 'Content-Type: application/json' \
  --data "$REQUEST_JSON")
TASK_ID=$(printf '%s' "$SUBMIT_JSON" | jq -r '.data.taskId // empty')
test "$(printf '%s' "$SUBMIT_JSON" | jq -r '.code')" = '0'
test -n "$TASK_ID"
```

Expected: `.code == 0` and a non-empty `.data.taskId`. Print only the task ID and task status.

- [x] **Step 5: Poll the V2 query endpoint**

Every 10 seconds call:

```bash
curl -sS 'https://www.runninghub.cn/openapi/v2/query' \
  -H "Authorization: Bearer $RUNNINGHUB_API_KEY" \
  -H 'Content-Type: application/json' \
  --data "{\"taskId\":\"$TASK_ID\"}"
```

Stop on `SUCCESS` or `FAILED`, and stop after 20 minutes with the task ID preserved. Do not submit another task merely because the first is still queued or running.

- [x] **Step 6: Download the first successful MP4**

Read `.results[0].url` from the successful query and download it to:

```bash
curl -fL "$RESULT_URL" -o '刷到你了/assets/video-tests/W001/W001_ltx_raw_v1.mp4'
```

Expected: curl exit 0 and a non-empty MP4 file.

- [x] **Step 7: Validate before deciding on any retry**

Extract duration, dimensions, codec, frame rate, and audio presence with `ffprobe`. Visually inspect representative frames. A second paid task is permitted only for persistent subject deformation, near-zero motion, or a result unrelated to the wedding accident; otherwise continue to local packaging.

### Task 3: Package the game-ready video

**Files:**
- Create: `刷到你了/assets/video-tests/W001/W001_captions.ass`
- Create: `刷到你了/assets/video-tests/W001/W001_game_cut_v1.mp4`
- Create: `刷到你了/assets/video-tests/W001/W001_thumbnail_v1.jpg`

**Interfaces:**
- Consumes: `W001_ltx_raw_v1.mp4`.
- Produces: one captioned H.264/AAC MP4 and one JPEG thumbnail.

- [x] **Step 1: Confirm FFmpeg remains available**

Run `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -hide_banner -filters | grep subtitles` and `/opt/homebrew/opt/ffmpeg-full/bin/ffprobe -version`. Expected: the subtitle filter and inspection executable resolve from Task 2.

- [x] **Step 2: Create deterministic ASS captions**

Create `W001_captions.ass` with `Hiragino Sans GB`, white bold text, black outline, bottom-center placement, and these events adjusted only if the raw clip is shorter than eight seconds:

```text
0:00:00.00–0:00:02.20  婚礼开始第 7 秒，新娘死亡
0:00:02.20–0:00:05.00  婚礼未完成
0:00:05.00–0:00:08.00  这么高，谁够得到？
```

- [x] **Step 3: Encode the browser-ready MP4**

Run from the W001 asset directory:

```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y -i W001_ltx_raw_v1.mp4 \
  -vf "subtitles=W001_captions.ass:fontsdir=/System/Library/Fonts" \
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart W001_game_cut_v1.mp4
```

If the raw file has no audio stream, replace the audio flags with `-an`; do not synthesize unrelated audio merely to fill the track.

- [x] **Step 4: Extract the thumbnail**

Run:

```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y -ss 0.5 -i W001_game_cut_v1.mp4 -frames:v 1 -q:v 2 W001_thumbnail_v1.jpg
```

Expected: a portrait JPEG showing both the bride and the unstable truss.

- [x] **Step 5: Validate the final assets**

Run:

```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,pix_fmt -of json W001_game_cut_v1.mp4
file W001_keyframe_v1.png W001_ltx_raw_v1.mp4 W001_game_cut_v1.mp4 W001_thumbnail_v1.jpg
```

Expected: duration below 15 seconds, portrait dimensions, H.264 video, `yuv420p`, and no decode errors.

### Task 4: Record provenance and finish verification

**Files:**
- Create: `刷到你了/assets/video-tests/W001/generation-notes.md`

**Interfaces:**
- Consumes: approved prompts, task ID, API response status, ffprobe output, and visual review findings.
- Produces: a credential-free record sufficient to reproduce or critique the test.

- [x] **Step 1: Write generation notes**

Record the exact image prompt and video prompt, RunningHub app ID, task ID, submission count, generated duration and dimensions, packaging command, and a short pass/fail note for each acceptance criterion. Never include the API Key, authorization header, signed upload URL, or signed result URL.

- [x] **Step 2: Scan for leaked credentials**

Run:

```bash
! rg -n --hidden --glob '!.git/**' 'Authorization: Bearer [A-Za-z0-9]+|RUNNINGHUB_API_KEY=[A-Za-z0-9]+' '刷到你了/assets/video-tests/W001' docs/superpowers
test -z "$RUNNINGHUB_API_KEY" || ! rg -F "$RUNNINGHUB_API_KEY" '刷到你了/assets/video-tests/W001' docs/superpowers
```

Expected: no matches. Also verify `git diff --check` exits 0.

- [x] **Step 3: Visually review the final video and thumbnail**

Extract a contact sheet or representative frames and inspect them. Confirm first-second accident readability, five-second story comprehension, non-graphic handling, stable identity, useful motion, correct captions, and absence of logos or watermarks.

- [x] **Step 4: Commit the completed test assets**

```bash
git add '刷到你了/assets/video-tests/W001' 'docs/superpowers/plans/2026-07-18-w001-runninghub-video-test.md'
git commit -m 'feat: add W001 RunningHub video test'
```

Expected: one asset commit containing the approved keyframe, raw result, packaged result, thumbnail, captions, notes, and implementation plan.
