# AI 私聊主循环 MVP 阶段验证记录

> 使用方式：每个阶段只记录实际执行结果。未执行项保持 `NOT RUN`，失败项写明复现步骤与修复提交。任何阻断项未通过时，阶段结论必须为 `FAIL`。

## Phase A

- 测试提交：`bccb63df4613c6634d4ce1b3b44ceff7a767131b`
- 日期：2026-07-20
- 环境：Windows / PowerShell；Node.js v24.11.0；npm 11.6.1；Vitest 4.1.10
- 自动化命令：策划案 Phase A Gate 指定的 9 个测试文件；随后执行 `npm run typecheck`
- 测试摘要：9 个测试文件、59 项测试全部通过；TypeScript 类型检查通过；退出码均为 0

| 用例 | 状态 | 证据或说明 |
| --- | --- | --- |
| A-01 内容目录完整性 | PASS | `content.test.ts`：19 个节点通过目录校验，E 系列 ID 唯一且关系商品引用有效。 |
| A-02 录音笔来源 | PASS | `content.test.ts`：K101 无商品；E201 是唯一来源；录音笔可重复购买，固定 30 金币。 |
| A-03 主线物品用途 | PASS | `trigger.test.ts`、`complete-route.test.ts`：C001→C101 与 W300→W301 均成立，并覆盖两种投放顺序。 |
| A-04 PK 上票 | PASS | `moments.test.ts`、`reducer.test.ts`：只扣 30 一次，写入 support 与 boundary_pressure，任务进入 invited。 |
| A-05 PK 不上票 | PASS | `moments.test.ts`、`complete-route.test.ts`：扣款为 0，写入 respect，同样进入 invited 并可正常通关。 |
| A-06 任务推进 | PASS | `relationship-task.test.ts`：只接受三种白名单信号；未知文本无效果；两个相关兜底轮次推进一阶段。 |
| A-07 主动报备效果 | PASS | `relationship-task.test.ts`、`reducer.test.ts`：committed 只发出一次调度效果；到期 flush 只解锁一次 E201。 |
| A-08 软时间持久化 | PASS | `message-delivery.test.ts`、`persistence.test.ts`：未来消息保持 pending，到期拆分正确，epoch 时间可跨重载保存。 |
| A-09 经济可解性 | PASS | `complete-route.test.ts`：support/hold_back × 两种录音笔顺序共 4 条路线均购买两支录音笔与投影并到达 W400。 |
| A-10 错误探索恢复 | PASS | `reducer.test.ts`：误投必需品后可再次结算；已有物品、已解决依赖及额外第三支录音笔不获补助。 |
| A-11 存档迁移 | PASS | `persistence.test.ts`：真实结构 v3 fixture 保留 47 金币、背包、W300 当前节点和完成状态，安全补齐 v4 字段。 |
| A-12 媒体合同 | PASS | `content.test.ts`、`story-stage-media.test.tsx`：14 条视频路径不变；K101 与四个 E 节点均走 storyboard 且不请求 MP4。 |

- 未解决缺陷：无 Phase A 阻断缺陷。PK/私信可玩界面与真实 AI 不属于本阶段，将在 Phase B/C 实现和验证。
- 阶段结论：PASS

## Phase B

- 测试提交：`3e693b9`（待真机验收后补最终验证提交）
- 日期：2026-07-20
- 环境：Windows / PowerShell；Vitest 4.1.10；Vite 8.1.4
- 自动化命令：Phase B Gate 指定的 7 个测试文件；全量 `npm test -- --run`；`npm run typecheck`；`npm run build`；`git diff --check`
- 自动化摘要：Phase B Gate 7 个文件、49 项通过；全量 21 个文件、132 项通过；类型检查与生产构建退出码 0
- 人工测试环境：局域网服务监听 `0.0.0.0:4173`，本次地址 `http://192.168.1.7:4173/`；390×844 自动浏览器连接不可用，真机双路线待用户执行

| 用例 | 状态 | 证据或说明 |
| --- | --- | --- |
| B-01 PK 入口 | AUTO PASS | `app-flow.test.tsx` 与内容回归覆盖入口解锁及原推荐流；待真机确认出现位置。 |
| B-02 二元选择界面 | AUTO PASS / MANUAL NOT RUN | `message-flow.test.tsx` 覆盖两项选择、余额不足只禁上票、无正确/错误/好感提示。 |
| B-03 首次主动私信 | AUTO PASS / MANUAL NOT RUN | 两条路线首信不同、延迟出现并产生未读；进入聊天前不可主动发信。 |
| B-04 回复轻微延迟 | AUTO PASS / MANUAL NOT RUN | `message-ai-flow.test.tsx` 覆盖用户消息立即出现、AI 与 fallback 延迟送达。 |
| B-05 离开聊天页 | AUTO PASS / MANUAL NOT RUN | Provider 后台定时投递与未读提示通过；待真机操作确认。 |
| B-06 刷新补发 | AUTO PASS / MANUAL NOT RUN | 覆盖 overdue reload 及 HTTP 请求中刷新后的单次 fallback 恢复。 |
| B-07 主动任务报备 | AUTO PASS / MANUAL NOT RUN | committed 后只调度一条固定报备，到达后 E201 只解锁一次。 |
| B-08 无可见状态 | AUTO PASS / MANUAL NOT RUN | 自动断言无在线、直播中、办事中、休息中、输入中、倒计时与关系数值。 |
| B-09 AI 失败降级 | AUTO PASS | 8 秒硬超时（即使 fetch 不响应 abort）、HTTP 非 2xx、非法 JSON、未知信号和额外字段均为 typed failure；UI 使用阶段 fallback。 |
| B-10 两次独立购买 | AUTO PASS / MANUAL NOT RUN | 全量规则回归继续覆盖 E201 录音笔可重复单支购买；待真机执行两次。 |
| B-11 小屏适配 | NOT RUN | |
| B-12 原有玩法回归 | AUTO PASS / MANUAL NOT RUN | `app-flow`、`video-card`、`video-feed`、`tutorial` 通过；待本提交真机回归。 |

- 未解决缺陷：未发现自动化阻断缺陷；B-02/B-05/B-08/B-10/B-11 所需真机截图与上票/不上票双路线尚未记录。
- 阶段结论：NOT RUN（自动化门禁通过，等待 390×844 真机双路线后才能判定 PASS）

## Phase C

- 测试提交：NOT RUN
- 日期：NOT RUN
- 环境：NOT RUN
- 自动化命令：NOT RUN
- 真实模型冒烟测试：NOT RUN

| 用例 | 状态 | 证据或说明 |
| --- | --- | --- |
| C-01 请求 schema | NOT RUN | |
| C-02 响应 schema | NOT RUN | |
| C-03 模型越权 | NOT RUN | |
| C-04 Prompt injection | NOT RUN | |
| C-05 事实边界 | NOT RUN | |
| C-06 角色差异 | NOT RUN | |
| C-07 服务超时 | NOT RUN | |
| C-08 限流 | NOT RUN | |
| C-09 日志隐私 | NOT RUN | |
| C-10 密钥隔离 | NOT RUN | |
| C-11 AI 离线 | NOT RUN | |
| C-12 信号交付时机 | NOT RUN | |

- 未解决缺陷：NOT RUN
- 阶段结论：NOT RUN

## Phase D

- 测试提交：NOT RUN
- 日期：NOT RUN
- 环境：NOT RUN
- 自动化命令：NOT RUN
- 五人试玩摘要：NOT RUN

| 用例 | 状态 | 证据或说明 |
| --- | --- | --- |
| D-01 上票完整路线 | NOT RUN | |
| D-02 不上票完整路线 | NOT RUN | |
| D-03 AI 离线完整路线 | NOT RUN | |
| D-04 两种投放顺序 | NOT RUN | |
| D-05 经济极端路线 | NOT RUN | |
| D-06 结局资格 | NOT RUN | |
| D-07 结局幂等 | NOT RUN | |
| D-08 结局事实 | NOT RUN | |
| D-09 后日谈 | NOT RUN | |
| D-10 重置与删除 | NOT RUN | |
| D-11 视频资产 | NOT RUN | |
| D-12 六条玩梗分支 | NOT RUN | |
| D-13 移动端完整性 | NOT RUN | |
| D-14 弱网与重复操作 | NOT RUN | |

- 未解决缺陷：NOT RUN
- 发布结论：NOT RUN
