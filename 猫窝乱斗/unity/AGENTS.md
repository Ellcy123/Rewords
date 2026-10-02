# 猫窝乱斗 Unity 工程

- 继承父项目 AGENTS.md：所有测试和功能验证交由明确指定 `gpt-6-luna`、`xhigh` 的子代理执行，主代理实现与修复。
- 操作 Unity CLI 时先读本工程 `.agents/skills/unity-cli/SKILL.md`，按需读取对应参考文件。这是官方 CLI 安装的技能，更新优先通过官方命令，不手改供应商技能。
- 本机 CLI 为 `/Users/m4/.unity/bin/unity`。编辑器版本固定为 `6000.4.0f1`，不因 CLI 更新升级编辑器。
- 对运行中的编辑器发送命令时显式指定本工程绝对路径，避免误操作同时打开的 NDC 等工程。
- 先发现编辑器实际暴露的命令，再调用；连接失败不能默认当作代码编译失败，也不能把读取模型等同于真实鼠标／触摸操作通过。
- 2026-09-26 最新授权：按《10_Demo代码架构审计与实施规划》重构底层，完成第 1～4 关连续流程。新入口为 Assets/CatGame/Scenes/CatRun.unity，旧 Assets/CatDemo 仅保留作参考，不能拿旧原型测试替代新系统验收。正式美术仍用临时资源。
- 配置权威来源：Assets/CatGame/Resources/GameContent.asset；DemoSetup.Defaults 仅用于首次建档，不在构建时覆盖策划配置或场景。调整数值改资产，必要时更新新工程默认值。
