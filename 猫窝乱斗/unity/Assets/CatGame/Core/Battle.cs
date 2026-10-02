using System;
using System.Collections.Generic;
using System.Linq;
namespace CatGame.Core
{
    public sealed class BattleEvent
    {
        public int sequence, time, amount;
        public string sourceId, targetId, kind;
    }
    // Integer 0.1 ms ticks: all Demo intervals (including 1.5625 s) are exact.
    public sealed class Battle
    {
        public readonly List<CatStats> cats;
        public readonly StageDefinition stage;
        public int time, hp, maxHP, enemyHP, shield, nextEnemy, attacks, skills;
        public bool finished, won, timedOut;
        public string lastEvent="猫咪就位";
        public readonly Queue<string> events=new Queue<string>();
        public readonly List<BattleEvent> timeline=new List<BattleEvent>();
        int sequence;
        double remainder;
        void Emit(string source,string target,string kind,int amount)
        {
            timeline.Add(new BattleEvent{sequence=++sequence,time=time,sourceId=source,targetId=target,kind=kind,amount=amount});
            if(timeline.Count>128)timeline.RemoveAt(0);
        }
        public Battle(GameDefinition d, RunState s)
        {
            var source=d.stages[s.stage];
            stage=new StageDefinition{enemyHP=source.enemyHP,enemyDamage=source.enemyDamage,enemyIntervalTicks=source.enemyIntervalTicks,playerHP=source.playerHP,limitTicks=source.limitTicks};
            cats=SynergyRules.Resolve(d,s); maxHP=s.revivedBattle?(int)Math.Ceiling(stage.playerHP*1.2):stage.playerHP;
            hp=maxHP; enemyHP=stage.enemyHP; shield=cats.Sum(c=>c.openingShield); nextEnemy=stage.enemyIntervalTicks;
        }
        void Log(string text) { lastEvent=text; events.Enqueue(text); while(events.Count>5) events.Dequeue(); }
        public void Advance(double seconds)
        {
            if(finished||seconds<=0) return;
            remainder+=seconds*10000; int ticks=(int)Math.Floor(remainder+0.000001); remainder-=ticks;
            int target=Math.Min(stage.limitTicks,time+ticks);
            while(!finished)
            {
                int next=Math.Min(nextEnemy,cats.Count==0?int.MaxValue:cats.Min(c=>c.next));
                if(next>target) break;
                time=next; int damage=0;
                foreach(var c in cats.Where(c=>c.next==next))
                {
                    c.count++; attacks++; int hit=c.damage;
                    bool heavy=c.count%c.skillEvery==0&&c.skill==SkillKind.Heavy;
                    if(!heavy)Emit(c.instanceId,"enemy","attack",c.damage);
                    if(c.count%c.skillEvery==0)
                    {
                        skills++;
                        switch(c.skill)
                        {
                            case SkillKind.Combo: hit+=c.damage*c.skillValue+c.comboBonus;
                                for(int n=0;n<c.skillValue;n++)Emit(c.instanceId,"enemy","extra-attack",c.damage);
                                if(c.comboBonus>0)Emit(c.instanceId,"enemy","item-followup",c.comboBonus);
                                Log(c.name+" 连击！"+hit+" 伤害"); break;
                            case SkillKind.Heavy: hit=c.damage*c.skillValue+c.heavyBonus; Emit(c.instanceId,"enemy","heavy",hit); Log(c.name+" 重击！"+hit+" 伤害"); break;
                            case SkillKind.Shield: shield+=c.skillValue; Emit(c.instanceId,"team","shield",c.skillValue); Log(c.name+" 护盾 +"+c.skillValue); break;
                        }
                        shield+=c.skillShield; if(c.skillShield>0)Emit(c.instanceId,"team","item-shield",c.skillShield);
                    }
                    else Log(c.name+" 攻击 "+hit);
                    damage+=hit; c.next+=c.interval;
                }
                enemyHP=Math.Max(0,enemyHP-damage);
                if(nextEnemy==next)
                {
                    int absorbed=Math.Min(shield,stage.enemyDamage); shield-=absorbed;
                    Emit("enemy","team","enemy-attack",stage.enemyDamage-absorbed);
                    hp=Math.Max(0,hp-stage.enemyDamage+absorbed); nextEnemy+=stage.enemyIntervalTicks;
                }
                if(hp<=0||enemyHP<=0) { finished=true; won=hp>0&&enemyHP<=0; }
            }
            if(!finished) { time=target; if(time>=stage.limitTicks) { finished=true; timedOut=true; } }
        }
    }
}
