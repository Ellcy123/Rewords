from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


def components(alpha: Image.Image, scale: int = 4):
    small = alpha.resize((max(1, alpha.width // scale), max(1, alpha.height // scale)))
    mask = small.point(lambda value: 255 if value > 24 else 0)
    width, height = mask.size
    pixels = mask.load()
    seen = bytearray(width * height)
    found = []

    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if seen[offset] or pixels[x, y] == 0:
                continue
            seen[offset] = 1
            queue = deque([(x, y)])
            min_x = max_x = x
            min_y = max_y = y
            size = 0
            while queue:
                cx, cy = queue.popleft()
                size += 1
                min_x = min(min_x, cx); max_x = max(max_x, cx)
                min_y = min(min_y, cy); max_y = max(max_y, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    neighbor = ny * width + nx
                    if not seen[neighbor] and pixels[nx, ny] > 0:
                        seen[neighbor] = 1
                        queue.append((nx, ny))
            if size >= 28:
                found.append((min_x * scale, min_y * scale, (max_x + 1) * scale, (max_y + 1) * scale, size))
    return sorted(found, key=lambda item: (item[1], item[0]))


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: split_asset_sheet.py <input.png> <output-dir>", file=sys.stderr)
        return 2
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    output.mkdir(parents=True, exist_ok=True)
    image = Image.open(source).convert("RGBA")
    found = components(image.getchannel("A"))
    padding = 10
    written = 0
    for index, (left, top, right, bottom, _size) in enumerate(found, start=1):
        crop = image.crop((max(0, left - padding), max(0, top - padding), min(image.width, right + padding), min(image.height, bottom + padding)))
        bbox = crop.getchannel("A").getbbox()
        if not bbox:
            continue
        crop = crop.crop(bbox)
        crop.save(output / f"asset-{index:02d}.png")
        written += 1
    print(f"split {written} assets from {source}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
