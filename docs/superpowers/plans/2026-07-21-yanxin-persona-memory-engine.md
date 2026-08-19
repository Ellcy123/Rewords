# Yanxin Persona and Memory Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the task-dominated Yanxin chat implementation with an evidence-based persona, relationship, and memory engine that produces varied streamer-like replies without fixed stage lines.

**Architecture:** The browser keeps the MVP save-authoritative relationship and memory state, builds a bounded persona snapshot, and sends it with recent chat to the AI server. The server injects the stable Yanxin profile, validates structured reply candidates, and returns evidence rather than state mutations; deterministic frontend engines apply accepted evidence, persist memory, and migrate task state.

**Tech Stack:** React 19, TypeScript, Vitest, Zod, Express, DeepSeek/OpenAI provider adapters, localStorage persistence

## Global Constraints

- System-owned facts, task transitions, relationship settlement, and memory persistence remain deterministic.
- AI output is candidate evidence only; it cannot change coins, inventory, nodes, task stages, or relationship values directly.
- Task stage and relationship identity are separate state machines.
- The reply priority is: latest player message, current relationship, open loops, character life, then a contextually relevant task.
- Ordinary chat and fallback replies never advance the evidence task by turn count.
- The MVP uses one model call per reply and keeps the existing provider timeout and safe fallback boundary.
- Hidden relationship dimensions and debug data are never shown in the normal player UI.
- Existing version 4 saves load into version 5 without losing story, economy, chat, or ending progress.

---

# Batch A: Persona State, Relationship Evidence, and Persistent Memory

### Task 1: Add version 5 persona and relationship state

**Files:**
- Create: `刷到你了/web-prototype/src/relationship/personaState.ts`
- Modify: `刷到你了/web-prototype/src/engine/state.ts`
- Modify: `刷到你了/web-prototype/src/engine/persistence.ts`
- Test: `刷到你了/web-prototype/src/tests/persistence.test.ts`
- Test: `刷到你了/web-prototype/src/tests/relationship-persona.test.ts`

**Interfaces:**
- Produces: `RelationshipDimension`, `RelationshipIdentity`, `RelationshipState`, `YanxinShortTermState`, `createYanxinPersonaState()`
- Consumed by: Tasks 2, 4, 5, 7, and 9

- [ ] **Step 1: Write failing state and migration tests**

```ts
it('starts Yanxin as a noticed viewer with neutral bounded dimensions', () => {
  const state = createInitialState()
  expect(state.yanxinPersona.relationship.identity).toBe('new_viewer')
  expect(state.yanxinPersona.relationship.dimensions).toEqual({
    closeness: 0, trust: 0, respect: 0, suspicion: 0, boundaryPressure: 0,
  })
})

it('migrates a version 4 save without losing chat or task progress', () => {
  const message = { id: 'user-legacy', role: 'user' as const, text: '你先查清楚。', createdAt: 10 }
  const legacy = { ...createInitialState(), version: 4, messages: [message] }
  delete (legacy as Partial<GameState>).yanxinPersona
  storage.setItem(SAVE_KEY, JSON.stringify(legacy))
  const loaded = loadGame(storage)
  expect(loaded.kind).toBe('loaded')
  if (loaded.kind !== 'loaded') return
  expect(loaded.state.version).toBe(5)
  expect(loaded.state.messages).toEqual([message])
  expect(loaded.state.yanxinPersona.relationship.identity).toBe('new_viewer')
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/tests/persistence.test.ts src/tests/relationship-persona.test.ts`

Expected: FAIL because `yanxinPersona` and the version 5 migration do not exist.

- [ ] **Step 3: Add the minimal persona state types**

```ts
export type RelationshipDimension = 'closeness' | 'trust' | 'respect' | 'suspicion' | 'boundaryPressure'
export type RelationshipIdentity = 'new_viewer' | 'familiar_fan' | 'important_supporter' | 'private_relationship'
export type RelationshipEvidenceKind = 'showed_specific_care' | 'respected_boundary' | 'offered_actionable_help' | 'kept_promise' | 'contradicted_action_evidence' | 'revealed_unexplained_knowledge' | 'pressured_after_refusal' | 'public_financial_support'

export interface RelationshipChange {
  id: string
  dimension: RelationshipDimension
  delta: -2 | -1 | 1 | 2
  sourceId: string
  evidenceKind: RelationshipEvidenceKind
  createdAt: number
}

export interface YanxinPersonaState {
  relationship: {
    identity: RelationshipIdentity
    dimensions: Record<RelationshipDimension, number>
    changes: RelationshipChange[]
  }
  shortTerm: {
    emotion: 'guarded' | 'steady' | 'warm' | 'pressured'
    currentActivity: 'post_pk' | 'reviewing_footage' | 'testing_device' | 'following_up'
  }
}
```

Initialize every dimension to `0`, identity to `new_viewer`, emotion to `guarded`, and activity to `post_pk`. Clamp persisted dimensions to `-5..5`, bound change history to the newest 20 entries, set `GameState.version` to `5`, and normalize versions 2 through 5 into version 5.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/tests/persistence.test.ts src/tests/relationship-persona.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Batch A state foundation**

```powershell
git add -- '刷到你了/web-prototype/src/relationship/personaState.ts' '刷到你了/web-prototype/src/engine/state.ts' '刷到你了/web-prototype/src/engine/persistence.ts' '刷到你了/web-prototype/src/tests/persistence.test.ts' '刷到你了/web-prototype/src/tests/relationship-persona.test.ts'
git commit -m "feat(state): add yanxin persona relationship state"
```

### Task 2: Settle relationship evidence deterministically

**Files:**
- Create: `刷到你了/web-prototype/src/relationship/relationshipEngine.ts`
- Modify: `刷到你了/web-prototype/src/relationship/personaState.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Test: `刷到你了/web-prototype/src/tests/relationship-persona.test.ts`

**Interfaces:**
- Consumes: `YanxinPersonaState`, `RelationshipEvidenceKind`
- Produces: `RelationshipEvidenceCandidate`, `applyRelationshipEvidence(state, evidence, createdAt)`

- [ ] **Step 1: Write failing evidence and identity tests**

```ts
it('treats care and respected boundaries as evidence, not AI-authored scores', () => {
  let persona = createYanxinPersonaState()
  persona = applyRelationshipEvidence(persona, {
    kind: 'showed_specific_care', sourceMessageId: 'user-1',
  }, 100).state
  persona = applyRelationshipEvidence(persona, {
    kind: 'respected_boundary', sourceMessageId: 'user-2',
  }, 200).state
  expect(persona.relationship.dimensions.trust).toBe(1)
  expect(persona.relationship.dimensions.respect).toBe(2)
  expect(persona.relationship.changes.every(change => change.sourceId.startsWith('user-'))).toBe(true)
})

it('does not make one purchase or one compliment a private relationship', () => {
  const result = applyRelationshipEvidence(createYanxinPersonaState(), {
    kind: 'public_financial_support', sourceMessageId: 'moment-pk',
  }, 100)
  expect(result.state.relationship.identity).not.toBe('private_relationship')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/tests/relationship-persona.test.ts`

Expected: FAIL because evidence settlement is absent.

- [ ] **Step 3: Implement the evidence map and identity derivation**

```ts
const EFFECTS: Record<RelationshipEvidenceKind, Partial<Record<RelationshipDimension, -2 | -1 | 1 | 2>>> = {
  showed_specific_care: { trust: 1, closeness: 1 },
  respected_boundary: { respect: 2, boundaryPressure: -1 },
  offered_actionable_help: { trust: 1, respect: 1 },
  kept_promise: { trust: 2, respect: 1 },
  contradicted_action_evidence: { trust: -1, suspicion: 1 },
  revealed_unexplained_knowledge: { suspicion: 2 },
  pressured_after_refusal: { respect: -1, boundaryPressure: 2 },
  public_financial_support: { closeness: 1, boundaryPressure: 1 },
}
```

Derive identities with evidence gates, not one dimension alone: `familiar_fan` requires at least two accepted sources; `important_supporter` requires trust and respect plus a game-event source; `private_relationship` requires closeness, trust, respect, at least four distinct sources, and boundary pressure below 3. Deduplicate by `kind + sourceMessageId` and clamp dimensions to `-5..5`.

- [ ] **Step 4: Apply initial PK evidence through the reducer**

When `MOMENT_RESOLVED` records support, apply `public_financial_support`; when it records hold-back, write no negative evidence. Preserve the existing public moment evidence used by story logic.

- [ ] **Step 5: Run relationship and reducer tests**

Run: `npm test -- src/tests/relationship-persona.test.ts src/tests/reducer.test.ts src/tests/relationship-task.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit deterministic relationship settlement**

```powershell
git add -- '刷到你了/web-prototype/src/relationship/personaState.ts' '刷到你了/web-prototype/src/relationship/relationshipEngine.ts' '刷到你了/web-prototype/src/engine/reducer.ts' '刷到你了/web-prototype/src/tests/relationship-persona.test.ts' '刷到你了/web-prototype/src/tests/reducer.test.ts'
git commit -m "feat(relationship): settle persona evidence deterministically"
```

### Task 3: Add open loops and structured long-term memory

**Files:**
- Create: `刷到你了/web-prototype/src/messages/memory.ts`
- Modify: `刷到你了/web-prototype/src/messages/types.ts`
- Modify: `刷到你了/web-prototype/src/engine/state.ts`
- Modify: `刷到你了/web-prototype/src/engine/persistence.ts`
- Test: `刷到你了/web-prototype/src/tests/message-memory.test.ts`
- Test: `刷到你了/web-prototype/src/tests/persistence.test.ts`

**Interfaces:**
- Produces: `LongTermMemory`, `OpenLoop`, `MemoryCandidate`, `OpenLoopUpdate`, `applyMemoryCandidates()`, `applyOpenLoopUpdates()`
- Consumed by: Tasks 4, 5, 7, and 9

- [ ] **Step 1: Write failing grounding, deduplication, and persistence tests**

```ts
it('stores source text separately from Yanxin interpretation and deduplicates the source', () => {
  const messages = [{ id: 'user-1', role: 'user' as const, text: '你先核对，我等你。', createdAt: 10 }]
  const candidate = {
    type: 'promise', sourceMessageId: 'user-1', interpretation: '玩家答应等我核对完再判断。',
  } as const
  const result = applyMemoryCandidates([], [candidate], messages, 20)
  expect(result).toHaveLength(1)
  expect(result[0].sourceText).toBe('你先核对，我等你。')
  expect(applyMemoryCandidates(result, [candidate], messages, 30)).toHaveLength(1)
})

it('rejects a memory candidate whose source message is absent', () => {
  expect(applyMemoryCandidates([], [{
    type: 'shared_joke', sourceMessageId: 'missing', interpretation: '不存在的玩笑',
  }], [], 20)).toEqual([])
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- src/tests/message-memory.test.ts src/tests/persistence.test.ts`

Expected: FAIL because structured memories and open loops are absent.

- [ ] **Step 3: Implement bounded memory structures**

```ts
export type MemoryType = 'player_stance' | 'promise' | 'shared_joke' | 'conflict' | 'preference'
export interface LongTermMemory {
  id: string
  type: MemoryType
  sourceMessageId: string
  sourceText: string
  interpretation: string
  createdAt: number
  lastReferencedAt: number
  active: boolean
}
export interface OpenLoop {
  id: string
  kind: 'promise' | 'topic' | 'conflict' | 'report'
  summary: string
  sourceMessageId: string
  status: 'open' | 'closed'
  createdAt: number
}
```

Accept only candidates whose `sourceMessageId` resolves to a real player message; limit interpretation and summary to 120 code points; deduplicate memory by `type + sourceMessageId`; retain at most 30 active memories and 10 open loops. Add both arrays to `GameState`, persistence normalization, and version 5 migration.

- [ ] **Step 4: Run memory and persistence tests**

Run: `npm test -- src/tests/message-memory.test.ts src/tests/persistence.test.ts`

Expected: PASS.

- [ ] **Step 5: Run the complete frontend suite for Batch A**

Run: `npm test && npm run typecheck && npm run build`

Expected: all frontend tests pass; typecheck and build exit 0.

- [ ] **Step 6: Commit persistent memory**

```powershell
git add -- '刷到你了/web-prototype/src/messages/memory.ts' '刷到你了/web-prototype/src/messages/types.ts' '刷到你了/web-prototype/src/engine/state.ts' '刷到你了/web-prototype/src/engine/persistence.ts' '刷到你了/web-prototype/src/tests/message-memory.test.ts' '刷到你了/web-prototype/src/tests/persistence.test.ts'
git commit -m "feat(memory): persist yanxin memories and open loops"
```

---

# Batch B: Persona Context and Structured AI Evidence

### Task 4: Replace the chat protocol with persona snapshots and evidence candidates

**Files:**
- Modify: `刷到你了/ai-server/src/contracts.ts`
- Modify: `刷到你了/web-prototype/src/messages/aiClient.ts`
- Modify: `刷到你了/web-prototype/src/messages/MessageSheet.tsx`
- Test: `刷到你了/ai-server/src/tests/contracts.test.ts`
- Test: `刷到你了/web-prototype/src/tests/ai-client.test.ts`

**Interfaces:**
- Produces request fields: `currentMessageId`, `personaSnapshot`, `memories`, `openLoops`
- Produces response fields: `replyText`, `tone`, `characterIntents`, `taskEvidence`, `relationshipEvidence`, `memoryCandidates`, `openLoopUpdates`

- [ ] **Step 1: Write failing mirrored contract tests**

```ts
expect(ChatRequestSchema.parse(validRequest).personaSnapshot.relationshipIdentity).toBe('new_viewer')
expect(ChatResponseSchema.parse(validResponse)).toEqual(expect.objectContaining({
  characterIntents: ['fan_maintenance'],
  taskEvidence: [],
  relationshipEvidence: [],
  memoryCandidates: [],
  openLoopUpdates: [],
}))
```

Frontend tests must assert that `requestYanxinReply()` sends the current message ID, five bounded dimension values, at most 10 memories, at most 5 open loops, and at most 12 recent messages.

- [ ] **Step 2: Run server and frontend contract tests and verify RED**

Run server: `npm test -- src/tests/contracts.test.ts`

Run frontend: `npm test -- src/tests/ai-client.test.ts`

Expected: both fail on missing protocol fields.

- [ ] **Step 3: Define strict enums and bounded schemas on both sides**

Use these exact intent enums:

```ts
type CharacterIntent = 'fan_maintenance' | 'thank' | 'banter' | 'probe' | 'explain' | 'share' | 'confirm_promise' | 'set_boundary' | 'handle_conflict' | 'end_topic' | 'advance_task'
type TaskEvidenceKind = 'recognized_malicious_editing' | 'accepted_complete_evidence_plan'
```

Reuse the `RelationshipEvidenceKind` and memory/open-loop candidate shapes from Batch A. Request schemas accept dimension integers only in `-5..5`, relationship identities from the four-value enum, memory/open-loop IDs and bounded text, and no extra fields. Response schemas require all seven fields, at most two intents, two task evidence entries, three relationship entries, two memory candidates, and two open-loop updates.

- [ ] **Step 4: Build the bounded request in `MessageSheet`**

Pass the newly dispatched message ID as `currentMessageId`, the current relationship identity and dimensions, short-term state, the newest 10 active memories, the newest 5 open loops, and the existing recent-message window. Keep `allowedMemoryIds` for verified game-event memories until Task 7 migrates all consumers.

- [ ] **Step 5: Run mirrored contract tests**

Run server: `npm test -- src/tests/contracts.test.ts`

Run frontend: `npm test -- src/tests/ai-client.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the protocol migration**

```powershell
git add -- '刷到你了/ai-server/src/contracts.ts' '刷到你了/ai-server/src/tests/contracts.test.ts' '刷到你了/web-prototype/src/messages/aiClient.ts' '刷到你了/web-prototype/src/messages/MessageSheet.tsx' '刷到你了/web-prototype/src/tests/ai-client.test.ts'
git commit -m "feat(ai): add persona and evidence chat protocol"
```

### Task 5: Inject the Yanxin profile and eight-layer context

**Files:**
- Create: `刷到你了/ai-server/src/persona/yanxinProfile.ts`
- Modify: `刷到你了/ai-server/src/allowedContext.ts`
- Modify: `刷到你了/ai-server/src/prompts/yanxin.ts`
- Test: `刷到你了/ai-server/src/tests/contracts.test.ts`

**Interfaces:**
- Produces: `YANXIN_PROFILE`, expanded `AllowedContext`, and `createYanxinPrompt(context)`
- Consumes: the strict request from Task 4

- [ ] **Step 1: Write failing persona-context tests**

```ts
it('injects streamer identity, relationship, open loops, and memory without fixed stage lines', () => {
  const context = buildAllowedContext(ChatRequestSchema.parse(validRequest))
  const prompt = createYanxinPrompt(context)
  expect(prompt).toContain('短视频平台男主播')
  expect(prompt).toContain('主播维护不是无条件讨好')
  expect(prompt).toContain('当前关系身份：新认识的观众')
  expect(prompt).toContain('第一优先级是回应玩家最新消息')
  expect(prompt).toContain('未完事项')
  expect(prompt).toContain('共同记忆')
  expect(prompt).not.toContain('本阶段必须说')
})
```

Add a second test proving that the same user text receives different context blocks for `new_viewer` and `important_supporter`, while stable identity remains identical.

- [ ] **Step 2: Run the server test and verify RED**

Run: `npm test -- src/tests/contracts.test.ts`

Expected: FAIL because the complete profile and context blocks are absent.

- [ ] **Step 3: Define the stable profile as behavior constraints**

`YANXIN_PROFILE` must contain identity, public face, private face, motivations, defense style, money attitude, boundaries, language fingerprint, and fan-maintenance tendencies. It must not contain required reply sentences or relationship-stage scripts.

- [ ] **Step 4: Rebuild the prompt in decision order**

The prompt must present: facts and knowledge boundary, stable profile, public/private scene, relationship identity and dimension interpretation, short-term state, open loops, verified memories, recent chat, current message, then the decision priority. Require the model to choose one or two intents before writing, but return only the structured JSON response.

- [ ] **Step 5: Run prompt and provider adapter tests**

Run: `npm test -- src/tests/contracts.test.ts`

Expected: PASS, including existing DeepSeek JSON-output and stage-safety coverage.

- [ ] **Step 6: Commit the persona context**

```powershell
git add -- '刷到你了/ai-server/src/persona/yanxinProfile.ts' '刷到你了/ai-server/src/allowedContext.ts' '刷到你了/ai-server/src/prompts/yanxin.ts' '刷到你了/ai-server/src/tests/contracts.test.ts'
git commit -m "feat(ai): inject yanxin persona and relationship context"
```

### Task 6: Validate grounded model evidence

**Files:**
- Modify: `刷到你了/ai-server/src/contracts.ts`
- Modify: `刷到你了/ai-server/src/chatService.ts`
- Test: `刷到你了/ai-server/src/tests/contracts.test.ts`
- Test: `刷到你了/ai-server/src/tests/chat-route.test.ts`

**Interfaces:**
- Produces: `parseChatResponseForRequest(request, candidate)` that removes or rejects ungrounded candidates while preserving a valid reply
- Consumed by: Task 7

- [ ] **Step 1: Write failing grounding tests**

```ts
it('rejects task evidence that does not cite the current player message', () => {
  expect(() => parseChatResponseForRequest(validRequest, {
    ...validResponse,
    taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: 'missing' }],
  })).toThrow()
})

it('accepts ordinary chat with no task evidence or memory writes', () => {
  expect(parseChatResponseForRequest(validRequest, {
    ...validResponse,
    replyText: '今天还行，你呢？',
    characterIntents: ['fan_maintenance'],
  }).taskEvidence).toEqual([])
})
```

Also cover: memory source must be a real player message; open-loop close must target a supplied open loop; task evidence kind must match the current task stage; relationship evidence cannot cite an assistant message; output cannot contain AI-authored scores.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/tests/contracts.test.ts src/tests/chat-route.test.ts`

Expected: FAIL on ungrounded evidence acceptance.

- [ ] **Step 3: Add cross-field grounding validation**

Build a request-owned set of player message IDs from `currentMessageId` and recent user messages. Require all relationship, task, and memory candidates to cite that set. Require task evidence to cite `currentMessageId` so old chat cannot repeatedly advance a task. Require open-loop closure IDs to exist in the request.

- [ ] **Step 4: Preserve provider failure behavior**

Malformed JSON, invalid reply text, invalid enums, or ungrounded state-changing evidence must still produce the existing `invalid_provider_output` 503 route result. Never return a partially trusted state mutation.

- [ ] **Step 5: Run the complete server suite**

Run: `npm test && npm run typecheck && npm run build`

Expected: all server tests pass; typecheck and build exit 0.

- [ ] **Step 6: Commit grounded validation**

```powershell
git add -- '刷到你了/ai-server/src/contracts.ts' '刷到你了/ai-server/src/chatService.ts' '刷到你了/ai-server/src/tests/contracts.test.ts' '刷到你了/ai-server/src/tests/chat-route.test.ts'
git commit -m "feat(ai): validate grounded persona evidence"
```

---

# Batch C: Deterministic Settlement, Fallback, Debugging, and Acceptance

### Task 7: Apply accepted evidence and remove turn-count task progress

**Files:**
- Modify: `刷到你了/web-prototype/src/relationship/taskEngine.ts`
- Modify: `刷到你了/web-prototype/src/messages/types.ts`
- Modify: `刷到你了/web-prototype/src/messages/MessageSheet.tsx`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/web-prototype/src/engine/persistence.ts`
- Test: `刷到你了/web-prototype/src/tests/relationship-task.test.ts`
- Test: `刷到你了/web-prototype/src/tests/message-ai-flow.test.tsx`
- Test: `刷到你了/web-prototype/src/tests/message-memory.test.ts`

**Interfaces:**
- Consumes: validated AI evidence from Task 6
- Produces: `applyTaskEvidence()`, delivery-carried AI effects, and persisted evidence provenance

- [ ] **Step 1: Write the failing no-auto-progress regression test**

```ts
it('does not advance an invited task after any number of ordinary replies', () => {
  let state = invitedState()
  for (let index = 0; index < 5; index += 1) {
    state = gameReducer(state, deliveredReply({ taskEvidence: [] }, index))
  }
  expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('invited')
})

it('advances only from grounded task evidence and records its source', () => {
  const state = gameReducer(invitedState(), deliveredReply({
    taskEvidence: [{ kind: 'recognized_malicious_editing', sourceMessageId: 'user-editing' }],
  }, 1))
  expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.stage).toBe('understood')
  expect(state.characterTasks.YANXIN_UNCUT_EVIDENCE.lastEvidenceSourceId).toBe('user-editing')
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- src/tests/relationship-task.test.ts src/tests/message-ai-flow.test.tsx`

Expected: FAIL because `recordTaskRelevantFallback()` still advances by reply count and deliveries carry only legacy signals.

- [ ] **Step 3: Replace signals with evidence-backed transitions**

Use `recognized_malicious_editing` only for `invited → understood` and `accepted_complete_evidence_plan` only for `understood → committed`. Store `lastEvidenceSourceId` and remove `relevantFallbackTurns` and `recordTaskRelevantFallback()` from new state and reducer paths. Version 5 normalization may read the legacy field but must not use it.

- [ ] **Step 4: Apply all accepted candidates at delivery time**

Extend `PendingChatDelivery` with an `aiEffects` object containing task, relationship, memory, and open-loop candidates. On `CHAT_DUE_DELIVERIES_FLUSHED`, append the message first, then apply each deterministic engine exactly once using source IDs and candidate deduplication.

- [ ] **Step 5: Run task, memory, reducer, and AI flow tests**

Run: `npm test -- src/tests/relationship-task.test.ts src/tests/message-memory.test.ts src/tests/reducer.test.ts src/tests/message-ai-flow.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit evidence-backed settlement**

```powershell
git add -- '刷到你了/web-prototype/src/relationship/taskEngine.ts' '刷到你了/web-prototype/src/messages/types.ts' '刷到你了/web-prototype/src/messages/MessageSheet.tsx' '刷到你了/web-prototype/src/engine/reducer.ts' '刷到你了/web-prototype/src/engine/persistence.ts' '刷到你了/web-prototype/src/tests/relationship-task.test.ts' '刷到你了/web-prototype/src/tests/message-ai-flow.test.tsx' '刷到你了/web-prototype/src/tests/message-memory.test.ts'
git commit -m "feat(chat): settle grounded ai evidence"
```

### Task 8: Replace fixed fallback lines with a persona-aware fallback pool

**Files:**
- Modify: `刷到你了/web-prototype/src/messages/fallbackReplies.ts`
- Modify: `刷到你了/web-prototype/src/messages/MessageSheet.tsx`
- Modify: `刷到你了/web-prototype/src/messages/character.ts`
- Modify: `刷到你了/web-prototype/src/engine/state.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/web-prototype/src/engine/persistence.ts`
- Test: `刷到你了/web-prototype/src/tests/message-ai-flow.test.tsx`
- Test: `刷到你了/web-prototype/src/tests/message-flow.test.tsx`

**Interfaces:**
- Produces: `getYanxinFallbackReply(context, variationSeed): FallbackReply`
- Guarantees: fallback `aiEffects` is empty

- [ ] **Step 1: Write failing variation and safety tests**

```ts
it('varies fallback by relationship identity and topic without state effects', () => {
  const first = getYanxinFallbackReply(fallbackContext({ identity: 'new_viewer', topic: 'care' }), 0)
  const second = getYanxinFallbackReply(fallbackContext({ identity: 'important_supporter', topic: 'care' }), 0)
  expect(first.text).not.toBe(second.text)
  expect(first.aiEffects).toEqual(emptyAiEffects)
  expect(second.aiEffects).toEqual(emptyAiEffects)
})
```

Add coverage for support/hold-back choice, boundary pressure, task-related topic, ordinary chat, and no repeated text for two adjacent deterministic seeds.

- [ ] **Step 2: Run fallback tests and verify RED**

Run: `npm test -- src/tests/message-ai-flow.test.tsx src/tests/message-flow.test.tsx`

Expected: FAIL because fallback is one fixed line per task stage and emits task signals.

- [ ] **Step 3: Implement behavior-purpose pools**

Create pools for `receive_care`, `respect_hold_back`, `thank_support`, `set_spending_boundary`, `acknowledge_task`, `continue_open_loop`, and `ordinary_chat`. Select a pool from latest-message topic using a small deterministic classifier limited to care, spending, evidence, promise, and other; select a variant from relationship identity and a stable message-ID hash. No fallback variant returns task, relationship, or memory effects.

- [ ] **Step 4: Add an explicit non-AI mainline checkpoint**

After repeated provider failures, schedule a clearly tagged `system_fallback_checkpoint` proactive report through the task engine. It may advance only the current required task checkpoint, records `source: system_fallback`, and is independent of the number or content of successful ordinary chats. Do not present it as AI understanding the player's message.

- [ ] **Step 5: Run message tests**

Run: `npm test -- src/tests/message-ai-flow.test.tsx src/tests/message-flow.test.tsx src/tests/relationship-task.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit fallback behavior**

```powershell
git add -- '刷到你了/web-prototype/src/messages/fallbackReplies.ts' '刷到你了/web-prototype/src/messages/MessageSheet.tsx' '刷到你了/web-prototype/src/messages/character.ts' '刷到你了/web-prototype/src/engine/state.ts' '刷到你了/web-prototype/src/engine/reducer.ts' '刷到你了/web-prototype/src/engine/persistence.ts' '刷到你了/web-prototype/src/tests/message-ai-flow.test.tsx' '刷到你了/web-prototype/src/tests/message-flow.test.tsx' '刷到你了/web-prototype/src/tests/relationship-task.test.ts'
git commit -m "feat(chat): add persona-aware fallback replies"
```

### Task 9: Add debug provenance and run end-to-end acceptance

**Files:**
- Create: `刷到你了/web-prototype/src/messages/AiDebugSheet.tsx`
- Modify: `刷到你了/web-prototype/src/messages/types.ts`
- Modify: `刷到你了/web-prototype/src/engine/state.ts`
- Modify: `刷到你了/web-prototype/src/engine/reducer.ts`
- Modify: `刷到你了/web-prototype/src/feed/FeedScreen.tsx`
- Modify: `刷到你了/web-prototype/src/styles/relationship.css`
- Modify: `刷到你了/qa/ai-chat-mvp-stage-validation.md`
- Modify: `刷到你了/13_AI私聊主循环_MVP完整策划案_V0.2.md`
- Test: `刷到你了/web-prototype/src/tests/ai-debug.test.tsx`
- Test: `刷到你了/web-prototype/src/tests/message-ai-flow.test.tsx`

**Interfaces:**
- Produces: `AiTurnDebugRecord` and a development-only `?debug=ai` sheet

- [ ] **Step 1: Write failing debug-provenance tests**

```ts
it('records what the turn read, accepted, rejected, and whether fallback was used', () => {
  const state = gameReducer(personaState(), aiTurnCompleted(debugFixture))
  expect(state.aiDebugTurns.at(-1)).toEqual(expect.objectContaining({
    relationshipIdentity: 'familiar_fan',
    memoryIdsRead: ['memory-1'],
    acceptedTaskEvidence: [],
    fallbackUsed: false,
  }))
})
```

UI coverage must prove the debug sheet is absent without `?debug=ai` and available in development with that query. It may display hidden dimensions, evidence source IDs, memory IDs, accepted/rejected candidate reasons, and fallback state.

- [ ] **Step 2: Run debug tests and verify RED**

Run: `npm test -- src/tests/ai-debug.test.tsx src/tests/message-ai-flow.test.tsx`

Expected: FAIL because debug provenance does not exist.

- [ ] **Step 3: Implement bounded debug records and the development-only sheet**

Retain the newest 20 turn records. Never store the provider key, raw system prompt, or unrestricted model output. The normal player UI must not expose the sheet or hidden values.

- [ ] **Step 4: Update product design and QA documents**

In the MVP plan, replace language implying task-driven chat with the eight-layer persona input, evidence-backed task transition, and three-layer memory model. In QA, add the twelve acceptance scenarios from the approved design and columns for relationship identity, memory continuity, task evidence source, and fallback status.

- [ ] **Step 5: Run complete automated verification**

Frontend: `npm test && npm run typecheck && npm run build`

Server: `npm test && npm run typecheck && npm run build`

Repository: `git diff --check`

Expected: every command exits 0.

- [ ] **Step 6: Run real DeepSeek acceptance samples**

Use fresh saves for at least these cases: ordinary care at `new_viewer`; ordinary care at `important_supporter`; task-relevant editing question; unrelated multi-turn chat; support with spending concern; hold-back with a reason; recalled promise after refresh; provider-unavailable fallback. Record only sanitized inputs, structural outputs, persona identity, evidence tags, and pass/fail. Never record the API key.

- [ ] **Step 7: Commit, push, and update the draft PR**

```powershell
git add -- '刷到你了/web-prototype/src/messages/AiDebugSheet.tsx' '刷到你了/web-prototype/src/messages/types.ts' '刷到你了/web-prototype/src/engine/state.ts' '刷到你了/web-prototype/src/engine/reducer.ts' '刷到你了/web-prototype/src/feed/FeedScreen.tsx' '刷到你了/web-prototype/src/styles/relationship.css' '刷到你了/web-prototype/src/tests/ai-debug.test.tsx' '刷到你了/web-prototype/src/tests/message-ai-flow.test.tsx' '刷到你了/qa/ai-chat-mvp-stage-validation.md' '刷到你了/13_AI私聊主循环_MVP完整策划案_V0.2.md'
git commit -m "feat(ai): complete yanxin persona memory engine"
git push origin feat/phase-a-deterministic-core
```
