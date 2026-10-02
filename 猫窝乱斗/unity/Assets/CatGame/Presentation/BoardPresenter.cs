using System.Linq;
using System.Collections.Generic;
using CatGame.Core;
using CatGame.Runtime;
using UnityEngine;
using UnityEngine.UI;
namespace CatGame.Presentation
{
    public sealed class BoardPresenter
    {
        readonly GameRoot root;
        readonly UiFactory ui;
        readonly RectTransform board, overlay;
        RectTransform waitingArea;
        readonly bool preparation;
        const float K=GameRoot.K;
        readonly GameContent content;
        readonly float cell;
        readonly Dictionary<string,Text> counters=new Dictionary<string,Text>();
        readonly Dictionary<string,Image> cooldowns=new Dictionary<string,Image>();
        readonly Dictionary<string,SpriteSequencePlayer> catAnimations=new Dictionary<string,SpriteSequencePlayer>();
        readonly Dictionary<string,string> catAnimationIds=new Dictionary<string,string>();
        string dragging;
        public bool IsDragging=>dragging!=null;
        int grabX,grabY;
        RectTransform ghost;
        RunSession Session=>root.Session;
        public BoardPresenter(GameRoot root,UiFactory ui,RectTransform parent,GameContent content)
        {
            this.root=root;this.ui=ui;this.content=content;preparation=Session.State.phase==Phase.Preparation;
            float width=(preparation?318:180)*K;cell=width/Session.State.boardSize;
            if(preparation){var edge=ui.Box(parent,"BoardBorder",30*K,254*K,330*K,330*K,PaperUi.Ink);edge.GetComponent<Image>().raycastTarget=false;}
            else {var nest=ui.Box(parent,"FabricNest",65*K,358*K,260*K,260*K,Color.white).GetComponent<Image>();nest.sprite=Resources.Load<Sprite>("WebUi/nest_fabric_v1");nest.preserveAspect=true;nest.raycastTarget=false;}
            board=ui.Box(parent,"Board",(preparation?36:105)*K,(preparation?260:398)*K,width,width,preparation?PaperUi.Sand:Color.clear);board.GetComponent<Image>().raycastTarget=false;
            if(preparation)for(int y=0;y<Session.State.boardSize;y++)for(int x=0;x<Session.State.boardSize;x++)
            {var baseCell=ui.Box(board,"Cell_"+x+"_"+y,x*cell+1,y*cell+1,cell-2,cell-2,UiFactory.Cell);baseCell.GetComponent<Image>().raycastTarget=false;}
            foreach(var p in Session.State.pieces.Where(p=>p.onBoard))DrawPiece(board,p,cell,p.x*cell,p.y*cell,preparation);
            var waiting=Session.State.pieces.Where(p=>!p.onBoard).ToArray();
            if(preparation)
            {
                waitingArea=ui.Box(parent,"WaitingArea",20*K,619*K,350*K,69*K,PaperUi.Cream);
                ui.Text(waitingArea,"WaitingTitle","待放入 · "+waiting.Length,0,0,230*K,21*K,Mathf.RoundToInt(14*K));
                int pages=Mathf.Max(1,(waiting.Length+1)/2);root.WaitingPage=Mathf.Clamp(root.WaitingPage,0,pages-1);
                if(pages>1){var prev=ui.Button(waitingArea,"TrayPrevious","‹",252*K,0,44*K,23*K,()=>{root.WaitingPage=(root.WaitingPage+pages-1)%pages;root.Repaint();});var next=ui.Button(waitingArea,"TrayNext","›",301*K,0,44*K,23*K,()=>{root.WaitingPage=(root.WaitingPage+1)%pages;root.Repaint();});}
                if(waiting.Length==0)ui.Text(waitingArea,"WaitingEmpty","已全部入窝",0,24*K,350*K,40*K,Mathf.RoundToInt(14*K),TextAnchor.MiddleCenter);
                for(int i=root.WaitingPage*2;i<Mathf.Min(waiting.Length,root.WaitingPage*2+2);i++)
                {
                    var p=waiting[i];var d=Session.Definition.Piece(p.definitionId);
                    var tile=ui.Box(waitingArea,"Waiting_"+p.instanceId,(i%2)*178*K,24*K,172*K,44*K,p.instanceId==root.Selected?UiFactory.Selected:PaperUi.Sand);
                    ui.Text(tile,"Name",d.displayName,87*K,0,82*K,23*K,Mathf.RoundToInt(14*K));
                    ui.Text(tile,"Footprint","占 "+BoardRules.Shape(d,p.pose,p.rotation).Length+" 格",87*K,23*K,82*K,19*K,Mathf.RoundToInt(12*K));
                    var art=ui.Box(tile,"Art",0,3*K,84*K,37*K,Color.white);var artImage=art.GetComponent<Image>();artImage.sprite=content.PieceSpriteFor(d.id,p.pose);artImage.preserveAspect=true;artImage.raycastTarget=false;
                    var pointer=tile.gameObject.AddComponent<PiecePointer>();pointer.owner=this;pointer.instanceId=p.instanceId;
                }
            }
            overlay=ui.Box(parent,"DragOverlay",0,0,540,960,Color.clear);overlay.GetComponent<Image>().raycastTarget=false;
        }
        void DrawPiece(RectTransform parent,OwnedPiece p,float size,float x,float y,bool input)
        {
            var d=Session.Definition.Piece(p.definitionId);var cells=BoardRules.Shape(d,p.pose,p.rotation);
            var links=input?SynergyRules.Resolve(Session.Definition,Session.State):null;
            bool connected=input&&links.Any(cat=>(cat.instanceId==root.Selected&&cat.connectionInstanceIds.Contains(p.instanceId))||(p.instanceId==cat.instanceId&&cat.connectionInstanceIds.Contains(root.Selected)));
            Color cellColor=p.instanceId==root.Selected?UiFactory.Selected:connected?UiFactory.Connected:UiFactory.Cell;
            if(preparation)for(int i=0;i<cells.Length;i++)
            {
                var c=cells[i];var state=ui.Box(parent,"PieceState_"+p.instanceId+"_"+i,x+c.x*size+3,y+c.y*size+3,size-6,size-6,cellColor);
                state.GetComponent<Image>().raycastTarget=false;
            }
            var art=DrawArt(parent,p,d,size,x,y,parent==board);
            if(input)for(int i=0;i<cells.Length;i++)
            {
                var c=cells[i];var hit=ui.Box(parent,"PieceHit_"+p.instanceId+"_"+i,x+c.x*size+3,y+c.y*size+3,size-6,size-6,Color.clear);
                if(input){var pointer=hit.gameObject.AddComponent<PiecePointer>();pointer.owner=this;pointer.instanceId=p.instanceId;pointer.offsetX=c.x;pointer.offsetY=c.y;}
                else hit.GetComponent<Image>().raycastTarget=false;
            }
        }

        RectTransform DrawArt(RectTransform parent,OwnedPiece p,PieceDefinition d,float size,float x,float y,bool live)
        {
            var rotated=BoardRules.Shape(d,p.pose,p.rotation);
            int width=rotated.Max(c=>c.x)+1,height=rotated.Max(c=>c.y)+1;
            var original=d.poses[p.pose].cells;
            int sourceWidth=original.Max(c=>c.x)+1,sourceHeight=original.Max(c=>c.y)+1;
            var holder=ui.Box(parent,"PieceArt_"+p.instanceId,x,y,width*size,height*size,Color.clear);
            holder.GetComponent<Image>().raycastTarget=false;
            var spriteRect=ui.Box(holder,"Sprite",0,0,sourceWidth*size,sourceHeight*size,Color.white);
            spriteRect.anchorMin=spriteRect.anchorMax=spriteRect.pivot=new Vector2(.5f,.5f);spriteRect.anchoredPosition=Vector2.zero;
            spriteRect.localEulerAngles=new Vector3(0,0,-90*(p.rotation%4));
            var image=spriteRect.GetComponent<Image>();image.sprite=content.PieceSpriteFor(d.id,p.pose);image.preserveAspect=true;image.raycastTarget=false;
            if(live&&d.isCat)
            {
                string animationId=CatAnimationId(d.id,p.pose);
                if(animationId!=null)
                {
                    var player=new SpriteSequencePlayer(image);
                    player.SetIdle(SpriteSequenceLibrary.Get(animationId,"idle"));
                    catAnimations[p.instanceId]=player;
                    catAnimationIds[p.instanceId]=animationId;
                }
            }
            return holder;
        }
        static string CatAnimationId(string id,int pose)
        {
            if(id=="noodle")return pose==0?"cat_noodle_stretch":"cat_noodle_curl";
            if(id=="hammer")return pose==0?"cat_hammer_stretch":"cat_hammer_curl";
            if(id=="pillow")return "cat_pillow_flat";
            return null;
        }
        public void PlayBattleEvent(BattleEvent e)
        {
            if(!catAnimations.TryGetValue(e.sourceId,out var player))return;
            var id=catAnimationIds[e.sourceId];
            SpriteSequence clip=null;
            if(e.kind=="extra-attack"&&id.StartsWith("cat_noodle"))clip=SpriteSequenceLibrary.Get("noodle_combo","motion");
            else if(e.kind=="heavy"&&id.StartsWith("cat_hammer"))clip=SpriteSequenceLibrary.Get("hammer_heavy","motion");
            else if(e.kind=="shield"&&id=="cat_pillow_flat")clip=SpriteSequenceLibrary.Get("pillow_shield","motion");
            else if(e.kind=="attack")clip=SpriteSequenceLibrary.Get(id,"attack");
            if(clip==null&&(e.kind=="extra-attack"||e.kind=="heavy"||e.kind=="shield"))clip=SpriteSequenceLibrary.Get(id,"attack");
            player.Play(clip);
        }
        public void Tick()
        {
            if(!root.Paused&&Session.State.phase==Phase.Battle)
                foreach(var player in catAnimations.Values)player.Tick(root.BattleDelta);
            var battle=Session.Combat;
            if(battle==null)return;
            foreach(var c in battle.cats)
            {
                if(counters.TryGetValue(c.instanceId,out var t))t.text=(c.count%c.skillEvery)+" / "+c.skillEvery;
                if(cooldowns.TryGetValue(c.instanceId,out var bar))bar.rectTransform.sizeDelta=new Vector2((cell-6)*Mathf.Clamp01(1-(c.next-battle.time)/(float)c.interval),4);
            }
        }
        public void Select(string id){root.SelectPiece(id);}
        public void Begin(string id,int x,int y,Vector2 screen)
        {
            if(Session.State.phase!=Phase.Preparation)return;
            root.BeginPieceDrag();dragging=id;grabX=x;grabY=y;
            var source=Session.State.pieces.First(v=>v.instanceId==id);if(!source.onBoard){var shape=BoardRules.Shape(Session.Definition.Piece(source.definitionId),source.pose,source.rotation);grabX=shape.Max(c=>c.x)/2;grabY=shape.Max(c=>c.y)/2;}
            ghost=ui.Box(overlay,"DragGhost",0,0,420,420,Color.clear);ghost.GetComponent<Image>().raycastTarget=false;
            var p=Session.State.pieces.First(v=>v.instanceId==id);DrawPiece(ghost,p,cell,0,0,false);Drag(screen);
        }
        public void Drag(Vector2 screen)
        {
            if(ghost==null)return;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(overlay,screen,null,out var local);
            ghost.anchoredPosition=new Vector2(local.x-grabX*cell-cell/2,local.y+grabY*cell+cell/2);
            RectTransformUtility.ScreenPointToLocalPointInRectangle(board,screen,null,out var pos);
            var p=Session.State.pieces.First(v=>v.instanceId==dragging);
            Target(p,pos,out int tx,out int ty);
            bool valid=RectTransformUtility.RectangleContainsScreenPoint(board,screen)&&BoardRules.CanPlace(Session.Definition,Session.State,p,tx,ty,p.pose,p.rotation);
            foreach(var image in ghost.GetComponentsInChildren<Image>())if(image.transform!=ghost&&image.color.a>0)image.color=valid?new Color(.35f,.65f,.4f,.8f):new Color(.8f,.3f,.3f,.8f);
        }
        public void End(Vector2 screen)
        {
            if(dragging==null)return;
            string id=dragging;dragging=null;if(ghost!=null)Object.Destroy(ghost.gameObject);
            RectTransformUtility.ScreenPointToLocalPointInRectangle(board,screen,null,out var pos);
            if(RectTransformUtility.RectangleContainsScreenPoint(board,screen)){var p=Session.State.pieces.First(v=>v.instanceId==id);Target(p,pos,out int x,out int y);root.Command(()=>Session.Place(id,x,y));}
            else if(waitingArea!=null&&RectTransformUtility.RectangleContainsScreenPoint(waitingArea,screen))root.Command(()=>Session.Store(id));
        }
        void Target(OwnedPiece p,Vector2 pos,out int x,out int y)
        {var shape=BoardRules.Shape(Session.Definition.Piece(p.definitionId),p.pose,p.rotation);x=Mathf.Clamp(Mathf.FloorToInt(pos.x/cell)-grabX,0,Session.State.boardSize-shape.Max(c=>c.x)-1);y=Mathf.Clamp(Mathf.FloorToInt(-pos.y/cell)-grabY,0,Session.State.boardSize-shape.Max(c=>c.y)-1);}
        public void CancelDrag(){dragging=null;if(ghost!=null)Object.Destroy(ghost.gameObject);}
    }
}
