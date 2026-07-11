# Active Feed, Video Archive, and Recommended Gifts Design

## Goal

Keep the complete playable route from W001 through W400 while making it feel like one continuous level instead of two phases. Correctly resolved videos leave the recommendation feed and move into a replayable archive, wrong outcomes remain collectible, and every gift sheet identifies the recommended gift and gives the player a direct path to obtain it.

## Player Experience

The playable route remains:

`W001 -> W101 -> W200 -> W300 -> W301 -> W400 -> completion`

W200 is an intermediate success, not a stage ending. When its result finishes, W200 is archived and W300 enters the recommendation feed automatically. There is no chapter label, phase transition, or second-stage screen.

The resource routes use the same replacement rule:

- `K001 + ladder -> K101`, which discovers the recorder.
- `C001 + recorder -> C101`, which discovers the projector.

At any time, the feed contains only videos that still have a purpose. Completed source videos remain available in Records for replay.

## Resolution and Archive Rules

Add an explicit `resolvedNodeIds` collection to saved game state. `viewedNodeIds` continues to mean that a video was watched; it must not control whether a video remains playable.

When a correct main or resource gift resolves a video:

1. Consume the gift.
2. Record the trigger.
3. Mark the target node resolved.
4. Remove the target from the active feed.
5. Unlock and add the result node to the active feed.
6. Focus the result node.

When a wrong gift resolves:

1. Consume the gift and record the trigger.
2. Add the wrong result to the existing alternate-fate collection.
3. Keep the source node active so the player can try again.

When W200 finishes, mark W200 resolved and unlock W300 using the same result flow. When W400 finishes, mark it resolved and set the game complete before showing the completion overlay.

Feed ranking excludes `resolvedNodeIds`. Recovery from an empty feed restores the most relevant unresolved node rather than resetting progress.

## Records UI

Rename the bottom navigation entry from “命运” to “记录”. Its sheet has two views:

- “已改写” lists resolved normal videos in story order and supports replay without reactivating them.
- “别的命运” preserves the current wrong-outcome collection and replay behavior.

Replay is read-only. It does not modify the active feed, consume items, award coins, or run triggers again.

## Recommended Gift UI

Every gift sheet renders every gift that can be used on that node, including undiscovered recommended gifts. The correct gift receives a visible “推荐赠送” badge from the start; wrong gifts remain selectable.

The recommended card has three states:

- Owned: selectable like any other gift.
- Discovered but not owned: shows “去购买” and navigates directly to its product video.
- Undiscovered: shows “去找线索” and navigates to the active prerequisite video that discovers it.

Navigation closes the gift sheet, ensures the target video is active, updates the current node, and focuses it. For the current content graph, an undiscovered recorder routes to K001 and an undiscovered projector routes through C001 once the recorder is available.

If a route cannot be resolved because save data is inconsistent, the card remains locked and shows a short recovery message; it never recommends an incorrect gift.

## Save Migration

Introduce save schema version 2 and automatically migrate version-1 saves. Preserve coins, inventory, discovered items, unlocked nodes, viewed nodes, trigger history, wrong outcomes, tutorial state, sound setting, and completion state.

Derive resolved nodes conservatively:

- A successful non-wrong trigger resolves its target node.
- An unlocked W300 implies W200 was resolved.
- A completed save implies W400 was resolved.

After derivation, remove resolved nodes from the active feed and retain all unresolved unlocked nodes. Write future saves as version 2. Corrupt saves retain the existing backup-and-recover behavior; genuinely unknown future versions retain the safe-reset screen.

## Components and Boundaries

- State and reducer own resolution, feed membership, completion, and navigation intent.
- Content helpers identify the correct trigger and the acquisition route for a gift.
- Feed selectors rank only active unresolved nodes.
- Gift-sheet selectors return recommendation and acquisition state without mutating game state.
- Records selectors return resolved and wrong nodes separately.
- UI components dispatch semantic actions and do not reconstruct progression rules.

These boundaries keep content-graph decisions out of presentation components and allow each rule to be tested independently.

## Verification

Automated tests must cover:

- Correct gifts archive the source and activate the result.
- Wrong gifts preserve the source and record only the alternate outcome.
- W200 archives itself and activates W300 without a phase transition.
- W400 produces the completion overlay.
- Feed ranking excludes resolved nodes and empty-feed recovery preserves progress.
- Recommended gifts show owned, purchasable, and undiscovered acquisition states.
- Recommendation navigation reaches the correct product or prerequisite video.
- Records separate resolved videos from alternate fates and replay is read-only.
- Version-1 saves migrate without losing progress.
- A complete state-level route from a fresh save reaches W400.

Run the full Vitest suite, TypeScript typecheck, production build, and a mobile-sized browser smoke test before deployment.

## Non-goals

- Removing W300, W301, or W400.
- Adding chapters or a visible second-phase concept.
- Automatically selecting or sending the recommended gift.
- Preventing deliberate wrong choices.
- Adding the rewarded coin minigame in this change.
