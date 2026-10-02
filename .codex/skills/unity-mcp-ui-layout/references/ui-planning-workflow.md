# UI Planning Workflow

Use this for a new screen, a substantial redesign, or a request to brainstorm UI before implementation. Resolve product and visual choices through a short conversation before turning them into runtime structure. For a bounded repair, preserve the existing contract and ask only about a material scope change.

If the user requested planning only, deliver the plan and open decisions without starting implementation. Runtime screenshots and image assignments become completion requirements when implementation is in scope.

For delegated work, use `agent-capability-routing.md` before assigning image analysis, generation, or verification. Apply the skill prerequisite in step 4 to the named generation executor; the coordinator may relay its question and carry the answer to the team. A coordinator without vision plans from attributed analysis or structured exports, not guessed raster content.

## Sequential Planning

1. **Inspect and summarize.** Read the request, supplied mockup/export/tokens, target UI owner, and nearby project assets. Separate confirmed requirements from open choices. Reuse answers and authorization already present in the conversation.
2. **Confirm purpose and behavior.** Ask about the next missing decision that changes the screen: its main action, required content/states, navigation, or interaction. Do not invent tabs, buttons, rewards, or behavior from decorative artwork. Skip questions already answered by the user or project evidence.
3. **Propose composition and structure.** Show a compact region sketch or neutral layer-to-layout tree with parent ownership, repeated units, scroll ownership, and a small ordered implementation plan. When a material design choice is still open, offer two or three concrete alternatives with a recommendation and ask the user to choose. A supplied design owns composition; structured exports retain hierarchy precedence.
4. **Set the asset plan.** Follow `asset-discovery-priority.md`: a supplied mockup requires project image discovery and reuse of suitable images. List missing roles and check whether the agent has an available image-generation skill. Read that skill and check its execution requirements before asking about generation. Only when the skill and its generation path are available, ask whether to create temporary resources if the choice is unresolved. Without the skill, skip the generation question and generation even if an image tool exists; continue with project assets or agreed placeholders. Use `image-asset-workflow.md` for details. Existing instructions to generate or decline generation settle the choice but do not replace the skill prerequisite.
5. **Record the agreed contract.** Summarize the selected design, layout tree, behavior scope, asset choices, temporary-resource decision, implementation slices, and verification targets. Obtain confirmation for material choices that remain unconfirmed before dependent UI creation. If the user already accepted the concrete plan or explicitly delegated those choices, record that evidence and proceed without another approval round.
6. **Implement and verify in slices.** Build the agreed shell, major regions, one reusable unit, then details. Inspect each structural slice. Reopen only decisions affected by new evidence or a requested change; keep the rest of the agreement intact.

## Question Discipline

- Ask one focused question at a time, or a small group of tightly related questions. Advance to the next decision after the answer; do not present an exhaustive intake questionnaire.
- Explain the concrete choice and its visible effect in the user's language. Keep implementation details out of questions unless the user needs them to decide.
- Read-only inspection and a reviewable proposal may continue while waiting. Do not create dependent Unity objects, UXML/USS, sprites, or speculative runtime behavior while a required design answer is pending.
- Silence is not confirmation. If the user is unavailable, retain the proposal and open decisions; only work within the already agreed scope.
- Reversible spacing details and reference-resolution fallbacks may use named assumptions under `review-gates-and-assumptions.md`. They do not authorize guessing the screen's purpose, interaction, or major structure.
- A one-widget repair or an already approved implementation plan does not need a new brainstorming cycle.

## Compact Decision Record

Keep this with the task plan or conversation; a new schema is not required:

```text
Confirmed: target/stack, purpose, source design, regions, behavior, reuse choices.
Evidence: user request or answer that settled each material choice.
Open: next unresolved decision; dependent work remains pending.
Assets: inspected project paths, chosen matches, missing roles.
Generation skill: verified skill name/path or unavailable; a tool alone is insufficient.
Temporary resources: generate / declined / unavailable / not needed / awaiting answer.
Next slices: shell -> regions -> reusable unit -> details.
Verification: main and alternate size, text/states, image assignments, console.
```

The design agreement, candidate accept/hold/reject review, and generated-art review answer different questions. Agreement on screen structure does not automatically accept uncertain raster candidates or make temporary art final. Link item rects and asset choices to the existing `mockup-layout-plan/v2` artifact when that artifact is used.
