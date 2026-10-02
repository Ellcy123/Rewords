using System.IO;
using System.Linq;
using CatGame.Core;
using CatGame.Runtime;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
namespace CatGame.Presentation
{
    public sealed partial class GameRoot : MonoBehaviour
    {
        public GameContent content;
        public RunSession Session { get; private set; }
        public string Selected { get; private set; }
        public bool Paused => manualPause||applicationPause||focusPause||menuOpen;
        public bool UseSave=true;
        public int BattleSpeed { get; private set; }=1;
        float simulationDelta;
        public float BattleDelta=>simulationDelta;
        public int WaitingPage,ShopPage;
        public void Repaint(){dirty=true;}
        public void BeginPieceDrag(){Selected=null;var drawer=screen.Find("SelectionDrawer");if(drawer!=null)drawer.gameObject.SetActive(false);}
        public void ToggleSpeed(){if(Session.State.phase!=Phase.Battle)return;BattleSpeed=BattleSpeed==1?2:1;if(speedLabel!=null)speedLabel.text="×"+BattleSpeed;}
        bool manualPause,applicationPause,focusPause,dirty,restartPrompt,skipResumeFrame,menuOpen;
        string notice;
        float noticeUntil;
        RectTransform screen,frame;
        UiFactory ui;
        Text status,enemy,combatLog,hitText;
        Battle displayedBattle;
        int displayedSequence,displayedVisualSequence;
        float nextHitTime;
        Image enemyBar,playerBar;
        RectTransform clockMinute,clockHour,enemyBody;
        SpriteSequencePlayer enemyAnimation,enemyEffect,shieldEffect;
        float hitPulse;
        BoardPresenter board;
        readonly SimulatedRewardedAds ads=new SimulatedRewardedAds();
        public void Initialize(GameContent data,IRunStore store=null)
        {
            content=data;Session=new RunSession(content.CreateRuntimeDefinition(),store);Session.Changed+=OnChanged;
        }
        void Start()
        {
            if(content==null)content=Resources.Load<GameContent>("GameContent");
            if(content==null){Debug.LogError("GameContent missing: run Cat Game/Set Up Four Stage Demo");enabled=false;return;}
            if(Session==null)Initialize(content,UseSave?new JsonRunStore(Path.Combine(Application.persistentDataPath,"cat-run-v1.json")):null);
            ui=new UiFactory(content.font!=null?content.font:Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"),content);
            var canvasObject=new GameObject("CatCanvas",typeof(RectTransform),typeof(Canvas),typeof(CanvasScaler),typeof(GraphicRaycaster));canvasObject.transform.SetParent(transform,false);
            canvasObject.GetComponent<Canvas>().renderMode=RenderMode.ScreenSpaceOverlay;
            canvasObject.GetComponent<Canvas>().pixelPerfect=true;
            var scaler=canvasObject.GetComponent<CanvasScaler>();scaler.uiScaleMode=CanvasScaler.ScaleMode.ScaleWithScreenSize;scaler.referenceResolution=new Vector2(540,960);scaler.screenMatchMode=CanvasScaler.ScreenMatchMode.Expand;
            frame=ui.Box(canvasObject.transform,"PortraitFrame",0,0,540,960,Color.white);
            frame.anchorMin=frame.anchorMax=frame.pivot=new Vector2(.5f,.5f);frame.anchoredPosition=Vector2.zero;
            var background=ui.Box(frame,"BedroomBackground",0,0,540,960,Color.white);
            var backgroundImage=background.GetComponent<Image>();backgroundImage.sprite=content.SpriteFor("bg_bedroom_gameplay");backgroundImage.raycastTarget=false;
            if(FindFirstObjectByType<EventSystem>()==null)
            {
                var eventObject=new GameObject("EventSystem",typeof(EventSystem),typeof(StandaloneInputModule));
                eventObject.transform.SetParent(transform,false);
            }
            if(FindFirstObjectByType<Camera>()==null){var cameraObject=new GameObject("UI Background Camera",typeof(Camera));cameraObject.transform.SetParent(transform,false);var camera=cameraObject.GetComponent<Camera>();camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=PaperUi.BlueBack;camera.cullingMask=0;}
            Render();
        }
        void OnChanged(){dirty=true;if(ui!=null&&Session!=null){notice=Session.Message;noticeUntil=Time.unscaledTime+3f;}}
        void OnDestroy(){if(Session!=null)Session.Changed-=OnChanged;}
        void Update()
        {
            if(Session==null||frame==null)return;
            // Keep the portrait play area inside device notches / home indicator.
            var canvas=(RectTransform)frame.parent;Rect safe=Screen.safeArea;
            float scale=canvas.GetComponent<Canvas>().scaleFactor;
            frame.localScale=Vector3.one*Mathf.Min(1,Mathf.Min(safe.width/(540*scale),safe.height/(960*scale)));
            frame.anchoredPosition=(safe.center-new Vector2(Screen.width,Screen.height)/2)/scale;
            simulationDelta=Paused||ads.IsPending||restartPrompt?0:Time.unscaledDeltaTime*BattleSpeed;
            if(skipResumeFrame){skipResumeFrame=false;simulationDelta=0;}
            Session.Tick(simulationDelta);
            if(notice!=null&&Time.unscaledTime>=noticeUntil&&!(board?.IsDragging??false)){notice=null;dirty=true;}
            if(dirty){dirty=false;Render();}
            RefreshBattle(); board?.Tick();
            if(!Paused){enemyAnimation?.Tick(BattleDelta);enemyEffect?.Tick(BattleDelta);shieldEffect?.Tick(BattleDelta);}
            TickClock();
        }
        void OnApplicationPause(bool value){applicationPause=value;if(value)board?.CancelDrag();if(!value)skipResumeFrame=true;}
        void OnApplicationFocus(bool focused){focusPause=!focused;if(!focused)board?.CancelDrag();if(focused)skipResumeFrame=true;}
        public void Command(System.Func<bool> action){action();notice=Session.Message;noticeUntil=Time.unscaledTime+3f;dirty=true;}
        public void SelectPiece(string id){Selected=id;dirty=true;}
        public void SetManualPause(bool value){manualPause=value;dirty=true;}
        void Render()
        {
            if(screen!=null){screen.gameObject.SetActive(false);Destroy(screen.gameObject);}
            screen=ui.Box(frame,"Screen",0,0,540,960,Color.clear);screen.GetComponent<Image>().raycastTarget=false;
            status=enemy=combatLog=hitText=null;enemyBar=playerBar=null;
            enemyBody=clockMinute=clockHour=null;enemyAnimation=enemyEffect=shieldEffect=null;
            if(Session.State.phase==Phase.Preparation)BuildPreparation();else BuildBattle();
            if(menuOpen)
            {
                var shade=ui.Box(screen,"MenuOverlay",0,0,540,960,new Color(0,0,0,.65f));
                var menu=ui.Box(shade,"PromptPanel",60,330,420,220,UiFactory.Panel);
                ui.Text(menu,"MenuTitle","本轮守梦",18,14,384,40,24,TextAnchor.MiddleCenter);
                ui.Button(menu,"CloseMenu","返回游戏",30,72,360,52,()=>{menuOpen=false;dirty=true;});
                ui.Button(menu,"NewRun","重新开局",30,140,360,52,()=>{menuOpen=false;restartPrompt=true;dirty=true;});
            }
            if(ads.IsPending)ShowModal("模拟激励广告\n完成才发奖励；取消不扣任何东西",()=>ads.Finish(true),()=>ads.Finish(false),"模拟完成");
            if(restartPrompt)ShowModal("重新开局会清除本轮进度",()=>{restartPrompt=false;manualPause=false;Selected=null;Session.NewRun();},()=>{restartPrompt=false;dirty=true;},"重新开始");
            RefreshBattle();
        }
        void ShowModal(string text,UnityEngine.Events.UnityAction yes,UnityEngine.Events.UnityAction no,string confirm)
        {
            var modal=ui.Box(screen,"Modal",0,0,540,960,new Color(0,0,0,.85f));
            var promptPanel=ui.Box(modal,"PromptPanel",30,335,480,150,UiFactory.Panel);
            ui.Text(promptPanel,"Prompt",text,18,12,444,126,24,TextAnchor.MiddleCenter);
            ui.Button(modal,"Confirm",confirm,50,500,210,54,()=>{yes();dirty=true;});
            ui.Button(modal,"Cancel","取消",280,500,210,54,()=>{no();dirty=true;});
        }
        void ShowAd(bool revive)
        {
            string ticket=Session.CreateAdTicket(revive);ads.Show(success=>{Session.RewardAd(ticket,revive,success);dirty=true;});dirty=true;
        }
        void RefreshBattle()
        {
            var s=Session.State;var stage=Session.Definition.stages[s.stage];var b=Session.Combat;
            if(b!=displayedBattle){displayedBattle=b;displayedSequence=displayedVisualSequence=0;BattleSpeed=1;}
            if(s.phase==Phase.Preparation)return;
            if(b!=null)foreach(var e in b.timeline.Where(v=>v.sequence>displayedVisualSequence)){PlayVisualEvent(e);displayedVisualSequence=e.sequence;}
            if(b!=null&&!Paused&&Time.unscaledTime>=nextHitTime&&hitText!=null){var e=b.timeline.FirstOrDefault(v=>v.sequence>displayedSequence);if(e!=null){displayedSequence=e.sequence;nextHitTime=Time.unscaledTime+.13f/BattleSpeed;hitPulse=e.targetId=="enemy"?1:0;hitText.text="−"+e.amount;hitText.color=PaperUi.Danger;}else if(Time.unscaledTime>nextHitTime+.4f/BattleSpeed)hitText.text="";}
            int hp=b?.hp??stage.playerHP;
            if(enemy!=null)enemy.text=(b?.enemyHP??stage.enemyHP)+" / "+stage.enemyHP;
            if(status!=null)status.text=hp+" / "+(b?.maxHP??stage.playerHP);
            if(shieldLabel!=null)shieldLabel.text=(b?.shield??0)>0?"护盾 "+b.shield:"猫咪生命";
            if(enemyBar!=null)enemyBar.rectTransform.sizeDelta=new Vector2(266*K*Mathf.Clamp01((b?.enemyHP??stage.enemyHP)/(float)stage.enemyHP),18*K);
            if(playerBar!=null)playerBar.rectTransform.sizeDelta=new Vector2(266*K*Mathf.Clamp01(hp/(float)(b?.maxHP??stage.playerHP)),18*K);
            if(timerLabel!=null)timerLabel.text=Mathf.CeilToInt(Mathf.Max(0,stage.limitTicks-(b?.time??0))/10000f)+" 秒";
            if(intentCountdown!=null)intentCountdown.text=s.phase==Phase.Battle?Mathf.CeilToInt(Mathf.Max(0,(b?.nextEnemy??stage.enemyIntervalTicks)-(b?.time??0))/10000f)+" 秒后":"已结束";
            if(intentProgress!=null)intentProgress.rectTransform.sizeDelta=new Vector2(290*K*(s.phase==Phase.Battle?Mathf.Clamp01(1-((b?.nextEnemy??stage.enemyIntervalTicks)-(b?.time??0))/(float)stage.enemyIntervalTicks):0),5*K);
            if(speedLabel!=null)speedLabel.text="×"+BattleSpeed;
            if(enemyBody!=null){hitPulse=Mathf.MoveTowards(hitPulse,0,BattleDelta*4);enemyBody.localScale=Vector3.one*(1+hitPulse*.07f);}
        }
        void PlayVisualEvent(BattleEvent e)
        {
            board?.PlayBattleEvent(e);
            switch(e.kind)
            {
                case "attack":
                case "extra-attack": enemyEffect?.Play(SpriteSequenceLibrary.Get("claw_hit","motion")); break;
                case "heavy": enemyEffect?.Play(SpriteSequenceLibrary.Get("heavy_impact","motion")); break;
                case "item-followup": enemyEffect?.Play(SpriteSequenceLibrary.Get("mouse_followup","motion")); break;
                case "shield":
                case "item-shield": shieldEffect?.Play(SpriteSequenceLibrary.Get("shield_bloom","motion")); break;
                case "enemy-attack": enemyAnimation?.Play(SpriteSequenceLibrary.Get("enemy_"+Session.Definition.stages[Session.State.stage].id.Replace('-','_'),"attack")); break;
            }
        }
        void CreateClockDial(RectTransform enemyPanel)
        {
            var dial=ui.Box(enemyPanel,"ClockDial",78*K,2*K,20*K,20*K,Color.white);
            var image=dial.GetComponent<Image>();image.sprite=content.SpriteFor("enemy_clock_dial");image.preserveAspect=true;image.raycastTarget=false;
            clockHour=ClockHand(dial,"HourHand",1.5f*K,4*K);
            clockMinute=ClockHand(dial,"MinuteHand",1*K,6*K);
        }
        RectTransform ClockHand(RectTransform parent,string name,float width,float height)
        {
            var hand=ui.Box(parent,name,0,0,width,height,new Color(.16f,.16f,.24f));
            hand.anchorMin=hand.anchorMax=new Vector2(.5f,.5f);hand.pivot=new Vector2(.5f,0);hand.anchoredPosition=Vector2.zero;
            hand.GetComponent<Image>().raycastTarget=false;return hand;
        }
        void TickClock()
        {
            if(clockMinute==null||clockHour==null)return;
            // Positive Z is counter-clockwise on the UI canvas: the nightmare visibly runs backward.
            clockMinute.localEulerAngles=new Vector3(0,0,(Session.Combat?.time??0)/10000f*90f+40f);
            clockHour.localEulerAngles=new Vector3(0,0,(Session.Combat?.time??0)/10000f*18f-55f);
        }
    }
}
