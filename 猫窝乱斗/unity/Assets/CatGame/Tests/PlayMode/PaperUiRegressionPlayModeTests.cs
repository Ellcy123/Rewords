using System.Collections;
using System.IO;
using System.Linq;
using System.Text;
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
    public sealed class PaperUiRegressionPlayModeTests
    {
        GameObject rootObject;
        GameContent content;
        GameRoot root;

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (rootObject != null) Object.Destroy(rootObject);
            if (content != null) Object.Destroy(content);
            yield return null;
        }

        [UnityTest]
        public IEnumerator StaticUiFontsHaveTheRequested500And700Weights()
        {
            CreateRoot();
            yield return null;

            var medium=Resources.Load<Font>("Fonts/CatUI-Medium");
            var bold=Resources.Load<Font>("Fonts/CatUI-Bold");
            Assert.That(medium, Is.Not.Null);
            Assert.That(bold, Is.Not.Null);
            Assert.That(medium, Is.Not.SameAs(bold));
            Assert.That(Os2Weight("CatUI-Medium.ttf"), Is.EqualTo(500));
            Assert.That(Os2Weight("CatUI-Bold.ttf"), Is.EqualTo(700));
            Assert.That(HasTable("CatUI-Medium.ttf", "fvar"), Is.False, "Medium must be a static font file.");
            Assert.That(HasTable("CatUI-Bold.ttf", "fvar"), Is.False, "Bold must be a static font file.");

            var title=GameObject.Find("Title").GetComponent<Text>();
            var primary=GameObject.Find("StartBattle/PaperFront/Label").GetComponent<Text>();
            var body=GameObject.Find("Hint").GetComponent<Text>();
            Assert.That(title.font, Is.SameAs(bold));
            Assert.That(primary.font, Is.SameAs(bold));
            Assert.That(title.fontStyle, Is.EqualTo(FontStyle.Normal));
            Assert.That(primary.fontStyle, Is.EqualTo(FontStyle.Normal));
            Assert.That(body.font, Is.SameAs(medium));
            Assert.That(body.fontStyle, Is.EqualTo(FontStyle.Normal));
        }

        [UnityTest]
        public IEnumerator InformationStaysFlatAndShopCardsAdaptToActualInventory()
        {
            CreateRoot();
            yield return null;
            Canvas.ForceUpdateCanvases();

            Assert.That(PaperUi.Strip, Is.Not.Null);
            Assert.That(PaperUi.Panel, Is.Not.Null);
            Assert.That(PaperUi.Strip.border, Is.EqualTo(new Vector4(36, 16, 36, 16)));
            Assert.That(PaperUi.Panel.border, Is.EqualTo(new Vector4(64, 32, 40, 48)));
            Assert.That(HasRealAlpha("PaperUi/paper_strip.png"), Is.True);
            Assert.That(HasRealAlpha("PaperUi/paper_panel.png"), Is.True);

            var canvas=GameObject.Find("CatCanvas").GetComponent<Canvas>();
            Assert.That(canvas.pixelPerfect, Is.True);
            foreach(string name in new[]{"PrepHeader","ShopPanel"})
            {
                var panel=GameObject.Find(name);
                Assert.That(panel, Is.Not.Null, "The current preparation layout includes "+name+".");
                Assert.That(panel.GetComponent<Image>().sprite, Is.Null, name+" is flat information, not a button or paper panel.");
                Assert.That(panel.GetComponent<Image>().raycastTarget, Is.False);
                Assert.That(panel.transform.Find("PaperSurface"), Is.Null);
                Assert.That(panel.GetComponent<Button>(), Is.Null);
            }
            foreach(string name in new[]{"Opponent","Title","PrepTitle","ShopTitle","ShopGold","BoardHeading","ConnectionHint","Hint"})
            {
                var info=GameObject.Find(name);
                Assert.That(info, Is.Not.Null, "Missing visible information: "+name);
                Assert.That(info.GetComponent<Text>().raycastTarget, Is.False, name+" must not intercept input.");
                Assert.That(info.GetComponent<Button>(), Is.Null, name+" is information, not an action.");
            }

            var card=GameObject.Find("Buy_0");
            Assert.That(card, Is.Not.Null);
            Assert.That(card.GetComponent<Button>(), Is.Not.Null);
            Assert.That(card.GetComponent<PaperButton>(), Is.Not.Null, "Product purchase uses the current paper-button treatment.");
            Assert.That(card.transform.Find("PaperFront"), Is.Not.Null);
            Assert.That(GameObject.Find("Buy_1"), Is.Null, "Empty stock slots are hidden.");
            Assert.That(GameObject.Find("Buy_2"), Is.Null);
            var cardRect=card.GetComponent<RectTransform>();
            Assert.That(cardRect.rect.width, Is.GreaterThan(164), "One item should get a wider card than a three-item shelf.");
            Assert.That(cardRect.rect.width, Is.LessThan(504));
            Assert.That(cardRect.anchoredPosition.x, Is.GreaterThan(0));
            Assert.That(cardRect.anchoredPosition.x+cardRect.rect.width, Is.LessThanOrEqualTo(GameObject.Find("ShopPanel").GetComponent<RectTransform>().rect.width));
            var art=GameObject.Find("ItemArt").GetComponent<RectTransform>();
            var itemName=GameObject.Find("ItemName").GetComponent<Text>();
            var description=GameObject.Find("ItemDescription").GetComponent<Text>();
            Assert.That(itemName.text, Is.EqualTo("羽毛逗猫棒"));
            Assert.That(itemName.rectTransform.anchoredPosition.x, Is.GreaterThan(art.anchoredPosition.x));
            Assert.That(description.text, Is.Not.Empty);
            AssertTextsFit(rootObject);

            root.Session.State.shelf=new System.Collections.Generic.List<string>{"feather","bell","mouse"};
            root.ShopPage=0;
            root.Repaint();
            yield return null;
            Canvas.ForceUpdateCanvases();
            var expectedProducts=new[]{"feather","bell","mouse"};
            for(int page=0;page<expectedProducts.Length;page++)
            {
                Assert.That(GameObject.Find("Buy_"+page), Is.Not.Null, "The selected shelf item has a purchase action.");
                Assert.That(GameObject.Find("Buy_"+(page+1)), Is.Null, "Only the selected inventory page is visible.");
                Assert.That(GameObject.Find("ItemName").GetComponent<Text>().text,
                    Is.EqualTo(root.Session.Definition.Piece(expectedProducts[page]).displayName));
                Assert.That(GameObject.Find("ShopNext"), Is.Not.Null);
                AssertTextsFit(rootObject);
                GameObject.Find("ShopNext").GetComponent<Button>().onClick.Invoke();
                yield return null;
                Canvas.ForceUpdateCanvases();
            }
            Assert.That(GameObject.Find("ItemName").GetComponent<Text>().text, Is.EqualTo("羽毛逗猫棒"),
                "Shop pagination wraps to the first stocked product.");

            root.Session.State.shelf=new System.Collections.Generic.List<string>{"feather","",""};
            root.ShopPage=0;
            root.Repaint();
            yield return null;
            GameObject.Find("Buy_0").GetComponent<Button>().onClick.Invoke();
            yield return null;
            Canvas.ForceUpdateCanvases();
            Assert.That(GameObject.Find("WaitingArea"), Is.Not.Null);
            Assert.That(GameObject.Find("Buy_0"), Is.Null, "Purchased stock is removed from the current page.");
            Assert.That(GameObject.Find("ShopEmpty"), Is.Not.Null);
            var waiting=GameObject.Find("WaitingArea").GetComponent<RectTransform>();
            var board=GameObject.Find("Board").GetComponent<RectTransform>();
            float boardBottom=-board.anchoredPosition.y+board.rect.height;
            float waitingTop=-waiting.anchoredPosition.y;
            Assert.That(boardBottom, Is.LessThanOrEqualTo(waitingTop+.5f), "The waiting row stays below the preparation board.");
            Assert.That(waiting.rect.width, Is.LessThanOrEqualTo(GameObject.Find("PortraitFrame").GetComponent<RectTransform>().rect.width));
            var waitingTile=GameObject.Find("Waiting_1");
            Assert.That(waitingTile, Is.Not.Null);
            Assert.That(GameObject.Find("Waiting_0"), Is.Not.Null, "The initial cat remains in the waiting tray until deployed.");
            var waitingName=waitingTile.transform.Find("Name").GetComponent<Text>();
            var waitingArtImage=waitingTile.transform.Find("Art").GetComponent<RectTransform>();
            Assert.That(waitingName.fontSize, Is.EqualTo(Mathf.RoundToInt(14*540f/390f)));
            Assert.That(waitingName.rectTransform.anchoredPosition.x, Is.GreaterThan(waitingArtImage.anchoredPosition.x+waitingArtImage.rect.width));
            Assert.That(waitingName.preferredHeight, Is.LessThanOrEqualTo(waitingName.rectTransform.rect.height+1f));
            AssertTextsFit(rootObject);

            root.Session.Definition.Piece("noodle").description=new string('猫',40);
            root.SelectPiece("0");
            yield return null;
            Canvas.ForceUpdateCanvases();
            var detail=GameObject.Find("SelectionDrawer/SelectionDescription").GetComponent<Text>();
            Assert.That(detail.fontSize, Is.EqualTo(Mathf.RoundToInt(13*540f/390f)));
            Assert.That(detail.preferredHeight, Is.GreaterThan(20), "The fixture should wrap onto multiple lines.");
            Assert.That(detail.preferredHeight, Is.LessThanOrEqualTo(detail.rectTransform.rect.height+1f), "The expanded description and drawer must fit the text.");
            Assert.That(GameObject.Find("SelectionDrawer/Rotate"), Is.Not.Null);
            Assert.That(GameObject.Find("SelectionDrawer/CloseSelection"), Is.Not.Null);
            AssertTextsFit(rootObject);
        }

        [UnityTest]
        public IEnumerator PaperButtonKeepsClickAndPressStateWhileDisabledAndDialogsKeepPaperSurface()
        {
            CreateRoot();
            yield return null;
            Canvas.ForceUpdateCanvases();

            Assert.That(root.Session.Place("0",1,1),Is.True);
            yield return null;

            var active=GameObject.Find("StartBattle");
            var button=active.GetComponent<PaperButton>();
            var face=active.transform.Find("PaperFront").GetComponent<Image>();
            var back=active.transform.Find("PaperBack").GetComponent<Image>();
            var contentRect=button.Content;
            var hitRect=active.GetComponent<RectTransform>();
            Vector2 fixedHitSize=hitRect.sizeDelta;
            Assert.That(face.raycastTarget, Is.False);
            Assert.That(back.raycastTarget, Is.False);
            Assert.That(active.GetComponent<Image>().raycastTarget, Is.True);
            Assert.That(button.transition, Is.EqualTo(Selectable.Transition.None));

            EventSystem.current.SetSelectedGameObject(active);
            Assert.That(back.color, Is.EqualTo(PaperUi.Amber));
            EventSystem.current.SetSelectedGameObject(null);
            Assert.That(back.color, Is.EqualTo(PaperUi.Ochre));

            int clicks=0;
            button.onClick.AddListener(()=>clicks++);
            var pointer=new PointerEventData(EventSystem.current)
            {
                button=PointerEventData.InputButton.Left,
                pointerId=-1,
                clickCount=1,
                position=RectTransformUtility.WorldToScreenPoint(null,active.transform.position)
            };
            button.interactable=false;
            Assert.That(contentRect.anchoredPosition, Is.EqualTo(new Vector2(1,-1)));
            Assert.That(face.color, Is.EqualTo(PaperUi.Disabled));
            ExecuteEvents.Execute(active,pointer,ExecuteEvents.pointerDownHandler);
            ExecuteEvents.Execute(active,pointer,ExecuteEvents.pointerUpHandler);
            ExecuteEvents.Execute(active,pointer,ExecuteEvents.pointerClickHandler);
            Assert.That(clicks, Is.Zero, "Disabled primary controls cannot trigger actions.");
            button.interactable=true;
            Assert.That(contentRect.anchoredPosition, Is.EqualTo(Vector2.zero));

            ExecuteEvents.Execute(active,pointer,ExecuteEvents.pointerEnterHandler);
            ExecuteEvents.Execute(active,pointer,ExecuteEvents.pointerDownHandler);
            Assert.That(contentRect.anchoredPosition, Is.EqualTo(new Vector2(2,-2)));
            Assert.That(hitRect.sizeDelta, Is.EqualTo(fixedHitSize));
            Assert.That(clicks, Is.Zero);
            ExecuteEvents.Execute(active,pointer,ExecuteEvents.pointerUpHandler);
            Assert.That(contentRect.anchoredPosition, Is.EqualTo(Vector2.zero));
            ExecuteEvents.Execute(active,pointer,ExecuteEvents.pointerClickHandler);
            Assert.That(clicks, Is.EqualTo(1));
            Assert.That(root.Session.State.phase, Is.EqualTo(Phase.Battle));

            root.Session.NewRun();
            yield return null;
            ClickButton("Menu");
            yield return null;
            ClickButton("NewRun");
            yield return null;
            var prompt=GameObject.Find("PromptPanel");
            var surface=prompt.transform.Find("PaperSurface").GetComponent<Image>();
            Assert.That(surface.sprite, Is.SameAs(PaperUi.Panel));
            Assert.That(surface.type, Is.EqualTo(Image.Type.Sliced));
        }

        static void ClickButton(string name)
        {
            var go=GameObject.Find(name);
            Assert.That(go, Is.Not.Null, "Missing button "+name);
            var button=go.GetComponent<Button>();
            Assert.That(button, Is.Not.Null);
            Assert.That(button.interactable, Is.True);
            button.onClick.Invoke();
        }

        static bool HasRealAlpha(string resourcePath)
        {
            var fullPath=Path.Combine(Application.dataPath,"CatGame/Resources",resourcePath);
            var image=new Texture2D(2,2,TextureFormat.RGBA32,false);
            try
            {
                Assert.That(image.LoadImage(File.ReadAllBytes(fullPath)),Is.True,fullPath);
                var pixels=image.GetPixels32();
                return pixels.Any(p=>p.a==0)&&pixels.Any(p=>p.a>0);
            }
            finally { Object.Destroy(image); }
        }

        static void AssertTextsFit(GameObject root)
        {
            foreach(var text in root.GetComponentsInChildren<Text>())
                Assert.That(text.preferredHeight, Is.LessThanOrEqualTo(text.rectTransform.rect.height+1f), text.name+" text fit");
        }

        static ushort ReadU16(byte[] data,int offset)=>(ushort)((data[offset]<<8)|data[offset+1]);
        static uint ReadU32(byte[] data,int offset)=>((uint)data[offset]<<24)|((uint)data[offset+1]<<16)|((uint)data[offset+2]<<8)|data[offset+3];
        static string FontPath(string name)=>Path.Combine(Application.dataPath,"CatGame/Resources/Fonts",name);
        static (ushort weight,bool fvar) FontMetadata(string name)
        {
            var data=File.ReadAllBytes(FontPath(name));
            int tableCount=ReadU16(data,4);ushort weight=0;bool fvar=false;
            for(int i=0;i<tableCount;i++)
            {
                int entry=12+i*16;string tag=Encoding.ASCII.GetString(data,entry,4);
                int offset=checked((int)ReadU32(data,entry+8));
                if(tag=="fvar")fvar=true;
                if(tag=="OS/2")weight=ReadU16(data,offset+4);
            }
            return (weight,fvar);
        }
        static ushort Os2Weight(string name)=>FontMetadata(name).weight;
        static bool HasTable(string name,string table)=>FontMetadata(name).fvar;

        void CreateRoot()
        {
            var source=Resources.Load<GameContent>("GameContent");
            Assert.That(source,Is.Not.Null);
            content=ScriptableObject.CreateInstance<GameContent>();
            content.definition=source.CreateRuntimeDefinition();
            content.font=source.font;
            content.visuals=source.visuals;
            foreach(var stage in content.definition.stages)
            {
                stage.enemyHP=1;
                stage.enemyDamage=0;
                stage.enemyIntervalTicks=300000;
                stage.limitTicks=250000;
            }
            rootObject=new GameObject("PaperUiPlayModeTestRoot");
            root=rootObject.AddComponent<GameRoot>();
            root.UseSave=false;
            root.Initialize(content,null);
        }
    }
}
