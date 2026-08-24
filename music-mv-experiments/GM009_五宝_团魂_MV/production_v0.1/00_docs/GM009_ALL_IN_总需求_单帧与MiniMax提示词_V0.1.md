# GM009 五宝《ALL IN｜同频》总需求、单帧与 MiniMax H3 提示词 V0.1

> 本文档是 V0.1 制作真值。当前只完成设计与提示词，不生成新单帧、不切音频、不提交 RunningHub。  
> 母带：74.600 秒；画幅：16:9；核心方向：五人末日团魂、个人帅气特写、对讲机接力、大量清晰但不过度复杂的丧尸战斗；群舞仅保留一条剪影段落。

## 1. 已锁定的制作结论

- 正片按完整 74.600 秒制作，不强裁成 60 秒。
- 规划 12 条 MiniMax H3 视频，单条生成 6–10 秒，均低于 15 秒上限。
- 每条视频必须同时出现：
  1. 一次能看清人物与环境关系的全景或中远景；
  2. 一次清晰的面部怼脸特写；
  3. 一次动作或道具插入镜头。
- 为此需要重新制作 24 张人物场景单帧：
  - 12 张 Wide：全景／中远景起始帧；
  - 12 张 Close：同场景、同服装、同光线的怼脸特写参考帧。
- 旧 MV 的人物场景合成帧一律不直接复用，避免剧情、构图和单主角逻辑残留。
- 可复用旧 MV 的 8 张空场景图和 2 张丧尸动作参考图，用作世界观、建筑、光线与丧尸轮廓参考。
- 五张角色卡沿用 MiniMax 专用版：右侧大脸清晰，左侧站立人物的可见面部全部模糊。
- 群舞只有 T10 一条，成片约 5 秒；使用五人逆光剪影和简单强拍动作，不做复杂韩团齐舞。
- RunningHub 生成音轨只用于节奏、口型和动作参考。最终全部静音，并重新铺设 74.600 秒 Suno 母带。

## 2. V0.1 独立素材包

根目录：

~~~text
production_v0.1/
├── 00_docs/                 总需求、时间轴、资产登记
├── 01_character_cards/      五张 MiniMax 专用角色卡
├── 02_reused_scenes/        从小鑫 MV 复制的空场景和丧尸参考
├── 03_keyframes/
│   ├── wide/                12 张全景／中远景单帧
│   └── closeup/             12 张怼脸特写单帧
├── 04_audio_segments/       母带与后续 12 段参考音频
├── 05_minimax_prompts/      后续拆出的 T01–T12 独立 txt
├── 06_minimax_videos/       RunningHub 下载结果
└── 07_edit/                 粗剪、精剪与剪辑决策
~~~

## 3. 角色固定编号与外观锚点

### C01 小鑫

- 黑色短发、耳饰、面部痣与轻伤。
- 磨损黑色工装衬衫、黑色背带、黑色工装裤和战斗靴。
- 左前臂白色绷带是全片不可改变的唯一强识别道具。

### C02 成员 02

- 短碎黑发、冷静面部轮廓。
- 蓝灰色防水战术外套、黑色内搭、胸前无线电和黑色工装裤。
- 动作风格：速度快、判断直接，主要承担奔跑与短棍格挡。

### C03 成员 03

- 中长黑发、偏柔和但可靠的面部气质。
- 黑色多袋战术背心、暗红内衬、医疗小包与黑色工装裤。
- 动作风格：稳、准，主要承担地图、救援、拉队友和中段 Rap。

### C04 成员 04

- 棕色短发、少年感较强。
- 深橄榄色连帽战术夹克、肩台无线电、黑色工装裤。
- 动作风格：观察与报位，主要承担侦察、远距离预警和剪影段落。

### C05 成员 05

- 黑色立体短发、轮廓锋利。
- 灰色卷袖衬衫、黑色战术背心、腰带装备和黑色工装裤。
- 动作风格：力量感强，主要承担推门、近身击退和 Rap 后半段。

## 4. 可复用场景

| 场景 | 本片用途 | 是否直接作为视频首帧 |
| --- | --- | --- |
| E03 三号门大厅 | 巨型门厅、逆光剪影、推门、最终剪影舞 | 否，只作为新关键帧的建筑参考 |
| E05 救援车内部 | 对讲机、地图、五频道接通、成员 C03 | 否 |
| E09 水与火同框 | 车内物资、橙色远火、补给和中近景 | 否 |
| E10 雨夜奔跑路段 | C02 奔跑、三人 Rap 战斗 | 否 |
| E13 地图与四路信号 | 地图、手部报位、路线信息 | 否 |
| E15 尸潮倒数 | C05 隧道推进、远处尸潮 | 否 |
| E16 岔路口主场景 | 五人汇合、合体战斗、最终副歌 | 否 |
| E18 失联无线电结尾 | 无线电开场与器乐收尾 | 否 |
| 近身感染者动作参考 V0.3 | 单只或两只感染者的姿态、步态、扑近动作 | 仅作生成参考 |
| 尸潮远景群体参考 V0.4 | 远处尸潮密度、轮廓、雾中间距 | 仅作生成参考 |

结论：场景美术可以复用；所有带人物的新构图都重新生成。

## 5. 母带结构与 12 条视频

时间点来自当前母带的自动歌词对齐，精确到剪辑前允许微调 0.1–0.3 秒。

| 任务 | 成片区间 | 生成时长 | 音乐／歌词 | 核心内容 | 近脸角色 |
| --- | ---: | ---: | --- | --- | --- |
| T01 | 00.000–08.000 | 8s | Intro：One beat, one team／全员同频 | 小鑫接通第一频道，世界启动 | C01 |
| T02 | 08.000–13.400 | 6s | Verse 前三句 | C02 雨夜奔跑并格挡感染者 | C02 |
| T03 | 13.400–17.800 | 6s | Verse 末句＋Pre 前两句 | C03 车内地图与对讲机报位 | C03 |
| T04 | 17.800–23.000 | 6s | 倒数三二一／下一拍／首次 All in | C04 预警后协助封门 | C04 |
| T05 | 23.000–29.000 | 6s | 五道光／No one falls／彼此回音 | C05 在隧道推开尸群缺口 | C05 |
| T06 | 29.000–36.000 | 8s | 越过边界／所有目光／全员同频 | 五人在岔路口第一次汇合 | C01 |
| T07 | 36.000–42.000 | 6s | Rap 前半 | C01–C03 三人战斗接力 | C02 |
| T08 | 42.000–49.000 | 8s | Rap 后半 | C04 报位、C05 推门，两人互补 | C05 |
| T09 | 49.000–55.000 | 6s | Final Chorus 前半 | 五人背靠背防守，团魂主画面 | C03 |
| T10 | 55.000–60.000 | 6s | Final Chorus 尾句／全员同频 | 唯一五人剪影群舞 | C04 剪影侧脸 |
| T11 | 60.000–66.000 | 6s | Ready now／One beat, one team／All in | 五人合体清场、最终推进 | C01 |
| T12 | 66.000–74.600 | 10s | 器乐收尾 | 五人走出通道、无线电归一、切黑 | C05 |

计划音频文件名：

~~~text
A01_T01_00.000-08.000.wav
A02_T02_08.000-13.400.wav
A03_T03_13.400-17.800.wav
A04_T04_17.800-23.000.wav
A05_T05_23.000-29.000.wav
A06_T06_29.000-36.000.wav
A07_T07_36.000-42.000.wav
A08_T08_42.000-49.000.wav
A09_T09_49.000-55.000.wav
A10_T10_55.000-60.000.wav
A11_T11_60.000-66.000.wav
A12_T12_66.000-74.600.wav
~~~

## 6. 单帧统一生成标准

### 公共正向前缀

~~~text
16:9 cinematic photorealistic live-action film still, the same young East Asian male member from the supplied GM009 character card, preserve his exact facial identity from the sharp right-side portrait and preserve his outfit, body proportions and gear from the standing views. Rain-soaked post-apocalyptic industrial city at night, dark teal and charcoal palette, practical amber work lights, restrained red warning lights, wet reflective floor, realistic skin, sweat, dust and minor non-graphic scratches, grounded acting, cinematic depth, physically plausible anatomy, center-safe composition, no embedded text.
~~~

### Wide 帧统一要求

~~~text
The frame must clearly show the full environment and the subject's complete action geometry. Keep the character between 20% and 45% of frame height unless a specific task says otherwise. Feet must be visibly grounded, hands and weapons fully separated, infected figures kept at readable distance, and architecture must retain the supplied scene reference.
~~~

### Close 帧统一要求

~~~text
Tight 70mm to 100mm facial close-up in the exact same location, wardrobe, injury continuity and practical lighting as the matching Wide frame. The face occupies roughly 45% to 60% of the frame. Preserve natural pores, sweat and restrained emotion. Keep the eyeline 10 to 35 degrees away from the lens unless a task explicitly allows a brief direct promise. Leave enough background information to prove this is the same scene.
~~~

### 公共负面约束

~~~text
no duplicate hero, no second copy of any member, no face drift, no hairstyle change, no wardrobe change, no changing bandage side, no fused bodies, no extra limbs, no malformed hands, no floating feet, no duplicate radio, no duplicate weapon, no clear zombie glamour portrait, no bite, no blood spray, no gore, no dismemberment, no random crowd, no glossy studio fashion lighting, no stage, no microphone, no subtitles, no UI, no readable signage, no logo, no watermark, no cartoon look.
~~~

## 7. MiniMax H3 统一提交规则

- Picture 1：对应任务的 Wide 全景起始帧。
- Picture 2：对应任务的 Close 怼脸特写帧。
- Picture 3：该条近脸主角的 MiniMax 专用角色卡。
- Reference Audio 1：对应任务的母带切片，是动作节拍、演唱或 Rap 嘴型和镜头切点的时间参考。
- Reference Audio 2：当前不单独提供；工作流如需占位会复制 Audio 1，提示词中不描述这个副本。
- 每条至少三镜：
  1. 环境全景；
  2. 怼脸特写；
  3. 手部、脚部、无线电、武器或低机位动作镜头。
- 嘴型原则：清晰正脸只承担短句；长句允许在全景、侧脸、背影或动作插入中继续唱。原音频最终后期替换。
- 动态原则：动作必须包含准备、接触、回收；动态来自重心移动、步法、武器路径、人物遮挡和硬切，不来自身体抖动、甩镜或速度乱拉。
- 镜头原则：超过 6 秒必须至少有两次明确景别或视角变化。
- 五人原则：五人同框时，清晰正脸最多一人；其他四人使用侧脸、背三分之四、前景肩背、逆光或远景。

---

# 8. T01–T12 单帧需求与 MiniMax 提示词

## T01 — 第一频道接通

### 任务信息

- 成片：00.000–08.000
- 生成：8 秒
- 场景：E03＋E18
- 人物：C01
- 新单帧：
  - wide/T01_W_第一频道大厅全景.png
  - closeup/T01_C_小鑫对讲机怼脸.png

### T01_W 单帧提示词

~~~text
Use E03 as the exact architectural reference and E18 only for the old radio design and green light language. A monumental ruined blast-door hall fills the 16:9 frame. C01 Xiaoxin stands alone in the lower-left third, full body visible, holding his shoulder radio near his chest. The giant cyan-lit opening and wet floor dominate the composition; five distant work lamps create a subtle path toward the center. He has just stopped moving and turns toward the first radio signal. His white left-forearm bandage, black harness and boots remain readable. No infected is close; only two tiny separated silhouettes remain far beyond the door. Low 28mm camera at waist height, strong environmental scale, teal backlight and restrained amber rim light, believable rain haze, action-ready rather than posed.
~~~

### T01_C 单帧提示词

~~~text
Same E03 hall, same C01 outfit and exact lighting continuity. Tight 85mm three-quarter facial close-up from 30 degrees camera-right. The shoulder radio and one green indicator occupy the soft lower foreground. Xiaoxin's eyes look down toward the radio, not into the lens; his brow is steady and his lips are just preparing to say “全员同频.” Cyan door light rims his wet hair while a weak amber reflection touches the bandage edge. Restrained confidence, one controlled breath, no smile, no heroic stare. Preserve the sharp portrait identity from C01 and keep the left-forearm bandage on the correct side.
~~~

### T01 MiniMax H3 提示词

~~~text
Picture 1 is the exact opening frame and controls the huge blast-door hall, Xiaoxin's full-body position, cyan opening, wet reflections, distant silhouettes, and teal-amber lighting. Picture 2 controls the later 85mm facial close-up, radio placement, eyeline and expression. Picture 3 is C01 Xiaoxin's identity and wardrobe reference: only the sharp right portrait controls his facial identity; the blurred standing views control his body proportions, black work shirt, harness, gloves, boots and the white bandage on his left forearm. Reference Audio 1 is the exact 00.000–08.000 master segment and controls the group-chant rhythm and cut points.

Create an eight-second cinematic three-shot intro with one Xiaoxin and no other clear uninfected person. Xiaoxin (S1) carries the visible lead performance for “One beat, one team / 全员同频.” His objective is to answer the first signal and silently commit to finding the others.

[Shot 1 — 00:00.000–00:02.600] Begin exactly from Picture 1 in a low 28mm environment wide. Use one slow stable push-in of low amplitude. Xiaoxin takes one measured step into the hall, stops, and raises the shoulder radio once. The two tiny infected silhouettes remain far beyond the door and move only one uneven step.

[Shot 2 — 00:02.600–00:05.300] Beat-matched hard cut to Picture 2's 85mm three-quarter face close-up. On the group chant, his lips form only the short phrase “全员同频.” His eyeline stays on the green radio light; on the last syllable, his lower eyelids tighten and he gives one tiny decisive inhale. His head and shoulders remain steady.

[Shot 3 — 00:05.300–00:08.000] Hard cut to an extreme insert of his gloved thumb pressing the push-to-talk switch once. Five small channel lights illuminate one after another on separate beats. His bandaged left forearm remains anatomically correct. End on the fifth light holding steady.

No direct blank lens stare, no repeated nodding, no body vibration, no extra Xiaoxin, no clear infected face, no attack, no random light count, no malformed hand, no camera shake, no pulse zoom, no text, logo or watermark. Generated audio is temporary and will be replaced by the master song.
~~~

## T02 — C02 雨夜突围

### 任务信息

- 成片：08.000–13.400
- 生成：6 秒
- 场景：E10＋近身感染者动作参考
- 人物：C02，恰好一只近身感染者
- 新单帧：
  - wide/T02_W_C02雨夜奔跑全景.png
  - closeup/T02_C_C02奔跑后怼脸.png

### T02_W 单帧提示词

~~~text
Use E10 for the wet rail corridor, rescue-vehicle amber lamps, rails and cyan haze. C02 appears full body at the left-middle of frame, moving left to right in his blue-gray shell jacket, chest radio and black cargo trousers. Exactly one infected blocks the route several meters ahead with separated limbs and a readable reaching pose. C02 holds a short steel baton low beside his right thigh and shifts his weight to prepare one outward forearm parry, not a strike. Low 32mm lateral action composition, both feet readable, the environment fills more than half the frame, orange reflections behind him and cold cyan escape space ahead.
~~~

### T02_C 单帧提示词

~~~text
Same E10 corridor and exact C02 wardrobe. Tight 70mm side-front close-up immediately after a sprint, chest radio at the lower frame edge, wet short hair and a small non-graphic cheek scratch. His head remains nearly still while his eyes look ten degrees camera-left toward the route. His jaw is set; lips are mid-lyric but not exaggerated. Amber vehicle light rims one cheek and cyan tunnel light defines the opposite side. The infected is only an indistinct dark shape far behind him. No direct lens performance.
~~~

### T02 MiniMax H3 提示词

~~~text
Picture 1 controls the exact E10 opening composition, C02's running direction, the rescue vehicle, rail lines, one infected, wet reflections and cyan-amber lighting. Picture 2 controls C02's later facial close-up, eyeline and sweat detail. Picture 3 is C02's identity and wardrobe reference: use only its sharp right portrait for the face and its blurred standing views for the blue-gray shell jacket, chest radio, body proportions, gloves, trousers and boots. Reference Audio 1 is the exact 08.000–13.400 master segment and controls singing rhythm, running cadence and the combat cut.

Create a six-second cinematic run-parry-run sequence with three clearly edited shots. C02 (S2) sings the verse while trying to reach the team without losing speed.

[Shot 1 — 00:00.000–00:02.100] Start from Picture 1 in a stabilized 32mm lateral environment wide. C02 runs three grounded steps from left to right. The single infected makes one reaching lunge. C02 lowers his center of gravity and uses the baton for exactly one outward parry against the infected's forearms. Contact is brief and both bodies separate.

[Shot 2 — 00:02.100–00:04.000] Action-match hard cut to Picture 2's 70mm close-up while C02 continues moving at a controlled jog. His lips follow Reference Audio 1. His gaze remains on the route, never the lens; on the end of the phrase he exhales once and his jaw firms.

[Shot 3 — 00:04.000–00:06.000] Hard cut to a low 40mm full-body rear three-quarter shot. C02 slips past the infected, plants one boot in a shallow puddle, regains forward balance and accelerates toward the cyan corridor. The infected remains behind and does not touch him again.

Exactly one C02 and one infected. No repeated blows, no acrobatics, no head hit, no gore, no bite, no body merging, no extra weapon, no deformed baton, no foot sliding, no head bobbing, no handheld shake, no whip-pan, no text or logo. Final edit replaces generated audio with the master song.
~~~

## T03 — C03 地图报位

### 任务信息

- 成片：13.400–17.800
- 生成：6 秒
- 场景：E05＋E13
- 人物：C03
- 新单帧：
  - wide/T03_W_C03车内地图全景.png
  - closeup/T03_C_C03无线电怼脸.png

### T03_W 单帧提示词

~~~text
Use E05 as the exact rescue-vehicle interior and E13 for the worn folded map and small route lights. A 28mm rear-seat environment wide shows the entire front cabin, one steering wheel, dashboard radio bank, rain-covered windshield and amber-green controls. C03 sits sideways in the passenger seat in his black tactical vest with dark red lining and medical pouches. He braces the map on the center console with one hand and reaches toward the radio with the other. Three small infected silhouettes remain far outside the windshield. The cabin, not the face, dominates the frame; all hands, map edges and controls remain separated.
~~~

### T03_C 单帧提示词

~~~text
Same vehicle interior and C03 wardrobe. Tight 85mm three-quarter face close-up from the driver side. One green radio meter glows in soft foreground and rain bokeh stays visible behind him. C03's damp black hair frames his face; his eyes move from the map to a point twelve degrees camera-right, reading a route rather than performing to the lens. His expression shifts from concentration to quiet certainty. Natural lips mid-phrase, one subtle breath, no smile and no large head turn.
~~~

### T03 MiniMax H3 提示词

~~~text
Picture 1 controls the complete vehicle interior, map, controls, rain, C03's seated position and teal-amber lighting. Picture 2 controls the exact later facial close-up and eyeline. Picture 3 is C03's identity and wardrobe reference: the sharp right portrait controls his face; the blurred standing views control his black vest, dark red lining, medical pouches, body proportions and boots. Reference Audio 1 is the exact 13.400–17.800 master segment and controls the sung phrasing and channel-switch rhythm.

Create a six-second cinematic information-relay sequence with one C03 and three edited shots. C03 (S3) sings while finding a route that keeps every member connected.

[Shot 1 — 00:00.000–00:02.000] Begin from Picture 1 in a locked 28mm environment wide. C03 traces one route on the map with his left index finger, then presses one radio channel key with his right hand. Only one green meter responds. The three distant silhouettes outside remain small and soft.

[Shot 2 — 00:02.000–00:04.300] Hard cut to Picture 2's 85mm close-up. On “抬起头,” his eyes lift from the map; on the next phrase, his brow smooths and his jaw releases into controlled certainty. He sings toward the radio and road, never directly into the lens. The camera performs one very slow push-in of low amplitude.

[Shot 3 — 00:04.300–00:06.000] Hard cut to a true overhead insert of the map. His two gloved fingers place one small metal marker on the single shared route. Four separate route lights pulse once in response. End with his hand becoming still.

No duplicate steering wheel, no duplicated radio bank, no readable map text, no random finger motion, no malformed hand, no mouth wobble, no extra person inside, no infected entering the vehicle, no camera shake, no text or logo. Generated audio is temporary; use the master in the final edit.
~~~

## T04 — C04 倒数与封门

### 任务信息

- 成片：17.800–23.000
- 生成：6 秒
- 场景：E03＋尸潮远景群体参考
- 人物：C04，远处尸潮
- 新单帧：
  - wide/T04_W_C04封门全景.png
  - closeup/T04_C_C04预警怼脸.png

### T04_W 单帧提示词

~~~text
Use E03's monumental door hall. C04 stands full body at the right foreground in his dark olive hooded jacket, one hand on the mechanical door control and the other holding his shoulder radio. Five red warning lamps form a readable line along the wet floor. Far beyond the giant cyan doorway, a small fog-softened infected crowd remains in the outer background. C04 looks over his shoulder toward the crowd while preparing to pull the control. Low 28mm environment wide, strong architectural scale, cyan backlight, red lamp reflections and amber edge light. No close infected and no physical contact.
~~~

### T04_C 单帧提示词

~~~text
Same E03 location and C04 outfit. Tight 90mm side-profile facial close-up framed between the shoulder radio and a blurred red warning lamp. His brown hair is damp, eyes fixed thirty degrees off lens toward the doorway. On the implied countdown, his lower eyelids tighten; his lips are ready to say the line with restrained urgency. Cyan light outlines the face while a red reflection crosses only the lower cheek. No smile, no panic grimace, no direct lens stare.
~~~

### T04 MiniMax H3 提示词

~~~text
Picture 1 controls the door-hall wide composition, C04's full-body position, control lever, five red lamps, distant crowd, wet geometry and lighting. Picture 2 controls the later 90mm profile close-up and exact eyeline. Picture 3 is C04's identity and wardrobe reference: the sharp right portrait controls his face; the blurred standing views control his dark olive hooded jacket, shoulder radio, body proportions, trousers and boots. Reference Audio 1 is the exact 17.800–23.000 master segment and controls the countdown rhythm, singing mouth timing and first “All in” impact.

Create a six-second three-shot warning-and-door sequence. C04 (S4) sings while counting the remaining seconds and committing to the shared route.

[Shot 1 — 00:00.000–00:02.000] Begin from Picture 1 in a stable 28mm environment wide. Five red lamps extinguish one at a time on separate beats while C04 turns only his upper body toward the distant crowd. The crowd takes one slow collective step but remains far outside the safety radius.

[Shot 2 — 00:02.000–00:04.000] Hard cut to Picture 2's 90mm close-up. His lips follow the short countdown phrase. His eyes make one controlled movement from the crowd to the radio; on “下一拍,” he takes one shallow inhale and sets his jaw. Head and shoulders stay steady.

[Shot 3 — 00:04.000–00:06.000] Beat-matched cut back to a low 35mm medium-wide. On the first “All in,” C04 pulls the control once with both hands. The blast door begins closing and a narrow cyan gap remains. He completes the pull and recovers into a balanced stance.

No sprinting horde, no clear infected face, no extra lamp, no lamp relighting, no repeated lever pumping, no duplicated C04, no shaking body, no gore, no malformed hands, no text or logo. Final edit replaces generated sound with the master.
~~~

## T05 — C05 隧道破口

### 任务信息

- 成片：23.000–29.000
- 生成：6 秒
- 场景：E15＋近身感染者动作参考
- 人物：C05，恰好两只近身感染者
- 新单帧：
  - wide/T05_W_C05隧道战斗全景.png
  - closeup/T05_C_C05战斗怼脸.png

### T05_W 单帧提示词

~~~text
Use E15's immense wet industrial tunnel, rails, orange floor lamps and cyan fog. C05 is full body in the lower center wearing his gray rolled-sleeve shirt and black tactical vest. He grips a long steel pry bar horizontally with both hands. Exactly two infected approach from different depths, one near enough for a readable block and one several body lengths behind. C05 plants his boots and prepares one controlled outward shove to open a route, not a flourish. Low 30mm full-environment action frame, tunnel scale dominant, all arms and the pry bar fully separated.
~~~

### T05_C 单帧提示词

~~~text
Same E15 tunnel and C05 clothing. Tight 70mm three-quarter face close-up after exertion, pry-bar shaft soft across the lower foreground without covering the mouth. His black hair is wet, one small cheek scratch visible, breathing controlled. He looks twenty degrees camera-left toward the second infected, not at the viewer. Amber floor lamps rim the jaw and cyan fog cools the opposite cheek. Lips are mid-chorus with focused strength, no scream and no exaggerated aggression.
~~~

### T05 MiniMax H3 提示词

~~~text
Picture 1 controls E15, C05's full-body stance, pry bar, exactly two infected, rail geometry and cyan-amber lighting. Picture 2 controls C05's later facial close-up, eyeline and pry-bar foreground. Picture 3 is C05's identity and wardrobe reference: use the sharp right portrait for his face and blurred standing views for his gray rolled-sleeve shirt, tactical vest, body proportions, gloves, equipment belt and boots. Reference Audio 1 is the exact 23.000–29.000 master segment and controls chorus singing, combat contact and cut timing.

Create a six-second grounded combat performance with three shots. C05 (S5) sings while forcing a path toward the other members.

[Shot 1 — 00:00.000–00:02.200] Begin from Picture 1 in a stable 30mm environment wide. The nearest infected makes one forward reach. C05 plants both boots, raises the pry bar and performs exactly one horizontal outward shove against its upper forearms. Brief contact occurs; the infected loses balance and separates. The second infected remains several body lengths behind.

[Shot 2 — 00:02.200–00:04.100] Action-match hard cut to Picture 2's 70mm close-up. C05 continues the chorus with precise but natural mouth movement. His eyes flick once toward the second infected; he exhales on the phrase ending and lowers his chin by only a few degrees.

[Shot 3 — 00:04.100–00:06.000] Hard cut to a low 35mm full-body side view. C05 pivots once, uses his shoulder and the bar to push open a hanging service gate, then steps through the gap. The two infected remain behind the gate as it swings partly closed.

Exactly one C05 and two infected. Preparation-contact-recovery must be clear. No repeated strikes, no head impact, no spinning, no jumping, no bite, no blood spray, no gore, no bar bending, no body merging, no camera shake, no text or logo. Generated audio is temporary and will be replaced.
~~~

## T06 — 五人第一次汇合

### 任务信息

- 成片：29.000–36.000
- 生成：8 秒
- 场景：E16
- 人物：恰好 C01–C05，近脸 C01
- 新单帧：
  - wide/T06_W_五人岔路汇合全景.png
  - closeup/T06_C_小鑫汇合怼脸.png

### T06_W 单帧提示词

~~~text
Use E16's exact three-way wet junction and cyan-amber-red route reflections. Exactly five distinct young East Asian men C01–C05 enter from different depths and form a loose asymmetric arrow while still walking. C01 is one half-step ahead at center; C02 and C05 occupy unequal left and right mid-depths; C03 and C04 remain deeper and at different heights. All five outfits stay distinct. No one touches, no one forms a flat row, and only C01's face is mostly visible; the others use side or back-three-quarter angles. 32mm chest-height environment wide with foreground pipe edges, deep floor reflections and distant infected silhouettes at the three outer routes.
~~~

### T06_C 单帧提示词

~~~text
Same E16 location. Tight 75mm three-quarter face close-up of C01, with one soft C02 shoulder at the left foreground and C05 as a separated blurred figure in the deep background. C01's white left-forearm bandage and shoulder harness enter the lower frame. He looks from one route to the radio, then almost toward the lens without full direct contact. Expression: relief that the five have arrived, immediately replaced by focus. Cyan and amber route light divide the face cleanly; no idol smile.
~~~

### T06 MiniMax H3 提示词

~~~text
Picture 1 is the exact opening frame and controls E16, exactly five distinct members, their asymmetric depths, route colors, wet reflections and distant infected silhouettes. Picture 2 controls C01's later facial close-up and foreground shoulder framing. Picture 3 is C01's identity and wardrobe reference; its sharp portrait controls the only clear lead face, while blurred standing views control his black clothing, harness, boots and left-forearm bandage. Reference Audio 1 is the exact 29.000–36.000 master segment and controls the end of the first chorus, walking accents and cuts.

Create an eight-second five-member reunion sequence with three edited shots. Exactly five uninfected men, no sixth person. This is determined forward movement, not dance.

[Shot 1 — 00:00.000–00:02.800] Begin from Picture 1 in a stable 32mm environment wide. The camera performs a short 30-degree arc with slight push-in. Each member takes exactly two forward steps along his existing path. C02 and C05 reach the mid-layer; C03 and C04 close the rear gaps. They stop in a layered asymmetric arrow without touching.

[Shot 2 — 00:02.800–00:05.200] Hard cut to Picture 2's 75mm close-up. C01 sings the final chorus phrase with his eyeline first on the radio. On “全员同频,” he permits one brief half-second lens contact as a team declaration, then looks toward the central route. One small inhale and jaw set finish the reaction.

[Shot 3 — 00:05.200–00:08.000] Beat-matched cut to a ground-level 35mm wide showing all ten boots. Five separate boots step forward once in staggered succession, then stop on the same strong beat. The camera tilts up only enough to reveal five separated silhouettes filling the route while distant infected remain outside the group.

No dance pose, no flat lineup, no equal spacing, no cloned face, no duplicated C01, no touching, no merged limbs, no extra arms, no sixth man, no running in place, no body jitter, no camera shake, no text or logo. Replace the generated soundtrack with the master.
~~~

## T07 — Rap 前半三人战斗接力

### 任务信息

- 成片：36.000–42.000
- 生成：6 秒
- 场景：E10
- 人物：C01、C02、C03，恰好两只感染者；近脸 C02
- 新单帧：
  - wide/T07_W_三人Rap战斗全景.png
  - closeup/T07_C_C02Rap怼脸.png

### T07_W 单帧提示词

~~~text
Use E10's wet rail corridor. Exactly three distinct uninfected men C01, C02 and C03 form a moving diagonal from foreground to background. C02 is center-midground with short baton ready; C01 is left foreground in black clothing with the white left-arm bandage; C03 is deeper right in the medical vest reaching toward a fallen metal barrier. Exactly two infected remain on opposite sides of the route, each assigned to one readable action line. 28mm low environment wide, rescue-vehicle amber light behind, cyan escape corridor ahead, full bodies and weapons separated, no flat row and no overlapping heads.
~~~

### T07_C 单帧提示词

~~~text
Same E10 corridor. Tight 60mm low-angle three-quarter close-up of C02 during his Rap line, baton resting diagonally at the lower frame edge without covering his mouth. C01's bandaged arm passes only as a soft separated foreground edge; C03 remains blurred in the background. C02 looks just above and fifteen degrees to the right of lens toward the escape route. His mouth shapes are crisp and economical, brow relaxed, chin slightly lifted, restrained swagger rather than aggression.
~~~

### T07 MiniMax H3 提示词

~~~text
Picture 1 controls the exact three-person diagonal, E10 corridor, two infected, action lanes and lighting. Picture 2 controls C02's Rap close-up, baton position, eyeline and foreground parallax. Picture 3 is C02's identity and wardrobe reference: use its sharp portrait for the only clear face and blurred standing views for the blue-gray jacket, radio, body and boots. Reference Audio 1 is the exact 36.000–42.000 master segment and controls the fast Rap delivery, four action accents and hard cuts.

Create a six-second three-member Rap combat relay with exactly three uninfected men and two infected. The Rap continues seamlessly across all cuts.

[Shot 1 — 00:00.000–00:02.000] Begin from Picture 1 in a stabilized 28mm environment wide. C01 blocks the first infected's reach once with his forearm guard and separates. C03 pulls the fallen barrier sideways once to open a lane. C02 advances two grounded steps between them. No three actions happen at the same instant; use a readable left-to-right relay.

[Shot 2 — 00:02.000–00:04.000] Beat-matched hard cut to Picture 2's 60mm C02 close-up. He performs the central Rap line with precise lips and still shoulders. On the final English word, he gives one brief chin lift, never a repeated nod, and breaks his eyeline toward the nearest infected.

[Shot 3 — 00:04.000–00:06.000] Action-match cut to a low 35mm full-body side shot. C02 performs one clean baton-to-forearm parry, immediately retracts the baton, and runs through the opened lane. C01 and C03 follow in separate depths while the two infected remain behind.

No simultaneous chaotic brawl, no repeated strikes, no head hit, no body crossing, no cloned member, no clear infected face, no gore, no freestyle gesturing, no camera shake, no speed ramp, no text or logo. Generated audio is only a guide.
~~~

## T08 — Rap 后半双人补位

### 任务信息

- 成片：42.000–49.000
- 生成：8 秒
- 场景：E03＋E13
- 人物：C04、C05，恰好两只感染者；近脸 C05
- 新单帧：
  - wide/T08_W_C04C05双人补位全景.png
  - closeup/T08_C_C05对讲机Rap怼脸.png

### T08_W 单帧提示词

~~~text
Use E03's service-door side of the blast hall and E13's route-marker language without readable text. Exactly two distinct uninfected men work in separate layers: C05 at the heavy side door in the foreground with both hands on a horizontal wheel, C04 three meters behind using his shoulder radio and watching the cyan corridor. Exactly two infected silhouettes approach C04 from the far route but remain outside contact range. The route marker and one green light sit between the men, visually showing left-side response and right-side cover. 30mm environment wide, unequal depth, full bodies, clear hand positions, wet floor and cyan-amber-red reflections.
~~~

### T08_C 单帧提示词

~~~text
Same door hall and C05 outfit. Tight 70mm face-and-shoulder close-up while he speaks Rap into a small radio held below his mouth. His gray rolled sleeve and black vest remain visible. He looks twenty degrees camera-right toward C04 rather than into lens. His expression is sharp but controlled; one side of his face carries amber door light, the other cyan spill. Lips form quick syllables with minimal jaw exaggeration. The door wheel is soft foreground geometry, not a microphone.
~~~

### T08 MiniMax H3 提示词

~~~text
Picture 1 controls the exact two-member wide composition, door wheel, C04's covering position, two distant infected and industrial lighting. Picture 2 controls C05's later Rap close-up, radio position and eyeline toward C04. Picture 3 is C05's identity and wardrobe reference: the sharp right portrait controls his face; blurred standing views control his gray rolled sleeves, black vest, belt equipment, body and boots. Reference Audio 1 is the exact 42.000–49.000 master segment and controls Rap handoffs, door action and cuts.

Create an eight-second two-member support sequence with three edited shots. C04 and C05 remain distinct and never swap wardrobe. C05 carries the visible Rap close-up while C04 performs route cover.

[Shot 1 — 00:00.000–00:02.700] Begin from Picture 1 in a 30mm environment wide with a short stable truck-left. C05 turns the door wheel exactly half a rotation with believable body weight. C04 speaks one silent visual report into his shoulder radio, then points one open hand toward the clear route. The two infected take one uneven step but remain far behind.

[Shot 2 — 00:02.700–00:05.100] Hard cut to Picture 2's 70mm close-up. C05 performs the Rap phrase with quick clean lips, still head and one controlled breath. His eyes check C04 once and return to the door mechanism. No direct lens contact.

[Shot 3 — 00:05.100–00:08.000] Beat cut to a low 35mm two-shot. The door opens enough for one body. C04 steps through first while keeping the route in view; C05 holds the door, then follows. One infected reaches the closing edge but never contacts either man. The door closes between them and the silhouettes.

Exactly two heroes and two infected. No duplicated door wheel, no repeated spinning, no wardrobe swap, no merged bodies, no head strike, no gore, no mouth wobble, no body shake, no camera shake, no readable route text, no logo. Restore the master audio in post.
~~~

## T09 — 五人背靠背防守

### 任务信息

- 成片：49.000–55.000
- 生成：6 秒
- 场景：E16＋尸潮远景群体参考
- 人物：恰好 C01–C05；近脸 C03；感染者保持外围
- 新单帧：
  - wide/T09_W_五人背靠背防守全景.png
  - closeup/T09_C_C03团魂怼脸.png

### T09_W 单帧提示词

~~~text
Use E16's wet three-way junction. Exactly five distinct members form a loose defensive pentagon with unequal distances and different facing directions. C01's white left-arm bandage is visible near center-left; C03 stands center-front in the medical vest; C02, C04 and C05 occupy separated side and rear layers. Four to six infected silhouettes remain around the outer edges, never between the heroes and never close enough to merge. Each member has his own clear action lane and no two weapons cross. High-oblique 32mm environment wide showing full bodies, route geometry and large negative gaps. Cyan, amber and red reflections define the three threat directions.
~~~

### T09_C 单帧提示词

~~~text
Same E16 location. Tight 75mm C03 facial close-up framed by two soft, widely separated teammate shoulder edges. His medical vest and dark red lining remain visible; no shoulder blocks his face. He looks from one teammate to the opposite route, then settles fifteen degrees left of lens. Expression: fear controlled by trust, mouth mid-chorus, brow softening on “No one falls.” Cyan light rims one eye, amber light touches the opposite cheek. No smile and no clear infected face behind him.
~~~

### T09 MiniMax H3 提示词

~~~text
Picture 1 controls the five-member defensive pentagon, E16 junction, route colors, infected perimeter and full-body separation. Picture 2 controls C03's later close-up, teammate shoulder parallax and emotional eyeline. Picture 3 is C03's identity and wardrobe reference; use the sharp portrait for the only clear close face and blurred standing views for his vest, dark red lining, medical pouches, body and boots. Reference Audio 1 is the exact 49.000–55.000 master segment and controls the final chorus phrasing, defensive accents and cuts.

Create a six-second five-member team-defense sequence with exactly five uninfected men and a distant infected perimeter. The action is coordinated but not dance.

[Shot 1 — 00:00.000–00:02.200] Begin from Picture 1 in a high-oblique 32mm environment wide. The camera cranes down slightly. Each member shifts one step toward his assigned route, expanding the pentagon without touching. The outer infected silhouettes advance one uneven step but remain outside a large empty safety radius.

[Shot 2 — 00:02.200–00:04.100] Hard cut to Picture 2's 75mm C03 close-up. On “No one falls,” he looks briefly toward the teammate shoulder at frame-left; on “no one leaves,” he turns only his eyes toward the opposite teammate, then faces his route. His lips remain precise and his head stable.

[Shot 3 — 00:04.100–00:06.000] Beat cut to a low 35mm environment wide from the opposite diagonal. The five members each complete one simple outward defense on separate beats: one bar block, one baton parry, one gate shove, one radio-guided sidestep and one shielded step. Show preparation and recovery; no overlapping contacts. End with all five still standing and the perimeter pushed back.

No chaotic mass fight, no simultaneous limb tangle, no cloned face, no sixth hero, no team member becoming infected, no clear zombie face, no gore, no spinning, no jumping, no camera shake, no text or logo. Generated soundtrack is temporary.
~~~

## T10 — 唯一剪影群舞

### 任务信息

- 成片：55.000–60.000
- 生成：6 秒
- 场景：E03 巨型逆光门
- 人物：恰好 C01–C05；近脸为 C04 的剪影侧脸
- 新单帧：
  - wide/T10_W_五人逆光剪影群舞全景.png
  - closeup/T10_C_C04剪影侧脸特写.png

### T10_W 单帧提示词

~~~text
Use E03's gigantic cyan-lit doorway and wet mirrored floor. Exactly five young male silhouettes stand in a staggered asymmetric formation occupying the central 55% of frame. C01 is center but all faces remain unreadable; outfit silhouettes, C01's left-arm bandage wrap, C02's hooded shell, C03's pouch shape, C04's hooded collar and C05's rolled sleeves remain distinguishable. Strong cyan backlight, thin amber floor lights and deep black bodies. 24mm ultra-wide, large architectural scale and floor reflection. No infected, no stage fixtures, no microphones, no readable faces and no flat W or V formation.
~~~

### T10_C 单帧提示词

~~~text
Same doorway and backlight. Extreme 100mm side-profile facial silhouette of C04, face mostly black with only a thin cyan rim defining forehead, nose, lips and chin. The hooded collar and shoulder radio silhouette identify him; four teammates remain as very soft separated vertical shapes in the background. He looks across frame rather than into lens. This is a true face close-up but identity detail is intentionally concealed by backlight to reduce generation errors.
~~~

### T10 MiniMax H3 提示词

~~~text
Picture 1 controls the exact five-person silhouette formation, doorway, wet reflections and backlight. Picture 2 controls C04's later rim-lit side-profile face close-up. Picture 3 is C04's identity and wardrobe reference; use it only to preserve his head shape, brown hair silhouette, hooded jacket, shoulder radio and body proportions, while the performance remains a dark silhouette. Reference Audio 1 is the exact 55.000–60.000 master segment and controls four strong choreography accents and the two hard cuts.

Create a six-second cinematic silhouette performance with exactly five men and three edited angles. This is the only dance clip in the MV. The movement is simple, grounded and readable.

[Shot 1 — 00:00.000–00:02.100] Begin from Picture 1 in a locked 24mm ultra-wide. On four strong counts, all five perform: one unified step forward, one restrained shoulder hit, one forearm sweep close to their own bodies, then one held stop. Unequal spacing and staggered depth remain.

[Shot 2 — 00:02.100–00:03.700] Hard cut to Picture 2's 100mm side-profile close-up. C04 turns his head only once from the cyan doorway toward the group, stops, and releases one controlled breath. Lips are not clearly readable and no lip-sync is required.

[Shot 3 — 00:03.700–00:06.000] Beat-matched cut to a true vertical overhead wide. The five silhouettes take one diagonal step each to open a broken five-ray shape, make one synchronized shoulder stop, and freeze through the final frame. Hands stay near each dancer's own torso.

No complex K-pop choreography, no jumping, no spinning, no freestyle, no hip shaking, no flat row, no perfect diamond, no equal spacing, no touching, no merged limbs, no sixth dancer, no visible infected, no face generation, no body jitter, no camera shake, no stage lights, no text or logo. Replace generated audio with the master.
~~~

## T11 — 五人合体清场

### 任务信息

- 成片：60.000–66.000
- 生成：6 秒
- 场景：E16
- 人物：恰好 C01–C05；近脸 C01；感染者在不同动作通道
- 新单帧：
  - wide/T11_W_五人合体推进全景.png
  - closeup/T11_C_小鑫最终AllIn怼脸.png

### T11_W 单帧提示词

~~~text
Use E16 after the defensive sequence. Exactly five distinct members advance toward the central route in a deep staggered formation, never a flat row. C01 is center-front with his bandaged left arm held close; C02 and C05 occupy the mid-layer; C03 and C04 guard the rear. Three infected silhouettes stand in three fully separated outer action lanes, each several meters from the nearest member. The five appear tired but coordinated. Low 28mm environment wide, wet floor leading lines, cyan route ahead and red-amber threat behind, full bodies and all weapons separated.
~~~

### T11_C 单帧提示词

~~~text
Same E16 location. Tight 70mm frontal-three-quarter close-up of C01 after battle, his face dirty and wet but unchanged, bandaged left forearm crossing the lower frame. The four other members remain as separated soft figures behind him at different depths. C01 begins with his eyeline fifteen degrees camera-right; only on the final word “All in” may he meet the lens for half a second. Expression is quiet certainty, no smile, one subtle swallow and one controlled exhale.
~~~

### T11 MiniMax H3 提示词

~~~text
Picture 1 controls the exact five-member advance, E16 route geometry, three separated infected lanes and lighting. Picture 2 controls C01's final facial close-up, bandage foreground and four-member background separation. Picture 3 is C01's identity and wardrobe reference; its sharp portrait is the only facial truth and blurred standing views control his black outfit, harness, boots and left-arm bandage. Reference Audio 1 is the exact 60.000–66.000 master segment and controls “Ready now / One beat, one team / All in,” action accents and the final lens-contact beat.

Create a six-second final team-clear sequence with three edited shots and exactly five uninfected men.

[Shot 1 — 00:00.000–00:02.300] Begin from Picture 1 in a low 28mm environment wide. The five advance one staggered step. C02 performs one baton parry in the left lane; C05 pushes one infected aside with the flat of his bar in the right lane; C03 and C04 keep the rear route clear. C01 moves through the center. Each contact is separate, brief and recovered.

[Shot 2 — 00:02.300–00:04.300] Action-match cut to Picture 2's 70mm close-up. C01 mouths the short final chant. His gaze remains off lens for “One beat, one team,” then meets the lens for no longer than half a second on “All in.” He immediately breaks eyeline toward the open route.

[Shot 3 — 00:04.300–00:06.000] Hard cut to a 35mm rear environment wide. All five pass the final threshold together at different depths. C01 raises the radio once; one shared green signal lights. The remaining infected silhouettes stop behind the closing gate.

No simultaneous chaotic fight, no repeated hit, no head impact, no cloned member, no sixth hero, no merged weapons, no blood spray, no gore, no body vibration, no camera shake, no prolonged direct lens stare, no text or logo. Final edit restores the master audio.
~~~

## T12 — 器乐尾声与五人离场

### 任务信息

- 成片：66.000–74.600
- 生成：10 秒
- 场景：E18＋E10
- 人物：恰好 C01–C05；近脸 C05
- 新单帧：
  - wide/T12_W_五人离场全景.png
  - closeup/T12_C_C05回望怼脸.png

### T12_W 单帧提示词

~~~text
Use E10's wet corridor scale and E18's old radio in the foreground. The old five-channel radio sits sharp in the lower-left foreground with five green indicators. Exactly five distinct members walk away together in the middle distance toward a cold cyan opening, staggered at different depths and clearly separated. C01's bandaged arm, C02's blue-gray jacket, C03's pouches, C04's hooded collar and C05's rolled sleeves remain distinguishable from behind. No infected remains in the visible route. 35mm low environment wide, strong wet reflections, quiet aftermath, no triumphant pose.
~~~

### T12_C 单帧提示词

~~~text
Same corridor and aftermath lighting. Tight 85mm three-quarter close-up of C05 turning his head slightly back toward the radio while his body continues facing the exit. His face has sweat and a small scratch but remains calm. He looks thirty degrees off lens toward the green indicator, lips closed because this is instrumental. Warm radio light touches one cheek; cyan exit light outlines his hair and shoulder. The other four members remain soft, separate silhouettes ahead, proving the same continuous location.
~~~

### T12 MiniMax H3 提示词

~~~text
Picture 1 controls the exact final corridor, foreground radio, exactly five separated members walking away, wet reflections and cyan opening. Picture 2 controls C05's later silent facial close-up and eyeline back toward the radio. Picture 3 is C05's identity and wardrobe reference: use the sharp portrait for his face and blurred standing views for his gray rolled sleeves, black vest, belt equipment and body proportions. Reference Audio 1 is the exact 66.000–74.600 instrumental tail and controls footsteps, visual rhythm, light changes and final blackout. No character speaks or sings.

Create a ten-second cinematic instrumental outro with three clearly edited shots and exactly five uninfected men.

[Shot 1 — 00:00.000–00:03.300] Begin from Picture 1 in a low 35mm environment wide. The five members take three slow synchronized-but-natural walking steps away from camera at unequal depths. The camera performs a very slow pull-back, increasing the negative space around the foreground radio.

[Shot 2 — 00:03.300–00:06.200] Hard cut to Picture 2's 85mm C05 close-up. Without stopping, C05 turns only his head once toward the radio, holds the look for one beat, then returns his gaze to the exit. His lips remain closed. One exhausted breath and a small release of the jaw are the only facial actions.

[Shot 3 — 00:06.200–00:10.000] Hard cut to an extreme macro of the five green radio lights. The five lights pulse separately once, then settle into one shared central glow while the outer four dim permanently. The five men remain soft silhouettes walking through the cyan opening in the deep background. On the final music stop, the last glow cuts out and the image holds near-black for at least twelve frames.

No extra person, no member turning into camera, no lip-sync, no infected return, no duplicated radio, no random light count, no relighting after blackout, no body jitter, no camera shake, no fade effect, no subtitle, no logo or watermark. The master audio remains the only final soundtrack.
~~~

## 9. 资产数量汇总

- MiniMax 视频：12 条。
- 新 Wide 单帧：12 张。
- 新 Close 怼脸单帧：12 张。
- 新人物场景单帧总计：24 张。
- MiniMax 专用角色卡：5 张，已准备。
- 可复用空场景：8 张，已复制到本制作包。
- 可复用丧尸参考：2 张，已复制。
- Reference Audio 1：后续从母带导出 12 段。
- 群舞：仅 T10 一条，成片约 5 秒。

## 10. 单帧验收门槛

每组 Wide＋Close 必须一起验收：

1. 同一人物的脸、发型、服装、伤痕和道具完全一致。
2. Close 必须看得出与 Wide 是同一个场景、同一时间、同一灯光。
3. Wide 必须能看见脚部接地、动作路径和环境空间。
4. Close 必须是真正怼脸，而不是普通半身；脸占画面约 45%–60%。
5. 五人同框必须正好五人，不得出现第二个小鑫或克隆脸。
6. 战斗帧必须区分英雄与感染者，所有手臂、武器和身体边缘清楚分离。
7. 不生成文字、Logo、字幕、UI 或可读路牌。
8. 任一关键帧未过验收，不进入 MiniMax 提交。

## 11. 后续执行顺序

1. 先生成 T01、T02、T06、T10 四组共 8 张校准帧。
2. 校准通过后，再生成其余 16 张单帧。
3. 从母带导出 A01–A12。
4. 把本文档中的 12 条 H3 提示词拆成独立 txt。
5. 每条先 dry-run 核对三张图片、音频、时长和 16:9 映射。
6. 优先提交单人剧情条目，再提交双人、三人、五人和剪影群舞。
7. 下载后统一移除模型音轨，用母带完成粗剪。
