# Asset Discovery Priority

Use this guide when asset-aware mode is active and you need a stable order for checking what the project already has before introducing placeholders or new assets.

A supplied mockup or UI 시안 activates this discovery path unless the user explicitly requested layout-only work. Inspect and use suitable project images for image-backed roles. Missing indexes or `unity-resource-rag` require direct Unity/filesystem discovery and visual inspection; they do not establish that project images are missing.

File/atlas discovery may be assigned to a text-only worker, but visual suitability must come from a qualified image reviewer. Use `agent-capability-routing.md` for actual image delivery, source-attributed asset matches, and generation-executor qualification; filenames and asset metadata alone do not prove visual fit.

## Goal

Prevent random asset choices by following a clear discovery order for existing reusable UI assets.

## Default Discovery Order

Prefer this order:

1. existing reusable prefab, UXML/VisualTreeAsset template, or reusable block for the selected stack
2. prefab variant/wrapper or scoped UI Toolkit template/style override candidate
3. existing sprite, atlas entry, or sprite-backed UI image
4. existing font, TMP style, or text style system
5. existing material or shared visual treatment
6. agreed image generation for missing roles, only with an available image-generation skill and usable execution path
7. authorized placeholder asset or provisional visual for remaining gaps

Do not skip straight to placeholders if higher-confidence reusable assets already exist.

## Why This Order

- Prefabs preserve structure and behavior, not just appearance.
- Variants and wrappers preserve family consistency.
- Sprites preserve the normal UI art workflow.
- Fonts and text styles preserve readability and hierarchy.
- Materials are usually finishing details, not the first reuse anchor.
- Placeholders are acceptable when discovery fails, but should be the last normal step, not the first.
- Without an available image-generation skill, skip generation questions and generation even if an image tool exists; continue to an authorized provisional fallback. Image generation fills confirmed gaps without replacing suitable existing art by default; follow `image-asset-workflow.md` for temporary-resource decisions and actual application.

## Practical Rules

- If the same widget already exists as a prefab, check that first before reassembling it from sprites.
- If the same family exists but the current screen needs scoped differences, check for variant or wrapper paths next.
- If no prefab fit exists, look for existing sprite-backed visuals before inventing new temporary art.
- Keep font and text-style reuse deliberate so the screen does not drift away from the project's UI voice.
- Record inspected asset paths or GUIDs, visual fit, and missing roles. Do not force a low-confidence match or infer absence from a failed indexed search.
- Use placeholders only within the agreed scope after direct discovery and the generation decision; distinguish provisional visuals from final assets.

## Asset-Aware Mode Behavior

In asset-aware mode:

- inspect reusable prefab candidates first
- then inspect sprite-backed art and text systems
- for remaining gaps, resolve generation and temporary-resource use only if an image-generation skill is available and usable; otherwise skip generation questions and use an authorized placeholder fallback

If the project already has a stable widget family, treat a sudden placeholder-driven rebuild as suspicious.

## Common Anti-Patterns

- Building a widget from scratch even though a close prefab already exists.
- Jumping to a placeholder icon before checking the existing sprite or atlas workflow.
- Reusing a random material first even though the real reuse anchor should have been a prefab or sprite.
- Letting text styles drift because font/TMP reuse was never checked.
- Treating low-confidence asset lookup as permission to stop checking obvious nearby reusable assets.

## Verification Questions

- Did we check reusable prefabs before reconstructing UI from lower-level assets?
- Did we check sprite-backed visuals before inventing placeholders?
- Did we preserve existing font or text style conventions where relevant?
- Are placeholders clearly provisional rather than silent permanent replacements?
- If images were generated, were they imported, assigned to the agreed target, and visually checked, with any remaining art review named?
