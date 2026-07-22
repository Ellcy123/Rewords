# DeepSeek Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a DeepSeek JSON-output provider without changing the browser chat contract or deterministic fallback.

**Architecture:** Keep `ChatModelClient` as the provider boundary. Add a DeepSeek Chat Completions implementation and select it from validated server configuration; all provider output continues through the existing request-aware Zod and domain validation.

**Tech Stack:** TypeScript, OpenAI Node SDK, DeepSeek OpenAI-compatible Chat Completions, Zod, Vitest.

## Global Constraints

- Never log, commit, echo, or return an API key.
- Keep OpenAI as the default provider for backward compatibility.
- Keep frontend request and response contracts unchanged.
- Treat DeepSeek empty/invalid/unsafe output as `AI_UNAVAILABLE`.

---

### Task 1: Add and verify the DeepSeek provider

**Files:**
- Create: `刷到你了/ai-server/src/deepseekClient.ts`
- Modify: `刷到你了/ai-server/src/server.ts`
- Modify: `刷到你了/ai-server/.env.example`
- Test: `刷到你了/ai-server/src/tests/contracts.test.ts`

**Interfaces:**
- Consumes: `ChatModelClient`, `StructuredResponseRequest`, `ChatResponseJsonSchema`.
- Produces: `createDeepSeekChatModel(apiKey, client?)` and provider-aware `ServerConfig`.

- [ ] **Step 1: Write failing tests** proving DeepSeek uses `chat.completions.create`, `response_format: { type: 'json_object' }`, a JSON shape instruction, and rejects empty content; prove config selects DeepSeek and requires `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`.
- [ ] **Step 2: Run** `npm test -- src/tests/contracts.test.ts`; expected failure because the DeepSeek client and provider config do not exist.
- [ ] **Step 3: Implement the minimal adapter and provider-aware startup** while leaving the existing OpenAI adapter untouched.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, and `npm run build`; expected exit 0.
- [ ] **Step 5: Store the supplied key only in ignored `.env`, start port 8787, and send one sanitized smoke request through the local route.** Never print the key or model raw output.
- [ ] **Step 6: Commit and push** with message `feat(server): add deepseek chat provider`.
