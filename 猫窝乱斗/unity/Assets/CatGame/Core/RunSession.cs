using System;
using System.Collections.Generic;
using System.Linq;
namespace CatGame.Core
{
    public interface IStoreDiagnostics { string LoadNotice { get; } }
    public interface IRunStore { RunState Load(); void Save(RunState state); }
    public sealed class RunSession
    {
        public GameDefinition Definition { get; }
        public RunState State { get; private set; }
        public Battle Combat { get; private set; }
        readonly IRunStore store;
        public string Message { get; private set; }="";
        public event Action Changed;
        public RunSession(GameDefinition definition, IRunStore store=null)
        {
            Definition=definition; ContentRules.Validate(definition); this.store=store;
            try { State=store?.Load(); } catch { State=null; Message="存档无法读取，已开始新局"; }
            if(!IsValid(State)) { bool discarded=State!=null; NewRun(); if(discarded) Message="存档版本或内容无效，已开始新局（旧档保留在备份）"; }
            else if(State.phase==Phase.Battle) Combat=new Battle(Definition,State);
            if(store is IStoreDiagnostics diagnostics&&!string.IsNullOrEmpty(diagnostics.LoadNotice))Message=diagnostics.LoadNotice;
        }
        bool IsValid(RunState s)
        {
            try { return ValidateState(s); } catch { return false; }
        }
        bool ValidateState(RunState s)
        {
            if(s==null||s.schema!=1||s.rulesVersion!=Definition.version||s.stage<0||s.stage>=Definition.stages.Length||s.gold<0||s.boardSize<4||s.boardSize>6||s.pieces==null||s.shelf==null||s.transactions==null||s.shelf.Count!=3||!Enum.IsDefined(typeof(Phase),s.phase)) return false;
            var ids=new HashSet<string>();
            foreach(var p in s.pieces)
            {
                var d=Definition.pieces.FirstOrDefault(v=>v.id==p.definitionId);
                if(d==null||!ids.Add(p.instanceId)||p.pose<0||p.pose>=d.poses.Length||p.rotation<0||p.rotation>3||p.paid<0) return false;
                if(p.onBoard&&!BoardRules.CanPlace(Definition,s,p,p.x,p.y,p.pose,p.rotation)) return false;
            }
            return s.shelf.All(id=>string.IsNullOrEmpty(id)||Definition.pieces.Any(d=>d.id==id));
        }
        void Commit(string message)
        {
            Message=message;
            try { store?.Save(State); } catch { Message+="（存档失败，本次进度尚未保存）"; }
            Changed?.Invoke();
        }
        bool Reject(string message) { Message=message; return false; }
        bool Preparing => State.phase==Phase.Preparation;
        public void NewRun()
        {
            State=new RunState{runId=Guid.NewGuid().ToString("N"),rulesVersion=Definition.version,gold=Definition.initialGold,boardSize=Definition.initialSize,phase=Phase.Preparation};
            State.pieces.Add(new OwnedPiece{instanceId="0",definitionId=Definition.initialCatId,onBoard=false,x=0,y=0});
            Combat=null; FillShelf(); Commit("新的一夜开始了");
        }
        List<string> ShelfAt(int offset)
        {
            var stage=Definition.stages[State.stage]; var pool=stage.shop;
            return Enumerable.Range(0,3).Select(i=>
            {
                string id=pool.Length==0?"":pool[(i+offset)%pool.Length];
                if(!stage.advancedShop&&State.pieces.Any(p=>p.definitionId==id)) return "";
                return id;
            }).ToList();
        }
        void FillShelf() => State.shelf=ShelfAt(State.shelfOffset);
        public bool Buy(int slot)
        {
            if(!Preparing||slot<0||slot>=State.shelf.Count||string.IsNullOrEmpty(State.shelf[slot])) return Reject("这个货位没有商品");
            var d=Definition.Piece(State.shelf[slot]); if(State.gold<d.price) return Reject("金币不足");
            State.gold-=d.price; State.pieces.Add(new OwnedPiece{instanceId=(State.nextId++).ToString(),definitionId=d.id,paid=d.price}); State.shelf[slot]="";
            Commit("买到"+d.displayName+"，从待放区拖进盒子"); return true;
        }
        public bool CanRefresh
        {
            get
            {
                if(!Preparing||State.gold<(State.refreshes==0?0:1))return false;
                int next=Definition.stages[State.stage].advancedShop?State.shelfOffset+3:0;
                return !State.shelf.SequenceEqual(ShelfAt(next));
            }
        }
        public bool Refresh()
        {
            if(!Preparing) return false;
            int next=Definition.stages[State.stage].advancedShop?State.shelfOffset+3:0;
            var shelf=ShelfAt(next);
            if(State.shelf.SequenceEqual(shelf)) return Reject("没有新商品，不消耗金币");
            int cost=State.refreshes==0?0:1; if(State.gold<cost) return Reject("金币不足");
            State.gold-=cost; State.refreshes++; State.shelfOffset=next; State.shelf=shelf; Commit("商店已刷新");return true;
        }
        public bool Place(string id,int x,int y,int pose=-1,int rotation=-1)
        {
            var p=State.pieces.FirstOrDefault(p=>p.instanceId==id); if(!Preparing||p==null) return false;
            pose=pose<0?p.pose:pose; rotation=rotation<0?p.rotation:rotation;
            var d=Definition.Piece(p.definitionId);
            if(pose>=d.poses.Length||rotation>3||!BoardRules.CanPlace(Definition,State,p,x,y,pose,rotation)) return Reject("这里放不下，已回到原位");
            p.x=x;p.y=y;p.pose=pose;p.rotation=rotation;p.onBoard=true;Commit("摆放完成");return true;
        }
        public bool Transform(string id,bool changePose)
        {
            var p=State.pieces.FirstOrDefault(p=>p.instanceId==id);if(!Preparing||p==null)return false;
            int pose=changePose?(p.pose+1)%Definition.Piece(p.definitionId).poses.Length:p.pose;
            int rot=changePose?p.rotation:(p.rotation+1)%4;
            if(p.onBoard)return Place(id,p.x,p.y,pose,rot);
            p.pose=pose;p.rotation=rot;Commit("姿势已调整");return true;
        }
        public bool Store(string id)
        {
            var p=State.pieces.FirstOrDefault(p=>p.instanceId==id);if(!Preparing||p==null)return false;
            p.onBoard=false;Commit("已移到待放区");return true;
        }
        public bool Sell(string id)
        {
            var p=State.pieces.FirstOrDefault(p=>p.instanceId==id);if(!Preparing||!Definition.stages[State.stage].advancedShop||p==null)return false;
            State.gold+=p.paid/2;State.pieces.Remove(p);Commit("出售完成");return true;
        }
        public bool Expand()
        {
            if(!Preparing||!Definition.stages[State.stage].advancedShop||State.boardSize>=6)return Reject("当前不能扩容");
            int cost=Definition.expansionPrices[State.boardSize-4];if(State.gold<cost)return Reject("金币不足");
            State.gold-=cost;State.boardSize++;Commit("盒子扩大了");return true;
        }
        public bool StartBattle()
        {
            if(!Preparing||!State.pieces.Any(p=>p.onBoard&&Definition.Piece(p.definitionId).isCat))return Reject("先放入至少一只猫");
            State.phase=Phase.Battle;State.revivedBattle=false;Combat=new Battle(Definition,State);Commit("守住小主人的梦");return true;
        }
        public void Tick(double seconds)
        {
            if(State.phase!=Phase.Battle||Combat==null)return;
            Combat.Advance(seconds);if(!Combat.finished)return;
            State.phase=Combat.won?Phase.Won:Phase.Lost; State.lossTimedOut=Combat.timedOut;
            if(Combat.won)
            {
                string transaction="win:"+State.stage;
                if(!State.transactions.Contains(transaction)){State.transactions.Add(transaction);State.gold+=Definition.stages[State.stage].reward;}
            }
            Commit(Combat.won?"梦魇消散！金币 +"+Definition.stages[State.stage].reward:Combat.timedOut?"时间到了，调整组合再试试":"这次没守住，可以重新摆放");
        }
        public bool Next()
        {
            if(State.phase!=Phase.Won)return false;
            if(State.stage+1>=Definition.stages.Length){State.phase=Phase.Complete;Commit("四关通关！");return true;}
            State.stage++;State.phase=Phase.Preparation;State.refreshes=0;State.shelfOffset=0;State.goldAdUsed=false;State.reviveUsed=false;State.revivedBattle=false;Combat=null;FillShelf();Commit(Definition.stages[State.stage].hint);return true;
        }
        public bool Retry()
        {
            if(State.phase!=Phase.Lost)return false;State.phase=Phase.Preparation;State.revivedBattle=false;Combat=null;Commit("重新整理后再出发");return true;
        }
        public string CreateAdTicket(bool revive) => State.runId+":"+State.stage+":"+(revive?"revive":"gold");
        public bool RewardAd(string ticket,bool revive,bool succeeded)
        {
            if(!succeeded||ticket!=CreateAdTicket(revive)||State.transactions.Contains(ticket))return false;
            if(revive)
            {
                if(State.phase!=Phase.Lost||State.reviveUsed||State.lossTimedOut)return false;
                State.reviveUsed=true;State.revivedBattle=true;State.phase=Phase.Battle;Combat=new Battle(Definition,State);
            }
            else
            {
                if(!Preparing||State.goldAdUsed)return false;State.goldAdUsed=true;State.gold+=4;
            }
            State.transactions.Add(ticket);Commit(revive?"带着 20% 额外生命重新挑战":"模拟广告奖励：金币 +4");return true;
        }
    }
}
