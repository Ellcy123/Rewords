# DeepSeek 测试供应商设计

**日期：** 2026-07-21

## 目标

让现有炎鑫 AI 服务在保留 OpenAI 支持的同时，可以使用 DeepSeek 官方 API 进行手机端真实模型测试。

## 设计

- 新增 `AI_PROVIDER=openai|deepseek`，默认保持 `openai`。
- DeepSeek 使用官方 `https://api.deepseek.com` 的 Chat Completions 与 JSON Output；模型默认由本机环境明确提供，本次测试使用 `deepseek-v4-flash`。
- 浏览器请求和成功响应继续使用现有 `ChatRequest` / `ChatResponse`，不修改前端。
- DeepSeek 返回的 JSON 必须再次通过现有 Zod、任务阶段、金币/解锁/商品交易等领域守卫；空内容、非法 JSON、越权内容和网络异常继续返回 503，让前端走确定性 fallback。
- Key 只存放在被 Git 忽略的本机 `.env`，不进入日志、测试、提交或 PR。

## 配置

```dotenv
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
PORT=8787
```

服务端直接启动时加载本机 `.env`；缺失或无效配置必须显示具体变量名，但不得输出变量值。

## 验证

- fake client 证明请求发送到 Chat Completions，包含 JSON Output 与 JSON 格式说明。
- 配置测试覆盖 OpenAI 默认路径、DeepSeek 路径和缺失变量。
- 服务端完整测试、类型检查和构建通过。
- 使用本机 DeepSeek Key 进行一条不含个人信息的真实冒烟请求；只记录状态、结构化信号和语气，不记录 Key。
