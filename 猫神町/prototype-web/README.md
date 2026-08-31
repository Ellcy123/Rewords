# 《猫神町》网页 Demo

当前版本：`0.1.0-day1`

这是《猫神町》一周 Demo 的 Day 1 工程空壳。当前版本用于验证页面结构、数据契约、三名 NPC、物品载体与规则概念映射，不包含完整游戏状态结算。

## 当前可用内容

- 三地点地图：猫神社、猫神町站、镜庭商店街；
- 地图不显示 NPC 头像，进入地点后才确认在场角色；
- 三名 NPC 的地点舞台、人物卡和结构化 Mock 对话；
- 选项式对话，不包含自由文字输入；
- 六件物品、六个承载概念和两个世界规则槽的数据；
- 背包只显示简单物品名，不提前显示承载概念；
- 神社候选供奉区：放入物品后才显示完整规则；
- 世界状态、物品所有权、概念映射和 Mock 决策调试页；
- 前后端共享 Zod Schema；
- 数据契约与 Mock Provider 自动化测试。

## 本地启动

环境要求：Node.js 20 或更高版本。

```powershell
cd D:\Rewords\猫神町\prototype-web
npm install
npm run dev
```

启动后访问：

- 网页客户端：`http://127.0.0.1:5173/`
- 后端健康检查：`http://127.0.0.1:8787/api/health`
- Demo 初始数据：`http://127.0.0.1:8787/api/bootstrap`

## 检查命令

```powershell
npm run typecheck
npm test
npm run build
```

生产客户端构建输出到 `dist/client`。

## 目录

```text
prototype-web/
├─ client/                 React + TypeScript + Vite 客户端
├─ server/                 Fastify API 与 MockDialogueProvider
├─ packages/shared/        前后端共享 Schema 与 Demo 数据
├─ tests/                  数据契约和 Mock 对话测试
└─ dist/client/            生产客户端构建
```

## Day 1 与 Day 2 边界

Day 1 已实现规则预览，但“确认供奉”暂时不会写入世界状态。这不是故障。

Day 2 将接通：

- 地点移动与行动次数消耗；
- 对话获得物品；
- 任意赠送与物品所有权转移；
- 确认供奉、物品离开背包和规则正式生效；
- 时间推进与本地单存档；
- 无 AI 的首个完整玩法闭环。

真实 DeepSeek Provider 计划在 Day 3 接入；Day 1 和 Day 2 始终保留 Mock Provider。

