# Yanxin Reply Relevance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Yanxin answer the player's latest message before connecting to the evidence task, and only connect that task when contextually relevant.

**Architecture:** Keep the existing single DeepSeek call and all schema/domain guards. Change only the server-owned Yanxin system prompt and add prompt-contract regression coverage.

**Tech Stack:** TypeScript, Vitest, OpenAI-compatible DeepSeek Chat Completions

## Global Constraints

- Preserve character identity, safety boundaries, stage-specific task signal rules, and structured-output validation.
- Do not add a second model call, intent classifier, or frontend state.
- Ambiguous messages should receive a natural clarifying question instead of invented plot progression.

---

### Task 1: Enforce latest-message relevance in the Yanxin prompt

**Files:**
- Modify: `刷到你了/ai-server/src/tests/contracts.test.ts`
- Modify: `刷到你了/ai-server/src/prompts/yanxin.ts`

**Interfaces:**
- Consumes: `createYanxinPrompt(context: AllowedContext): string`
- Produces: the same prompt function with revised response-priority instructions; no API change

- [ ] **Step 1: Write the failing prompt-contract test**

```ts
it('prioritizes the latest player message and only connects the task when relevant', () => {
  const text = createYanxinPrompt(buildAllowedContext(ChatRequestSchema.parse(validRequest)))
  expect(text).toContain('第一优先级是直接回应玩家最新一条消息')
  expect(text).toContain('只有玩家当前话题与任务相关时')
  expect(text).toContain('含义不清时')
  expect(text).not.toContain('并自然回到完整证据的方向')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/tests/contracts.test.ts`

Expected: FAIL because the three new relevance phrases are absent and the old unconditional task phrase remains.

- [ ] **Step 3: Make the minimal prompt change**

Replace the unconditional response rule in `createYanxinPrompt` with:

```ts
'- 第一优先级是直接回应玩家最新一条消息，不要跳过问题、情绪或闲聊去重复任务。',
'- 只有玩家当前话题与任务相关时，才可以自然连接完整证据；普通闲聊和情绪表达可以只回应当下。',
'- 玩家消息含义不清时，先结合最近对话理解；仍不清楚就自然追问，不得自行播放剧情。',
```

- [ ] **Step 4: Run focused and complete verification**

Run: `npm test -- src/tests/contracts.test.ts && npm test && npm run typecheck && npm run build`

Expected: 61 tests pass; typecheck and build exit 0.

- [ ] **Step 5: Run two real-provider smoke requests**

Send one ordinary question and one evidence-related question through `http://127.0.0.1:4173/api/chat`. Expected: the ordinary answer does not introduce PK/evidence unprompted; the related answer may discuss evidence. Never log the API key.

- [ ] **Step 6: Commit and push**

```powershell
git add -- docs/superpowers/plans/2026-07-21-yanxin-reply-relevance.md 刷到你了/ai-server/src/tests/contracts.test.ts 刷到你了/ai-server/src/prompts/yanxin.ts
git commit -m "fix(server): prioritize relevant yanxin replies"
git push origin feat/phase-a-deterministic-core
```
