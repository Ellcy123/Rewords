# UGUI HUD Rules

Use this guide for always-on-screen HUD elements such as minimaps, health bars, status widgets, counters, shortcut hints, and action bars.

## Structure Rules

- Build the root as `Canvas -> SafeAreaRoot -> HUDRoot`.
- Split `HUDRoot` into stable screen regions before adding widgets:
  - `TopLeft`
  - `TopRight`
  - `BottomLeft`
  - `BottomRight`
  - `TopCenter`
  - `BottomCenter`
  - `Center`
- Do not scatter leaf widgets directly under `HUDRoot` when they naturally belong to a corner or band.

## Anchor Rules

- Minimap, quest tracker: top-left anchor, top-left pivot
- Currency, connection status, score chips: top-right anchor, top-right pivot
- Chat, helper prompts: bottom-left anchor, bottom-left pivot
- Skill bar, hotbar, action bar: bottom stretch or bottom-center anchor depending on whether the bar spans the width
- Reticle, crosshair, lock-on marker: center anchor, center pivot

## Layout Rules

- Use containers for each corner or band and place local children relative to those containers.
- Use layout groups for repeated button rows or status icon stacks.
- Keep insets as local offsets from the anchored region, not global screen coordinates.

## Verification Rules

- Verify the HUD at the target resolution and one alternate aspect ratio.
- Check that corner widgets stay attached to the same visual edge.
- Check that action bars remain centered or stretched as intended.

## Avoid

- Positioning corner HUD elements relative to screen center
- Hand-placing each action bar button when a layout group should own the row
- Applying safe-area offsets to every HUD widget individually
