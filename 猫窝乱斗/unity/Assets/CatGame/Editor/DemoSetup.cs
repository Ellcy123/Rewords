using System;
using System.IO;
using CatGame.Core;
using CatGame.Runtime;
using CatGame.Presentation;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;
namespace CatGame.Editor
{
    public static class DemoSetup
    {
        public const string ScenePath="Assets/CatGame/Scenes/CatRun.unity";
        static Shape Shape(params int[] xy) { var cells=new Cell[xy.Length/2];for(int i=0;i<cells.Length;i++)cells[i]=new Cell(xy[i*2],xy[i*2+1]);return new Shape{cells=cells}; }
        public static GameDefinition Defaults()
        {
            var two=Shape(0,0,1,0);var one=Shape(0,0);
            return new GameDefinition{pieces=new[]{
                new PieceDefinition{id="noodle",displayName="面条",description="每 3 次攻击：额外连击 2 次",isCat=true,price=6,damage=4,intervalTicks=20000,skill=SkillKind.Combo,skillValue=2,poses=new[]{Shape(0,0,1,0,2,0),Shape(0,0,1,0,0,1)}},
                new PieceDefinition{id="hammer",displayName="锤锤",description="每 3 次攻击：双倍重击",isCat=true,price=6,damage=9,intervalTicks=30000,skill=SkillKind.Heavy,skillValue=2,poses=new[]{Shape(0,0,1,0,2,0,3,0),Shape(0,0,1,0,0,1,1,1)}},
                new PieceDefinition{id="pillow",displayName="枕头",description="每 3 次攻击：全队护盾 +6",isCat=true,price=5,damage=2,intervalTicks=25000,skill=SkillKind.Shield,skillValue=6,poses=new[]{two}},
                new PieceDefinition{id="feather",displayName="羽毛逗猫棒",description="相邻猫攻击速度 +60%",price=3,effect=EffectKind.Speed,effectValue=60,poses=new[]{two}},
                new PieceDefinition{id="bell",displayName="哑铃铛",description="相邻猫每次攻击 +2",price=3,effect=EffectKind.Damage,effectValue=2,poses=new[]{one}},
                new PieceDefinition{id="mouse",displayName="发条鼠",description="相邻面条连击时额外伤害 +8",targetCat="noodle",price=4,effect=EffectKind.ComboDamage,effectValue=8,poses=new[]{two}},
                new PieceDefinition{id="fish",displayName="小鱼干",description="相邻锤锤重击伤害 +6",targetCat="hammer",price=4,effect=EffectKind.HeavyDamage,effectValue=6,poses=new[]{one}},
                new PieceDefinition{id="cushion",displayName="旧软垫",description="每只相邻猫提供开场护盾 +6",price=3,effect=EffectKind.OpeningShield,effectValue=6,poses=new[]{two}},
                new PieceDefinition{id="lamp",displayName="歪头夜灯",description="相邻猫每次技能：护盾 +2",price=4,effect=EffectKind.SkillShield,effectValue=2,poses=new[]{one}}
            },stages=new[]{
                new StageDefinition{id="under-bed",displayName="床底的手",enemyHP=32,enemyDamage=3,hint="买逗猫棒，贴着面条放：攻击会更快。",shop=new[]{"feather","",""}},
                new StageDefinition{id="clock",displayName="倒走闹钟",enemyHP=50,enemyDamage=4,hint="哑铃铛贴着猫放，每一击都更疼。",shop=new[]{"bell","feather",""}},
                new StageDefinition{id="wardrobe",displayName="衣柜长影",enemyHP=70,enemyDamage=5,hint="发条鼠贴着面条，连击会追加伤害。",shop=new[]{"mouse","bell","feather"}},
                new StageDefinition{id="dream-eater",displayName="偷梦的客人",enemyHP=160,enemyDamage=6,enemyIntervalTicks=25000,hint="新猫上架！可换姿势、买格子，让用品同时连到多只猫。",advancedShop=true,shop=new[]{"hammer","pillow","cushion","fish","lamp","feather","bell","mouse","noodle"}}
            }};
        }
        [MenuItem("Cat Game/Set Up Four Stage Demo")]
        public static void Create()
        {
            Directory.CreateDirectory("Assets/CatGame/Resources");Directory.CreateDirectory("Assets/CatGame/Scenes");
            const string path="Assets/CatGame/Resources/GameContent.asset";
            var content=AssetDatabase.LoadAssetAtPath<GameContent>(path);
            if(content==null){content=ScriptableObject.CreateInstance<GameContent>();content.definition=Defaults();AssetDatabase.CreateAsset(content,path);}
            ContentRules.Validate(content.definition);
            var font=AssetDatabase.LoadAssetAtPath<Font>("Assets/CatGame/Fonts/NotoSansSC.ttf");if(font!=null)content.font=font;
            EditorUtility.SetDirty(content);
            FormalArtSetup.Apply();
            if(!File.Exists(ScenePath))
            {
                var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
                new GameObject("Cat Game").AddComponent<GameRoot>().content=content;
                EditorSceneManager.SaveScene(scene,ScenePath);
            }
            PlayerSettings.companyName="CatDemo";PlayerSettings.productName="猫窝乱斗 Demo";
            PlayerSettings.defaultScreenWidth=540;PlayerSettings.defaultScreenHeight=960;PlayerSettings.resizableWindow=true;
            PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.defaultInterfaceOrientation=UIOrientation.Portrait;
            EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};AssetDatabase.SaveAssets();
        }
        [MenuItem("Cat Game/Build Four Stage Demo")]
        public static void Build()
        {
            if(!File.Exists(ScenePath))throw new Exception("Run Cat Game/Set Up Four Stage Demo first");
            var content=AssetDatabase.LoadAssetAtPath<GameContent>("Assets/CatGame/Resources/GameContent.asset");
            if(content==null)throw new Exception("GameContent missing");
            ContentRules.Validate(content.definition);
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},locationPathName="../Builds/CatDemo.app",target=BuildTarget.StandaloneOSX,options=BuildOptions.Development});
            if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Build failed: "+report.summary.result);
            const string notices="../Builds/ThirdPartyNotices";
            Directory.CreateDirectory(notices);
            File.Copy("Assets/CatGame/Fonts/OFL.txt",Path.Combine(notices,"NotoSansSC-OFL.txt"),true);
        }
    }
}
