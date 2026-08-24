# MiniMax H3 创作提示词草稿 V0.2

> 本文件保存14条镜头的动作与表演内容，不是可直接交给 `runninghub-h3-ref2va-audio` Skill 的最终 prompt 文件。正式提交版还必须补齐 Picture 1/2/3、Reference Audio 1/2 的实际角色绑定。

## 固定提交规则

- Picture 1：对应任务的起始关键帧。
- 所有含小鑫任务额外上传 `references/小鑫_MiniMax专用角色卡_站立面部模糊_V0.2.png` 作为 `(S1)` 人物参考。
- P02A、P02B、P03 使用一张四位获救者合并参考板，板内人物固定为 `(S2)`–`(S5)`。
- 受3张图片上限限制，P02A、P02B、P03 实际提交时不能上传四张独立获救者卡，必须改用一张四人合并参考板作为 Picture 3。
- Picture 1 为起始关键帧；Picture 2 为小鑫专用角色卡；群舞任务 Picture 3 为四位获救者合并参考板，其他任务省略 Picture 3。
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

**Picture 1：** `keyframes/selected/S02_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，中全景保持 <Picture 1> 中小鑫(S1)的身份、黑色服装、左前臂绷带、机械拉杆和三号门位置一致。镜头以小幅度、正常速度向右跟移，他双手压住拉杆、身体重心前倾，厚重钢门持续闭合，火花从门轨落下；他在用力过程中说道:<d>[中文] 我没有丢下你们，刚刚在封三号门。</d> 门缝缩窄后，他稳住拉杆并短促呼吸，动作有明确落点。

overall_soundscape: 钢门摩擦与液压低鸣持续，拉杆金属关节咔哒作响，火花落地发出细碎爆裂声，人物呼吸略急。

non_diegetic_music: N/A
```

**成片取用：** 6.874 秒。

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

**Picture 1：** `keyframes/selected/P01_solo_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，中近景保持 <Picture 1> 中小鑫(S1)的清晰面部、黑色服装、左前臂绷带、水罐和远处火光一致。镜头以小幅度、慢速向内推近，他直视镜头按歌曲节奏清晰对嘴演唱:<d>[中文] A区缺水，C区燃烧，我说放心，一个都不会少。</d> 他抬起右手做一次克制的节拍手势，身体轻微前倾；句末手势收回胸前，眼神仍保持坚定，不转为说话或舞台微笑。

overall_soundscape: 雨滴敲击车体，水罐轻微震动，远处火焰噼啪，衣料与手套移动声清晰。

non_diegetic_music: N/A
```

**成片取用：** 4.470 秒。

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

**Picture 1：** `keyframes/selected/P02_group_start.png`；人物参考 `(S1)`–`(S5)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，五人全身广角保持 <Picture 1> 的岔路场景、小鑫(S1)前中位置和四位伴舞(S2,S3,S4,S5)的独立身份与服装一致。镜头以小幅度、慢速向内推近。五人完成一段连续而克制的现代编舞：先共同下沉重心并横向换步，四位伴舞从分散位置向中心收拢，小鑫向前半步、直视镜头对嘴演唱:<d>[中文] 我没有把你们忙丢，Hold on，马上就走。</d> 随后五人的前臂在不同高度形成同一方向的折线，句末共同定点；不跳跃，不接触，不改变人数。

overall_soundscape: 靴底在湿地形成整齐摩擦声，五人呼吸与衣料摆动可闻，工业空间滴水和远处金属回声持续。

non_diegetic_music: N/A
```

**成片取用：** 4.447 秒。

## S10 — 6.00 秒

**Picture 1：** `keyframes/selected/S10_start.png`；人物参考 `(S1)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，近景保持小鑫(S1)的脸、嘴、肩台和蓝红混合光一致。他先直视前方清晰对嘴演唱:<d>[中文] 嘴上答应每个出口。</d> 镜头随后以中等幅度、慢速向下倾斜，从嘴和肩台经过胸口、腰部落到靴子；他在镜头下移期间停止迈步，最后露出双脚停在三向岔路中心的明确落点，不提前移动路线标记。

overall_soundscape: 肩台静电、人物呼吸和衣料摩擦逐渐让位于靴底停止滑动的短促水声，地下通道低鸣持续。

non_diegetic_music: N/A
```

**成片取用：** 4.005 秒。

## P03 — 8.00 秒，四路拉扯

**Picture 1：** `keyframes/selected/P03_group_pull_start.png`；人物参考 `(S1)`–`(S5)`。

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感，五人中广景保持 <Picture 1> 的人数、独立身份、服装、四方伸手间距和岔路灯光一致。镜头以极小幅度、慢速弧形绕行。小鑫(S1)将绷带前臂收在胸前，对嘴演唱:<d>[中文] 不是不想把你们救，是我还没学会说不，当所有频道一起求救，三、二、一。</d> 四位伴舞(S2,S3,S4,S5)依次从四个方向向内伸手，但手掌始终停在他身体外侧、不发生接触；每人伸手后向各自出口拉回重心。唱到“三、二、一”时五人连续完成三次清晰定点，最后四位伴舞骤然向四方打开，小鑫独自僵在中心并停止动作。

overall_soundscape: 四组靴步从不同方向交替响起，手臂划过衣料产生短促摩擦，三次定点伴随三声整齐踏地，空间回声在最后停顿中延长。

non_diegetic_music: N/A
```

**成片取用：** 6.841 秒。

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
