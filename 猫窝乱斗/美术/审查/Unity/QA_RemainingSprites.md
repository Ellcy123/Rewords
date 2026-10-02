# Unity Player Sprite 显示审查

日期：2026-09-27。审查对象为 /tmp/catgame-formal-art-qa-round3/CatDemo.app 的 macOS Unity Player。窗口截图为 540×971（含标题栏），游戏客户区约 540×942。未修改业务源码。

## 结果

| 项目 | 判定 | 观察与问题 ID |
|---|---|---|
| 倒走闹钟主体 Sprite | **PASS** | 双铃、钟体和腿在敌人栏内完整出现，没有硬裁切。见 clock-frame-a.png。 |
| 倒走闹钟动态双针 | **PASS** | 间隔 0.25 秒的 C/D 帧中可分别辨认两针：长针约从 12 点转向 11 点，短针约从 7 点转向 6 点，均为逆时针。见 clock-fast-c-dial-zoom.png、clock-fast-d-dial-zoom.png。较早的 A/B 帧相隔约 1.2 秒，B 帧两针一度接近重叠成粗线；这是 28×28 px 表盘的阶段性辨识风险，记为 **CQA-CLK-OVERLAP**，不影响 C/D 帧验证到的运动方向。 |
| 衣柜长影 enemy_wardrobe | **FAIL** | 敌人栏实际缩略显示约 50×60 px，主要读成细黑紫色肢体线条，衣柜来源与长影主体不清。属于 Sprite 缩略可读性失败，记录 **CQA-WARDROBE-READABILITY**；这是该资产 Unity 显示审查第 1 次 FAIL。见 wardrobe.png。 |
| 面条 pose0 | **PASS** | 横向三格伸展图完整显示，整猫图只显示一次，没有按格重复或硬裁切。见 board6.png。 |
| 面条 pose1 | **PASS** | L 形卷曲图完整显示，姿势可辨，没有硬裁切或重复铺图。见 board6.png。 |
| 锤锤 pose0 | **PASS** | 横向四格伸展图完整显示，没有硬裁切或重复铺图。见 board6.png。 |
| 锤锤 pose1 | **PASS** | 2×2 卷曲图完整显示，姿势可区分，没有硬裁切或重复铺图。见 board6.png。 |
| 枕头 pose0 | **PASS** | 双格横向图完整，能与锤锤区分。见 board6.png。 |
| 羽毛逗猫棒 | **PASS** | 双格用品完整且可辨。见 board6.png。 |
| 哑铃铛 | **PASS** | 单格图标完整且可辨。见 board6.png。 |
| 发条鼠 | **PASS** | 双格玩具图完整且可辨。见 board6.png。 |
| 小鱼干 | **PASS** | 单格图标完整且可辨。见 board6.png。 |
| 旧软垫 | **PASS** | 双格长软垫完整且可辨。见 board6.png。 |
| 歪头夜灯 | **PASS** | 单格灯具完整且可辨。见 board6.png。 |
| 6×6 两组摆放 | **PASS** | A 组：面条 pose0、羽毛、发条鼠、哑铃铛、歪头夜灯。B 组：面条 pose1、锤锤 pose0/pose1、枕头、小鱼干、旧软垫。两组均通过策划形状占格检查，无重叠、越界；各 Sprite 轮廓仍能辨认。见 board6.png。 |

## 截图

- 闹钟完整画面：clock-frame-a.png、clock-frame-b.png
- 闹钟较近时序：clock-fast-a.png、clock-fast-b.png、clock-fast-c.png、clock-fast-d.png
- 闹钟针局部放大：clock-fast-c-dial-zoom.png、clock-fast-d-dial-zoom.png
- 衣柜长影：wardrobe.png
- 6×6 组合及全部猫/用品：board6.png

## 临时存档恢复

测试前备份了 /Users/m4/Library/Application Support/com.CatDemo.-------------Demo/cat-run-v1.json。Player 已正常退出，原存档已恢复；SHA-256 与原值一致：102c38eea465b3d555eafd4e8395084843583e04520459956ab2da3e3e2adae8。原先没有 .bak 文件，恢复后仍没有。备份副本和 manifest 位于 original-save/。
