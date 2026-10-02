using System;
using System.Linq;
namespace CatGame.Core
{
    public static class ContentRules
    {
        public static void Validate(GameDefinition d)
        {
            if(d==null||d.pieces==null||d.stages==null||d.stages.Length==0)throw new ArgumentException("缺少猫、用品或关卡配置");
            if(d.pieces.Select(p=>p.id).Distinct().Count()!=d.pieces.Length)throw new ArgumentException("重复的内容 ID");
            if(d.initialSize!=4||d.initialGold<0||d.expansionPrices==null||d.expansionPrices.Length!=2||d.expansionPrices.Any(p=>p<0))throw new ArgumentException("开局 / 扩容配置无效");
            foreach(var p in d.pieces)
            {
                if(string.IsNullOrEmpty(p.id)||p.price<0||p.poses==null||p.poses.Length==0)throw new ArgumentException("无效内容: "+p.id);
                foreach(var pose in p.poses)
                    if(pose.cells==null||pose.cells.Length==0||pose.cells.Distinct().Count()!=pose.cells.Length||pose.cells.Any(c=>c.x<0||c.y<0))throw new ArgumentException("无效占格: "+p.id);
                if(p.isCat&&(p.intervalTicks<=0||p.skillEvery<=0||p.damage<0))throw new ArgumentException("无效猫属性: "+p.id);
                if(p.effectValue<0||p.skillValue<0)throw new ArgumentException("加成不可为负: "+p.id);
                if(!string.IsNullOrEmpty(p.targetCat)&&!d.pieces.Any(c=>c.isCat&&c.id==p.targetCat))throw new ArgumentException("无效猫筛选: "+p.id);
            }
            if(!d.pieces.Any(p=>p.id==d.initialCatId&&p.isCat))throw new ArgumentException("缺少开局猫");
            foreach(var s in d.stages)
            {
                if(s.enemyHP<=0||s.enemyIntervalTicks<=0||s.playerHP<=0||s.limitTicks<=0||s.enemyDamage<0||s.reward<0||s.shop==null||s.shop.Length==0)throw new ArgumentException("无效关卡: "+s.id);
                if(s.shop.Any(id=>!string.IsNullOrEmpty(id)&&!d.pieces.Any(p=>p.id==id)))throw new ArgumentException("商店引用了不存在的内容: "+s.id);
            }
        }
    }
}
