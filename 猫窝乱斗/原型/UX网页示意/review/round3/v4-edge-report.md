# v4 边沿与中断复测

旧版根因按保存的旧实现代码核对：待放猫的 `grabX=1.5`；指针落在第一列中心时原始左上 x 为 `round(0.5 - 1.5) = -1`，所以无效。旧版边沿这轮未重新运行；旧代码的绿色格表示合法左上格，而不是指针可落位置。

v4 复测：

- 390 宽触摸从图片中心拖到第一列中心：ghost 合法、绿色格为 `[0,1,2]`，放入 index 0。
- 从文字区域中心拖到第四列中心：整块吸附入窝，ghost 合法、绿色格为 `[1,2,3]`，放入 index 1。
- 两次过程中有 `pointerdown`、`pointermove`、`pointerup`，没有 `pointercancel` 或 `dragstart`；松手时出现正常的 `lostpointercapture`。
- 桌面鼠标拖动中主动释放 pointer capture 后继续移动，最终仍放入 index 0。Chrome 确认 capture 已释放且后续 pointermove 目标变为棋盘；此主动释放操作没有派发 `lostpointercapture` 事件。

Playwright 的 CUA 会话无法附着用户当前 IAB tab（tab 已属于另一浏览器会话）；本轮使用本机 Chrome 和 390 宽 CDP 触摸模拟。逐事件数据见 `v4-touch-edge-report.json` 与 `v4-first-column.json`。
