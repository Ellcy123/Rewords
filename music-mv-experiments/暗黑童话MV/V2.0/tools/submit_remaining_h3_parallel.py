"""Submit the five remaining V2.0 H3 segments concurrently without logging credentials."""

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import os
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parents[2]
H3_SCRIPT = PROJECT_ROOT / ".codex/skills/runninghub-h3-ref2va-audio/scripts/runninghub_h3_ref2va_audio.py"
OUTPUT_ROOT = ROOT / "outputs"

TASKS = [
    {
        "segment": "S01",
        "images": [
            ROOT / "keyframes/composited_candidates/K05_跟我走_阴影路径_V0.1.png",
            ROOT / "references/midjourney/reuse_candidates/E01_无名王国外城_复用候选.png",
            ROOT / "references/midjourney/selected/E02_王都阴影棋盘广场_GPT图生图_V0.1.png",
        ],
        "audio": ROOT / "sources/audio_segments_v2.0/S01_00-15s.wav",
        "prompt": ROOT / "prompts/S01_H3_二维PV英文提示词_V0.1.txt",
    },
    {
        "segment": "S02",
        "images": [
            ROOT / "keyframes/composited_candidates/K05_跟我走_阴影路径_V0.1.png",
            ROOT / "keyframes/composited_candidates/K04_五圣地心跳轮盘_V0.1.png",
            ROOT / "references/midjourney/selected/E07_龙之宝库_GPT图生图_V0.1.png",
        ],
        "audio": ROOT / "sources/audio_segments_v2.0/S02_15-30s.wav",
        "prompt": ROOT / "prompts/S02_H3_二维PV英文提示词_V0.1.txt",
    },
    {
        "segment": "S04",
        "images": [
            ROOT / "keyframes/composited_candidates/K05_跟我走_阴影路径_V0.1.png",
            ROOT / "references/midjourney/reuse_candidates/E08_故事尽头黑门_复用候选_待清人.png",
            ROOT / "keyframes/composited_candidates/K04_五圣地心跳轮盘_V0.1.png",
        ],
        "audio": ROOT / "sources/audio_segments_v2.0/S04_45-60s.wav",
        "prompt": ROOT / "prompts/S04_H3_二维PV英文提示词_V0.1.txt",
    },
    {
        "segment": "S05",
        "images": [
            ROOT / "keyframes/composited_candidates/K05_跟我走_阴影路径_V0.1.png",
            ROOT / "references/midjourney/selected/E05_永劫循环领域_GPT图生图_V0.1.png",
            ROOT / "references/midjourney/reuse_candidates/E08_故事尽头黑门_复用候选_待清人.png",
        ],
        "audio": ROOT / "sources/audio_segments_v2.0/S05_60-75s.wav",
        "prompt": ROOT / "prompts/S05_H3_二维PV英文提示词_V0.1.txt",
    },
    {
        "segment": "S06",
        "images": [
            ROOT / "keyframes/composited_candidates/K05_跟我走_阴影路径_V0.1.png",
            ROOT / "references/midjourney/reuse_candidates/E08_故事尽头黑门_复用候选_待清人.png",
            ROOT / "keyframes/composited_candidates/K04_五圣地心跳轮盘_V0.1.png",
        ],
        "audio": ROOT / "sources/audio_segments_v2.0/S06_75-83.68s_padded15s.wav",
        "prompt": ROOT / "prompts/S06_H3_二维PV英文提示词_V0.1.txt",
    },
]


def get_key():
    result = subprocess.run(["launchctl", "getenv", "RUNNINGHUB_API_KEY"], capture_output=True, text=True, check=False)
    return result.stdout.strip()


def submit(task, api_key):
    output_dir = OUTPUT_ROOT / f"{task['segment']}_H3_二维PV正式片_V0.1"
    output_dir.mkdir(parents=True, exist_ok=True)
    image1, image2, image3 = task["images"]
    command = [
        sys.executable,
        str(H3_SCRIPT),
        "run",
        "--image1", str(image1),
        "--image2", str(image2),
        "--image3", str(image3),
        "--audio1", str(task["audio"]),
        "--audio2", str(task["audio"]),
        "--prompt-file", str(task["prompt"]),
        "--duration", "15",
        "--aspect-ratio", "16:9 (Widescreen)",
        "--stage1-megapixels", "0.4",
        "--stage2-megapixels", "1.0",
        "--output-dir", str(output_dir),
        "--no-wait",
        "--json-results",
    ]
    environment = os.environ.copy()
    environment["RUNNINGHUB_API_KEY"] = api_key
    result = subprocess.run(command, capture_output=True, text=True, env=environment, check=False)
    match = re.search(r'"taskId"\s*:\s*"(\d+)"', result.stdout)
    return {
        "segment": task["segment"],
        "taskId": match.group(1) if match else None,
        "status": "SUBMITTED" if result.returncode == 0 and match else "SUBMISSION_FAILED",
        "outputDir": str(output_dir),
        "stage1Megapixels": 0.4,
        "stage2Megapixels": 1.0,
    }


def main():
    api_key = get_key()
    if not api_key:
        raise SystemExit("RunningHub key is not available in the macOS user environment.")

    results = []
    with ThreadPoolExecutor(max_workers=len(TASKS)) as executor:
        futures = [executor.submit(submit, task, api_key) for task in TASKS]
        for future in as_completed(futures):
            item = future.result()
            results.append(item)
            print(f"{item['segment']}: {item['status']}" + (f" ({item['taskId']})" if item["taskId"] else ""))

    results.sort(key=lambda item: item["segment"])
    manifest = OUTPUT_ROOT / "H3_并行提交记录_V2.0.json"
    manifest.write_text(json.dumps({"tasks": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if any(item["status"] != "SUBMITTED" for item in results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
