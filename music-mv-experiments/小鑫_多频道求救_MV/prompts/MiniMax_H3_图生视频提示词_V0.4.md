# MiniMax H3 图生视频提示词汇总 V0.4

> 当前执行真值，共14条。S02为首批唯一合格并原样保留的提示词；其余13条全部重新审核，其中P01、P02B、S10、P03沿用已确认的V0.4修订，其余9条在本版完成镜头、动作和稳定性优化。
>
> 本文件收录与 `prompts/runninghub_h3_v0.5/` 完全对应的正式英文执行提示词。当前只完成文档与免费dry-run准备，不代表已授权付费生成。

## 统一提交规则

- 所有任务 Picture 1 使用对应起始关键帧，Picture 2 使用 `references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png`。
- 非群舞任务省略 Picture 3，由 RunningHub CLI 自动复制 Picture 1。
- P02A、P02B、P03 使用另一张五人关键帧作为 Picture 3，交叉保持四位伴舞的身份、服装、人数和队形。
- Reference Audio 1 使用对应成片时间段的原歌曲切片；S01、S02、S03 的 Reference Audio 2 使用小鑫音色参考。
- 生成音轨只用于口型、节奏和音色参考，最终统一删除并重新铺设原始歌曲。
- S02不修改、不重做；其余13条在用户确认前只允许dry-run，不创建付费任务。

## S01 — 生成 6 秒 / 成片取 5.584 秒

- Picture 1：\`keyframes/selected/S01_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S01_00.000-05.584.wav\`
- Reference Audio 2：小鑫音色参考
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls the old four-channel radio, Xiaoxin's bandaged left forearm and gloved hand, wet floor reflections, green indicator lights, and teal-amber industrial lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: use the blurred standing views only for body proportions, black survival clothing, glove design, and the white bandage on his left forearm; his face appears only as a tiny reflection and must not become a second visible person. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target intro segment and controls the timing of the Chinese radio line and the four channel-light pulses. Reference Audio 2 is Xiaoxin's voice-timbre reference and binds its restrained timbre and pace to Xiaoxin's off-screen voice.

Create a six-second cinematic radio-intro sequence with three precise macro shots. Xiaoxin (S1) remains off-screen and says <d>[Chinese] 喂，收到请回答。</d> with timing from Reference Audio 1 and vocal quality from Reference Audio 2.

[Shot 1] From 00:00.000 to 00:01.700, use a locked extreme macro shot beginning from Picture 1. Xiaoxin's bandaged left thumb presses the push-to-talk switch exactly once and holds it. Moisture beads on the scratched radio casing. Only the first green channel light turns on. The camera is fixed; the hand performs no extra tapping.

[Shot 2] At 00:01.700, hard cut to a shallow diagonal close-up running along the row of four channel lights. The camera makes one slow, smooth lateral slide of low amplitude while lights two, three, and four illuminate one at a time in rhythm with Reference Audio 1. A tiny soft reflection of one of Xiaoxin's eyes appears in the dark radio glass and blinks once; no full face appears.

[Shot 3] At 00:03.900, hard cut to a top-down macro of the radio and bandaged hand. All four green lights remain steadily on while the thumb releases the switch once. Hold the final arrangement without camera movement through the last frame.

No random blinking pattern, extra hands, repeated button pressing, malformed fingers, changing bandage side, camera shake, pulse zoom, readable UI text, subtitles, logo, or watermark. The generated audio is temporary and will be replaced with the original master song.
\`\`\`

## S02 — 生成 8 秒 / 成片取 6.874 秒

- Picture 1：\`keyframes/selected/S02_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S02_05.584-12.458.wav\`
- Reference Audio 2：小鑫音色参考
- 状态：首批合格，原样保留

\`\`\`text
Picture 1 is the exact starting frame and controls the composition, Xiaoxin's initial pose, the mechanical lever, the blast door, the wet industrial hall, and all lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: use only the sharp large portrait on its right side for facial identity; the blurred standing views control body proportions, black work clothing, harness, gloves, boots, and the white bandage on his left forearm. Picture 3 duplicates Picture 1 and is only a scene and composition reference. Reference Audio 1 is the exact target song segment; follow its spoken-word timing and mouth rhythm. Reference Audio 2 is Xiaoxin's voice-timbre reference; bind its timbre, pace, and restrained delivery specifically to Xiaoxin in Picture 1, while the written target dialogue remains authoritative.

Create one continuous 8-second scene with three clearly edited shots. Preserve Xiaoxin's face, clothing, left-forearm bandage, body proportions, door geometry, lever geometry, and red-blue lighting across every cut. His lips and jaw follow Reference Audio 1 timing; his vocal quality follows Reference Audio 2.

[Shot 1 — 00:00.000–00:02.400] Medium-wide establishing shot. Xiaoxin braces both hands on the mechanical lever and pushes with believable full-body weight while the huge steel door steadily closes and sparks fall from its track. Use a restrained rightward camera truck and keep the lever, his full upper body, and the narrowing doorway visible.

[Hard cut at 00:02.400]
[Shot 2 — 00:02.400–00:04.900] Tight face and shoulder close-up from a clear 30-degree angle change. Sweat, fatigue, and radio glow are visible. Xiaoxin speaks in Chinese: “我没有丢下你们，刚刚在封三号门。” Keep precise Chinese mouth movement and restrained urgency; no heroic posing.

[Action-matched hard cut at 00:04.900]
[Shot 3 — 00:04.900–00:08.000] Extreme insert close-up of his gloved hands, the white bandage on his left forearm, the lever teeth, and vibrating metal. His hands complete the same push begun in Shot 1; the door gap narrows to almost closed. End on the lever locking into place and one short exhausted breath. No location jump, time jump, extra people, costume drift, malformed hands, new text, or logo.

The generated soundtrack is only a motion, lip-sync, and timbre reference. It does not need to reproduce the master audio sample-exactly; the final edit will replace it with the original master song.
\`\`\`

## S03 — 生成 6 秒 / 成片取 3.703 秒

- Picture 1：\`keyframes/selected/S03_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S03_12.458-16.161.wav\`
- Reference Audio 2：小鑫音色参考
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls Xiaoxin's face, scratches, black survival clothing, shoulder radio, bandaged left forearm, wet industrial background, and cold teal light. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls facial identity; the blurred standing views control body proportions, clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target spoken segment and controls the Chinese mouth timing. Reference Audio 2 is Xiaoxin's voice-timbre reference and binds its restrained, tired, reassuring delivery to Xiaoxin.

Create a six-second cinematic emotional performance with three clearly edited shots. Xiaoxin is the only speaker, identified as (S1), and says <d>[Chinese] 再等我一下。</d> He addresses the shoulder radio rather than staring directly into the lens.

[Shot 1] From 00:00.000 to 00:01.300, use a locked extreme insert of Xiaoxin's bandaged left hand touching the shoulder-radio button once. The glove and bandage remain anatomically correct. A green radio reflection grazes the fabric; the background stays soft.

[Shot 2] At 00:01.300, action-match cut to a 70mm three-quarter face close-up about 35 degrees off-axis. Xiaoxin looks just beside the lens toward the radio and speaks the line with precise lips and jaw. His expression carries sincere reassurance under fatigue: no broad smile, only a brief softening at the eyes. The camera makes a very slow, low-amplitude push-in.

[Shot 3] At 00:03.800, hard cut to an extreme close-up of his eyes and upper cheek from the opposite side. He closes his mouth, lowers his gaze toward the floor, and the reassuring expression fades into private worry. The camera is locked; only one natural breath and one small eye movement occur.

No repeated nodding, head wobble, trembling shoulders, crying, heroic pose, direct-to-lens performance, extra person, face drift, malformed hand, camera shake, pulse zoom, text, or logo. Reference Audio 1 and 2 are generation guides; the final edit will restore the original master audio.
\`\`\`

## S04 — 生成 6 秒 / 成片取 4.040 秒

- Picture 1：\`keyframes/selected/S04_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S04_16.161-20.201.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls the rescue-vehicle interior, Xiaoxin's rear three-quarter position, single steering wheel, dashboard radio bank, four green channel lights, wet windshield, city lights, and teal-amber lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: use the sharp portrait only if his profile becomes visible; use the blurred standing views for black survival clothing, harness, gloves, and left-forearm bandage. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls the rhythm of channel switching and listening beats; it is not physically sung on camera.

Create a six-second cinematic vehicle-interior montage with three stable shots. Preserve one vehicle layout, one Xiaoxin, one steering wheel, the same four-channel device, and consistent rain outside.

[Shot 1] From 00:00.000 to 00:01.700, begin from Picture 1 in a 35mm over-shoulder medium-wide shot from the rear passenger seat. Xiaoxin's right hand turns the first channel knob once, then the second knob once. The first two green lights respond separately. The camera performs one short, smooth truck-right movement of low amplitude; his torso remains steady.

[Shot 2] At 00:01.700, hard cut to an extreme dashboard insert. Four separate channel meters pulse one after another in a left-to-right sequence, each only once, matching the phrase “语音拆成一条一条”. The gloved fingertip switches channels with one clean press per channel. The camera is locked; no numbers or readable interface text are created.

[Shot 3] At 00:03.500, hard cut to a passenger-side three-quarter profile medium close-up. Xiaoxin stops operating the radio and listens as all four green lights remain active in soft foreground. His eyes shift once across the four devices, then settle on the rain-covered road as “每个频道都等我回报” finishes. His mouth stays closed and his breathing remains controlled.

No repeated knob spinning, duplicated controls, extra steering wheel, random hand motion, mouth singing, camera shake, body vibration, dashboard warping, new text, logo, or watermark. Reference Audio 1 is temporary timing guidance and will be replaced by the original master song.
\`\`\`

## P01 — 生成 6 秒 / 成片取 4.470 秒

- Picture 1：\`keyframes/selected/P01_solo_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/P01_20.201-24.671.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待重新生成

\`\`\`text
Picture 1 is the exact opening frame and controls Xiaoxin's initial pose, the rescue-vehicle interior, blue water tanks, distant orange fire, rain, and teal-orange lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls his face; the blurred standing views control body proportions, black distressed work shirt, harness, gloves, and the white bandage on his left forearm. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls lyric timing, Chinese singing mouth shapes, breath timing, and phrasing.

Create a cinematic six-second music-video performance with three clearly edited shots. Xiaoxin is the only singer, identified as (S1). His complete lyric is <d>[Chinese] A区缺水，C区燃烧，我说放心，一个都不会少。</d> The singing continues seamlessly across the cuts. He must not stare into the lens for the entire clip; his eyeline stays mainly on the radio, the side window, and the road beyond the windshield.

[Shot 1] From 00:00.000 to 00:01.600, begin from Picture 1 in a three-quarter medium shot from the passenger side, about 35 degrees off Xiaoxin's front. The camera makes a short, smooth lateral slide of low amplitude. Xiaoxin turns his eyes from the blue water tanks toward the orange fire outside while singing the first phrase. His shoulders remain controlled and his right hand rests near the radio instead of gesturing toward the viewer.

[Shot 2] At 00:01.600, hard cut on the beat to a tight insert of Xiaoxin's gloved right hand pressing one radio channel key. The green channel light clicks on; blue water tanks remain soft in the left background and fire reflection flickers on wet glass at right. His singing continues off-camera. The camera is locked and stable; the hand performs only one clean press and release.

[Shot 3] At 00:03.000, action-match cut to a tight three-quarter face close-up from the driver-side window. Xiaoxin looks past the lens toward the windshield, then gives one brief side glance toward the radio while finishing the lyric. Use a slow, smooth push-in of very low amplitude. After Reference Audio 1 ends, he closes his mouth, holds the final expression, and breathes once without moving his head.

Natural restrained singing, no news-reading delivery, no idol smile, no repeated nodding, no hand reaching toward the lens, no microphone, no extra person, no face drift, no malformed fingers, no camera shake, no pulse zoom, no text, and no logo. The generated audio is temporary and will be replaced by the original master song.
\`\`\`

## S06 — 生成 8 秒 / 成片取 6.711 秒

- Picture 1：\`keyframes/selected/S06_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S06_24.671-31.382.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls the abandoned wet city corridor, rescue vehicle and amber lamps at left, rail lines, Xiaoxin's starting position and running direction, teal haze, and orange reflections. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait controls his face; the blurred standing views control body proportions, black survival clothing, harness, gloves, boots, and the white bandage on his left forearm. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls running cadence, gesture timing, and phrase transitions.

Create an eight-second cinematic running sequence with three clearly edited shots. Xiaoxin moves consistently from screen-left toward screen-right and never reverses direction. His motion is urgent but human, with grounded weight and controlled breathing.

[Shot 1] From 00:00.000 to 00:02.500, use a 28mm environment wide shot starting from Picture 1. A stabilized lateral tracking camera follows Xiaoxin running across the wet rails. He passes through one amber headlight beam, creating a clean rim light, and makes two natural splashes. Keep his full body visible and the rescue vehicle readable behind him.

[Shot 2] At 00:02.500, action-match hard cut to a low 65mm insert of his boots and lower legs continuing the same left-to-right run. Show exactly three grounded footfalls through shallow water. The camera tracks parallel at normal speed; no slow motion and no floating feet. The bandaged left hand briefly enters the upper edge gripping a small radio, then leaves.

[Shot 3] At 00:04.800, hard cut to a 40mm front three-quarter medium shot on a stable gimbal moving backward. Xiaoxin raises the radio near shoulder height without covering his face, gives one strained half-smile on the playful phrase, then lets it fade into apology. As a distant geometric road marker enters the background, he shortens one stride and glances once toward a branching route but continues screen-right. End with forward motion still active.

No frantic arm flailing, superhuman sprint, repeated glances, direct-to-lens singing, weapon, duplicated legs, foot sliding, body jitter, handheld shake, whip-pan, speed ramp, malformed hands, readable road text, logo, or watermark. Reference Audio 1 guides timing; replace the generated soundtrack with the original master song.
\`\`\`

## S07 — 生成 4 秒 / 成片取 1.552 秒

- Picture 1：\`keyframes/selected/S07_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S07_31.382-32.934.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls the worn folded city map, four red warning beacons, one cyan route, wet metal tabletop, Xiaoxin's gloved and bandaged hand, and overhead composition. Picture 2 is Xiaoxin's wardrobe and hand reference: use the blurred standing views only to preserve glove design and the white bandage on his left forearm; no face appears. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls the four warning pulses for “四栋楼同时呼叫”.

Create a four-second cinematic map sequence with three concise macro shots and no readable labels.

[Shot 1] From 00:00.000 to 00:01.100, begin from Picture 1 in a locked true top-down shot. The four red beacons pulse simultaneously once, then pulse in a quick clockwise sequence. Xiaoxin's bandaged fingertip enters from the lower edge and stops over the center intersection without touching the paper.

[Shot 2] At 00:01.100, hard cut to a very low raking macro across the map surface. The camera slides smoothly past the four red reflections while the cyan route remains a single unbroken line. Paper folds, moisture, and ink texture stay stable; the fingertip hovers in soft background.

[Shot 3] At 00:02.300, hard cut back to a slightly wider true overhead. The four red beacons remain active while the cyan route narrows visually toward one constrained corridor. Xiaoxin's fingertip moves once between two routes, then freezes exactly at the unresolved split. Hold the final frame.

No map morphing, new roads, moving printed lines, readable place names, numeric UI, extra hands, finger deformation, random light blinking, camera shake, pulse zoom, logo, or watermark. Reference Audio 1 is temporary timing guidance and will be replaced with the original master song.
\`\`\`

## P02A — 生成 4 秒 / 成片取 2.000 秒

- Picture 1：\`keyframes/selected/P02_group_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`keyframes/selected/P03_group_pull_start.png\`
- Reference Audio 1：\`references/audio/segments/P02A_32.934-34.934.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls the five-person full-body formation, wet underground junction, spacing, reflections, and cyan-amber-red lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait controls the lead's face; the blurred standing views control his black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 shows the same five-person cast in a second formation and preserves the four distinct rescued men, their separate faces and outfits. Reference Audio 1 is the exact target segment and controls Xiaoxin's singing mouth timing and the shared dance counts.

Create a four-second teaser of polished K-pop boy-group point choreography with exactly five young East Asian men and two clearly edited angles. Xiaoxin remains the center lead and only singer, identified as (S1), singing <d>[Chinese] 一辆车，一条隧道。</d> The movement is restrained, precise, and slightly ominous rather than a full chorus release.

[Shot 1] From 00:00.000 to 00:01.250, use a straight-on 32mm full-body wide shot. Five men hold a shallow W formation. On “一辆车,” everyone performs one clean side step outward: Xiaoxin steps half a pace forward while the four dancers step diagonally away from him. Their forearms rise from waist height to clean parallel lines at chest height and stop; elbows remain fixed, fingers together, feet grounded.

[Shot 2] At 00:01.250, beat-matched hard cut to a true vertical overhead shot. On “一条隧道,” the four dancers rotate their torsos once toward four different exits while keeping their feet planted; Xiaoxin remains facing the single central route and draws his bandaged left forearm once toward his chest. The five bodies create a clear directional star without touching. Hold the shape for a strong one-second freeze, then allow only minimal breathing through the final frame.

No crouching bounce, freestyle, flailing, fighting pose, grabbing, repeated arm waves, crossing paths, touching, merged limbs, sixth person, cloned face, jumping, spinning, camera shake, text, or logo. Reference Audio 1 is temporary and will be replaced by the original master song.
\`\`\`

## S08 — 生成 6 秒 / 成片取 4.470 秒

- Picture 1：\`keyframes/selected/S08_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S08_34.934-39.404.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls the single-lane industrial tunnel, rescue vehicle, Xiaoxin's position beside it, five red warning lights along the wet track, distant crowd silhouettes, mist, and teal-orange lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp portrait controls his face if visible; the blurred standing views control body proportions, black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls the five-light countdown and the crowd's final advance.

Create a six-second cinematic threat sequence with three stable shots. The distant crowd remains atmospheric pressure, never becomes a gore close-up, and never reaches Xiaoxin.

[Shot 1] From 00:00.000 to 00:01.700, begin from Picture 1 in a 32mm medium-wide shot behind and slightly beside Xiaoxin. He stands next to the vehicle, raises the radio once, and extends one open palm toward the tunnel as if asking for five more seconds. The first red warning light goes dark. The camera makes a slow, stable push of low amplitude.

[Shot 2] At 00:01.700, hard cut to a ground-level 85mm insert looking along the five red warning lights. Lights two, three, four, and five extinguish one at a time on separate beats. Each lamp goes dark permanently; none relights. Reflections disappear correspondingly from the wet floor while the camera remains locked.

[Shot 3] At 00:03.900, hard cut to a compressed 100mm telephoto long shot down the tunnel. The distant crowd silhouettes take only two slow collective steps closer through fog while remaining indistinct. Xiaoxin occupies a sharp foreground edge in three-quarter profile, lowers his open hand, tightens his jaw, and stays beside the vehicle. End before any contact.

No extra countdown numbers, relighting lamps, sprinting horde, clear zombie faces, gore, fighting, weapon use, duplicate Xiaoxin, body jitter, handheld shake, warping tunnel, text, logo, or watermark. Reference Audio 1 is temporary timing guidance; restore the original master song in post-production.
\`\`\`

## P02B — 生成 6 秒 / 成片取 4.447 秒

- Picture 1：\`keyframes/selected/P02_group_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`keyframes/selected/P03_group_pull_start.png\`
- Reference Audio 1：\`references/audio/segments/P02B_39.404-43.851.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待重新生成

\`\`\`text
Picture 1 is the exact opening frame and controls the five-person full-body formation, wet three-way junction, spacing, reflections, and cyan-amber-red lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls the lead singer's face; the blurred standing views control his body, black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 preserves the same four distinct rescued men as backup dancers and the exact five-person cast. Reference Audio 1 is the exact chorus segment and controls Xiaoxin's Chinese singing mouth timing and the shared dance counts.

Create a six-second cinematic K-pop boy-group performance with exactly five young East Asian men and three clearly edited camera angles. Xiaoxin remains front-center and is the only singer, identified as (S1), singing <d>[Chinese] 我没有把你们忙丢，Hold on，马上就走。</d> Use clean, grounded point choreography: sharp arm lines, a simple two-step, one formation change, a single shoulder-pop ripple, and brief held stops. The movement is dance, not combat, running, or zombie behavior.

[Shot 1] From 00:00.000 to 00:02.000, use a low-angle 28mm full-body wide shot. All five begin in a shallow W formation with Xiaoxin at the front point. On the first two counts, everyone performs one precise side step to camera-right and closes the trailing foot without crossing legs. Their forearms cross once at sternum height, then snap open into symmetrical 45-degree downward diagonals with elbows fixed. They hold the open shape briefly, torsos upright, feet fully grounded, and faces serious.

[Shot 2] At 00:02.000, beat-matched hard cut to a true vertical overhead shot. In two counts, the four backup dancers take one short outward step each, changing the W into a clean shallow V while Xiaoxin remains the fixed front point; no one crosses another dancer's path. On “Hold on,” all five perform the signature point move once: right palm faces outward at shoulder height with fingers together like a clear stop sign, left hand stays close to the ribs, then both hands retract cleanly to the chest. The overhead camera remains locked so the formation is readable.

[Shot 3] At 00:03.800, hard cut to a straight-on 35mm medium-wide shot framing all five from boots to head. The four dancers perform one left-to-right shoulder-pop ripple, one dancer per beat, while Xiaoxin takes a single half-step forward, makes one controlled chest isolation, and sweeps his bandaged left forearm horizontally across his torso. On the final beat, all five stop in a balanced asymmetrical pose and hold it through the last frame.

Use crisp synchronized timing, 85 percent performance power, controlled knees, relaxed fingers, and clean two-frame-like visual stops between phrases. No freestyle, flailing, repeated crouching, jogging in place, excessive hip thrusts, jumping, spinning, touching, merged limbs, sixth person, cloned face, weapon, microphone, stage lights, camera shake, text, or logo. The generated soundtrack is temporary and will be replaced with the original master song.
\`\`\`

## S10 — 生成 6 秒 / 成片取 4.005 秒

- Picture 1：\`keyframes/selected/S10_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S10_43.851-47.856.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待重新生成

\`\`\`text
Picture 1 is the exact opening frame and controls Xiaoxin's face, shoulder radio, junction background, and mixed blue-red light. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls his face; the blurred standing views control his black clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 duplicates Picture 1 and is only a scene and composition reference. Reference Audio 1 is the exact target song segment and controls Xiaoxin's Chinese singing mouth timing, phrase pacing, and the cut on “脚却”.

Create a six-second cinematic two-shot sequence with locked, stable camera positions. Xiaoxin is the only singer, identified as (S1), singing <d>[Chinese] 嘴上答应每个出口，脚却停在岔路口。</d> Preserve his identity, outfit, lighting, and the three-way junction geometry across the cut. The emotional contrast comes from the edit, not from shaking, trembling, or exaggerated acting.

[Shot 1] From 00:00.000 to approximately 00:02.200, use a locked-off 65mm close-up of Xiaoxin's face, mouth, eyes, and shoulder radio. He sings the first phrase with precise lips and jaw, a steady head, relaxed shoulders, and only one natural breath. His eyes shift once from the green radio light to the red exit, but his torso does not sway. The camera is fixed on a tripod with zero pan, tilt, push, zoom, handheld motion, or focus breathing.

[Shot 2] At the first syllable of “脚却,” make a clean hard cut to a locked-off 50mm low insert showing both boots already stopped on the wet junction floor. The three route directions are readable through existing floor geometry and colored reflections; do not create new arrows or text. Both boots remain completely planted while the lyric finishes off-camera. Only rainwater ripples and distant reflected warning light may move. Hold this image steadily after Reference Audio 1 ends.

Absolute stability: no body vibration, no head bobbing, no nervous tremor, no camera shake, no micro-jitter, no pulse zoom, no rolling shutter, no frame warping, no drifting crop, and no continuous tilt down. No duplicated legs, deformed boots, extra people, new markings, text, or logo. The generated audio is temporary and will be replaced with the original master song.
\`\`\`

## P03 — 生成 8 秒 / 成片取 6.841 秒

- Picture 1：\`keyframes/selected/P03_group_pull_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`keyframes/selected/P02_group_start.png\`
- Reference Audio 1：\`references/audio/segments/P03_47.856-54.697.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待重新生成

\`\`\`text
Picture 1 is the exact opening frame and controls the five-person formation, wet underground junction, spacing, and cyan-amber-red lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls the center lead's face; the blurred standing views control his body, black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 preserves the same four distinct rescued men, their individual faces and outfits, and the exact five-person cast. Reference Audio 1 is the exact target song segment and controls Xiaoxin's Chinese singing mouth timing, phrasing, choreography accents, and the final three count hits.

Create an eight-second cinematic K-pop boy-group sequence with exactly five young East Asian men and three clearly edited shots. Xiaoxin remains the center lead and only singer, identified as (S1), singing <d>[Chinese] 不是不想把你们救，是我还没学会说不，当所有频道一起求救，三、二、一。</d> Use restrained but polished point choreography built from simple side steps, precise forearm angles, one controlled chest isolation, a short shoulder ripple, and a final formation opening. The dance expresses decision pressure; it must not resemble fighting, grabbing, panic, or zombies reaching for a victim.

[Shot 1] From 00:00.000 to 00:02.300, use a 32mm medium-wide full-body shot from a 25-degree diagonal angle. The camera tracks laterally at low amplitude while all five remain fully visible. Xiaoxin makes one side step to his right and closes his feet; the four dancers mirror in alternating directions without crossing paths. On the next count, everyone bends both elbows to clean 90-degree angles, draws the forearms once across the chest, then snaps them outward toward four diagonals. Hold the arm lines briefly with shoulders down, chests lifted, and feet planted.

[Shot 2] At 00:02.300, beat-matched hard cut to a tight three-quarter face-and-chest close-up of Xiaoxin from about 40 degrees off-axis. He never sings straight into the lens. His eyes move between the blue and red exits while he performs one small chest isolation and draws his bandaged left forearm back to his sternum. In the soft background, the four dancers perform one restrained left-to-right shoulder ripple; their hands never enter near Xiaoxin's face or neck. The camera makes a stable, very slow arc of low amplitude while he sings through “当所有频道一起求救”.

[Shot 3] At 00:05.100, hard cut to a true high overhead wide shot showing the junction geometry and all five full bodies. The four dancers form a precise diamond around Xiaoxin with a clear body-width gap. On “三,” all five soften their knees once and cross forearms at chest height. On “二,” they snap both forearms open toward the four routes, fingers together and palms flat. On “一,” each backup dancer glides exactly one step outward along his own route while Xiaoxin remains still at the center and raises one right palm in the signature stop gesture. Everyone freezes in the final formation through the last frame.

Use crisp synchronization, grounded weight, controlled knees, straight wrists, clean arm angles, and brief held stops. No vague reaching, freestyle, flailing, repeated squats, running in place, fighting poses, touching, body merging, extra arms, cloned dancers, sixth person, jumping, spinning, weapon, microphone, camera shake, text, or logo. Reference Audio 1 is temporary guidance; restore the original master song in post-production.
\`\`\`

## S12 — 生成 6 秒 / 成片取 2.947 秒

- Picture 1：\`keyframes/selected/S12_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S12_54.697-57.644.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls the three-way underground junction, tiny central Xiaoxin figure, cyan-amber-red route reflections, wet floor geometry, surrounding industrial architecture, and high-angle composition. Picture 2 is Xiaoxin's identity and wardrobe reference: use the blurred standing views to preserve his black survival clothing, body proportions, boots, and left-forearm bandage at distance; do not enlarge or replace him. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls the emotional hold on “我该去哪一处”.

Create a six-second cinematic isolation sequence with two stable high-angle shots. Xiaoxin remains completely alone and physically still at the same junction center. His apparent size changes only because of camera distance, not body morphing.

[Shot 1] From 00:00.000 to 00:02.300, begin from Picture 1 in a high oblique 35mm wide shot. The camera cranes upward and backward smoothly at slow speed and medium amplitude. Xiaoxin keeps both boots planted, lowers the radio by his side once, and looks between the blue and red routes without turning his body. The colored reflections remain fixed to their routes.

[Shot 2] At 00:02.300, hard cut to a true vertical overhead ultra-wide shot. Xiaoxin is a small but recognizable figure at the exact center. The cyan, amber, and red route lights dim one after another, leaving large dark negative space around him. The camera now locks completely; Xiaoxin does not move while Reference Audio 1 finishes. Hold the final lonely composition through the last frame.

No floating person, shrinking body, duplicated figure, route movement, rotating junction, new arrows, camera shake, drone wobble, pulse zoom, time-lapse, extra people, readable labels, text, logo, or watermark. Reference Audio 1 is temporary and will be replaced with the original master song.
\`\`\`

## S13 — 生成 6 秒 / 成片取 5.477 秒

- Picture 1：\`keyframes/selected/S13_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S13_57.644-63.121.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：已优化，待付费生成

\`\`\`text
Picture 1 is the exact opening frame and controls the abandoned radio in the wet foreground, four green channel lights, distant soft silhouette, industrial corridor, rain reflections, and cold teal atmosphere. Picture 2 is Xiaoxin's identity and wardrobe reference: use only the blurred standing views to preserve the distant silhouette's body proportions and black survival clothing; the face remains unrecognizable at this distance. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact outro segment and controls the off-screen calls, radio-static rhythm, SOS peak, and final channel cutoff.

Create a six-second cinematic outro with three clearly edited shots. The callers remain off-screen; no visible person lip-syncs. Preserve the same radio, exactly four green lights, and one distant Xiaoxin silhouette.

[Shot 1] From 00:00.000 to 00:01.700, begin from Picture 1 in a locked 85mm macro shot of the radio. On <d>[Chinese] 小鑫，请回答。</d>, the four green lights pulse together once, then continue a weak uneven flicker. Rain beads move slowly across the casing; the silhouette stays soft and still in the distance.

[Shot 2] At 00:01.700, hard cut to a 135mm telephoto shot focused on the distant silhouette from behind. On <d>[Chinese] 小鑫——</d>, he takes exactly one slow step away from camera and stops beneath the cold overhead light. The radio remains a blurred green glow at the extreme foreground edge. The camera is locked and does not follow.

[Shot 3] At 00:03.400, hard cut back to an extreme low-angle macro of the four channel lights. Static intensifies; on <d>[Chinese] SOS！</d>, all four lights cut out simultaneously and permanently. The image falls to near-black while faint rain reflection remains for at least twelve frames. No light turns back on.

No extra silhouette, visible caller, lip-sync, readable radio text, random light count, relighting, camera shake, pulse zoom, horror face, gore, subtitle, logo, or watermark. Reference Audio 1 is the temporary source and the original master audio will be restored in the final edit.
\`\`\`
