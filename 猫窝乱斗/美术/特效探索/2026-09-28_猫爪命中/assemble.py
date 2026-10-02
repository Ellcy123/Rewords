from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parent
im = Image.open(root/'01_原始六帧.png').convert('RGBA')
w,h = im.width//3,im.height//2
frames=[]
for i in range(6):
    x,y=(i%3)*w,(i//3)*h
    f=im.crop((x,y,x+w,y+h))
    f.save(root/f'frame_{i+1:02}.png')
    # Display backdrop only; original PNG alpha is preserved in frame files.
    bg=Image.new('RGBA',(w,h),(65,88,104,255))
    frames.append(Image.alpha_composite(bg,f).convert('RGB'))
frames.append(Image.new('RGB',(w,h),(65,88,104)))
strip=Image.new('RGB',(w*7,h))
for i,f in enumerate(frames): strip.paste(f,(i*w,0))
palette=strip.quantize(colors=256)
indexed=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
duration=[40,50,70,60,70,90,800]
for name,times in [('02_正常速度.gif',duration),('03_慢放.gif',[v*3 if i<6 else v for i,v in enumerate(duration)])]:
    indexed[0].save(root/name,save_all=True,append_images=indexed[1:],duration=times,loop=0,disposal=2,optimize=False)
(root/'frames.json').write_text(json.dumps({'frame_size':[w,h],'effect_ms':sum(duration[:6]),'pause_ms':duration[6],'durations_ms':duration,'source':'Codex built-in generated 3x2 sheet','processing':'equal cell crops; original alpha retained; blue-gray backdrop for GIF only; no alignment, warping or interpolation'},ensure_ascii=False,indent=2))
print(root/'02_正常速度.gif')
