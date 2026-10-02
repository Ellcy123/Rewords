# Unity CLI retry report

- Date: 2026-10-01 (Asia/Shanghai)
- Project: `/Users/m4/project/rewords/猫窝乱斗/unity`
- Editor: Unity `6000.4.0f1`
- Compile: test assemblies loaded and ran; no compile error was reported.

## Initial EditMode run

Command:

```text
/Users/m4/.unity/bin/unity test /Users/m4/project/rewords/猫窝乱斗/unity --mode EditMode --filter CatGame --editor-version 6000.4.0f1 --output /Users/m4/project/rewords/猫窝乱斗/unity/Review/C-port-20261001/retry/editmode.xml --timeout 300 --format json --no-banner
```

Result: **13 passed, 4 failed, 0 skipped** (CLI exit `8`, `TESTS_FAILED`). The failures were `TimeoutFailsAndCannotBeRevivedWithAnAd`, `FourStageRecommendedPurchasesCarryGoldAndRewardsForwardExactlyOnce`, `RecommendedRunCanWinTheDefault160HpFourthStageWithSharedOpeningShield`, and `ReviveRestartsTheSameLineupAtTwentyPercentExtraHealthAndCannotRepeat`. They all remained in `Preparation`: the new-run cat (`instanceId` `0`) starts in the waiting area (`onBoard=false`), while these old flows did not put it on the board before starting battle. No tests were changed to hide this result.

## Updated EditMode run

Updated the four test flows to place the initial cat at `(1,1)` and assert placement and `StartBattle()` succeed. Added `NewRunStartsWithCatWaitingAndRequiresPlacementBeforeBattle` to cover the waiting cat, empty-board rejection, and battle start after placement.

Result: **18 passed, 0 failed, 0 skipped** (CLI exit `0`).

## PlayMode run

Command:

```text
/Users/m4/.unity/bin/unity test /Users/m4/project/rewords/猫窝乱斗/unity --mode PlayMode --filter CatGame --editor-version 6000.4.0f1 --output /Users/m4/project/rewords/猫窝乱斗/unity/Review/C-port-20261001/retry/playmode.xml --timeout 300 --format json --no-banner
```

Result: **4 passed, 7 failed, 0 skipped** (CLI exit `8`, `TESTS_FAILED`). These failures have not been individually classified as legacy assertions or regressions; no PlayMode tests or production code were changed.

| Failing test | Reported failure |
|---|---|
| `BattleAttackSwitchesCatFramesAndShowsClawEffect` | Expected attacking cat to leave idle frame; got `False`. |
| `FormalArtRegistryAndWholeFootprintRenderingAreActive` | Expected one whole-footprint cat sprite; got `0`. |
| `ManualPauseApplicationPauseAndFocusDoNotUnpauseEachOther` | Expected `Battle`; got `Preparation`. |
| `PreparationBattleAndResultPanelsStayInTheirPhaseSlots` | Preparation text `Status` was not found. |
| `UiPointerEventsBuyDragStartAndAdvanceThroughAllFourStages` | `ArgumentOutOfRangeException`: index outside collection. |
| `InformationStaysFlatAndShopCardsAdaptToActualInventory` | `NullReferenceException`. |
| `PaperButtonKeepsClickAndPressStateWhileDisabledAndDialogsKeepPaperSurface` | Expected `Battle`; got `Preparation`. |

## Artifacts

- Initial EditMode NUnit report: `editmode.xml`; CLI output: `cli.stdout.json`, `cli.stderr.log`; exit code: `exit-code.txt`.
- Updated EditMode NUnit report: `editmode-updated.xml`; CLI output: `editmode-updated.stdout.json`, `editmode-updated.stderr.log`; exit code: `editmode-updated.exit-code.txt`.
- PlayMode NUnit report: `playmode.xml`; CLI output: `playmode.stdout.json`, `playmode.stderr.log`; exit code: `playmode.exit-code.txt`.
