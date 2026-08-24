# MiniMax H3 图生视频提示词汇总 V0.5

> 当前执行真值，共14条。S02为已确认合格版本并保持原样；本版基于 Music Video Director 的歌词先行与镜头语法，对 S03、P01、S06、P02A、P02B、S10、P03 补齐正面表演的逐句情绪、视线、呼吸与反应。
>
> 本文件收录与 `prompts/runninghub_h3_v0.6/` 完全对应的正式英文执行提示词。14 条已完成付费生成；Batch 06 的 P02A、P02B、S10、P03 已通过技术验收，等待用户最终画面确认。

## 统一提交规则

- 所有任务 Picture 1 使用对应起始关键帧，Picture 2 使用 `references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png`。
- 非群舞任务省略 Picture 3，由 RunningHub CLI 自动复制 Picture 1。
- P02A、P02B、P03 使用另一张 v03 五人关键帧作为 Picture 3，只交叉保持四位伴舞的身份、服装和人数；队形与开场构图以各自 Picture 1 为唯一真值。
- v03 群舞起始帧只由 E16 空场景、小鑫原始角色卡和四位获救者原始角色卡直接重建，不使用旧群舞帧或中间生成图作为输入；视频阶段禁止新增污渍、纹理沸腾和皮肤脏点。
- Reference Audio 1 使用对应成片时间段的原歌曲切片；S01、S02、S03 的 Reference Audio 2 使用小鑫音色参考。
- 生成音轨只用于口型、节奏和音色参考，最终统一删除并重新铺设原始歌曲。
- S02不修改、不重做；Batch 06 之后如需再生成，先以本文件和对应任务记录为准进行局部调整，再由用户确认重提范围。

## S01 — 生成 6 秒 / 成片取 5.584 秒

- Picture 1：\`keyframes/selected/S01_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`references/infected/S01_三号门战斗场景参考_V0.1.png\`
- Reference Audio 1：\`references/audio/segments/S01_00.000-05.584.wav\`
- Reference Audio 2：小鑫音色参考
- 状态：Batch 05 已生成，用户确认合格

\`\`\`text
Picture 1 is the exact opening frame and controls the old four-channel radio, Xiaoxin's bandaged left forearm and gloved hand, wet floor reflections, green indicator lights, and teal-amber industrial lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: the sharp portrait controls his face in the combat shots; the blurred standing views control body proportions, black survival clothing, harness, gloves, boots, and the white bandage on his left forearm. Picture 3 controls the huge Number Three blast-door hall, lever mechanism, two separate distant infected silhouettes, wet floor geometry, and cyan-amber lighting. Preserve Picture 3's Xiaoxin only as the same subject defined by Picture 2, never as a second person. Reference Audio 1 is the exact target intro segment and controls the timing of the Chinese radio line and action cuts. Reference Audio 2 is Xiaoxin's voice-timbre reference and binds its restrained timbre and pace to Xiaoxin's off-screen voice.

Create a six-second cinematic radio-to-combat intro with three clearly edited shots. Xiaoxin (S1) says <d>[Chinese] 喂，收到请回答。</d> with timing from Reference Audio 1 and vocal quality from Reference Audio 2 while fighting to finish sealing Number Three Door. His voice remains controlled even though his body is under pressure.

[Shot 1] From 00:00.000 to 00:01.400, use a locked extreme macro beginning from Picture 1. Xiaoxin's bandaged left thumb presses the push-to-talk switch exactly once. The first green channel light turns on and moisture beads remain stable. The line begins off-screen; no face appears.

[Shot 2] At 00:01.400, hard cut to a 45mm side medium-wide shot in the blast-door hall from Picture 3. Exactly one nearer infected advances from the doorway and makes one clear reaching lunge. Xiaoxin steps diagonally outside its line once, holds a long steel pry bar horizontally with both hands, and performs one clean outward parry against the infected's forearms. The bodies make brief bar-to-forearm contact and immediately separate. The second infected remains several body lengths behind in cyan fog and never joins the contact. Use a short stable lateral camera move of low amplitude; keep all limbs readable.

[Shot 3] At 00:03.700, action-match hard cut to a low 35mm three-quarter full-body shot near the threshold. The first infected regains balance and advances once. Xiaoxin plants his left boot, delivers exactly one controlled right-foot push kick to its upper torso, and retracts the leg immediately; the infected falls backward across the threshold without gore. Xiaoxin turns only his upper body, pulls the heavy door lever down once with both hands, and the blast door begins closing between him and both infected silhouettes. Hold the narrowing cyan gap through the last frame while his radio line finishes.

Exactly two infected and one Xiaoxin. Grounded survival combat, clear preparation-contact-recovery, no martial-arts flourish, no repeated strikes, no head hit, no infected face close-up, no bite, no blood spray, no gore, no body merging, no extra weapon, no duplicated Xiaoxin, no malformed hands or feet, no changing bandage side, no camera shake, no whip-pan, no speed ramp, no subtitles, logo, or watermark. The generated audio is temporary and will be replaced with the original master song.
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
- 状态：Batch 05 已生成，用户确认合格

\`\`\`text
Picture 1 is the exact opening frame and controls Xiaoxin's face, scratches, black survival clothing, shoulder radio, bandaged left forearm, wet industrial background, and cold teal light. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls facial identity; the blurred standing views control body proportions, clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target spoken segment and controls the Chinese mouth timing. Reference Audio 2 is Xiaoxin's voice-timbre reference and binds its restrained, tired, reassuring delivery to Xiaoxin.

Create a six-second cinematic emotional performance with three clearly edited shots. Xiaoxin is the only speaker, identified as (S1), and says <d>[Chinese] 再等我一下。</d> His playable objective is to keep an unseen caller calm while concealing his own fear. He addresses the shoulder radio rather than performing to the camera.

[Shot 1] From 00:00.000 to 00:01.300, use a locked extreme insert of Xiaoxin's bandaged left hand touching the shoulder-radio button once. The glove and bandage remain anatomically correct. A green radio reflection grazes the fabric; the background stays soft.

[Shot 2] At 00:01.300, action-match cut to a 70mm three-quarter face close-up about 35 degrees off-axis. Xiaoxin's eyeline stays on the shoulder radio, about 12 degrees camera-left of the lens. On “再等我,” he deliberately steadies his brow and speaks with firm, economical mouth movement, as if stopping the caller from panicking. On “一下,” the final syllable becomes softer: his eyes warm briefly, but the corners of his mouth do not form a smile. His head and shoulders stay still while the camera makes a very slow, low-amplitude push-in.

[Shot 3] At 00:03.800, hard cut to an extreme close-up of his eyes and upper cheek from the opposite side. Only after the line ends, he closes his mouth, takes one shallow breath through the nose, blinks once, and lowers his gaze. The lower eyelids tighten and the borrowed reassurance drains away into private worry; a tiny swallow is the final reaction. The camera is locked and his head does not move.

No repeated nodding, head wobble, trembling shoulders, crying, heroic pose, direct-to-lens performance, extra person, face drift, malformed hand, camera shake, pulse zoom, text, or logo. Reference Audio 1 and 2 are generation guides; the final edit will restore the original master audio.
\`\`\`

## S04 — 生成 6 秒 / 成片取 4.040 秒

- Picture 1：\`keyframes/selected/S04_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`references/infected/尸潮远景群体参考_V0.4.png\`
- Reference Audio 1：\`references/audio/segments/S04_16.161-20.201.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 04 已生成，合格

\`\`\`text
Picture 1 is the exact opening frame and controls the rescue-vehicle interior, Xiaoxin's rear three-quarter position, single steering wheel, dashboard radio bank, four green channel lights, wet windshield, city lights, and teal-amber lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: use the sharp portrait only if his profile becomes visible; use the blurred standing views for black survival clothing, harness, gloves, and left-forearm bandage. Picture 3 controls only the distant infected-crowd silhouettes, uneven restrained gait, spacing, and fog-softened visibility. Ignore Picture 3's tunnel, vehicle, lamps, and any foreground person. Reference Audio 1 is the exact target song segment and controls the rhythm of channel switching and listening beats; it is not physically sung on camera.

Create a six-second cinematic vehicle-interior montage with three stable shots. Preserve one vehicle layout, one Xiaoxin, one steering wheel, the same four-channel device, and consistent rain outside.

[Shot 1] From 00:00.000 to 00:01.700, begin from Picture 1 in a 35mm over-shoulder medium-wide shot from the rear passenger seat. Xiaoxin's right hand turns the first channel knob once, then the second knob once. The first two green lights respond separately. Through the wet windshield, three to five small infected silhouettes from Picture 3 cross a distant headlight beam from left to right with slow irregular steps. They remain outside and far behind the glass. The camera performs one short, smooth truck-right movement of low amplitude; his torso remains steady.

[Shot 2] At 00:01.700, hard cut to an extreme dashboard insert. Four separate channel meters pulse one after another in a left-to-right sequence, each only once, matching the phrase “语音拆成一条一条”. The gloved fingertip switches channels with one clean press per channel. The camera is locked; no numbers or readable interface text are created.

[Shot 3] At 00:03.500, hard cut to a passenger-side three-quarter profile medium close-up. Xiaoxin stops operating the radio and listens as all four green lights remain active in soft foreground. His eyes shift once across the four devices, then settle on the rain-covered road as “每个频道都等我回报” finishes. Behind his profile, five to seven distant infected silhouettes gather loosely beyond the windshield; they stay soft, separated, and much smaller than Xiaoxin. His mouth stays closed and his breathing remains controlled.

No infected inside the vehicle, clear infected face, gore, attack, repeated knob spinning, duplicated controls, extra steering wheel, random hand motion, mouth singing, camera shake, body vibration, dashboard warping, new text, logo, or watermark. Reference Audio 1 is temporary timing guidance and will be replaced by the original master song.
\`\`\`

## P01 — 生成 6 秒 / 成片取 4.470 秒

- Picture 1：\`keyframes/selected/P01_solo_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/P01_20.201-24.671.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 05 已生成，用户确认合格

\`\`\`text
Picture 1 is the exact opening frame and controls Xiaoxin's initial pose, the rescue-vehicle interior, blue water tanks, distant orange fire, rain, and teal-orange lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls his face; the blurred standing views control body proportions, black distressed work shirt, harness, gloves, and the white bandage on his left forearm. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls lyric timing, Chinese singing mouth shapes, breath timing, and phrasing.

Create a cinematic six-second music-video performance with three clearly edited shots. Xiaoxin is the only singer, identified as (S1). His complete lyric is <d>[Chinese] A区缺水，C区燃烧，我说放心，一个都不会少。</d> The singing continues seamlessly across the cuts. His playable objective is to reassure four unseen callers while the evidence around him tells him that he may fail. He performs to those imagined callers through the radio, not to an audience; direct lens contact is reserved for one brief intentional promise.

[Shot 1] From 00:00.000 to 00:01.600, begin from Picture 1 in a three-quarter medium shot from the passenger side, about 35 degrees off Xiaoxin's front. The camera makes a short, smooth lateral slide of low amplitude. On “A区缺水,” his eyes settle on the blue water tanks; his brow draws inward once and his jaw firms. On “C区燃烧,” his gaze moves to the orange fire outside; the lower eyelids tense and one small inhale catches, but he keeps singing without a head turn or theatrical grimace. His right hand remains near the radio instead of gesturing toward the viewer.

[Shot 2] At 00:01.600, hard cut on the beat to a tight insert of Xiaoxin's gloved right hand pressing one radio channel key. The green channel light clicks on; blue water tanks remain soft in the left background and fire reflection flickers on wet glass at right. His singing continues off-camera. The camera is locked and stable; the hand performs only one clean press and release.

[Shot 3] At 00:03.000, action-match cut to a tight three-quarter face close-up from the driver-side window. Xiaoxin begins with his eyeline about 10 degrees camera-right of the lens, fixed on the road beyond the windshield. On “我说放心,” he intentionally smooths his brow and releases one controlled breath, trying to sound certain without smiling. On “一个都不会少,” he meets the lens for no longer than half a second as a direct promise to the unseen callers, then breaks eyeline toward the radio. A tiny swallow and a slight release of the lower lip reveal doubt beneath the promise. Use a slow, smooth push-in of very low amplitude. After Reference Audio 1 ends, he closes his mouth and holds still.

Natural restrained singing, no news-reading delivery, no idol smile, no blank wide-eyed stare, no repeated nodding, no hand reaching toward the lens, no microphone, no extra person, no face drift, no malformed fingers, no camera shake, no pulse zoom, no text, and no logo. The generated audio is temporary and will be replaced by the original master song.
\`\`\`

## S06 — 生成 8 秒 / 成片取 6.711 秒

- Picture 1：\`keyframes/selected/S06_fight_start_v01.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`references/infected/近身感染者动作参考_V0.3.png\`
- Reference Audio 1：\`references/audio/segments/S06_24.671-31.382.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 05 已生成，用户确认合格

\`\`\`text
Picture 1 is the exact opening frame and controls the abandoned wet city corridor, rescue vehicle and amber lamps at left, rail lines, Xiaoxin's left-to-right running pose, exactly two infected blocking the route, teal haze, and orange reflections. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait controls his face; the blurred standing views control body proportions, black survival clothing, harness, gloves, boots, and the white bandage on his left forearm. Picture 3 controls only the infected silhouettes, hunched posture, uneven restrained gait, and dark clothing. Ignore Picture 3's tunnel and all non-infected foreground elements. Reference Audio 1 is the exact target song segment and controls singing timing, running cadence, combat beats, and phrase transitions.

Create an eight-second cinematic run-fight-run music-video sequence with three clearly edited shots. Xiaoxin is the only singer, identified as (S1), singing <d>[Chinese] 先开玩笑，再说抱歉，只有抵达时间没有写。</d> The singing continues seamlessly during the combat insert. Xiaoxin always progresses from screen-left toward screen-right. His objective is to get past the infected without becoming trapped while keeping his unseen caller calm.

[Shot 1] From 00:00.000 to 00:02.200, begin exactly from Picture 1 in a 28mm environment wide shot. A stabilized lateral tracking camera follows Xiaoxin running left-to-right through two natural splashes. The nearer infected takes one uneven step into his route and lifts one arm; the farther infected stays behind in teal fog. Xiaoxin shortens one stride, keeps his eyes on the nearer infected, and draws one short steel rescue baton from his right hip with his right hand. No contact occurs before the cut.

[Shot 2] At 00:02.200, action-match hard cut to a 50mm side medium shot. The nearer infected makes exactly one reaching lunge. Xiaoxin side-steps camera-right once, uses the baton to redirect the reaching forearm outward in one clean parry, then delivers exactly one short baton strike to the infected's upper torso, never the head. The infected rotates away and falls out of Xiaoxin's path. Xiaoxin recovers the baton close to his own ribs and continues forward. The farther infected remains soft and never enters contact. Use a stable camera with no shake; preparation, contact, separation, and recovery must all be readable.

[Shot 3] At 00:05.200, hard cut to a 40mm front three-quarter medium tracking shot on a stable gimbal moving backward as Xiaoxin accelerates past the fallen infected. He lowers the baton beside his right thigh and raises the radio near his left shoulder without covering his face. On “先开玩笑,” tired humor appears only as one brief eyebrow lift; both mouth corners remain neutral and his eyes remain serious. On “再说抱歉,” the eyebrow releases, his gaze dips to the radio for one beat, and he exhales once. On “只有抵达时间没有写,” his jaw tightens and he looks back to the road beside the lens, never into the lens. The second infected remains far behind and does not catch him. End with urgent forward motion.

Exactly two infected and one Xiaoxin. Grounded survival combat, no cheerful smile, no frantic flailing, no superhuman move, no repeated attack, no head strike, no bite, no blood spray, no gore, no infected close-up, no body merging, no duplicated legs, no foot sliding, no body jitter, no handheld shake, no whip-pan, no speed ramp, no malformed hands, no readable road text, logo, or watermark. Reference Audio 1 guides timing; replace the generated soundtrack with the original master song.
\`\`\`

## S07 — 生成 4 秒 / 成片取 1.552 秒

- Picture 1：\`keyframes/selected/S07_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S07_31.382-32.934.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 05 已生成，用户确认合格

\`\`\`text
Picture 1 is the exact opening frame and controls the worn folded city map, four red warning beacons, one cyan route, wet metal tabletop, Xiaoxin's gloved and bandaged hand, and overhead composition. Picture 2 is Xiaoxin's wardrobe and hand reference: use the blurred standing views only to preserve glove design and the white bandage on his left forearm; no face appears. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls the four warning pulses for “四栋楼同时呼叫”.

Create a four-second cinematic map sequence with three concise macro shots and no readable labels.

[Shot 1] From 00:00.000 to 00:01.100, begin from Picture 1 in a locked true top-down shot. The four red beacons pulse simultaneously once, then pulse in a quick clockwise sequence. Xiaoxin's bandaged fingertip enters from the lower edge and stops over the center intersection without touching the paper.

[Shot 2] At 00:01.100, hard cut to a very low raking macro across the map surface. The camera slides smoothly past the four red reflections while the cyan route remains a single unbroken line. Paper folds, moisture, and ink texture stay stable; the fingertip hovers in soft background.

[Shot 3] At 00:02.300, hard cut back to a slightly wider true overhead. The four red beacons remain active while the cyan route narrows visually toward one constrained corridor. Xiaoxin's fingertip moves once between two routes, then freezes exactly at the unresolved split. Hold the final frame.

No map morphing, new roads, moving printed lines, readable place names, numeric UI, extra hands, finger deformation, random light blinking, camera shake, pulse zoom, logo, or watermark. Reference Audio 1 is temporary timing guidance and will be replaced with the original master song.
\`\`\`

## P02A — 生成 4 秒 / 成片取 2.000 秒

- Picture 1：\`keyframes/selected/P02_group_cluster_start_v03.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`keyframes/selected/P03_group_wall_start_v03.png\`
- Reference Audio 1：\`references/audio/segments/P02A_32.934-34.934.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 06 已生成，技术验收通过，待用户最终画面确认

\`\`\`text
Picture 1 is the exact opening frame and controls the clean five-person compact asymmetric formation, the 35mm left-front viewpoint, wet underground junction, foreground-to-background depth, reflections, and cyan-amber-red lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait controls the lead's face; the blurred standing views control his black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 preserves the same four distinct rescued men and their separate faces and outfits, but its human-wall pose is only a cast reference. Reference Audio 1 is the exact target segment and controls Xiaoxin's singing mouth timing and the shared dance counts.

Create a four-second teaser of polished K-pop boy-group point choreography with exactly five young East Asian men and two clearly edited angles. Xiaoxin remains the center lead and only singer, identified as (S1), singing <d>[Chinese] 一辆车，一条隧道。</d> The movement is restrained, precise, and ominous. The five men orient toward real escape routes under pressure rather than presenting themselves to an audience.

[Shot 1] From 00:00.000 to 00:02.200, begin exactly from Picture 1 in a 35mm full-body medium-wide shot about 25 degrees left-front at chest height. Keep the compact asymmetric arrowhead and its unequal depths. The camera performs one smooth 30-degree short arc from left-front toward the frontal axis while pushing in very slightly; the near shoulders create visible parallax, but no person crosses another path. On “一辆车,” Xiaoxin sings with a tightened brow and takes one controlled half-step forward while drawing his bandaged left forearm once toward his sternum. The two dancers behind his shoulders each make one small opposite torso rotation without touching him; the lower dancer rises only a few centimeters and the taller rear dancer turns once toward the red route. All four backup dancers keep hands close to their own ribs and distinct route-specific eyelines. End the shot on one brief compressed hold.

[Shot 2] At 00:02.200, beat-matched hard cut to a true vertical overhead shot. On “一条隧道,” the four dancers pivot their torsos once toward four different directions and each shifts only one foot half a step outward, changing the compact cluster into an irregular directional fan rather than a W, V, or diamond. Xiaoxin remains the fixed visual center and raises his right palm only to chest height. Hold the readable route shape through the final frame.

Use relaxed neutral transitions and keep heads, hands, forearms, and lower bodies anatomically separate. No complete 360-degree orbit, flat lineup, equal spacing, identical wide stances, mannequin pose, crouching bounce, freestyle, flailing, fighting, grabbing, reaching toward Xiaoxin, touching, merged limbs, sixth person, cloned face, jumping, spinning, camera shake, new stains, texture boiling, skin speckle, text, or logo. Reference Audio 1 is temporary and will be replaced by the original master song.
\`\`\`

## S08 — 生成 6 秒 / 成片取 4.470 秒

- Picture 1：\`keyframes/selected/S08_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S08_34.934-39.404.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 03 已生成，合格

\`\`\`text
Picture 1 is the exact opening frame and controls the single-lane industrial tunnel, rescue vehicle, Xiaoxin's position beside it, five red warning lights along the wet track, distant crowd silhouettes, mist, and teal-orange lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp portrait controls his face if visible; the blurred standing views control body proportions, black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls the five-light countdown and the crowd's final advance.

Create a six-second cinematic threat sequence with three stable shots. The distant crowd remains atmospheric pressure, never becomes a gore close-up, and never reaches Xiaoxin.

[Shot 1] From 00:00.000 to 00:01.700, begin from Picture 1 in a 32mm medium-wide shot behind and slightly beside Xiaoxin. He stands next to the vehicle, raises the radio once, and extends one open palm toward the tunnel as if asking for five more seconds. The first red warning light goes dark. The camera makes a slow, stable push of low amplitude.

[Shot 2] At 00:01.700, hard cut to a ground-level 85mm insert looking along the five red warning lights. Lights two, three, four, and five extinguish one at a time on separate beats. Each lamp goes dark permanently; none relights. Reflections disappear correspondingly from the wet floor while the camera remains locked.

[Shot 3] At 00:03.900, hard cut to a compressed 100mm telephoto long shot down the tunnel. The distant crowd silhouettes take only two slow collective steps closer through fog while remaining indistinct. Xiaoxin occupies a sharp foreground edge in three-quarter profile, lowers his open hand, tightens his jaw, and stays beside the vehicle. End before any contact.

No extra countdown numbers, relighting lamps, sprinting horde, clear zombie faces, gore, fighting, weapon use, duplicate Xiaoxin, body jitter, handheld shake, warping tunnel, text, logo, or watermark. Reference Audio 1 is temporary timing guidance; restore the original master song in post-production.
\`\`\`

## P02B — 生成 6 秒 / 成片取 4.447 秒

- Picture 1：\`keyframes/selected/P02_group_cluster_start_v03.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`keyframes/selected/P03_group_wall_start_v03.png\`
- Reference Audio 1：\`references/audio/segments/P02B_39.404-43.851.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 06 已生成，技术验收通过，待用户最终画面确认

\`\`\`text
Picture 1 is the exact opening frame and controls the clean five-person compact asymmetric formation, 35mm left-front viewpoint, wet junction, layered spacing, reflections, and cyan-amber-red lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait controls the lead singer's face; the blurred standing views control his body, black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 preserves the same four distinct rescued men and their individual outfits; use it only to lock cast identity, not to replace Picture 1's opening formation. Reference Audio 1 is the exact chorus segment and controls Xiaoxin's Chinese singing mouth timing and the shared dance counts.

Create a six-second cinematic K-pop boy-group performance with exactly five young East Asian men and three clearly edited camera angles. Xiaoxin remains the center lead and only singer, identified as (S1), singing <d>[Chinese] 我没有把你们忙丢，Hold on，马上就走。</d> His playable objective is to make four frightened people believe him while already unsure which route he can take. The spatial story is compact pressure, one sudden opening, then an unresolved layered finish.

[Shot 1] From 00:00.000 to 00:02.000, begin exactly from Picture 1 in a 35mm full-body medium-wide shot about 25 degrees left-front at chest height. The camera performs one smooth 35-degree short arc toward the frontal axis with a very slight push-in. Foreground shoulders produce parallax while all five retain unequal depths; do not flatten them into a row. On “我没有把你们忙丢,” Xiaoxin gives the lens one brief half-second defensive plea on “没有,” then looks toward the central route. The four dancers each take one small inward half-step or weight shift, compressing the group once without crossing paths or touching. Xiaoxin crosses his bandaged left forearm once over his sternum; the dancers form different clean elbow angles close to their own ribs. Hold the dense formation for one beat.

[Shot 2] At 00:02.000, beat-matched hard cut to a locked true vertical overhead shot. On “Hold on,” Xiaoxin raises one right stop palm at shoulder height. At the same instant, each backup dancer takes exactly one short outward step along his assigned direction, opening the compressed cluster into an irregular four-ray formation with unequal distances; it must not become a shallow V or perfect diamond. Hands stay on each dancer's own body line. Hold the open route geometry briefly.

[Shot 3] At 00:03.700, hard cut to a 40mm medium-wide shot from the opposite front diagonal. One backup dancer's shoulder passes the extreme foreground as a natural wipe, then clears Xiaoxin's face. On “马上,” Xiaoxin softens his brow and meets the lens for no longer than half a second. On “就走,” his eyes break toward two competing exits and he swallows once. The four dancers perform one restrained shoulder-pop ripple from nearest to farthest while preserving different levels and route eyelines. Xiaoxin takes one half-step forward, makes one controlled chest isolation, and draws his bandaged left forearm horizontally back to his sternum. End in a layered asymmetrical pose, not a lineup.

Use crisp grounded timing, controlled knees, relaxed fingers, clean separation, and brief held stops. No complete 360-degree orbit, flat row, shallow W or V, equal spacing, five identical wide stances, all five front-facing, frozen idol smile, blank lens stare, freestyle, running in place, jumping, spinning, reaching toward Xiaoxin, touching, merged limbs, sixth person, cloned face, weapon, microphone, stage lights, camera shake, new dirt patterns, texture boiling, skin speckle, text, or logo. The generated soundtrack is temporary and will be replaced with the original master song.
\`\`\`

## S10 — 生成 6 秒 / 成片取 4.005 秒

- Picture 1：\`keyframes/selected/S10_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：自动复制 Picture 1
- Reference Audio 1：\`references/audio/segments/S10_43.851-47.856.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 06 已生成，技术验收通过，待用户最终画面确认

\`\`\`text
Picture 1 is the exact opening frame and controls Xiaoxin's face, shoulder radio, junction background, and mixed blue-red light. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls his face; the blurred standing views control his black clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 duplicates Picture 1 and is only a scene and composition reference. Reference Audio 1 is the exact target song segment and controls Xiaoxin's Chinese singing mouth timing, phrase pacing, and the cut on “脚却”.

Create a six-second cinematic two-shot sequence with locked, stable camera positions. Xiaoxin is the only singer, identified as (S1), singing <d>[Chinese] 嘴上答应每个出口，脚却停在岔路口。</d> Preserve his identity, outfit, lighting, and the three-way junction geometry across the cut. His playable objective is to sound dependable to the unseen callers while recognizing that his body has already stopped. The emotional contrast comes from the edit and small facial reactions, not from shaking, trembling, or exaggerated acting.

[Shot 1] From 00:00.000 to approximately 00:02.200, use a locked-off 65mm close-up of Xiaoxin's face, mouth, eyes, and shoulder radio. Although his face is nearly frontal, his eyeline stays about 12 degrees camera-left on the green radio light, never blankly staring into the lens. On “嘴上答应,” he intentionally softens his brow and eyes as if calming a caller; the lips and jaw remain precise and the mouth corners stay neutral. On “每个出口,” his eyes travel once from the green radio light to the red exit, the lower eyelids tighten, and the jaw sets as the impossible promise registers. At the end of the phrase he closes his lips, makes one tiny swallow, and remains still for the cut. His head stays steady, shoulders relaxed, with only one natural breath. The camera is fixed on a tripod with zero pan, tilt, push, zoom, handheld motion, or focus breathing.

[Shot 2] At the first syllable of “脚却,” make a clean hard cut to a locked-off 50mm low insert showing both boots already stopped on the wet junction floor. The three route directions are readable through existing floor geometry and colored reflections; do not create new arrows or text. Both boots remain completely planted while the lyric finishes off-camera. Only rainwater ripples and distant reflected warning light may move. Hold this image steadily after Reference Audio 1 ends.

Absolute stability: no body vibration, no head bobbing, no nervous tremor, no camera shake, no micro-jitter, no pulse zoom, no rolling shutter, no frame warping, no drifting crop, and no continuous tilt down. No duplicated legs, deformed boots, extra people, new markings, text, or logo. The generated audio is temporary and will be replaced with the original master song.
\`\`\`

## P03 — 生成 8 秒 / 成片取 6.841 秒

- Picture 1：\`keyframes/selected/P03_group_wall_start_v03.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`keyframes/selected/P02_group_cluster_start_v03.png\`
- Reference Audio 1：\`references/audio/segments/P03_47.856-54.697.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 06 已生成，技术验收通过，待用户最终画面确认

\`\`\`text
Picture 1 is the exact opening frame and controls the clean five-person human-wall formation, 40mm right-front viewpoint, foreground shoulder framing, wet underground junction, layered spacing, and cyan-amber-red lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait controls the center lead's face; the blurred standing views control his body, black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 preserves the same four distinct rescued men and their individual outfits; use it only to lock the five-person cast, not to replace Picture 1's human-wall opening. Reference Audio 1 is the exact target song segment and controls Xiaoxin's Chinese singing timing, phrasing, choreography accents, and final three count hits.

Create an eight-second cinematic K-pop boy-group sequence with exactly five young East Asian men and three clearly edited shots. Xiaoxin remains the center lead and only singer, identified as (S1), singing <d>[Chinese] 不是不想把你们救，是我还没学会说不，当所有频道一起求救，三、二、一。</d> His objective is to confess the truth to the four people he promised to save while resisting the admission. The spatial story is human-wall pressure, camera reveal, then a final four-direction rupture. It is dance, never an attack.

[Shot 1] From 00:00.000 to 00:02.400, begin exactly from Picture 1 in a 40mm full-body medium-wide shot about 35–40 degrees right-front at chest height. The two near dancers keep their back-three-quarter and side-profile positions as foreground parallax anchors. The camera makes one stable 35-degree short arc toward the frontal axis with a slight push-in, gradually revealing more of Xiaoxin between their shoulders. No body crosses another path and no one touches. On “不是不想把你们救,” Xiaoxin looks toward the blue route with a tightened brow. On “是我还没学会说不,” his gaze drops for one beat and his jaw loosens from defense into shame. His bandaged left forearm stays against his own sternum. The four backup dancers keep both hands on their own ribs or chest lines; the two rear dancers pivot their torsos once toward competing routes. Hold the compressed human wall for one beat.

[Shot 2] At 00:02.400, action-matched hard cut to a 70mm three-quarter face-and-chest close-up about 40 degrees off-axis. The near dancers become only soft shoulder edges at opposite sides of frame and never obscure Xiaoxin's face. On “当所有频道,” he raises his gaze toward the green radio light and takes one shallow breath. On “一起求救,” his eyes move once from the blue exit to the red exit while his head stays nearly still; the lower eyelids tighten and the mouth finishes with restrained urgency. He performs one small chest isolation and tightens his bandaged left forearm to his sternum. The camera continues a very slow low-amplitude arc, completing the reveal without orbiting behind him.

[Shot 3] At 00:05.100, hard cut to a locked true vertical overhead wide shot showing the junction geometry and all five full bodies. The dancers begin as an irregular compressed spiral around Xiaoxin, not a perfect diamond. On “三,” all five soften their knees once and the four dancers draw elbows close to their own chests. On “二,” each dancer rotates his torso toward a different exit and opens both forearms outward along his own body line. On “一,” each backup dancer glides exactly one step outward along his assigned direction while Xiaoxin remains still at center and raises one right stop palm. The final formation is a broken four-ray rupture with unequal distances and large negative gaps, held through the last frame.

Use crisp grounded synchronization, controlled knees, straight wrists, clean anatomical separation, and relaxed neutral transitions. No complete 360-degree orbit, flat row, W, V, perfect diamond opening, equal spacing, vague reaching, zombie attack, grabbing, touching, body merging, extra arms, cloned dancers, sixth person, jumping, spinning, weapon, microphone, camera shake, new stains, texture boiling, skin speckle, text, or logo. Reference Audio 1 is temporary guidance; restore the original master song in post-production.
\`\`\`

## S12 — 生成 6 秒 / 成片取 2.947 秒

- Picture 1：\`keyframes/selected/S12_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`references/infected/尸潮远景群体参考_V0.4.png\`
- Reference Audio 1：\`references/audio/segments/S12_54.697-57.644.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 04 已生成，用户确认合格

\`\`\`text
Picture 1 is the exact opening frame and controls the three-way underground junction, tiny central Xiaoxin figure, cyan-amber-red route reflections, wet floor geometry, surrounding industrial architecture, and high-angle composition. Picture 2 is Xiaoxin's identity and wardrobe reference: use the blurred standing views to preserve his black survival clothing, body proportions, boots, and left-forearm bandage at distance; do not enlarge or replace him. Picture 3 controls only the distant infected-crowd silhouettes, uneven restrained gait, body spacing, and fog-softened density. Ignore Picture 3's tunnel, vehicle, lamps, and any foreground person. Reference Audio 1 is the exact target song segment and controls the emotional hold on “我该去哪一处”.

Create a six-second cinematic encirclement sequence with two stable high-angle shots. Xiaoxin is the only uninfected human and remains physically still at the same junction center. Three small infected groups remain at the distant outer ends of the three routes. His apparent size changes only because of camera distance, not body morphing.

[Shot 1] From 00:00.000 to 00:02.300, begin from Picture 1 in a high oblique 35mm wide shot. The camera cranes upward and backward smoothly at slow speed and medium amplitude. Xiaoxin keeps both boots planted, lowers the radio by his side once, and looks between the blue and red routes without turning his body. As more of the junction is revealed, one small infected cluster becomes visible at the far end of each cyan, amber, and red route. Each cluster takes only one slow uneven step toward the center and remains in the outer third of frame. The colored reflections remain fixed to their routes.

[Shot 2] At 00:02.300, hard cut to a true vertical overhead ultra-wide shot. Xiaoxin is a small but recognizable figure at the exact center. The three distant infected clusters form an incomplete closing triangle around him while maintaining a large empty safety radius and never touching him. The cyan, amber, and red route lights dim one after another, turning the clusters into dark silhouettes and leaving Xiaoxin isolated in negative space. The camera now locks completely; Xiaoxin does not move while Reference Audio 1 finishes. Hold the final trapped composition through the last frame.

No extra survivor, clear infected face, gore, running infected, physical contact, floating person, shrinking body, duplicated Xiaoxin, route movement, rotating junction, new arrows, camera shake, drone wobble, pulse zoom, time-lapse, readable labels, text, logo, or watermark. Reference Audio 1 is temporary and will be replaced with the original master song.
\`\`\`

## S13 — 生成 6 秒 / 成片取 5.477 秒

- Picture 1：\`keyframes/selected/S13_start.png\`
- Picture 2：\`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png\`
- Picture 3：\`references/infected/尸潮远景群体参考_V0.4.png\`
- Reference Audio 1：\`references/audio/segments/S13_57.644-63.121.wav\`
- Reference Audio 2：Audio 1副本占位
- 状态：Batch 04 已生成，合格

\`\`\`text
Picture 1 is the exact opening frame and controls the abandoned radio in the wet foreground, four green channel lights, distant soft silhouette, industrial corridor, rain reflections, and cold teal atmosphere. Picture 2 is Xiaoxin's identity and wardrobe reference: use only the blurred standing views to preserve the distant silhouette's body proportions and black survival clothing; the face remains unrecognizable at this distance. Picture 3 controls only the distant infected-crowd silhouettes, uneven restrained gait, spacing, and fog-softened visibility. Ignore Picture 3's tunnel, vehicle, lamps, and any foreground person. Reference Audio 1 is the exact outro segment and controls the off-screen calls, radio-static rhythm, SOS peak, and final channel cutoff.

Create a six-second cinematic outro with three clearly edited shots. The callers remain off-screen; no visible person lip-syncs. Preserve the same radio, exactly four green lights, one distant Xiaoxin silhouette, and a separate fog-softened infected crowd that never merges with him.

[Shot 1] From 00:00.000 to 00:01.700, begin from Picture 1 in a locked 85mm macro shot of the radio. On <d>[Chinese] 小鑫，请回答。</d>, the four green lights pulse together once, then continue a weak uneven flicker. Rain beads move slowly across the casing. Xiaoxin stays soft and still in the distance while faint infected silhouettes from Picture 3 emerge separately at both far corridor edges.

[Shot 2] At 00:01.700, hard cut to a 135mm telephoto shot focused on Xiaoxin from behind. On <d>[Chinese] 小鑫——</d>, he takes exactly one slow step away from camera and stops beneath the cold overhead light. Five to eight infected silhouettes become visible deeper in the fog beyond him, remain at least several body lengths away, and advance only one slow uneven step. The radio remains a blurred green glow at the extreme foreground edge. The camera is locked and does not follow.

[Shot 3] At 00:03.400, hard cut back to an extreme low-angle macro of the four channel lights. Soft infected shadows pass across the distant wet reflection without entering focus. Static intensifies; on <d>[Chinese] SOS！</d>, all four lights cut out simultaneously and permanently. The image falls to near-black while faint rain reflection remains for at least twelve frames. No light turns back on.

No extra Xiaoxin, visible caller, merged bodies, infected close-up, clear infected face, attack, lip-sync, readable radio text, random light count, relighting, camera shake, pulse zoom, horror face, gore, subtitle, logo, or watermark. Reference Audio 1 is the temporary source and the original master audio will be restored in the final edit.
\`\`\`
