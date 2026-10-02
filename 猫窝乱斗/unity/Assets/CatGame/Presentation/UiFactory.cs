using UnityEngine;
using UnityEngine.UI;
using CatGame.Runtime;
namespace CatGame.Presentation
{
    public sealed class UiFactory
    {
        public readonly Font font;
        readonly Font boldFont;
        public Font BoldFont=>boldFont;
        public static readonly Color Panel = PaperUi.Cream;
        public static readonly Color Cell = new Color(.90f,.88f,.81f);
        public static readonly Color Selected = PaperUi.Amber;
        public static readonly Color Connected = PaperUi.Blue;
        public UiFactory(Font font,GameContent content){this.font=Resources.Load<Font>("Fonts/CatUI-Medium")??font;boldFont=Resources.Load<Font>("Fonts/CatUI-Bold")??this.font;}
        public RectTransform Box(Transform parent,string name,float x,float y,float w,float h,Color color)
        {
            var go=new GameObject(name,typeof(RectTransform),typeof(Image));go.transform.SetParent(parent,false);
            var r=(RectTransform)go.transform;r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);r.anchoredPosition=new Vector2(x,-y);r.sizeDelta=new Vector2(w,h);
            var image=go.GetComponent<Image>();image.color=color;
            PaperUi.StylePanel(r,name,color);
            return r;
        }
        public Text Text(Transform parent,string name,string value,float x,float y,float w,float h,int size=18,TextAnchor align=TextAnchor.MiddleLeft)
        {
            var go=new GameObject(name,typeof(RectTransform),typeof(Text));go.transform.SetParent(parent,false);
            var r=(RectTransform)go.transform;r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);r.anchoredPosition=new Vector2(x,-y);r.sizeDelta=new Vector2(w,h);
            var t=go.GetComponent<Text>();t.font=font;t.text=value;t.fontSize=size;t.color=PaperUi.Ink;t.fontStyle=FontStyle.Normal;t.alignment=align;t.raycastTarget=false;t.horizontalOverflow=HorizontalWrapMode.Wrap;t.verticalOverflow=VerticalWrapMode.Overflow;
            if(name=="Title"||name=="BattleTitle"||name=="Complete")t.font=boldFont;
            return t;
        }
        public Button Button(Transform parent,string name,string value,float x,float y,float w,float h,UnityEngine.Events.UnityAction action,bool enabled=true,bool shop=false)
        {
            bool primary=name=="StartBattle"||name=="Next"||name=="Confirm";
            int labelSize=primary?20:w<80?16:18;
            if(shop)
            {
                var card=Box(parent,name,x,y,w,h,Panel);
                var button=card.gameObject.AddComponent<Button>();button.targetGraphic=card.GetComponent<Image>();
                var cardColors=button.colors;cardColors.normalColor=Color.white;cardColors.highlightedColor=Color.white;
                cardColors.pressedColor=PaperUi.Sand;cardColors.selectedColor=PaperUi.Amber;cardColors.disabledColor=new Color(.84f,.84f,.82f);button.colors=cardColors;
                Text(card,"Label",value,7,2,w-14,h-4,18,TextAnchor.MiddleCenter);
                button.onClick.AddListener(action);button.interactable=enabled;return button;
            }
            if(PaperUi.Strip!=null)
            {
                var hit=Box(parent,name,x,y,w,h,Color.clear);
                var rear=PaperUi.Layer(hit,"PaperBack",PaperUi.Strip,3,3,w-3,h-3,primary?PaperUi.Ochre:shop?PaperUi.Sand:PaperUi.BlueBack);
                var front=PaperUi.Layer(hit,"PaperFront",PaperUi.Strip,0,0,w-3,h-3,primary?PaperUi.Amber:shop?PaperUi.Cream:PaperUi.Blue);
                var paperButton=hit.gameObject.AddComponent<PaperButton>();paperButton.targetGraphic=hit.GetComponent<Image>();
                paperButton.Configure(front,rear,front.color,rear.color);
                var paperLabel=Text(front.transform,"Label",value,7,2,w-17,h-7,labelSize,TextAnchor.MiddleCenter);
                if(primary)paperLabel.font=boldFont;
                paperButton.onClick.AddListener(action);paperButton.interactable=enabled;
                return paperButton;
            }
            var r=Box(parent,name,x,y,w,h,Color.white);var image=r.GetComponent<Image>();
            var b=r.gameObject.AddComponent<Button>();b.targetGraphic=image;b.transition=Selectable.Transition.ColorTint;
            var colors=b.colors;
            colors.normalColor=primary?new Color(.27f,.52f,.45f):shop?Panel:new Color(.83f,.86f,.83f);
            colors.highlightedColor=primary?new Color(.32f,.60f,.51f):new Color(.92f,.94f,.89f);
            colors.pressedColor=primary?new Color(.18f,.38f,.32f):new Color(.65f,.73f,.69f);
            colors.selectedColor=colors.normalColor;colors.disabledColor=new Color(.78f,.79f,.76f);
            colors.fadeDuration=.08f;b.colors=colors;
            b.onClick.AddListener(action);b.interactable=enabled;
            var label=Text(r,"Label",value,7,2,w-14,h-4,labelSize,TextAnchor.MiddleCenter);
            if(primary)label.color=Color.white;
            // Single-skin trial; other controls keep their programmatic appearance.
            if(name=="StartBattle"||name=="Next")
            {
                var paper=Resources.Load<Sprite>("UiTrial/b_paper_primary");
                if(paper!=null)
                {
                    image.sprite=paper;image.type=Image.Type.Sliced;
                    colors.normalColor=colors.highlightedColor=colors.selectedColor=Color.white;
                    // Temporary input feedback, not the final layered-paper pressed state.
                    colors.pressedColor=new Color(.9f,.9f,.9f);
                    colors.disabledColor=new Color(.65f,.65f,.65f);
                    b.colors=colors;
                    label.color=new Color(.24f,.13f,.07f);
                }
            }
            return b;
        }
    }
}
