#!/usr/bin/env python3
"""Run the RunningHub MiniMax H3 two-pass audio-reference application."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


WEBAPP_ID = "2087127180013817858"
BASE_URL = "https://www.runninghub.cn"
PRIMARY_OUTPUT_NODE = "122"
ACTIVE_STATUSES = {"QUEUED", "RUNNING", "PENDING", "PROCESSING"}
SUCCESS_STATUSES = {"SUCCESS", "COMPLETED", "SUCCEEDED"}
MEDIA_FIELDS = {
    ("34", "image"): "image1",
    ("35", "image"): "image2",
    ("36", "image"): "image3",
    ("84", "audio"): "audio1",
    ("85", "audio"): "audio2",
}


class RunningHubError(RuntimeError):
    pass


def decode_json(response) -> object:
    raw = response.read()
    charset = response.headers.get_content_charset() or "utf-8"
    try:
        return json.loads(raw.decode(charset))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return json.loads(raw.decode("utf-8"))


def request_json(path: str, payload: object | None = None, api_key: str | None = None) -> object:
    url = path if path.startswith("http") else BASE_URL + path
    data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Accept": "application/json", "User-Agent": "runninghub-h3-ref2va-audio-skill/1.0"}
    if data is not None:
        headers["Content-Type"] = "application/json; charset=utf-8"
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = decode_json(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RunningHubError(f"HTTP {exc.code}: {detail[:1000]}") from exc
    except urllib.error.URLError as exc:
        raise RunningHubError(f"Network error: {exc.reason}") from exc
    if isinstance(result, dict) and "code" in result and result.get("code") not in (0, 200, "0", "200"):
        message = result.get("message") or result.get("msg") or result
        raise RunningHubError(f"RunningHub API error {result.get('code')}: {message}")
    return result


def api_key_from_env(name: str) -> str:
    value = os.environ.get(name)
    if not value and os.name == "nt":
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
                value, _ = winreg.QueryValueEx(key, name)
        except (OSError, ImportError):
            value = None
    if not value:
        raise RunningHubError(f"Missing API key in process and Windows user environment: {name}")
    return str(value)


def webapp_detail() -> dict:
    result = request_json("/api/webapp/detail", {"webappId": WEBAPP_ID})
    if not isinstance(result, dict):
        raise RunningHubError("Unexpected webapp detail response")
    data = result.get("data", result)
    if not isinstance(data, dict) or not isinstance(data.get("inputNodes"), list):
        raise RunningHubError("Webapp detail did not include inputNodes")
    return data


def upload_file(path: Path, api_key: str) -> str:
    path = path.expanduser().resolve()
    if not path.is_file():
        raise RunningHubError(f"Upload file not found: {path}")
    boundary = "----codex-" + uuid.uuid4().hex
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    body = head + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode("ascii")
    request = urllib.request.Request(
        BASE_URL + "/openapi/v2/media/upload/binary",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
            "User-Agent": "runninghub-h3-ref2va-audio-skill/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            result = decode_json(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RunningHubError(f"Upload HTTP {exc.code}: {detail[:1000]}") from exc
    if not isinstance(result, dict) or result.get("code") not in (0, 200, "0", "200"):
        raise RunningHubError(f"Upload failed: {result}")
    data = result.get("data") or {}
    file_name = data.get("fileName") if isinstance(data, dict) else None
    if not file_name:
        raise RunningHubError(f"Upload response missing fileName: {result}")
    return str(file_name)


def parse_value(text: str) -> object:
    if text.startswith("@"):
        source = Path(text[1:]).expanduser()
        if source.is_file():
            return source.read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def parse_assignment(text: str) -> tuple[tuple[str, str], object]:
    if "=" not in text or "." not in text.split("=", 1)[0]:
        raise RunningHubError(f"Expected NODE_ID.FIELD=VALUE, got: {text}")
    left, raw_value = text.split("=", 1)
    node_id, field_name = left.split(".", 1)
    return (node_id, field_name), parse_value(raw_value)


def load_config(path: Path) -> dict[tuple[str, str], object]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "nodeInfoList" in raw:
        raw = raw["nodeInfoList"]
    result: dict[tuple[str, str], object] = {}
    if isinstance(raw, list):
        for item in raw:
            result[(str(item["nodeId"]), str(item["fieldName"]))] = item["fieldValue"]
    elif isinstance(raw, dict):
        for key, value in raw.items():
            if "." not in key:
                raise RunningHubError(f"Config key must be NODE_ID.FIELD: {key}")
            result[tuple(key.split(".", 1))] = value
    else:
        raise RunningHubError("Config must be an object, nodeInfoList object, or array")
    return result


def add_named_overrides(args, overrides: dict[tuple[str, str], object]) -> None:
    values = {
        ("34", "image"): args.image1,
        ("35", "image"): args.image2,
        ("36", "image"): args.image3,
        ("84", "audio"): args.audio1,
        ("85", "audio"): args.audio2,
        ("37", "value"): args.duration,
        ("89", "megapixels"): args.stage1_megapixels,
        ("138", "megapixels"): args.stage2_megapixels,
        ("18", "noise_seed"): args.stage1_seed,
        ("121", "noise_seed"): args.stage2_seed,
        ("20", "steps"): args.stage1_steps,
        ("128", "steps"): args.stage2_steps,
        ("20", "denoise"): args.stage1_denoise,
        ("128", "denoise"): args.stage2_denoise,
        ("20", "scheduler"): args.stage1_scheduler,
        ("128", "scheduler"): args.stage2_scheduler,
        ("46", "ref_image_size"): args.ref_image_size,
    }
    for key, value in values.items():
        if value is not None:
            overrides[key] = value
    if args.aspect_ratio is not None:
        overrides[("89", "aspect_ratio")] = args.aspect_ratio
        overrides[("138", "aspect_ratio")] = args.aspect_ratio
    if args.prompt_file:
        overrides[("39", "value")] = Path(args.prompt_file).read_text(encoding="utf-8")
    elif args.prompt is not None:
        overrides[("39", "value")] = args.prompt


def normalize_media(overrides: dict[tuple[str, str], object], api_key: str | None, dry_run: bool) -> None:
    if ("36", "image") not in overrides and ("34", "image") in overrides:
        overrides[("36", "image")] = overrides[("34", "image")]
    if ("85", "audio") not in overrides and ("84", "audio") in overrides:
        overrides[("85", "audio")] = overrides[("84", "audio")]
    cache: dict[Path, str] = {}
    for key in MEDIA_FIELDS:
        value = overrides.get(key)
        if not isinstance(value, str):
            continue
        candidate = Path(value).expanduser()
        if not candidate.is_file():
            continue
        resolved = candidate.resolve()
        if dry_run:
            overrides[key] = f"LOCAL_FILE:{resolved}"
            continue
        if api_key is None:
            raise RunningHubError("API key is required to upload local media")
        if resolved not in cache:
            print(f"Uploading {resolved.name}...", file=sys.stderr)
            cache[resolved] = upload_file(resolved, api_key)
        overrides[key] = cache[resolved]


def node_info_list(overrides: dict[tuple[str, str], object]) -> list[dict]:
    ordered = sorted(overrides.items(), key=lambda item: (int(item[0][0]), item[0][1]))
    return [
        {"nodeId": node_id, "fieldName": field_name, "fieldValue": value}
        for (node_id, field_name), value in ordered
    ]


def extract_task_id(result: object) -> str | None:
    if isinstance(result, dict):
        for key in ("taskId", "task_id"):
            if result.get(key):
                return str(result[key])
        for value in result.values():
            found = extract_task_id(value)
            if found:
                return found
    elif isinstance(result, list):
        for value in result:
            found = extract_task_id(value)
            if found:
                return found
    return None


def submit(overrides: dict[tuple[str, str], object], api_key: str) -> tuple[str, object]:
    payload = {"apiKey": api_key, "webappId": WEBAPP_ID, "nodeInfoList": node_info_list(overrides)}
    result = request_json("/task/openapi/ai-app/run", payload)
    task_id = extract_task_id(result)
    if not task_id:
        raise RunningHubError(f"Submission response missing taskId: {result}")
    return task_id, result


def query(task_id: str, api_key: str) -> dict:
    result = request_json("/openapi/v2/query", {"taskId": task_id}, api_key=api_key)
    if not isinstance(result, dict):
        raise RunningHubError(f"Unexpected query response: {result}")
    return result


def wait_for_task(task_id: str, api_key: str, interval: float, timeout: float) -> dict:
    deadline = time.monotonic() + timeout
    previous = None
    while True:
        result = query(task_id, api_key)
        status = str(result.get("status") or "UNKNOWN").upper()
        if status != previous:
            print(f"Task {task_id}: {status}", file=sys.stderr)
            previous = status
        if status in SUCCESS_STATUSES:
            return result
        if status not in ACTIVE_STATUSES:
            reason = result.get("failedReason") or result.get("errorMessage") or result
            raise RunningHubError(f"Task {task_id} ended with {status}: {reason}")
        if time.monotonic() >= deadline:
            raise RunningHubError(f"Timed out waiting for task {task_id}; latest status: {status}")
        time.sleep(interval)


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    for index in range(2, 10000):
        candidate = path.with_name(f"{path.stem}_{index}{path.suffix}")
        if not candidate.exists():
            return candidate
    raise RunningHubError(f"Could not choose a unique output path for {path}")


def download_url(url: str, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    target = unique_path(path)
    request = urllib.request.Request(url, headers={"User-Agent": "runninghub-h3-ref2va-audio-skill/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=600) as response, target.open("wb") as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return target


def download_results(result: dict, output_dir: Path, all_outputs: bool) -> list[Path]:
    candidates = [item for item in (result.get("results") or []) if isinstance(item, dict) and item.get("url")]
    if not all_outputs:
        primary = [item for item in candidates if str(item.get("nodeId")) == PRIMARY_OUTPUT_NODE and item.get("outputType") == "mp4"]
        candidates = primary or [item for item in candidates if item.get("outputType") == "mp4"][:1]
    task_id = str(result.get("taskId") or "task")
    saved: list[Path] = []
    for item in candidates:
        kind = str(item.get("outputType") or Path(urllib.parse.urlparse(item["url"]).path).suffix.lstrip(".") or "bin")
        node_id = str(item.get("nodeId") or "output")
        name = f"runninghub_h3_audio_{task_id}.mp4" if not all_outputs and kind == "mp4" else f"runninghub_h3_audio_{task_id}_node{node_id}.{kind}"
        print(f"Downloading node {node_id} -> {name}", file=sys.stderr)
        saved.append(download_url(str(item["url"]), output_dir / name))
    if not saved:
        raise RunningHubError("Task succeeded but no downloadable result matched")
    return saved


def command_nodes(args) -> int:
    nodes = webapp_detail()["inputNodes"]
    nodes = sorted(nodes, key=lambda n: (int(str(n.get("nodeId", "0"))), str(n.get("fieldName", ""))))
    if args.json:
        if not args.full:
            nodes = [{key: node.get(key) for key in ("nodeId", "nodeName", "fieldName", "fieldValue", "fieldType", "description")} for node in nodes]
        print(json.dumps(nodes, ensure_ascii=False, indent=2))
        return 0
    print("NODE\tCLASS\tFIELD\tTYPE\tDEFAULT")
    for node in nodes:
        value = str(node.get("fieldValue", "")).replace("\r", " ").replace("\n", " ")
        if not args.full and len(value) > 100:
            value = f"<long-text:{len(value)}-chars>"
        print(f"{node.get('nodeId')}\t{node.get('nodeName')}\t{node.get('fieldName')}\t{node.get('fieldType')}\t{value}")
    return 0


def command_upload(args) -> int:
    api_key = api_key_from_env(args.api_key_env)
    for raw_path in args.files:
        path = Path(raw_path)
        print(json.dumps({"localPath": str(path.resolve()), "fileName": upload_file(path, api_key)}, ensure_ascii=False))
    return 0


def command_run(args) -> int:
    overrides: dict[tuple[str, str], object] = {}
    if args.config:
        overrides.update(load_config(Path(args.config)))
    add_named_overrides(args, overrides)
    for assignment in args.set_values:
        key, value = parse_assignment(assignment)
        overrides[key] = value

    public = {(str(node["nodeId"]), str(node["fieldName"])) for node in webapp_detail()["inputNodes"]}
    unknown = sorted(set(overrides) - public)
    if unknown and not args.allow_unknown_nodes:
        rendered = ", ".join(f"{node}.{field}" for node, field in unknown)
        raise RunningHubError(f"Unknown/unpublished node fields: {rendered}")
    if not args.allow_publisher_defaults:
        required = [("34", "image"), ("35", "image"), ("84", "audio"), ("39", "value")]
        missing = [f"{node}.{field}" for node, field in required if (node, field) not in overrides]
        if missing:
            raise RunningHubError("Required overrides missing: " + ", ".join(missing))

    api_key = None if args.dry_run else api_key_from_env(args.api_key_env)
    normalize_media(overrides, api_key, args.dry_run)
    if args.dry_run:
        print(json.dumps({"webappId": WEBAPP_ID, "nodeInfoList": node_info_list(overrides)}, ensure_ascii=False, indent=2))
        return 0

    task_id, submission = submit(overrides, api_key)
    print(json.dumps({"taskId": task_id, "submission": submission}, ensure_ascii=False))
    if args.no_wait:
        return 0
    result = wait_for_task(task_id, api_key, args.poll_interval, args.timeout)
    saved = [] if args.no_download else download_results(result, Path(args.output_dir), args.all_outputs)
    print(json.dumps({
        "taskId": task_id,
        "status": result.get("status"),
        "usage": result.get("usage"),
        "saved": [str(path.resolve()) for path in saved],
        "results": result.get("results") if args.json_results else None,
    }, ensure_ascii=False, indent=2))
    return 0


def command_status(args) -> int:
    api_key = api_key_from_env(args.api_key_env)
    result = wait_for_task(args.task_id, api_key, args.poll_interval, args.timeout) if args.wait else query(args.task_id, api_key)
    saved = download_results(result, Path(args.output_dir), args.all_outputs) if args.download and str(result.get("status", "")).upper() in SUCCESS_STATUSES else []
    output = dict(result)
    if saved:
        output["saved"] = [str(path.resolve()) for path in saved]
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


def add_key_option(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--api-key-env", default="RUNNINGHUB_API_KEY", help="Environment variable containing the API key")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    nodes = sub.add_parser("nodes", help="List all published input fields")
    nodes.add_argument("--json", action="store_true")
    nodes.add_argument("--full", action="store_true")
    nodes.set_defaults(func=command_nodes)

    upload = sub.add_parser("upload", help="Upload media and print RunningHub fileName values")
    add_key_option(upload)
    upload.add_argument("files", nargs="+")
    upload.set_defaults(func=command_upload)

    run = sub.add_parser("run", help="Upload references, submit, wait, and download")
    add_key_option(run)
    for name in ("image1", "image2", "image3", "audio1", "audio2"):
        run.add_argument(f"--{name}")
    prompt_group = run.add_mutually_exclusive_group()
    prompt_group.add_argument("--prompt")
    prompt_group.add_argument("--prompt-file")
    run.add_argument("--duration", type=int)
    run.add_argument("--aspect-ratio")
    run.add_argument("--stage1-megapixels", type=float)
    run.add_argument("--stage2-megapixels", type=float)
    run.add_argument("--stage1-seed", type=int)
    run.add_argument("--stage2-seed", type=int)
    run.add_argument("--stage1-steps", type=int)
    run.add_argument("--stage2-steps", type=int)
    run.add_argument("--stage1-denoise", type=float)
    run.add_argument("--stage2-denoise", type=float)
    run.add_argument("--stage1-scheduler")
    run.add_argument("--stage2-scheduler")
    run.add_argument("--ref-image-size")
    run.add_argument("--config")
    run.add_argument("--set", dest="set_values", action="append", default=[], metavar="NODE.FIELD=VALUE")
    run.add_argument("--allow-unknown-nodes", action="store_true")
    run.add_argument("--allow-publisher-defaults", action="store_true")
    run.add_argument("--dry-run", action="store_true")
    run.add_argument("--no-wait", action="store_true")
    run.add_argument("--no-download", action="store_true")
    run.add_argument("--all-outputs", action="store_true")
    run.add_argument("--json-results", action="store_true")
    run.add_argument("--output-dir", default=".")
    run.add_argument("--poll-interval", type=float, default=10)
    run.add_argument("--timeout", type=float, default=3600)
    run.set_defaults(func=command_run)

    status = sub.add_parser("status", help="Query or resume a task")
    add_key_option(status)
    status.add_argument("task_id")
    status.add_argument("--wait", action="store_true")
    status.add_argument("--download", action="store_true")
    status.add_argument("--all-outputs", action="store_true")
    status.add_argument("--output-dir", default=".")
    status.add_argument("--poll-interval", type=float, default=10)
    status.add_argument("--timeout", type=float, default=3600)
    status.set_defaults(func=command_status)
    return parser


def main() -> int:
    try:
        args = build_parser().parse_args()
        return args.func(args)
    except BrokenPipeError:
        return 0
    except (RunningHubError, OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
