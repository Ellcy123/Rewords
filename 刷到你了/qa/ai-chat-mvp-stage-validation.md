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

- 测试提交：`3e693b9`；自动化记录提交：`b8094e4`
- 日期：2026-07-20
- 环境：Windows / PowerShell；Vitest 4.1.10；Vite 8.1.4
- 自动化命令：Phase B Gate 指定的 7 个测试文件；全量 `npm test -- --run`；`npm run typecheck`；`npm run build`；`git diff --check`
- 自动化摘要：Phase B Gate 7 个文件、49 项通过；全量 21 个文件、132 项通过；类型检查与生产构建退出码 0
- 后续可靠性加固：`06723d3`、`4433122` 补充空信号推进、请求中刷新恢复、单飞顺序与 AI 完全离线路线回归；截至 Phase C 验证时全量为 21 个文件、136 项通过。
- 人工测试环境：局域网服务监听 `0.0.0.0:4173`，本次地址 `http://192.168.1.7:4173/`；用户于 2026-07-20 完成当前可用流程的手机走查并反馈“没啥太大的问题”，同时指出部分交互（如领取控件的按钮感）后续仍需统一优化。未单独留存机型、截图及两条完整路线的逐步数据。

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

- 未解决缺陷：未发现自动化阻断缺陷；用户手机走查未发现明显问题。领取控件等视觉可点击性属于后续 UI 优化项；B-02/B-05/B-08/B-10/B-11 的截图、机型信息及上票/不上票双路线逐步数据仍未留档。
- 阶段结论：USER ACCEPTED / EVIDENCE INCOMPLETE（自动化门禁通过，用户同意继续 Phase C；未把缺失的完整人工证据误记为 PASS）

## Phase C

- 测试提交：`4433122bcf3dc6c62a721e66691073341f2c8e7d`（包含服务端实现 `51ac709` 及边界加固 `50400c3`、`f126f16`、`d5f2c86`）
- 日期：2026-07-21
- 环境：Windows / PowerShell；Node v24.11.0；npm 11.6.1；Vitest 4.1.10
- 自动化命令：服务端 `npm test`、`npm run typecheck`、`npm run build`；前端 `npm test -- --run`、`npm run typecheck`、`npm run build`；前端 `src`/`dist` 密钥正则扫描；`git diff --check`
- 自动化摘要：服务端 2 个文件、56 项通过；前端 21 个文件、136 项通过；两端类型检查与生产构建退出码 0；前端未发现 API key 形态或 `OPENAI_API_KEY` 字样；Task 7 与离线路线独立复审均为 Ready: Yes。
- 真实模型冒烟测试：NOT RUN。本机未配置 `OPENAI_API_KEY` 与 `OPENAI_MODEL`，因此未调用真实模型，也未记录或提交任何密钥；六条真实模型输入与 AI 在线人工路线仍待使用非生产测试账号执行。
- DeepSeek 兼容冒烟：2026-07-21 使用本机忽略的 DeepSeek 测试配置，经前端 `4173 → /api/chat → 8787` 发出一条无个人信息的 hold-back 请求；返回 HTTP 200、严格三字段、68 个 Unicode 字符、`respect_boundary`、`warm`。该结果证明兼容适配器在线可用，但不替代上述 OpenAI 六条完整冒烟。

| 用例 | 状态 | 证据或说明 |
| --- | --- | --- |
| C-01 请求 schema | AUTO PASS | Zod 拒绝未知人物/阶段、超长正文、超过 12 条历史、未知记忆及矛盾跨字段上下文。 |
| C-02 响应 schema | AUTO PASS | 严格三字段；Unicode code point 计数 1–120；信号最多 2 个且为白名单；语气为固定枚举。 |
| C-03 模型越权 | AUTO PASS | 未知信号、额外节点字段、金币状态变更、直接开放内容与任何商品交易/赠与承诺均被二次校验拒绝。 |
| C-04 Prompt injection | AUTO PASS / LIVE NOT RUN | Prompt 将用户正文视为不可信；领域守卫拒绝金币、解锁及非白名单交易输出。真实模型第 3 条注入冒烟未执行。 |
| C-05 事实边界 | AUTO PASS / LIVE NOT RUN | 记忆 ID 只映射服务端固定事实；PK、任务发布、婚礼完成与 post-ending 组合执行一致性校验。真实模型事实编造冒烟未执行。 |
| C-06 角色差异 | CONTEXT PASS / LIVE NOT RUN | support/hold_back 进入不同固定事实上下文且共同回到完整证据任务；真实生成的自然度与差异性未执行人工判定。 |
| C-07 服务超时 | AUTO PASS | 7000 ms 服务端超时使用 fake timers 验证，provider 超时/错误/非法输出均返回 503 `{ code: 'AI_UNAVAILABLE' }`。 |
| C-08 限流 | AUTO PASS | 同一 IP 前 20 次成功，第 21 次返回 429。 |
| C-09 日志隐私 | AUTO PASS | 日志对象只含 requestId、latencyMs、status、fallbackReason；测试确认无正文、provider 错误原文与 key。 |
| C-10 密钥隔离 | AUTO PASS | key/model 仅从服务端环境读取；缺失时启动明确失败；前端源码与构建产物扫描无命中。 |
| C-11 AI 离线 | AUTO PASS / MANUAL NOT RUN | `4433122` 模拟网络拒绝，验证 fallback 软投递、任务进入 committed、单次主动报备及 E201 单次解锁；真机手动断服路线未执行。 |
| C-12 信号交付时机 | AUTO PASS | HTTP/模型结果只替换 pending delivery；任务信号在消息实际 flush 时应用，pending 前不推进。 |

- 未解决缺陷：未发现自动化阻断缺陷。完整 Phase C Gate 尚缺非生产 Key 下 6 条真实模型冒烟、AI 在线人工路线，以及真机手动断服路线；因此不能判定 PASS。
- 阶段结论：NOT RUN（代码实现、自动化门禁与 AI 离线路由通过；真实模型与人工在线/离线验收待执行）

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
