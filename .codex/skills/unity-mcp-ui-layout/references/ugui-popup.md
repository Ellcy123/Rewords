# UGUI Popup Rules

Use this guide for settings dialogs, confirm windows, reward popups, pause menus, overlays, and tooltips that behave like modals.

## Structure Rules

- Build the root as `Canvas -> ModalLayer`, with `Dimmer` and `PopupRoot` as siblings under `ModalLayer`.
- Attach safe-area handling to `PopupRoot`, not to `ModalLayer` and not to individual popup children.
- Keep the dimmer responsible only for screen coverage and blocking background interaction.
- Keep all popup content under `PopupRoot` so safe-area and internal layout rules remain local to the popup.

## Anchor Rules

- `Dimmer`: full stretch anchor
- `PopupRoot`: center anchor, center pivot by default
- Close button: top-right anchor inside `PopupRoot`
- Footer action row: bottom stretch or bottom-center anchor inside `PopupRoot`

## Safe Area Rules

- Apply safe-area logic at `PopupRoot`.
- Use `PopupRoot` as the boundary for popup content, title bars, close buttons, and footer actions.
- Do not apply duplicate safe-area offsets to nested popup children.
- If a popup intentionally fills most of the screen on mobile, let `PopupRoot` respect safe area while the dimmer still covers the full screen.

## Animation Rules

- Scale-in popup: center pivot on `PopupRoot`
- Slide-in side sheet: pivot on the attached edge of `PopupRoot`
- Fade-only popup: keep pivot aligned with the visual center unless another motion rule requires otherwise

## Verification Rules

- Confirm the dimmer covers the full screen.
- Confirm popup content stays inside the safe area through `PopupRoot`.
- Confirm the close button and title row do not drift into the notch or rounded corners.
- Verify one alternate aspect ratio if the popup contains dense content.

## Avoid

- Mixing popup content into the HUD hierarchy
- Applying safe area to the full-screen dimmer instead of `PopupRoot`
- Nesting `PopupRoot` under `Dimmer` when the dimmer is intended to be only a backdrop and blocker
- Giving a centered popup stretch anchors unless it is intentionally a full-screen sheet
