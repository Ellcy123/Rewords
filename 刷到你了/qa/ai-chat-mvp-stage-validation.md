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

- 测试提交：NOT RUN
- 日期：NOT RUN
- 环境：NOT RUN
- 自动化命令：NOT RUN
- 人工测试环境：NOT RUN

| 用例 | 状态 | 证据或说明 |
| --- | --- | --- |
| B-01 PK 入口 | NOT RUN | |
| B-02 二元选择界面 | NOT RUN | |
| B-03 首次主动私信 | NOT RUN | |
| B-04 回复轻微延迟 | NOT RUN | |
| B-05 离开聊天页 | NOT RUN | |
| B-06 刷新补发 | NOT RUN | |
| B-07 主动任务报备 | NOT RUN | |
| B-08 无可见状态 | NOT RUN | |
| B-09 AI 失败降级 | NOT RUN | |
| B-10 两次独立购买 | NOT RUN | |
| B-11 小屏适配 | NOT RUN | |
| B-12 原有玩法回归 | NOT RUN | |

- 未解决缺陷：NOT RUN
- 阶段结论：NOT RUN

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
