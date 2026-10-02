# 首批帧动画 Unity 接入说明

2026-09-29。首批 14 组候选图集与已认可的爪痕特效共 15 组，已通过 `export_unity.py` 输出 90 张帧图和 `catalog.json` 至 `unity/Assets/CatGame/Resources/Art/Animation/`。原图、提示词、审稿 GIF 仍留在 `美术/动效/` 和 `美术/特效探索/`，不由 Unity 工程覆盖。

导出时每组六帧共用同一个 alpha 内容裁切框，保持帧间原点一致并去掉长条猫图集上下的空白。导出的帧仍是候选美术；该裁切不能修复原图里已被截断的手、爪或特效。Unity 中 `Cat Game > Apply Formal Art` 将导出帧设为单张 Sprite、透明、无 mipmap、不压缩。

游戏当前通过 `SpriteSequencePlayer` 在 uGUI `Image` 上换帧，不依赖 Animator Controller。`catalog.json` 保存每组时序，`GameRoot` 消费 `Battle.timeline` 的事件序号：

| 事件 | 播放 |
| --- | --- |
| `attack` | 对应猫姿势的普攻；敌人前方爪痕 |
| `extra-attack` | 面条连抓；爪痕 |
| `heavy` | 锤锤重爪；独立重爪命中 |
| `shield` | 枕头呼噜；队伍护盾展开 |
| `item-shield` | 队伍护盾展开 |
| `item-followup` | 敌人前方鼠影追击 |
| `enemy-attack` | 当前梦魇攻击 |

普通状态持续播放猫与前三关梦魇待机，动作结束后回到待机。没有序列的第 4 关敌人、资源加载失败或未覆盖的用品仍使用现有静态图。暂停时帧播放暂停。猫受击、梦魇受击/退场、用品和程序 UI 的程序反馈尚未接入。

验证：Unity 6000.4.0f1 中刷新并执行正式美术导入后，15 组的 90 张 PNG 均被识别为 Sprite；Luna xhigh 在 GUI Test Runner 运行 EditMode 17/17、PlayMode 6/6 通过。新增 PlayMode 项覆盖战斗事件驱动的猫攻击帧和爪痕出现。GUI 人工点击 `StartBattle` 未能得到有效结果，尚未完成该路径的实机手动确认；测试中的 UI 指针事件流程已通过。CLI Pipeline 服务仍因本机 7800–7849 端口初始化失败而不可用，测试通过 Unity GUI 完成。素材边缘和实际手机尺寸的动态观感仍见 [质检与接入状态](QA_首批首稿.md)，不把程序接入通过当成美术验收。
