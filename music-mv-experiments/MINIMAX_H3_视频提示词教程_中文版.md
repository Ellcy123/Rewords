# 🔥 保姆级教程｜MINIMAX H3 视频提示词全中文版

**4 种任务核心用法 + 注意事项一次讲透**

*—— 一篇就能上手的 AI 视频提示词体系化教程 ——*

## 📌 开场：为什么 H3 提示词值得你花时间学？

姐妹们！最近在研究 AI 视频生成,发现 MINIMAX H3 这套提示词体系是真的强。它不是让你「随便写两句描述」,而是有一套严格的结构 + 时间轴 + 字段模板,写出来的 prompt 效果和随便描述完全是两码事。

今天我把官方文档翻烂了,把这套体系整理成一篇就能看懂的中文教程。看完你也能写出电影级的视频提示词!

> 💡 核心心法:写 H3 提示词不是创作,是工程。结构对了,效果才稳;结构错了,再好的创意也是开盲盒。

## 一、先搞懂:H3 把视频任务分成 4 种

这是写 prompt 之前最关键的一步——你得先确认你做的是哪种任务,不同任务的开头指令完全不一样!

| 类型 | 英文 | 核心逻辑 | 适用场景 |
| --- | --- | --- | --- |
| 纯文生视频 | T2VA | 只用文字生成完整视频 | 脑子里有画面,没有参考图 |
| 首帧锚定 | I2VA | 给你一张图,让视频「从这张图开始往后发展」 | 有想保留的角色/构图 |
| 首末帧双锚 | FL2VA | 给首图+末图,让视频「在两张图之间过渡」 | 状态变化类(开伞/破碎/变形) |
| 末帧锚定 | L2VA | 只给一张图,让视频「最终落在这张图上」 | 想要一个确定的结局画面 |

一句话记忆:T=Text(纯文),I=Image(首帧),F=First-Last(首末),L=Last(末帧)

## 二、提示词的固定结构(背下来!)

所有 H3 prompt 都是两段式:第一段是「指令行」(只有带图片的任务才有),第二段是「三个核心字段」。

### 2.1 第一段:指令行(只对 I2VA / FL2VA / L2VA)

这一行是告诉模型图片对应视频的哪一时刻,严格按下面三个固定句式来:

#### I2VA 指令行(中文版)

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.
```

翻译参考:对于目标视频,在第 0.00 秒处,完全参考 [镜头 1] 中的 Picture 1。

#### FL2VA 指令行(中文版)

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.
```

翻译参考:参考图与目标视频的对齐方式——Picture 1(来自镜头 1)对齐目标视频 0.00 秒;Picture 2(来自镜头 N)对齐 S.SS 秒。

#### L2VA 指令行(中文版)

```text
How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.
```

翻译参考:参考图与目标视频的对齐方式——Picture 1(来自镜头 N)对齐 S.SS 秒。

⚠️ 关键参数: N 是最后一个镜头的编号,S.SS 是视频时长(精确到两位小数,比如 6 秒就写 6.00)。T2VA 没有这一行,直接进入第二段!

### 2.2 第二段:三个核心字段(所有任务都有)

```text
integrated_multimodal_description: [Shot 1] ...

overall_soundscape: ...

non_diegetic_music: ...
```

| 字段 | 职责 | 典型内容 |
| --- | --- | --- |
| integrated_multimodal_description | 整个视频的「画面+动作+对白+场景内声音」主时间轴 | 镜头、运镜、角色动作、对话、音效 |
| overall_soundscape | 环境声+动作声+非语言人声(雨声、脚步声、呼吸) | 雨、风、车流、布料摩擦、笑声 |
| non_diegetic_music | 背景音乐(角色听不到、观众听得到的那种) | 乐器、速度、节奏、动态变化 |

注意:三个字段名是英文,作为模型解析标识符必须保留,主体描述用中文写。

## 三、T2VA 核心用法 + 注意事项

### ✅ 核心用法

- 没有图片锚定指令,直接进入三字段。

- Shot 1 用「风格 + 构图 + 主体」三件套起手(例:Live-action, cinematic, 中景框住……)。

- 从 Shot 2 开始,每切一次都要在镜头前写严格递增的时间戳。

- 所有视觉、动作、声音信息都要靠文字给齐——没有图片兜底。

### ⚠️ 注意事项

- 风格关键词必写,常见 7 种:Cinematic / live-action / 2D-animated / 3D CG / claymation / watercolor / vintage film。

- 如果用户没指定风格,默认用「Live-action, cinematic」最稳。

- 主体在 Shot 1 必须有清晰的视觉锚定(年龄/性别/服装/位置),不能含糊。

- T2VA 容易写飘,务必按「风格 → 主体 → 动作 → 声音」四段式走。

### 📝 中文示例

```text
integrated_multimodal_description: [Shot 1] 真人电影感,中景镜头框住一名中年面包师,他在日出前打开街角小面包店的木百叶窗。镜头以小幅度、慢速向内推近,他一边将刚出炉的面包放在木质台面上,一边用平静而略带沙哑的嗓音(S1)说道:<d>[中文] 今天的头一批面包。</d> [Shot 2] At 00:05.000, the camera cuts to a close-up of steam rising from the sliced bread while the baker's final words carry over from the previous shot.

overall_soundscape: 安静的街道上,木质百叶窗被缓缓推开,店内托盘发出轻响。门铃响了一声,接着是轻轻的脚步声和面包切片时清脆的声音。

non_diegetic_music: 柔和的原声吉他以中速铺底,点缀稀疏的低音提琴音符,在结尾处轻柔淡出。
```

## 四、I2VA 核心用法 + 注意事项

### ✅ 核心用法

- 固定指令行必须写在最前面,Picture 1 永远属于 Shot 1 的第 0 秒。

- 按「首帧锚定 → 动作起始 → 持续推进 → 结果/反应」四步走。

- 描述里要明确「角色外貌/服装/构图与 Picture 1 保持一致」,然后再接着往下讲故事。

- 用 (S1)(S2)(S3) 给角色打稳定 ID,跨镜头不变。

### ⚠️ 注意事项

- 角色外观锁死:年龄、发型、服装、关键道具,跨镜头不能漂。

- 服装、构图、空间关系不能因为运镜而错位。

- Picture 1 标注位置统一用 (from [Shot 1]),别写成别的镜头。

- I2VA 容易变成「动起来」就完事,记住要有「结果/反应」收尾,否则镜头没落点。

### 📝 中文示例

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] 真人电影感,中景镜头,<Picture 1> 中的年轻女子依旧坐在雨天的车窗旁,保持原有的外貌、服装、座位位置和车厢布局。镜头以小幅度、慢速向右横移,她将视线从手中的折叠信件抬起,望向窗外掠过的城市灯光。她的倒影在玻璃上缓缓滑过,这位嗓音安静、带气声的年轻女子(S1)说道:<d>[中文] 我下一站就下。</d> 她沿着原本的折痕,将信纸重新折好。

overall_soundscape: 列车轮子在低沉的空调嗡鸣下,发出持续的金属节奏。雨滴敲打车窗,她手中的纸张发出轻柔的摩擦声。

non_diegetic_music: 大提琴以慢速拉出绵长的音符,点缀间隔较宽的钢琴单音,音量逐渐减弱。
```

## 五、FL2VA 核心用法 + 注意事项

### ✅ 核心用法

- 首末双锚固定指令行:首图对齐 0.00 秒,末图对齐 S.SS 秒。

- 推荐单镜头(Single Shot)结构,让模型在两张图之间连续插值。

- 主体描述聚焦「运动路径」:姿态变化、物体操控、构图演进、光影过渡。

- 按「首帧状态 → 中间可观察变化 → 差异逐步收窄 → 末帧状态」四步写。

### ⚠️ 注意事项

- 别只重复两张静态图!要写出连接它们的「运动过程」。

- 末帧必须由最终镜头 [Shot N] 落到,不能在中间就到位。

- 只有当用户明确要切镜头时才用多镜头,否则一律单镜头。

- 时间格式 S.SS 严格两位小数,例:8 秒写 8.00,不是 8s 也不是 8.0。

### 📝 中文示例

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the 8.00-second mark of the target video.

integrated_multimodal_description: [Shot 1] 真人电影感,一位被雨水淋湿的骑行者以 Picture 1 所确立的位置和构图开场,手中收拢一把黑色雨伞,身旁是一辆银色自行车。镜头以小幅度、慢速向后拉远,她松开自行车把手,将雨伞举过肩部,向上推动伞柄滑块,直到伞面完全撑开。水珠从正在展开的伞面滚落,她顺势走到伞下,转动伞柄调整到最终角度,最后在镜尾完全落定到 Picture 2 所确立的姿态、间距和构图。

overall_soundscape: 雨水持续打在地面上,接着是伞柄滑块清脆的金属咔哒声,以及伞面撑开时轻柔的啪声。远处有车流驶过的声音,水珠从自行车车架滴落。

non_diegetic_music: N/A
```

## 六、L2VA 核心用法 + 注意事项

### ✅ 核心用法

- 指令行里 Picture 1 属于 [Shot N](最后一个镜头),不是 Shot 1。

- 从末帧「倒推」一个合理的前置状态,作为镜头起点。

- 按「合理前置状态 → 显式动作与过渡路径 → 末镜头渐进收敛 → 末帧落点」四步走。

- 末镜头要明确写出「在 X 处、姿态 Y、构图 Z 与 Picture 1 一致」的落点句。

### ⚠️ 注意事项

- 千万别把末帧当成 Shot 1!它是 [Shot N] 才落上去的画面。

- 前置状态必须合理——不能一上来就出现末帧的元素再「还原」,这是反向坑。

- 前置状态与末帧的「差异」要在镜头里清晰可见,否则看不出「过程」。

- 「落点句」要明确包含姿态、构图、光线、最终位置四个维度的对齐。

### 📝 中文示例

```text
How the reference pictures align with the target video — <Picture 1> (from [Shot 1]) aligns with the 6.00-second mark of the target video.

integrated_multimodal_description: [Shot 1] 真人电影感,近景镜头开场时,一个完整的玻璃杯放在深色木桌边缘,与 <Picture 1> 中可见的同一只手臂和袖口从画面右侧伸入。镜头以小幅度、慢速向内推近,指尖轻敲杯沿。玻璃杯倾倒、坠落,撞地发出清脆的响声,裂纹在杯身扩散,碎片向四周滑出。镜头末尾,运动中的碎片逐渐失去动量,完全静止于 <Picture 1> 所确立的精确破碎布局、手部位置、镜头角度、光线和最终构图中。

overall_soundscape: 指尖轻敲杯沿,接着是玻璃在桌面上刮擦、坠落,并以清脆的碎裂声砸到地面。细小的碎片四散滑出,逐渐停止滚动。

non_diegetic_music: 低频电子脉冲以慢速铺底,在玻璃杯碎裂的瞬间戛然而止。
```

## 七、三个核心字段的写作要点

### 7.1 镜头与剪辑

- Shot 1 不写时间戳,从 Shot 2 开始写 At 00:SS.SSS,严格递增。

- 切镜动词库:cuts to / transitions to / changes to / switches to。

- 切镜头必须带来新信息(新主体/新空间/新视角/新时间),否则改用运镜。

- 跨切对白用 `<scenetrans>` 标记,对白被截断用 `<cutoff>`。

### 7.2 运镜 = 类型 + 幅度 + 速度

完整的运镜描述有三个维度,但默认幅度和速度可以省略(中等幅度+正常速度时)。

| 维度 | 表达 | 含义 |
| --- | --- | --- |
| 类型 | Zoom In / Zoom Out | 焦距变化,机位不动 |
| 类型 | Push In / Pull Out | 机位前后移动 |
| 类型 | Pan Left / Pan Right | 原地水平转动 |
| 类型 | Truck Left / Truck Right | 水平平移 |
| 类型 | Tilt Up / Tilt Down | 原地垂直转动 |
| 类型 | Arc Shot | 弧线绕主体 |
| 类型 | Tracking Shot | 跟随移动主体 |
| 类型 | Static Shot | 完全静止 |
| 类型 | Shake Slightly / Strongly | 轻微/强烈抖动 |
| 类型 | POV | 主观视角 |
| 幅度 | with small / large amplitude | 变化范围小/大 |
| 速度 | at slow / fast speed | 速度慢/快 |

写法示例——写进自然句子里,不要堆标签:

✅ **正确:** 镜头以小幅度、慢速向内推近,聚焦在她手中的折叠信件上。

❌ **错误:** 推近,小,慢,聚焦信件。(这是堆标签,没有动作感)

### 7.3 角色与对白

- 用稳定 ID:(S1) (S2) (S3) 跨镜头不变。多人一起说用复合 ID (S1,S2)。

- 第一次出场要给够身份信息:年龄、性别、声线、说话速度。

- 对白格式:`<d>[语言] 原文</d>`,原文一字不改,不翻译。

- 旁白固定写法:says in an off-screen voiceover,后面必须接「嘴唇紧闭」。

- 对白跨切:用 `<scenetrans>` 标记,接续说明音频延续(continues seamlessly across the cut)。

- 对白被截断:用 `<cutoff>`。

- 不开口的角色不需要 ID,别乱打标签。

### 7.4 屏幕文字

任何实际出现在屏幕上的字(招牌、字幕、霓虹灯、标签),用英文双引号包起来,原文照抄:

```text
一家红色霓虹灯招牌写着"营业中",在门廊上方亮起。
```

### 7.5 overall_soundscape(声音景观)

- 1-4 句中文,一段写完,覆盖环境声、动作声、非语言人声。

- 不要重复主时间轴里已经写过的对白和音乐。

- 完全静音才写 N/A。

```text
overall_soundscape: 雨水持续打在咖啡馆玻璃窗上,店内低沉的氛围声延续。门铃响了一声,接着是湿漉漉的脚步声,以及椅子被轻轻拉开的摩擦声。
```

### 7.6 non_diegetic_music(非叙事音乐)

- 1-3 句中文,只写乐器、速度、节奏、动态变化。

- 禁用抽象情绪词(不要写「悲伤的」「治愈的」那种)。

- 角色听得到的音乐(收音机、电视、手机外放)属于场景内声音,写到 multimodal_description 里。

```text
non_diegetic_music: 稀疏的钢琴音符以慢速铺底,加入持续的低音弦乐,音量在结尾前缓缓增强,最后轻柔淡出。
```

## 八、避坑指南(我自己踩过的雷)

① **Shot 1写了时间戳**→ 报错或乱跳。记住 Shot 1 不带时间戳。

② **运镜当标签堆**→ 写进自然句子里才有效,别罗列关键词。

③ **FL2VA乱切多镜头**→ 优先单镜头,除非你明确要切,否则别乱切。

④ **音乐用「悲伤」「治愈」这种抽象词**→ 写乐器+速度+动态,别写情绪形容词。

⑤ **旁白后面没写「嘴唇紧闭」**→ 必须紧跟「while his lips remain completely closed」。

⑥ **对白里翻译了原文**→ 用户给啥就写啥,一字不改,不翻译。

⑦ **L2VA把末帧当成Shot 1**→ 末帧是 [Shot N] 才落上去的那个镜头,别写错位置。

⑧ **字段名写错**→ 三个字段名(integrated_multimodal_description / overall_soundscape / non_diegetic_music)是英文标识符,不能改。

⑨ **时间戳跳变**→ 必须严格递增,不能乱跳、不能倒退、不能超过视频时长。

⑩ **跨镜头角色ID漂移**→ 同一个角色,永远是 (S1) 就 (S1),别在不同镜头换号。

## 九、写在最后

这套 H3 体系的核心就三句话:

1. 结构先于灵感:两段式 + 三字段是骨架,不要乱。

2. 时间轴是命脉:时间戳严格递增,运镜写进句子。

3. 一致性是底线:角色 ID、服装、关键道具、空间关系,跨镜头不能漂。

掌握这套之后,你会发现生成的视频可控性直接起飞——不再有「看运气」的随机感,而是能精准控制每一秒发生什么。

> 📌 建议收藏这篇,下次写 prompt 直接对照!有问题评论区见。

💬 **你们平时写AI视频提示词最头疼的是哪部分?是运镜?对白?还是音乐?**

评论区聊聊,我挑高频问题单独出案例 🌟

— THE END —
