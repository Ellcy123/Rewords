using System;
using System.IO;
using System.Linq;
using CatGame.Core;
using CatGame.Editor;
using CatGame.Runtime;
using NUnit.Framework;
using UnityEngine;

namespace CatGame.Tests.EditMode
{
    public sealed class CoreAndSessionTests
    {
        GameDefinition Defaults() => DemoSetup.Defaults();

        static OwnedPiece Piece(string id, string definition, int x, int y, bool onBoard = true, int pose = 0)
            => new OwnedPiece { instanceId = id, definitionId = definition, x = x, y = y, onBoard = onBoard, pose = pose };

        static RunState State(GameDefinition d, int stage = 0, int boardSize = 6, int gold = 10)
            => new RunState
            {
                runId = "test-run",
                rulesVersion = d.version,
                stage = stage,
                gold = gold,
                boardSize = boardSize,
                phase = Phase.Preparation,
                pieces = new System.Collections.Generic.List<OwnedPiece>(),
                shelf = new System.Collections.Generic.List<string> { "", "", "" },
                transactions = new System.Collections.Generic.List<string>()
            };

        [Test]
        public void ShapeRotationNormalizesCoordinatesAndReturnsAfterFourTurns()
        {
            var d = Defaults();
            var shape = BoardRules.Shape(d.Piece("noodle"), 1, 1);

            CollectionAssert.AreEquivalent(new[] { new Cell(0, 0), new Cell(1, 0), new Cell(1, 1) }, shape);
            CollectionAssert.AreEquivalent(
                BoardRules.Shape(d.Piece("noodle"), 1, 0),
                BoardRules.Shape(d.Piece("noodle"), 1, 4));
            Assert.That(shape.Length, Is.EqualTo(3));
        }

        [Test]
        public void PlacementRejectsOverlapAndOutOfBoundsButAllowsOwnCells()
        {
            var d = Defaults();
            var s = State(d, boardSize: 4);
            var cat = Piece("0", "noodle", 1, 1);
            var bell = Piece("1", "bell", 0, 0, false);
            s.pieces.Add(cat);
            s.pieces.Add(bell);

            Assert.That(BoardRules.CanPlace(d, s, bell, 1, 1, 0, 0), Is.False);
            Assert.That(BoardRules.CanPlace(d, s, bell, 0, 0, 0, 0), Is.True);
            Assert.That(BoardRules.CanPlace(d, s, bell, 4, 0, 0, 0), Is.False);
            Assert.That(BoardRules.CanPlace(d, s, cat, 1, 1, 0, 0), Is.True);
        }

        [Test]
        public void AdjacencyRequiresAnOrthogonalSharedEdge()
        {
            var d = Defaults();
            var cat = Piece("0", "noodle", 1, 1);
            var diagonal = Piece("1", "bell", 0, 0);
            var edge = Piece("2", "bell", 0, 1);

            Assert.That(BoardRules.Adjacent(d, cat, diagonal), Is.False);
            Assert.That(BoardRules.Adjacent(d, cat, edge), Is.True);
        }

        [Test]
        public void SameTypeEquipmentCountsOncePerCatAndCanServeMultipleCats()
        {
            var d = Defaults();
            var s = State(d);
            s.pieces.Add(Piece("cat-a", "noodle", 0, 0));
            s.pieces.Add(Piece("cat-b", "pillow", 1, 2));
            s.pieces.Add(Piece("feather-first", "feather", 0, 1));
            s.pieces.Add(Piece("feather-second", "feather", 3, 0));

            var cats = SynergyRules.Resolve(d, s).ToDictionary(c => c.instanceId);

            Assert.That(cats["cat-a"].interval, Is.EqualTo(12500));
            Assert.That(cats["cat-a"].connections.Count, Is.EqualTo(1));
            Assert.That(cats["cat-a"].connectionInstanceIds.Single(), Is.EqualTo("feather-first"));
            Assert.That(cats["cat-b"].interval, Is.EqualTo(15625));
            Assert.That(cats["cat-b"].connections.Count, Is.EqualTo(1));
            Assert.That(cats["cat-b"].connectionInstanceIds.Single(), Is.EqualTo("feather-first"));
        }

        [Test]
        public void ThreeCatsTriggerTheirOwnSkillsAndShieldOnTheirThirdAttack()
        {
            var d = Defaults();
            d.stages[0].enemyHP = 1000;
            d.stages[0].enemyDamage = 0;
            d.stages[0].enemyIntervalTicks = 200000;
            var s = State(d);
            s.pieces.Add(Piece("noodle", "noodle", 0, 0));
            s.pieces.Add(Piece("hammer", "hammer", 0, 2));
            s.pieces.Add(Piece("pillow", "pillow", 0, 4));
            var battle = new Battle(d, s);

            battle.Advance(9.0);

            Assert.That(battle.attacks, Is.EqualTo(10));
            Assert.That(battle.skills, Is.EqualTo(3));
            Assert.That(battle.enemyHP, Is.EqualTo(934));
            Assert.That(battle.shield, Is.EqualTo(6));
            Assert.That(battle.timeline.Count(e => e.kind == "extra-attack"), Is.EqualTo(2));
            Assert.That(battle.timeline.Count(e => e.kind == "heavy"), Is.EqualTo(1));
            Assert.That(battle.timeline.Count(e => e.kind == "shield"), Is.EqualTo(1));
        }

        [Test]
        public void SameTimeLethalAttacksResolveTogetherAndMutualDeathIsALoss()
        {
            var d = Defaults();
            d.stages[0].enemyHP = 4;
            d.stages[0].enemyDamage = 40;
            d.stages[0].enemyIntervalTicks = 20000;
            d.stages[0].playerHP = 40;
            var s = State(d);
            s.pieces.Add(Piece("noodle", "noodle", 0, 0));
            var battle = new Battle(d, s);

            battle.Advance(2.0);

            Assert.That(battle.time, Is.EqualTo(20000));
            Assert.That(battle.enemyHP, Is.Zero);
            Assert.That(battle.hp, Is.Zero);
            Assert.That(battle.finished, Is.True);
            Assert.That(battle.won, Is.False);
        }

        [Test]
        public void SkillShieldIsAvailableAgainstEnemyAttackAtTheSameTime()
        {
            var d = Defaults();
            d.stages[0].enemyHP = 1000;
            d.stages[0].enemyDamage = 7;
            d.stages[0].enemyIntervalTicks = 75000;
            var s = State(d);
            s.pieces.Add(Piece("pillow", "pillow", 0, 0));
            s.pieces.Add(Piece("lamp", "lamp", 2, 0));
            var battle = new Battle(d, s);

            battle.Advance(7.5);

            Assert.That(battle.skills, Is.EqualTo(1));
            Assert.That(battle.hp, Is.EqualTo(40));
            Assert.That(battle.shield, Is.EqualTo(1));
            Assert.That(battle.timeline.Any(e => e.time == 75000 && e.kind == "item-shield" && e.amount == 2), Is.True);
            Assert.That(battle.timeline.Any(e => e.time == 75000 && e.kind == "enemy-attack" && e.amount == 0), Is.True);
        }

        [Test]
        public void ExactDeadlineEventIsResolvedBeforeTimeout()
        {
            var d = Defaults();
            d.stages[0].enemyHP = 4;
            d.stages[0].enemyDamage = 0;
            d.stages[0].enemyIntervalTicks = 300000;
            d.stages[0].limitTicks = 20000;
            var s = State(d);
            s.pieces.Add(Piece("noodle", "noodle", 0, 0));
            var battle = new Battle(d, s);

            battle.Advance(2.0);

            Assert.That(battle.time, Is.EqualTo(20000));
            Assert.That(battle.enemyHP, Is.Zero);
            Assert.That(battle.won, Is.True);
            Assert.That(battle.timedOut, Is.False);
        }

        [Test]
        public void TimeoutFailsAndCannotBeRevivedWithAnAd()
        {
            var d = Defaults();
            d.stages[0].enemyHP = 1000;
            d.stages[0].enemyDamage = 0;
            d.stages[0].enemyIntervalTicks = 300000;
            d.stages[0].limitTicks = 10000;
            var session = new RunSession(d);
            Assert.That(session.Place("0", 1, 1), Is.True);
            Assert.That(session.StartBattle(), Is.True);

            session.Tick(1.0);

            Assert.That(session.State.phase, Is.EqualTo(Phase.Lost));
            Assert.That(session.State.lossTimedOut, Is.True);
            Assert.That(session.RewardAd(session.CreateAdTicket(true), true, true), Is.False);
        }

        [Test]
        public void FourStageRecommendedPurchasesCarryGoldAndRewardsForwardExactlyOnce()
        {
            var d = Defaults();
            var session = new RunSession(d);

            Assert.That(session.State.gold, Is.EqualTo(10));
            Assert.That(session.Place("0", 1, 1), Is.True);
            Assert.That(session.Buy(0), Is.True);
            Assert.That(session.State.gold, Is.EqualTo(7));
            Assert.That(session.Place("1", 1, 0), Is.True);
            session.StartBattle(); session.Tick(25);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(session.State.gold, Is.EqualTo(13));
            session.Tick(25);
            Assert.That(session.State.gold, Is.EqualTo(13));
            Assert.That(session.Next(), Is.True);

            Assert.That(session.Buy(0), Is.True);
            Assert.That(session.State.gold, Is.EqualTo(10));
            Assert.That(session.Place("2", 0, 1), Is.True);
            session.StartBattle(); session.Tick(25);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(session.State.gold, Is.EqualTo(16));
            Assert.That(session.Next(), Is.True);

            Assert.That(session.Buy(0), Is.True);
            Assert.That(session.State.gold, Is.EqualTo(12));
            Assert.That(session.Place("3", 1, 2), Is.True);
            session.StartBattle(); session.Tick(25);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(session.State.gold, Is.EqualTo(18));
            Assert.That(session.State.transactions, Is.EquivalentTo(new[] { "win:0", "win:1", "win:2" }));
            Assert.That(session.Next(), Is.True);
            Assert.That(session.State.stage, Is.EqualTo(3));
            Assert.That(session.State.gold, Is.EqualTo(18));
            Assert.That(session.State.shelf, Is.EqualTo(new[] { "hammer", "pillow", "cushion" }));
        }

        [Test]
        public void RecommendedRunCanWinTheDefault160HpFourthStageWithSharedOpeningShield()
        {
            var d = Defaults();
            var session = new RunSession(d);

            Assert.That(session.Place("0", 1, 1), Is.True);
            Assert.That(session.Buy(0), Is.True);
            Assert.That(session.Place("1", 1, 0), Is.True);
            session.StartBattle(); session.Tick(25);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(session.Next(), Is.True);

            Assert.That(session.Buy(0), Is.True);
            Assert.That(session.Place("2", 0, 1), Is.True);
            session.StartBattle(); session.Tick(25);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(session.Next(), Is.True);

            Assert.That(session.Buy(0), Is.True);
            Assert.That(session.Place("3", 1, 2), Is.True);
            session.StartBattle(); session.Tick(25);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(session.State.gold, Is.EqualTo(18));
            Assert.That(session.Next(), Is.True);
            Assert.That(session.State.stage, Is.EqualTo(3));

            Assert.That(session.Buy(0), Is.True); // Hammer: 6 gold.
            Assert.That(session.Expand(), Is.True); // 4x4 -> 5x5: 8 gold.
            Assert.That(session.Buy(2), Is.True); // Cushion: 3 gold.
            Assert.That(session.State.gold, Is.EqualTo(1));
            Assert.That(session.Place("4", 1, 3), Is.True);
            Assert.That(session.Place("5", 4, 1, 0, 1), Is.True);

            var cats = SynergyRules.Resolve(d, session.State).ToDictionary(c => c.instanceId);
            Assert.That(cats.Count, Is.EqualTo(2));
            Assert.That(cats["0"].openingShield, Is.EqualTo(6));
            Assert.That(cats["4"].openingShield, Is.EqualTo(6));
            Assert.That(cats.Values.Sum(c => c.openingShield), Is.EqualTo(12));
            Assert.That(session.Definition.stages[3].enemyHP, Is.EqualTo(160));

            Assert.That(session.StartBattle(), Is.True);
            Assert.That(session.Combat.shield, Is.EqualTo(12));
            session.Tick(25);

            Assert.That(session.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(session.Combat.enemyHP, Is.Zero);
            Assert.That(session.Combat.hp, Is.GreaterThan(0));
            Assert.That(session.State.gold, Is.EqualTo(7));
            Assert.That(session.Next(), Is.True);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Complete));
        }

        [Test]
        public void FourthStageRefreshBuySellAndExpansionUseExpectedCosts()
        {
            var d = Defaults();
            var s = State(d, stage: 3, boardSize: 4, gold: 50);
            s.pieces.Add(Piece("0", "noodle", 1, 1));
            s.shelf = new System.Collections.Generic.List<string> { "hammer", "pillow", "cushion" };
            var store = new InMemoryStore { Value = s };
            var session = new RunSession(d, store);

            Assert.That(session.Refresh(), Is.True);
            Assert.That(session.State.gold, Is.EqualTo(50));
            Assert.That(session.State.shelf, Is.EqualTo(new[] { "fish", "lamp", "feather" }));
            Assert.That(session.Refresh(), Is.True);
            Assert.That(session.State.gold, Is.EqualTo(49));
            Assert.That(session.State.shelf, Is.EqualTo(new[] { "bell", "mouse", "noodle" }));
            Assert.That(session.Buy(1), Is.True);
            Assert.That(session.State.gold, Is.EqualTo(45));
            Assert.That(session.Sell("1"), Is.True);
            Assert.That(session.State.gold, Is.EqualTo(47));
            Assert.That(session.Expand(), Is.True);
            Assert.That(session.State.boardSize, Is.EqualTo(5));
            Assert.That(session.State.gold, Is.EqualTo(39));
            Assert.That(session.Expand(), Is.True);
            Assert.That(session.State.boardSize, Is.EqualTo(6));
            Assert.That(session.State.gold, Is.EqualTo(27));
            Assert.That(session.Expand(), Is.False);
        }

        [Test]
        public void StartBattleRequiresACatOnTheBoard()
        {
            var d = Defaults();
            var session = new RunSession(d);
            Assert.That(session.Store("0"), Is.True);

            Assert.That(session.StartBattle(), Is.False);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Preparation));
        }

        [Test]
        public void NewRunStartsWithCatWaitingAndRequiresPlacementBeforeBattle()
        {
            var d = Defaults();
            var session = new RunSession(d);
            var initialCat = session.State.pieces.Single(p => p.instanceId == "0");

            Assert.That(initialCat.onBoard, Is.False);
            Assert.That(session.StartBattle(), Is.False);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Preparation));

            Assert.That(session.Place("0", 1, 1), Is.True);
            Assert.That(session.State.pieces.Single(p => p.instanceId == "0").onBoard, Is.True);
            Assert.That(session.StartBattle(), Is.True);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Battle));
        }

        [Test]
        public void GoldAdCancelDoesNotConsumeAndRepeatedSuccessPaysOnlyOnce()
        {
            var d = Defaults();
            var session = new RunSession(d);
            var ticket = session.CreateAdTicket(false);

            Assert.That(session.RewardAd(ticket, false, false), Is.False);
            Assert.That(session.State.goldAdUsed, Is.False);
            Assert.That(session.RewardAd(ticket, false, true), Is.True);
            Assert.That(session.State.gold, Is.EqualTo(14));
            Assert.That(session.State.goldAdUsed, Is.True);
            Assert.That(session.RewardAd(ticket, false, true), Is.False);
            Assert.That(session.State.gold, Is.EqualTo(14));
        }

        [Test]
        public void ReviveRestartsTheSameLineupAtTwentyPercentExtraHealthAndCannotRepeat()
        {
            var d = Defaults();
            d.stages[0].enemyHP = 1000;
            d.stages[0].enemyDamage = 100;
            d.stages[0].enemyIntervalTicks = 20000;
            var session = new RunSession(d);
            Assert.That(session.Place("0", 1, 1), Is.True);
            Assert.That(session.StartBattle(), Is.True);
            session.Tick(2.0);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Lost));

            var ticket = session.CreateAdTicket(true);
            Assert.That(session.RewardAd(ticket, true, true), Is.True);
            Assert.That(session.State.phase, Is.EqualTo(Phase.Battle));
            Assert.That(session.Combat.maxHP, Is.EqualTo(48));
            Assert.That(session.Combat.hp, Is.EqualTo(48));
            Assert.That(session.State.pieces.Single(p => p.instanceId == "0").onBoard, Is.True);
            Assert.That(session.RewardAd(ticket, true, true), Is.False);
        }

        [Test]
        public void LoadingBattleRestartsFromSavedFormationWithoutCreditingAnotherReward()
        {
            var d = Defaults();
            d.stages[0].enemyHP = 4;
            d.stages[0].enemyDamage = 0;
            d.stages[0].enemyIntervalTicks = 30000;
            var s = State(d, boardSize: 4, gold: 22);
            s.phase = Phase.Battle;
            s.transactions.Add("win:0");
            s.pieces.Add(Piece("0", "noodle", 1, 1));
            var store = new InMemoryStore { Value = s };
            var resumed = new RunSession(d, store);

            Assert.That(resumed.Combat, Is.Not.Null);
            Assert.That(resumed.Combat.time, Is.Zero);
            resumed.Tick(2.0);

            Assert.That(resumed.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(resumed.State.gold, Is.EqualTo(22));
            Assert.That(resumed.State.transactions.Count(t => t == "win:0"), Is.EqualTo(1));
        }

        [Test]
        public void JsonStoreRestoresValidBackupAndQuarantinesCorruptPrimary()
        {
            var d = Defaults();
            var directory = Path.Combine(Path.GetTempPath(), "catgame-tests-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            var path = Path.Combine(directory, "run.json");
            try
            {
                var store = new JsonRunStore(path);
                var first = State(d, boardSize: 4, gold: 12);
                first.pieces.Add(Piece("0", "noodle", 1, 1));
                store.Save(first);
                var latest = State(d, stage: 3, boardSize: 5, gold: 31);
                latest.pieces.Add(Piece("0", "noodle", 1, 1));
                latest.shelf = new System.Collections.Generic.List<string> { "hammer", "pillow", "cushion" };
                store.Save(latest);
                File.WriteAllText(path, "not valid json");

                var recovered = store.Load();

                Assert.That(recovered, Is.Not.Null);
                Assert.That(recovered.gold, Is.EqualTo(12));
                Assert.That(recovered.stage, Is.EqualTo(0));
                Assert.That(store.LoadNotice, Is.EqualTo("存档异常，已从备份恢复"));
                Assert.That(Directory.GetFiles(directory, "run.json.invalid-*").Length, Is.EqualTo(1));
                Assert.That(File.ReadAllText(path), Does.Contain("test-run"));
            }
            finally
            {
                if (Directory.Exists(directory)) Directory.Delete(directory, true);
            }
        }

        sealed class InMemoryStore : IRunStore
        {
            public RunState Value;
            public RunState Load() => Value;
            public void Save(RunState state) => Value = state;
        }
    }
}
