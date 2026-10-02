using UnityEditor;
using UnityEngine;
namespace CatGame.Editor
{
    public sealed class WebUiImport : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            if(!assetPath.StartsWith("Assets/CatGame/Resources/WebUi/"))return;
            var t=(TextureImporter)assetImporter;
            t.textureType=TextureImporterType.Sprite;t.spriteImportMode=SpriteImportMode.Single;
            t.alphaIsTransparency=true;t.mipmapEnabled=false;t.wrapMode=TextureWrapMode.Clamp;
            t.filterMode=FilterMode.Bilinear;t.textureCompression=TextureImporterCompression.Uncompressed;
            t.spriteBorder=Vector4.zero;t.maxTextureSize=2048;
        }
    }
}
