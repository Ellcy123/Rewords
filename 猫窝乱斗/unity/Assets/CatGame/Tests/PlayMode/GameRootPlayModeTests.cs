using System.Collections;
using System.Collections.Generic;
using System.Linq;
using CatGame.Core;
using CatGame.Presentation;
using CatGame.Runtime;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace CatGame.Tests.PlayMode
{
    public sealed class GameRootPlayModeTests
    {
        GameObject rootObject;
        GameObject inputObject;
        GameRoot root;
        GameContent testContent;

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (rootObject != null) Object.Destroy(rootObject);
            if (inputObject != null) Object.Destroy(inputObject);
            if (testContent != null) Object.Destroy(testContent);
            yield return null;
        }

        [UnityTest]
        public IEnumerator PreparationBattleAndResultPanelsStayInTheirPhaseSlots()
        {
            CreateRoot(makeBattlesFast: true);
            yield return null;
            Canvas.ForceUpdateCanvases();

            foreach (var name in new[] { "Opponent", "Title", "PrepTitle", "ShopTitle", "ShopGold", "BoardHeading", "ConnectionHint", "Hint" })
            {
                var go = GameObject.Find(name);
                Assert.That(go, Is.Not.Null, "Missing preparation UI text: " + name);
                var text = go.GetComponent<Text>();
                Assert.That(text, Is.Not.Null);
                Assert.That(text.text, Is.Not.Empty, name + " must have visible content.");
                Assert.That(text.verticalOverflow, Is.EqualTo(VerticalWrapMode.Overflow));
                Assert.That(text.preferredHeight, Is.LessThanOrEqualTo(text.rectTransform.rect.height + 1f),
                    name + " glyphs must fit the assigned panel instead of being truncated.");
                Assert.That(go.GetComponent<Button>(), Is.Null, name + " is information, not an action.");
            }

            AssertSeparated("PrepHeader", "ShopPanel");
            AssertSeparated("ShopPanel", "BoardHeading");
            AssertSeparated("BoardHeading", "Board");
            AssertSeparated("Board", "WaitingArea");
            Assert.That(GameObject.Find("Waiting_0"), Is.Not.Null, "A new run's cat must begin in the waiting area.");
            Assert.That(root.Session.State.pieces.Single(p => p.instanceId == "0").onBoard, Is.False);
            Assert.That(GameObject.Find("ShopNext"), Is.Null, "One available item does not need pagination.");
            Assert.That(GameObject.Find("BattleSummary"), Is.Null,
                "Preparation must not show battle results before combat starts.");

            foreach(var image in rootObject.GetComponentsInChildren<Image>())
                Assert.That(image.sprite==null || !image.sprite.name.StartsWith("ui_"), Is.True,
                    "Programmatic UI must not display legacy UI sprites: "+image.name);

            Assert.That(root.Session.Place("0", 1, 1), Is.True);
            yield return null;
            ClickButton("StartBattle");
            yield return null;
            Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Battle));
            Assert.That(GameObject.Find("BossStatus"), Is.Not.Null);
            Assert.That(GameObject.Find("BattleTimer").GetComponent<Text>().text, Is.Not.Empty);
            Assert.That(GameObject.Find("BattleSummary"), Is.Null, "Battle must not create the settlement panel.");
            Assert.That(GameObject.Find("Speed"), Is.Not.Null, "Battle exposes its speed control.");
            Assert.That(GameObject.Find("Pause"), Is.Null, "Pause is managed through application state and the menu.");
            var fabricNest = GameObject.Find("FabricNest").GetComponent<Image>();
            Assert.That(fabricNest.sprite, Is.SameAs(Resources.Load<Sprite>("WebUi/nest_fabric_v1")));
            Assert.That(GameObject.Find("Cell_0_0"), Is.Null, "Battle shows the fabric nest without the preparation grid.");
            Assert.That(GameObject.Find("WaitingArea"), Is.Null);
            Assert.That(GameObject.Find("Buy_0"), Is.Null);
            Assert.That(GameObject.Find("StartBattle"), Is.Null);
            Assert.That(GameObject.Find("Next"), Is.Null);
            AssertSeparated("EnemyArt", "FabricNest");
            AssertSeparated("Board", "TeamStatus");
            AssertContained("FabricNest", "PortraitFrame");
            AssertContained("Board", "FabricNest");

            root.Session.Tick(3.0);
            yield return null;
            Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Won));
            Assert.That(GameObject.Find("ResultOverlay"), Is.Not.Null);
            Assert.That(GameObject.Find("BattleTitle"), Is.Not.Null);
            Assert.That(GameObject.Find("Next"), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator FormalArtRegistryAndWholeFootprintRenderingAreActive()
        {
            CreateRoot(makeBattlesFast: false);
            yield return null;
            Assert.That(root.Session.Place("0", 1, 1), Is.True);
            yield return null;

            Assert.That(testContent.visuals, Is.Not.Null);
            Assert.That(testContent.visuals.Length, Is.GreaterThanOrEqualTo(26));
            Assert.That(testContent.SpriteFor("bg_bedroom_gameplay"), Is.Not.Null);
            Assert.That(testContent.PieceSpriteFor("noodle", 0), Is.Not.Null);
            Assert.That(testContent.EnemySpriteFor("under-bed"), Is.Not.Null);
            Assert.That(testContent.SpriteFor("ui_button_pressed"), Is.Not.Null);

            var idleFrame = Resources.Load<Sprite>("Art/Animation/cat_noodle_stretch/frame_01");
            Assert.That(idleFrame, Is.Not.Null, "Animation frames must be imported as Sprite resources.");
            var art = GameObject.FindObjectsByType<Image>(FindObjectsSortMode.None)
                .Where(i => i.sprite == idleFrame).ToArray();
            Assert.That(art.Length, Is.EqualTo(1),
                "A multi-cell cat must render once across its footprint instead of repeating the same sprite in every cell.");
            Assert.That(art[0].transform.parent.name, Does.StartWith("PieceArt_"));
            Assert.That(GameObject.Find("BedroomBackground").GetComponent<Image>().sprite,
                Is.SameAs(testContent.SpriteFor("bg_bedroom_gameplay")));
        }

        [UnityTest]
        public IEnumerator BattleAttackSwitchesCatFramesAndShowsClawEffect()
        {
            CreateRoot(makeBattlesFast: false);
            yield return null;
            Assert.That(SpriteSequenceLibrary.Get("cat_noodle_stretch", "idle"), Is.Not.Null);
            Assert.That(SpriteSequenceLibrary.Get("cat_noodle_stretch", "attack"), Is.Not.Null);
            Assert.That(SpriteSequenceLibrary.Get("claw_hit", "motion"), Is.Not.Null);
            Assert.That(root.Session.Place("0", 1, 1), Is.True);
            yield return null;
            ClickButton("StartBattle");
            yield return null;

            root.Session.Tick(2.1);
            for (int i = 0; i < 5; i++) yield return null;
            var attackFrame = Resources.Load<Sprite>("Art/Animation/cat_noodle_stretch/frame_04");
            Assert.That(GameObject.FindObjectsByType<Image>(FindObjectsSortMode.None)
                .Any(i => i.sprite == attackFrame), Is.True, "The attacking cat should leave its idle frame.");
            var effect = GameObject.Find("EnemyEffect").GetComponent<Image>();
            Assert.That(effect.enabled, Is.True);
            Assert.That(effect.sprite, Is.Not.Null, "The battle event should display a claw impact frame.");
        }

        [UnityTest]
        public IEnumerator StandaloneInputModuleRaycastsAndRoutesMouseClickToShopButton()
        {
            CreateRoot(makeBattlesFast: true);
            yield return null;

            var buttonObject = GameObject.Find("Buy_0");
            Assert.That(buttonObject, Is.Not.Null);
            var button = buttonObject.GetComponent<Button>();
            Assert.That(button, Is.Not.Null);
            Assert.That(button.interactable, Is.True);
            var rect = buttonObject.GetComponent<RectTransform>();
            Vector2 center = RectTransformUtility.WorldToScreenPoint(null, rect.TransformPoint(rect.rect.center));
            var data = new PointerEventData(EventSystem.current) { position = center };
            var results = new List<RaycastResult>();
            EventSystem.current.RaycastAll(data, results);
            Assert.That(results.Count, Is.GreaterThan(0));
            Assert.That(ExecuteEvents.GetEventHandler<IPointerClickHandler>(results[0].gameObject), Is.SameAs(buttonObject),
                "The top raycast target must route to the visible Buy_0 Button.");

            var module = EventSystem.current.GetComponent<StandaloneInputModule>();
            Assert.That(module, Is.Not.Null);
            inputObject = new GameObject("PlayModeInjectedBaseInput");
            var input = inputObject.AddComponent<InjectedBaseInput>();
            input.Set(center, false, false, false);
            module.inputOverride = input;
            yield return null;

            input.Set(center, true, false, true);
            yield return null;
            input.Set(center, false, true, false);
            yield return null;
            input.Set(center, false, false, false);
            yield return null;

            Assert.That(root.Session.State.gold, Is.EqualTo(7),
                "StandaloneInputModule mouse down/up should drive the real Button event route and buy the feather.");
            Assert.That(root.Session.State.shelf[0], Is.Empty);
        }

        [UnityTest]
        public IEnumerator UiPointerEventsBuyDragStartAndAdvanceThroughAllFourStages()
        {
            CreateRoot(makeBattlesFast: true);
            yield return null;

            DragWaitingPieceToBoard(root, "Waiting_0", 1, 1);
            yield return null;
            var initialCat = root.Session.State.pieces.Find(p => p.instanceId == "0");
            Assert.That(initialCat.onBoard, Is.True, "The real drag must deploy the new-run cat before combat.");
            Assert.That(initialCat.x, Is.EqualTo(1));
            Assert.That(initialCat.y, Is.EqualTo(1));

            ClickButton("Buy_0");
            yield return null;
            Assert.That(root.Session.State.gold, Is.EqualTo(7));
            Assert.That(root.Session.State.pieces.Count, Is.EqualTo(2));

            DragWaitingPieceToBoard(root, "Waiting_1", 1, 0);
            yield return null;
            var feather = root.Session.State.pieces.Find(p => p.instanceId == "1");
            Assert.That(feather.onBoard, Is.True);
            Assert.That(feather.x, Is.EqualTo(1));
            Assert.That(feather.y, Is.EqualTo(0));
            Assert.That(SynergyRules.Resolve(root.Session.Definition, root.Session.State)[0].interval, Is.EqualTo(12500));

            for (int stage = 0; stage < 4; stage++)
            {
                if(stage==3)yield return AssertAdvancedShopLayout();
                ClickButton("StartBattle");
                yield return null;
                Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Battle));
                Assert.That(root.Session.State.stage, Is.EqualTo(stage));
                Assert.That(GameObject.Find("Buy_0"), Is.Null,
                    "Shop must collapse during battle at stage " + stage + ".");
                Assert.That(GameObject.Find("WaitingArea"), Is.Null);
                Assert.That(GameObject.Find("StartBattle"), Is.Null);
                Assert.That(GameObject.Find("BossStatus"), Is.Not.Null);
                Assert.That(GameObject.Find("FabricNest"), Is.Not.Null);
                Assert.That(GameObject.Find("Pause"), Is.Null);
                Assert.That(GameObject.Find("BattleSummary"), Is.Null);
                Assert.That(GameObject.Find("BattleTitle"), Is.Null);
                if(stage==1)
                {
                    Assert.That(GameObject.Find("ClockDial"), Is.Not.Null,
                        "The second-stage clock dial must remain visible in the enemy region.");
                        Assert.That(GameObject.Find("EnemyArt").GetComponent<Image>().sprite,
                            Is.SameAs(Resources.Load<Sprite>("Art/Animation/enemy_clock/frame_01")));
                    Assert.That(GameObject.Find("ClockDial"), Is.Not.Null,
                        "The second-stage clock face and hands remain beside the enemy intent.");
                }
                if(stage==2)
                {
                    Assert.That(GameObject.Find("EnemyArt").GetComponent<Image>().sprite,
                        Is.SameAs(Resources.Load<Sprite>("Art/Animation/enemy_wardrobe/frame_01")),
                        "The third stage must render the wardrobe nightmare.");
                }

                // The UI starts combat; deterministic time is advanced directly to keep the test short.
                root.Session.Tick(3.0);
                yield return null;
                Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Won));
                var resultOverlay=GameObject.Find("ResultOverlay");
                Assert.That(resultOverlay, Is.Not.Null);
                Assert.That(GameObject.Find("BossStatus"), Is.Not.Null,
                    "The battle remains as the dimmed settlement backdrop.");
                Assert.That(GameObject.Find("FabricNest"), Is.Not.Null);
                Assert.That(GameObject.Find("Next"), Is.Not.Null);
                Assert.That(GameObject.Find("Next").GetComponent<Button>().interactable, Is.True,
                    "The settlement action stays available above the retained battle screen.");
                var coveredControl=GameObject.Find("Speed").GetComponent<RectTransform>();
                var coveredPoint=RectTransformUtility.WorldToScreenPoint(null,coveredControl.TransformPoint(coveredControl.rect.center));
                var pointer=new PointerEventData(EventSystem.current){position=coveredPoint};
                var hits=new List<RaycastResult>();
                Canvas.ForceUpdateCanvases();
                EventSystem.current.RaycastAll(pointer,hits);
                var overlayImage=resultOverlay.GetComponent<Image>();
                var speedGraphic=coveredControl.GetComponent<Graphic>();
                var canvas=GameObject.Find("CatCanvas").GetComponent<Canvas>();
                var raycaster=canvas.GetComponent<GraphicRaycaster>();
                string raycastDiagnostic=string.Format(
                    "overlay active={0},enabled={1},raycast={2},cull={3},depth={4},bounds={5},path={6}; speed raycast={7},cull={8},depth={9},point={10},overlayContains={11}; canvas enabled={12},renderMode={13},raycaster={14}; hits={15}",
                    resultOverlay.activeInHierarchy,overlayImage.enabled,overlayImage.raycastTarget,overlayImage.canvasRenderer.cull,overlayImage.depth,
                    RectCorners(resultOverlay.GetComponent<RectTransform>()),TransformPath(resultOverlay.transform),
                    speedGraphic.raycastTarget,speedGraphic.canvasRenderer.cull,speedGraphic.depth,coveredPoint,
                    RectTransformUtility.RectangleContainsScreenPoint(resultOverlay.GetComponent<RectTransform>(),coveredPoint,null),
                    canvas.enabled,canvas.renderMode,raycaster.enabled,string.Join(",",hits.Select(hit=>hit.gameObject.name+"#"+(hit.gameObject.GetComponent<Graphic>()?.depth.ToString()??"no-graphic"))));
                Assert.That(hits.Count, Is.GreaterThan(0));
                Assert.That(hits[0].gameObject==resultOverlay || hits[0].gameObject.transform.IsChildOf(resultOverlay.transform), Is.True,
                    "The settlement overlay must intercept input meant for the underlying speed control. "+raycastDiagnostic);
                Assert.That(GameObject.Find("Buy_0"), Is.Null);
                Assert.That(GameObject.Find("WaitingArea"), Is.Null);

                ClickButton("Next");
                yield return null;
            }

            Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Complete));
            Assert.That(root.Session.State.stage, Is.EqualTo(3));
            Assert.That(root.Session.State.gold, Is.EqualTo(31));
            CollectionAssert.AreEquivalent(
                new[] { "win:0", "win:1", "win:2", "win:3" },
                root.Session.State.transactions);
            Assert.That(GameObject.Find("BattleTitle").GetComponent<Text>().text, Is.EqualTo("四夜守梦完成"));
            Assert.That(GameObject.Find("Menu").GetComponent<Button>().interactable, Is.True,
                "The completed run offers its current menu action.");
        }

        static IEnumerator AssertAdvancedShopLayout()
        {
            var expected = new[] { "锤锤", "枕头", "旧软垫" };
            for(int page=0;page<expected.Length;page++)
            {
                var card = GameObject.Find("Buy_"+page);
                Assert.That(card, Is.Not.Null, "Pagination exposes the selected item as a single action.");
                Assert.That(GameObject.Find("ItemName").GetComponent<Text>().text, Is.EqualTo(expected[page]));
                Assert.That(GameObject.Find("Buy_"+(page+1)), Is.Null, "Only the current product is shown at once.");
                var shop=GameObject.Find("ShopPanel").GetComponent<RectTransform>();
                var itemName=GameObject.Find("ItemName").GetComponent<RectTransform>();
                Assert.That(itemName.anchoredPosition.x+itemName.rect.width, Is.LessThanOrEqualTo(shop.rect.width));
                foreach(var text in GameObject.Find("ShopPanel").GetComponentsInChildren<Text>())
                    Assert.That(text.preferredHeight, Is.LessThanOrEqualTo(text.rectTransform.rect.height+1f), text.text);
                if(page<expected.Length-1)
                {
                    Assert.That(GameObject.Find("ShopNext"), Is.Not.Null);
                    ClickButton("ShopNext");
                    yield return null;
                    Canvas.ForceUpdateCanvases();
                }
            }
            ClickButton("ShopNext");
            yield return null;
            Assert.That(GameObject.Find("ItemName").GetComponent<Text>().text, Is.EqualTo(expected[0]),
                "The shop pager wraps to the first available product.");
        }

        static void AssertSeparated(string upperName, string lowerName)
        {
            var upper = GameObject.Find(upperName).GetComponent<RectTransform>();
            var lower = GameObject.Find(lowerName).GetComponent<RectTransform>();
            float upperBottom = -upper.anchoredPosition.y + upper.rect.height;
            float lowerTop = -lower.anchoredPosition.y;
            Assert.That(upperBottom, Is.LessThanOrEqualTo(lowerTop + .5f),
                upperName + " overlaps " + lowerName + " vertically.");
        }

        static void AssertContained(string innerName, string outerName)
        {
            var inner=GameObject.Find(innerName).GetComponent<RectTransform>();
            var outer=GameObject.Find(outerName).GetComponent<RectTransform>();
            Vector3[] a=new Vector3[4];Vector3[] b=new Vector3[4];
            inner.GetWorldCorners(a);outer.GetWorldCorners(b);
            Assert.That(a[0].x, Is.GreaterThanOrEqualTo(b[0].x), innerName+" exceeds the left edge of "+outerName);
            Assert.That(a[0].y, Is.GreaterThanOrEqualTo(b[0].y), innerName+" exceeds the bottom edge of "+outerName);
            Assert.That(a[2].x, Is.LessThanOrEqualTo(b[2].x), innerName+" exceeds the right edge of "+outerName);
            Assert.That(a[2].y, Is.LessThanOrEqualTo(b[2].y), innerName+" exceeds the top edge of "+outerName);
        }

        static string RectCorners(RectTransform rect)
        {
            var corners=new Vector3[4];rect.GetWorldCorners(corners);
            return string.Join("|",corners.Select(c=>string.Format("{0:0.0},{1:0.0}",c.x,c.y)));
        }

        static string TransformPath(Transform t)
        {
            var names=new List<string>();
            while(t!=null){names.Insert(0,t.name);t=t.parent;}
            return string.Join("/",names);
        }

        [UnityTest]
        public IEnumerator ManualPauseApplicationPauseAndFocusDoNotUnpauseEachOther()
        {
            CreateRoot(makeBattlesFast: false);
            yield return null;
            Assert.That(root.Session.Place("0", 1, 1), Is.True);
            yield return null;
            ClickButton("StartBattle");
            yield return null;
            Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Battle));

            root.SetManualPause(true);
            int pausedAt = root.Session.Combat.time;
            yield return new WaitForSecondsRealtime(0.08f);
            Assert.That(root.Session.Combat.time, Is.EqualTo(pausedAt));

            root.SendMessage("OnApplicationPause", true);
            root.SetManualPause(false);
            Assert.That(root.Paused, Is.True);
            root.SendMessage("OnApplicationPause", false);
            Assert.That(root.Paused, Is.False);

            root.SetManualPause(true);
            root.SendMessage("OnApplicationFocus", false);
            root.SetManualPause(false);
            Assert.That(root.Paused, Is.True);
            root.SendMessage("OnApplicationFocus", true);
            Assert.That(root.Paused, Is.False);

            int beforeResume = root.Session.Combat.time;
            yield return new WaitForSecondsRealtime(0.06f);
            Assert.That(root.Session.Combat.time, Is.GreaterThan(beforeResume));
        }

        [UnityTest]
        public IEnumerator SpeedAndManualPauseControlTheSameCombatClock()
        {
            CreateRoot(makeBattlesFast: false);
            yield return null;
            Assert.That(root.Session.Place("0", 1, 1), Is.True);
            yield return null;
            ClickButton("StartBattle");
            yield return null;
            Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Battle));
            Assert.That(GameObject.Find("Pause"), Is.Null);

            int normalStart=root.Session.Combat.time;
            yield return new WaitForSecondsRealtime(.2f);
            int normalAdvance=root.Session.Combat.time-normalStart;
            Assert.That(normalAdvance, Is.GreaterThan(0), "The combat clock advances at normal speed.");

            ClickButton("Speed");
            yield return null;
            Assert.That(root.BattleSpeed, Is.EqualTo(2));
            Assert.That(GameObject.Find("Speed").GetComponentInChildren<Text>().text, Is.EqualTo("×2"));
            int fastStart=root.Session.Combat.time;
            yield return new WaitForSecondsRealtime(.2f);
            int fastAdvance=root.Session.Combat.time-fastStart;
            Assert.That(fastAdvance, Is.GreaterThan(normalAdvance*1.4f), "The visible speed control doubles the same combat clock.");

            root.SetManualPause(true);
            yield return null;
            Assert.That(root.BattleDelta, Is.Zero);
            int pausedAt=root.Session.Combat.time;
            yield return new WaitForSecondsRealtime(.08f);
            Assert.That(root.Session.Combat.time, Is.EqualTo(pausedAt), "Pause freezes the clock even at double speed.");
        }

        [UnityTest]
        public IEnumerator MenuRestartCanCancelOrConfirmWithoutLosingTheWrongRun()
        {
            CreateRoot(makeBattlesFast: true);
            yield return null;
            var originalRun=root.Session.State.runId;
            int originalGold=root.Session.State.gold;
            Assert.That(GameObject.Find("NewRun"), Is.Null, "Restart is only available from the opened menu.");

            ClickButton("Menu");
            yield return null;
            Assert.That(root.Paused, Is.True);
            Assert.That(GameObject.Find("MenuOverlay"), Is.Not.Null);
            ClickButton("NewRun");
            yield return null;
            Assert.That(GameObject.Find("Modal"), Is.Not.Null);
            ClickButton("Cancel");
            yield return null;
            Assert.That(root.Paused, Is.False);
            Assert.That(root.Session.State.runId, Is.EqualTo(originalRun));
            Assert.That(root.Session.State.gold, Is.EqualTo(originalGold));
            Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Preparation));

            ClickButton("Menu");
            yield return null;
            ClickButton("NewRun");
            yield return null;
            ClickButton("Confirm");
            yield return null;
            Assert.That(root.Session.State.runId, Is.Not.EqualTo(originalRun));
            Assert.That(root.Session.State.stage, Is.EqualTo(0));
            Assert.That(root.Session.State.gold, Is.EqualTo(originalGold));
            Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Preparation));
            Assert.That(GameObject.Find("Modal"), Is.Null);
        }

        [UnityTest]
        public IEnumerator GoldRewardAdCancellationPreservesGoldAndConfirmationAwardsFour()
        {
            CreateRoot(makeBattlesFast: true);
            yield return null;
            int originalGold=root.Session.State.gold;

            ClickButton("GoldAd");
            yield return null;
            Assert.That(GameObject.Find("Modal"), Is.Not.Null);
            ClickButton("Cancel");
            yield return null;
            Assert.That(root.Session.State.gold, Is.EqualTo(originalGold));
            Assert.That(root.Session.State.goldAdUsed, Is.False);

            ClickButton("GoldAd");
            yield return null;
            ClickButton("Confirm");
            yield return null;
            Assert.That(root.Session.State.gold, Is.EqualTo(originalGold+4));
            Assert.That(root.Session.State.goldAdUsed, Is.True);
            Assert.That(GameObject.Find("GoldAd"), Is.Null);
        }

        void CreateRoot(bool makeBattlesFast)
        {
            var source = Resources.Load<GameContent>("GameContent");
            Assert.That(source, Is.Not.Null, "DemoSetup.Create must create Resources/GameContent.asset first.");
            testContent = ScriptableObject.CreateInstance<GameContent>();
            testContent.definition = source.CreateRuntimeDefinition();
            testContent.font = source.font;
            testContent.visuals = source.visuals;
            if (makeBattlesFast)
            {
                foreach (var stage in testContent.definition.stages)
                {
                    stage.enemyHP = 1;
                    stage.enemyDamage = 0;
                    stage.enemyIntervalTicks = 300000;
                    stage.limitTicks = 250000;
                }
            }
            rootObject = new GameObject("PlayModeTestGameRoot");
            root = rootObject.AddComponent<GameRoot>();
            root.UseSave = false;
            root.Initialize(testContent, null);
        }

        static void ClickButton(string name)
        {
            var go = GameObject.Find(name);
            Assert.That(go, Is.Not.Null, "Missing UI button: " + name);
            var button = go.GetComponent<Button>();
            Assert.That(button, Is.Not.Null);
            Assert.That(button.interactable, Is.True, "Disabled UI button: " + name);
            var eventSystem = EventSystem.current;
            Assert.That(eventSystem, Is.Not.Null);
            var data = new PointerEventData(eventSystem)
            {
                button = PointerEventData.InputButton.Left,
                clickCount = 1
            };
            Assert.That(ExecuteEvents.Execute(go, data, ExecuteEvents.pointerClickHandler), Is.True);
        }

        static void DragWaitingPieceToBoard(GameRoot root, string waitingObjectName, int targetX, int targetY)
        {
            var tile = GameObject.Find(waitingObjectName);
            Assert.That(tile, Is.Not.Null, "Missing waiting-area piece: " + waitingObjectName);
            Assert.That(tile.GetComponent<PiecePointer>(), Is.Not.Null);
            var boardObject = GameObject.Find("Board");
            Assert.That(boardObject, Is.Not.Null);
            var board = boardObject.GetComponent<RectTransform>();
            var eventSystem = EventSystem.current;
            Assert.That(eventSystem, Is.Not.Null);
            var piece=root.Session.State.pieces.Single(p=>p.instanceId==waitingObjectName.Substring("Waiting_".Length));
            var shape=BoardRules.Shape(root.Session.Definition.Piece(piece.definitionId),piece.pose,piece.rotation);
            int grabX=shape.Max(c=>c.x)/2,grabY=shape.Max(c=>c.y)/2;
            float cell = board.rect.width / root.Session.State.boardSize;
            Vector3 world = board.TransformPoint(new Vector3((targetX + grabX + .5f) * cell, -(targetY + grabY + .5f) * cell, 0));
            Vector2 screen = RectTransformUtility.WorldToScreenPoint(null, world);
            var data = new PointerEventData(eventSystem)
            {
                button = PointerEventData.InputButton.Left,
                pointerId = -1,
                position = screen
            };
            Assert.That(ExecuteEvents.Execute(tile, data, ExecuteEvents.beginDragHandler), Is.True);
            Assert.That(ExecuteEvents.Execute(tile, data, ExecuteEvents.dragHandler), Is.True);
            Assert.That(ExecuteEvents.Execute(tile, data, ExecuteEvents.endDragHandler), Is.True);
        }

        sealed class InjectedBaseInput : BaseInput
        {
            Vector2 position;
            bool down, up, held;

            public override Vector2 mousePosition => position;
            public override bool mousePresent => true;
            public override bool touchSupported => false;
            public override int touchCount => 0;
            public override float GetAxisRaw(string axisName) => 0;
            public override bool GetButtonDown(string buttonName) => false;
            public override bool GetMouseButtonDown(int button) => button == 0 && down;
            public override bool GetMouseButtonUp(int button) => button == 0 && up;
            public override bool GetMouseButton(int button) => button == 0 && held;

            public void Set(Vector2 screenPosition, bool pressedThisFrame, bool releasedThisFrame, bool isHeld)
            {
                position = screenPosition;
                down = pressedThisFrame;
                up = releasedThisFrame;
                held = isHeld;
            }
        }
    }
}
