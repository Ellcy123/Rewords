using UnityEditor;
using UnityEngine;
namespace CatGame.Editor
{
    public sealed class PaperTrialImport : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            if(assetPath!="Assets/CatGame/Resources/UiTrial/b_paper_primary.png")return;
            var t=(TextureImporter)assetImporter;
            t.textureType=TextureImporterType.Sprite;
            t.spriteImportMode=SpriteImportMode.Single;
            t.spritePixelsPerUnit=200;
            t.spriteBorder=new Vector4(36,16,36,16);
            t.alphaIsTransparency=true;t.mipmapEnabled=false;
            t.wrapMode=TextureWrapMode.Clamp;t.filterMode=FilterMode.Bilinear;
            t.textureCompression=TextureImporterCompression.Uncompressed;
        }
    }
}
