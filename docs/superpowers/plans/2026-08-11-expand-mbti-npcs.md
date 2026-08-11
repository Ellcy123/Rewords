# Expand 11 MBTI NPC Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create complete, audience-ready standalone NPC design documents for all 11 pending MBTI archetypes and synchronize the 16-type roster.

**Architecture:** Each NPC is an independent Markdown design unit under `未能输出/NPC设计/`, following the established long-form structure used by the existing INTP, ISTJ, ISTP, ISFP, and ENTP documents. Four disjoint authoring tasks create the 11 files; a final integration task updates the shared roster and performs cross-character uniqueness, structure, and balance validation.

**Tech Stack:** Markdown, PowerShell validation, Git.

## Global Constraints

- Source of truth: `docs/superpowers/specs/2026-08-10-mbti-npc-expansion-design.md`.
- Style references: `未能输出/NPC设计/ENTP_偷词狐狸_V0.1.md` and `未能输出/NPC设计/ISFP_旧物收藏者_V0.1.md`.
- Every ability must have a 2—4 Chinese-character archetype name that lets a new reader guess its effect.
- Every NPC uses the approved two-layer structure: “表层有梗，深层是伤口”.
- Every ability is objectively accurate, single-purpose, bounded, and unable to directly reveal complete motives, personality, truth, or the unique correct answer.
- Every document must include: one-line positioning; personality starting point; core belief, need, fear, and contradiction; one-line ability; explicit rules and hard limits; personality misuse; at least three dialogue scenes including the approved signature scene; player verification or counterplay; progressive disclosure; one-glance/overreach/runaway checks; relationship directions; locked and undefined scope.
- Every NPC must have at least one explicit player refusal, bypass, verification, or countermeasure.
- Do not define names, appearance, occupation, complete life history, numerical progression, combat skills, or final relationship endings.
- Do not modify the five existing standalone NPC documents.
- The approved ability names are: 契约师、解梦师、预演师、幻术师、回档者、配乐师、唤犬师、执法官、食神、伯乐、加速师.
- Preserve each approved ability sentence, three hard limits, signature dialogue meaning, and personality wound from the source-of-truth spec; expansions may clarify but may not add a second ability.
- Use natural Chinese dialogue. Do not announce ability activation with gamey phrases such as “回放开始”.
- Do not use vague labels such as “洞察者”“共鸣者”“影响者” as substitutes for concrete effects.

---

## File Map

**Create**

- `未能输出/NPC设计/ISFJ_契约师_V0.1.md` — promises become visible knots; care becomes waiting and resentment.
- `未能输出/NPC设计/INFJ_解梦师_V0.1.md` — locates one real memory source inside a voluntarily told dream.
- `未能输出/NPC设计/INTJ_预演师_V0.1.md` — previews one intended 30-second action path.
- `未能输出/NPC设计/INFP_幻术师_V0.1.md` — written metaphors become intangible ten-second illusions for one reader.
- `未能输出/NPC设计/ESTP_回档者_V0.1.md` — rewinds the world by up to three seconds once per day.
- `未能输出/NPC设计/ESFP_配乐师_V0.1.md` — translates one target’s current mood into ten seconds of private instrumental music.
- `未能输出/NPC设计/ENFP_唤犬师_V0.1.md` — genuine laughter summons a transparent dog that recalls today’s happiest ten seconds.
- `未能输出/NPC设计/ESTJ_执法官_V0.1.md` — one observable mutual rule produces tickets for violations.
- `未能输出/NPC设计/ESFJ_食神_V0.1.md` — the first bite tastes like the target’s remembered home.
- `未能输出/NPC设计/ENFJ_伯乐_V0.1.md` — one handshake reveals which recently practiced skill shows the strongest peer-relative progress.
- `未能输出/NPC设计/ENTJ_加速师_V0.1.md` — an accepted explicit task doubles mastered repetitive-operation speed for ten minutes.

**Modify**

- `未能输出/NPC设计/16型人格能力原型表_V0.1.md` — change INTJ from 军师 to 预演师 and mark all 11 entries as 已有角色文档.

**Do not modify**

- `未能输出/NPC设计/ISTJ_事实回溯记录员_V0.1.md`
- `未能输出/NPC设计/ISTP_修理者_V0.1.md`
- `未能输出/NPC设计/ISFP_旧物收藏者_V0.1.md`
- `未能输出/NPC设计/INTP_行为概率演算者_V0.1.md`
- `未能输出/NPC设计/ENTP_偷词狐狸_V0.1.md`

---

### Task 1: Create the three inward judging NPC documents

**Files:**
- Create: `未能输出/NPC设计/ISFJ_契约师_V0.1.md`
- Create: `未能输出/NPC设计/INFJ_解梦师_V0.1.md`
- Create: `未能输出/NPC设计/INTJ_预演师_V0.1.md`
- Read: `docs/superpowers/specs/2026-08-10-mbti-npc-expansion-design.md` sections 4.1—4.3

**Interfaces:**
- Consumes: approved ISFJ, INFJ, and INTJ ability definitions and signature scenes from the design spec.
- Produces: three standalone documents whose filenames and ability names are consumed by Task 5 roster validation.

- [ ] **Step 1: Verify the three target files do not already exist**

Run:

```powershell
$paths=@('未能输出/NPC设计/ISFJ_契约师_V0.1.md','未能输出/NPC设计/INFJ_解梦师_V0.1.md','未能输出/NPC设计/INTJ_预演师_V0.1.md'); $existing=$paths | Where-Object { Test-Path -LiteralPath $_ }; if ($existing) { $existing; exit 1 } else { 'TARGETS_ABSENT=3' }
```

Expected: `TARGETS_ABSENT=3`.

- [ ] **Step 2: Write all three complete NPC documents**

ISFJ must center the visible promise knot, silent waiting, accumulated resentment, inability to read sincerity, and the player’s option not to promise. INFJ must center one real-memory object inside a voluntarily narrated dream, distinguish source from meaning, fail on self-analysis, and let the player refuse to tell the dream. INTJ must center one 30-second pre-enactment path per hour, invalidate the preview on any deviation, and make over-rehearsal destroy spontaneity.

- [ ] **Step 3: Validate filenames, required sections, and approved ability names**

Run:

```powershell
$items=@(@('未能输出/NPC设计/ISFJ_契约师_V0.1.md','契约师'),@('未能输出/NPC设计/INFJ_解梦师_V0.1.md','解梦师'),@('未能输出/NPC设计/INTJ_预演师_V0.1.md','预演师')); $required=@('一句话','人格','能力','限制','对白','玩家','披露','平衡','关系','本版本'); foreach($item in $items){$t=Get-Content -LiteralPath $item[0] -Raw -Encoding UTF8; if(-not $t.Contains($item[1])){throw "missing ability $($item[1])"}; foreach($r in $required){if(-not $t.Contains($r)){throw "missing $r in $($item[0])"}}}; 'TASK1_DOCS_OK=3'
```

Expected: `TASK1_DOCS_OK=3`.

- [ ] **Step 4: Commit the three documents**

```powershell
git add -- '未能输出/NPC设计/ISFJ_契约师_V0.1.md' '未能输出/NPC设计/INFJ_解梦师_V0.1.md' '未能输出/NPC设计/INTJ_预演师_V0.1.md'
git commit -m "docs: expand ISFJ INFJ and INTJ NPCs"
```

### Task 2: Create the imaginative and action-oriented NPC documents

**Files:**
- Create: `未能输出/NPC设计/INFP_幻术师_V0.1.md`
- Create: `未能输出/NPC设计/ESTP_回档者_V0.1.md`
- Create: `未能输出/NPC设计/ESFP_配乐师_V0.1.md`
- Read: `docs/superpowers/specs/2026-08-10-mbti-npc-expansion-design.md` sections 4.4—4.6

**Interfaces:**
- Consumes: approved INFP, ESTP, and ESFP definitions and signature scenes.
- Produces: three standalone documents consumed by Task 5 roster and uniqueness validation.

- [ ] **Step 1: Verify the three target files do not already exist**

Run:

```powershell
$paths=@('未能输出/NPC设计/INFP_幻术师_V0.1.md','未能输出/NPC设计/ESTP_回档者_V0.1.md','未能输出/NPC设计/ESFP_配乐师_V0.1.md'); $existing=$paths | Where-Object { Test-Path -LiteralPath $_ }; if ($existing) { $existing; exit 1 } else { 'TARGETS_ABSENT=3' }
```

Expected: `TARGETS_ABSENT=3`.

- [ ] **Step 2: Write all three complete NPC documents**

INFP must make one written metaphor visible as a ten-second soundless, intangible illusion for one reader and contrast beautiful expression with inability to ask directly. ESTP must rewind the whole world by at most three seconds once per natural day, retain only memory, and contrast spectacular risks with slow relationship loss. ESFP must translate one target’s current mood into private instrumental music for ten seconds, never label its cause, fail on herself, and contrast emotional showmanship with listening.

- [ ] **Step 3: Validate required sections and approved ability names**

Run:

```powershell
$items=@(@('未能输出/NPC设计/INFP_幻术师_V0.1.md','幻术师'),@('未能输出/NPC设计/ESTP_回档者_V0.1.md','回档者'),@('未能输出/NPC设计/ESFP_配乐师_V0.1.md','配乐师')); $required=@('一句话','人格','能力','限制','对白','玩家','披露','平衡','关系','本版本'); foreach($item in $items){$t=Get-Content -LiteralPath $item[0] -Raw -Encoding UTF8; if(-not $t.Contains($item[1])){throw "missing ability $($item[1])"}; foreach($r in $required){if(-not $t.Contains($r)){throw "missing $r in $($item[0])"}}}; 'TASK2_DOCS_OK=3'
```

Expected: `TASK2_DOCS_OK=3`.

- [ ] **Step 4: Commit the three documents**

```powershell
git add -- '未能输出/NPC设计/INFP_幻术师_V0.1.md' '未能输出/NPC设计/ESTP_回档者_V0.1.md' '未能输出/NPC设计/ESFP_配乐师_V0.1.md'
git commit -m "docs: expand INFP ESTP and ESFP NPCs"
```

### Task 3: Create the expressive and social-order NPC documents

**Files:**
- Create: `未能输出/NPC设计/ENFP_唤犬师_V0.1.md`
- Create: `未能输出/NPC设计/ESTJ_执法官_V0.1.md`
- Create: `未能输出/NPC设计/ESFJ_食神_V0.1.md`
- Read: `docs/superpowers/specs/2026-08-10-mbti-npc-expansion-design.md` sections 4.7—4.9

**Interfaces:**
- Consumes: approved ENFP, ESTJ, and ESFJ definitions and signature scenes.
- Produces: three standalone documents consumed by Task 5 roster and uniqueness validation.

- [ ] **Step 1: Verify the three target files do not already exist**

Run:

```powershell
$paths=@('未能输出/NPC设计/ENFP_唤犬师_V0.1.md','未能输出/NPC设计/ESTJ_执法官_V0.1.md','未能输出/NPC设计/ESFJ_食神_V0.1.md'); $existing=$paths | Where-Object { Test-Path -LiteralPath $_ }; if ($existing) { $existing; exit 1 } else { 'TARGETS_ABSENT=3' }
```

Expected: `TARGETS_ABSENT=3`.

- [ ] **Step 2: Write all three complete NPC documents**

ENFP must require genuine audible laughter, summon only one transparent noncombat dog for at most ten seconds, allow one successful lick before it disappears, affect each target at most once daily, recall an uncontrollable happiest ten-second memory, and expose compulsive positivity. ESTJ must place one observable ten-minute rule between herself and one other person, issue consequence-free tickets equally, exclude thoughts/feelings/truth, and expose the gap between equality and fairness. ESFJ must alter only the first bite to the target's remembered home taste, provide no healing or memory playback, hide the tasted flavor from her, and expose care becoming coercion.

- [ ] **Step 3: Validate required sections and approved ability names**

Run:

```powershell
$items=@(@('未能输出/NPC设计/ENFP_唤犬师_V0.1.md','唤犬师'),@('未能输出/NPC设计/ESTJ_执法官_V0.1.md','执法官'),@('未能输出/NPC设计/ESFJ_食神_V0.1.md','食神')); $required=@('一句话','人格','能力','限制','对白','玩家','披露','平衡','关系','本版本'); foreach($item in $items){$t=Get-Content -LiteralPath $item[0] -Raw -Encoding UTF8; if(-not $t.Contains($item[1])){throw "missing ability $($item[1])"}; foreach($r in $required){if(-not $t.Contains($r)){throw "missing $r in $($item[0])"}}}; 'TASK3_DOCS_OK=3'
```

Expected: `TASK3_DOCS_OK=3`.

- [ ] **Step 4: Commit the three documents**

```powershell
git add -- '未能输出/NPC设计/ENFP_唤犬师_V0.1.md' '未能输出/NPC设计/ESTJ_执法官_V0.1.md' '未能输出/NPC设计/ESFJ_食神_V0.1.md'
git commit -m "docs: expand ENFP ESTJ and ESFJ NPCs"
```

### Task 4: Create the mentor and commander NPC documents

**Files:**
- Create: `未能输出/NPC设计/ENFJ_伯乐_V0.1.md`
- Create: `未能输出/NPC设计/ENTJ_加速师_V0.1.md`
- Read: `docs/superpowers/specs/2026-08-10-mbti-npc-expansion-design.md` sections 4.10—4.11

**Interfaces:**
- Consumes: approved ENFJ and ENTJ definitions and signature scenes.
- Produces: two standalone documents consumed by Task 5 roster and uniqueness validation.

- [ ] **Step 1: Verify the two target files do not already exist**

Run:

```powershell
$paths=@('未能输出/NPC设计/ENFJ_伯乐_V0.1.md','未能输出/NPC设计/ENTJ_加速师_V0.1.md'); $existing=$paths | Where-Object { Test-Path -LiteralPath $_ }; if ($existing) { $existing; exit 1 } else { 'TARGETS_ABSENT=2' }
```

Expected: `TARGETS_ABSENT=2`.

- [ ] **Step 2: Write both complete NPC documents**

ENFJ must reveal only the highest peer-relative progress rank among concrete skills personally practiced for at least ten minutes in the previous thirty days, once per person, show neither desire nor happiness, and expose love for potential becoming control. ENTJ must require an understood explicit task and voluntary “收到”, double only already-mastered noncombat repetitive-operation speed for ten minutes, preserve fatigue/error/cost, and expose completion being mistaken for agreement.

- [ ] **Step 3: Validate required sections and approved ability names**

Run:

```powershell
$items=@(@('未能输出/NPC设计/ENFJ_伯乐_V0.1.md','伯乐'),@('未能输出/NPC设计/ENTJ_加速师_V0.1.md','加速师')); $required=@('一句话','人格','能力','限制','对白','玩家','披露','平衡','关系','本版本'); foreach($item in $items){$t=Get-Content -LiteralPath $item[0] -Raw -Encoding UTF8; if(-not $t.Contains($item[1])){throw "missing ability $($item[1])"}; foreach($r in $required){if(-not $t.Contains($r)){throw "missing $r in $($item[0])"}}}; 'TASK4_DOCS_OK=2'
```

Expected: `TASK4_DOCS_OK=2`.

- [ ] **Step 4: Commit the two documents**

```powershell
git add -- '未能输出/NPC设计/ENFJ_伯乐_V0.1.md' '未能输出/NPC设计/ENTJ_加速师_V0.1.md'
git commit -m "docs: expand ENFJ and ENTJ NPCs"
```

### Task 5: Synchronize the roster and validate the complete cast

**Files:**
- Modify: `未能输出/NPC设计/16型人格能力原型表_V0.1.md`
- Read: all 16 standalone NPC entries and the design spec.

**Interfaces:**
- Consumes: all 11 new documents from Tasks 1—4 and the five existing standalone NPC documents.
- Produces: a synchronized 16-type roster and verification evidence that filenames, statuses, ability names, boundaries, and emotional reversals are distinct.

- [ ] **Step 1: Update the shared roster**

Change INTJ from `军师`/`看见实现目标的前三步` to `预演师`/`预先看见自己按当前想法行动后的三十秒`. Change all 11 pending rows to `已有角色文档`. Preserve the five existing rows unchanged.

- [ ] **Step 2: Verify all 16 rows and all 16 standalone documents**

Run:

```powershell
$roster='未能输出/NPC设计/16型人格能力原型表_V0.1.md'; $r=Get-Content -LiteralPath $roster -Raw -Encoding UTF8; $types=@('ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ'); foreach($type in $types){if(([regex]::Matches($r,"\| $type \|")).Count -ne 1){throw "roster row error: $type"}}; if(([regex]::Matches($r,'已有角色文档')).Count -ne 16){throw 'not all roster entries finalized'}; $docs=Get-ChildItem -LiteralPath '未能输出/NPC设计' -Filter '*.md' -File | Where-Object {$_.Name -ne '16型人格能力原型表_V0.1.md'}; if($docs.Count -ne 16){throw "standalone count=$($docs.Count)"}; 'ROSTER_ROWS=16'; 'STANDALONE_DOCS=16'
```

Expected: `ROSTER_ROWS=16` and `STANDALONE_DOCS=16`.

- [ ] **Step 3: Run cross-character content checks**

Run:

```powershell
$new=@('ISFJ_契约师','INFJ_解梦师','INTJ_预演师','INFP_幻术师','ESTP_回档者','ESFP_配乐师','ENFP_唤犬师','ESTJ_执法官','ESFJ_食神','ENFJ_伯乐','ENTJ_加速师'); $required=@('一句话','人格','能力','限制','对白','玩家','披露','平衡','关系','本版本'); foreach($base in $new){$path="未能输出/NPC设计/${base}_V0.1.md"; $t=Get-Content -LiteralPath $path -Raw -Encoding UTF8; foreach($word in $required){if(-not $t.Contains($word)){throw "$base missing $word"}}; if($t -match '读取完整内心|直接确认完整真相|唯一正确答案'){throw "$base contains overpowered claim"}}; 'NEW_DOC_STRUCTURE_OK=11'
```

Expected: `NEW_DOC_STRUCTURE_OK=11`.

- [ ] **Step 4: Manually review the 11 one-line abilities and wounds for collisions**

Confirm all of the following exact distinctions:

- 契约师 tracks an unfulfilled promise; it does not judge sincerity.
- 解梦师 finds a memory source; it does not interpret dream meaning.
- 预演师 previews one self-authored path; it does not predict arbitrary people.
- 幻术师 externalizes written metaphor; it does not reveal hidden feelings.
- 回档者 changes three seconds of actual history; it does not replay memory like ISTJ.
- 配乐师 converts current mood to ambiguous music; it does not label emotion or motive.
- 唤犬师 recalls one happy memory; it does not erase grief.
- 执法官 records observable rule violations; it does not force obedience or detect lies.
- 食神 recreates a taste; it does not read or heal memories.
- 伯乐 compares a bounded set of recently practiced skills; it does not reveal unknown talents, destiny, or desire.
- 加速师 increases mastered repetitive-operation speed for an accepted task; it does not accelerate movement, combat, tools, compel consent, or grant skill.

- [ ] **Step 5: Commit roster integration**

```powershell
git add -- '未能输出/NPC设计/16型人格能力原型表_V0.1.md'
git commit -m "docs: complete sixteen-type NPC roster"
```

- [ ] **Step 6: Verify final branch state**

Run:

```powershell
git status -sb
git log -6 --oneline
```

Expected: clean `agent/expand-mbti-npcs` worktree with the plan commit, four authoring commits, and one roster integration commit.
