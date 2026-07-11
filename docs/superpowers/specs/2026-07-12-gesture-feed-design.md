# Gesture-driven Three-card Feed Design

## Goal

Replace the current instant index swap with a TikTok-like vertical feed that follows the finger, reveals the adjacent video during the gesture, and settles with a short full-screen snap animation.

## Rendering Model

`VideoFeed` renders at most three full-screen slots: previous, current, and next. The current slot starts at `translateY(0)`, the previous at `-100%`, and the next at `100%`. A shared pixel drag offset is added to all slots so they move as one continuous vertical strip.

Only the current card receives `active=true`; adjacent cards render visually but their story playback remains inactive. Missing boundary cards render as empty slots so the current card never changes its coordinate system.

## Gesture State

Navigation has three phases:

- `idle`: no offset or transition.
- `dragging`: offset follows pointer movement without CSS transition.
- `settling`: slots animate either one viewport to commit or back to zero to cancel.

Pointer down records the pointer id, starting Y, timestamp, and viewport height, then captures the pointer. Pointer move updates the shared offset. At the first or last item, outward drag is multiplied by `0.28` to create boundary resistance.

Pointer up commits when either condition is true:

- absolute drag distance is at least 20% of viewport height;
- absolute release velocity is at least `0.55 px/ms`.

Otherwise the feed returns to the current video. A committed transition lasts 240 ms with `cubic-bezier(.2,.72,.2,1)`. A cancelled or boundary transition uses the same curve. Reduced-motion mode uses a very short transition while preserving directional movement.

The index changes only after the settling transition finishes. A timeout fallback completes the transition if a browser omits `transitionend`. Dynamic feed changes cancel any in-progress gesture and reset the offset around the current node.

## Desktop Navigation

Mouse wheel accumulation, ArrowUp, and ArrowDown start the same settling animation instead of directly changing the index. Further wheel, key, and pointer navigation is ignored until the active transition completes.

## Interaction Safety

Movement below 8 px remains a tap. Movement at or above 8 px suppresses the click generated after pointer release so dragging across a product, like, comment, or gift button cannot activate it. Overlays keep the existing `locked` behavior and cancel active drag state.

The feed uses pointer capture and `touch-action: none` inside the fixed phone canvas. This prevents browser page scrolling from fighting the in-app vertical gesture.

## Accessibility and Boundaries

- Boundary drags reveal no blank page beyond the resisted current card.
- Keyboard navigation remains supported.
- Reduced-motion preferences shorten the animation.
- Only the current card is exposed as active playback.
- Buttons retain their accessible names and tap behavior.

## Verification

Automated tests cover:

- three-slot rendering with only the current card active;
- pointer movement changing the visible offset before release;
- distance-threshold commit;
- velocity-threshold commit;
- small-drag rebound without index change;
- first/last boundary resistance;
- click suppression after a drag but normal click after a tap;
- wheel and keyboard settling through the same transition;
- locked overlays refusing navigation;
- existing complete route, recommendation, records, migration, typecheck, and production build.

The public deployment must return HTTP 200 and contain the new gesture-feed code before completion is reported.
