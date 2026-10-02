"""Split generated 3x2 sheets and create review previews; preserves original alpha PNGs."""
from pathlib import Path
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parent
MANIFEST = json.loads((ROOT/'source_manifest.json').read_text())
CHAR_PREFIXES = ('cat_', 'enemy_')
PAUSE = 700

def make_gif(frames, durations, path, canvas_color):
    w,h = frames[0].size
    display=[]
    for frame in frames:
        back=Image.new('RGBA',(w,h),canvas_color)
        display.append(Image.alpha_composite(back,frame.convert('RGBA')).convert('RGB'))
    strip=Image.new('RGB',(w*len(display),h))
    for i,frame in enumerate(display): strip.paste(frame,(i*w,0))
    palette=strip.quantize(colors=255)
    seq=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in display]
    seq[0].save(path,save_all=True,append_images=seq[1:],duration=durations,loop=0,disposal=2,optimize=False)

records=[]
for spec in MANIFEST:
    dst=ROOT/spec['folder']
    dst.mkdir(parents=True,exist_ok=True)
    generated=Path(spec['source'])
    local_source=dst/'source.png'
    if generated.exists() and generated.resolve()!=local_source.resolve():
        shutil.copy2(generated,local_source)
    elif not local_source.exists():
        raise FileNotFoundError(f"Missing both generated and archived source: {spec['id']}")
    sheet=Image.open(local_source).convert('RGBA')
    if sheet.width%3 or sheet.height%2:
        raise ValueError(f"Not a 3x2 grid: {spec['id']} {sheet.size}")
    w,h=sheet.width//3,sheet.height//2
    frames=[]
    for i in range(6):
        x,y=(i%3)*w,(i//3)*h
        frame=sheet.crop((x,y,x+w,y+h))
        frame.save(dst/f'frame_{i+1:02}.png')
        frames.append(frame)
    blank=Image.new('RGBA',(w,h),(0,0,0,0))
    is_regular=spec['id'].startswith(CHAR_PREFIXES)
    bg=(245,232,206,255) if not is_regular else (84,107,123,255)
    if is_regular:
        idle=[420,420,420]
        strike=[120,80,180,350]
        make_gif(frames[:3],idle,dst/'preview_idle.gif',bg)
        make_gif([frames[3],frames[4],frames[5],frames[0]],strike,dst/'preview_attack.gif',bg)
        timing={'idle_ms':idle,'attack_ms':strike,'attack_order':[4,5,6,1]}
    else:
        motion=[80,90,110,90,100,130]
        make_gif(frames+[blank],motion+[PAUSE],dst/'preview.gif',bg)
        timing={'motion_ms':motion,'showcase_pause_ms':PAUSE}
    alpha=sheet.getchannel('A')
    rec={'id':spec['id'],'folder':spec['folder'],'source_reference':spec['ref'],'sheet_px':sheet.size,'cell_px':[w,h],
         'alpha_extrema':alpha.getextrema(),'state':'first_pass_review','timing':timing,
         'processing':'equal-cell crop and GIF backdrop only; no inpainting, alignment, warp or retouch'}
    (dst/'frames.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2))
    (dst/'README.md').write_text(f"# {spec['id']}\n\n状态：首稿待视觉审查，未接入 Unity。`source.png` 为 Codex 内置图像生成原图；`prompt.md` 记录实际提交文本。`frame_01.png` 至 `frame_06.png` 为等格原样裁切，保留 alpha。GIF 展示底不是游戏素材。\n\n" +
        ("[待机预览](preview_idle.gif) · [普攻预览](preview_attack.gif)" if is_regular else "[动作／特效预览](preview.gif)") +
        " · [帧时序](frames.json)。\n\n生成器对透明底、安全留白和角色一致性可能有偏差；当前只是候选序列帧，不宣称可直接量产或导入。\n")
    records.append(rec)
(ROOT/'build_index.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print(f"Built {len(records)} asset folders")
