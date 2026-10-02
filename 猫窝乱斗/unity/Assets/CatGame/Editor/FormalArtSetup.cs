using System;
using System.IO;
using System.Linq;
using CatGame.Runtime;
using UnityEditor;
using UnityEngine;

namespace CatGame.Editor
{
    public static class FormalArtSetup
    {
        const string ArtFolder="Assets/CatGame/Resources/Art";
        const string AnimationFolder=ArtFolder+"/Animation";
        const string ContentPath="Assets/CatGame/Resources/GameContent.asset";

        [MenuItem("Cat Game/Apply Formal Art")]
        public static void Apply()
        {
            AssetDatabase.Refresh();
            foreach(var path in Directory.GetFiles(ArtFolder,"*.png").Select(p=>p.Replace('\\','/')))
            {
                var importer=AssetImporter.GetAtPath(path) as TextureImporter;
                if(importer==null)continue;
                importer.textureType=TextureImporterType.Sprite;
                importer.spriteImportMode=SpriteImportMode.Single;
                importer.alphaIsTransparency=true;
                importer.mipmapEnabled=false;
                importer.wrapMode=TextureWrapMode.Clamp;
                importer.filterMode=FilterMode.Bilinear;
                importer.textureCompression=TextureImporterCompression.Uncompressed;
                importer.maxTextureSize=2048;
                string name=Path.GetFileNameWithoutExtension(path);
                importer.spriteBorder=BorderFor(name);
                importer.SaveAndReimport();
            }
            if(Directory.Exists(AnimationFolder))
            foreach(var path in Directory.GetFiles(AnimationFolder,"*.png",SearchOption.AllDirectories).Select(p=>p.Replace('\\','/')))
            {
                var importer=AssetImporter.GetAtPath(path) as TextureImporter;
                if(importer==null)continue;
                importer.textureType=TextureImporterType.Sprite;
                importer.spriteImportMode=SpriteImportMode.Single;
                importer.alphaIsTransparency=true;
                importer.mipmapEnabled=false;
                importer.wrapMode=TextureWrapMode.Clamp;
                importer.filterMode=FilterMode.Bilinear;
                importer.textureCompression=TextureImporterCompression.Uncompressed;
                importer.maxTextureSize=1024;
                importer.SaveAndReimport();
            }

            var content=AssetDatabase.LoadAssetAtPath<GameContent>(ContentPath);
            if(content==null)throw new InvalidOperationException("GameContent missing: run Cat Game/Set Up Four Stage Demo first.");
            content.visuals=Directory.GetFiles(ArtFolder,"*.png")
                .Select(p=>p.Replace('\\','/'))
                .OrderBy(p=>p)
                .Select(p=>new VisualEntry{id=Path.GetFileNameWithoutExtension(p),sprite=AssetDatabase.LoadAssetAtPath<Sprite>(p)})
                .ToArray();
            EditorUtility.SetDirty(content);
            AssetDatabase.SaveAssets();
            Debug.Log("Applied "+content.visuals.Length+" formal art sprites.");
        }

        static Vector4 BorderFor(string name)
        {
            // ui_panel is reserved for the 74–88 px header/enemy cards.
            // Thin text strips use ui_shop_normal, whose 8 px vertical borders fit 21 px.
            if(name=="ui_panel")return new Vector4(50,20,50,20);
            if(name.StartsWith("ui_button_")||name.StartsWith("ui_shop_"))return new Vector4(32,8,32,8);
            if(name.StartsWith("ui_cell_"))return new Vector4(24,24,24,24);
            return Vector4.zero;
        }
    }
}
