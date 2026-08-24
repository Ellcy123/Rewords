#!/usr/bin/env python3
"""Render timed bilingual subtitle plates over the final V2.0 picture edit."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "outputs/暗黑童话MV_V2.0_片尾眼神定格_黑屏版_V0.2.mp4"
PLATE_DIR = ROOT / "subtitles/plates"
OUTPUT = ROOT / "outputs/暗黑童话MV_V2.0_中英双语字幕_片尾定格黑屏版.mp4"
WIDTH, HEIGHT = 1376, 768
CN_FONT = "/System/Library/AssetsV2/com_apple_MobileAsset_Font7/3419f2a427639ad8c8e139149a287865a90fa17e.asset/AssetData/PingFang.ttc"
EN_FONT = "/System/Library/Fonts/Supplemental/Georgia.ttf"

# Times are locked to the selected 79.83-second picture edit.
CUES = [
    (0.35, 4.50, "月光落下。", "The moonlight falls."),
    (4.50, 7.18, "嘘，别抬头。", "Hush. Don't look up."),
    (8.67, 14.44, "王国无名，", "The kingdom has no name."),
    (14.44, 17.79, "所有人睡去，", "Everyone has fallen asleep."),
    (18.50, 24.00, "只有我还睁着眼睛。", "Only I still keep my eyes open."),
    (24.45, 28.80, "龙把公主锁在尽头，", "The dragon locked the princess at the end."),
    (28.92, 33.64, "五座圣地，门门无声。", "Five sacred places. Every door is silent."),
    (33.91, 38.48, "跟我走，穿过月光，", "Follow me, through the moonlight."),
    (39.32, 43.64, "踩着影子，别出声响。", "Step on the shadows. Don't make a sound."),
    (44.64, 49.80, "我在尽头等你，", "I'll wait for you at the end."),
    (50.21, 54.70, "等你叫出她的名字。", "Until you call out her name."),
    (55.30, 60.14, "跟我走，不要回头，", "Follow me. Don't look back."),
    (60.66, 64.86, "月光正爬上你的手。", "The moonlight is crawling up your hand."),
    (65.34, 69.33, "公主真的存在吗？", "Does the princess really exist?"),
    (69.65, 75.60, "醒着的……真的是我吗？", "Am I really the one who's awake?"),
    (75.60, 78.05, "嘘——它看见你了。", "Hush — it sees you."),
]


def centered_box(draw, text, font, y, fill, stroke, stroke_width):
    box = draw.textbbox((0, 0), text, font=font, stroke_width=stroke_width)
    x = (WIDTH - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke)


def make_plate(index, cn, en):
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    cn_font = ImageFont.truetype(CN_FONT, 42)
    en_font = ImageFont.truetype(EN_FONT, 28)

    # A restrained dark plaque gives readability without turning the video into a lyric card.
    cn_box = draw.textbbox((0, 0), cn, font=cn_font, stroke_width=3)
    en_box = draw.textbbox((0, 0), en, font=en_font, stroke_width=2)
    text_width = max(cn_box[2] - cn_box[0], en_box[2] - en_box[0])
    left = (WIDTH - text_width) // 2 - 54
    right = (WIDTH + text_width) // 2 + 54
    draw.rounded_rectangle((left, 594, right, 718), radius=18, fill=(7, 9, 14, 156))
    draw.line((left + 28, 654, right - 28, 654), fill=(165, 30, 38, 155), width=2)
    centered_box(draw, cn, cn_font, 605, (248, 243, 232, 255), (18, 15, 18, 255), 3)
    centered_box(draw, en, en_font, 663, (215, 231, 244, 255), (18, 15, 18, 255), 2)
    path = PLATE_DIR / f"{index:02d}.png"
    image.save(path)
    return path


def main():
    PLATE_DIR.mkdir(parents=True, exist_ok=True)
    plates = [make_plate(index, cue[2], cue[3]) for index, cue in enumerate(CUES, start=1)]

    command = ["ffmpeg", "-y", "-i", str(SOURCE)]
    for plate in plates:
        command.extend(["-loop", "1", "-framerate", "24", "-i", str(plate)])

    filters = []
    previous = "0:v"
    for index, (start, end, _, _) in enumerate(CUES, start=1):
        fade_in = 0.18
        fade_out = 0.20
        out_start = max(start + fade_in, end - fade_out)
        plate_name = f"plate{index}"
        video_name = f"video{index}"
        filters.append(
            f"[{index}:v]format=rgba,fade=t=in:st={start:.2f}:d={fade_in:.2f}:alpha=1,"
            f"fade=t=out:st={out_start:.2f}:d={fade_out:.2f}:alpha=1[{plate_name}]"
        )
        filters.append(f"[{previous}][{plate_name}]overlay=0:0:format=auto[{video_name}]")
        previous = video_name

    command.extend([
        "-filter_complex", ";".join(filters),
        "-map", f"[{previous}]", "-map", "0:a?",
        "-t", "79.833008",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "copy", "-movflags", "+faststart", str(OUTPUT),
    ])
    subprocess.run(command, check=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
