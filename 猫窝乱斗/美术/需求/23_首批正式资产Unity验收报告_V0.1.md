# 首批正式资产 Unity 验收报告 V0.1

日期：2026-09-28。状态：本批验收通过。

## 自动验证

- `DemoSetup.Create` 最终导入 28 个 Sprite。
- EditMode：17/17 PASS。
- PlayMode：5/5 PASS；包含正式资源注册、多格猫只绘制一次和主要文字框容纳检查。
- StandaloneOSX 临时构建 PASS。
- 所有测试和实际 Player 审查均由显式 `gpt-6-luna`、`xhigh` 子代理执行。

## Sprite 实际显示

| 范围 | 结果 | 说明 |
| --- | --- | --- |
| 5 个猫姿势 | PASS | 两组 6×6 合法摆放覆盖全部姿势；整图跨格，不重复、不硬裁切 |
| 6 件用品 | PASS | 全部在棋盘与商品框中显示，轮廓可辨，无硬裁切 |
| 床底的手 | PASS（有限） | 紧裁显示版完整可辨，体量仍偏小 |
| 倒走闹钟 | PASS | 主体完整；0.25秒 C/D 帧确认两针分别逆时针，特定时刻存在短暂重叠风险 |
| 衣柜长影 | PASS | 第三次显示版扩大柜门并内收长影后，柜缝来源和长影均可读 |
| 卧室背景 | PASS | 棋盘和底部区域无家具；第五轮提示与操作纸片连续隔离床沿高细节 |

## Unity 界面重新处理结果

该接入项连续三次 Unity 显示审查失败后曾按用户规则停止重做。2026-09-28 用户明确要求 Unity 问题继续调整，因此解除冻结。

- 第四轮解决提示、操作、选择和商品区，但标题框高度不足，消息与页脚偏低，仍 FAIL。
- 第五轮将 Header 改用适合细条高度的九宫格，标题降到20px并与状态行分离，消息和页脚上移；实际 540×942 Player 审查 PASS。
- 独立 UI PNG 未重画，继续保持静态 PASS。

## 存档安全

关卡切换审查使用临时存档。每次测试均先备份、退出 Player 后恢复；最终 SHA-256 与原值一致：

`102c38eea465b3d555eafd4e8395084843583e04520459956ab2da3e3e2adae8`

原先不存在的 `.bak` 文件在验收后仍不存在。

## 项目内证据

- `美术/审查/Unity/first_stage_ui_stop_round3.png`
- `美术/审查/Unity/first_stage_ui_round5_pass.png`
- `美术/审查/Unity/board6_all_cats_items.png`
- `美术/审查/Unity/clock_hands_c.png` 与 `clock_hands_d.png`
- `美术/审查/Unity/wardrobe_v3_viewport.png` 与 `wardrobe_v3_detail.png`
