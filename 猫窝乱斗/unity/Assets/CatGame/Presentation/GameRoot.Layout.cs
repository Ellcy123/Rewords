using System.Linq;
using CatGame.Core;
using UnityEngine;
using UnityEngine.UI;
namespace CatGame.Presentation
{
    public sealed partial class GameRoot
    {
        internal const float K=540f/390f;
        Text timerLabel,intentCountdown,shieldLabel,speedLabel;
        Image intentProgress;
        RectTransform Box(Transform p,string n,float x,float y,float w,float h,Color c)
        {var r=ui.Box(p,n,x*K,y*K,w*K,h*K,c);r.GetComponent<Image>().raycastTarget=false;return r;}
        Text Label(Transform p,string n,string text,float x,float y,float w,float h,int size=16,bool bold=false,TextAnchor align=TextAnchor.MiddleLeft)
        {var t=ui.Text(p,n,text,x*K,y*K,w*K,h*K,Mathf.RoundToInt(size*K),align);if(bold)t.font=ui.BoldFont;return t;}
        Button Action(Transform p,string n,string text,float x,float y,float w,float h,UnityEngine.Events.UnityAction action,bool enabled=true)
        {var b=ui.Button(p,n,text,x*K,y*K,w*K,h*K,action,enabled);var label=b.GetComponentInChildren<Text>();label.font=ui.BoldFont;label.fontSize=Mathf.RoundToInt(16*K);return b;}
        void Art(Transform p,string name,Sprite sprite,float x,float y,float w,float h)
        {var i=Box(p,name,x,y,w,h,Color.white).GetComponent<Image>();i.sprite=sprite;i.preserveAspect=true;if(sprite==null)i.color=Color.clear;}
        void BuildPreparation()
        {
            timerLabel=intentCountdown=shieldLabel=speedLabel=null;intentProgress=null;
            var s=Session.State;var stage=Session.Definition.stages[s.stage];
            Box(screen,"PrepHeader",0,0,390,80,PaperUi.Cream);
            Label(screen,"Opponent","今晚的对手 · "+stage.displayName,20,7,252,25,13);
            Label(screen,"Title","第 "+(s.stage+1)+" 夜",20,33,104,36,23,true);
            Label(screen,"PrepTitle","布置猫窝",121,39,94,28,14);
            Action(screen,"StartBattle","开始守梦",270,25,104,44,()=>{Selected=null;Command(Session.StartBattle);});
            var shop=Box(screen,"ShopPanel",0,80,390,134,PaperUi.Sand);
            Label(shop,"ShopTitle","挑选用品",20,0,108,32,16,true);
            Label(shop,"ShopGold",s.gold+" 金币",223,0,93,32,18,true,TextAnchor.MiddleRight);
            if(!s.goldAdUsed)Action(shop,"GoldAd","+",326,0,44,36,()=>ShowAd(false));
            var slots=Enumerable.Range(0,s.shelf.Count).Where(i=>!string.IsNullOrEmpty(s.shelf[i])).ToArray();
            ShopPage=Mathf.Clamp(ShopPage,0,Mathf.Max(0,slots.Length-1));
            if(slots.Length>0){int slot=slots[ShopPage];var d=Session.Definition.Piece(s.shelf[slot]);
                Art(shop,"ItemArt",content.PieceSpriteFor(d.id,0),29,37,126,70);
                Label(shop,"ItemName",d.displayName,175,31,170,27,18,true);
                string desc=d.id=="feather"?"贴着猫放 · 加速":d.description;
                Label(shop,"ItemDescription",desc,175,57,185,32,13);
                Action(shop,"Buy_"+slot,"购买 · "+d.price+"币",175,92,150,36,()=>Command(()=>Session.Buy(slot)),s.gold>=d.price);
            }else Label(shop,"ShopEmpty","用品已备好，拖入猫窝吧",20,48,350,48,16,true,TextAnchor.MiddleCenter);
            if(slots.Length>1)Action(shop,"ShopNext","›",337,89,37,40,()=>{ShopPage=(ShopPage+1)%slots.Length;dirty=true;});
            Label(screen,"BoardHeading","猫窝",30,218,66,31,16,true);
            bool connected=SynergyRules.Resolve(Session.Definition,s).Any(c=>c.connections.Count>0);
            Label(screen,"ConnectionHint",connected?"玩具加成已生效":"拖入猫咪和玩具",94,218,206,31,14);
            if(!stage.advancedShop)Label(screen,"PrepHP","♥ "+stage.playerHP,306,218,65,31,16,true,TextAnchor.MiddleRight);
            board=new BoardPresenter(this,ui,screen,content);
            Label(screen,"Hint",notice??"购买后拖入猫窝 · 点击物品调整",22,591,346,24,14,false,TextAnchor.MiddleCenter);
            Action(screen,"Menu","≡",224,25,40,44,()=>{menuOpen=true;dirty=true;});
            if(stage.advancedShop)Action(screen,"MoreTools","…",326,214,44,36,()=>ShowPreparationTools());
            var selected=s.pieces.FirstOrDefault(p=>p.instanceId==Selected);
            if(selected!=null)BuildSelection(selected);
        }
        void BuildSelection(OwnedPiece selected)
        {
            var d=Session.Definition.Piece(selected.definitionId);
            var panel=Box(screen,"SelectionDrawer",30,471,330,113,PaperUi.Cream);panel.GetComponent<Image>().raycastTarget=true;
            Label(panel,"Selection",d.displayName,12,5,266,25,17,true);
            Action(panel,"CloseSelection","×",282,0,44,36,()=>SelectPiece(null));
            var description=Label(panel,"SelectionDescription",d.description,12,33,306,27,13);
            float descriptionHeight=Mathf.Max(27,Mathf.Ceil(description.preferredHeight/K));
            description.rectTransform.sizeDelta=new Vector2(306*K,descriptionHeight*K);
            float toolsY=33+descriptionHeight+7;
            float drawerHeight=toolsY+46;
            panel.sizeDelta=new Vector2(330*K,drawerHeight*K);
            panel.anchoredPosition=new Vector2(30*K,-(584-drawerHeight)*K);
            Action(panel,"Rotate","旋转",10,toolsY,70,38,()=>Command(()=>Session.Transform(Selected,false)));
            if(d.poses.Length>1)Action(panel,"Pose","姿势",88,toolsY,70,38,()=>Command(()=>Session.Transform(Selected,true)));
            Action(panel,"Store","收回",166,toolsY,70,38,()=>Command(()=>Session.Store(Selected)));
            if(Session.Definition.stages[Session.State.stage].advancedShop)Action(panel,"Sell","出售",244,toolsY,76,38,()=>Command(()=>Session.Sell(Selected)));
        }
        void ShowPreparationTools()
        {
            var shade=Box(screen,"PreparationTools",0,0,390,694,new Color(0,0,0,.5f));shade.GetComponent<Image>().raycastTarget=true;
            var p=Box(shade,"ToolsPanel",40,234,310,224,PaperUi.Cream);var s=Session.State;
            Label(p,"ToolsTitle","布置工具",20,8,210,36,22,true);
            Action(p,"CloseTools","×",260,5,44,40,()=>Repaint());
            Action(p,"Refresh",s.refreshes==0?"免费刷新用品":"刷新用品 · 1币",20,65,270,44,()=>Command(()=>Session.Refresh()),Session.CanRefresh);
            Action(p,"Expand",s.boardSize>=6?"猫窝已最大":"扩容猫窝 · "+Session.Definition.expansionPrices[s.boardSize-4]+"币",20,125,270,44,()=>Command(()=>Session.Expand()),s.boardSize<6);
        }
        void BuildBattle()
        {
            var s=Session.State;var stage=Session.Definition.stages[s.stage];bool active=s.phase==Phase.Battle;
            Box(screen,"BattleHeader",0,0,390,70,PaperUi.BlueBack);
            var eyebrow=Label(screen,"BattleEyebrow","猫窝守梦",20,6,190,23,13);eyebrow.color=PaperUi.Cream;
            var title=Label(screen,"Title","第 "+(s.stage+1)+" 夜",20,27,173,36,22,true);title.color=Color.white;
            timerLabel=Label(screen,"BattleTimer","",215,19,105,44,24,true,TextAnchor.MiddleRight);timerLabel.color=Color.white;
            var speed=Action(screen,"Speed","×"+BattleSpeed,326,13,52,44,ToggleSpeed,active);speedLabel=speed.GetComponentInChildren<Text>();
            var boss=Box(screen,"BossStatus",50,82,290,69,PaperUi.Cream);
            Label(boss,"EnemyName",stage.displayName,12,3,145,33,18,true);
            enemy=Label(boss,"EnemyHPValue","",156,3,122,33,22,true,TextAnchor.MiddleRight);
            Box(boss,"EnemyHPTrack",12,39,266,18,PaperUi.Sand);
            enemyBar=Box(boss,"EnemyHP",12,39,266,18,PaperUi.Danger).GetComponent<Image>();
            var intent=Box(screen,"BossIntent",50,151,290,54,PaperUi.Sand);
            Label(intent,"IntentCaption","下一击",12,1,80,20,14);
            Label(intent,"IntentName","普通攻击",12,21,152,27,17,true);
            intentCountdown=Label(intent,"IntentCountdown","",172,5,104,38,21,true,TextAnchor.MiddleRight);
            intentProgress=Box(intent,"IntentProgress",0,49,290,5,PaperUi.Danger).GetComponent<Image>();
            if(stage.id=="clock")CreateClockDial(intent);
            enemyBody=Box(screen,"EnemyArt",20,204,350,127,Color.white);
            var enemyImage=enemyBody.GetComponent<Image>();enemyImage.sprite=content.EnemySpriteFor(stage.id);enemyImage.preserveAspect=true;
            enemyAnimation=new SpriteSequencePlayer(enemyImage);enemyAnimation.SetIdle(SpriteSequenceLibrary.Get("enemy_"+stage.id.Replace('-','_'),"idle"));
            if(enemyImage.sprite==null){enemyImage.color=Color.clear;Label(screen,"MissingBoss","梦魇外观待补",65,247,260,42,18,true,TextAnchor.MiddleCenter);}
            var effect=Box(screen,"EnemyEffect",109,222,172,109,Color.white).GetComponent<Image>();effect.preserveAspect=true;effect.enabled=false;enemyEffect=new SpriteSequencePlayer(effect);
            hitText=Label(screen,"HitFeedback","",302,248,70,54,26,true,TextAnchor.MiddleCenter);
            var cats=Session.Definition.pieces.Where(d=>d.isCat).ToDictionary(d=>d.id,d=>d.displayName);
            var deployed=s.pieces.Where(p=>p.onBoard&&cats.ContainsKey(p.definitionId)).ToArray();
            var catStrip=Box(screen,"CatStatus",65,331,260,28,PaperUi.Cream);
            Label(catStrip,"CatName",deployed.Length==1?cats[deployed[0].definitionId]:"守梦小队 · "+deployed.Length+"只",10,0,150,28,16,true);
            Label(catStrip,"CatBuff",SynergyRules.Resolve(Session.Definition,s).Any(c=>c.connections.Count>0)?"玩具助力":"守梦中",155,0,95,28,14,false,TextAnchor.MiddleRight);
            board=new BoardPresenter(this,ui,screen,content);
            var shieldImage=Box(screen,"ShieldEffect",89,383,212,212,Color.white).GetComponent<Image>();shieldImage.preserveAspect=true;shieldImage.enabled=false;shieldEffect=new SpriteSequencePlayer(shieldImage);
            var team=Box(screen,"TeamStatus",50,616,290,64,PaperUi.Cream);
            shieldLabel=Label(team,"TeamLabel","猫咪生命",12,0,128,33,17,true);
            status=Label(team,"PlayerHPValue","",143,0,135,33,22,true,TextAnchor.MiddleRight);
            Box(team,"PlayerHPTrack",12,36,266,18,PaperUi.Sand);
            playerBar=Box(team,"PlayerHP",12,36,266,18,PaperUi.Positive).GetComponent<Image>();
            if(!active)BuildResult();
        }
        void BuildResult()
        {
            var s=Session.State;
            var shade=Box(screen,"ResultOverlay",0,0,390,694,new Color(0,0,0,.42f));shade.GetComponent<Image>().raycastTarget=true;
            var panel=Box(shade,"ResultPanel",35,240,320,207,PaperUi.Cream);
            Label(panel,"BattleTitle",s.phase==Phase.Won?"梦魇已击退":s.phase==Phase.Lost?"调整搭配，再试一次":"四夜守梦完成",15,15,290,44,23,true,TextAnchor.MiddleCenter);
            Label(panel,"ResultMessage",Session.Message,20,64,280,51,15,false,TextAnchor.MiddleCenter);
            if(s.phase==Phase.Won)Action(panel,"Next",s.stage==3?"完成四关":"下一夜",30,135,260,48,()=>Command(Session.Next));
            if(s.phase==Phase.Lost){Action(panel,"Retry","调整摆放",12,135,143,48,()=>Command(Session.Retry));Action(panel,"Revive","视频续战",165,135,143,48,()=>ShowAd(true),!s.reviveUsed&&!s.lossTimedOut);}
            if(s.phase==Phase.Complete)Action(panel,"Menu","菜单",30,135,260,48,()=>{menuOpen=true;dirty=true;});
        }
    }
}
