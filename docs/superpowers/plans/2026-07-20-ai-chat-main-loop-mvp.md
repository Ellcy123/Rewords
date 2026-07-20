# AI 私聊主循环 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有《刷到你了》网页原型中完成一个可从头玩到结局的纵向切片：玩家完成一次新娘改命后进入主播炎鑫的 PK 节点，通过二元选择和 AI 私聊推进炎鑫的取证任务，解锁一条关系派生视频及其“带摄像头的录音笔”小黄车，再把该物品送回新娘主线，最终生成一封基于共同经历的 AI 情感来信，并允许结局后继续私聊。

**Architecture:** 保留前端内容目录、纯 reducer 和本地存档作为 Demo 的确定性游戏层；新增 `moments`、`messages`、`relationship`、`ending` 四个领域模块。规则层独占节点解锁、人物任务阶段、物品来源、货币结算和结局资格，AI 只在服务端根据允许的上下文生成角色话术与结构化任务信号。浏览器通过窄接口调用独立 Node 服务，服务不可用或输出不合规时使用人工编写的角色兜底，不阻塞主线。

**Tech Stack:** React 19、TypeScript 7、Vite 8、Vitest 4、Testing Library；Node.js TypeScript、Express、OpenAI 官方 JavaScript SDK、Zod；现有 CSS 动态分镜和 localStorage 存档。

## Global Constraints

- 本计划只实现一名人物“炎鑫”、一个人物任务、一组 PK 是/否节点、一条关系派生视频和一个 AI 来信结局。
- 纵切片固定因果链为 `W001 + 梯子 → W101 + 空调师傅 → W300 与 E001 → 私聊取证任务 → E201 小黄车录音笔 → C001 + 录音笔 → C101 小黄车投影服务，同时 W300 + 录音笔 → W301 → W301 + 投影服务 → W400 → AI 来信`。`C001` 与 `W300` 的两次录音笔投放顺序可以互换。
- `E201` 的录音笔同时满足“炎鑫完整取证”与“新娘婚礼现场完整取证”；它不是 AI 临时生成的商品。
- 两支录音笔必须在 `E201` 小黄车中分别购买，每支 30，产生两笔独立交易；不得改成一次购买的双支套装。
- `K101` 只保留知识线索，不再售卖录音笔；录音笔唯一首次来源改为 `E201`。
- 视频资产处理必须遵循 `刷到你了/14_MVP视频资产变更与制作清单_V0.1.md`：14 条旧视频复用，`K101` 改版，四个 E 节点新增。
- AI 不得直接修改金币、背包、节点、任务阶段、关系证据或结局资格；它只能返回允许的枚举信号，确定性规则层决定是否采纳。
- AI 不得新增人物、商品、任务、关系事实、共同记忆或主线结果。
- PK 两个选择都能继续游戏；上票与不上票写入不同的隐藏关系证据，但不显示好感度数值。
- 聊天不是关键词解谜。连续两轮表达与任务相关但模型未返回有效信号时，规则层自动推进到下一任务阶段。
- AI 服务失败、达到 8 秒超时、限流或结构化输出校验失败后，必须在 1 秒内切换本地角色兜底；主线永不依赖一次成功的模型请求。
- MVP 私聊采用最小软时间：AI 回复在准备完成后轻微延迟显示，人物任务有进展时由炎鑫主动发一条报备；不显示在线、直播中、办事中、休息中、输入中、倒计时或复杂日程。
- 软时间不得形成现实时间门槛。普通回复最晚在请求完成后 2 秒内显示，主动报备最晚在生成后 4 秒内显示；关闭页面期间到期的消息在下次启动时立即补发，主线仍可连续测试。
- OpenAI API key 只存在于 `ai-server` 环境变量，绝不写入 Vite 变量、浏览器代码、日志、存档或测试快照。
- Demo 可以信任浏览器提交的游戏上下文，不提供商业发行级反作弊；服务端仍会按 schema 白名单裁剪上下文和输出。
- 结束来信只生成一次并持久化；刷新页面不得重生成。结局后聊天继续使用 `postEnding: true` 的上下文，但不会再解锁主线内容。
- 所有新增视频节点可以先使用明确标记的 CSS 动态分镜；不得让用户误认为是已经生产完成的真人视频素材。
- 存档从版本 3 升到版本 4，必须自动迁移现有进度。

## Acceptance Scenario

1. 新存档进入 `W001`，按现有玩法购买梯子并正确改命，解锁 `W101`。
2. 使用空调师傅解决 `W101` 后，`W300` 与娱乐节点 `E001` 同时进入推荐流。
3. 玩家点进 `E001`，看到 PK 最后 30 秒，选择“上票”或“不上票”；炎鑫的首条主动私信经过轻微延迟到达，不显示人物状态或倒计时。
4. 玩家自由回复；回复经过轻微延迟出现，炎鑫的表达能反映选择差异，但人物任务始终是“找回未剪辑的完整证据并公开回应”。
5. 最迟第三次有效对话后，炎鑫在玩家没有继续追问时主动报备设备测试进展；报备送达时解锁 `E201`，视频说明自己从开播前录到下播后并挂载录音笔。
6. 玩家在 `E201` 完成两次独立的 30 金币购买：一支用于 `C001` 生成 `C101` 并购买投影服务，一支用于 `W300` 得到 `W301`；两次投放顺序可互换，最终以投影服务完成 `W400`。
7. 系统根据 PK 选择、聊天证据、任务完成和婚礼结果生成并保存一封炎鑫来信；刷新后内容不变，玩家仍可继续给炎鑫发消息。
8. 关闭 AI 服务重复上述流程，使用兜底回复仍能完整通关。

## Delivery Order and Estimate

按一名前端/全栈开发者估算，首个可试玩内部版本为 10–13 人日；正式视频生产另计 2–4 个内容制作人日。动态分镜属于开发估算，正式视频必须在阶段 B 验证闭环后再投入。

| 阶段 | 对应任务 | 可独立验收结果 | 估算 |
| --- | --- | --- | --- |
| A. 确定性骨架 | Task 1–4 | 不接 AI 也能跑通 PK、人物任务、E201、录音笔和经济保底 | 3–4 人日 |
| B. 可玩界面 | Task 5–6 | 可从 PK 进入私信，软时间投递与主动报备可驱动关系视频解锁 | 3 人日 |
| C. 原生 AI | Task 7 | 服务端安全调用模型，人物自由回复并返回受控任务信号 | 2–3 人日 |
| D. 结局与回归 | Task 8–10 | 主线回收、一次性 AI 来信、AI 开关双路线全部通过 | 2–3 人日 |

最早试玩点设在阶段 B 完成后。此时先验证“聊天真的改变推荐流并带回主线物品”是否成立；若不成立，先改内容因果和 UI 表达，不继续扩大 AI 或视频生产范围。

---

## File Structure

### Frontend creates

- `刷到你了/web-prototype/src/moments/types.ts`
- `刷到你了/web-prototype/src/moments/catalog.ts`
- `刷到你了/web-prototype/src/moments/resolveMoment.ts`
- `刷到你了/web-prototype/src/moments/MomentSheet.tsx`
- `刷到你了/web-prototype/src/messages/types.ts`
- `刷到你了/web-prototype/src/messages/character.ts`
- `刷到你了/web-prototype/src/messages/fallbackReplies.ts`
- `刷到你了/web-prototype/src/messages/delivery.ts`
- `刷到你了/web-prototype/src/messages/aiClient.ts`
- `刷到你了/web-prototype/src/messages/MessageSheet.tsx`
- `刷到你了/web-prototype/src/relationship/taskEngine.ts`
- `刷到你了/web-prototype/src/ending/buildEndingSnapshot.ts`
- `刷到你了/web-prototype/src/ending/EndingLetterSheet.tsx`
- `刷到你了/web-prototype/src/activity/catalog.ts`
- `刷到你了/web-prototype/src/styles/relationship.css`
- `刷到你了/web-prototype/src/tests/moments.test.ts`
- `刷到你了/web-prototype/src/tests/relationship-task.test.ts`
- `刷到你了/web-prototype/src/tests/message-delivery.test.ts`
- `刷到你了/web-prototype/src/tests/ai-client.test.ts`
- `刷到你了/web-prototype/src/tests/message-flow.test.tsx`
- `刷到你了/web-prototype/src/tests/ending.test.ts`
- `刷到你了/web-prototype/src/tests/ai-main-loop.test.tsx`

### Frontend modifies

- `刷到你了/web-prototype/src/content/types.ts`
- `刷到你了/web-prototype/src/content/items.ts`
- `刷到你了/web-prototype/src/content/nodes.ts`
- `刷到你了/web-prototype/src/content/media.ts`
- `刷到你了/web-prototype/src/content/triggers.ts`
- `刷到你了/web-prototype/src/content/validate.ts`
- `刷到你了/web-prototype/src/engine/state.ts`
- `刷到你了/web-prototype/src/engine/reducer.ts`
- `刷到你了/web-prototype/src/engine/persistence.ts`
- `刷到你了/web-prototype/src/engine/selectors.ts`
- `刷到你了/web-prototype/src/feed/StoryStage.tsx`
- `刷到你了/web-prototype/src/feed/VideoCard.tsx`
- `刷到你了/web-prototype/src/feed/VideoFeed.tsx`
- `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- `刷到你了/web-prototype/src/shell/BottomNav.tsx`
- `刷到你了/web-prototype/src/shell/ProfileSheet.tsx`
- `刷到你了/web-prototype/src/App.tsx`
- `刷到你了/web-prototype/src/main.tsx`
- `刷到你了/web-prototype/vite.config.ts`
- `刷到你了/web-prototype/package.json`
- 受版本、导航和经济变化影响的现有 `刷到你了/web-prototype/src/tests/*.test.ts(x)`

### AI server creates

- `刷到你了/ai-server/package.json`
- `刷到你了/ai-server/tsconfig.json`
- `刷到你了/ai-server/.env.example`
- `刷到你了/ai-server/src/app.ts`
- `刷到你了/ai-server/src/server.ts`
- `刷到你了/ai-server/src/contracts.ts`
- `刷到你了/ai-server/src/allowedContext.ts`
- `刷到你了/ai-server/src/openaiClient.ts`
- `刷到你了/ai-server/src/chatService.ts`
- `刷到你了/ai-server/src/endingService.ts`
- `刷到你了/ai-server/src/prompts/yanxin.ts`
- `刷到你了/ai-server/src/prompts/ending.ts`
- `刷到你了/ai-server/src/tests/contracts.test.ts`
- `刷到你了/ai-server/src/tests/chat-route.test.ts`
- `刷到你了/ai-server/src/tests/ending-route.test.ts`

---

### Task 1: 锁定内容契约与“关系物品必须服务主线”的校验

**Files:**
- Modify: `刷到你了/web-prototype/src/content/types.ts`
- Modify: `刷到你了/web-prototype/src/content/items.ts`
- Modify: `刷到你了/web-prototype/src/content/validate.ts`
- Test: `刷到你了/web-prototype/src/tests/content.test.ts`

**Interfaces:**

```ts
type NodeId = ExistingNodeId | 'E001' | 'E101' | 'E102' | 'E201'
type Channel = 'wedding' | 'costume' | 'knowledge' | 'entertainment'
type ResultKind = 'main' | 'resource' | 'wrong' | 'completion' | 'relationship'
type MediaMode = 'video' | 'storyboard'

interface ItemDefinition {
  sourceNodeIds: NodeId[]
  mainlineUseNodeIds: NodeId[]
  requiredForMainline: boolean
}

interface VideoNode {
  mediaMode: MediaMode
  onCompleteDiscoverItemId?: ItemId
}
```

- [ ] **Step 1: Write failing validation tests** proving `recorder.sourceNodeIds` is exactly `['E201']`, `recorder.mainlineUseNodeIds` contains `W300`, `K101.productItemId` is absent, and every product on a relationship node has at least one wedding mainline use.
- [ ] **Step 2: Run** `npm test -- --run src/tests/content.test.ts` from `刷到你了/web-prototype`; expected failure mentions missing `E201`/new item metadata.
- [ ] **Step 3: Extend the types and migrate all four item definitions** from singular `sourceNodeId` to arrays. Set recorder to `{ sourceNodeIds: ['E201'], mainlineUseNodeIds: ['W300'], requiredForMainline: true }`; preserve the current source and correct wedding target for the other items.
- [ ] **Step 4: Add catalog validation** with the exact error `Relationship product recorder has no wedding mainline use` for an invalid fixture.
- [ ] **Step 5: Run the content test and typecheck**; expected both exit 0.
- [ ] **Step 6: Commit** `feat(content): bind relationship products to bride mainline`.

### Task 2: 建立人物任务、PK 节点与隐藏关系证据

**Files:**
- Create: `刷到你了/web-prototype/src/moments/types.ts`
- Create: `刷到你了/web-prototype/src/moments/catalog.ts`
- Create: `刷到你了/web-prototype/src/moments/resolveMoment.ts`
- Create: `刷到你了/web-prototype/src/relationship/taskEngine.ts`
- Modify: `刷到你了/web-prototype/src/content/nodes.ts`
- Modify: `刷到你了/web-prototype/src/content/media.ts`
- Modify: `刷到你了/web-prototype/src/content/triggers.ts`
- Modify: `刷到你了/web-prototype/src/content/validate.ts`
- Modify: `刷到你了/web-prototype/src/tests/story-stage-media.test.tsx`
- Test: `刷到你了/web-prototype/src/tests/moments.test.ts`
- Test: `刷到你了/web-prototype/src/tests/relationship-task.test.ts`

**Interfaces:**

```ts
type MomentId = 'PK_LAST_30_SECONDS'
type MomentChoiceId = 'support' | 'hold_back'
type CharacterTaskId = 'YANXIN_UNCUT_EVIDENCE'
type CharacterTaskStage = 'locked' | 'invited' | 'understood' | 'committed' | 'published'
type TaskSignal = 'acknowledge_pressure' | 'offer_evidence_plan' | 'respect_boundary'

interface RelationshipEvidence {
  id: string
  source: 'moment' | 'chat' | 'world'
  kind: 'support' | 'trust' | 'respect' | 'boundary_pressure' | 'shared_result'
  polarity: -1 | 1
  summary: string
}
```

- [ ] **Step 1: Write failing pure-function tests**: `support` costs 30 and records `support + boundary_pressure`; `hold_back` costs 0 and records `respect`; resolving twice is idempotent; both choices set the task to `invited`.
- [ ] **Step 2: Write failing task-engine tests**: only whitelisted signals advance stages; arbitrary model prose does not; two task-relevant fallback turns advance one stage; `committed` unlocks `E201` exactly once; viewing `E201` marks `published`.
- [ ] **Step 3: Add four storyboard nodes**:
  - `E001`: PK 最后 30 秒入口，没有小黄车。
  - `E101`: 上票后的公开结果，没有小黄车。
  - `E102`: 不上票后的公开结果，没有小黄车。
  - `E201`: 炎鑫完整取证回应，唯一挂载 `recorder`，完整观看后通过 `onCompleteDiscoverItemId` 发现该物品。
- [ ] **Step 4: Add the trigger** so first resolving `W101` with `technician` unlocks both `W300` and `E001`; do not require a fixed order between browsing `W300` and `E001`.
- [ ] **Step 5: Mark all E nodes `mediaMode: 'storyboard'`** and change `MEDIA_BY_NODE_ID` to a partial map; validation permits missing MP4 only for explicit storyboard nodes.
- [ ] **Step 6: Stop serving the old `K101_ltx_raw_v1.mp4`** because it visibly advertises the recorder. Until `K101_ltx_raw_v2.mp4` exists, mark `K101` as storyboard and render the revised “完整上下文/原始数据” beats from the asset specification.
- [ ] **Step 7: Add media tests** proving E nodes never request nonexistent MP4 files, `K101` never falls back to v1, and all other 14 existing nodes retain their current media paths.
- [ ] **Step 8: Run** the two new tests plus `content.test.ts`, `trigger.test.ts` and `story-stage-media.test.tsx`; expected exit 0.
- [ ] **Step 9: Commit** `feat(relationship): add yanxin evidence task content`.

### Task 3: 升级存档并让规则层掌握全部状态

**Files:**
- Modify: `刷到你了/web-prototype/src/engine/state.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/web-prototype/src/destiny/CompletionOverlay.tsx`
- Modify: `刷到你了/web-prototype/src/engine/persistence.ts`
- Modify: `刷到你了/web-prototype/src/engine/selectors.ts`
- Modify: `刷到你了/web-prototype/src/game/GameProvider.tsx`
- Create: `刷到你了/web-prototype/src/messages/types.ts`
- Create: `刷到你了/web-prototype/src/messages/delivery.ts`
- Test: `刷到你了/web-prototype/src/tests/reducer.test.ts`
- Test: `刷到你了/web-prototype/src/tests/persistence.test.ts`
- Test: `刷到你了/web-prototype/src/tests/message-delivery.test.ts`

**State additions:**

```ts
interface GameStateV4 {
  version: 4
  relationshipEvidence: RelationshipEvidence[]
  characterTasks: Record<CharacterTaskId, { stage: CharacterTaskStage; relevantTurns: number }>
  resolvedMomentIds: MomentId[]
  messages: ChatMessage[]
  pendingChatDeliveries: PendingChatDelivery[]
  sharedMemories: SharedMemory[]
  claimedActivityTaskIds: ActivityTaskId[]
  ledger: EconomyEntry[]
  ending: null | { id: string; letter: string; generatedAt: string; futureClaimId: string }
}

type ChatDeliveryKind = 'reply' | 'proactive_report'

interface PendingChatDelivery {
  id: string
  kind: ChatDeliveryKind
  message: ChatMessage
  deliverAt: number
  taskSignals: TaskSignal[]
  effect: 'none' | 'unlock_e201'
}
```

- [ ] **Step 1: Add failing migration tests** loading an exact version-3 fixture and asserting all version-4 fields, including `pendingChatDeliveries: []`, are initialized without changing coins, inventory, current node, resolved nodes or completion.
- [ ] **Step 2: Add failing reducer tests** for `MOMENT_RESOLVED`, `CHAT_USER_SENT`, `CHAT_DELIVERY_SCHEDULED`, `CHAT_DUE_DELIVERIES_FLUSHED`, `TASK_SIGNAL_RECEIVED`, `ACTIVITY_TASK_CLAIMED`, `ENDING_SAVED`; repeat each idempotent action and assert no duplicate messages, effects or unlocks.
- [ ] **Step 3: Write failing delivery tests** for `scheduleChatDelivery` and `collectDueChatDeliveries`. Use injected timestamps and random values; assert a reply targets 800–2000 ms after its request began but never appears before `readyAt`, a proactive report targets 1500–4000 ms after creation, future deliveries remain pending, and overdue deliveries flush immediately after hydration.
- [ ] **Step 4: Implement `messages/delivery.ts`** exporting `scheduleChatDelivery(input, random): PendingChatDelivery` and `collectDueChatDeliveries(deliveries, now): { due; pending }`. `input` contains `{ id, kind, message, createdAt, readyAt, taskSignals, effect }`; replies use `max(readyAt, createdAt + sampledReplyDelay)`, proactive reports use `createdAt + sampledReportDelay`. Store epoch milliseconds so local persistence survives reloads; never expose `deliverAt` through UI selectors.
- [ ] **Step 5: Implement version-4 state and migration**; reject malformed stored arrays field-by-field and fall back only that field, not the whole save.
- [ ] **Step 6: In `GameProvider`, flush due deliveries on hydration and every 250 ms while the app is open.** Delivery atomically appends the message, applies its whitelisted task signals, and applies `unlock_e201` at most once.
- [ ] **Step 7: Add selectors** `selectCanOpenYanxinChat`, `selectYanxinTaskStage`, `selectCanViewRelationshipVideo`, `selectCanGenerateEnding`, `selectPostEndingChat`; none returns an online state, status label, countdown or delivery timestamp.
- [ ] **Step 8: Run reducer, persistence and message-delivery tests**; expected exit 0 with fake timers and no real sleeps.
- [ ] **Step 9: Commit** `feat(state): persist relationship loop and soft-time messages`.

### Task 4: 重做试玩经济与稳定赚币任务

**Files:**
- Create: `刷到你了/web-prototype/src/activity/catalog.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/web-prototype/src/engine/selectors.ts`
- Modify: `刷到你了/web-prototype/src/shell/ProfileSheet.tsx`
- Test: `刷到你了/web-prototype/src/tests/reducer.test.ts`
- Test: `刷到你了/web-prototype/src/tests/complete-route.test.ts`

**Fixed MVP economy:**

- 初始金币 100。
- 首次正确解决 `W001`、`W101`、`W300`：每个节点奖励 10，不因重复播放再次奖励。
- 首次完整观看 3 条不同视频：奖励 10，只能领取一次。
- 首次点赞 3 条不同视频：奖励 10，只能领取一次。
- 首次收藏 2 条不同视频：奖励 10，只能领取一次。
- 上票花费 30，不上票花费 0。
- 主线固定需要两支录音笔：一支解锁 `C101`，一支解决 `W300`。玩家必须在 `E201` 以每支 30 金币分别购买两次，经济测试不得按套装或单笔交易计算。
- 删除当前每次 `NODE_VIEWED` 自动 `+5` 的无限收入。
- 保留“平台体验补助”：仅在结算当前缺少且未解决依赖仍需要的物品时抵扣差额，不把补助加入余额。背包已有物品、购买可选误投物品或主线已不需要该物品时不补贴；错误投放消耗必要物品后可以再次补贴重新购买，但每次只完成一笔结算，无法套取可打赏金币。

- [ ] **Step 1: Write failing economy tests** for unique-action counting, single claims, no repeated view income, checkout-only subsidy, and both PK routes retaining a complete-route solution that purchases two recorders plus the projector service. Prove subsidy never increases spendable balance, cannot buy optional stock, and can restore a required item consumed by a wrong branch.
- [ ] **Step 2: Implement task catalog and ledger entries**; ledger reason enums are `main_reward | activity_reward | moment_spend | item_purchase | solvency_subsidy`. A subsidized purchase records gross price, player-paid amount and subsidy amount in the same transaction.
- [ ] **Step 3: Show activity progress and claim buttons in “我的”** without exposing relationship evidence.
- [ ] **Step 4: Run reducer and complete-route tests**; expected exit 0 for support and hold-back parameterized routes.
- [ ] **Step 5: Commit** `feat(economy): add finite activity rewards and solvency guard`.

### Task 5: 完成 PK 判断题与私信界面骨架

**Files:**
- Create: `刷到你了/web-prototype/src/moments/MomentSheet.tsx`
- Create: `刷到你了/web-prototype/src/messages/character.ts`
- Create: `刷到你了/web-prototype/src/messages/fallbackReplies.ts`
- Create: `刷到你了/web-prototype/src/messages/MessageSheet.tsx`
- Create: `刷到你了/web-prototype/src/styles/relationship.css`
- Modify: `刷到你了/web-prototype/src/feed/StoryStage.tsx`
- Modify: `刷到你了/web-prototype/src/feed/VideoCard.tsx`
- Modify: `刷到你了/web-prototype/src/feed/VideoFeed.tsx`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Modify: `刷到你了/web-prototype/src/shell/BottomNav.tsx`
- Modify: `刷到你了/web-prototype/src/shell/ProfileSheet.tsx`
- Modify: `刷到你了/web-prototype/src/App.tsx`
- Modify: `刷到你了/web-prototype/src/main.tsx`
- Test: `刷到你了/web-prototype/src/tests/message-flow.test.tsx`

**Observable copy rules:**

- `support` 后首条主动消息体现“他看见了玩家在关键时刻站出来”，同时表达不希望玩家勉强花钱。
- `hold_back` 后首条主动消息体现“他注意到玩家没有跟着场面上头”，不会指责或冷处理。
- 两条路线都自然带出恶意剪辑和寻找完整证据，不使用“任务已解锁”“好感度增加”等游戏化措辞。
- 设备测试完成后的基础主动报备为：“我试完了，完整那段也发了。你之前说得对，光留最后十秒没用。”该消息由确定性内容层提供，不为报备额外调用模型；模型只影响此前对话如何走到此处。

- [ ] **Step 1: Write the failing UI flow test** from `E001` to choice result to unread-message badge to opening chat; assert no relationship number appears.
- [ ] **Step 2: Implement `MomentSheet`** with “上票帮他守住最后 30 秒（30）”和“先不跟着场面上头”两个动作，余额不足只禁用上票。
- [ ] **Step 3: Implement messages navigation** as a new bottom-tab entry; move the existing destiny/records affordance under Profile to keep five primary tabs.
- [ ] **Step 4: Implement deterministic first contact, the fixed progress report, and three stage-aware fallback replies** in炎鑫语气；fallback returns the same enum signals used by real AI. Resolving the PK schedules the first contact as `proactive_report` instead of appending it immediately; reaching `committed` makes the fixed report available to Task 6 for scheduling.
- [ ] **Step 5: Render E nodes with storyboard styling** and render `E201` product action through the existing product sheet.
- [ ] **Step 6: Run message-flow, video-card, video-feed, app-flow and tutorial tests**; expected exit 0.
- [ ] **Step 7: Commit** `feat(ui): connect pk moment to private chat`.

### Task 6: 建立浏览器 AI 适配器和可靠降级

**Files:**
- Create: `刷到你了/web-prototype/src/messages/aiClient.ts`
- Modify: `刷到你了/web-prototype/src/messages/MessageSheet.tsx`
- Modify: `刷到你了/web-prototype/src/relationship/taskEngine.ts`
- Modify: `刷到你了/web-prototype/vite.config.ts`
- Test: `刷到你了/web-prototype/src/tests/ai-client.test.ts`
- Test: `刷到你了/web-prototype/src/tests/message-delivery.test.ts`

**Browser contract:**

```ts
interface ChatRequest {
  characterId: 'yanxin'
  userText: string
  taskStage: CharacterTaskStage
  momentChoice: MomentChoiceId
  recentMessages: Array<{ role: 'user' | 'assistant'; text: string }>
  allowedMemoryIds: string[]
  postEnding: boolean
}

interface ChatResponse {
  replyText: string
  taskSignals: TaskSignal[]
  tone: 'guarded' | 'warm' | 'teasing' | 'serious'
}
```

- [ ] **Step 1: Write failing client tests** for success, abort at 8 seconds, non-2xx response, invalid JSON and invalid signal; all failures must return a typed failure rather than throw into React.
- [ ] **Step 2: Implement `requestYanxinReply`** calling `POST /api/chat` with `AbortController`; cap recent history at 12 messages and user text at 300 Chinese characters.
- [ ] **Step 3: In `MessageSheet`, append the user message immediately and disable only the send button during the request.** Do not render “输入中”、online state, character status, countdown or delivery time.
- [ ] **Step 4: When AI or fallback output is ready, schedule it as a `reply` delivery** rather than appending immediately. Network latency counts toward the soft delay: set the delivery base to request start and never add more than 2 seconds after a response is ready.
- [ ] **Step 5: Feed task signals through `taskEngine` only when the scheduled reply is delivered**, never dispatch a node unlock directly from the HTTP response. When the task reaches `committed`, schedule one `proactive_report` with `effect: 'unlock_e201'`; its arrival unlocks E201 even if the player has left the chat tab.
- [ ] **Step 6: Add fake-timer tests** proving reply delay, fallback delay, one proactive report, background-tab navigation, reload catch-up, no duplicate E201 unlock and absence of status/countdown text.
- [ ] **Step 7: Add Vite dev proxy** `/api -> http://127.0.0.1:8787`; do not introduce `VITE_OPENAI_API_KEY`.
- [ ] **Step 8: Run ai-client, message-delivery and message-flow tests**; expected exit 0 with no real sleeps.
- [ ] **Step 9: Commit** `feat(ai): add safe chat adapter and soft-time delivery`.

### Task 7: 实现服务端角色生成与结构化信号

**Files:**
- Create all files listed under **AI server creates** except ending-only implementation completed in Task 9.

**Runtime contract:**

- `POST /api/chat` accepts the browser `ChatRequest` after Zod parsing.
- Successful response is exactly `{ replyText, taskSignals, tone }`.
- `replyText`: 1–120 Chinese characters; `taskSignals`: max 2 values from the whitelist; `tone`: fixed enum.
- `OPENAI_API_KEY` and `OPENAI_MODEL` are required server environment variables; startup fails with a clear error if either is absent.
- Logs contain request id, latency, status and fallback reason only; never log user text, message history, API key or full model output.

- [ ] **Step 1: Initialize `ai-server` package** with scripts `dev`, `build`, `typecheck`, `test`; install pinned versions of `express`, `express-rate-limit`, `openai`, `zod`, TypeScript, Vitest, `tsx`, and Express/Node type packages. Commit lockfile.
- [ ] **Step 2: Write failing contract tests** rejecting unknown characters, unknown task stages, more than 12 history entries, unrecognized memory IDs, overlong text and model output containing an unknown signal.
- [ ] **Step 3: Implement `allowedContext.ts`** mapping IDs to server-owned facts. The only allowed character is炎鑫; the only task is complete PK evidence; the only relationship product is recorder; allowed memories are the PK choice, evidence-task completion and wedding result IDs.
- [ ] **Step 4: Implement the炎鑫 prompt** with stable identity, current task, behavioral style and forbidden claims. Instruct the model to reply as a private message, react to supplied evidence, avoid promising exclusivity, and never mention prompts, scores or task stages.
- [ ] **Step 5: Implement `chatService.ts` using the OpenAI Responses API and Structured Outputs** so the provider must match the response schema. Parse again with Zod before returning.
- [ ] **Step 6: Inject the model client into `createApp`** so route tests use a deterministic fake and never make network calls.
- [ ] **Step 7: Write route tests** for valid response, provider timeout, provider error, invalid provider output and the per-IP limit of 20 requests per minute. Provider failures return HTTP 503 with `{ code: 'AI_UNAVAILABLE' }`; rate limits return HTTP 429; the frontend owns the immediate fallback. Keep the server stateless so conversation deletion is completed by clearing the local save.
- [ ] **Step 8: Add `.env.example`** containing only `OPENAI_API_KEY=`, `OPENAI_MODEL=`, `PORT=8787`; add the real `.env` and generated build output to `.gitignore`.
- [ ] **Step 9: Run** `npm test`, `npm run typecheck`, `npm run build` in `刷到你了/ai-server`; expected all exit 0.
- [ ] **Step 10: Commit** `feat(server): generate yanxin chat with structured outputs`.

### Task 8: 把聊天任务视频和录音笔接回新娘主线

**Files:**
- Modify: `刷到你了/web-prototype/src/relationship/taskEngine.ts`
- Modify: `刷到你了/web-prototype/src/content/items.ts`
- Modify: `刷到你了/web-prototype/src/content/nodes.ts`
- Modify: `刷到你了/web-prototype/src/content/triggers.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Test: `刷到你了/web-prototype/src/tests/relationship-task.test.ts`
- Test: `刷到你了/web-prototype/src/tests/complete-route.test.ts`
- Test: `刷到你了/web-prototype/src/tests/ai-main-loop.test.tsx`

- [ ] **Step 1: Write the failing end-to-end test** covering both PK choices and an AI-unavailable branch. Assert `E201` stays locked before task commitment, then unlocks once, recorder can only be discovered/bought there, one recorder used at `C001` yields `C101`, a second used at `W300` yields `W301`, and either投放顺序 works.
- [ ] **Step 2: Add the world-memory feedback** after `W300 + recorder`: `yanxin_evidence_method_helped_bride`. Make it available to later chat and ending, but never let the model invent it before the trigger occurs.
- [ ] **Step 3: Remove the recorder product from `K101`** while retaining a clue that complete context is stronger than a clipped fragment; confirm no dead product button remains.
- [ ] **Step 4: Preserve the existing projector source at `C101`** and the established `W301 + projector → W400` completion.
- [ ] **Step 5: Before playing `W301`, show a 1.5–2 second rewrite transition** reading `把录音笔送回握手发生之前`, so the player understands why a newly purchased device can record the earlier `W300` scene.
- [ ] **Step 6: Preserve all six existing wrong-result videos.** Explicitly test that an extra recorder bought after `E201` can still trigger `W301 + recorder → X016` without consuming the player’s only solvency path.
- [ ] **Step 7: Run the focused end-to-end, complete-route, content and trigger tests**; expected all parameterized routes pass.
- [ ] **Step 8: Commit** `feat(loop): return relationship video item to bride story`.

### Task 9: 生成一次性 AI 情感结局并开放后日谈

**Files:**
- Create: `刷到你了/web-prototype/src/ending/buildEndingSnapshot.ts`
- Create: `刷到你了/web-prototype/src/ending/EndingLetterSheet.tsx`
- Modify: `刷到你了/web-prototype/src/App.tsx`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/ai-server/src/contracts.ts`
- Create: `刷到你了/ai-server/src/prompts/ending.ts`
- Create: `刷到你了/ai-server/src/endingService.ts`
- Modify: `刷到你了/ai-server/src/app.ts`
- Test: `刷到你了/web-prototype/src/tests/ending.test.ts`
- Test: `刷到你了/ai-server/src/tests/ending-route.test.ts`

**Ending contract:**

```ts
interface EndingResponse {
  letter: string
  referencedMemoryIds: string[]
  futureClaimId: 'walk_tomorrow' | 'send_full_cut' | 'late_night_check_in'
  stance: 'careful_closeness' | 'mutual_trust' | 'playful_ambiguity'
}
```

- [ ] **Step 1: Write failing snapshot tests** proving only completed, server-approved memory IDs are exported; raw hidden evidence values, coins and inventory counts are excluded.
- [ ] **Step 2: Write failing ending-route tests** requiring 180–500 Chinese characters, at least two supplied memory references, exactly one future claim, and no claim that contradicts `postEnding` state.
- [ ] **Step 3: Implement `POST /api/ending`** with Structured Outputs and Zod revalidation. The prompt requests a private letter, not a score report; it may imply tomorrow meeting or continued contact but may not assert marriage, permanent exclusivity or events absent from memory.
- [ ] **Step 4: Add a handcrafted fallback letter matrix** keyed by PK choice and whether the recorder helped the bride; each variant references both the PK and wedding result.
- [ ] **Step 5: Generate only after `W400` completion and `E201` publication**. Save the first valid or fallback result under a generated UUID; subsequent opens read state and make zero requests.
- [ ] **Step 6: After closing the letter, keep messages enabled** and send future chat with `postEnding: true`; task engine ignores further unlock signals.
- [ ] **Step 7: Run frontend ending tests and server ending-route tests**; expected exit 0.
- [ ] **Step 8: Commit** `feat(ending): add personalized persistent yanxin letter`.

### Task 10: 完整回归、试玩验收与运行文档

**Files:**
- Modify: `刷到你了/web-prototype/README.md`
- Create: `刷到你了/ai-server/README.md`
- Modify: affected tests under `刷到你了/web-prototype/src/tests/`

- [ ] **Step 1: Document two-terminal local startup**:
  - terminal A: `cd 刷到你了/ai-server && npm install && npm run dev`
  - terminal B: `cd 刷到你了/web-prototype && npm install && npm run dev`
  - AI-offline check: stop terminal A and replay using fallback.
- [ ] **Step 2: Add a deterministic integration fixture** for `support`, `hold_back`, and AI-offline routes. Each must reach `W400`, persist one ending, and reopen chat afterward.
- [ ] **Step 3: Run frontend verification** from `刷到你了/web-prototype`:
  - `npm test` — all tests pass.
  - `npm run typecheck` — exit 0.
  - `npm run build` — exit 0 and Sites build preparation completes.
- [ ] **Step 4: Run server verification** from `刷到你了/ai-server`:
  - `npm test` — all tests pass without live API calls.
  - `npm run typecheck` — exit 0.
  - `npm run build` — exit 0.
- [ ] **Step 5: Manually play the Acceptance Scenario at mobile viewport 390×844** with AI server on and off. Record pass/fail for message scroll, keyboard overlap, unread badge, slight reply delay, proactive report after leaving chat, reload catch-up, absence of status/countdown UI, two separate E201 recorder purchases, insufficient-coins state, ending persistence and post-ending chat.
- [ ] **Step 6: Run the video asset gate** from `刷到你了/14_MVP视频资产变更与制作清单_V0.1.md`: confirm 14 existing videos still play, old `K101_v1` is never requested, five revised/new nodes use marked storyboards or approved new media, E101/E102 branch correctly, and the rewrite transition appears before W301.
- [ ] **Step 7: Run** `git diff --check` and `git status --short`; expected no whitespace errors and only intended files.
- [ ] **Step 8: Commit** `docs: add ai relationship loop runbook`.

---

## Release Gate

The MVP is ready for user testing only when all statements below are true:

- A tester can explain why炎鑫发布 `E201`，and why its recorder helps the bride, without reading design documentation.
- Neither PK choice blocks the relationship task, but the first private message and ending letter visibly differ.
- Free chat feels flexible while the character task remains fixed; three reasonable task-related messages always make progress.
- The relationship-derived product has one deterministic catalog identity and one bride-mainline use; AI never chooses either.
- Spending on PK cannot permanently block the wedding route.
- No screen displays affection, trust or pressure as a number or progress bar.
- Chat replies have a slight delay and task progress can arrive proactively, but no visible character status, typing label, countdown or real-time gate exists.
- The main route records two separate 30-coin recorder purchases from E201; no bundle shortcut exists.
- With the AI server offline, the same complete route and ending still work.
- With the AI server online, browser bundles and network payloads contain no OpenAI key.
- Ending reload is idempotent and post-ending chat does not reopen or mutate the finished mainline.
- No runtime path requests the contradictory `K101_ltx_raw_v1.mp4`; revised/new nodes satisfy the asset gate in document 14.

## Deliberately Deferred After MVP

- Multiple romanceable characters, simultaneous character tasks and character-to-character jealousy.
- Live or pseudo-live continuous streams; MVP uses only bounded video moments.
- AI-generated video, products, missions, wedding triggers or unrestricted world facts.
- Account-management simulation, repeatable creator income, ranking ladders and long-term economy balancing.
- Commercial authentication, cloud saves, anti-cheat, payments, moderation operations dashboard and production analytics.
- Additional entertainment templates such as dancing thank-you, encore, missed anniversary, sick-stream check-in and public rumor rescue.

## Implementation References

- OpenAI Structured Outputs guide: <https://developers.openai.com/api/docs/guides/structured-outputs>
- OpenAI JavaScript SDK libraries guide: <https://developers.openai.com/api/docs/libraries>
- OpenAI conversation state guide: <https://developers.openai.com/api/docs/guides/conversation-state>
- OpenAI production best practices: <https://developers.openai.com/api/docs/guides/production-best-practices>
