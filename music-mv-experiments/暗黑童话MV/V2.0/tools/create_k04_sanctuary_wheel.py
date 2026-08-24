from pathlib import Path
import math
import random

from PIL import Image, ImageDraw, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ("E03_石化神殿_GPT图生图_V0.1.png", (636, 34, 400, 180), "eye"),
    ("E04_缝合实验室_GPT图生图_V0.1.png", (1150, 205, 330, 180), "stitch"),
    ("E05_永劫循环领域_GPT图生图_V0.1.png", (1088, 595, 330, 180), "clock"),
    ("E06_海妖之崖_GPT图生图_V0.1.png", (254, 595, 330, 180), "wave"),
    ("E07_龙之宝库_GPT图生图_V0.1.png", (192, 205, 330, 180), "crown"),
]
ASSET_DIR = ROOT / "references/midjourney/selected"
OUTPUT = ROOT / "keyframes/composited_candidates/K04_五圣地心跳轮盘_V0.1.png"

W, H = 1672, 941
CENTER = (836, 472)
WINE = (157, 23, 39, 255)
RED = (218, 39, 54, 255)
BONE = (237, 228, 193, 255)
GOLD = (181, 145, 72, 255)
INK = (8, 12, 12, 255)


def add_card(canvas, source_name, box, symbol, index):
    x, y, cw, ch = box
    image = Image.open(ASSET_DIR / source_name).convert("RGBA")
    scale = max(cw / image.width, ch / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (image.width - cw) // 2
    top = (image.height - ch) // 2
    image = image.crop((left, top, left + cw, top + ch))
    image = ImageEnhance.Brightness(image).enhance(0.75)
    image = ImageEnhance.Contrast(image).enhance(1.18)
    canvas.alpha_composite(image, (x, y))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((x - 7, y - 7, x + cw + 7, y + ch + 7), radius=14, outline=BONE, width=3)
    draw.rounded_rectangle((x - 13, y - 13, x + cw + 13, y + ch + 13), radius=19, outline=WINE, width=5)
    draw.line((x - 10, y + ch + 17, x + cw + 10, y + ch + 17), fill=(237, 228, 193, 115), width=2)

    cx, cy = x + 31, y + 31
    draw.ellipse((cx - 23, cy - 23, cx + 23, cy + 23), fill=INK, outline=GOLD, width=3)
    if symbol == "eye":
        draw.ellipse((cx - 13, cy - 7, cx + 13, cy + 7), outline=BONE, width=3)
        draw.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=RED)
    elif symbol == "stitch":
        draw.arc((cx - 15, cy - 12, cx, cy + 12), 245, 110, fill=BONE, width=3)
        draw.arc((cx, cy - 12, cx + 15, cy + 12), 70, 295, fill=BONE, width=3)
        for dx in (-7, 0, 7):
            draw.line((cx + dx, cy - 6, cx + dx - 4, cy + 6), fill=RED, width=2)
    elif symbol == "clock":
        draw.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), outline=BONE, width=3)
        draw.arc((cx - 19, cy - 19, cx + 19, cy + 19), 30, 214, fill=RED, width=3)
        draw.line((cx, cy, cx + 8, cy - 7), fill=BONE, width=3)
    elif symbol == "wave":
        for dy in (-7, 0, 7):
            draw.arc((cx - 15, cy - 8 + dy, cx + 15, cy + 8 + dy), 195, 345, fill=BONE if dy == 0 else (180, 193, 209, 230), width=2)
    elif symbol == "crown":
        points = [(cx - 14, cy + 10), (cx - 13, cy - 8), (cx - 5, cy - 1), (cx, cy - 15), (cx + 5, cy - 1), (cx + 13, cy - 8), (cx + 14, cy + 10)]
        draw.line(points, fill=BONE, width=3, joint="curve")
        draw.line((cx - 14, cy + 10, cx + 14, cy + 10), fill=RED, width=3)

    # A nonverbal order marker, intentionally unreadable as text.
    mark_x = x + cw - 28
    draw.rectangle((mark_x - 10, y + 20, mark_x + 10, y + 40), outline=(237, 228, 193, 160), width=2)
    draw.line((mark_x - 16, y + 30, mark_x + 16, y + 30), fill=RED, width=2)


def main():
    random.seed(7)
    canvas = Image.new("RGBA", (W, H), (7, 12, 12, 255))
    draw = ImageDraw.Draw(canvas)

    # Printed-paper noise and a cold geometric field.
    for _ in range(1700):
        x, y = random.randrange(W), random.randrange(H)
        shade = random.randrange(12, 31)
        draw.point((x, y), fill=(shade, shade + 7, shade + 5, random.randrange(45, 120)))
    for offset in range(-H, W, 74):
        draw.line((offset, H, offset + H, 0), fill=(178, 159, 111, 34), width=1)

    # Five incoming trajectory lines behind the cards and map.
    for i, (_, box, _) in enumerate(SOURCES):
        x, y, cw, ch = box
        px, py = x + cw / 2, y + ch / 2
        draw.line((px, py, CENTER[0], CENTER[1]), fill=(237, 228, 193, 76), width=2)
        draw.line((px + 8, py + 8, CENTER[0], CENTER[1]), fill=(157, 23, 39, 122), width=4)

    # The central map wheel; no readable type, only targets, path lines and rings.
    for radius, color, stroke in [(238, (237, 228, 193, 70), 2), (198, WINE, 6), (160, GOLD, 3), (108, (237, 228, 193, 150), 2), (62, RED, 4)]:
        draw.ellipse((CENTER[0] - radius, CENTER[1] - radius, CENTER[0] + radius, CENTER[1] + radius), outline=color, width=stroke)
    for angle in range(0, 360, 36):
        rad = math.radians(angle - 90)
        x1 = CENTER[0] + math.cos(rad) * 204
        y1 = CENTER[1] + math.sin(rad) * 204
        x2 = CENTER[0] + math.cos(rad) * 232
        y2 = CENTER[1] + math.sin(rad) * 232
        draw.line((x1, y1, x2, y2), fill=GOLD, width=3)
    for angle in (270, 342, 54, 126, 198):
        rad = math.radians(angle - 90)
        x = CENTER[0] + math.cos(rad) * 198
        y = CENTER[1] + math.sin(rad) * 198
        draw.ellipse((x - 17, y - 17, x + 17, y + 17), fill=INK, outline=BONE, width=3)
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=RED)
    draw.ellipse((CENTER[0] - 33, CENTER[1] - 33, CENTER[0] + 33, CENTER[1] + 33), fill=INK, outline=GOLD, width=4)
    draw.ellipse((CENTER[0] - 12, CENTER[1] - 12, CENTER[0] + 12, CENTER[1] + 12), fill=RED)
    draw.line((CENTER[0] - 55, CENTER[1], CENTER[0] + 55, CENTER[1]), fill=BONE, width=3)
    draw.line((CENTER[0], CENTER[1] - 55, CENTER[0], CENTER[1] + 55), fill=BONE, width=3)

    for index, (source, box, symbol) in enumerate(SOURCES):
        add_card(canvas, source, box, symbol, index)

    # Interrupted outer frame gives the whole still its editorial title-card energy without text.
    frame = ImageDraw.Draw(canvas)
    segments = [(38, 40, 455, 40), (1218, 40, 1634, 40), (38, 901, 455, 901), (1218, 901, 1634, 901)]
    for line in segments:
        frame.line(line, fill=(237, 228, 193, 150), width=3)
        frame.line((line[0], line[1] + 8, line[2], line[3] + 8), fill=WINE, width=3)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, quality=95)


if __name__ == "__main__":
    main()
