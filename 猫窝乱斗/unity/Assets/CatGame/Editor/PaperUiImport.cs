using UnityEditor;
using UnityEngine;
namespace CatGame.Editor
{
    public sealed class PaperUiImport : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            if(!assetPath.StartsWith("Assets/CatGame/Resources/PaperUi/"))return;
            var t=(TextureImporter)assetImporter;t.textureType=TextureImporterType.Sprite;
            t.spriteImportMode=SpriteImportMode.Single;t.spritePixelsPerUnit=200;
            t.spriteBorder=assetPath.EndsWith("paper_panel.png")?new Vector4(64,32,40,48):new Vector4(36,16,36,16);
            t.alphaIsTransparency=true;t.mipmapEnabled=false;t.wrapMode=TextureWrapMode.Clamp;
            t.filterMode=FilterMode.Bilinear;t.textureCompression=TextureImporterCompression.Uncompressed;t.maxTextureSize=1024;
        }
    }
}
