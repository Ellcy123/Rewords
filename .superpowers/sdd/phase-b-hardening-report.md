# Phase B late-review hardening report

## Scope and baseline

- Worktree: `D:\Rewords\.worktrees\phase-a-deterministic-core`
- Starting commit: `d5f2c864a176ea7b30b5b2de22a3f8f289b2f29a`
- Reviewed: delayed chat recovery placeholder/replacement, delivery flushing, deterministic fallback progression, persistence, and the existing message tests.
- Not changed: `ai-server` and QA documentation.

## Result

The current production implementation already satisfies the three late-review findings. In particular, a reply delivery whose task signals cause no transition invokes `recordTaskRelevantFallback`, the recovery reply is persisted before the request resolves, and the composer blocks while a reply delivery is pending. No production-code change was required.

Added regression coverage in `刷到你了/web-prototype/src/tests/message-ai-flow.test.tsx` using Vitest fake timers and controllable `fetch` promises only:

1. Four structurally valid AI replies with empty `taskSignals` advance through the two-turn fallback rule twice: after two deliveries the task is `understood`; after four it is `committed`, produces exactly one pending progress report, and unlocks `E201` only after that report is delivered.
2. Unmounting with an unresolved request leaves one persisted recovery reply. A deferred completion from the abandoned component is resolved after reload; the persisted fallback alone delivers once, clears the pending reply, advances to `understood`, and the late AI text never appears.
3. While a recovery/reply delivery is pending, attempted follow-up sends do not make another request or append another user message. After delivery, messages retain user/reply order; a duplicate `acknowledge_pressure` signal at `understood` does not commit the task and instead counts only one deterministic fallback turn.

Regression sensitivity was also checked with a temporary, uncommitted mutation that removed the reducer's `recordTaskRelevantFallback` call. The empty-signal case then failed exactly where intended after two deliveries (`expected understood`, `received invited`). The original reducer code was restored before the final verification run.

## Verification

All commands ran from `刷到你了/web-prototype` and completed successfully:

```text
npm test -- --run src/tests/message-ai-flow.test.tsx
  1 file passed, 6 tests passed

npm test -- --run
  21 files passed, 135 tests passed

npm run typecheck
  tsc -b --pretty false completed successfully

npm run build
  tsc -b && vite build && node scripts/prepare-sites-build.mjs completed successfully

git diff --check
  no whitespace errors
```
