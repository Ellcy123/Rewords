using CatGame.Core;
using UnityEngine;
namespace CatGame.Runtime
{
    [CreateAssetMenu(menuName="Cat Game/Game Content")]
    public sealed class GameContent : ScriptableObject
    {
        public GameDefinition definition;
        public Font font;
        public VisualEntry[] visuals;
        public GameDefinition CreateRuntimeDefinition() => JsonUtility.FromJson<GameDefinition>(JsonUtility.ToJson(definition));
        public Sprite SpriteFor(string id)
        {
            if(visuals!=null)foreach(var v in visuals)if(v.id==id)return v.sprite;
            return null;
        }
        public Sprite PieceSpriteFor(string id,int pose)
        {
            var sprite=SpriteFor((IsCat(id)?"cat_":"item_")+id+(IsCat(id)?"_pose"+pose:""));
            return sprite!=null?sprite:SpriteFor(id);
        }
        public Sprite EnemySpriteFor(string stageId)
        {
            string key="enemy_"+stageId.Replace('-','_');
            var display=SpriteFor(key+"_display");
            return display!=null?display:SpriteFor(key);
        }
        bool IsCat(string id)
        {
            if(definition?.pieces!=null)foreach(var p in definition.pieces)if(p.id==id)return p.isCat;
            return false;
        }
    }
    [System.Serializable] public class VisualEntry { public string id; public Sprite sprite; }
}
