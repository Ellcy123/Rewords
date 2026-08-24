# 《Before You Delete Me》H3 REF2VA Submission 01

## 提交结果

| 任务 | Task ID | 终态 | 输出 | API用量报告 |
| --- | --- | --- | --- | --- |
| S01 | `2091528189200531458` | FAILED | 无 | `consumeMoney=null`、`consumeCoins=null`、`taskCostTime=0` |
| S02 | `2091528312542416898` | FAILED | 无 | `consumeMoney=null`、`consumeCoins=null`、`taskCostTime=0` |
| S03 | `2091528309711261698` | FAILED | 无 | `consumeMoney=null`、`consumeCoins=null`、`taskCostTime=0` |

## 失败原因

三条任务均通过输入上传、工作流创建和参考映射，随后在服务器的 `SamplerCustomAdvanced` 采样节点因显存不足终止：

- S01、S03：`torch.OutOfMemoryError`
- S02：`VRAM grow failed`

失败发生在 RunningHub 服务器端，不是图片路径、音频、提示词、时长或16:9节点映射错误。三条任务均没有生成可下载 MP4，API用量字段没有报告金额或金币消耗。

## 当前处理

- 未自动重新提交，避免重复任务。
- 正式关键帧、音频切片和三条提示词保持不变。
- 推荐下一次先单独重试 S01，保持 Stage 1 为0.4 MP，将 Stage 2 从1.5 MP降至1.0 MP；成功后再顺序提交 S02、S03，避免三条同时占用高显存实例。
