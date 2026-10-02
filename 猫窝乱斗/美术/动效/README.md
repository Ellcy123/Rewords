# 首批动作与特效产出索引

更新：2026-09-29。当前是 **Codex 直接出分帧图的首稿候选**；正式静态资产未被覆盖。15 组（含既有爪痕）已接入 Unity 帧播放器并通过程序测试，素材画面仍待实机审查。现有已认可猫爪命中仍见 [原试稿](../特效探索/2026-09-28_猫爪命中/README.md)。

[制作规划](00_首批动作与特效规划_V0.1.md) · [Unity 接入说明](01_Unity接入说明.md) · [首稿质检与接入状态](QA_首批首稿.md) · [图集来源清单](source_manifest.json) · [统一切帧脚本](build_previews.py)

## 角色与梦魇

| 资产 | 待机 | 普攻 | 提示词／原图 |
| --- | --- | --- | --- |
| cat_noodle_stretch | [GIF](01_角色/面条/伸展/待机与普攻/preview_idle.gif) | [GIF](01_角色/面条/伸展/待机与普攻/preview_attack.gif) | [记录](01_角色/面条/伸展/待机与普攻/README.md) |
| cat_noodle_curl | [GIF](01_角色/面条/蜷曲/待机与普攻/preview_idle.gif) | [GIF](01_角色/面条/蜷曲/待机与普攻/preview_attack.gif) | [记录](01_角色/面条/蜷曲/待机与普攻/README.md) |
| cat_hammer_stretch | [GIF](01_角色/锤锤/伸展/待机与普攻/preview_idle.gif) | [GIF](01_角色/锤锤/伸展/待机与普攻/preview_attack.gif) | [记录](01_角色/锤锤/伸展/待机与普攻/README.md) |
| cat_hammer_curl | [GIF](01_角色/锤锤/蜷曲/待机与普攻/preview_idle.gif) | [GIF](01_角色/锤锤/蜷曲/待机与普攻/preview_attack.gif) | [记录](01_角色/锤锤/蜷曲/待机与普攻/README.md) |
| cat_pillow_flat | [GIF](01_角色/枕头/扁卧/待机与普攻/preview_idle.gif) | [GIF](01_角色/枕头/扁卧/待机与普攻/preview_attack.gif) | [记录](01_角色/枕头/扁卧/待机与普攻/README.md) |
| enemy_under_bed | [GIF](02_梦魇/床底的手/待机与攻击/preview_idle.gif) | [GIF](02_梦魇/床底的手/待机与攻击/preview_attack.gif) | [记录](02_梦魇/床底的手/待机与攻击/README.md) |
| enemy_clock | [GIF](02_梦魇/倒走闹钟/待机与攻击/preview_idle.gif) | [GIF](02_梦魇/倒走闹钟/待机与攻击/preview_attack.gif) | [记录](02_梦魇/倒走闹钟/待机与攻击/README.md) |
| enemy_wardrobe | [GIF](02_梦魇/衣柜长影/待机与攻击/preview_idle.gif) | [GIF](02_梦魇/衣柜长影/待机与攻击/preview_attack.gif) | [记录](02_梦魇/衣柜长影/待机与攻击/README.md) |

## 技能与特效

| 资产 | 预览 | 提示词／原图 |
| --- | --- | --- |
| noodle_combo | [GIF](01_角色/面条/伸展/连抓技能/preview.gif) | [记录](01_角色/面条/伸展/连抓技能/README.md) |
| hammer_heavy | [GIF](01_角色/锤锤/伸展/重爪技能/preview.gif) | [记录](01_角色/锤锤/伸展/重爪技能/README.md) |
| pillow_shield | [GIF](01_角色/枕头/扁卧/呼噜技能/preview.gif) | [记录](01_角色/枕头/扁卧/呼噜技能/README.md) |
| heavy_impact | [GIF](03_特效/重爪/preview.gif) | [记录](03_特效/重爪/README.md) |
| shield_bloom | [GIF](03_特效/护盾/preview.gif) | [记录](03_特效/护盾/README.md) |
| mouse_followup | [GIF](03_特效/鼠影追击/preview.gif) | [记录](03_特效/鼠影追击/README.md) |

## 首稿审看注意

- 这是生成为主的 3×2 六帧首稿，很多待机的前三帧变化很小；是否有足够动感应看 GIF，而非只看图集。
- 所有原图和等格切帧都保留；GIF 的平色底只用于显示透明素材。尚未按 Unity 实际占格、屏幕尺寸和事件节奏审查。
- 锤锤伸展重爪技能 V1 竖起越格，已生成贴地平推的 V2 并保留 V1 拒收原图；V2 的占格仍待 Unity 审查。
- 重爪、护盾独立特效已重做为不含角色的 V2；V1 拒收版留存于对应目录。
- 衣柜长影攻击贴边的 V1/V2 已保留作对照；当前 V3 第 5 帧右边距约 51px，尚低于提示词安全区。
- 可见出界与形体漂移仍需逐组审查；Unity 使用自定义换帧播放器，已完成程序接入，但尚无实际手机尺寸下的动态占格、美术观感验收，不能当成可直接上线的动画包。
- 第4关敌人外观未定，因此没有生成其动作。梦魇受击／消散及 UI/用品程序反馈尚未接入。
