# Yanxin Contextual Dialogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed Yanxin dialogue with context-driven DeepSeek turns, grounded task facts, contextual short-answer progression, and server-side repetition rejection.

**Architecture:** Add explicit chat turn kinds and server-derived scene directives to the existing structured AI request. Keep task transitions deterministic and treat model evidence as validated candidates; proactive character messages use the same AI endpoint, while failures are rendered as non-character system notices. Add a small reply-quality module that retries repetitive model output once inside the existing request timeout.

**Tech Stack:** TypeScript, React 19, Express, Zod, Vitest, DeepSeek OpenAI-compatible chat completions

## Global Constraints

- Fixed facts and goals are allowed; fixed Yanxin dialogue is not.
- The latest player message has priority over task advancement.
- `first_contact` and `progress_report` cannot emit player-grounded effects.
- Provider failures must not impersonate Yanxin.
- Preserve current hidden relationship dimensions, task safety validation, delayed delivery, persistence, and mobile LAN testing.

---

### Task 1: Define grounded turn kinds and scene directives

**Files:**
- Modify: `刷到你了/ai-server/src/contracts.ts`
- Modify: `刷到你了/ai-server/src/allowedContext.ts`
- Modify: `刷到你了/ai-server/src/prompts/yanxin.ts`
- Modify: `刷到你了/ai-server/src/tests/contracts.test.ts`

**Interfaces:**
- Consumes: existing `ChatRequestSchema`, `buildAllowedContext`, `createYanxinPrompt`
- Produces: required `turnKind: 'first_contact' | 'player_message' | 'progress_report'` and a server-derived `currentTurn` directive

- [ ] **Step 1: Write failing contract tests**

```ts
expect(ChatRequestSchema.safeParse({ ...validRequest, turnKind: 'first_contact', userText: '' }).success).toBe(true)
expect(ChatRequestSchema.safeParse({ ...validRequest, turnKind: 'player_message', userText: '' }).success).toBe(false)
expect(createYanxinPrompt(firstContactContext).currentTurn).toMatchObject({
  kind: 'first_contact',
  playerHasSeenCirculatingClip: false,
  uncutEvidenceStatus: 'missing',
})
```

- [ ] **Step 2: Run `npm test -- src/tests/contracts.test.ts` in `刷到你了/ai-server` and verify RED because `turnKind` is rejected.**

- [ ] **Step 3: Add the request invariant and server-owned directives.**

```ts
export const ChatTurnKinds = ['first_contact', 'player_message', 'progress_report'] as const

// player_message requires non-empty userText; event turns require empty userText.
// event turns reject all player-grounded evidence arrays.
```

- [ ] **Step 4: Update prompt rules to say facts and goals are not dialogue, first contact must establish context, and unavailable evidence cannot be claimed as owned.**

- [ ] **Step 5: Run the focused server tests and verify GREEN.**

### Task 2: Ground short acknowledgements and reject repeated replies

**Files:**
- Create: `刷到你了/ai-server/src/replyQuality.ts`
- Create: `刷到你了/ai-server/src/tests/replyQuality.test.ts`
- Modify: `刷到你了/ai-server/src/contracts.ts`
- Modify: `刷到你了/ai-server/src/chatService.ts`
- Modify: `刷到你了/ai-server/src/tests/chatService.test.ts`

**Interfaces:**
- Produces: `isRepetitiveReply(replyText: string, recentMessages: ChatRequest['recentMessages']): boolean`
- Extends: `FallbackReason` with `repetitive_provider_output`

- [ ] **Step 1: Write failing tests for exact repetition, punctuation-only variation, high-similarity repetition, and distinct short replies.**

```ts
expect(isRepetitiveReply('我会把前后说完。', history('我会把前后说完。'))).toBe(true)
expect(isRepetitiveReply('我会把前后说完！', history('我会把前后说完。'))).toBe(true)
expect(isRepetitiveReply('好。', history('好。'))).toBe(true)
expect(isRepetitiveReply('先回答你刚才的问题。', history('我会把前后说完。'))).toBe(false)
```

- [ ] **Step 2: Run `npm test -- src/tests/replyQuality.test.ts` and verify RED because the module does not exist.**

- [ ] **Step 3: Implement normalized equality plus bigram Dice similarity `>= 0.86` for normalized replies of at least eight characters.**

- [ ] **Step 4: Write and run a failing chat-service test proving the first duplicate is regenerated and a second duplicate becomes `repetitive_provider_output`.**

- [ ] **Step 5: Integrate the quality check inside the existing two-attempt request budget, using static repair guidance without copying user or model text.**

- [ ] **Step 6: Extend semantic evidence grounding so a short affirmative reply only counts when the immediately preceding assistant message contains a concrete evidence-plan invitation.**

- [ ] **Step 7: Run all server tests and verify GREEN.**

### Task 3: Generate proactive messages and remove fixed character fallbacks

**Files:**
- Modify: `刷到你了/web-prototype/src/messages/aiClient.ts`
- Modify: `刷到你了/web-prototype/src/messages/types.ts`
- Modify: `刷到你了/web-prototype/src/messages/MessageSheet.tsx`
- Modify: `刷到你了/web-prototype/src/game/GameProvider.tsx`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Modify: `刷到你了/web-prototype/src/messages/character.ts`
- Modify: `刷到你了/web-prototype/src/styles/relationship.css`
- Modify: `刷到你了/web-prototype/src/tests/message-flow.test.tsx`
- Modify: `刷到你了/web-prototype/src/tests/message-ai-flow.test.tsx`
- Modify: `刷到你了/web-prototype/src/tests/message-delivery.test.ts`

**Interfaces:**
- `requestYanxinReply` accepts all three `turnKind` values.
- `ChatRole` gains `system`; system messages are filtered out of model history.
- `GameProvider` owns one-shot `first_contact` and `progress_report` requests.

- [ ] **Step 1: Write failing UI tests proving PK resolution calls `/api/chat` with `first_contact`, displays returned AI text, and contains neither authored first-contact line.**

- [ ] **Step 2: Write failing UI tests proving committed state calls `progress_report` and unlocks `E201` only when the generated report is delivered.**

- [ ] **Step 3: Write failing UI tests proving provider failure creates a `system` notice and never calls `getYanxinFallbackReply`.**

- [ ] **Step 4: Run focused web tests and verify RED.**

- [ ] **Step 5: Remove `createYanxinFirstContact` from `FeedScreen`; request proactive turns from `GameProvider`, scheduling returned text with empty AI effects and the existing deterministic delivery effect.**

- [ ] **Step 6: Remove live use of persona fallback lines. Use the fixed copy only for `role: 'system'` delivery failures, and exclude system messages from `recentMessages`.**

- [ ] **Step 7: Update persistence guards and styles for `ChatRole = 'user' | 'assistant' | 'system'`.**

- [ ] **Step 8: Run focused web tests and verify GREEN.**

### Task 4: Full verification and live DeepSeek smoke test

**Files:**
- Modify if needed: `刷到你了/qa/mobile-lan-testing.md`

- [ ] **Step 1: Run server verification.**

```powershell
cd 刷到你了/ai-server
npm test
npm run typecheck
npm run build
```

- [ ] **Step 2: Run web verification.**

```powershell
cd 刷到你了/web-prototype
npm test
npm run typecheck
npm run build
```

- [ ] **Step 3: Run `git diff --check` and scan the diff for API-key-like values.**

- [ ] **Step 4: Start the real DeepSeek server and LAN Vite server, then test `first_contact`, a normal question, a contextual “好啊”, a repetition challenge, and `progress_report`.**

- [ ] **Step 5: Record the current Network URL and provide the user with reset-and-test steps for a fresh first-contact flow.**

