using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using CatDemo;
public static class DemoBuilder {
 [MenuItem("Cat Demo/Create First Level")]
 public static void Create(){var s=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);var camera=new GameObject("Camera").AddComponent<Camera>();camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=Color.black;new GameObject("First Level").AddComponent<FirstLevelView>();System.IO.Directory.CreateDirectory("Assets/Scenes");EditorSceneManager.SaveScene(s,"Assets/Scenes/FirstLevel.unity");PlayerSettings.companyName="CatDemo";PlayerSettings.productName="猫窝乱斗 - 第一关";PlayerSettings.defaultScreenWidth=540;PlayerSettings.defaultScreenHeight=960;PlayerSettings.resizableWindow=true;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/Scenes/FirstLevel.unity",true)};AssetDatabase.SaveAssets();}
 [System.Obsolete("Use CatGame.Editor.DemoSetup.Build")]
 public static void Build(){CatGame.Editor.DemoSetup.Build();}
}
