from pathlib import Path
from PIL import Image, ImageDraw
import random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "导出/首批正式资产/UI"
OUT.mkdir(parents=True, exist_ok=True)

INK = (49, 42, 43, 255)
PAPER = (244, 237, 218, 255)
PAPER_LIGHT = (250, 246, 232, 255)
AMBER = (226, 168, 67, 255)
ORANGE = (190, 104, 55, 255)
MUTED = (144, 148, 154, 255)
MUTED_DARK = (91, 92, 101, 255)
TEAL = (68, 146, 137, 255)
CORAL = (197, 85, 73, 255)
BROWN = (151, 101, 61, 255)


def cut_polygon(box, cut, wobble=0, seed=0):
    x0, y0, x1, y1 = box
    rng = random.Random(seed)
    def j(v): return v + rng.randint(-wobble, wobble) if wobble else v
    return [
        (j(x0 + cut), j(y0)), (j(x1 - cut), j(y0)),
        (j(x1), j(y0 + cut)), (j(x1), j(y1 - cut)),
        (j(x1 - cut), j(y1)), (j(x0 + cut), j(y1)),
        (j(x0), j(y1 - cut)), (j(x0), j(y0 + cut)),
    ]


def paper_texture(im, polygon, seed):
    rng = random.Random(seed)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    pix = im.load(); mp = mask.load()
    for _ in range(max(20, im.width * im.height // 350)):
        x, y = rng.randrange(im.width), rng.randrange(im.height)
        if mp[x, y]:
            r, g, b, a = pix[x, y]
            d = rng.choice((-5, -3, 3, 4))
            pix[x, y] = (max(0, min(255, r+d)), max(0, min(255, g+d)), max(0, min(255, b+d)), a)


def component(name, size, front, back, pressed=False, fold=False, disabled=False, seed=1):
    w, h = size
    im = Image.new("RGBA", size, (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    margin = max(8, round(min(size) * .085)); stroke = max(3, round(min(size) * .035))
    cut = round(min(size) * .13)
    shift_x = round(min(size) * (.035 if pressed else .055))
    shift_y = round(min(size) * (.045 if pressed else .085))
    back_poly = cut_polygon((margin+shift_x, margin+shift_y, w-margin, h-margin), cut, 1, seed)
    d.polygon(back_poly, fill=back, outline=INK, width=stroke)
    down = round(min(size)*.055) if pressed else 0
    front_poly = cut_polygon((margin, margin+down, w-margin-shift_x, h-margin-shift_y+down), cut, 1, seed+7)
    d.polygon(front_poly, fill=front, outline=INK, width=stroke)
    if fold:
        f = round(min(size)*.22)
        x0, y0 = margin+stroke, margin+down+stroke
        tri = [(x0, y0), (x0+f, y0), (x0, y0+f)]
        d.polygon(tri, fill=(232, 196, 144, 255), outline=INK)
    if disabled:
        # Three inset cut marks remain visible in grayscale and at the 30 px Unity button height.
        mark=(67,66,70,210)
        sx=round(w*.12); sy=round(h*.34); gap=round(min(size)*.13)
        for i in range(3):
            x=sx+i*gap
            d.line((x,sy,x+round(min(size)*.16),sy+round(min(size)*.28)),fill=mark,width=max(3,stroke))
    paper_texture(im, front_poly, seed+30)
    im.save(OUT / name)


component("ui_panel.png", (512,160), PAPER_LIGHT, (218,145,103,255), fold=True, seed=11)
component("ui_button_normal.png", (256,96), AMBER, ORANGE, seed=21)
component("ui_button_pressed.png", (256,96), (211,132,55,255), (151,76,48,255), pressed=True, seed=21)
component("ui_button_disabled.png", (256,96), MUTED, MUTED_DARK, disabled=True, seed=21)
component("ui_shop_normal.png", (256,96), PAPER, BROWN, seed=31)
component("ui_shop_disabled.png", (256,96), (178,177,170,255), MUTED_DARK, disabled=True, seed=31)


def cell(name, border, inner=PAPER, double=False, invalid=False, seed=1):
    size=(128,128); im=Image.new("RGBA",size,(0,0,0,0)); d=ImageDraw.Draw(im)
    outer=cut_polygon((6,6,122,122),15,1,seed)
    d.polygon(outer,fill=border,outline=INK,width=5)
    inner_poly=cut_polygon((15,15,113,113),11,1,seed+4)
    d.polygon(inner_poly,fill=inner,outline=INK,width=3)
    if double:
        mid=cut_polygon((11,11,117,117),13,0,seed)
        d.line(mid+[mid[0]],fill=border,width=4,joint="curve")
    if invalid:
        alert=cut_polygon((22,22,106,106),9,0,seed)
        d.line(alert+[alert[0]],fill=CORAL,width=6,joint="curve")
    paper_texture(im,inner_poly,seed+50); im.save(OUT/name)


cell("ui_cell_normal.png", (126,105,77,255), seed=41)
cell("ui_cell_selected.png", AMBER, double=True, seed=41)
cell("ui_cell_connected.png", TEAL, double=True, seed=41)
cell("ui_cell_invalid.png", CORAL, invalid=True, seed=41)

# Clean hidden RGB so bilinear sampling cannot pull colored fringes into transparent edges.
for path in OUT.glob("*.png"):
    im=Image.open(path).convert("RGBA")
    px=im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x,y][3] == 0:
                px[x,y] = (0,0,0,0)
    im.save(path)

print("generated", len(list(OUT.glob('*.png'))), "UI assets in", OUT)
