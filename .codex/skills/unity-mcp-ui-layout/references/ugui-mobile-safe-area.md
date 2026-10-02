# UGUI Mobile Safe Area Rules

Use this guide for mobile UGUI layouts that must avoid notches, home indicators, and rounded screen corners.

## Structure Rules

- Build the root as `Canvas -> SafeAreaRoot -> ScreenUI`.
- Put safe-area correction in `SafeAreaRoot` for normal full-screen UI.
- For modal popups, build `Canvas -> ModalLayer` with sibling `Dimmer` and `PopupRoot`, then apply safe-area handling to `PopupRoot`.
- Keep one owner for each safe-area adjustment zone.

## Anchor Rules

- Top bars anchor to the top edge of `SafeAreaRoot`
- Bottom bars anchor to the bottom edge of `SafeAreaRoot`
- Full-screen content stretches inside `SafeAreaRoot`
- Popup content anchors inside `PopupRoot`, which already respects safe area

## Verification Rules

- Check portrait and landscape separately.
- Check top-edge controls against notch areas.
- Check bottom action rows against the home indicator area.
- Check centered popups for safe-area clipping when content is tall.

## Avoid

- Applying raw per-widget safe-area offsets everywhere
- Mixing `SafeAreaRoot` rules with duplicate child-level corrections
- Forgetting that popups should use `PopupRoot` as the safe-area boundary
