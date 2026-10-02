# Agent Capability Routing

Use this when Unity UI work is delegated to subagents or coordinated across runtimes such as Orca, Paseo, Claude, OpenCode, or direct API sessions. These names are context, not evidence of vision, tools, or skill availability. This guide does not require spawning agents; apply it to the actual participants in an authorized workflow, including a single agent when appropriate.

## Verify Each Executor Before Dispatch

Capabilities belong to the actual executing session. Do not assume a child inherits the coordinator's model, images, skills, tools, credentials, filesystem, working directory, or Unity connection. Forwarding a skill's text supplies instructions, not a generator or vision support.

Before assigning dependent work, collect a short capability response from each executor. Use `verified`, `unavailable`, or `unknown` for each relevant capability; `unknown` does not qualify an executor for that role. Record the executor/session, current runtime/model/API route when exposed, evidence, and any limitation. Recheck affected capabilities when the executor, model, endpoint, tool connection, workspace, or attachment delivery changes; do not reuse another session's capability record.

| Capability | Evidence needed for this task |
| --- | --- |
| Artifact access | The executor can read the actual input revision and write/return its assigned outputs. A coordinator-local path is not proof of access in another runtime. |
| Vision input and interpretation | The active model/route supports image input, the adapter actually delivers the image, and the executor can inspect the task image through that path. Record the source ID/revision and observations from its pixels. A filename, base64 text, OCR, another agent's caption, a tool named `view_image`, or model branding alone is insufficient. |
| Image-generation skill | An applicable skill is available to this executor and its instructions have been read; record its name/path or resource ID. A parent's skill does not qualify a child. |
| Generation execution | The tools and execution requirements specified by that skill are available in this executor's session. Inventory/connection evidence is enough for intake; do not generate a paid test image just to probe capability. Record actual execution separately when authorized work runs. |
| Project/Unity read access | The executor can inspect the named project, UI stack, target owner, assets, and relevant console/import state. Offline source access and a live Editor connection are different capabilities. |
| Project/Unity write access | The executor can change its assigned files or operate the intended Editor with the required tools. Source editing alone does not prove live import or assignment. |
| Screenshot capture | A tool can capture the correct target and return the image with its resolution and revision. This capability does not imply the executor can interpret that screenshot. |

A text-only API response can confirm tool availability or report a limitation; it cannot prove image understanding merely by saying "I support vision." If the attachment is missing, inaccessible, or delivered as text only, keep vision `unknown`/`unavailable` for that artifact. Do not ask the worker to guess the image as a fallback.

Distinguish an image-delivery/access failure, including a pending file-access permission, from a confirmed model modality limitation. A file that exists can still be inaccessible to the worker. Resolve narrowly scoped access within existing task authorization or transfer the artifact through an accessible path, then test image delivery; do not conclude that the model lacks vision from a filesystem permission prompt.

## Assign Bounded Roles

One agent may hold several roles when it meets all their requirements. Split roles only where useful; do not impose a fixed team size.

| Role | Required capability | Output and boundary |
| --- | --- | --- |
| Coordinator | Access to task requirements, user decisions, capability responses, and returned artifacts | Owns scope, decisions, dispatch, and final evidence. May be text-only; it must attribute visual findings to the qualified reviewer rather than claim to have seen the images itself. |
| Visual analyst / asset reviewer | Verified vision for the exact mockup and candidate images | Produces composition findings, source-linked geometry, visual asset matches, and uncertainty. Candidate proposals still need the existing review decision; vision does not grant user approval. |
| Structural/code worker | Readable approved plan, structured export or measured handoff, plus access to assigned source files | Implements the selected stack's structure and behavior. Without vision, does not infer raster layers, visual matches, missing icons, crop bounds, or screenshot fidelity. |
| Image generator | Its own available image-generation skill and usable execution path; vision wherever that skill/task requires it | Generates only the agreed assets. A generator without vision may execute an approved text brief if its skill permits it; it cannot analyze references or self-certify visual quality. Do not use role splitting to waive the generation skill's own inspection requirements. |
| Unity operator / capture worker | Verified access to the intended project/Editor and relevant mutation/capture tools | Imports, assigns, reads back references, runs applicable checks, and captures screenshots. A visionless operator returns technical evidence and images for review, not a visual PASS. |
| Visual QA reviewer | Verified vision for the final images and source design at the required sizes | Compares the actual output to the agreed design and checks fit, clipping, readability, transparency, and image consistency. Record target and revision; user art acceptance remains separate. |

The executor owning a generation question and generation must satisfy the skill prerequisite in `image-asset-workflow.md`. A coordinator may relay a concrete question from that verified generation owner and record the user's answer once for the team. It must not invent a generation offer based on its own tool list or an unverified worker. If no executor qualifies, skip generation questions and generation even if someone has a standalone image tool. Skill on agent A plus a tool on agent B does not qualify either agent automatically.

This relay allowance belongs only to the designated coordinator. A skill-less implementation child must not ask or forward a generation question to the user on a parent's behalf; it reports the capability gap internally. The qualified generation owner or designated coordinator handles the user-facing question. A skill-owning parent whose execution path is still unknown is not yet a qualified generator and cannot authorize the child's tool as a substitute.

## Dispatch and Handoff

1. **Check prerequisites.** Assign roles only after their capability evidence is available. An initial capability-only inquiry is allowed; it must not include instructions to analyze inaccessible images, generate assets, or mutate Unity before qualification.
2. **Name ownership.** Give each worker a bounded task and explicit writable paths/UI targets. Tell workers they share the project and must preserve others' changes. Serialize mutations to the same live Editor, scene, prefab, UXML/USS, or asset; keep one active writer for that target. Separate read/analysis work can proceed independently.
3. **Transfer real inputs.** Attach/copy the actual image or use an accessible artifact reference and verify the receiver can open the intended revision. Do not assume a parent attachment, local file path, or signed URL is available in a child/API call. Record identity using a content hash or revision ID where available, alongside dimensions and source path/reference.
4. **Carry the contract.** Include agreed target/stack, user decisions and authorization, source hierarchy/tokens, approved layout tree, candidate review states, asset plan, and verification targets needed by that task. Use the existing `mockup-layout-plan/v2` artifact when appropriate; no new mandatory plan schema is required.
5. **Make visual handoffs usable without vision.** Include source resolution, coordinate origin/units, source and normalized rects, parent ownership, split/keep reasons, accepted asset paths/IDs, and uncertainty. Cite the visual analyst or structured export that supplied each finding. Mark unknown values; do not fill them with plausible guesses. Text workers may transform supplied measurements or export data but cannot claim independent visual inspection.
6. **Return evidence, not just completion.** A worker reports role/executor, input/output revisions, files or targets changed, checks actually run, visual evidence owner, and remaining limitations. Use a result such as `complete_for_role`, `needs_capability`, or `awaiting_visual_review`; local role completion is not whole-task completion.

Compact dispatch template:

```text
Task / role / executor:
Verified capabilities and evidence / missing capabilities:
Inputs: artifact IDs/revisions, accessible references, dimensions where relevant.
Agreement: target, stack, scope, user decisions, generation choice if applicable.
Handoff: approved plan and source-attributed measurements; unresolved items.
Ownership: writable paths/UI targets; shared work must be preserved.
Return: output revisions, actual checks, limitations, next reviewer.
Stop dependent work if a required capability or input is missing; report it.
```

## Capability Gaps and Completion

- **No vision in a worker:** route raster analysis and visual QA to a verified visual owner. Give the worker a textual/structured handoff and only tasks it can verify. Capturing an image, reading dimensions, or passing code tests is not image analysis.
- **No vision anywhere:** continue authorized text/token/export planning or implementation from an agreed structured contract. Keep raster-derived decisions and visual verification pending; do not invent a visual interpretation or label the UI visually verified. If raster analysis is required to define the contract, stop that dependent work while continuing independent inspection.
- **Generator without vision:** separate generation from visual review when the invoked skill permits that split. Return unreviewed candidates to a qualified reviewer before selecting/applying them. If no reviewer is available, retain the candidate and report the missing review rather than promote it.
- **No generation skill or execution path in the assigned worker:** report `needs_capability`. Keep generation with a qualified parent or reassign to a verified executor if delegation is already authorized. Do not repeatedly retry the same incapable worker, install skills automatically, or call an alternate image API to bypass the prerequisite.
- **No Unity bridge in a code worker:** return scoped source changes and hand them to the qualified Unity operator. Keep import, assignment, runtime, console, and screenshots pending until exercised there.
- **Stale, missing, or incompatible artifact:** restore the correct handoff or reassign; a screenshot of an earlier revision does not verify later edits. Review the changed visual scope after new outputs arrive.

The coordinator assembles the final result from attributed evidence: source analysis, generated candidate, art review, import, assignment, technical checks, screenshot capture, and final visual review. Do not collapse these into a single PASS or infer user visual acceptance from any worker's success. Missing required vision is a verification gap, not `not_applicable` merely because the assigned agent lacks it.
