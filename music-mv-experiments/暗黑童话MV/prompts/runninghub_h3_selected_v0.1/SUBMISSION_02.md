# 《Before You Delete Me》H3 REF2VA Submission 02

## 本次目标

先单独重试 S01，确认服务器显存问题后，再按 S01、S02、S03 的顺序逐条执行。三条均保留15秒、16:9、三张参考图和对应音频切片不变，只将第二阶段细化分辨率从1.5 MP降到1.0 MP；第一阶段继续使用0.4 MP。

## 提交结果

| 任务 | Task ID | 终态 | Stage 1 | Stage 2 | API用量报告 |
| --- | --- | --- | --- | --- | --- |
| S01 | `2091532570893447169` | SUCCESS | 0.4 MP | 1.0 MP | `consumeCoins=130`、`taskCostTime=650`、`consumeMoney=null` |
| S02 | `2091536392642588674` | SUCCESS | 0.4 MP | 1.0 MP | `consumeCoins=138`、`taskCostTime=690`、`consumeMoney=null` |
| S03 | `2091539485614637058` | SUCCESS | 0.4 MP | 1.0 MP | `consumeCoins=130`、`taskCostTime=649`、`consumeMoney=null` |

三条成功任务合计消耗398点；均为顺序提交，没有并发运行。

## 输出

- S01视频：`outputs/runninghub_h3_selected_v0.2/S01/runninghub_h3_audio_2091532570893447169.mp4`
- S02视频：`outputs/runninghub_h3_selected_v0.2/S02/runninghub_h3_audio_2091536392642588674.mp4`
- S03视频：`outputs/runninghub_h3_selected_v0.2/S03/runninghub_h3_audio_2091539485614637058.mp4`
- 每段抽帧预览：对应 S01、S02、S03 目录下的 `preview/contact_sheet.jpg`。
- 单段媒体参数：1376×768、24 fps、15.083秒、H.264视频＋AAC双声道临时音轨。
- 三段粗剪：`outputs/roughcuts/Before_You_Delete_Me_H3_三段粗剪_V0.1.mp4`
- 粗剪总览：`outputs/roughcuts/preview/Before_You_Delete_Me_H3_三段粗剪_V0.1_contact_sheet.jpg`
- 粗剪参数：1376×768、24 fps、1006帧、41.917秒；使用完整选定Suno母带，S03的3.080秒技术静音未进入成片。
- 中英字幕成片：`outputs/roughcuts/Before_You_Delete_Me_H3_三段粗剪_中英字幕_V0.1.mp4`
- 可编辑字幕源：`subtitles/Before_You_Delete_Me_中英双语_V0.1.srt`、`subtitles/Before_You_Delete_Me_中英双语_V0.1.ass`
- 字幕时间轴依据实际主唱转写校准：00:06进入、00:40结束；英文以正式歌词为准，中文为本项目译文。ASS样式为英文骨白Baskerville、中文旧金Songti SC，双行居中置底。

## 基础画面检查

- 成功保持横版平面2D插画和编辑型MG语言，没有退回写实3D质感。
- 骑士在三段抽检帧中身份和服装基本稳定，经历坐姿、人物近景、持线/站姿和删除终端直视。
- S01完成白色选择框、平面场景拆分、圆环人物轮廓和红线拉出；S02完成月牙地图、缝合线、成年女性纸影和图形化转场；S03完成删除框、光标压迫、红眼近景和棋盘终端。
- 当前视频音轨仅作为H3参考与生成音轨；最终剪辑仍需删除它，并重新铺回完整Suno母带。
- 三段粗剪已经执行上述音轨替换，可直接用于整体节奏审看。

## 结论

三段均在15秒不变的情况下成功生成，说明15秒本身不是上一轮失败的决定因素；上一轮更可能由第二阶段1.5 MP的显存峰值叠加三任务并发触发。0.4 MP＋1.0 MP并逐条顺序提交是当前已验证可行的稳定参数。
