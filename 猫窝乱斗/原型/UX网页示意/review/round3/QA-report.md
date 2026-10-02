# Round 3 验证

Playwright 1.62.1 + Chrome 154；桌面视口 990×1000，触摸模拟视口 390×844。

- 初始猫窝为空，面条在待放区，开战按钮禁用；格子为 `div`，点击格子不会摆放。
- 点击购买后金币 10→7，逗猫棒进入待放区。鼠标拖动面条到 index 5、逗猫棒到 index 1 后连接提示出现。
- 把玩具拖到猫占用的位置或拖到越界位置，均回到原位。玩具和猫都能拖回待放区；猫离开后开战按钮禁用。重新拖回阵容后，开战可用。
- 战斗画幅同步猫与玩具的相对位置，且其中没有格子、商店或棋盘 DOM。准备区棋盘进入 inert 状态。
- 390 宽触摸模拟中，面条可从待放区拖到 index 5；准备/战斗标签可来回切换。无 JavaScript 异常。

截图：

- `desktop-full-lineup.png`：桌面双屏与完整页面。
- `desktop-lineup.png`：桌面准备页阵容。
- `desktop-battle.png`：桌面战斗页阵容同步。
- `mobile-touch-cat-placement.png`：390 宽触摸拖放后的完整页面。

机器可读结果见 `desktop-report.json` 和 `mobile-report.json`。
