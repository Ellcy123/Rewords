using System;
using System.Collections.Generic;
using System.Linq;
namespace CatGame.Core
{
    [Serializable] public struct Cell : IEquatable<Cell>
    {
        public int x, y;
        public Cell(int x, int y) { this.x=x; this.y=y; }
        public bool Equals(Cell b) => x==b.x && y==b.y;
        public override bool Equals(object b) => b is Cell c && Equals(c);
        public override int GetHashCode() => x*397 ^ y;
    }
    public enum SkillKind { None, Combo, Heavy, Shield }
    public enum EffectKind { Speed, Damage, ComboDamage, HeavyDamage, OpeningShield, SkillShield }
    public enum Phase { Preparation, Battle, Won, Lost, Complete }
    [Serializable] public class Shape { public Cell[] cells; }
    [Serializable] public class PieceDefinition
    {
        public string id, displayName, description, targetCat;
        public bool isCat;
        public int price, damage, intervalTicks, skillEvery=3, skillValue;
        public SkillKind skill;
        public EffectKind effect;
        public int effectValue;
        public Shape[] poses;
    }
    [Serializable] public class StageDefinition
    {
        public string id, displayName, hint;
        public int enemyHP, enemyDamage, enemyIntervalTicks=30000, playerHP=40, limitTicks=250000, reward=6;
        public bool advancedShop;
        public string[] shop;
    }
    [Serializable] public class GameDefinition
    {
        public string version="demo-4-v1";
        public int initialGold=10, initialSize=4;
        public string initialCatId="noodle";
        public int[] expansionPrices=new[]{8,12};
        public PieceDefinition[] pieces;
        public StageDefinition[] stages;
        public PieceDefinition Piece(string id) => pieces.First(p=>p.id==id);
    }
    [Serializable] public class OwnedPiece
    {
        public string instanceId, definitionId;
        public int paid, pose, rotation, x, y;
        public bool onBoard;
    }
    [Serializable] public class RunState
    {
        public int schema=1, stage, gold, boardSize, refreshes, shelfOffset, nextId=1;
        public string runId, rulesVersion;
        public Phase phase;
        public bool goldAdUsed, reviveUsed, revivedBattle, lossTimedOut;
        public List<OwnedPiece> pieces=new List<OwnedPiece>();
        public List<string> shelf=new List<string>();
        public List<string> transactions=new List<string>();
    }
    public static class BoardRules
    {
        public static Cell[] Shape(PieceDefinition d, int pose, int rotation)
        {
            var cells=d.poses[pose].cells.Select(c=>c).ToArray();
            for(int r=0;r<rotation%4;r++) cells=cells.Select(c=>new Cell(-c.y,c.x)).ToArray();
            int minX=cells.Min(c=>c.x), minY=cells.Min(c=>c.y);
            return cells.Select(c=>new Cell(c.x-minX,c.y-minY)).ToArray();
        }
        public static Cell[] Cells(GameDefinition d, OwnedPiece p) => Shape(d.Piece(p.definitionId),p.pose,p.rotation).Select(c=>new Cell(c.x+p.x,c.y+p.y)).ToArray();
        public static bool CanPlace(GameDefinition d, RunState s, OwnedPiece p, int x, int y, int pose, int rotation)
        {
            var cells=Shape(d.Piece(p.definitionId),pose,rotation).Select(c=>new Cell(c.x+x,c.y+y)).ToArray();
            if(cells.Any(c=>c.x<0||c.y<0||c.x>=s.boardSize||c.y>=s.boardSize)) return false;
            var occupied=new HashSet<Cell>(s.pieces.Where(o=>o.onBoard&&o.instanceId!=p.instanceId).SelectMany(o=>Cells(d,o)));
            return !cells.Any(occupied.Contains);
        }
        public static bool Adjacent(GameDefinition d, OwnedPiece a, OwnedPiece b) => Cells(d,a).Any(c=>Cells(d,b).Any(e=>Math.Abs(c.x-e.x)+Math.Abs(c.y-e.y)==1));
    }
    public class CatStats
    {
        public string instanceId, name;
        public List<string> connectionInstanceIds=new List<string>();
        public int damage, interval, count, next, skillEvery, skillValue, comboBonus, heavyBonus, skillShield, openingShield;
        public SkillKind skill;
        public List<string> connections=new List<string>();
    }
    public static class SynergyRules
    {
        public static List<CatStats> Resolve(GameDefinition d, RunState s)
        {
            var result=new List<CatStats>();
            foreach(var cat in s.pieces.Where(p=>p.onBoard&&d.Piece(p.definitionId).isCat))
            {
                var def=d.Piece(cat.definitionId);
                var c=new CatStats{instanceId=cat.instanceId,name=def.displayName,damage=def.damage,interval=def.intervalTicks,skill=def.skill,skillEvery=def.skillEvery,skillValue=def.skillValue};
                int speed=0;
                foreach(var item in s.pieces.Where(p=>p.onBoard&&!d.Piece(p.definitionId).isCat&&BoardRules.Adjacent(d,cat,p)).GroupBy(p=>p.definitionId).Select(g=>g.First()))
                {
                    var effect=d.Piece(item.definitionId);
                    if(!string.IsNullOrEmpty(effect.targetCat)&&effect.targetCat!=cat.definitionId) continue;
                    c.connections.Add(effect.displayName); c.connectionInstanceIds.Add(item.instanceId);
                    switch(effect.effect)
                    {
                        case EffectKind.Speed: speed+=effect.effectValue; break;
                        case EffectKind.Damage: c.damage+=effect.effectValue; break;
                        case EffectKind.ComboDamage: c.comboBonus+=effect.effectValue; break;
                        case EffectKind.HeavyDamage: c.heavyBonus+=effect.effectValue; break;
                        case EffectKind.OpeningShield: c.openingShield+=effect.effectValue; break;
                        case EffectKind.SkillShield: c.skillShield+=effect.effectValue; break;
                    }
                }
                c.interval=(int)Math.Round(c.interval*100.0/(100+speed)); c.next=c.interval; result.Add(c);
            }
            return result;
        }
    }
}
