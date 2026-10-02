# B纸片单件 Unity 编译报告

日期：2026-09-29

隔离工程 `/tmp/catgame-b-paper-trial` 使用 Unity `6000.4.0f1` 完成 `StandaloneOSX` Player 构建。Unity CLI 返回 `success: true`、Editor exit code `0`，日志记录 `Build Finished, Result: Success`；日志未发现 C# 编译错误。

构建产物：`/tmp/catgame-b-paper-trial-qa/CatGame-BPaperTrial.app`

构建日志：`/tmp/catgame-b-paper-trial-qa/unity-build.log`

本轮只确认项目可编译并生成 Player。准备态/结算态截图、透明边与切角、长按钮变形、中文安全区、按钮实际命中与动作均未完成视觉或交互验收；没有真实触摸测试。原因是 trial 的 Unity CLI Pipeline 实例不可达，执行的 headless build 不会输出游戏画面；现有 `/tmp/catgame-program-ui-qa/capture_state.py` 指向另一份旧工程和旧 Player 状态，不能作为本次截图证据。Transition 仍为临时 `None`；按下态和禁用态未验收，仍需独立纸层。
