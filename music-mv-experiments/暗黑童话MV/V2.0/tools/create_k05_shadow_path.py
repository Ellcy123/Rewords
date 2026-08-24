from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "references/midjourney/selected/E02_王都阴影棋盘广场_GPT图生图_V0.1.png"
KNIGHT = ROOT.parent / "references/characters/骑士_角色参考图_01.png"
OUTPUT = ROOT / "keyframes/composited_candidates/K05_跟我走_阴影路径_V0.1.png"


def layer_line(draw, points, fill, width):
    draw.line(points, fill=fill, width=width, joint="curve")


def main():
    base = Image.open(BACKGROUND).convert("RGBA")
    width, height = base.size
    ui = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(ui)

    # A flattened safe-shadow lane, intentionally graphic rather than volumetric.
    draw.polygon(
        [(0, 805), (250, 754), (478, 742), (670, 760), (930, 720), (1230, 730), (width, 688), (width, height), (0, height)],
        fill=(4, 7, 7, 96),
    )
    layer_line(draw, [(0, 804), (250, 753), (478, 741), (670, 759), (930, 719), (1230, 729), (width, 687)], (170, 23, 38, 190), 4)
    layer_line(draw, [(0, 816), (250, 765), (478, 753), (670, 771), (930, 731), (1230, 741), (width, 699)], (232, 224, 193, 120), 2)

    # Floor-lock UI rings under the future walking key pose.
    center = (570, 803)
    for radius, color, stroke in [
        (122, (232, 224, 193, 190), 3),
        (92, (123, 18, 33, 220), 5),
        (61, (232, 224, 193, 155), 2),
    ]:
        draw.ellipse((center[0] - radius, center[1] - radius * 0.37, center[0] + radius, center[1] + radius * 0.37), outline=color, width=stroke)
    draw.arc((center[0] - 144, center[1] - 54, center[0] + 144, center[1] + 54), 198, 338, fill=(212, 36, 49, 240), width=8)
    draw.arc((center[0] - 134, center[1] - 50, center[0] + 134, center[1] + 50), 18, 154, fill=(240, 231, 195, 180), width=3)

    # Cold scan bars, broken red routing line and small non-verbal UI markers.
    for y, alpha, x2 in [(464, 118, 1018), (484, 170, 1120), (504, 92, 960)]:
        draw.line((80, y, x2, y), fill=(233, 235, 217, alpha), width=2)
    layer_line(draw, [(512, 523), (728, 494), (925, 472), (1102, 403), (1292, 421)], (135, 17, 31, 230), 5)
    for x, y in [(728, 494), (925, 472), (1102, 403), (1292, 421)]:
        draw.ellipse((x - 9, y - 9, x + 9, y + 9), outline=(236, 222, 178, 210), width=3)
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(151, 21, 33, 255))
    for x, y in [(96, 447), (1070, 346), (1414, 467)]:
        draw.rectangle((x, y, x + 18, y + 18), outline=(234, 223, 186, 170), width=2)
        draw.line((x - 10, y + 9, x + 28, y + 9), fill=(135, 17, 31, 190), width=2)

    # The cape's abstract trail: an editorial red line, not a simulated motion blur.
    layer_line(draw, [(521, 510), (630, 474), (783, 455), (960, 382), (1170, 344)], (111, 15, 27, 125), 16)
    layer_line(draw, [(521, 510), (630, 474), (783, 455), (960, 382), (1170, 344)], (185, 27, 40, 240), 5)
    layer_line(draw, [(526, 521), (642, 486), (795, 468), (969, 396)], (242, 229, 194, 160), 2)

    # Three oblique panel cuts establish the Editorial MG language.
    for offset in (0, 130, 260):
        draw.line((950 + offset, 220, 775 + offset, 560), fill=(239, 229, 192, 85), width=2)

    base = Image.alpha_composite(base, ui)
    knight = Image.open(KNIGHT).convert("RGBA")
    knight = knight.resize((254, 360), Image.Resampling.LANCZOS)

    # Posed as a locked key frame in the shadow lane; keep original character art untouched.
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse((460, 760, 690, 832), fill=(0, 0, 0, 130))
    base = Image.alpha_composite(base, shadow)
    base.alpha_composite(knight, (445, 430))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OUTPUT, quality=95)


if __name__ == "__main__":
    main()
