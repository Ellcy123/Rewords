# 《Before You Delete Me》Midjourney 素材需求与出图清单 V0.1

> 目标：为 41.920 秒、16:9 横版的欧美二维暗黑童话 MV 准备 Midjourney 素材。
>
> 工作方式参考“小鑫”项目：Midjourney 只负责无人物空景；空景选定后，由 Codex 使用现有骑士设定图与风格参考图合成可交给 MiniMax H3 的起始关键帧。不要在 Midjourney 阶段生成骑士。

---

## 一、这支 MV 的核心理解

这不是“勇者打败怪物”的故事，而是一个从未被玩家使用过的年轻骑士，在游戏被删除前第一次醒来，并请求屏幕外的人看他一眼。

视觉上把整支 MV 做成三张逐渐失控的塔罗牌：

1. **未被使用：** 骑士像废弃素材图标一样沉睡在空文件夹里。
2. **自己造梦：** 他用破地图缝出月亮、怪物和公主，把无法成为英雄的自己藏进故事。
3. **删除之前：** 英雄幻象坍塌，玩家光标停在删除动作前，骑士第一次直视画外。

歌曲中的高音女声统一解释为 `Princess Echo`：她是骑士写出的公主，也是骑士失去的、勇敢而明亮的那部分自我。画面中只出现成年女性的红色纸偶剪影、倒影或脱离骑士的影子；不出现小女孩或儿童形象。

---

## 二、已具备的固定参考

| 编号 | 资产 | 本地文件 | 用途 |
| --- | --- | --- | --- |
| R01 | 太阳塔罗风格图 | `风格参考图_01_太阳塔罗环形构图.png` | 锁定平面插画、塔罗框架、装饰密度与色板 |
| R02 | 骑士人物卡（直接使用） | `references/characters/骑士_角色参考图_01.png` | 锁定金发、年轻男性、红披风、棕色板甲、背后大剑和比例；不再生成三视图或新版角色卡 |
| A01 | 正式歌曲 | `sources/Before_You_Delete_Me_Suno_选定版_V0.1.mp3` | 最终成片音轨，41.920 秒 |

### Midjourney 参考图设置

- `STYLE_URL`（已填写）：`https://cdn.midjourney.com/134852ff-301c-4d90-be02-5ea5c6318388/0_1.png`

Midjourney 阶段只使用 R01 的 Style Reference。R02 骑士图不上传、不放入 Omni Reference，也不写入任何 MJ 提示词；它留到后续人物合成阶段使用。

---

## 三、统一视觉规则

### 画面关键词

- 欧美二维暗黑童话
- 平面 cel animation / editorial illustration
- 哥特塔罗牌与民俗恐怖绘本
- 纸偶关节、印刷颗粒、网点、粗墨线、有限色块
- 环形或拱门式构图，中心主体清晰，四周装饰密集
- 怪诞、病娇、忧郁，但不做血腥猎奇

### 固定色板

- 主色：炭黑、骨白、深森林绿、褐棕
- 光色：旧金、枯橙
- 情绪强调：暗酒红
- 禁止：高饱和糖果色、赛博霓虹、写实银色金属高光

### 全片禁区

- 不要写实摄影感、3D 渲染感、厚重体积光和浅景深。
- 不要可读文字、数字、Logo、文件名和 UI 小字；`348`、`DELETE` 等信息后期添加。
- 不要增加第二名骑士，不要改变盔甲、披风、大剑和发色。
- Princess Echo 不得生成儿童身体、儿童脸或现实小女孩。
- 所有关键主体避开上下各约 10%、左右各约 8% 的区域，为后期字幕、裁切和 H3 运动留安全边距。
- 风格参考图虽然是竖版，但只借用线条、色板、纸张质感和装饰语言，不照搬它的竖版人物排列。

---

## 四、为什么分两批出图

### 第一批：3 张，只确定场景生产线

| 优先级 | 编号 | 素材 | 人物 | 用途 |
| --- | --- | --- | --- | --- |
| 必做 | E01 | 废弃素材档案馆 | 无人物 | S01 场景底图 |
| 必做 | E02 | 破地图缝成的月影王国 | 无人物 | S02 场景底图 |
| 必做 | E03 | 删除前的黑白棋盘终端 | 无人物 | S03 场景底图 |

第一批选定后，把原始大图交给我。我会先检查色板与空间是否适合放入现有骑士，再进入第二批，避免整批重做。

### 第二阶段：由 Codex 合成 3 张正式起始帧

| 优先级 | 编号 | 成片范围 | 素材 | H3 用途 |
| --- | --- | --- | --- | --- |
| Codex制作 | K01 | 00:00–00:15 | 骑士在废弃素材中醒来 | S01 Picture 1 |
| Codex制作 | K02 | 00:15–00:30 | 骑士把废料缝成自己的王国 | S02 Picture 1 |
| Codex制作 | K03 | 00:30–00:41.920 | 删除悬停，骑士直视玩家 | S03 Picture 1 |

### 可选补充：2 张

| 优先级 | 编号 | 素材 | 何时需要 |
| --- | --- | --- | --- |
| Codex可选 | F01 | Princess Echo 红色纸偶剪影设定 | K02/K03 中剪影形态不稳定时 |
| Codex可选 | K04 | 结尾眼神特写 | H3 结尾无法稳定停住时，用于剪辑覆盖 |

你需要从 Midjourney 提供的素材只有 E01、E02、E03 三张空景。K01–K03 及可选 F01/K04 均由 Codex 后续制作。

---

## 五、Midjourney 操作原则

### 空景 E01–E03

- 使用 V8.2。
- R01 放入 **Style Reference**。
- 不加入骑士参考，不生成人物。
- 三张图使用同一个 `--sref`、`--sw`、`--s` 和接近的色彩描述。

统一参数：

```text
--ar 16:9 --v 8.2 --raw --s 260 --chaos 4 --sref https://cdn.midjourney.com/134852ff-301c-4d90-be02-5ea5c6318388/0_1.png --sw 260 --no text letters numbers logo watermark people humans photorealism 3d
```

### 人物分离原则

- 所有 E01–E03 提示词保持 `--no people humans characters faces`。
- Midjourney 不负责骑士身份一致性，不使用 R02，也不使用 Omni Reference。
- 用户交回选定空景后，Codex 同时参考 E01/E02/E03、R02 骑士图和 R01 风格图，制作 K01–K03。
- 骑士保持正面、四分之三正面或小角度侧面，以平面关键姿势和纸偶式有限动画为主，不设计复杂背身旋转。
- 这种方式能保留 MJ 空景质量，同时避免骑士在不同关键帧中改变金发、盔甲、披风、大剑或身体比例。

---

## 六、第一批 3 张素材提示词

## E01 — 废弃素材档案馆

### 对应剧情

骑士从未被使用，沉睡在无人打开的素材文件夹里。空间像游戏资源库，也像埋葬未完成角色的地下教堂。

### 英文提示词

```text
an abandoned archive for unused fantasy game assets, a vast flat paper cathedral extending across a wide horizontal frame, built from empty character-slot frames, blank folder tabs, discarded weapon silhouettes, broken castle elevations, unlit circular selection rings and sealed door-shaped niches, one narrow empty niche on the left third reserved for a character to be added later, a huge bone-white empty moon disc and repeating archive frames occupying the center and right side, damaged tarot-panel border growing from thorn vines and dead sunflowers, oppressive lateral symmetry, charcoal black deep forest green tarnished gold muted rust and one restrained wine-red accent, pure flat 2D cel illustration, European gothic dark fairy tale, editorial motion-graphics composition, bold ink outline, screen-print grain, paper-cut layers with almost no perspective, beautiful lonely and uncanny, no readable interface
--ar 16:9 --v 8.2 --raw --s 260 --chaos 4 --sref https://cdn.midjourney.com/134852ff-301c-4d90-be02-5ea5c6318388/0_1.png --sw 260 --no text letters numbers logo watermark people humans characters faces photorealism 3d depth-of-field
```

### 验收标准

- 左侧三分之一必须有足够的空位放入骑士，右侧保留档案纵深和后续平移空间。
- 图标、文件夹和 UI 只能是几何暗示，不得出现乱码文字。
- 读起来像“被遗弃的角色墓园”，但仍是二维插画，不是写实仓库。
- 命名为 `E01_废弃素材档案馆.png`。

---

## E02 — 破地图缝成的月影王国

### 对应剧情

骑士用破地图、旧任务纸和自己的心跳，偷偷拼出一个不存在的王国。公主只是一道尚未完成的红色轮廓。

### 英文提示词

```text
a counterfeit moonlit kingdom assembled from torn map fragments, stitched quest parchment and broken heraldic shapes across a wide horizontal frame, an enormous incomplete crescent moon made of cream paper pieces joined by visible wine-red thread dominates the center, five empty monster-heart medallions orbit it like a ritual clock, miniature crooked castle arches and thorn forests folded out from the scraps, one open working area on the left third reserved for a kneeling character, one empty adult-woman-shaped cut-paper recess on the right third reserved for a later silhouette, wide circular tarot-panel composition, charcoal black dark teal bone-white aged gold burnt orange and wine red, pure flat 2D cel illustration, gothic European fairy-tale editorial art, bold ink line, halftone and printed paper grain, cut-paper construction, tender obsessive and uncanny, no literal gore
--ar 16:9 --v 8.2 --raw --s 260 --chaos 4 --sref https://cdn.midjourney.com/134852ff-301c-4d90-be02-5ea5c6318388/0_1.png --sw 260 --no text letters numbers logo watermark people humans characters faces blood photorealism 3d depth-of-field
```

### 验收标准

- 月亮是破地图“缝”出来的，不是普通夜空月亮。
- 五个图腾清晰可数，但内部不要生成复杂人脸。
- 左侧留给骑士，中央放月亮，右侧留给 Princess Echo 剪影，形成清楚的横向阅读顺序。
- 命名为 `E02_破地图月影王国.png`。

---

## E03 — 删除前的黑白棋盘终端

### 对应剧情

世界退回成没有贴图的测试空间。骑士站在未完成游戏的末端，屏幕外的第 348 个玩家正准备按下删除。

### 英文提示词

```text
the terminal chamber of an unfinished fairy-tale game moments before deletion, a wide black-and-bone-white chessboard floor breaking sideways into flat rectangular asset tiles, a sealed door-shaped void at the center-right, one enormous abstract cursor silhouette suspended over the center like a guillotine but containing no icon and no text, incomplete circular loading rings, crossed-out empty portrait frames and fragmented red selection arcs spreading from left to right, a clear solitary standing space on the center-left reserved for one character looking toward the viewer, ornate dead-vine tarot-panel border closing inward from both sides, charcoal black bone-white dark forest green tarnished gold and controlled wine red, pure flat 2D cel illustration, European gothic dark fairy tale, graphic editorial motion-design frame, bold ink contour, paper grain, hard color inversion, severe horizontal balance, intimate dread rather than action
--ar 16:9 --v 8.2 --raw --s 260 --chaos 4 --sref https://cdn.midjourney.com/134852ff-301c-4d90-be02-5ea5c6318388/0_1.png --sw 260 --no text letters numbers words logo watermark people humans characters faces gore photorealism 3d depth-of-field
```

### 验收标准

- 画面下中部必须能放下一名全身骑士。
- 删除威胁通过光标、门、棋盘和收缩圆环表达，不出现可读 `DELETE`。
- 左侧孤独、右侧压迫，中央保留光标与骑士直视镜头的视觉通道。
- 命名为 `E03_删除前棋盘终端.png`。

---

## 七、后续由 Codex 合成的 3 张 H3 正式起始帧

> 本节是后续人物合成简报，不是 Midjourney 提示词。用户只需交付三张空景；人物合成由 Codex 完成。

| 编号 | 合成输入 | 骑士位置与姿态 | Princess Echo | H3 动作出口 |
| --- | --- | --- | --- | --- |
| K01 | E01＋R02＋R01 | 左侧三分之一空槽内坐着，低头，手靠近旧剑；安静而非战斗姿势 | 不出现或仅保留极淡酒红轮廓 | 抬头、握剑一次、选择框跳过、档案框闭合 |
| K02 | E02＋R02＋R01 | 左侧跪姿，以酒红线缝合破地图；大剑完整放在身旁 | 月亮右侧的成年红发纸偶轮廓，不出现实体儿童 | 红线穿图、五个图腾依次跳动、影子短暂重合 |
| K03 | E03＋R02＋R01 | 中心偏左站立，不做英雄姿势；抬头直视镜头 | 骑士身后略微脱离的暗红纸片影子 | 棋盘熄灭、英雄框翻面、光标下降后悬停、轻微呼吸 |

### 合成锁定规则

- 骑士必须与 `references/characters/骑士_角色参考图_01.png` 保持同一身份。
- 保留金发、年轻成年男性、红披风、棕色板甲、黑色内衬、背后大剑和原始身体比例。
- 只改变姿势、表情和画面位置，不重新设计服装与武器。
- 人物线条、色块、纸张颗粒和阴影方式向 R01 靠拢，但不能让风格覆盖身份特征。
- 每帧恰好一个骑士；Princess Echo 只能是纸偶轮廓、倒影或影子。
- 输出尺寸与对应空景一致，统一 16:9，不裁掉骑士的剑、手或脚。

### 输出文件

- `K01_S01_废弃素材中醒来_start.png`
- `K02_S02_缝合月影王国_start.png`
- `K03_S03_删除悬停直视_start.png`

## 八、可选的 Codex 合成补图

- `F01_Princess_Echo_形态表.png`：只有 K02/K03 的影子形态不统一时才制作。
- `K04_最终眼神覆盖帧.png`：只有 H3 结尾无法稳定停住时才制作，用作 1–2 秒剪辑覆盖。

这两张同样不需要用户在 Midjourney 中生成。

---

## 九、成片与 H3 的对应关系

| H3 任务 | Picture 1 | Picture 2 | Picture 3 | Reference Audio 1 | 成片取用 |
| --- | --- | --- | --- | --- | --- |
| S01 | K01 | R02 现有骑士图 | R01 | `S01_00-15s.wav` | 00:00–00:15 |
| S02 | K02 | R02 现有骑士图 | R01 | `S02_15-30s.wav` | 00:15–00:30 |
| S03 | K03 | R02 现有骑士图 | R01 | `S03_30-41.92s_padded15s.wav` | 00:30–00:41.920 |

最终剪辑删除 H3 生成音轨，重新铺回完整的 `Before_You_Delete_Me_Suno_选定版_V0.1.mp3`。S03 参考音频末尾补的 3.080 秒静音不进入成片。

---

## 十、你交图时的文件要求

### 你只需要放入

`references/midjourney/source/`

- `E01_废弃素材档案馆.png`
- `E02_破地图月影王国.png`
- `E03_删除前棋盘终端.png`

### Codex 后续输出到

`keyframes/composited_candidates/`

- `K01_S01_废弃素材中醒来_start.png`
- `K02_S02_缝合月影王国_start.png`
- `K03_S03_删除悬停直视_start.png`

### 下载要求

- 下载 Midjourney 的原始单张大图，不要使用四宫格截图。
- 保留 PNG 或最高质量 JPG；不要二次压缩。
- 每个编号最多先保留 2 个候选，避免后续选择失控。
- 不要自行添加文字、边框标题、348 或 DELETE；这些由后期统一制作。

---

## 十一、最省成本的实际执行顺序

1. R01 的 Style Reference 链接已经填写。
2. 你在 Midjourney 中只跑 E01、E02、E03，每个场景先生成一轮，不上传 R02，不生成人物。
3. 把 3 张空景原图交给我做构图与二维风格检查。
4. 我使用选定空景、R02 骑士图和 R01 风格图合成 K01、K02、K03。
5. 你从合成候选中确认 3 张正式关键帧。
6. 关键帧确认后再进入 MiniMax H3，不提前提交付费视频任务。

---

## 十二、当前完成状态（2026-08-23）

### 已选定的 Midjourney 空景

- `references/midjourney/selected/E01_废弃素材档案馆.png`
- `references/midjourney/selected/E02_破地图月影王国.png`
- `references/midjourney/selected/E03_删除前棋盘终端.png`

### 已完成的 Codex 人物合成候选

- `keyframes/composited_candidates/K01_S01_废弃素材中醒来_start.png`
- `keyframes/composited_candidates/K02_S02_缝合月影王国_start.png`
- `keyframes/composited_candidates/K03_S03_删除悬停直视_start.png`
- `keyframes/composited_candidates/K03_S03_删除悬停直视_start_V02.png`（推荐新版：缩小骑士、修正站姿与接触影、Princess Echo 改为地面纸影）

K03 空景中原有的错误小人物已在合成时移除。V01 保留作对照，V02 为当前推荐候选。尚未进入 H3 付费生成。

### 新版 H3 准备状态

- K01、K02 与 K03 V02 已复制到 `keyframes/selected/` 作为正式输入。
- 新版英文 REF2VA 提示词已完成：`prompts/runninghub_h3_selected_v0.1/S01.txt`、`S02.txt`、`S03.txt`。
- 三条任务均已通过 RunningHub dry-run；两个生成阶段均为 `16:9 (Widescreen)`，时长均为15秒。
- 第一批正式提交已结束：三条任务均在 RunningHub 服务器采样节点因显存不足失败，无视频输出；API用量字段未报告金额或金币消耗。没有自动重提。
- 任务号、错误与建议见 `prompts/runninghub_h3_selected_v0.1/SUBMISSION_01.md`。
- 第二批保持15秒和 Stage 1 0.4 MP，将 Stage 2 从1.5 MP降至1.0 MP，并按 S01、S02、S03 顺序逐条执行；三条任务均已成功。
- 成功任务号依次为 `2091532570893447169`、`2091536392642588674`、`2091539485614637058`，合计消耗398点。
- 三条独立成片已保存到 `outputs/runninghub_h3_selected_v0.2/S01/`、`S02/`、`S03/`，各自带有 `preview/contact_sheet.jpg` 抽帧预览。
- 已按15秒＋15秒＋11.92秒完成41.917秒三段粗剪，删除三段H3生成音轨并铺回完整选定Suno母带：`outputs/roughcuts/Before_You_Delete_Me_H3_三段粗剪_V0.1.mp4`。
- 已完成中英双语硬字幕版：`outputs/roughcuts/Before_You_Delete_Me_H3_三段粗剪_中英字幕_V0.1.mp4`；可编辑SRT与ASS位于 `subtitles/`。
- 三段结果证明15秒可以正常生成，上一轮失败更可能来自1.5 MP细化阶段的显存峰值与三任务并发。0.4 MP＋1.0 MP且逐条提交是当前已验证稳定参数。
- 成功记录与基础画面检查见 `prompts/runninghub_h3_selected_v0.1/SUBMISSION_02.md`。

---

## 十三、Midjourney 规则依据

- 当前默认模型为 V8.2；Style Reference 与 Image Prompt 可用。
- `--sref` 用于借用图像的整体视觉语言，`--sw` 控制风格参考强度。

官方说明：

- [Midjourney Version](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version)
- [Style Reference](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference)
- [Image Prompts](https://docs.midjourney.com/hc/en-us/articles/32040250122381-Image-Prompts)
