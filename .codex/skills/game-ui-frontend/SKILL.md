---
name: game-ui-frontend
description: Design game HUDs, menus, overlays and responsive layouts that protect the playfield. Includes project-specific guidance for 猫窝乱斗 Unity Canvas UI; browser implementation rules apply only to browser games.
---

# Game UI Frontend

## 猫窝乱斗项目适用边界

本副本安装于 2026-09-28，来源为 [OpenAI game-ui-frontend](https://github.com/openai/plugins/tree/main/plugins/game-studio/skills/game-ui-frontend)。下列内容为本项目适配，上游正文保留在后文。

- 修改猫窝乱斗布局时先读取策划文档和现有界面。策划决定玩法及具体外观；美术文档负责提示词，不将临时示意外观当成最终设计。
- 用户已选择程序 UI：沿用 Unity Canvas/uGUI。后文 DOM、CSS、WebGL 和浏览器输入规则不适用于该项目；不因此更换技术栈。
- 棋盘是核心玩法区域。后文 3D 场景的中央留空与 HUD 覆盖比例不直接套用；保证猫、用品、邻接关系可读，并给敌人本体及攻击反馈留下空间。
- 分别设计准备、战斗和结算状态，围绕各状态的当前操作安排主次；避免常驻展开教程、商店、日志与所有操作。
- Boss 的位置、尺寸和屏幕分区比例需通过实际画面确定。此前提出的 5%/25%/45%/25% 仅为助手草案，不是已确认规格。
- IAA 广告入口结合当前奖励需求与游戏状态，不擅自增加广告形式、频率或新玩法。这份 skill 不宣称提供经过商业验证的 IAA 模板。
- 按项目 AGENTS.md，由 Luna（gpt-6-luna，xhigh）执行测试与视觉审查；审查需覆盖实际手机比例的准备、战斗、结算画面和 Boss 可见性。编译成功、文字不溢出不能代表布局合格。同一审查项累计三次不通过后停止重做，明确记录未通过项。

### 说明、状态与操作必须分开（2026-09-29 用户纠正）

- 同一美术家族不等于所有控件同一造型。非交互说明、状态标签不得套用按钮的双层厚边/按压外观；用平面低对比底板、简短标签或临时提示。按钮才有可按下的层次和明显命中区。
- 先删掉无意义的常驻框再安排字号：未开放商品位不作为禁用购买按钮展示；空待放区不占一条醒目的消息按钮；教程与状态消息不重复常驻。
- 主操作按状态唯一突出；刷新属于商店区域，广告奖励属于资源补给，设置/重开低频入口集中处理。减少视觉上的按钮数量，不能删除必要玩法或把可用功能藏到不可发现的位置。
- 字体必须检查实际文件的静态/可变属性与默认字重。Unity FontStyle.Normal不保证可变字体取到400；猫窝当前NotoSansSC.ttf的wght默认100，不能拿这个极细实例作为正文标准。优先明确静态Medium/500与Bold/700，正文不用全局描边或合成加粗掩盖问题。
- 视觉验收必须回答“哪些能点、主要先点什么、说明能否读清”，不能仅凭不遮挡、不溢出或测试通过宣布设计合格。商业案例标明平台/画面类型；带广告或混合变现不冒充纯IAA。

## Overview

Use this skill whenever the game needs a visible interface layer. The job is not to produce generic dashboard UI. The job is to produce a readable, thematic browser-game interface that supports the play experience.

Default assumption: build the game world in canvas or WebGL, and build text-heavy UI in DOM.

## Frontend Standards

1. Establish visual direction before coding.
   - Genre and fantasy
   - Material language
   - Typography
   - Palette
   - Motion tone
2. Use CSS variables for the UI theme.
3. Build clear hierarchy.
   - Critical combat or survival information first
   - Secondary tools second
   - Rarely used settings behind menus or drawers
4. Protect the playfield first, especially in 3D.
   - The initial screen should feel playable within a few seconds.
   - Default to one primary persistent HUD cluster and at most one small secondary cluster.
   - Keep the center of the playfield clear during normal play.
   - Keep the lower-middle playfield mostly clear during normal play.
   - Put lore, field notes, quest details, and long control lists behind drawers, toggles, or pause surfaces.
   - Prefer contextual prompts and transient hints over permanent boxed panels.
5. Keep overlays readable over motion.
   - Use backing panels, edge treatment, contrast, and restrained blur where needed.
6. Design for both desktop and mobile from the start.
7. Design 3D UI around camera and input control boundaries.
   - Pause or gate camera-control input when menus, dialogs, or pointer-driven UI are active.
   - Keep pointer-lock, drag-to-look, and menu interaction states explicit.

## 3D Starter Defaults

For exploration, traversal, or third-person starter scaffolds, prefer this UI budget:

- one compact objective chip or status strip at the edge
- one transient controls hint or interaction prompt
- one optional collapsible secondary surface such as a journal, map, or quest log

Do not open every informational surface on first load. The scene should be readable before the user opens any deeper UI.

As a default implementation constraint for 3D browser games:

- no always-on full-width header plus multi-card body plus full-width footer layout
- no large center-screen or lower-middle overlays during normal movement
- no more than roughly 20-25% of the viewport covered by persistent HUD on desktop unless the user explicitly requests a denser layout
- on mobile, collapse to a narrow stack or contextual chips before covering the playfield with larger panels

## Prompting Rules

When asking the model to design or implement game UI, include:

- the game fantasy
- the camera or viewpoint
- the player verbs
- the HUD layers
- the camera or control mode when the game is 3D
- the tone of motion
- desktop and mobile expectations
- playfield protection and disclosure strategy
- explicit anti-patterns to avoid

Use [frontend-prompts.md](https://github.com/openai/plugins/blob/main/plugins/game-studio/references/frontend-prompts.md) for concrete prompt shapes.

## Motion Rules

- Prefer a few meaningful transitions over constant micro-animation.
- Reserve strong motion for state change, reward, danger, and onboarding.
- Respect reduced-motion settings for non-essential animation.
- Keep 3D HUD motion from competing with camera motion.

## What Good Looks Like

- HUD elements are legible without flattening the scene.
- Menus feel native to the game world, not like a SaaS admin panel.
- Layout adapts cleanly across breakpoints.
- Pointer, keyboard, and game-state feedback are obvious.
- In 3D games, menu and HUD states do not fight camera control or pointer-lock.
- In 3D games, the first playable view keeps most of the viewport available for movement, aiming, and spatial reading.
- Persistent information density is low enough that screenshots still read as game scenes, not UI comps.

## Anti-Patterns

- Generic app dashboard layouts
- Flat placeholder styling with no theme
- Default font stacks without intent
- Dense overlays that obscure the playfield
- Large title cards or multi-paragraph notes sitting over a live playable scene
- Equal-weight boxed panels distributed around every edge of the viewport
- Controls, objectives, notes, and lore all expanded at once on first load
- Full-width top-and-bottom chrome with large always-on center or body panels in 3D play
- Excessive motion on every element
- Canvas-only UI when DOM would be clearer and cheaper
- Forcing HUD controls into the 3D scene when standard DOM would be clearer
- Letting camera input remain active under modals or inventory panels

## References

- Shared architecture: [SKILL.md](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/web-game-foundations/SKILL.md)
- Prompt recipes: [frontend-prompts.md](https://github.com/openai/plugins/blob/main/plugins/game-studio/references/frontend-prompts.md)
- Low-chrome 3D layout patterns: [three-hud-layout-patterns.md](https://github.com/openai/plugins/blob/main/plugins/game-studio/references/three-hud-layout-patterns.md)
- React-hosted 3D UI context: [SKILL.md](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/react-three-fiber-game/SKILL.md)
- Playtest review: [playtest-checklist.md](https://github.com/openai/plugins/blob/main/plugins/game-studio/references/playtest-checklist.md)
