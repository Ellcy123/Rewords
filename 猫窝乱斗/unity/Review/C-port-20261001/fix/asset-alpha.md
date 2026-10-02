# C 移植：素材 alpha 核查（2026-10-01）

**结论：指定动画帧 PNG 都有真实透明区，没有整张不透明底色；现有文件没有证实这是素材背景缺陷。此检查只证明源文件 alpha，不代表 Unity 中的视觉效果已通过。**

逐像素解码检查 `cat_noodle_stretch`、`enemy_under_bed`、`enemy_clock` 各 6 帧（18 张 RGBA PNG）：每张约 70.1%–74.2% 像素的 alpha 为 0，四角全透明；其余可见像素最高 alpha 为 254，没有 alpha=255 像素。代表帧目视与 alpha 数据相符：透明区虽带有暗色 RGB 底值，但 alpha 为 0，正常合成时不可见。

C 原型实际引用 `assets/cat_noodle_pose0.png` 与 `assets/enemy_under_bed.png`，当前战斗截图也显示二者正确叠在房间背景上。它们分别与 Unity `Resources/Art/cat_noodle_pose0.png`、`Resources/Art/enemy_under_bed.png` 完全同字节（SHA-256 前 12 位分别为 `6c40aac1f0d2`、`6942d8fa073f`）。Unity 另有 `enemy_under_bed_display.png`（不同尺寸/裁切，仍有约 68.2% alpha=0）及 `enemy_clock.png`（约 68.1% alpha=0）；C 原型并未引用钟怪图。

**最低风险建议：**保留原图，不批量擦底或重导出。若 Unity 内仍出现矩形/暗底，先针对实际出问题的单张图核对 Texture Import 的 alpha 读取及显示组件材质/着色器与颜色透明度；用纯色底复核后再判断是否需要动素材。不要把本报告当作 Unity 渲染或视觉验收通过。
