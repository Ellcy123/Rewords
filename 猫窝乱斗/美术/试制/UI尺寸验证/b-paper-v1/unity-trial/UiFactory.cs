using UnityEngine;
using UnityEngine.UI;
using CatGame.Runtime;
namespace CatGame.Presentation
{
    public sealed class UiFactory
    {
        public readonly Font font;
        public static readonly Color Panel = new Color(.96f,.95f,.90f);
        public static readonly Color Cell = new Color(.90f,.88f,.81f);
        public static readonly Color Selected = new Color(.95f,.76f,.36f);
        public static readonly Color Connected = new Color(.57f,.80f,.72f);
        public UiFactory(Font font,GameContent content){this.font=font;}
        public RectTransform Box(Transform parent,string name,float x,float y,float w,float h,Color color)
        {
            var go=new GameObject(name,typeof(RectTransform),typeof(Image));go.transform.SetParent(parent,false);
            var r=(RectTransform)go.transform;r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);r.anchoredPosition=new Vector2(x,-y);r.sizeDelta=new Vector2(w,h);
            var image=go.GetComponent<Image>();image.color=color;
            return r;
        }
        public Text Text(Transform parent,string name,string value,float x,float y,float w,float h,int size=18,TextAnchor align=TextAnchor.MiddleLeft)
        {
            var go=new GameObject(name,typeof(RectTransform),typeof(Text));go.transform.SetParent(parent,false);
            var r=(RectTransform)go.transform;r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);r.anchoredPosition=new Vector2(x,-y);r.sizeDelta=new Vector2(w,h);
            var t=go.GetComponent<Text>();t.font=font;t.text=value;t.fontSize=size;t.color=new Color(.12f,.16f,.17f);t.fontStyle=FontStyle.Bold;t.alignment=align;t.raycastTarget=false;t.horizontalOverflow=HorizontalWrapMode.Wrap;t.verticalOverflow=VerticalWrapMode.Overflow;return t;
        }
        public Button Button(Transform parent,string name,string value,float x,float y,float w,float h,UnityEngine.Events.UnityAction action,bool enabled=true,bool shop=false)
        {
            bool primary=name=="StartBattle"||name=="Next"||name=="Confirm";
            var r=Box(parent,name,x,y,w,h,Color.white);var image=r.GetComponent<Image>();
            var b=r.gameObject.AddComponent<Button>();b.targetGraphic=image;b.transition=Selectable.Transition.ColorTint;
            var colors=b.colors;
            colors.normalColor=primary?new Color(.27f,.52f,.45f):shop?Panel:new Color(.83f,.86f,.83f);
            colors.highlightedColor=primary?new Color(.32f,.60f,.51f):new Color(.92f,.94f,.89f);
            colors.pressedColor=primary?new Color(.18f,.38f,.32f):new Color(.65f,.73f,.69f);
            colors.selectedColor=colors.normalColor;colors.disabledColor=new Color(.78f,.79f,.76f);
            colors.fadeDuration=.08f;b.colors=colors;
            b.onClick.AddListener(action);b.interactable=enabled;
            var label=Text(r,"Label",value,7,2,w-14,h-4,16,TextAnchor.MiddleCenter);
            if(primary)label.color=Color.white;
            // Isolated normal-state art trial: gameplay and hit rectangle are unchanged.
            if(name=="StartBattle"||name=="Next")
            {
                var paper=Resources.Load<Sprite>("UiTrial/b_paper_primary");
                if(paper!=null)
                {
                    image.sprite=paper;image.type=Image.Type.Sliced;
                    b.transition=Selectable.Transition.None;image.color=Color.white;
                    label.color=new Color(.24f,.13f,.07f);
                }
            }
            return b;
        }
    }
}
