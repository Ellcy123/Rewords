"""Export reviewed frame candidates into the Unity Resources animation folder.

The six frames in each source group share one alpha-based crop rectangle. This
keeps their anchor stable while avoiding square-image padding on long cats.
Source art and review previews remain untouched.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent
TARGET = ROOT.parents[1] / 'unity/Assets/CatGame/Resources/Art/Animation'
SPECS = json.loads((ROOT / 'build_index.json').read_text())
CLAW = ROOT.parent / '特效探索/2026-09-28_猫爪命中'


def export(spec):
    name = spec['id']
    src = ROOT / spec['folder']
    if name == 'claw_hit':
        src = CLAW
    frames = [Image.open(src / f'frame_{i:02}.png').convert('RGBA') for i in range(1, 7)]
    if len({image.size for image in frames}) != 1:
        raise ValueError(f'{name}: inconsistent frame sizes')
    boxes = [image.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox() for image in frames]
    boxes = [box for box in boxes if box]
    if not boxes:
        raise ValueError(f'{name}: empty animation')
    w, h = frames[0].size
    x0 = max(0, min(box[0] for box in boxes) - 16)
    y0 = max(0, min(box[1] for box in boxes) - 16)
    x1 = min(w, max(box[2] for box in boxes) + 16)
    y1 = min(h, max(box[3] for box in boxes) + 16)
    folder = TARGET / name
    folder.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, 1):
        frame.crop((x0, y0, x1, y1)).save(folder / f'frame_{index:02}.png')
    timing = spec['timing']
    return {
        'id': name,
        'idleMs': timing.get('idle_ms', []),
        'attackMs': timing.get('attack_ms', []),
        'attackOrder': timing.get('attack_order', []),
        'motionMs': timing.get('motion_ms', []),
        'crop': [x0, y0, x1, y1],
        'source': str(src.relative_to(ROOT.parent)),
        'reviewState': 'first_pass_review',
    }


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    entries = [export(spec) for spec in SPECS]
    entries.append(export({
        'id': 'claw_hit', 'folder': '',
        'timing': {'motion_ms': [40, 50, 70, 60, 70, 90]},
    }))
    (TARGET / 'catalog.json').write_text(json.dumps({'entries': entries}, ensure_ascii=False, indent=2))
    print(f'Exported {len(entries)} candidate animation groups to {TARGET}')


if __name__ == '__main__':
    main()
