# First-Level Node Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the first level's folder-based design package with one authoritative trigger table, one item recovery table, and ten individually scripted videos forming a complete solvable tree.

**Architecture:** Keep causal logic in a single trigger table and production content in one Markdown file per video. Organize video files by content dimension so the wedding, costume-drama, and knowledge-blogger trees can evolve independently while sharing items through explicit cross-video edges.

**Tech Stack:** Markdown, Git, PowerShell, ripgrep

## Global Constraints

- The initial feed contains exactly three videos from three visibly different content dimensions.
- Every critical item must trace back to one of the three initial videos.
- Link relevance may be weak, but every offered item must have at least one positive, funny use.
- Semantic transformations require a one-sentence language bridge understandable within the first five seconds.
- Every result is a pre-produced video no longer than fifteen seconds.
- This pass defines only the complete solvable tree; absurd terminal pairings are a separate pass.
- Trigger relationships appear authoritatively only in `01_触发关系总表.md`.

---

### Task 1: Create the level package and overview

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/00_关卡总览.md`

**Interfaces:**
- Consumes: `刷到你了/04_树状推荐流与语义物品设计规则_V0.1.md`
- Produces: Stable node prefixes, initial-feed definition, scope, and completion criteria used by every later file.

- [ ] **Step 1: Create the folder structure and overview**

Write the exact initial nodes `W001`, `C001`, and `K001`; define the four critical items; state that the current pass contains ten videos and six positive item placements.

- [ ] **Step 2: Verify overview constraints**

Run: `rg -n "W001|C001|K001|梯子|空调师傅|录音笔|投影服务|10 条|6 次" "刷到你了/05_第一关_婚礼逆天改命/00_关卡总览.md"`

Expected: Every initial node, item, and quantity is present.

### Task 2: Write the authoritative trigger table

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/01_触发关系总表.md`

**Interfaces:**
- Consumes: Node IDs and scope from `00_关卡总览.md`.
- Produces: The only authoritative mapping from source plus action to result node.

- [ ] **Step 1: Add initial link acquisition edges**

Record that `C001` sells the ladder and `K001` sells the air-conditioning technician.

- [ ] **Step 2: Add resource-tree edges**

Record `K001 + 梯子 → K101`, recorder acquisition from `K101`, `C001 + 录音笔 → C101`, and projection-service acquisition from `C101`.

- [ ] **Step 3: Add wedding-tree edges**

Record `W001 + 梯子 → W101`, `W101 + 空调师傅 → W200`, `W200 完播 → W300`, `W300 + 录音笔 → W301`, and `W301 + 投影服务 → W400`.

- [ ] **Step 4: Verify edge uniqueness**

Run: `rg -n "→" "刷到你了/05_第一关_婚礼逆天改命/01_触发关系总表.md"`

Expected: Every positive edge is listed once, with no alternative result for the same source and action.

### Task 3: Write the item source and recovery table

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/02_物品来源与回收表.md`

**Interfaces:**
- Consumes: Trigger edges from `01_触发关系总表.md`.
- Produces: A complete audit trail showing where every item is acquired and positively reused.

- [ ] **Step 1: Document all four items**

For the ladder, air-conditioning technician, recorder, and projection service, list source node, link joke, positive target nodes, mechanical outcome, and comedy payoff.

- [ ] **Step 2: Verify no item is unused**

Run: `rg -n "梯子|空调师傅|录音笔|投影服务" "刷到你了/05_第一关_婚礼逆天改命/02_物品来源与回收表.md"`

Expected: Every item has a source and at least one positive target; ladder and recorder each have two positive targets.

### Task 4: Script the three initial videos

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/W_婚礼线/W001_婚礼灯架事故.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/C_古装短剧线/C001_王妃翻墙私逃.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/K_知识博主线/K001_空调开十六度电脑会变快吗.md`

**Interfaces:**
- Consumes: Initial node definitions and item sources from Tasks 1–3.
- Produces: Three ten-to-twelve-second scripts that establish the initial feed and expose the ladder and technician links.

- [ ] **Step 1: Write W001**

Open with the fatal lamp-rig impact, explain the accident within five seconds, and end with a high-fixture clue.

- [ ] **Step 2: Write C001**

Open with the princess caught on a palace wall, establish the disputed order to escape, and insert an anachronistic ladder link.

- [ ] **Step 3: Write K001**

Open with a laptop literally freezing during a ridiculous cooling test, include an air-conditioning technician, and expose the technician-as-a-service link.

- [ ] **Step 4: Verify duration blocks**

Run: `rg -n "0～1 秒|1～5 秒|总时长|植入链接" "刷到你了/05_第一关_婚礼逆天改命/剧情节点"`

Expected: Each initial script declares duration, front-loads its event, and states its link status.

### Task 5: Script the resource-tree results

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/K_知识博主线/K101_梯子变成VPN.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/C_古装短剧线/C101_金銮殿播放录音.md`

**Interfaces:**
- Consumes: `K001 + 梯子` and `C001 + 录音笔` edges from the trigger table.
- Produces: Recorder and projection-service links required by the later wedding nodes.

- [ ] **Step 1: Write K101**

Resolve ladder as Internet slang for VPN in the first five seconds, then let an overseas page weakly but visibly insert a recorder link.

- [ ] **Step 2: Write C101**

Let the recorder expose the imperial adviser, then use the emperor's command to put evidence on the palace screen as the weak bridge to a projection-service link.

- [ ] **Step 3: Verify language bridges**

Run: `rg -n "语言桥|VPN|投影服务|录音笔" "刷到你了/05_第一关_婚礼逆天改命/剧情节点/K_知识博主线/K101_梯子变成VPN.md" "刷到你了/05_第一关_婚礼逆天改命/剧情节点/C_古装短剧线/C101_金銮殿播放录音.md"`

Expected: Both result files explicitly state their language or advertising bridge and newly unlocked link.

### Task 6: Script the wedding progression

**Files:**
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/W_婚礼线/W101_有梯子但不会修.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/W_婚礼线/W200_新娘活下来了.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/W_婚礼线/W300_婚礼当天私会维修工.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/W_婚礼线/W301_证据就在笔里但没人看见.md`
- Create: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/W_婚礼线/W400_证据上大屏婚礼完成.md`

**Interfaces:**
- Consumes: Four wedding-tree item edges and one completion edge from the trigger table.
- Produces: A complete four-placement wedding solution ending with the visible goal satisfied.

- [ ] **Step 1: Write W101 and W200**

Show that height without expertise still kills the bride, then let the technician use the existing ladder to save her.

- [ ] **Step 2: Write W300**

Turn the bride's thanks to the technician into a maliciously edited affair clip and stop the wedding.

- [ ] **Step 3: Write W301 and W400**

Let the recorder contain the full audiovisual confession but fail on its tiny screen, then let the projection service expose the lie and complete the ceremony.

- [ ] **Step 4: Verify pacing and goal closure**

Run: `rg -n "0～1 秒|1～5 秒|总时长|婚礼顺利结束" "刷到你了/05_第一关_婚礼逆天改命/剧情节点/W_婚礼线"`

Expected: All six wedding files use front-loaded timing and W400 explicitly satisfies the level goal.

### Task 7: Run cross-document consistency checks

**Files:**
- Modify only files in `刷到你了/05_第一关_婚礼逆天改命/` if validation reveals a mismatch.

**Interfaces:**
- Consumes: All deliverables from Tasks 1–6.
- Produces: A self-consistent first-level solvable-tree package ready for user review.

- [ ] **Step 1: Verify all declared result nodes have files**

Run: `rg --files "刷到你了/05_第一关_婚礼逆天改命/剧情节点"`

Expected: Exactly ten Markdown node files are listed.

- [ ] **Step 2: Verify item recovery**

Run: `rg -n "梯子|空调师傅|录音笔|投影服务" "刷到你了/05_第一关_婚礼逆天改命"`

Expected: Every item appears in the trigger table, item table, and relevant source/result scripts.

- [ ] **Step 3: Verify formatting**

Run: `git diff --check`

Expected: Exit code 0 with no whitespace errors.

- [ ] **Step 4: Commit the package**

Run: `git add "刷到你了/05_第一关_婚礼逆天改命" "docs/superpowers/plans/2026-07-11-first-level-node-tree.md" && git commit -m "Design the first level solvable node tree"`

Expected: One commit containing the plan and complete solvable-tree documents.
