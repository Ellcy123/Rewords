# 《Before You Delete Me》新版 H3 REF2VA Dry-run

## 工作流

- RunningHub Webapp：`2087127180013817858`
- 模型：MiniMax H3 REF2VA 两阶段多参考工作流
- 成片：16:9 横版
- H3任务时长：每条15秒
- Stage 1：16:9、0.4 MP
- Stage 2：16:9、1.5 MP
- 状态：三条任务均通过 dry-run，尚未付费提交

## 固定输入

- Picture 2：`references/characters/骑士_角色参考图_01.png`
- Picture 3：`风格参考图_01_太阳塔罗环形构图.png`
- Reference Audio 2：不单独提供，由工作流复制 Audio 1 作为占位；提示词不描述该副本

## 任务

| 任务 | Picture 1 | Reference Audio 1 | Prompt | Dry-run |
| --- | --- | --- | --- | --- |
| S01 | `keyframes/selected/K01_S01_废弃素材中醒来_start.png` | `sources/audio_segments_selected_v0.1/S01_00-15s.wav` | `S01.txt` | PASS |
| S02 | `keyframes/selected/K02_S02_缝合月影王国_start.png` | `sources/audio_segments_selected_v0.1/S02_15-30s.wav` | `S02.txt` | PASS |
| S03 | `keyframes/selected/K03_S03_删除悬停直视_start.png` | `sources/audio_segments_selected_v0.1/S03_30-41.92s_padded15s.wav` | `S03.txt` | PASS |

## S03裁切规则

- 00:00.000–00:11.920：正式歌曲画面。
- 00:11.920–00:15.000：技术静音尾段，只保持最终悬停状态，不增加新剧情。
- 最终剪辑只取前11.920秒，并重新铺回41.920秒完整母带。

## 付费边界

三条任务随后已得到用户确认并正式提交，但均因 RunningHub 服务器端显存不足失败。详见 `SUBMISSION_01.md`；没有自动重提。
