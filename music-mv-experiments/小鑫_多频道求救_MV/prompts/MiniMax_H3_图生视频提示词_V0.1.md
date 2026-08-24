# MiniMax H3 图生视频提示词 V0.1

> 后续正式提交以 `../../MINIMAX_H3_视频提示词教程_中文版.md` 为结构依据。本文现有的单句动作提示只作为动作意图草稿；提交前必须改写为教程规定的完整 H3 格式。

## 总体参数

- 画幅：16:9
- 帧率：24 fps
- H3 时长：按镜头目标使用 4–8 秒，始终不超过 15 秒
- 若界面/API 只有 6/10 秒：S02、S06 选 10 秒，其余选 6 秒，后期裁切
- 有首尾帧的镜头：S02、S08、S12、S13
- 精确控制时关闭自动提示词优化；如平台必须开启，先只测试 S02/S10/S13
- 模型生成音轨不进入成片，最终统一替换为原始歌曲

## 小鑫人物参考图（提交时必传）

- 所有出现小鑫的镜头，包括新增的 P01、P02、P03 唱跳镜头，提交 MiniMax 时都必须额外传入：`references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png`。
- 右侧清晰大特写是唯一面部身份参考；左侧站立三视图只用于服装、体型、绷带与装备参考。
- 不向 MiniMax 传入原始未模糊角色卡，避免模型同时参考站立小脸而造成身份漂移。
- 起始关键帧负责场景和构图，专用角色卡负责锁定小鑫身份；两者必须同时提交。

## 正式提交的结构规则

- 首帧图生视频统一使用 I2VA，并以固定图片对齐指令开头：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`
- 首尾帧镜头使用 FL2VA；首图对齐 `0.00` 秒，末图对齐生成时长，时间必须写成两位小数。
- 正文必须完整包含 `integrated_multimodal_description`、`overall_soundscape`、`non_diegetic_music` 三个英文标识字段。
- 单条生成尽量使用单镜头；`[Shot 1]` 不写时间戳，只有新增镜头才使用严格递增时间戳。
- 角色稳定 ID 固定为：小鑫 `(S1)`、获救者01 `(S2)`、获救者02 `(S3)`、获救者03 `(S4)`、获救者04 `(S5)`，跨镜头不更换。
- 运镜必须写成“类型＋幅度＋速度”的自然句子，不堆叠标签。
- 每镜按“锚定首帧 → 动作开始 → 持续变化 → 明确落点/反应”组织，避免只有泛泛的“动起来”。
- 成片使用原始歌曲，因此 `non_diegetic_music: N/A`；模型生成音轨仍不进入最终剪辑。

## 提示词原则

起始帧已经负责人物、服装、背景、光线、色彩和构图。下面的提示词只写人物动作与镜头运动，避免重复描述静态信息。方括号采用 MiniMax 官方相机命令。

## 逐镜头任务

### S01 — 6 秒，首帧图生视频

**输入：** `keyframes/S01_start.png`

**提示词：**

> His bandaged thumb presses the radio button; four green channel lights wake one after another while his reflected eye blinks once. [Push in] extremely slowly, no camera shake.

**裁切：** 取 0.000–5.584 秒；最后一灯亮后立刻切。

### S02 — 7–8 秒，首尾帧模式

**输入：** `S02_start.png` → `S02_end.png`

**提示词：**

> Xiaoxin forces the heavy lever downward as the steel gate closes behind him; his body strains naturally and a few sparks fall. [Truck right,Tracking shot] at a controlled pace.

**裁切：** 取动作最完整的 6.874 秒，结束于门完全闭合。

### S03 — 6 秒，首帧图生视频

**提示词：**

> He catches his breath, speaks softly into the shoulder radio, gives a brief reassuring smile, then his eyes reveal fatigue. [Push in] gently.

**裁切：** 保留 3.703 秒，笑意变浅时切出。

### S04 — 6 秒，首帧图生视频

**提示词：**

> The remaining channel lights turn on in sequence; he rotates the selector quickly and glances between each signal. [Static shot] with subtle vehicle vibration only.

**裁切：** 4.040 秒，四灯全亮前后各保留少量呼吸。

### S05 — 6 秒，首帧图生视频

**提示词：**

> The camera glides from the wet water containers to Xiaoxin in the mirror and finally to the distant burning building; he nods while answering. [Truck right] smoothly.

**裁切：** 4.470 秒；蓝色水桶先出现，火楼后出现。

### S06 — 7–8 秒，首帧图生视频

**提示词：**

> He snaps one quick proof photo, lowers the radio and runs hard through the puddles toward the map, then slows as his hand hovers between routes. [Tracking shot] low and close behind him.

**裁切：** 6.711 秒；不得在生成片段里切换场景。

### S07 — 6 秒，首帧图生视频

**提示词：**

> Four red route lights pulse at once; his gloved finger moves from one route to another but never commits. [Pedestal down] very slowly, maintaining a perfect overhead view.

**裁切：** 3.552 秒；手指第一次回摆时切。

### S08 — 6 秒，首尾帧模式

**提示词：**

> The five warning lights switch off one by one as the distant horde advances through the tunnel; Xiaoxin holds position beside the vehicle. [Push in] toward the tunnel, restrained movement.

**裁切：** 4.470 秒；尸潮必须保持轮廓，不露血腥细节。

### S09 — 6 秒，首帧图生视频

**提示词：**

> Xiaoxin runs toward the fork while speaking confidently into his shoulder radio; his stride begins strong and gradually loses certainty. [Tracking shot] alongside him from left to right.

**裁切：** 4.447 秒；仍保持跑动，不提前停下。

### S10 — 6 秒，首帧图生视频

**提示词：**

> He finishes his promise without moving; the camera tilts from his speaking mouth down to reveal his boots already stopped at the three-way fork. [Tilt down] slowly and precisely.

**裁切：** 4.005 秒；“嘴上”保留脸，“脚却”才露出靴子。

### S11 — 6 秒，首帧图生视频

**提示词：**

> All four radios flash urgently; he reaches toward one, freezes, withdraws his hand and looks toward another as his breathing shortens. [Pan right,Tracking shot] in a subtle half-circle with mild handheld tension.

**裁切：** 5.341 秒；不要让他大喊或摔设备。

### S12 — 6 秒，首尾帧模式

**提示词：**

> The three route lights turn red one after another while Xiaoxin remains motionless at the center; the camera rises until he looks small and isolated. [Pedestal up,Pull out] vertically and steadily.

**裁切：** 4.447 秒；倒数结束后保留约半秒静止。

### S13 — 6 秒，首尾帧模式

**提示词：**

> A blurred figure disappears from the distant edge; the abandoned radio keeps flashing, then all four green lights shut off together. [Static shot], absolutely no camera movement.

**裁切：** 5.477 秒；熄灯后画面保持 8–12 帧再切黑。

## 生成后检查

每个视频至少截取第一帧、中间帧、最后一帧并检查：

1. 小鑫脸、发型、耳饰、痣、左臂绷带是否一致
2. 无线电灯数量是否始终为四，倒计时灯是否始终为五
3. 奔跑是否从左向右，S10 前是否没有提前停住
4. 是否出现模型自带字幕、Logo、乱码标牌或无关人物
5. 首尾帧模式是否真正抵达目标结束状态
6. 镜头内部是否出现无意场景跳转、闪帧或肢体突变

不合格时只重做对应镜头，不改已通过镜头的公共视觉设定。
