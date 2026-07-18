# W101 Anime Contrast Style Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and verify one project-bound 9:16 W101 anime keyframe using a high-contrast cyan-blue, orange-red, and restrained magenta palette.

**Architecture:** Use the approved W101 realistic keyframe only as a composition and narrative reference, then perform a full style transfer with the built-in image generator. Save the selected output non-destructively under `assets/style-tests`, normalize it to exact 9:16 if needed, inspect it visually, and keep the existing W001/W101 video-test assets untouched.

**Tech Stack:** Built-in image generation/editing, `view_image`, `sips`, `file`, Git

## Global Constraints

- Create only one static style-test asset; do not call RunningHub or generate video.
- Preserve the readable relationship among bride, complete ladder, groomsman, and overhead truss.
- Use deep cyan-blue/blue-violet shadows, orange-red danger lighting, restrained magenta accents, and an ivory-white bridal gown.
- Use clear cel-shaded anime rendering, not a filter applied over a realistic photo.
- Do not imitate a living artist or reproduce an existing anime character.
- Do not include text, subtitles, platform UI, logos, watermarks, blood, injury, or direct impact.
- Do not overwrite any file under `刷到你了/assets/video-tests/`.
- Preserve the untracked `刷到你了/assets/video-tests/.DS_Store` without staging or modifying it.

---

## File Structure

- Reference: `刷到你了/assets/video-tests/W101/W101_keyframe_v1.png`
- Create: `刷到你了/assets/style-tests/W101/W101_anime_contrast_v1.png`
- Modify: `docs/superpowers/plans/2026-07-18-w101-anime-contrast-style-test.md`

### Task 1: Generate the anime contrast style test

**Files:**
- Reference: `刷到你了/assets/video-tests/W101/W101_keyframe_v1.png`
- Create: `刷到你了/assets/style-tests/W101/W101_anime_contrast_v1.png`

**Interfaces:**
- Consumes: the approved W101 keyframe as a composition and narrative reference.
- Produces: one portrait PNG suitable for visual review and later image-to-video testing.

- [ ] **Step 1: Inspect the local reference at original detail**

Use `view_image` on `W101_keyframe_v1.png`. Lock the bride at lower center, complete ladder at left, groomsman near its top, black truss overhead, and alarmed guests as compositional invariants.

- [ ] **Step 2: Run one built-in style-transfer generation**

Use this prompt:

```text
Use case: style-transfer
Asset type: vertical mobile-game story keyframe and short-video cover
Input image: Image 1 is the composition and narrative reference; preserve the spatial relationship, not the photoreal rendering.
Primary request: Transform the supplied W101 wedding accident scene into an original high-fidelity 2D anime keyframe with bold complementary color contrast and clean cel shading. This must look natively illustrated, never like an anime filter over a photograph.
Scene/backdrop: An elegant daytime ivory wedding hall with floral aisle and hanging lights, simplified into readable anime shapes.
Subject: Keep the ivory-gowned bride in the lower center as the emotional focus. Keep one complete silver extension ladder running from the floor up the left side, with a young groomsman safely standing near its top and reaching toward the wrong truss fastener. Keep the heavy black lighting truss tilted across the upper frame and guests recoiling around the aisle.
Style/medium: Original cinematic 2D anime, crisp expressive line art, clean two-to-three-step cel shading, selective sharp highlights, controlled speed lines and small debris, highly polished animation keyframe. Do not copy any existing anime character or living artist.
Composition/framing: Exact 9:16 vertical composition. Make “wedding”, “unskilled man on ladder”, and “dangerous overhead truss” readable at first glance. Preserve believable ladder geometry and clear silhouettes.
Lighting/mood: Deep cyan-blue and blue-violet shadows oppose intense orange-red danger light around the opening truss latch. Restrained magenta rim-light accents only. Keep natural skin tones readable and the bridal gown ivory-white. Urgent, stylish, darkly comic, not horror.
Color palette: deep cyan #073B4C, electric cyan #18C8D8, blue-violet #4636A8, danger orange #FF6B35, warning red #F23D4F, restrained magenta #D946EF, ivory #FFF3DE, near-black #10131A.
Constraints: full ladder visible from both feet to upper contact point; one bride only; plausible hands and limbs; truss remains overhead; no direct impact.
Avoid: photorealism, 3D render, soft pastel anime, muddy colors, neon nightclub lighting, excessive magenta, text, subtitles, UI, logo, watermark, blood, injury, extra limbs, duplicate people, malformed ladder.
```

- [ ] **Step 3: Persist the generated image in the project**

Create `刷到你了/assets/style-tests/W101/` and copy the selected built-in output to `W101_anime_contrast_v1.png`. Leave the generator-owned original in place.

- [ ] **Step 4: Normalize without stretching**

Run `sips -g pixelWidth -g pixelHeight`. If the image is not exact 9:16, center-crop it to the largest exact 9:16 rectangle that preserves the bride, ladder feet, groomsman, and truss.

### Task 2: Validate, record completion, and publish

**Files:**
- Verify: `刷到你了/assets/style-tests/W101/W101_anime_contrast_v1.png`
- Modify: `docs/superpowers/plans/2026-07-18-w101-anime-contrast-style-test.md`

**Interfaces:**
- Consumes: the selected normalized PNG.
- Produces: one visually approved asset and one synchronized Git commit.

- [ ] **Step 1: Inspect the final PNG visually**

Use `view_image` at original detail. Require: native cel-shaded anime appearance; strong cyan/orange contrast; restrained magenta; ivory gown; complete ladder; readable repair action; threatening overhead truss; no text or prohibited content.

- [ ] **Step 2: Allow one targeted correction only when necessary**

If a required invariant fails, edit the first output with one prompt that names only the failed invariant while preserving all passed qualities. Do not create extra variants merely for preference exploration.

- [ ] **Step 3: Run file and repository checks**

Run:

```bash
file '刷到你了/assets/style-tests/W101/W101_anime_contrast_v1.png'
sips -g pixelWidth -g pixelHeight '刷到你了/assets/style-tests/W101/W101_anime_contrast_v1.png'
git diff --check
git status --short
```

Expected: valid RGB/RGBA portrait PNG at exact 9:16; no modified video-test asset; only the style-test file, this plan, and the pre-existing untracked `.DS_Store` appear.

- [ ] **Step 4: Mark the plan complete**

Replace every remaining `- [ ]` in this plan with `- [x]`, then rerun `git diff --check`.

- [ ] **Step 5: Commit only the style test and plan**

```bash
git add docs/superpowers/plans/2026-07-18-w101-anime-contrast-style-test.md \
  '刷到你了/assets/style-tests/W101/W101_anime_contrast_v1.png'
git commit -m "feat: add W101 anime contrast style test"
```

- [ ] **Step 6: Push and verify synchronization**

Run `git push origin main`, verify `git rev-parse HEAD` equals `git rev-parse origin/main`, and confirm `.DS_Store` remains untracked.
