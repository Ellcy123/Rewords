# First-Level Branch Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first ten absurd terminal videos produced by incorrect item placements into W001, W101, and W200, while establishing the authoritative 56-video branch matrix.

**Architecture:** Keep all new causal edges in the existing trigger table and create one Markdown script per result video under a batch-specific branch folder. The matrix document owns IDs, batch allocation, growth status, and Meta distribution; individual files own only video content and production notes.

**Tech Stack:** Markdown, Git, PowerShell, ripgrep

## Global Constraints

- The completed level target remains exactly 56 videos: 10 backbone nodes, 34 first-layer results, and 12 second-layer results.
- Batch 1 adds exactly ten first-layer terminal nodes, X001 through X010.
- Every script begins with its strongest result at 0–1 seconds, explains the joke within five seconds, and lasts no more than fifteen seconds.
- Every result ends in death or a complete non-wedding life; none may advance or skip the wedding solution.
- Batch 1 contains exactly two Meta nodes: X002 at medium strength and X010 at strong strength.
- Meta awareness is local to its branch and does not persist across timelines.
- No Batch 1 result unlocks a new purchasable item or accepts further item placement.

---

### Task 1: Establish the 56-video matrix

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/03_56条分支矩阵与批次.md`
- Modify: `刷到你了/05_第一关_婚礼逆天改命/00_关卡总览.md`

**Interfaces:**
- Consumes: The ten-node backbone and four-item matrix from the existing level package.
- Produces: Stable X001–X034 and Y001–Y012 ID ranges, four batch boundaries, three second-layer growth nodes, and the Meta allocation rule.

- [ ] **Step 1: Document the count equation and batch ownership**

Record `10 + 34 + 12 = 56`, assign X001–X010 to Batch 1, X011–X020 to Batch 2, X021–X034 to Batch 3, and Y001–Y012 to Batch 4.

- [ ] **Step 2: Register the ten Batch 1 edges and titles**

Register:

- X001: W001 + 空调师傅, 《师傅到了，但没有梯子》;
- X002: W001 + 录音笔, 《新娘最后一句话点赞破百万》, Meta medium;
- X003: W001 + 投影服务, 《死亡现场精彩回放》;
- X004: W101 + 梯子, 《两把梯子，还是不会修》;
- X005: W101 + 录音笔, 《零基础修灯教程火了》;
- X006: W101 + 投影服务, 《把错误教程投上天花板》;
- X007: W200 + 梯子, 《婚姻步步高升升过头》;
- X008: W200 + 空调师傅, 《两位师傅把婚礼修没了》;
- X009: W200 + 录音笔, 《新娘转行婚前审计》;
- X010: W200 + 投影服务, 《婚礼突然开启全民投票》, Meta strong.

- [ ] **Step 3: Verify matrix counts**

Run: `rg -n "10 \+ 34 \+ 12 = 56|X001|X010|X034|Y001|Y012|Meta" "刷到你了/05_第一关_婚礼逆天改命/03_56条分支矩阵与批次.md"`

Expected: The total, full ID ranges, and Meta policy are present.

### Task 2: Script W001 terminal results

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X001_师傅到了但没有梯子.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X002_新娘最后一句话点赞破百万.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X003_死亡现场精彩回放.md`

**Interfaces:**
- Consumes: Incorrect W001 placements from the matrix.
- Produces: Three complete death endings; X002 provides the batch's medium Meta leak.

- [ ] **Step 1: Write X001**

Let the technician diagnose the four-meter height from the floor, request a customer-supplied ladder, and ask for a signature as the rig falls.

- [ ] **Step 2: Write X002**

Let the recorder capture the bride's final syllable in high quality; the cameraman sees the live like counter surge and chooses to stabilize the shot instead of warning her.

- [ ] **Step 3: Write X003**

Let the projection screen obstruct the warning view, then replay the fatal impact in slow motion under an automatic “精彩回放” title.

### Task 3: Script W101 terminal results

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X004_两把梯子还是不会修.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X005_零基础修灯教程火了.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X006_把错误教程投上天花板.md`

**Interfaces:**
- Consumes: Incorrect W101 placements from the matrix.
- Produces: Three death endings built around duplicated tools, recorded misinformation, and enlarged bad instructions.

- [ ] **Step 1: Write X004**

Make the groomsmen tie two ladders together, reach the wrong side of the rig, and prove that tool quantity does not create expertise.

- [ ] **Step 2: Write X005**

Make the recorder turn the groomsman's incorrect repair into a confident tutorial that goes viral after the bride dies.

- [ ] **Step 3: Write X006**

Project an upside-down installation diagram onto the ceiling; the groomsman follows the reversed arrow and releases the emergency latch.

### Task 4: Script W200 alternate-life results

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X007_婚姻步步高升升过头.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X008_两位师傅把婚礼修没了.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X009_新娘转行婚前审计.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段/X010_婚礼突然开启全民投票.md`

**Interfaces:**
- Consumes: All four item placements into W200, which has no positive item edge.
- Produces: Four non-wedding lives; X010 provides the batch's strong Meta leak.

- [ ] **Step 1: Write X007**

Turn the spare ladder into a literal “步步高升” wedding ritual, require fire rescue, and launch the bride's high-altitude wedding-planner career.

- [ ] **Step 2: Write X008**

Let a second technician argue with the first over responsibility until both dismantle the safe ceiling and the venue is condemned; the bride becomes a renovation-warning creator.

- [ ] **Step 3: Write X009**

Let the recorder capture the groom privately planning to transfer wedding gifts to his mother; the bride cancels the ceremony and launches a pre-marriage audit business.

- [ ] **Step 4: Write X010**

Project the video's live comment poll into the venue; the bride sees strangers voting on whether she should marry, rejects the poll, and leaves the public wedding.

### Task 5: Update trigger authority and verify the batch

**Files:**
- Modify: `刷到你了/05_第一关_婚礼逆天改命/01_触发关系总表.md`

**Interfaces:**
- Consumes: X001–X010 scripts and matrix registration.
- Produces: Ten authoritative first-layer edges and a validated 20-video current package.

- [ ] **Step 1: Add X001–X010 edges**

Add each source-plus-item mapping once, mark all ten nodes terminal, and record Meta strengths for X002 and X010.

- [ ] **Step 2: Verify file and field counts**

Run: `Get-ChildItem -File -Recurse "刷到你了/05_第一关_婚礼逆天改命/剧情节点" | Measure-Object`

Expected: Count 20.

Run: `rg -l "Meta 强度：" "刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次1_婚礼事故前半段" | Measure-Object`

Expected: Count 10.

- [ ] **Step 3: Verify duration and terminal status**

Run a PowerShell validation that parses every Batch 1 `总时长`, rejects values over 15, verifies exactly two non-`无` Meta strengths, and verifies every file contains `终局状态` and `不再继续生长`.

Expected: 10 files, 0 over-length videos, 2 Meta videos, 10 terminal nodes.

- [ ] **Step 4: Verify formatting and commit**

Run: `git diff --check`

Expected: Exit code 0.

Commit message: `Write the first batch of absurd wedding branches`.
