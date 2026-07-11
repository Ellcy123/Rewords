# Remove W200 and Make the Wedding Route Linear

## Goal

Remove W200 as a playable or recorded video. Giving the technician to W101 must move directly to W300, whose story includes both the successful rescue and the edited “private meeting” rumor.

## Final Route

`W001 -> W101 -> W300 -> W301 -> W400 -> completion`

- W001 receives the ladder and resolves into W101.
- W101 receives the technician and resolves directly into W300.
- W300 receives the recorder and resolves into W301.
- W301 receives the projector and resolves into W400.
- W400 completes the level.

There is no second phase, intermediate W200 card, timer, automatic playback transition, “继续刷” button, or W200 record.

## W300 Story

W300 remains titled “婚礼当天私会维修工？” but begins by showing the successful repair:

1. The technician climbs the existing ladder and repairs the lighting rig.
2. The bride survives and the wedding continues.
3. The bride thanks the technician while the bridesmaid records them.
4. The bridesmaid edits the footage into an apparent private meeting.
5. The groom demands evidence and the player can send the recorder.

W300 is immediately interactive when it appears. It is never treated as a passive result waiting for confirmation.

## Content and State Changes

- Remove W200 from `NodeId` and the node catalog.
- Change the correct `W101 + technician` trigger result from W200 to W300.
- Remove W200 completion metadata and playback-completion UI wiring.
- Interactive main-result nodes such as W101, W300, and W301 become the current node immediately and do not set `pendingResultNodeId`.
- Passive resource results, wrong outcomes, and W400 keep their existing result-confirmation behavior.

## Save Migration

Introduce schema version 3. Version-2 saves containing W200 are repaired automatically:

- Replace W200 with W300 in unlocked nodes, feed nodes, current node, and pending result.
- Drop W200 from viewed and resolved records.
- Ensure W300 is unlocked and active when the player had reached W200.
- Preserve coins, inventory, discovered items, trigger history, alternate fates, tutorial state, sound settings, and completion state.

Version-1 migration continues to work by migrating through the existing version-2 normalization and then applying the W200-to-W300 repair.

## Verification

- Content validation contains no W200 references.
- W101 plus technician resolves directly to an interactive W300.
- W300 contains the repair, survival, recording, edit, and accusation beats.
- No W200 video or record can appear in a fresh game.
- Version-2 saves stopped at W200 load at W300 without reset.
- The full route reaches W400 and completion.
- Full tests, TypeScript checking, production build, and public-site content checks pass before deployment.
