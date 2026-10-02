# 《猫窝乱斗》正式美术接入 QA：第三轮最终复核

日期：2026-09-27（本机 Unity 6000.4.0f1）

## 自动验证

- **PASS — 正式资源导入**：执行 `CatGame.Editor.DemoSetup.Create`，日志为 `Applied 27 formal art sprites.`。完整日志：`setup.log`。
- **PASS — EditMode**：17/17 通过，0 失败。NUnit：`editmode.xml`；JUnit：`editmode-junit.xml`。
- **PASS — PlayMode**：4/4 通过，0 失败。NUnit：`playmode.xml`；JUnit：`playmode-junit.xml`。
- **PASS — StandaloneOSX 构建**：临时构建到 `CatDemo.app`，CLI 退出码 0。日志：`build.log`。

## 首关实际 Player 画面审查

实际客户区截图：`first-stage-viewport.png`（540×942）；对应桌面原图：`desktop-first.png`。启动时请求 540×960，但 macOS 窗口模式可用客户区为 540×942，截图保留了真实显示尺寸。

- **FAIL — 首关整体显示仍不合格**：面板九宫格纵向 border 改为 8 后，纸片底现在完整可见；但标题没有清晰显示，状态文字挤在 Header 下缘；Hint 文字压在纸条边线附近且难读；Selection 与底部消息文字也贴边或受背景线条干扰。不能判定文字可读性通过。
- **FAIL — 床沿仍干扰提示/操作区**：床和床沿延伸到 Controls 区域，Hint、旋转/换姿势/移回按钮所在区域仍与床铺高细节重叠；纸片底没有把床沿从操作区域隔离开。
- **PASS（有限）— 羽毛商店图标**：第一关购买按钮左侧已显示羽毛缩略图；画面中未见明显硬裁切，但尺寸较小。
- **PASS（有限）— 床底手**：敌人栏能看到更完整的手部轮廓，未见硬裁切；实际显示仍偏小。
- **PASS — 面条占格**：单张完整猫图横跨三格，没有按格重复，棋盘仍可辨识。

结论：自动测试与构建 **PASS**；第三轮首关实际显示审查 **FAIL**。按最后一轮约定，保留当前版本作为最佳版本，不继续重做或推进第 2、3 关。第 2、3 关及闹钟双针动态未覆盖，因为首关检查已失败。
