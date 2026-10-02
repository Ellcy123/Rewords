// Geometric packaging only: retain generated artwork and true alpha.
const sharp=require('/Users/m4/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs');
const path=require('path');
(async()=>{
  const output=path.resolve(__dirname,'../../../../unity/Assets/CatGame/Resources/PaperUi');
  fs.mkdirSync(output,{recursive:true});
  for(const [source,file,height] of [['button_layer_source.png','paper_strip.png',104],['panel_layer_source.png','paper_panel.png',200]]){
    await sharp(path.join(__dirname,source)).trim({threshold:5}).resize({height}).png().toFile(path.join(__dirname,file));
    fs.copyFileSync(path.join(__dirname,file),path.join(output,file));
  }
})();
