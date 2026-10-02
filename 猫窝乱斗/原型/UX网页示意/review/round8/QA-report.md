# Round 8 浏览器验证报告

执行时间：2026-10-01T13:44:36.482Z 至 2026-10-01T13:51:36.629Z
入口：http://127.0.0.1:8876/
环境：Playwright Chromium 驱动本机 Google Chrome；1440×1050 桌面、390×844 与 360×800 窄屏；鼠标 Pointer Events 实际拖放。

## 最终结论

44 项主流程断言通过；最终版本对提示条和图标资源做了新 context、禁用缓存的定向复测。提示条现处于主界面说明与游戏画幅之间，空状态仍在文档流预留36px；显示时不与游戏画幅相交。data SVG favicon 生效。此次定向复测无 4xx、请求失败、控制台错误或页面异常。此前记录的 toast 遮挡和 favicon 404 已消除。

## 主流程覆盖

- 主界面、猫咪与用品图鉴、签到/补给一次奖励、关闭补给不发奖、培养消费与余额不足。
- 爬楼上下滚动、锁层详情与挑战限制、第一层进入既有准备页。
- 鼠标真实拖放猫和用品、联动状态、倍速战斗、胜利后首通回楼层；首通奖励与任务奖励都不能重复领取。
- 旧准备/战斗分组独立回归；390/360 窄屏无横向溢出，弹窗位于视窗内。培养后 X 与 Esc 关闭均回焦到面条入口。

## 最终定向复测证据

- 390×844，Playwright 全新 context，CDP 禁用缓存。
- 空提示条：`visibility:hidden`，高度36px。领取补给后提示框 y=230–266；游戏画幅从 y=280 开始，二者不相交。
- SVG favicon 使用 data URI；未发起 `/favicon.ico` 请求。无4xx、requestfailed、console error、pageerror。
- 截图：[toast-after-final-390.png](toast-after-final-390.png)；机器记录：[final-layout-favicon.json](final-layout-favicon.json)。

## 代表截图

- [desktop-home.png](desktop-home.png)
- [390-home.png](390-home.png)
- [360-home.png](360-home.png)
- [390-cat-dialog.png](390-cat-dialog.png)
- [desktop-index.png](desktop-index.png)
- [desktop-tower-floor6.png](desktop-tower-floor6.png)
- [360-tower-locked.png](360-tower-locked.png)
- [desktop-prep-placed.png](desktop-prep-placed.png)
- [desktop-battle-speed2.png](desktop-battle-speed2.png)
- [desktop-victory.png](desktop-victory.png)
- [desktop-task-claimed.png](desktop-task-claimed.png)
- [desktop-old-group-victory.png](desktop-old-group-victory.png)
- [toast-after-final-390.png](toast-after-final-390.png)

完整断言及运行记录见 [report.json](report.json)。
