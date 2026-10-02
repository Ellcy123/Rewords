# 猫窝乱斗 · Unity 四关 Demo

引擎固定 Unity 6000.4.0f1。当前入口为 `Assets/CatGame/Scenes/CatRun.unity`，`Assets/CatDemo` 是旧原型，不用于新构建。

首次初始化：Unity 菜单 **Cat Game → Set Up Four Stage Demo**。之后打开 CatRun 场景运行。策划数值统一改 `Assets/CatGame/Resources/GameContent.asset`。

新局猫咪从待放区开始；购买用品后，分别拖入猫窝 → 点选可旋转／换姿势 → 开始守梦 → 下一关。前三关逐步教连击路线，第 4 关开放更多猫、出售和扩容。按钮“重新开局”会二次确认后清除当前轮进度。

2026-10-01 接入网页 C 方案，保持 9:16 基准。战斗隐藏格线、缩小阵型并显示布艺猫窝；右上角 ×1／×2 切换战斗速度。准备页商店逐项翻页，待放区每页两项；第四夜的刷新和扩容在猫窝标题右侧“…”内。生命值、下一击倒计时与护盾读取正式战斗数据。详见 [C方案接入记录](C方案Unity接入.md)。

构建菜单：**Cat Game → Build Four Stage Demo**，输出 `../Builds/CatDemo.app`。构建不会重新生成场景或重置配置。

架构、规则和第 4 关暂定数值见 [四关实现与操作说明](../11_四关Demo实现与操作说明_V0.1.md)。测试结论见 [四关测试报告](../TestResults/2026-09-26-four-stage/REPORT.md)。

保存使用 `Application.persistentDataPath/cat-run-v1.json`，自动备份为 `.bak`。战斗中退出会按原阵容重新开打；胜利退出再进不会重复领钱。新旧原型存档互不覆盖。广告均为本地模拟。

测试依根 AGENTS.md，只由 GPT-6 Luna / xhigh 子代理执行。CLI 在 `/Users/m4/.unity/bin/unity`，用法见本工程 `.agents/skills/unity-cli`；测试不是打开旧菜单里的八条断言就算完成。
