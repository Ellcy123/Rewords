using UnityEngine;
using UnityEngine.UI;

namespace CatGame.Presentation
{
    public static class PaperUi
    {
        public static readonly Color Cream=Rgb(0xF3ECD9),Sand=Rgb(0xD8C8A8),Amber=Rgb(0xF2C35D),Ochre=Rgb(0xC9823E);
        public static readonly Color Blue=Rgb(0xB8CCD0),BlueBack=Rgb(0x6F8F99),Ink=Rgb(0x3E3029),Disabled=Rgb(0xCDCBC4);
        public static readonly Color Positive=Rgb(0x79A28D),Danger=Rgb(0xBA5D50);
        static Sprite strip,panel;
        static Color Rgb(int v)=>new Color(((v>>16)&255)/255f,((v>>8)&255)/255f,(v&255)/255f);
        public static Sprite Strip=>strip!=null?strip:strip=Resources.Load<Sprite>("PaperUi/paper_strip");
        public static Sprite Panel=>panel!=null?panel:panel=Resources.Load<Sprite>("PaperUi/paper_panel");

        public static Image Layer(Transform parent,string name,Sprite sprite,float x,float y,float width,float height,Color color)
        {
            var go=new GameObject(name,typeof(RectTransform),typeof(Image));go.transform.SetParent(parent,false);
            var r=(RectTransform)go.transform;r.anchorMin=r.anchorMax=r.pivot=new Vector2(0,1);
            r.anchoredPosition=new Vector2(x,-y);r.sizeDelta=new Vector2(width,height);
            var image=go.GetComponent<Image>();image.sprite=sprite;image.type=Image.Type.Sliced;image.color=color;image.raycastTarget=false;
            return image;
        }

        public static void StylePanel(RectTransform r,string name,Color requested)
        {
            bool large=name=="PromptPanel"||name=="BattleSummary";
            bool tile=name.StartsWith("Waiting_");
            bool info=name=="HeaderPanel"||name=="EnemyLabel"||name=="SelectionPanel"||name=="HintPanel"||name=="WaitingArea"||name=="ShopHeading"||name=="BattleStatus";
            if(info||tile)
            {
                // Information stays flat; only actionable buttons have raised paper layers.
                var flat=r.GetComponent<Image>();flat.sprite=null;flat.color=requested;
                if(!tile)flat.raycastTarget=false;
                return;
            }
            if(!large)return;
            var sprite=large?Panel:Strip;if(sprite==null)return;
            bool selected=tile&&requested==UiFactory.Selected;
            var baseImage=r.GetComponent<Image>();baseImage.sprite=sprite;baseImage.type=Image.Type.Sliced;baseImage.color=selected?Amber:Sand;
            float inset=selected?3:1;
            Layer(r,"PaperSurface",sprite,inset,0,r.sizeDelta.x-inset-1,r.sizeDelta.y-2,Cream);
        }
    }

    // Root keeps a stationary full-size hit rectangle. Only front paper and its contents move.
    public sealed class PaperButton : Button
    {
        Image face,back;
        Color faceColor,backColor;
        public RectTransform Content { get; private set; }
        public void Configure(Image front,Image rear,Color frontColor,Color rearColor)
        {
            face=front;back=rear;Content=front.rectTransform;faceColor=frontColor;backColor=rearColor;
            transition=Transition.None;DoStateTransition(currentSelectionState,true);
        }
        protected override void DoStateTransition(SelectionState state,bool instant)
        {
            base.DoStateTransition(state,instant);
            if(face==null||back==null)return;
            bool disabled=state==SelectionState.Disabled;
            bool pressed=state==SelectionState.Pressed;
            Content.anchoredPosition=pressed?new Vector2(2,-2):disabled?new Vector2(1,-1):Vector2.zero;
            face.color=disabled?PaperUi.Disabled:faceColor;
            back.color=disabled?PaperUi.Sand:state==SelectionState.Selected?PaperUi.Amber:backColor;
        }
    }
}
