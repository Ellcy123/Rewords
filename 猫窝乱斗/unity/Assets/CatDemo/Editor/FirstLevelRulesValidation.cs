using System;
using UnityEditor;

namespace CatDemo {
public static class FirstLevelRulesValidation {
 [MenuItem("Cat Demo/Validate First Level Rules")]
 public static void Run() {
  PurchaseIsChargedOnce();
  InvalidPlacementRollsBack();
  ConnectionSpeedsAttacks();
  ThirdAttackIsACombo();
  SimultaneousEventsBothResolve();
  VictoryPaysOnce();
  RetryAndRestartResetCorrectly();
  TimeStepSizeDoesNotChangeCombat();
  UnityEngine.Debug.Log("First level rule validation passed: 8 rule groups.");
 }

 static void PurchaseIsChargedOnce() {
  var s = new FirstLevel();
  Check(s.Buy(), "first purchase should succeed");
  Check(s.Gold == 7 && s.Bought, "first purchase should deduct exactly 3 gold");
  Check(!s.Buy(), "second purchase should be rejected");
  Check(s.Gold == 7, "rejected purchase should not charge again");
 }

 static void InvalidPlacementRollsBack() {
  var s = new FirstLevel();
  Check(s.Buy(), "purchase required before toy placement");
  Check(s.Place(false, 1, 2), "adjacent toy placement should succeed");
  Check(!s.Place(false, 3, 2), "overlapping toy placement should be rejected");
  Check(s.ToyX == 1 && s.ToyY == 2, "rejected drag should leave the toy at its old position");
  Check(!s.Place(true, -1, 1), "out-of-bounds cat placement should be rejected");
  Check(s.CatX == 1 && s.CatY == 1, "rejected cat drag should leave the cat at its old position");
 }

 static void ConnectionSpeedsAttacks() {
  var s = new FirstLevel();
  Check(s.Buy() && s.Place(false, 1, 2), "connected setup should succeed");
  Check(s.Connected, "edge-adjacent cat and toy should be connected");
  Check(Math.Abs(s.Interval - 1.25) < 0.000001, "connection should reduce interval to 1.25 seconds");
  Check(!new FirstLevel().Connected, "unbought toy should not count as connected");
 }

 static void ThirdAttackIsACombo() {
  var s = ConnectedState();
  s.Start();
  s.Tick(3.75);
  Check(s.Attacks == 3, "three connected attack intervals should produce three attacks");
  Check(s.EnemyHP == 12, "third attack should add 12 damage after two 4-damage hits");
  Check(s.HP == 37, "the enemy attack at 3 seconds should resolve during the same tick");
 }

 static void SimultaneousEventsBothResolve() {
  var s = new FirstLevel();
  s.Start();
  s.Tick(6);
  Check(s.Attacks == 3 && s.EnemyHP == 12, "third cat attack at 6 seconds should resolve");
  Check(s.HP == 34, "enemy attack at the same 6-second timestamp should also resolve");
 }

 static void VictoryPaysOnce() {
  var s = ConnectedState();
  s.Start();
  s.Tick(25);
  Check(s.Finished && s.Won, "connected combat should finish with a win");
  Check(s.Rewarded && s.Gold == 13, "victory should award exactly 6 gold after the 3-gold purchase");
  s.Tick(25);
  s.Start();
  Check(s.Gold == 13 && s.Rewarded, "later ticks or starts must not pay the victory reward again");
 }

 static void RetryAndRestartResetCorrectly() {
  var s = new FirstLevel();
  s.Start();
  s.HP = 1;
  s.Tick(3);
  Check(s.Finished && !s.Won && s.HP == 0, "zero HP should end the run as a loss");
  s.Retry();
  Check(!s.Finished && !s.Fighting && s.HP == 40 && s.EnemyHP == 32 && s.Attacks == 0,
   "retry should return to setup with reset combat state");
  s.Start();
  Check(s.Fighting && s.Time == 0 && s.HP == 40 && s.EnemyHP == 32 && s.Attacks == 0,
   "starting the retry should reset combat state");
  var restarted = new FirstLevel();
  Check(restarted.Gold == 10 && !restarted.Bought && !restarted.Finished,
   "new run state should restore initial gold and setup state");
 }

 static void TimeStepSizeDoesNotChangeCombat() {
  var single = ConnectedState();
  var stepped = ConnectedState();
  single.Start();
  stepped.Start();
  single.Tick(8.2);
  double[] steps = { .1, .2, .7, 1.3, .05, 2.4, .45, 3 };
  foreach (double dt in steps) stepped.Tick(dt);
  Check(single.Attacks == stepped.Attacks, "frame chunking must preserve attack count");
  Check(single.HP == stepped.HP && single.EnemyHP == stepped.EnemyHP,
   "frame chunking must preserve both combat health values");
  Check(Math.Abs(single.Time - stepped.Time) < 0.000001,
   "frame chunking must preserve elapsed combat time");
  Check(Math.Abs(single.NextCat - stepped.NextCat) < 0.000001 &&
        Math.Abs(single.NextEnemy - stepped.NextEnemy) < 0.000001,
   "frame chunking must preserve future event times");
 }

 static FirstLevel ConnectedState() {
  var s = new FirstLevel();
  Check(s.Buy(), "purchase required for connected setup");
  Check(s.Place(false, 1, 2), "toy should fit adjacent to the cat");
  Check(s.Connected, "connected setup must be connected");
  return s;
 }

 static void Check(bool ok, string message) {
  if (!ok) throw new InvalidOperationException("First level rule failed: " + message);
 }
}
}
