---
name: runninghub-h3-ref2va-audio
description: Operate the RunningHub MiniMax H3 two-pass audio-reference AI application (webapp 2087127180013817858). Use when Codex needs to generate H3 reference-to-video from up to three images and two audio references, bind voice timbre/rhythm/effects to subjects, create dialogue or lip-sync prompts, inspect or override all published nodes, control both render stages, submit/query tasks, and download the final MP4.
---

# RunningHub H3 Audio REF2VA

Use `scripts/runninghub_h3_ref2va_audio.py` for uploads, dry-runs, submission, polling, and download. Read `references/nodes.md` before changing advanced nodes.

## Generate

Invoke the CLI directly. Do not pre-check only the current process environment. The CLI reads `RUNNINGHUB_API_KEY` from the process and then the Windows HKCU user environment registry; do not ask this user for the key again merely because the process environment is empty.

```powershell
python scripts/runninghub_h3_ref2va_audio.py run `
  --image1 "C:\path\subject-start.png" `
  --image2 "C:\path\subject-end.png" `
  --image3 "C:\path\scene.png" `
  --audio1 "C:\path\voice-or-sfx-1.wav" `
  --audio2 "C:\path\voice-or-sfx-2.wav" `
  --prompt-file "C:\path\prompt.txt" `
  --duration 15 `
  --aspect-ratio "9:16 (Portrait Widescreen)" `
  --output-dir "C:\path\outputs"
```

Require image 1, image 2, audio 1, and the user prompt so publisher defaults cannot contaminate a run. If image 3 is absent, copy image 1 as the scene reference. If audio 2 is absent, copy audio 1. Always mention the actual reference roles in the prompt as `Picture 1/2/3` and `Reference Audio 1/2`; the workflow's internal optimizer converts them to `<Picture N>` and `<Audio N>` full-reference syntax.

`--aspect-ratio` updates nodes 89 and 138 together. Preserve the default stage resolutions of 0.4 MP and 1.5 MP unless the user requests otherwise. A normal run waits and downloads the final node 122 MP4; it falls back to the first MP4 if RunningHub reports a different result-node ID.

Use `--no-wait` to submit only. Resume with `status TASK_ID --wait --download`.

## Control all nodes

List the live schema:

```powershell
python scripts/runninghub_h3_ref2va_audio.py nodes
python scripts/runninghub_h3_ref2va_audio.py nodes --json --full
```

Override any public field with repeatable assignments:

```powershell
python scripts/runninghub_h3_ref2va_audio.py run ... `
  --set 20.steps=8 `
  --set 128.denoise=0.2 `
  --set 121.noise_seed=123456789
```

Use `--config overrides.json` for a mapping of `NODE.FIELD` keys or a `nodeInfoList` array. Named options cover common fields; `--set` exposes every field listed in `references/nodes.md` and future fields returned by `nodes`.

## Audio prompting

- Use audio references for voice timbre, delivery, rhythm, emotion, music style, ambience, or sound-effect texture.
- Bind a speaking subject explicitly, for example: `The character in Picture 1 speaks with the timbre, pace, and emotion of Reference Audio 1.`
- Provide the target written dialogue separately when only the voice is referenced.
- State when original audio must be copied instead of merely referenced. Reference conditioning does not guarantee sample-exact reuse; post-mux exact audio when exact preservation matters.
- Keep each reference role unambiguous. Do not describe audio 2 if it is only a duplicate fallback.

## Cost and secret rules

- Run `--dry-run` before paid submission when node mappings changed.
- Do not expose the API key in commands, files, logs, or responses.
- Do not repeat a successful but aesthetically poor paid task without user authorization.
- Report task ID, terminal status, usage, and saved paths.
