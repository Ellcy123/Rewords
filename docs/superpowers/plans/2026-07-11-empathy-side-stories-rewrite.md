# Emotional Side Stories Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite one ancient-drama branch and one knowledge-creator branch into complete emotional side stories without changing the first level's 56-node graph.

**Architecture:** Preserve every node ID and trigger edge. Rewrite only the six scripts that carry the two stories, rename four files whose titles change, then update the trigger table and 56-branch matrix as the two canonical indexes.

**Tech Stack:** UTF-8 Markdown narrative scripts, PowerShell validation, Git.

## Global Constraints

- Every video is at most 15 seconds, shows the strongest state at 0–1 seconds, and explains its core event within 5 seconds.
- Preserve `C001 + 录音笔 → C101` and `K001 + 梯子 → K101`.
- Preserve all 56 node IDs, every existing trigger edge, and all four purchasable items.
- Do not add product links to X022, X030, Y007, or Y009.
- Do not change Y005, Y006, Y008, Y010, Y011, or Y012.
- Do not add Meta or worldbuilding explanations to either emotional branch.

---

### Task 1: Rewrite the Ancient-Drama Story

**Files:**
- Modify: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/C_古装短剧线/C001_王妃翻墙私逃.md`
- Rename and modify: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次3_古装与知识区/X022_冷宫装上中央空调.md` → `X022_冷宫通风口里还有一个人.md`
- Rename and modify: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/Y_二层终局/皇家冷链/Y007_冰库录出了皇室真相秀.md` → `Y007_她终于说回了自己的名字.md`

**Interfaces:**
- Consumes: Existing edges `C001 + 空调师傅 → X022` and `X022 + 录音笔 → Y007`.
- Produces: A complete three-video story with unchanged IDs and growth states.

- [x] **Step 1: Rewrite C001's hidden motive without changing its resource role**

Keep the caught-on-the-wall opening, the national teacher's denial, the modern ladder product card, and the 11-second duration. Replace the flashback instruction with:

> “冷宫十九号撑不过今晚。娘娘若想救她，就出宫找大夫。”

Make the first five seconds still communicate only that the princess was framed and lacks evidence. Do not reveal 沈棠's name in C001.

- [x] **Step 2: Rename and rewrite X022 as a 12–14 second growth node**

Use the title `X022《冷宫通风口里还有一个人》`. Required beats:

1. 0–1 seconds: a repairman removes a vent grille and a hand reaches from the dark side room;
2. 1–5 seconds: “治人我不会，通风我能修”; he hears coughing and opens the blocked passage;
3. 5–10 seconds: the guard calls the woman “罪奴十九号”; the princess calls her “沈棠”;
4. final beat: 沈棠 says “娘娘，您还是没能出去啊。”

Keep `生长状态：继续生长，可接收现有四件物品` and `新商品链接：无`.

- [x] **Step 3: Rename and rewrite Y007 as a 13–15 second terminal**

Use the title `Y007《她终于说回了自己的名字》`. Required beats:

1. 0–1 seconds: 沈棠 faces the recorder and says “我叫沈棠，我不是十九号。”;
2. within 5 seconds: she states that she was forced to confess for someone else and that the national teacher used her illness to lure the princess;
3. the national teacher's punishment is a fast transition, not the emotional climax;
4. the princess places the recorder on the palace register and says “把她的名字写回去。”;
5. end outside the palace with “先出去。出去以后，名字就是自己的了。”

Keep `生长状态：终局，不再继续生长` and `新商品链接：无`.

- [x] **Step 4: Validate the ancient branch**

Run a PowerShell check that reads all three files as UTF-8 and asserts:

- C001 contains `冷宫十九号` and still contains `刺客同款多功能梯子`;
- X022 contains `沈棠`, `继续生长`, and `新商品链接：无`;
- Y007 contains `我不是十九号`, `名字写回去`, `终局，不再继续生长`, and `新商品链接：无`;
- every declared `总时长` is at most 15.

Expected: all assertions report `PASS`.

---

### Task 2: Rewrite the Knowledge-Creator Story

**Files:**
- Modify: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/K_知识博主线/K001_空调开十六度电脑会变快吗.md`
- Rename and modify: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/X_一层分支/批次3_古装与知识区/X030_跑分投大了就成科学大师.md` → `X030_她把错误投上了大屏.md`
- Rename and modify: `刷到你了/05_第一关_婚礼逆天改命/剧情节点/Y_二层终局/视觉科学大师/Y009_柱状图顺着梯子爬走了.md` → `Y009_不知道也可以继续讲.md`

**Interfaces:**
- Consumes: Existing edges `K001 + 投影服务 → X030` and `X030 + 梯子 → Y009`; the established semantic bridge `梯子 = VPN`.
- Produces: A complete three-video story with unchanged IDs and growth states.

- [x] **Step 1: Clarify K001's honest uncertainty**

Keep the frozen computer opening, the repairman product card, the inaccessible overseas test page, and the 10-second duration. End the experiment with:

> “关键数据在墙外。今天只能说，我没测明白。”

The creator is earnest and under-equipped, not knowingly deceptive. Preserve the product card copy `同城空调师傅上门一次` and its `吊顶、灯架` capability.

- [x] **Step 2: Rename and rewrite X030 as a 12–14 second growth node**

Use the title `X030《她把错误投上了大屏》`. Required beats:

1. 0–1 seconds: the incomplete chart fills a conference screen under “视觉科学大师”;
2. within 5 seconds: an audience member identifies the missing control group and asks whether the computer actually became faster;
3. the creator cannot answer because she measured temperature, not the claimed performance result;
4. the organizer whispers “观众不在乎对不对，只要你讲得像真的。”;
5. end on the creator holding her original notebook while the false title remains above her.

Keep `生长状态：继续生长，可接收现有四件物品` and `新商品链接：无`.

- [x] **Step 3: Rename and rewrite Y009 as a 13–15 second terminal**

Use the title `Y009《不知道，也可以继续讲》`. Required beats:

1. 0–1 seconds: the ladder becomes VPN and original papers load; the creator says “上一条视频是我做错了。”;
2. within 5 seconds: she finds that low temperature can affect cooling and performance, but her experiment cannot prove its title;
3. on stage she deletes the prepared shock conclusion and says “我今天不是来教答案，我是来告诉你们，我错在哪。”;
4. a student asks “不知道也可以站在这里吗？”;
5. she answers “知道自己不知道，就是第一步。” and renames the account `《今天也没完全搞懂》`.

Keep `生长状态：终局，不再继续生长` and `新商品链接：无`.

- [x] **Step 4: Validate the knowledge branch**

Run a PowerShell check that reads all three files as UTF-8 and asserts:

- K001 contains `我没测明白`, `ACCESS DENIED`, and `同城空调师傅上门一次`;
- X030 contains `缺少对照组`, `讲得像真的`, `继续生长`, and `新商品链接：无`;
- Y009 contains `上一条视频是我做错了`, `知道自己不知道`, `终局，不再继续生长`, and `新商品链接：无`;
- every declared `总时长` is at most 15.

Expected: all assertions report `PASS`.

---

### Task 3: Synchronize Canonical Indexes and Verify the Graph

**Files:**
- Modify: `刷到你了/05_第一关_婚礼逆天改命/01_触发关系总表.md`
- Modify: `刷到你了/05_第一关_婚礼逆天改命/03_56条分支矩阵与批次.md`
- Include: `docs/superpowers/plans/2026-07-11-empathy-side-stories-rewrite.md`

**Interfaces:**
- Consumes: Final X022, Y007, X030, and Y009 titles from Tasks 1–2.
- Produces: Canonical indexes matching every renamed narrative file.

- [x] **Step 1: Update the trigger table**

Replace the four old titles with:

- `X022《冷宫通风口里还有一个人》` and describe it as a narrative growth branch;
- `Y007《她终于说回了自己的名字》` and describe it as a non-Meta terminal;
- `X030《她把错误投上了大屏》` and describe it as a narrative growth branch;
- `Y009《不知道，也可以继续讲》` and describe it as a non-Meta terminal.

Do not change source nodes, item names, IDs, Meta levels, or growth states.

- [x] **Step 2: Update the 56-branch matrix**

Replace the same four old titles in the X and Y tables. Change X022 and X030's result-type wording from generic `另一种人生` to `剧情支线`, while keeping `二层生长点`. Keep both Y nodes terminal.

- [x] **Step 3: Run full validation**

Run checks with these expected results:

- recursive narrative Markdown count: `56`;
- unique X IDs in the matrix: `34`;
- unique Y IDs in the matrix: `12`;
- Y trigger rows in the trigger table: `12`;
- no old titles in the two canonical indexes or active narrative files;
- the unfinished-marker scan returns no matches in changed files;
- `git diff --check` exits `0`.

- [x] **Step 4: Commit the rewrite**

Stage the six scripts, two canonical indexes, and this plan. Commit with:

```text
Rewrite two branches as emotional side stories
```
