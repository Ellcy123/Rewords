# RunningHub H3 Prompt Set V0.6

This folder contains the complete 14-task prompt set after the camera-facing performance-direction pass.

- Creative direction follows the lyric-first and shot-grammar framework of `Music Video Director`.
- S02 remains byte-for-byte identical to the approved V0.3/V0.5 prompt and must not be regenerated.
- S03, P01, S06, P02A, P02B, S10, and P03 now specify a playable objective, exact eyeline, lyric-by-lyric emotional changes, breath or swallow reactions, and the expression held at the cut.
- Direct lens contact is brief and motivated by the lyric; otherwise the singer performs to the radio, road, caller, or route rather than to an abstract audience.
- Backup dancers keep distinct route-specific eyelines and emotional states instead of identical blank stage faces.
- Dance transitions include a relaxed neutral release to reduce mannequin-like pose counting.
- P02A and P02B now use `keyframes/selected/P02_group_cluster_start_v03.png`; P03 uses `keyframes/selected/P03_group_wall_start_v03.png`. Both v03 frames were rebuilt directly from the clean E16 scene and original character cards, without any previous group still or generated intermediate as image input.
- Group camera grammar is now a 30–45 degree short arc with foreground parallax, followed by overhead formation opening; flat W/V lineups, complete 360-degree orbits, reaching toward Xiaoxin, new stains, texture boiling, and skin speckle are prohibited.
- Batch 03 submitted S03, S06, and S08. All three completed successfully; see `BATCH03.md` for task IDs, usage, saved paths, and QA.
- Batch 04 submitted S04, S12, and S13 with `references/infected/尸潮远景群体参考_V0.4.png` as Picture 3. All three completed successfully and were approved by the user. See `BATCH04.md`.
- Batch 05 submitted S01, S03, P01, S06, and S07. S01 and S06 add explicit infected combat; all five results were approved by the user. See `BATCH05.md`.
- Batch 06 submitted P02A, P02B, S10, and P03. All four completed successfully after two zero-cost P02B platform-OOM failures; the four results passed technical QA and await user picture approval. See `BATCH06.md`.

Readable complete compilation: `prompts/MiniMax_H3_图生视频提示词_V0.5.md`.
