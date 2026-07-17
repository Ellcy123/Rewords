# W001 视频试片生成记录

## 结果摘要

- 日期：2026-07-18
- 节点：`W001《婚礼灯架事故》`
- RunningHub 应用：`【LTX2.3-图/文双模式视频】全自动台词设计`
- WebApp ID：`2031277395491164161`
- Task ID：`2078171662003691521`
- 视频任务提交次数：1
- 第二次付费重试：未使用
- 生成模式：图生视频
- 请求时长：8 秒

## 图片生成

使用 Codex 内置图像生成工具生成一张项目关键帧，再从原始生成尺寸 `941×1672` 居中裁切为精确 9:16 的 `936×1664` PNG。

### 图片提示词

```text
Use case: photorealistic-natural
Asset type: vertical 9:16 keyframe for a mobile game short-video story
Primary request: Create the opening danger frame for W001, a modern Chinese wedding lighting-rig accident, suitable as the source image for image-to-video animation.
Scene/backdrop: An elegant modern indoor Chinese wedding stage with ivory flowers, soft warm practical lights, a wedding arch, and guests along both sides.
Subject: A young Chinese bride in an elegant white wedding dress stands at the visual center and has just looked upward in alarm. Four meters above her, a large professional black stage-lighting truss has visibly come loose and is beginning to tilt and fall. Small dust particles and a few flower petals shake loose. Guests at the sides recoil and raise their hands while leaving a clear visual corridor between the bride and the failing truss.
Style/medium: Polished cinematic photorealism with the slightly heightened visual language of a premium Chinese mobile short drama; realistic faces, skin, fabric, and metal rigging.
Composition/framing: Vertical 9:16 portrait frame, full-body bride centered in the lower-middle, truss clearly visible directly above in the upper third, strong depth and believable spatial relationship, sufficient negative space and depth for a later camera pullback. Keep hands mostly simple and naturally posed.
Lighting/mood: Warm romantic wedding lighting interrupted by immediate danger; slight handheld urgency without blur obscuring the subjects.
Constraints: The accident must be obvious at first glance. Rigging geometry must be believable and animatable. Preserve clear visibility of bride, truss, and guests. Non-graphic danger only.
Avoid: impact, injury, blood, wounds, fallen body, horror, malformed hands, distorted face, duplicated people, impossible truss geometry, text, subtitles, app interface, logos, brands, watermark.
```

### 付费调用前检查

- 新娘面部、手部和婚纱可用：通过
- 灯架位于新娘上方且空间关系清楚：通过
- 灯架结构可继续动画：通过
- 无文字、平台 UI、品牌和水印：通过
- 无伤口、血液或直接撞击：通过

## RunningHub 视频生成

### 节点参数

```text
node 3 / image: 上传后的关键帧 fileName
node 65 / text: 下方视频提示词
node 83 / value: 8
node 219 / value: false
```

### 视频提示词

```text
Continue naturally from this exact wedding frame. The loosened overhead lighting truss tilts farther and starts falling. The bride looks up in alarm and instinctively steps backward while guests at both sides recoil and scatter. The camera rapidly but smoothly pulls backward, keeping the bride and the falling truss clearly visible. Flower petals and light dust shake loose, warm wedding lights flicker, fabric and hair move with believable physics. Build immediate danger in the first second and end on a strong white flash before any impact. Preserve the same bride, dress, faces, venue, lighting and truss structure. Realistic polished Chinese mobile short-drama cinematography, coherent motion, no cuts, no injury, no blood, no body impact, no text, no subtitles, no logo, no watermark.
```

### 原始结果

- 容器：QuickTime/MP4 兼容媒体
- 视频：H.264 High，`832×1536`，24fps，`yuv420p`
- 音频：AAC LC，48kHz，双声道，128kbps
- 时长：8.041667 秒
- 文件大小：9,432,216 bytes

抽帧检查显示灯架持续倾斜和坠落，宾客与新娘明显躲避，结尾为白闪。人物在快速运动阶段存在正常运动模糊，但没有持续身份漂移或影响理解的结构崩坏，因此不使用第二次付费重试。

## 本地包装

基础 Homebrew `ffmpeg` 不包含 `libass`，因此改用官方 keg-only `ffmpeg-full 8.1.2_1` 完成 ASS 中文字幕烧录。未修改原始视频。

字幕节奏：

```text
0.00–2.20 秒：婚礼开始第 7 秒，新娘死亡
2.20–5.00 秒：婚礼未完成
5.00–8.00 秒：这么高，谁够得到？
```

包装命令：

```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i W001_ltx_raw_v1.mp4 \
  -vf "subtitles=W001_captions.ass:fontsdir=/System/Library/Fonts" \
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart \
  W001_game_cut_v1.mp4
```

### 最终文件

- 视频：H.264 High，`832×1536`，24fps，`yuv420p`
- 音频：AAC LC，48kHz，双声道，160kbps
- 时长：8.041667 秒
- 文件大小：8,146,527 bytes
- 浏览器优化：`faststart` 已启用

## 验收结果

- 竖屏播放无黑边：通过
- 第一秒能看出灯架事故：通过
- 五秒内明确新娘死亡、婚礼终止：通过
- 灯架、新娘和主要宾客没有持续严重变形：通过
- 存在真实主体运动，不是单纯缩放：通过
- 不出现血腥、乱码、平台水印或第三方品牌：通过
- 静音时字幕能解释核心事件和高处线索：通过
- 最终 MP4 为常见浏览器支持的 H.264/AAC：通过
- API Key 未写入素材、记录或提交：通过
