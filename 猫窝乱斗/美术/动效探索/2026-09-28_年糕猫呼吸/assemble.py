"""Equal-cell slicing and integer translation only; no invented in-between frames."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
sheet = Image.open(ROOT / '02_白底图集.png').convert('RGBA')
white = Image.new('RGBA', sheet.size, 'white')
sheet = Image.alpha_composite(white, sheet).convert('RGB')
w, h = sheet.width // 3, sheet.height // 2
raw = [sheet.crop((c*w, r*h, (c+1)*w, (r+1)*h)) for r in range(2) for c in range(3)]
durations = [400, 300, 300, 400, 300, 300]

def gif(frames, name):
    # Shared palette prevents avoidable palette flickering.
    fw, fh = frames[0].size
    strip = Image.new('RGB', (fw*6, fh), 'white')
    for i, im in enumerate(frames):
        strip.paste(im, (i*fw, 0))
    palette = strip.quantize(colors=255)
    seq = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in frames]
    seq[0].save(ROOT/name, save_all=True, append_images=seq[1:], duration=durations, loop=0, disposal=2, optimize=False)

gif(raw, '03_等格直切_对照.gif')
# Match a fixed face region to frame 1; only translate full frames, never scale/warp.
arr = [np.asarray(im.convert('L'), dtype=np.float32) for im in raw]
box = (40, 270, 235, 400)
x0,y0,x1,y1 = box
template = arr[0][y0:y1,x0:x1]
aligned, offsets = [], []
for idx, a in enumerate(arr):
    def score(dx,dy,step):
        patch = a[y0-dy:y1-dy:step,x0-dx:x1-dx:step]
        target = template[::step,::step]
        if patch.shape != target.shape:
            return float('inf')
        return float(np.mean((patch-target)**2))
    if idx == 0:
        dx,dy = 0,0
    else:
        _,dx,dy = min((score(x,y,4),x,y) for x in range(-32,37,4) for y in range(-16,89,4))
        _,dx,dy = min((score(x,y,1),x,y) for x in range(dx-3,dx+4) for y in range(dy-3,dy+4))
    im = Image.new('RGB',(w+96,h+96),'white')
    im.paste(raw[idx],(dx+32,dy+16))
    raw[idx].save(ROOT/f'raw_{idx+1:02}.png')
    im.save(ROOT/f'frame_{idx+1:02}.png')
    aligned.append(im)
    offsets.append({'frame':idx+1,'dx':dx,'dy':dy,'duration_ms':durations[idx]})
gif(aligned,'04_头部对齐_呼吸预览.gif')
aw,ah = aligned[0].size
contact = Image.new('RGB',(aw*3,ah*2),'white')
for i,im in enumerate(aligned):
    contact.paste(im,((i%3)*aw,(i//3)*ah))
contact.save(ROOT/'05_对齐图集.png')
(ROOT/'frames.json').write_text(json.dumps({'cell':[w,h],'output_frame':[aw,ah],'common_padding':[32,16],'loop_ms':sum(durations),'alignment':'integer translation matched on fixed face ROI; no deformation or interpolation','frames':offsets},ensure_ascii=False,indent=2))
print(json.dumps(offsets))
