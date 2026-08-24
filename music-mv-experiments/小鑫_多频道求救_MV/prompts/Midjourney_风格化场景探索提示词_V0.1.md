# Midjourney 风格化场景探索提示词 V0.1

## 推荐工作流

### 第一轮：只选美学，不放人物

先运行“同一岔路口的 4 种风格测试”。不要上传小鑫参考图，也不要加 Omni Reference。目标只是决定这支 MV 的空间、光线、材质和色彩语言。

探索参数建议：

```text
--ar 16:9 --v 8.2 --raw --s 350 --chaos 10 --no text letters logo watermark people
```

如果你的账号尚未开放 V8.2，删除 `--v 8.2`，使用当前默认版本即可。

### 第二轮：锁定风格，批量出空景

从第一轮挑一张最喜欢的图片，上传后作为 Style Reference：

```text
--sref <你的风格图URL> --sw 200
```

锁定参数建议：

```text
--ar 16:9 --raw --s 220 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

Style Reference 负责颜色、材质、灯光和整体气质；提示词只描述场景内容。整批图保持同一个 `--sref` 和 `--sw`。

### 第三轮：把选中的空景交给 Codex 合成人物

Midjourney 只负责场景，不在这一阶段生成小鑫。你把选中的原图下载后交给我，我会同时使用：

- 你选中的 Midjourney 场景原图
- `references/` 下三张小鑫身份参考图
- `DESIGN.md` 的服装、表演、色彩和连续性规则

在不破坏场景氛围的前提下制作带小鑫的关键帧。每个主要场景至少规划两种覆盖：

1. **剧情主镜头**：全景、中景或动作镜头，交代人物在什么地方做什么。
2. **情绪/信息特写**：脸、手、无线电、地图或停住的靴子，表达他当下真正的心理变化。

人物生成不在 Midjourney 中完成，因此下文 E01–E18 的提示词全部保持无人物。

---

# 一、同一岔路口的 4 种风格测试

## A. 湿冷救援新黑色电影（首选）

```text
an immense three-way underground junction beneath a ruined city at night, wet black concrete reflecting steel-blue darkness, one tunnel touched by amber rescue headlights, one by dim emergency red, one by pale cyan industrial light, sparse green radio beacons embedded in the floor, realistic practical lighting, severe negative space, restrained neo-noir cinematography, tactile rain mist, smoky volumetric depth, elegant environmental storytelling, premium cinematic production design, no characters, center-safe composition --ar 16:9 --v 8.2 --raw --s 350 --chaos 10 --no text letters logo watermark people
```

**特点：** 最适合当前故事，真实、克制、能承载人物表演，后续 MiniMax 最稳。

## B. 巨物主义废墟美学

```text
a monumental three-way underground junction carved into colossal brutalist concrete, the architecture dwarfing all human scale, impossible overhead ventilation shafts, rain falling through broken ceilings like silver curtains, three distant corridors marked only by blue amber and red light, dramatic geometric shadows, austere post-apocalyptic cathedral atmosphere, sculptural fog, cinematic architectural photography, solemn and beautiful, no characters --ar 16:9 --v 8.2 --raw --s 450 --chaos 12 --no text letters logo watermark people
```

**特点：** 空间压迫最强，S12 高位俯拍会非常有记忆点，但人物可能显得太小。

## C. 模拟信号梦魇

```text
a deserted three-way emergency tunnel seen through the visual language of an analog disaster broadcast, deep charcoal concrete, oxidized metal, sickly green signal lamps, dark crimson warning glow, soft CRT bloom translated into real practical light, subtle scanline-like shadows across drifting fog, halation, 35mm grain, underexposed blacks, eerie but elegant transmission-room atmosphere, surreal documentary realism, no characters --ar 16:9 --v 8.2 --raw --s 500 --chaos 14 --no text letters logo watermark people
```

**特点：** 与 Radio Intro/Outro 很契合，风格最明确；建议只作为 20–30% 的视觉层，不要全片都做监控效果。

## D. 舞台化末日表现主义

```text
a stylized three-way underground junction staged like a vast expressionist theater set, hard-edged pools of blue amber and red light cutting through black fog, elongated shadows, wet reflective floor, minimal but exquisite industrial geometry, controlled theatrical haze, emotionally charged color blocking, cinematic realism blended with graphic stage design, haunting and beautiful rather than fantastical, no characters --ar 16:9 --v 8.2 --raw --s 600 --chaos 16 --no text letters logo watermark people
```

**特点：** 最风格化，歌词画面感强；需要控制 `--s`，否则可能过度舞台化。

---

# 二、18 个无人物场景候选（首批只做 8 个）

以下提示词默认使用你选中的同一个 Style Reference。将末尾参数中的 `https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png` 替换为风格图链接。

## 生成优先级

18 个提示词不是 18 张必交素材，而是一套可选择的场景库。第一批只生成下面 8 个核心场景，就足以覆盖整支 MV：

| 优先级 | 场景 | 覆盖镜头 | 为什么需要 |
| --- | --- | --- | --- |
| 必做 | E03 三号门大厅 | S02、S03 | 封门动作和封门后的脸部反应可共用同一空间 |
| 必做 | E05 救援车内部 | S04 | 四频道无线电、车内过肩和人物近景的基础场景 |
| 必做 | E09 水与火同框 | S05 | 一张图同时表达 A 区缺水和 C 区燃烧 |
| 必做 | E10 雨夜奔跑路段 | S06、S09 | 车灯、路标、奔跑可在同一长空间完成 |
| 必做 | E13 地图与四路信号 | S07 | 承担四栋楼、一辆车和路线选择的信息特写 |
| 必做 | E15 尸潮倒数 | S08 | Pre-Chorus 的主要危机大景 |
| 必做 | E16 岔路口主场景 | S10、S11、S12 | 全片核心场景，可裁出脸部、脚步和俯拍版本 |
| 必做 | E18 失联无线电结尾 | S01、S13 | 开头和结尾可共享无线电视觉母题 |

第二批按粗剪缺口再补：E01 城市全貌、E12 四栋楼、E17 高位俯拍岔路。它们能增强规模感，但不是开工条件。

其余 E02、E04、E06、E07、E08、E11、E14 都是备选覆盖：优先从上述 8 个核心场景裁切、扩图或重构，只有现有场景无法满足镜头时再生成。

推荐实际顺序：

`先试 E16 → 确定风格 → 生成 E03/E05/E09/E10/E13/E15/E18 → 把 8 张原图交给 Codex → 再决定是否补第二批`

## E01 — 城市全貌：四个求救点

```text
a vast post-apocalyptic industrial city at midnight during light rain, four isolated apartment towers scattered across the dark city each showing a different emergency glow, one cold blue, one smoky orange, one dim red, one fading green, abandoned elevated roads connecting them but visibly broken in several places, distant rescue headlights moving through the darkness, layered atmospheric depth, elegant cinematic aerial establishing shot, believable scale, center-safe composition --ar 16:9 --raw --s 220 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E02 — 无线电救援站

```text
an underground emergency radio operations room after evacuation, rough wet concrete walls, a battered metal desk with four old radio receivers and four small green channel lamps, cables hanging neatly, one empty chair still turning slightly, practical steel-blue overhead light, a narrow amber beam entering from the corridor, restrained analog technology, intimate cinematic production design, strong foreground middle ground background separation --ar 16:9 --raw --s 220 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E03 — 三号门大厅

**状态：已选定。**

- 场景原图：`references/scenes/E03_三号门大厅.png`
- 覆盖镜头：S02、S03
- 已有优势：巨型半开防爆门、前景机械拉杆、红色警示灯和门外冷光同时成立，动作因果可以在一个空间内读懂。
- S02 构图：小鑫位于左前景，侧身压下现有机械拉杆；半开的钢门在中央背景开始闭合，火花与积水反射强调重量。
- S03 构图：封门后切到小鑫脸部近景，肩台入画；冷蓝侧光与远处琥珀警示灯保持空间连续。
- 结束帧：钢门完全闭合，只剩门缝最后一道冷光和落下的火花；机械结构不新增零件。
- 连续性：小鑫左臂绷带清晰，拉杆位置、门的开合方向和红灯位置在起止帧中保持一致。

原始生成提示词保留如下，便于需要时重生成：

```text
a huge underground blast-door hall known only by its architecture, one massive steel floodgate standing half open, hydraulic pistons, a manual mechanical lever, shallow rainwater across the floor, cold blue tunnel darkness beyond, sparse red warning lamps, small falling sparks, heavy believable machinery, symmetrical cinematic composition with ominous negative space, no readable signage --ar 16:9 --raw --s 220 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E04 — 三号门封闭后的走廊

```text
the same monumental underground blast-door hall moments after the steel gate has fully closed, red light disappearing from the sealed door seam, a few final sparks reflected in black water, abandoned tools on the floor, cold mist settling, absolute stillness after urgent action, low-angle cinematic frame, tactile oxidized metal and wet concrete, emotionally heavy empty space --ar 16:9 --raw --s 220 --chaos 3 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E05 — 救援车内部

**状态：已选定。**

- 场景原图：`references/scenes/E05_救援车内部.png`
- 覆盖镜头：S04
- 已有优势：单方向盘结构清晰，驾驶席、仪表台、雨夜挡风玻璃和冷暖光源关系可信，适合稳定制作后排过肩镜头。
- 人物构图：小鑫坐在左侧驾驶位，镜头从右后方越过肩膀看向仪表台；脸只露侧面轮廓，主要表演落在切换旋钮的手。
- 道具修正：将仪表台设备整理为清晰的四频道状态，每个频道仅对应一枚绿色指示灯；地图、手电与急救物资保持现有位置。
- 连续性：只保留一个方向盘，不新增屏幕、文字界面或第二套驾驶结构；车外始终是冷蓝雨夜，车内保持琥珀仪表光。
- 视频动作：四枚频道灯依次亮起，小鑫连续切换旋钮，挡风玻璃雨水缓慢流动；车辆本身不剧烈晃动。

原始生成提示词保留如下，便于需要时重生成：

```text
interior of an old rescue off-road vehicle at night, rain running down the windshield, four analog radio channels mounted across the dashboard with small green indicator lamps, a folded route map, flashlight, bandages and emergency tools, warm amber instrument light against cold blue rain outside, intimate shallow depth of field, realistic worn materials, cinematic over-the-shoulder composition prepared for a driver but currently empty --ar 16:9 --raw --s 200 --chaos 3 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E06 — 救援车外观与车灯

```text
a battered black rescue off-road vehicle idling beneath a ruined elevated highway in the rain, powerful amber headlights cutting through steel-blue mist, water rippling around the tires, improvised emergency equipment secured to the roof, distant industrial buildings almost invisible in darkness, low ground-level cinematic angle, elegant practical-light composition, no military logos or readable markings --ar 16:9 --raw --s 220 --chaos 5 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E07 — A 区缺水

```text
the courtyard of a dark residential block suffering a water shortage, rows of empty blue water containers arranged with quiet desperation, dry communal taps, rain falling outside the roof but unable to reach the sealed collection area, one weak green radio beacon glowing beside the containers, cool cyan and charcoal palette, intimate environmental storytelling, beautiful melancholic realism, no characters --ar 16:9 --raw --s 240 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E08 — C 区燃烧

```text
an industrial apartment tower burning from several upper windows during a cold rainy night, orange fire contained within the dark architecture, smoke pressed sideways by wind, flooded street reflecting both flame and emergency red, an abandoned rescue hose leading toward the building, the scene tragic and beautiful rather than explosive, cinematic long-lens city view, no bodies and no gore --ar 16:9 --raw --s 240 --chaos 5 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E09 — 水与火同框

**状态：已选定。**

- 场景原图：`references/scenes/E09_水与火同框.png`
- 覆盖镜头：S05
- 已有优势：蓝色水罐、红色灭火器与雨窗外燃烧建筑处在同一真实车厢空间，前中后景清晰，水与火不会呈现为分屏拼贴。
- 人物构图：小鑫位于画面中右部、物资与火楼之间，身体朝向前舱，脸通过回望或后视镜呈现；肩台与一只手进入清晰焦点。
- 表演要求：他认真回应并试图让对方放心，疲惫但不敷衍；火光和冷蓝反射同时落在脸上。
- 连续性：保留水罐、灭火器和窗外火楼的位置关系，不新增爆炸；车内结构、服装和无线电造型与 E05/S04 连续。
- 视频动作：镜头从左侧水罐和灭火器缓慢横移到小鑫，再让焦点落向雨窗外火楼；雨水流动，远处火势稳定，不突然扩大。

原始生成提示词保留如下，便于需要时重生成：

```text
inside the open rear compartment of a rescue vehicle, wet blue water containers and red fire extinguishers in sharp foreground, through the rain-covered side window a distant building burns orange across the city, cold supplies and warm disaster sharing one believable space, layered cinematic depth, restrained symbolism, rich practical light, designed as a premium music video frame --ar 16:9 --raw --s 260 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E10 — 雨夜奔跑路段

**状态：已选定。**

- 场景原图：`references/scenes/E10_雨夜奔跑路段.png`
- 覆盖镜头：S06、S09
- S06 用法：保留左侧救援车与中央纵深，小鑫从画面中央偏左向右前方冲过积水，通讯器在手，低机位全身动作。
- S09 用法：裁取道路中段做中远景跟拍，小鑫保持从左向右奔跑，背后琥珀车灯形成轮廓光。
- 后期注意：适度压低右侧白色发光装置，避免与人物争夺视觉焦点；不改变原图的钢蓝雨夜、湿地反射和橙色车灯。

需要重生成时使用：

```text
a long abandoned service road beneath elevated concrete megastructures in a ruined industrial city at night, deep central perspective with wet rail tracks and flooded pavement, one battered rescue vehicle parked on the left casting warm amber headlights across the rain, steel-blue mist and distant urban towers, tangled overhead cables, enough clear road space for a running character to be composited later, cinematic low wide angle, layered foreground middle ground and background, realistic practical lighting, no readable signage --ar 16:9 --raw --s 220 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E11 — 无字路标

```text
a close cinematic view of a weathered three-direction road marker made only of bold geometric arrows, no words or numbers, rainwater dripping from oxidized metal, one arrow caught by amber headlights while the other two fade into cold blue and dark red fog, shallow depth of field, tactile material photography, ominous but visually refined --ar 16:9 --raw --s 260 --chaos 5 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters numbers logo watermark people
```

## E12 — 四栋楼同时呼叫

```text
four distant residential towers seen from the center of a flooded industrial interchange at night, each tower carrying one tiny pulsing emergency light, all four lines of sight converging toward an empty foreground where a single rescue vehicle could stand, steel-blue rain, red smoke, amber window fire and green signal points balanced into one elegant composition, cinematic deep focus --ar 16:9 --raw --s 260 --chaos 6 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E13 — 地图与四路信号

**状态：已选定。**

- 场景原图：`references/scenes/E13_地图与四路信号.png`
- 覆盖镜头：S07
- 已有优势：地图纸张与湿润车盖质感可信，红色信标、琥珀反射和城市虚化背景延续了全片风格。
- 关键帧修正：当前明确可见 3 个红色信标，合成时补为 4 个；保留唯一琥珀车辆点，并强化一条可读的窄路线。
- 构图修正：生成 S07 时调整为更接近正俯拍的视角，并加入小鑫悬停、左右犹豫的手；地图上不出现可读地名。

原始生成提示词保留如下，便于需要时重生成：

```text
top-down cinematic still of a worn folded city map spread over a wet rescue vehicle hood, four small red signal lamps placed at distant corners, one amber vehicle marker and a single narrow tunnel route, routes represented only by hand-drawn color lines and geometric blocks, emergency flashlight grazing the paper texture, graphic but physically believable composition, no readable labels --ar 16:9 --raw --s 200 --chaos 3 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters numbers logo watermark people hands
```

## E14 — 一辆车、一条隧道

```text
a single-lane concrete tunnel barely wide enough for one rescue vehicle, the vehicle parked at the entrance with amber headlights, four distant emergency lights visible through separate ventilation openings but only one road ahead, immense dark ceiling, wet reflective ground, severe centered symmetry, cinematic compression of impossible choices, restrained post-apocalyptic realism --ar 16:9 --raw --s 230 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark people
```

## E15 — 尸潮倒数

**状态：已选定。**

- 场景原图：`references/scenes/E15_尸潮倒数.png`
- 覆盖镜头：S08
- 已有优势：单向隧道纵深明确，远处人潮保持为不可辨认的轮廓，冷青空间与琥珀警示灯延续既定美学。
- 关键帧修正：整理前景警示灯为清晰可数的 5 枚；小鑫放在近景侧边守住救援车，不遮挡人潮和倒数灯。
- 视频动作：5 枚灯随歌词倒数逐个熄灭，远处尸潮只缓慢逼近至隧道中段，不突然冲到镜头前，不出现面部和血腥细节。

原始生成提示词保留如下，便于需要时重生成：

```text
deep inside a single-lane underground tunnel, five small red warning lamps in the foreground and an indistinct mass of humanlike silhouettes emerging far beyond the fog, figures kept tiny and unreadable, no visible faces, no gore, amber vehicle light defending one edge of frame, cold blue darkness swallowing the other, elegant suspense composition, cinematic atmospheric horror --ar 16:9 --raw --s 260 --chaos 6 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 200 --no text letters logo watermark close-up zombie gore people in foreground
```

## E16 — 岔路口主场景

**状态：已选定，需结构修正。**

- 场景原图：`references/scenes/E16_岔路口主场景.png`
- 直接覆盖：S10、S11
- 延展覆盖：S12，需要依据本图的建筑、材质和青/琥珀/红配色重构高位俯拍版本。
- 已有优势：左右出口分别由冷青与紧急红标记，中央通道承接琥珀光；湿地反射和巨大工业空间适合全片高潮。
- 合成前清理：移除画面中所有既有人影，保留空场景，再加入身份一致的小鑫。
- 结构修正：在地面增加三个无字几何箭头，让左、中央、右三个选择清晰可读；不依赖门牌或文字说明。
- S10 构图：由小鑫嘴部与肩台近景开始，镜头下移到停住的靴子和三向箭头。
- S11 构图：以红绿信号扫过小鑫脸部和手部，三色出口保持虚化背景，不让建筑抢表演。
- S12 构图：改为高位/鸟瞰，三条路线从小鑫所在中心向外展开；人物随镜头拉升变小。

原始生成提示词保留如下，便于需要时重生成：

```text
the definitive three-way underground junction for a cinematic music video, broad wet concrete floor, three corridors forming a clean readable Y-shaped geometry, left path touched by cold cyan, center path by dying amber, right path by deep emergency red, sparse green radio beacons near the center, brutalist architecture softened by rain mist, enough clear central space for one standing character, emotional negative space, iconic and visually unforgettable --ar 16:9 --raw --s 280 --chaos 4 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 220 --no text letters logo watermark people
```

## E17 — 高位俯拍岔路

```text
perfect bird's-eye view of the same three-way underground junction, monumental Y-shaped routes stretching toward the edges of frame, three restrained color paths in cyan amber and red, a tiny circular green radio light at the exact center, wet black floor reflecting geometric light, graphic clarity combined with photoreal material detail, vast negative space prepared for one isolated character, premium cinematic art direction --ar 16:9 --raw --s 260 --chaos 3 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 220 --no text letters logo watermark people
```

## E18 — 失联无线电结尾

**状态：已选定。**

- 场景原图：`references/scenes/E18_失联无线电结尾.png`
- 覆盖镜头：S01、S13
- 已有优势：无线电造型可信且具有辨识度，湿地倒影、钢蓝环境和微弱琥珀屏幕可同时承载开场通讯与结尾失联。
- 道具修正：将面板绿色指示灯整理成位置明确、清晰可数的 4 枚，固定为全片统一的四频道无线电造型。
- S01 构图：保持此机位，小鑫的绷带手从画外进入并按下通话键；潮湿外壳里只出现非常微弱的脸部倒影，不完整露脸。
- S13 构图：回到相同机位，无人、无线电留在湿地；四枚绿灯在静电声中熄灭，结束帧近乎全黑。
- 连续性：开头和结尾不改变无线电位置、镜头高度及主体朝向，只改变手、灯光与背景状态。

原始生成提示词保留如下，便于需要时重生成：

```text
extreme close-up of an old four-channel radio abandoned on wet black concrete, four small green indicator lamps reflected in rainwater, the vast three-way junction disappearing into soft darkness behind it, no person visible, subtle static-like mist and optical halation, almost monochrome steel-blue palette with fragile green light, still and heartbreaking final-frame composition, large areas of natural darkness --ar 16:9 --raw --s 240 --chaos 3 --sref https://cdn.midjourney.com/393d1611-3b12-4c29-bace-d5c72039a34a/0_1.png --sw 220 --no text letters logo watermark people hands
```

---

# 三、4 个带小鑫的合成构图脚本

本节不是 Midjourney 提示词，不需要在 MJ 中运行。它们是你把空景交给我之后，我制作人物关键帧时使用的构图任务。

## C01 — 三号门侧身封门

- 输入：选中的 E03 三号门空景 + 三张小鑫参考图。
- 输出 A：低角度全身剧情镜头，小鑫侧身压下机械拉杆，左臂绷带清晰。
- 输出 B：手与拉杆特写，火花落下，作为动作剪辑补充。

## C02 — 水与火之间

- 输入：选中的 E09 水火同框空景 + 三张小鑫参考图。
- 输出 A：车内中景，小鑫处在水桶与火楼之间，对后视镜回答。
- 输出 B：脸部近景，冷蓝和火光同时落在脸上，呈现真诚但疲惫的安抚。

## C03 — 岔路口停住

- 输入：选中的 E16/E17 岔路空景 + 三张小鑫参考图。
- 输出 A：高位全景，小鑫停在三路中心，空间压住人物。
- 输出 B：靴子与三向箭头插入特写，清楚完成“脚却停在岔路口”。
- 输出 C：脸与肩台近景，作为“嘴上答应每个出口”的前一个镜头。

## C04 — 无线电与离开的人影

- 输入：选中的 E18 无线电空景 + 三张小鑫参考图。
- 输出 A：无线电超近景，小鑫仅作为远处失焦人影离开。
- 输出 B：相同构图的无人物版本，供最后频道熄灭使用。

---

# 四、快速试风格方法

如果四个预设方向都不够惊喜，可以对 A 方案使用：

```text
--sref random --sw 180 --repeat 4
```

每次随机风格都会变成一个可复用的 Style Code。看到喜欢的结果后保存该 code，后续整批 E01–E18 都使用同一个 code。不要在正式批量阶段继续使用 `random`，否则每张图会变成不同世界。

## 选图标准

优先选择同时满足以下条件的风格图：

1. 黑暗区域仍有材质，不是一片死黑
2. 蓝、橙、红、绿四种光能共存而不显得赛博朋克俗艳
3. 建筑具有识别度，但不会抢过人物
4. 雨、雾、反射能在后续视频模型里自然运动
5. 不依赖小字、Logo 或复杂 UI 才能讲清楚场景
6. 空景即使没有人物，也能让人感到“有人正在等一个不会准时抵达的人”
