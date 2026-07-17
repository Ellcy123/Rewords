# W101 RunningHub 生成记录

## 结果

- 剧情节点：`W101《有梯子，但不会修》`
- RunningHub WebApp ID：`2031277395491164161`
- RunningHub 任务 ID：`2078181992230506497`
- 提交次数：1
- 实际消耗：72 点
- 任务运行时间：359 秒
- 输出节点：`52`
- 输出类型：`mp4`
- 视频规格：8.041667 秒，832×1536，24 fps，H.264 / AAC，yuv420p
- 关键帧规格：936×1664 PNG，严格 9:16

## 关键帧编辑提示词

```text
Precise object edit of the supplied W001 wedding keyframe. Preserve the same bride identity, white wedding dress, warm ivory wedding venue, lighting, black overhead truss, vertical composition, and photoreal polished Chinese mobile short-drama style. Add one complete, structurally plausible silver extension ladder at left-center, visible continuously from both rubber feet on the floor to its upper contact point near the truss. Add one young Chinese groomsman in a pale gray rolled-sleeve shirt, dark trousers, and black shoes standing safely near the top; one hand secures him on the ladder and the other reaches toward the wrong small truss fastener. A separate true safety latch beside his hand has just begun to open. Keep the bride below and slightly right, looking up with concern, and let nearby guests notice the danger. Make the ladder, groomsman's repairing hand, wrong fastener, separate latch, bride, and overhead truss spatially clear. No text, subtitles, logos, watermark, UI, blood, injury, direct body impact, duplicate bride, impossible ladder geometry, extra limbs, or malformed hands.
```

## 视频生成提示词

```text
Continue naturally from this exact wedding frame. The groomsman stands on the same silver extension ladder and confidently twists the wrong small truss fastener with one hand. A separate true safety latch beside his hand suddenly snaps open, making the heavy overhead lighting truss tilt and drop. He freezes, grips the ladder and looks down in panic. The bride below looks up and steps backward while nearby guests recoil and scatter. Keep the ladder fully visible and structurally stable throughout the shot. Rapid but smooth camera pullback, believable metal, fabric, hair and body physics, immediate action in the first second, strong white flash before any impact. Preserve the same bride, groomsman, ladder, venue, lighting and truss. Polished realistic Chinese mobile short-drama cinematography. No injury, no blood, no body impact, no text, no subtitles, no logo, no watermark.
```

## 验收

- 梯子从地面到灯架完整可见，主要动作段没有消失。
- 伴郎始终位于梯子上，并保持伸手操作灯架的动作。
- 新娘与宾客明显后退、躲避，画面具有真实运动而非静态推拉。
- 灯架保持危险倾斜，并以强白闪在撞击前结束。
- 无血腥、直接撞击、字幕、乱码、品牌或水印。
- 视频可完整解码，音视频流和画幅符合要求。
- 第一单已满足叙事与连续性要求，因此没有提交第二次付费任务。

游戏字幕未烧录进视频，时间轴单独保存在 `W101_captions.json`，供游戏代码按 `currentTime` 读取。
