# Image Asset Workflow

Use this when mockup-driven Unity UI needs project images or generated sprites. Asset generation fills identified visual roles inside the agreed layout; it does not decide new structure or behavior.

When roles are delegated, use `agent-capability-routing.md`. The generation skill and execution path must belong to the named generation executor. A coordinator may relay that qualified executor's generation question, but cannot qualify a tool-only child using a parent's skill. Asset matching and visual review belong to an executor with verified vision for the actual images; a text-only generator or Unity operator must not claim those checks.

Only the designated coordinator has that relay allowance. A skill-less implementation child must neither ask nor forward generation questions on behalf of its parent, even if the parent requests it; report the missing capability to the coordinator instead. Parent tool readiness must be verified before treating that parent as a generation owner.

## Project Images First

- With a supplied mockup or UI 시안, inspect project images and use suitable existing resources for image-backed roles. Follow `asset-discovery-priority.md` for reusable units before lower-level art.
- Inspect existing assignments, sprite/atlas entries, nearby UI folders, and visual previews. Record the actual asset path or GUID, intended role, and why it fits. A similar filename alone is insufficient evidence.
- Missing `unity-resource-rag` or an asset index means use available Unity asset inspection or filesystem search and previews. It does not mean images are absent or that the task becomes layout-only.
- If a match is unsuitable or absent, record the searched locations and the gap. Do not force unrelated art into the screen or rebuild a matching image as colored primitives.
- An explicit layout-only request remains valid: preserve already assigned images, avoid art work beyond that scope, and keep any permitted placeholders provisional.

## Missing Images and Generation

An available image-generation skill is a prerequisite for both the generation question and generation itself. A standalone image tool, API, or credentials do not satisfy this condition.

1. Identify the missing image roles after discovery. Keep baked decorative regions whole unless the approved runtime design needs separate assets.
2. Check the agent's available skills for an applicable image-generation skill and read its `SKILL.md`. If none is available or its instructions cannot be read, skip both the generation question and generation, even if an image tool is callable. Record `generation_skill: unavailable`; do not install a skill or bypass this prerequisite with a direct tool call. If a skill is available, record its name/path and check the execution requirements it specifies.
3. Only with that skill available and its generation path usable, ask whether to generate temporary sprites for the named gaps if the choice is undecided. Existing generation authorization skips this question, not the skill prerequisite; a refusal remains valid. Do not ask again for every sprite in the agreed set.
4. Use the verified image-generation skill and the tools prescribed by its instructions to generate the agreed images. Derive the prompt from the mockup, tokens, reused project art, and the target role: style, palette, silhouette, aspect ratio, transparency, and intended display size. Keep runtime text separate unless it is intentionally baked artwork.
5. Have a qualified visual owner inspect the actual result at its intended display size, including transparency edges, legibility, fit, and consistency with reused art. A generator without vision returns an unreviewed candidate with its source identity to that reviewer; it does not select/apply the result as reviewed art. Retain source output, prompt/reference provenance, and any rejected candidates with the task artifacts; do not overwrite existing project art. If no visual owner is available, retain the candidate and report pending review.
6. Import the selected output into a screen-owned provisional asset location, following the project's naming and importer conventions. Record source-to-import mapping. Apply it to the approved UI target and verify the resolved assignment and screenshot.

If the skill or its generation path is unavailable, generation fails, or the user declines, state the actual limitation and keep missing roles explicit. Do not offer a generation question when the skill/path is unavailable. Continue agreed structural work with suitable project assets or already authorized placeholders. If the requested outcome requires finished images, keep that part pending instead of claiming it is complete. Generation failure does not authorize an unrequested external service or silent permanent placeholder.

## Stack-Specific Application

- **UGUI:** import static UI art as sprites and assign the resulting Sprite/sub-sprite to the intended `Image`. Check aspect/fit, transparency, and slicing or borders only where needed. A generated PNG is not a reason to switch to `RawImage`; retain that for actual texture-driven content.
- **UI Toolkit:** import the image using project conventions and bind the resolved Sprite/Texture2D through the intended `Image` element or style background. Preserve UXML/USS and visual-tree ownership; do not create a Canvas or prefab to attach the art.
- Wait for import to settle, inspect import/console errors, verify the target's resolved asset reference, and capture main and alternate-size screenshots. Do not report application from a file existing on disk alone.
- If Unity import or assignment cannot be exercised, deliver the image and concrete intended target with that limitation. Report generation, import, assignment, and visual verification separately.
- A qualified Unity operator may import, assign, and capture screenshots without vision. Transfer the actual final screenshots and their output revision to a verified visual reviewer; capture success and resolved references alone do not establish visual quality.

## Asset Plan and Completion

For an existing `mockup-layout-plan/v2` plan, use the asset entry's `plan` and `source` fields to record reuse, approved generation, or an authorized provisional fallback. Include project path/GUID or source-output path, target role, and temporary/final status. Keep generation provenance and QC evidence beside the task artifacts; no new mandatory schema fields are needed.

Generation must not add candidates, layout nodes, or behavior implicitly. Preserve `creates_runtime_node` and the accepted item/asset links. Held/rejected candidates stay out of item rect and asset plans, including generated replacements for those candidates.

Temporary-resource authorization permits a provisional UI preview. It does not make generated art final. Record user visual acceptance or remaining art review separately from successful import, correct assignment, and layout checks; do not silently promote provisional assets into shared or final resources.
