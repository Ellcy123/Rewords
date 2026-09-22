# 🎤 Rapper Coach

一个为说唱创作设计的 AI Coach Skill。不只是生成歌词，而是帮你**分析、修改、提升**说唱歌词的创作水平。

## 核心能力

| 模块 | 功能 |
|------|------|
| **韵脚引擎** | 检查多音节韵、家族韵、斜韵，标出破韵和近韵 |
| **Flow 分析** | 用拍子图分析重音分布，建议换气点和 Flow Switch |
| **Punchline 顾问** | 优化 setup/punchline 结构，挖掘 wordplay 和 callback |
| **风格模仿** | 分析任意 rapper 的风格特征，给出靠近风格的修改建议 |
| **Battle Prep** | 生成 angle ideas、rebuttal 框架和 diss bars |
| **韵脚词典** | 本地查询同韵母汉字，辅助押韵创作 |

## 🆕 v2.0 更新

- **韵脚引擎增强**: 支持多音节韵匹配、家族韵相似度计算、斜韵检测
- **Flow 分析工具**: 自动生成拍子图、检测换气点、建议 Flow Switch
- **歌词分析脚本**: 一键生成完整分析报告（韵脚+Flow+Punchline+词汇）
- **语音输入支持**: 网页端支持浏览器语音识别（Web Speech API），直接口述歌词
- **语音反馈**: 分析完成后可播放语音版反馈报告
- **OpenLess 集成**: 本地 FastAPI 服务，兼容 OpenAI API，语音输入直接分析
- **韵脚词典升级**: 多音字支持、按常用度排序、词组韵脚查询
- **Tailwind 前端**: 暗色主题网页界面，支持可视化分析报告

## 适用平台

本 Skill 基于 [Hermes Agent](https://github.com/hermes-agent) / [OpenClaw](https://openclaw.ai) 的 Skill 规范编写，可直接放入 `~/.hermes/skills/` 或兼容的 Agent 系统中使用。

**新增**: 现在也支持通过 **OpenLess** 语音输入接入，以及独立的 **Web 前端页面**！

## 触发词

- "帮我看看这段词"
- "这段 rap 怎么改"
- "flow 怎么调整"
- "韵脚检查"
- "韵脚查询"
- "查韵脚"
- "battle prep"
- "说唱教练"
- "rapper coach"

## 工作流程

### A. 改词/点评
接收歌词 → 逐段分析 → 多维度打分 → 给出修改版 → 解释改动原因

### B. 从零创作
收集主题/情绪/参考 rapper → 出大纲 → 出第一版歌词 → 迭代优化

### C. Battle Prep
收集对手信息 → 生成 Angle List → 写 Bars → 给 Rebuttal 框架

## 文件结构

```
rapper-coach/
├── SKILL.md                    # Skill 完整定义
├── README.md                   # 本文件
├── LICENSE                     # MIT License
├── requirements.txt            # Python 依赖
├── .gitignore                  # Git 忽略规则
├── frontend/
│   └── index.html              # Tailwind 前端页面（支持语音输入）
└── scripts/
    ├── rhyme_lookup.py         # 韵脚查询工具 (升级版)
    ├── rhyme_engine.py         # 韵脚引擎增强
    ├── flow_analyzer.py        # Flow 分析工具
    ├── lyric_analyzer.py       # 歌词综合分析脚本
    ├── server.py               # OpenLess 集成服务 + Web 前端托管
    └── pinyin_dict.json        # 开源拼音字典（约 2万+ 汉字）
```

## 🚀 快速启动（推荐）

### 一键启动 Web 界面（支持语音输入）

```bash
cd scripts
pip install -r ../requirements.txt
python server.py --port 8765
```

浏览器访问 **http://localhost:8765/**

### Web 界面功能

- **语音输入**: 点击麦克风按钮，直接口述歌词（需 Chrome/Edge 浏览器）
- **实时转录**: 语音实时显示转录文本
- **自动分析**: 语音输入结束后自动触发分析
- **语音反馈**: 分析完成后点击播放按钮，Rapper Coach 用语音朗读反馈报告
- **可视化报告**: 综合评分环形图、韵脚分类标签、Flow 拍子图、Punchline 高亮

### 截图

![前端界面](frontend/screenshot.png)

---

## 🎙️ OpenLess 语音集成

如果你使用 **OpenLess** 桌面应用，可以将 Rapper Coach 配置为自定义 LLM Provider：

### 启动服务

```bash
cd scripts
python server.py --port 8765
```

### OpenLess 配置

1. 打开 OpenLess → Settings → LLM Provider
2. 选择 **Custom / OpenAI-compatible**
3. 配置如下：
   - **API Endpoint**: `http://localhost:8765/v1/chat/completions`
   - **API Key**: 任意非空字符串（如 `rapper-coach`）
   - **Model**: `rapper-coach-v1`
4. 保存设置

### 使用方法

1. 按住 OpenLess 热键说话，例如：
   > "帮我看看这段词，我站在高处俯瞰这座城市，灯光闪烁像是我未来的样子"
2. 松开热键
3. Rapper Coach 会自动分析你的歌词并返回分析报告

---

## 🛠️ 命令行工具

### 韵脚查询

```bash
# 单字查询
python scripts/rhyme_lookup.py 城 -n 15

# 词组查询（查词尾字的韵脚）
python scripts/rhyme_lookup.py 城市 -n 15

# 包含家族韵和斜韵
python scripts/rhyme_lookup.py 城 --slant -n 20

# JSON 输出
python scripts/rhyme_lookup.py 城 -j
```

### 韵脚引擎

```bash
# 两个字匹配
python scripts/rhyme_engine.py 城市 --match-with 成诗

# 查找押韵字
python scripts/rhyme_engine.py 城 --find-rhymes -n 15

# 分析多行韵脚模式
python scripts/rhyme_engine.py test --lines "我站在高处俯瞰这座城" "霓虹闪烁像是我的人生" "每一盏灯都是一个剧本"
```

### Flow 分析

```bash
python scripts/flow_analyzer.py "我站在高处俯瞰这座城，霓虹闪烁像是我的人生"
```

### 歌词综合分析

```bash
# 直接输入歌词
python scripts/lyric_analyzer.py "我站在高处俯瞰这座城市，灯光闪烁像是我未来的样子"

# 从文件读取
python scripts/lyric_analyzer.py lyrics.txt --file

# JSON 输出
python scripts/lyric_analyzer.py "歌词..." -j
```

## API 端点

| 端点 | 说明 |
|------|------|
| `GET /` | 前端 Web 界面 |
| `POST /v1/chat/completions` | OpenAI 兼容接口（供 OpenLess 使用） |
| `POST /analyze` | 直接分析接口（接收 JSON `{ "text": "歌词" }`） |
| `GET /v1/models` | 列出可用模型 |
| `GET /health` | 健康检查 |

## 设计理念

市面上已有不少"歌词生成器"，但 **Rapper Coach** 选择做**教练**而非**代笔**：
- 不给你空泛的"更有力量一些"
- 而是具体告诉你"把尾音收短，重音放在第二拍"
- 让你理解"为什么这么改"，真正提升创作能力

## License

MIT
