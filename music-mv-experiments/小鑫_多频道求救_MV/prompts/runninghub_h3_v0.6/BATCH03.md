# Batch 03 — V0.6 Performance and Narrative Tests

Generated on 2026-08-23 after the camera-facing performance-direction revision.

## Tasks

| Task | RunningHub task ID | Status | Coins | Saved video |
|---|---:|---|---:|---|
| S03 | `2091398931195056130` | SUCCESS | 82 | `videos/runninghub_batch03_v0.6/S03/runninghub_h3_audio_2091398931195056130.mp4` |
| S06 | `2091401229703020545` | SUCCESS | 95 | `videos/runninghub_batch03_v0.6/S06/runninghub_h3_audio_2091401229703020545.mp4` |
| S08 | `2091401228310507521` | SUCCESS | 82 | `videos/runninghub_batch03_v0.6/S08/runninghub_h3_audio_2091401228310507521.mp4` |

Total successful-task usage: **259 coins**.

An earlier S03 initialization attempt, task `2091398433838694401`, failed at ResolutionSelector because the invalid aspect label `16:9 (Landscape Widescreen)` was supplied. No video was produced. The corrected label is `16:9 (Widescreen)`.

## QA

- **S03 — conditional pass:** hard cuts detected at approximately 1.33s and 3.88s, correctly producing hand insert → three-quarter face close-up → eye close-up. Eyeline stays off lens and the final gaze lowers. The middle expression is softer than before, though the mouth may still read as a slight smile.
- **S06 — structural pass, acting revision still needed:** hard cuts detected at approximately 2.42s and 4.50s, correctly producing environment run → boot insert → running medium shot. It avoids a full-frame face close-up, but the final running performance becomes noticeably cheerful and does not fully achieve strained humor turning into apology.
- **S08 — pass:** hard cuts detected at approximately 1.71s and 3.83s, correctly producing tunnel medium-wide → five-light countdown insert → telephoto crowd approach. No large face, gore, contact, or crowd takeover.

QA contact sheets are stored in each task's `qa/contact_2fps.jpg`.
