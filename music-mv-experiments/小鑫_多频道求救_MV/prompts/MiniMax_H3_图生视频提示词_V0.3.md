# MiniMax H3 图生视频提示词汇总 V0.3

> 当前汇总真值，共14条镜头。S02采用首批已通过版本；P01、P02B、S10、P03采用V0.4修订方案。其余任务沿用V0.2。
>
> 五条已验证/修订任务在本文件中收录与实际 RunningHub 文件一致的完整英文 prompt。P01、P02B、S10、P03 已通过免费 dry-run，尚未重新付费生成。

## 固定提交规则

- Picture 1：对应任务的起始关键帧。
- 所有含小鑫任务额外上传 `references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png` 作为 `(S1)` 人物参考。
- 受3张图片上限限制，群舞任务不能同时上传四张独立获救者角色卡；四位伴舞身份和服装以已经包含五人的关键帧交叉锁定。
- P02B：Picture 1 使用 `P02_group_start.png`，Picture 2 使用小鑫专用角色卡，Picture 3 使用 `P03_group_pull_start.png`。
- P03：Picture 1 使用 `P03_group_pull_start.png`，Picture 2 使用小鑫专用角色卡，Picture 3 使用 `P02_group_start.png`。
- 其他任务 Picture 3 省略，由 RunningHub CLI 自动复制 Picture 1；P02A 正式提交前沿用同一五人交叉参考策略。
- 每次提交完整复制“图片对齐指令＋三个字段”，不要只复制动作描述。

## 音频绑定与后期替换

- Reference Audio 1：对应镜头的原歌曲切片，用于歌词节奏、对嘴和舞蹈节拍，不保证模型逐样本复制。
- S02、S03 的 Reference Audio 2：`references/audio/小鑫_音色参考_12.715s.wav`，明确绑定给小鑫 `(S1)` 的音色、语速和说话质感。
- 其他任务不单独提供 Audio 2；CLI 使用 Audio 1 副本占位，prompt 不描述 Audio 2。
- 所有生成视频下载后统一移除模型音轨，最终重新铺设原始歌曲；音色参考不能替代成片主音轨。

## S01 — 6.00 秒

**Picture 1：** `keyframes/selected/S01_start.png`

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，微距镜头保持 <Picture 1> 的无线电、绷带手、湿地反光和构图完全一致。镜头以极小幅度、慢速向内推近，绷带拇指压下通话键，四枚绿色频道灯依次亮起；潮湿外壳中的眼部倒影眨动一次，最后一灯稳定亮起后动作落定。

overall_soundscape: 低沉静电持续，按钮发出轻微咔哒声，四次短促电流声依次出现，远处雨水落在金属地面。

non_diegetic_music: N/A
```

**成片取用：** 5.584 秒。

## S02 — 8.00 秒

**Picture 1：** `keyframes/selected/S02_start.png`；**Picture 2：** 小鑫专用角色卡；**Picture 3：** 自动复制 Picture 1。  
**Reference Audio 1：** `references/audio/segments/S02_05.584-12.458.wav`；**Reference Audio 2：** `references/audio/小鑫_音色参考_12.715s.wav`。

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

**成片取用：** 6.874 秒；首批生成已通过，不计划重做。

## S03 — 6.00 秒

**Picture 1：** `keyframes/selected/S03_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，近景保持 <Picture 1> 中小鑫(S1)的面部、伤痕、服装和肩台一致。镜头以极小幅度、慢速向内推近，他抬眼看向镜头旁的通讯器，勉强露出真诚而克制的安抚微笑，说道:<d>[中文] 再等我一下。</d> 说完后笑意轻微变浅，目光短暂移开并停住。

overall_soundscape: 远处警报低鸣，雨声被厚墙削弱，肩台有轻微电流底噪，人物呼吸平稳但疲惫。

non_diegetic_music: N/A
```

**成片取用：** 3.703 秒。

## S04 — 6.00 秒

**Picture 1：** `keyframes/selected/S04_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，车内过肩镜头保持小鑫(S1)、单一方向盘、四频道设备和雨夜挡风玻璃的位置一致。镜头以小幅度、慢速向右横移，他依次转动四个频道旋钮，四枚指示灯按顺序亮起；每次亮灯时他的视线移向对应设备，最后手停在第四个旋钮上。

overall_soundscape: 雨刷规律摆动，车内设备低鸣，四次旋钮咔哒声与短促频道静电依次出现，车外雨声持续。

non_diegetic_music: N/A
```

**成片取用：** 4.040 秒；Q01–Q04 可后期插入。

## P01 — 6.00 秒，小鑫独唱

**Picture 1：** `keyframes/selected/P01_solo_start.png`；**Picture 2：** 小鑫专用角色卡；**Picture 3：** 自动复制 Picture 1。  
**Reference Audio 1：** `references/audio/segments/P01_20.201-24.671.wav`。

\`\`\`text
Picture 1 is the exact opening frame and controls Xiaoxin's initial pose, the rescue-vehicle interior, blue water tanks, distant orange fire, rain, and teal-orange lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls his face; the blurred standing views control body proportions, black distressed work shirt, harness, gloves, and the white bandage on his left forearm. Picture 3 duplicates Picture 1 and is only a scene reference. Reference Audio 1 is the exact target song segment and controls lyric timing, Chinese singing mouth shapes, breath timing, and phrasing.

Create a cinematic six-second music-video performance with three clearly edited shots. Xiaoxin is the only singer, identified as (S1). His complete lyric is <d>[Chinese] A区缺水，C区燃烧，我说放心，一个都不会少。</d> The singing continues seamlessly across the cuts. He must not stare into the lens for the entire clip; his eyeline stays mainly on the radio, the side window, and the road beyond the windshield.

[Shot 1] From 00:00.000 to 00:01.600, begin from Picture 1 in a three-quarter medium shot from the passenger side, about 35 degrees off Xiaoxin's front. The camera makes a short, smooth lateral slide of low amplitude. Xiaoxin turns his eyes from the blue water tanks toward the orange fire outside while singing the first phrase. His shoulders remain controlled and his right hand rests near the radio instead of gesturing toward the viewer.

[Shot 2] At 00:01.600, hard cut on the beat to a tight insert of Xiaoxin's gloved right hand pressing one radio channel key. The green channel light clicks on; blue water tanks remain soft in the left background and fire reflection flickers on wet glass at right. His singing continues off-camera. The camera is locked and stable; the hand performs only one clean press and release.

[Shot 3] At 00:03.000, action-match cut to a tight three-quarter face close-up from the driver-side window. Xiaoxin looks past the lens toward the windshield, then gives one brief side glance toward the radio while finishing the lyric. Use a slow, smooth push-in of very low amplitude. After Reference Audio 1 ends, he closes his mouth, holds the final expression, and breathes once without moving his head.

Natural restrained singing, no news-reading delivery, no idol smile, no repeated nodding, no hand reaching toward the lens, no microphone, no extra person, no face drift, no malformed fingers, no camera shake, no pulse zoom, no text, and no logo. The generated audio is temporary and will be replaced by the original master song.
\`\`\`

**成片取用：** 4.470 秒；V0.4 已通过 dry-run，尚未重新付费生成。

## S06 — 8.00 秒

**Picture 1：** `keyframes/selected/S06_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，广角环境镜头保持 <Picture 1> 的长街纵深、左侧救援车、湿轨道和中景小鑫(S1)比例一致。镜头以小幅度、正常速度从左向右跟随，他自然跑过轨道和积水，低位握住通讯器但不举到脸前；车灯在他轮廓上形成琥珀边光，脚步溅起少量水花。接近道路分岔方向时步幅略微缩短，最后仍保持向右移动。

overall_soundscape: 雨水持续，靴子踩过积水形成有节奏的水声，远处车辆怠速与金属结构低鸣交织。

non_diegetic_music: N/A
```

**成片取用：** 6.711 秒。

## S07 — 4.00 秒

**Picture 1：** `keyframes/selected/S07_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，正俯拍保持地图、四枚红灯、琥珀车灯点和绷带手的位置一致。镜头以极小幅度、慢速向下压近，四枚红灯同时闪亮，绷带手指在四条方向之间快速移动一次，随后停在唯一狭窄路线旁，但没有真正按下选择。

overall_soundscape: 纸张受潮后的轻微摩擦声，四次警示电流声叠加，远处无线电静电持续。

non_diegetic_music: N/A
```

**成片取用：** 1.552 秒。

## P02A — 4.00 秒，群舞预示

**Picture 1：** `keyframes/selected/P02_group_start.png`；人物参考 `(S1)`–`(S5)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，五人全景保持 <Picture 1> 中小鑫(S1)居中和四位获救者(S2,S3,S4,S5)的身份、服装、人数与间距一致。镜头保持静止，五人从定格般的低位队形同时完成一个克制的重心转移；四位伴舞分别把胸口和视线转向四个不同出口，小鑫对嘴演唱:<d>[中文] 一辆车，一条隧道。</d> 动作在第二个强拍共同停住，所有脚部保持接地。

overall_soundscape: 五组靴底同时摩擦湿地，衣料短促拉动，地下空间保留低沉回响与滴水声。

non_diegetic_music: N/A
```

**成片取用：** 2.000 秒。

## S08 — 6.00 秒

**Picture 1：** `keyframes/selected/S08_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，隧道远景保持小鑫(S1)、车辆、五枚红灯和远处尸潮轮廓一致。镜头以小幅度、慢速向隧道深处推进，五枚红灯依次熄灭，远处人形轮廓整体缓慢逼近但不露清晰面部；小鑫侧身守在车辆旁回头观察，最后一枚灯变暗时他绷紧肩膀并停住。

overall_soundscape: 隧道滴水、远处杂乱脚步和低沉回声逐渐增强，五次电流断开的短促声依次出现，车辆发动机低鸣持续。

non_diegetic_music: N/A
```

**成片取用：** 4.470 秒。

## P02B — 6.00 秒，五人副歌

**Picture 1：** `keyframes/selected/P02_group_start.png`；**Picture 2：** 小鑫专用角色卡；**Picture 3：** `keyframes/selected/P03_group_pull_start.png`，用于保持四位伴舞身份。  
**Reference Audio 1：** `references/audio/segments/P02B_39.404-43.851.wav`。

\`\`\`text
Picture 1 is the exact opening frame and controls the five-person full-body formation, wet three-way junction, spacing, reflections, and cyan-amber-red lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls the lead singer's face; the blurred standing views control his body, black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 preserves the same four distinct rescued men as backup dancers and the exact five-person cast. Reference Audio 1 is the exact chorus segment and controls Xiaoxin's Chinese singing mouth timing and the shared dance counts.

Create a six-second cinematic K-pop boy-group performance with exactly five young East Asian men and three clearly edited camera angles. Xiaoxin remains front-center and is the only singer, identified as (S1), singing <d>[Chinese] 我没有把你们忙丢，Hold on，马上就走。</d> Use clean, grounded point choreography: sharp arm lines, a simple two-step, one formation change, a single shoulder-pop ripple, and brief held stops. The movement is dance, not combat, running, or zombie behavior.

[Shot 1] From 00:00.000 to 00:02.000, use a low-angle 28mm full-body wide shot. All five begin in a shallow W formation with Xiaoxin at the front point. On the first two counts, everyone performs one precise side step to camera-right and closes the trailing foot without crossing legs. Their forearms cross once at sternum height, then snap open into symmetrical 45-degree downward diagonals with elbows fixed. They hold the open shape briefly, torsos upright, feet fully grounded, and faces serious.

[Shot 2] At 00:02.000, beat-matched hard cut to a true vertical overhead shot. In two counts, the four backup dancers take one short outward step each, changing the W into a clean shallow V while Xiaoxin remains the fixed front point; no one crosses another dancer's path. On “Hold on,” all five perform the signature point move once: right palm faces outward at shoulder height with fingers together like a clear stop sign, left hand stays close to the ribs, then both hands retract cleanly to the chest. The overhead camera remains locked so the formation is readable.

[Shot 3] At 00:03.800, hard cut to a straight-on 35mm medium-wide shot framing all five from boots to head. The four dancers perform one left-to-right shoulder-pop ripple, one dancer per beat, while Xiaoxin takes a single half-step forward, makes one controlled chest isolation, and sweeps his bandaged left forearm horizontally across his torso. On the final beat, all five stop in a balanced asymmetrical pose and hold it through the last frame.

Use crisp synchronized timing, 85 percent performance power, controlled knees, relaxed fingers, and clean two-frame-like visual stops between phrases. No freestyle, flailing, repeated crouching, jogging in place, excessive hip thrusts, jumping, spinning, touching, merged limbs, sixth person, cloned face, weapon, microphone, stage lights, camera shake, text, or logo. The generated soundtrack is temporary and will be replaced with the original master song.
\`\`\`

**成片取用：** 4.447 秒；V0.4 已通过 dry-run，尚未重新付费生成。

## S10 — 6.00 秒

**Picture 1：** `keyframes/selected/S10_start.png`；**Picture 2：** 小鑫专用角色卡；**Picture 3：** 自动复制 Picture 1。  
**Reference Audio 1：** `references/audio/segments/S10_43.851-47.856.wav`。

\`\`\`text
Picture 1 is the exact opening frame and controls Xiaoxin's face, shoulder radio, junction background, and mixed blue-red light. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls his face; the blurred standing views control his black clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 duplicates Picture 1 and is only a scene and composition reference. Reference Audio 1 is the exact target song segment and controls Xiaoxin's Chinese singing mouth timing, phrase pacing, and the cut on “脚却”.

Create a six-second cinematic two-shot sequence with locked, stable camera positions. Xiaoxin is the only singer, identified as (S1), singing <d>[Chinese] 嘴上答应每个出口，脚却停在岔路口。</d> Preserve his identity, outfit, lighting, and the three-way junction geometry across the cut. The emotional contrast comes from the edit, not from shaking, trembling, or exaggerated acting.

[Shot 1] From 00:00.000 to approximately 00:02.200, use a locked-off 65mm close-up of Xiaoxin's face, mouth, eyes, and shoulder radio. He sings the first phrase with precise lips and jaw, a steady head, relaxed shoulders, and only one natural breath. His eyes shift once from the green radio light to the red exit, but his torso does not sway. The camera is fixed on a tripod with zero pan, tilt, push, zoom, handheld motion, or focus breathing.

[Shot 2] At the first syllable of “脚却,” make a clean hard cut to a locked-off 50mm low insert showing both boots already stopped on the wet junction floor. The three route directions are readable through existing floor geometry and colored reflections; do not create new arrows or text. Both boots remain completely planted while the lyric finishes off-camera. Only rainwater ripples and distant reflected warning light may move. Hold this image steadily after Reference Audio 1 ends.

Absolute stability: no body vibration, no head bobbing, no nervous tremor, no camera shake, no micro-jitter, no pulse zoom, no rolling shutter, no frame warping, no drifting crop, and no continuous tilt down. No duplicated legs, deformed boots, extra people, new markings, text, or logo. The generated audio is temporary and will be replaced with the original master song.
\`\`\`

**成片取用：** 4.005 秒；V0.4 已通过 dry-run，尚未重新付费生成。

## P03 — 8.00 秒，五人四路压力编舞

**Picture 1：** `keyframes/selected/P03_group_pull_start.png`；**Picture 2：** 小鑫专用角色卡；**Picture 3：** `keyframes/selected/P02_group_start.png`，用于保持四位伴舞身份。  
**Reference Audio 1：** `references/audio/segments/P03_47.856-54.697.wav`。

\`\`\`text
Picture 1 is the exact opening frame and controls the five-person formation, wet underground junction, spacing, and cyan-amber-red lighting. Picture 2 is Xiaoxin's identity and wardrobe reference: only the sharp large portrait on its right side controls the center lead's face; the blurred standing views control his body, black survival clothing, harness, gloves, boots, and left-forearm bandage. Picture 3 preserves the same four distinct rescued men, their individual faces and outfits, and the exact five-person cast. Reference Audio 1 is the exact target song segment and controls Xiaoxin's Chinese singing mouth timing, phrasing, choreography accents, and the final three count hits.

Create an eight-second cinematic K-pop boy-group sequence with exactly five young East Asian men and three clearly edited shots. Xiaoxin remains the center lead and only singer, identified as (S1), singing <d>[Chinese] 不是不想把你们救，是我还没学会说不，当所有频道一起求救，三、二、一。</d> Use restrained but polished point choreography built from simple side steps, precise forearm angles, one controlled chest isolation, a short shoulder ripple, and a final formation opening. The dance expresses decision pressure; it must not resemble fighting, grabbing, panic, or zombies reaching for a victim.

[Shot 1] From 00:00.000 to 00:02.300, use a 32mm medium-wide full-body shot from a 25-degree diagonal angle. The camera tracks laterally at low amplitude while all five remain fully visible. Xiaoxin makes one side step to his right and closes his feet; the four dancers mirror in alternating directions without crossing paths. On the next count, everyone bends both elbows to clean 90-degree angles, draws the forearms once across the chest, then snaps them outward toward four diagonals. Hold the arm lines briefly with shoulders down, chests lifted, and feet planted.

[Shot 2] At 00:02.300, beat-matched hard cut to a tight three-quarter face-and-chest close-up of Xiaoxin from about 40 degrees off-axis. He never sings straight into the lens. His eyes move between the blue and red exits while he performs one small chest isolation and draws his bandaged left forearm back to his sternum. In the soft background, the four dancers perform one restrained left-to-right shoulder ripple; their hands never enter near Xiaoxin's face or neck. The camera makes a stable, very slow arc of low amplitude while he sings through “当所有频道一起求救”.

[Shot 3] At 00:05.100, hard cut to a true high overhead wide shot showing the junction geometry and all five full bodies. The four dancers form a precise diamond around Xiaoxin with a clear body-width gap. On “三,” all five soften their knees once and cross forearms at chest height. On “二,” they snap both forearms open toward the four routes, fingers together and palms flat. On “一,” each backup dancer glides exactly one step outward along his own route while Xiaoxin remains still at the center and raises one right palm in the signature stop gesture. Everyone freezes in the final formation through the last frame.

Use crisp synchronization, grounded weight, controlled knees, straight wrists, clean arm angles, and brief held stops. No vague reaching, freestyle, flailing, repeated squats, running in place, fighting poses, touching, body merging, extra arms, cloned dancers, sixth person, jumping, spinning, weapon, microphone, camera shake, text, or logo. Reference Audio 1 is temporary guidance; restore the original master song in post-production.
\`\`\`

**成片取用：** 6.841 秒；V0.4 已通过 dry-run，尚未重新付费生成。

## S12 — 6.00 秒

**Picture 1：** `keyframes/selected/S12_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，高位广角保持三向路线、小鑫(S1)中心位置和蓝橙红灯光关系一致。镜头以大幅度、慢速垂直向上拉远，三条路线灯先后转为暗红，小鑫保持完全静止并迅速在画面中变小；镜头最后形成清晰纯俯拍，他独处于三路中心，周围负空间扩大并稳定落定。

overall_soundscape: 地下空间风声与滴水被拉远，三次电路转暗声依次出现，人物呼吸逐渐变得遥远。

non_diegetic_music: N/A
```

**成片取用：** 尾部 2.947 秒。

## S13 — 6.00 秒

**Picture 1：** `keyframes/selected/S13_start.png`

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，无线电微距保持 <Picture 1> 的湿地、四枚绿灯和远处模糊背影一致。镜头完全静止，远处背影缓慢离开画面边缘，无线电四枚绿灯先急促闪烁，随后同时熄灭；熄灯后画面保持近乎全黑至少半秒，不新增人物或动作。

overall_soundscape: 多频道静电叠加，画外声音依次喊道:<d>[中文] 小鑫，请回答。小鑫——SOS！</d> 最后所有频道同时切断，只留下极短的雨声尾音。

non_diegetic_music: N/A
```

**成片取用：** 5.477 秒；熄灯后保留 8–12 帧再切黑。

## 不再提交的旧任务

- S05：由 P01 替换。
- S09：由 P02B 替换。
- S11：由 P03 替换。
