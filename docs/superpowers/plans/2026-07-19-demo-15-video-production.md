# 《刷到你了》Demo 15 条真实视频批量制作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留 W001、W101，制作并接入其余 13 条约 8 秒的 9:16 真实视频，使当前 Demo 的 15 个节点全部使用真实 MP4。

**Architecture:** 用一个受版本控制的批次清单集中保存节点、参考图、关键帧描述、视频动作描述和字幕时间轴；用单节点、单次提交的本地脚本调用现有 RunningHub LTX2.3 AI App，避免自动重试和重复扣费。三套视觉参考分别约束婚礼、古装、知识线；前端媒体映射独立于剧情节点定义，播放器继续使用 `currentTime` 字幕和 CSS 回退。

**Tech Stack:** Codex image generation、RunningHub OpenAPI、LTX2.3、Node.js 20+、FFmpeg/ffprobe、React 19、TypeScript 7、Vite 8、Vitest 4

## Global Constraints

- 仅新增 W300、W301、W400、C001、C101、K001、K101、X001、X004、X012、X016、X021、X028；不重做 W001、W101。
- 每个节点首次只提交一次付费任务；只有人工判定严重失败才显式提交第二次；全批次最多 26 次。
- RunningHub WebApp ID 固定为 `2031277395491164161`，节点固定为 `3/image`、`65/text`、`83/value=8`、`219/value=false`。
- API Key 只从进程环境读取，不写入项目文件、命令参数、日志或 Git；脚本不得打印签名上传或下载 URL。
- 原始视频不烧录游戏字幕；字幕由网页播放器依据 `video.currentTime` 显示。
- 输出必须为约 8 秒、9:16、H.264/AAC、可完整解码的浏览器 MP4，无血腥、直接人体撞击、品牌、水印或生成文字。
- 保留媒体加载失败时的 CSS `FallbackStoryStage`，不修改剧情树、触发关系、物品系统或通关逻辑。
- 不添加新的 npm 运行时依赖。
- 不修改或提交 `刷到你了/assets/video-tests/.DS_Store`。

## File Map

- Create: `刷到你了/video-production/demo-15-manifest.json` — 13 条待制作节点的唯一生产清单。
- Create: `刷到你了/video-production/validate-manifest.mjs` — 校验节点集合、提示词、字幕和路径约定。
- Create: `刷到你了/video-production/run-runninghub-node.mjs` — 每次只提交一个节点的一次 RunningHub 任务。
- Create: `刷到你了/assets/video-tests/{W300,W301,W400,X001,X004,X012,X016,C001,C101,X021,K001,K101,X028}/` — 每个节点的关键帧、原始 MP4、缩略图、字幕和生成记录。
- Create: `刷到你了/web-prototype/src/content/media.ts` — 15 个节点的网页媒体映射。
- Modify: `刷到你了/web-prototype/src/content/nodes.ts` — 从媒体映射附加媒体，移除 W001/W101 内联重复配置。
- Modify: `刷到你了/web-prototype/src/content/validate.ts` — 要求当前 Demo 所有节点具有结构有效的媒体配置。
- Modify: `刷到你了/web-prototype/src/tests/content.test.ts` — 覆盖 15 个媒体路径和字幕。
- Modify: `刷到你了/web-prototype/src/tests/story-stage-media.test.tsx` — 更新无媒体回退用例为显式测试节点。
- Modify: `刷到你了/web-prototype/README.md` — 修正 15 条节点并记录全真实视频状态。

---

### Task 1: 建立并验证批次生产清单

**Files:**
- Create: `刷到你了/video-production/demo-15-manifest.json`
- Create: `刷到你了/video-production/validate-manifest.mjs`

**Interfaces:**
- Consumes: 设计规格、13 个节点脚本、W001/W101 视觉参考。
- Produces: `entries: Array<{id, channel, title, reference, keyframeBrief, motionBrief, captions}>`，供图片生成、RunningHub 脚本和前端媒体映射共同使用。

- [ ] **Step 1: 创建包含完整 13 节点内容的清单**

清单顶层固定使用 `webappId: "2031277395491164161"`、`duration: 8` 和包含下列 13 个对象的 `entries` 数组。

`entries` 必须按下列精确数据写入；每条字幕样式依次为 `result`、`explanation`、`comment`，区间固定为 `0–2.2`、`2.2–5`、`5–8`：

| ID | channel | reference | keyframeBrief | motionBrief | 三条字幕文本 |
|---|---|---|---|---|---|
| W300 | wedding | `assets/video-tests/W001/W001_keyframe_v1.png` | 同一新娘在婚礼舞台中央握手感谢浅灰衬衫空调师傅，伴娘在侧后方竖起手机偷拍，新郎刚看见偷拍视频 | 伴娘偷拍并把手机递给新郎；新郎质问，新娘解释，宾客转头，最后新娘独自留在舞台 | `新娘活下来了，婚礼却死了` / `救命的握手，被剪成了私会` / `前后内容呢？有证据吗？` |
| W301 | wedding | `assets/video-tests/W001/W001_keyframe_v1.png` | 同一新娘高举拇指大小的黑色录音录像笔，前排宾客挤近、后排宾客茫然，远处婚礼大屏仍亮着装饰画面 | 新娘播放证据并高举录音笔；宾客向前挤却听不清看不见；镜头拉远同时保留小录音笔和远处大屏 | `证据录到了` / `后排看不见，现场听不清` / `证据没问题，屏幕有问题` |
| W400 | wedding | `assets/video-tests/W001/W001_keyframe_v1.png` | 同一新娘手持话筒站在婚礼大屏前，大屏用无文字的左右分屏表现剪辑片段与完整原片，伴娘被宾客注视 | 大屏开始并排播放证据，宾客转头看伴娘；新娘举起话筒让婚礼继续，花瓣落下，全场恢复庆祝 | `完整证据已经上大屏` / `剪辑版与完整原片同时播放` / `造谣的下线，婚礼继续` |
| X001 | wedding | `assets/video-tests/W001/W001_keyframe_v1.png` | 同一婚礼灯架下，浅灰衬衫空调师傅拿激光测距仪仰头检查，墙角完全没有梯子，新娘在危险灯架下方 | 师傅专业测量并抬手表示够不到；众人寻找空荡墙角；灯架突然倾斜，众人躲避，撞击前白闪 | `师傅到了，还是够不着` / `专业到了，高度没到` / `现场不具备登高条件` |
| X004 | wedding | `assets/video-tests/W101/W101_keyframe_v1.png` | 同一婚礼灯架左右各有一把完整银色伸缩梯，两名年轻伴郎分别站在顶部准备同时操作两侧卡扣 | 两名外行互相点头后同时拔错承重销；灯架立刻下坠，两人紧抓梯子，撞击前白闪 | `两把梯子，还是不会修` / `高度翻倍，知识没有` / `脑子问题：仍未解决` |
| X012 | wedding | `assets/video-tests/W001/W001_keyframe_v1.png` | 婚礼舞台改成简陋情感维修直播间，同一新娘与浅灰衬衫师傅坐在桌后，师傅手持测温枪，一对夫妻坐在对面 | 师傅先展示维修单又慌张解释；随后用测温枪测量夫妻之间的距离，新娘快速记录工单，宾客排队咨询 | `师傅开始维修这段感情` / `深度服务，指的是吊顶深度` / `感情温度 16 度，建议检修` |
| X016 | wedding | `assets/video-tests/W001/W001_keyframe_v1.png` | 同一婚礼舞台桌面放着两支相对摆放的黑色录音笔，新娘俯身操作，宾客准备围观，灯光开始呈现夜店色彩 | 两支录音笔互相播放形成节奏反馈；宾客随节拍点头，灯光切为派对模式，新娘转动混音旋钮 | `证据被录成了第二遍` / `真相没放大，回声放大了` / `热门单曲：《我剪剪剪的》` |
| C001 | costume | none | 年轻中国王妃穿红金华服卡在高大宫墙顶端，一只绣鞋落在皇帝面前，国师站在一旁，墙边清楚放着现代银色伸缩梯 | 王妃试图下墙并指向国师；国师后退否认，皇帝质问；镜头最后移向完整现代伸缩梯 | `王妃翻墙私逃，被抓现行` / `国师：娘娘有证据吗？` / `三丈宫墙，一梯到顶` |
| C101 | costume | `assets/video-tests/C001/C001_keyframe_v1.png` | 同一王妃在金銮殿高举现代黑色录音录像笔，前排大臣凑近、后排大臣看不见，皇帝指向宽阔影壁 | 王妃播放小屏证据，大臣们向前挤；皇帝拍案后指向影壁，镜头在录音笔和影壁之间移动 | `国师抵赖，被录下来了` / `证据太小，满朝文武看不清` / `把证据投到影壁上` |
| X021 | costume | `assets/video-tests/C001/C001_keyframe_v1.png` | 同一王妃从宫墙跃下，身后多名宫女各拿完整银色伸缩梯，侍卫被安排成跑酷障碍 | 王妃安全落地后摆放三把梯子，宫女依次翻越，侍卫举牌打分，动作像荒诞宫廷体育课 | `冷宫王妃，转行跑酷教练` / `不逃，计时` / `三丈宫墙，七天结业` |
| K001 | knowledge | none | 年轻中国女知识博主坐在简陋科技工作室桌前，结霜笔记本刚黑屏，空调师傅拿遥控器站在旁边，冷风吹起纸张 | 笔记本结霜并熄屏；博主严肃检查，师傅摇头；博主重启电脑后屏幕显示抽象的访问受阻图形 | `结论：电脑先冻关机了` / `你要的是散热，不是把电脑送走` / `关键数据在墙外` |
| K101 | knowledge | `assets/video-tests/K001/K001_keyframe_v1.png` | 同一博主和工作室，笔记本显示无品牌的绿色连接图标与已打开网页，巨大录音笔商品图片弹窗遮住数据 | 绿色连接图标亮起，网页打开半秒后被录音笔图片弹窗覆盖；博主从期待变为无语并看向镜头 | `梯子连接成功` / `知识区的梯子，当然是 VPN` / `翻了半天，先精准投放我` |
| X028 | knowledge | `assets/video-tests/K001/K001_keyframe_v1.png` | 同一工作室有两位空调师傅从左右向结霜笔记本送冷风，博主拿着冰镇饮料，电脑周围像小型冷藏柜 | 两台临时空调同时送风，霜层快速增加；博主从电脑旁取出饮料，两位师傅尝试解冻，镜头轻快后退 | `电脑没变快，变成冰箱了` / `两位师傅，双空调对吹` / `本期结论：能冷藏，不能跑分` |

每个 `keyframeBrief` 前拼接准确的视觉包描述，每个 `motionBrief` 后拼接以下固定约束，并把拼接后的完整文本分别保存为 `keyframePrompt` 与 `videoPrompt`：

```text
Vertical 9:16, polished realistic Chinese mobile short-drama cinematography, coherent people and object geometry, clear foreground action, safe space above the bottom interaction area. No generated text, subtitles, UI, brands, logos, watermark, blood, injury, direct body impact, malformed hands, duplicate main character, or impossible prop geometry.
```

- [ ] **Step 2: 创建清单校验器**

`validate-manifest.mjs` 必须读取相邻 JSON，要求 ID 集合精确等于 13 个目标节点、ID 不重复、`keyframePrompt`/`videoPrompt` 非空、参考路径存在或为 `null`，每条恰有三段字幕，字幕从 0 开始、连续、不重叠并在 8 秒结束。校验成功打印：

```js
import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const project = resolve(here, '..')
const manifest = JSON.parse(await readFile(resolve(here, 'demo-15-manifest.json'), 'utf8'))
const expectedIds = [
  'W300', 'W301', 'W400', 'X001', 'X004', 'X012', 'X016',
  'C001', 'C101', 'X021', 'K001', 'K101', 'X028',
]
const fail = message => { throw new Error(message) }

if (manifest.webappId !== '2031277395491164161') fail('invalid webappId')
if (manifest.duration !== 8) fail('invalid duration')
if (!Array.isArray(manifest.entries)) fail('entries must be an array')

const ids = manifest.entries.map(entry => entry.id)
if (new Set(ids).size !== ids.length) fail('duplicate entry id')
if (ids.length !== expectedIds.length || expectedIds.some(id => !ids.includes(id))) {
  fail('entry ids do not match demo batch')
}

for (const entry of manifest.entries) {
  if (!['wedding', 'costume', 'knowledge'].includes(entry.channel)) fail(`invalid channel: ${entry.id}`)
  if (!entry.title?.trim()) fail(`missing title: ${entry.id}`)
  if (!entry.keyframePrompt?.trim()) fail(`missing keyframePrompt: ${entry.id}`)
  if (!entry.videoPrompt?.trim()) fail(`missing videoPrompt: ${entry.id}`)
  if (entry.reference !== null) {
    try {
      await access(resolve(project, entry.reference))
    } catch (error) {
      const referenceId = entry.reference.match(/^assets\/video-tests\/([A-Z][0-9]{3})\/\1_keyframe_v1\.png$/)?.[1]
      if (error?.code !== 'ENOENT' || !referenceId || !ids.includes(referenceId)) throw error
    }
  }
  if (!Array.isArray(entry.captions) || entry.captions.length !== 3) fail(`invalid captions: ${entry.id}`)
  const expectedStyles = ['result', 'explanation', 'comment']
  let previousEnd = 0
  entry.captions.forEach((cue, index) => {
    if (cue.start !== previousEnd || cue.end <= cue.start || !cue.text?.trim()) {
      fail(`invalid caption range: ${entry.id}:${index}`)
    }
    if (cue.style !== expectedStyles[index]) fail(`invalid caption style: ${entry.id}:${index}`)
    previousEnd = cue.end
  })
  if (previousEnd !== manifest.duration) fail(`captions must end at 8 seconds: ${entry.id}`)
}

console.log(`manifest: ${manifest.entries.length} entries valid`)
```

成功输出固定为：

```text
manifest: 13 entries valid
```

- [ ] **Step 3: 运行清单校验**

Run: `node 刷到你了/video-production/validate-manifest.mjs`

Expected: `manifest: 13 entries valid`

- [ ] **Step 4: 提交生产清单**

```bash
git add 刷到你了/video-production/demo-15-manifest.json 刷到你了/video-production/validate-manifest.mjs
git commit -m "chore: define demo video production batch"
```

### Task 2: 生成并验收 13 张视觉连续关键帧

**Files:**
- Create: `刷到你了/assets/video-tests/{W300,W301,W400,X001,X004,X012,X016,C001,C101,X021,K001,K101,X028}/<ID>_keyframe_v1.png`

**Interfaces:**
- Consumes: 清单的 `keyframePrompt`、W001/W101 参考图和三套视觉包。
- Produces: 13 张经过视觉检查、可上传 RunningHub 的严格 9:16 PNG。

- [ ] **Step 1: 使用 imagegen 建立三个视觉包锚点**

先生成 C001、K001；婚礼包直接使用 W001/W101。C001 必须同时清楚显示王妃、宫墙、国师与完整现代伸缩梯；K001 必须清楚显示同一位博主、结霜电脑和空调师傅。生成后用 `view_image` 原尺寸检查。

- [ ] **Step 2: 生成婚礼线 7 张关键帧**

W300、W301、W400、X001、X012、X016 以 W001 关键帧为图像编辑参考；X004 以 W101 为参考。每次只编辑一个目标，保留同一新娘、场地、灯光和短剧质感。

- [ ] **Step 3: 生成古装线 2 张连续关键帧**

C101、X021 以验收后的 C001 为编辑参考，保留王妃身份、红金服装和宫廷色彩。

- [ ] **Step 4: 生成知识线 2 张连续关键帧**

K101、X028 以验收后的 K001 为编辑参考，保留博主身份、桌面、电脑和工作室结构。

- [ ] **Step 5: 统一到严格 9:16 PNG 并检查尺寸**

对非严格 9:16 的工具输出使用 FFmpeg 居中缩放裁切，输出 `936×1664`：

```bash
ffmpeg -y -i INPUT.png -vf "scale=936:1664:force_original_aspect_ratio=increase,crop=936:1664" OUTPUT.png
```

Run:

```bash
for f in 刷到你了/assets/video-tests/*/*_keyframe_v1.png; do
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f"
done
```

Expected: 15 行均为 `936,1664`，包括已有 W001、W101。

- [ ] **Step 6: 逐张原尺寸视觉验收**

逐张确认人物身份、脸、手、关键道具、空间关系、底部安全区和无生成文字。未通过的图片只重做图片，不开始任何付费视频任务。

- [ ] **Step 7: 提交关键帧**

```bash
git add 刷到你了/assets/video-tests/{W300,W301,W400,X001,X004,X012,X016,C001,C101,X021,K001,K101,X028}
git commit -m "feat: add demo video keyframes"
```

### Task 3: 实现单节点 RunningHub 安全执行器

**Files:**
- Create: `刷到你了/video-production/run-runninghub-node.mjs`

**Interfaces:**
- Consumes: `node run-runninghub-node.mjs <NODE_ID>`、`RUNNINGHUB_API_KEY`、清单和对应关键帧。
- Produces: 一个 task ID 和一个 `<ID>_ltx_raw_v1.mp4`；一次进程永远只提交一次付费任务。

- [ ] **Step 1: 写入参数与安全失败检查**

脚本必须在任何网络请求前验证：恰有一个目标 ID、ID 存在于清单、关键帧存在、目标 MP4 尚不存在、`RUNNINGHUB_API_KEY` 非空。目标 MP4 已存在时退出，不覆盖、不提交。

- [ ] **Step 2: 实现上传、单次提交、轮询和下载**

使用 Node 原生 `fetch`、`FormData`、`Blob`、`readFile`/`writeFile`。固定行为：

1. POST `https://www.runninghub.cn/openapi/v2/media/upload/binary`；
2. POST `https://www.runninghub.cn/task/openapi/ai-app/run`，请求体只包含固定 WebApp、四个节点值和 API Key；
3. 每 10 秒 POST `https://www.runninghub.cn/openapi/v2/query`，最多 20 分钟；
4. 只在状态为 `SUCCESS` 时读取第一条结果 URL 并下载；
5. 状态为 `FAILED` 或超时则退出并保留 task ID，不自动提交第二次；
6. 控制台只打印 `<ID>: upload ok`、`<ID>: task <taskId>`、状态和最终本地路径，不打印请求体、密钥、fileName、上传 URL 或下载 URL。

使用以下完整实现：

```js
import { access, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const project = resolve(here, '..')
const manifest = JSON.parse(await readFile(resolve(here, 'demo-15-manifest.json'), 'utf8'))
const [id, extra] = process.argv.slice(2)

if (!id || extra) throw new Error('usage: node run-runninghub-node.mjs <NODE_ID>')
const entry = manifest.entries.find(candidate => candidate.id === id)
if (!entry) throw new Error(`unknown node id: ${id}`)

const key = process.env.RUNNINGHUB_API_KEY
if (!key) throw new Error('RUNNINGHUB_API_KEY is required')

const assetDir = resolve(project, 'assets', 'video-tests', id)
const keyframePath = resolve(assetDir, `${id}_keyframe_v1.png`)
const outputPath = resolve(assetDir, `${id}_ltx_raw_v1.mp4`)
await access(keyframePath, constants.R_OK)
try {
  await access(outputPath, constants.F_OK)
  throw new Error(`refusing to overwrite existing video: ${id}`)
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

async function jsonRequest(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const payload = await response.json()
  if (payload.code !== undefined && payload.code !== 0) {
    throw new Error(`RunningHub code ${payload.code}`)
  }
  return payload
}

const headers = { Authorization: `Bearer ${key}` }
const form = new FormData()
form.append('file', new Blob([await readFile(keyframePath)]), `${id}_keyframe_v1.png`)
const upload = await jsonRequest('https://www.runninghub.cn/openapi/v2/media/upload/binary', {
  method: 'POST', headers, body: form,
})
const fileName = upload.data?.fileName
if (!fileName) throw new Error('upload returned no fileName')
console.log(`${id}: upload ok`)

const request = {
  webappId: manifest.webappId,
  apiKey: key,
  nodeInfoList: [
    { nodeId: '3', fieldName: 'image', fieldValue: fileName },
    { nodeId: '65', fieldName: 'text', fieldValue: entry.videoPrompt },
    { nodeId: '83', fieldName: 'value', fieldValue: String(manifest.duration) },
    { nodeId: '219', fieldName: 'value', fieldValue: 'false' },
  ],
}
const submitted = await jsonRequest('https://www.runninghub.cn/task/openapi/ai-app/run', {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
})
const taskId = submitted.data?.taskId
if (!taskId) throw new Error('submission returned no taskId')
console.log(`${id}: task ${taskId}`)

const deadline = Date.now() + 20 * 60 * 1000
let resultUrl
while (Date.now() < deadline) {
  await new Promise(resolvePromise => setTimeout(resolvePromise, 10_000))
  const query = await jsonRequest('https://www.runninghub.cn/openapi/v2/query', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId }),
  })
  const status = query.status ?? query.data?.status
  console.log(`${id}: ${status ?? 'UNKNOWN'}`)
  if (status === 'FAILED') throw new Error(`task failed: ${taskId}`)
  if (status === 'SUCCESS') {
    const results = query.results ?? query.data?.results
    resultUrl = results?.[0]?.url
    if (!resultUrl) throw new Error(`successful task has no result: ${taskId}`)
    break
  }
}
if (!resultUrl) throw new Error(`task timed out: ${taskId}`)

const media = await fetch(resultUrl)
if (!media.ok) throw new Error(`download HTTP ${media.status}`)
await writeFile(outputPath, Buffer.from(await media.arrayBuffer()))
console.log(`${id}: saved ${outputPath}`)
```

- [ ] **Step 3: 做非付费语法与失败路径验证**

Run:

```bash
node --check 刷到你了/video-production/run-runninghub-node.mjs
env -u RUNNINGHUB_API_KEY node 刷到你了/video-production/run-runninghub-node.mjs W300
```

Expected: 第一条 exit 0；第二条在网络请求前以 `RUNNINGHUB_API_KEY is required` 失败。

- [ ] **Step 4: 凭据泄漏静态检查并提交**

```bash
! rg -n "Authorization: Bearer [A-Za-z0-9]|apiKey\"\s*:\s*\"[A-Za-z0-9]" 刷到你了/video-production
git add 刷到你了/video-production/run-runninghub-node.mjs
git commit -m "chore: add safe RunningHub video runner"
```

### Task 4: 生成并验收婚礼线 7 条视频

**Files:**
- Create: `刷到你了/assets/video-tests/{W300,W301,W400,X001,X004,X012,X016}/<ID>_ltx_raw_v1.mp4`
- Create: matching thumbnails, caption JSON, and `generation-notes.md`

**Interfaces:**
- Consumes: 婚礼关键帧、清单提示词和安全执行器。
- Produces: 7 套完整婚礼节点素材。

- [ ] **Step 1: 逐节点显式提交首次任务**

在只对当前进程可见的环境中注入 API Key，然后依次运行：

```bash
for id in W300 W301 W400 X001 X004 X012 X016; do
  node 刷到你了/video-production/run-runninghub-node.mjs "$id" || break
done
```

只有上一条成功下载后才进入下一条。失败立即停止批次，先检查远端状态和本地文件，不重复提交。

- [ ] **Step 2: 对每条视频做机器验收**

对每个 MP4 运行 `ffprobe` 检查 H.264、AAC、832×1536 或等价 9:16、24fps 左右、约 8.04 秒，并运行完整解码：

```bash
ffmpeg -v error -i VIDEO.mp4 -f null -
```

- [ ] **Step 3: 生成八帧接触表并人工验收**

用 FFmpeg 每秒抽一帧合成接触表，使用 `view_image` 检查核心动作、主体一致性和道具持续性。只有满足设计中的严重失败条件才提交该节点第二次；第二次采用 `_v2` 临时文件，验收后把采用版本复制为 `_v1`，记录拒绝原因。

- [ ] **Step 4: 生成缩略图、字幕 JSON 和记录**

缩略图取 0.5～1.5 秒之间最清楚的一帧，输出 832×1536 JPEG。字幕 JSON 精确复制清单三段。`generation-notes.md` 记录提示词、task ID、提交次数、消耗、运行时间、媒体参数、采用版本和逐项验收，不含密钥或签名 URL。

- [ ] **Step 5: 提交婚礼素材**

```bash
git add 刷到你了/assets/video-tests/{W300,W301,W400,X001,X004,X012,X016}
git commit -m "feat: add remaining wedding demo videos"
```

### Task 5: 生成并验收古装线与知识线 6 条视频

**Files:**
- Create: `刷到你了/assets/video-tests/{C001,C101,X021,K001,K101,X028}/<ID>_ltx_raw_v1.mp4`
- Create: matching thumbnails, caption JSON, and `generation-notes.md`

**Interfaces:**
- Consumes: 古装与知识关键帧、清单提示词和安全执行器。
- Produces: 6 套完整古装/知识节点素材。

- [ ] **Step 1: 逐节点显式提交首次任务**

```bash
for id in C001 C101 X021 K001 K101 X028; do
  node 刷到你了/video-production/run-runninghub-node.mjs "$id" || break
done
```

沿用 Task 4 的“单条成功后继续、失败立即停止、不自动重提”规则。

- [ ] **Step 2: 完成机器验收、接触表和人工验收**

对 6 条视频逐条运行 ffprobe、完整解码和八帧接触表检查。古装线重点检查王妃身份与梯子几何；知识线重点检查博主身份、电脑和双师傅持续性。

- [ ] **Step 3: 必要时显式使用唯一一次重试**

只有严重失败节点可提交第二次。记录第一次 task ID、失败原因和第二次采用结果；全批次累计提交不得超过 26。

- [ ] **Step 4: 生成缩略图、字幕 JSON 和记录并提交**

```bash
git add 刷到你了/assets/video-tests/{C001,C101,X021,K001,K101,X028}
git commit -m "feat: add costume and knowledge demo videos"
```

### Task 6: 用独立媒体映射接入全部 15 个节点

**Files:**
- Create: `刷到你了/web-prototype/src/content/media.ts`
- Modify: `刷到你了/web-prototype/src/content/nodes.ts`
- Modify: `刷到你了/web-prototype/src/content/validate.ts`
- Modify: `刷到你了/web-prototype/src/tests/content.test.ts`
- Modify: `刷到你了/web-prototype/src/tests/story-stage-media.test.tsx`
- Create: `刷到你了/web-prototype/public/media/{13 MP4s and 13 JPEGs}`

**Interfaces:**
- Consumes: 15 套源素材与字幕时间轴。
- Produces: `MEDIA_BY_NODE_ID: Record<NodeId, VideoMedia>`，以及每个 `VideoNode.media`。

- [ ] **Step 1: 写失败测试要求全部节点具有媒体**

在 `content.test.ts` 中将 W001/W101 专用测试扩展为：

```ts
it('configures browser media for every demo node', () => {
  expect(NODES).toHaveLength(15)
  for (const node of NODES) {
    expect(node.media?.src).toBe(`/media/${node.id}_ltx_raw_v1.mp4`)
    expect(node.media?.poster).toBe(`/media/${node.id}_thumbnail_v1.jpg`)
    expect(node.media?.captions).toHaveLength(3)
    expect(node.media?.captions[0].start).toBe(0)
    expect(node.media?.captions.at(-1)?.end).toBe(8)
  }
})
```

在 `validateContent` 测试中加入一个无媒体节点并期望 `missing media: W001`。把 `story-stage-media.test.tsx` 的“未配置节点”用例改为构造一个删除 `media` 的 C001 副本，继续验证 CSS 回退。

同时给测试辅助函数 `fakeNode()` 增加默认合法媒体，避免其他校验用例混入无关错误：

```ts
media: {
  src: `/media/${id}_ltx_raw_v1.mp4`,
  poster: `/media/${id}_thumbnail_v1.jpg`,
  captions: [
    { start: 0, end: 2, text: '测试结果', style: 'result' },
    { start: 2, end: 5, text: '测试解释', style: 'explanation' },
    { start: 5, end: 8, text: '测试评论', style: 'comment' },
  ],
},
```

无媒体测试使用：

```ts
const missingMedia = fakeNode('W001')
delete missingMedia.media
expect(validateContent({ items: [], nodes: [missingMedia], triggers: [] }))
  .toContain('missing media: W001')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --run src/tests/content.test.ts src/tests/story-stage-media.test.tsx`

Expected: FAIL，显示当前 13 个节点没有 `media`，且校验器尚未返回 `missing media`。

- [ ] **Step 3: 创建完整媒体映射**

`media.ts` 使用以下完整实现：

```ts
import type { CaptionCue, NodeId, VideoMedia } from './types'

function cues(result: string, explanation: string, comment: string): CaptionCue[] {
  return [
    { start: 0, end: 2.2, text: result, style: 'result' },
    { start: 2.2, end: 5, text: explanation, style: 'explanation' },
    { start: 5, end: 8, text: comment, style: 'comment' },
  ]
}

function media(id: NodeId, captions: CaptionCue[]): VideoMedia {
  return {
    src: `/media/${id}_ltx_raw_v1.mp4`,
    poster: `/media/${id}_thumbnail_v1.jpg`,
    captions,
  }
}

export const MEDIA_BY_NODE_ID: Record<NodeId, VideoMedia> = {
  W001: media('W001', cues('婚礼开始第 7 秒，新娘死亡', '婚礼未完成', '这么高，谁够得到？')),
  W101: media('W101', cues('有梯子，新娘还是死了', '他解决了身高，没有解决专业', '够得到，不等于会修')),
  W300: media('W300', cues('新娘活下来了，婚礼却死了', '救命的握手，被剪成了私会', '前后内容呢？有证据吗？')),
  W301: media('W301', cues('证据录到了', '后排看不见，现场听不清', '证据没问题，屏幕有问题')),
  W400: media('W400', cues('完整证据已经上大屏', '剪辑版与完整原片同时播放', '造谣的下线，婚礼继续')),
  C001: media('C001', cues('王妃翻墙私逃，被抓现行', '国师：娘娘有证据吗？', '三丈宫墙，一梯到顶')),
  C101: media('C101', cues('国师抵赖，被录下来了', '证据太小，满朝文武看不清', '把证据投到影壁上')),
  K001: media('K001', cues('结论：电脑先冻关机了', '你要的是散热，不是把电脑送走', '关键数据在墙外')),
  K101: media('K101', cues('梯子连接成功', '知识区的梯子，当然是 VPN', '翻了半天，先精准投放我')),
  X001: media('X001', cues('师傅到了，还是够不着', '专业到了，高度没到', '现场不具备登高条件')),
  X004: media('X004', cues('两把梯子，还是不会修', '高度翻倍，知识没有', '脑子问题：仍未解决')),
  X012: media('X012', cues('师傅开始维修这段感情', '深度服务，指的是吊顶深度', '感情温度 16 度，建议检修')),
  X016: media('X016', cues('证据被录成了第二遍', '真相没放大，回声放大了', '热门单曲：《我剪剪剪的》')),
  X021: media('X021', cues('冷宫王妃，转行跑酷教练', '不逃，计时', '三丈宫墙，七天结业')),
  X028: media('X028', cues('电脑没变快，变成冰箱了', '两位师傅，双空调对吹', '本期结论：能冷藏，不能跑分')),
}
```

`nodes.ts` 的 `node()` 返回值附加 `media: MEDIA_BY_NODE_ID[id]`，并移除 W001/W101 的内联 `media` 块。`validateContent` 对任何 `!node.media` 添加 `missing media: <ID>`，其余媒体校验保持不变。

- [ ] **Step 4: 复制源媒体并验证字节一致**

对 13 个新节点复制 raw MP4 和 thumbnail 到 `public/media`，然后逐个使用 `cmp` 验证源文件与网页副本一致。不得复制接触表、关键帧、字幕 JSON 或生成记录到 `public`。

- [ ] **Step 5: 运行聚焦测试确认通过**

Run: `npm test -- --run src/tests/content.test.ts src/tests/story-stage-media.test.tsx`

Expected: PASS。

- [ ] **Step 6: 提交网页集成**

```bash
git add 刷到你了/web-prototype/src/content/media.ts 刷到你了/web-prototype/src/content/nodes.ts 刷到你了/web-prototype/src/content/validate.ts 刷到你了/web-prototype/src/tests/content.test.ts 刷到你了/web-prototype/src/tests/story-stage-media.test.tsx 刷到你了/web-prototype/public/media
git commit -m "feat: play all demo videos in prototype"
```

### Task 7: 文档、全量验证与发布流程

**Files:**
- Modify: `刷到你了/web-prototype/README.md`
- Modify: `docs/superpowers/plans/2026-07-19-demo-15-video-production.md`

**Interfaces:**
- Consumes: 完整源素材、网页集成和测试套件。
- Produces: 可构建、可发布、文档准确的 15 视频 Demo。

- [ ] **Step 1: 更新 README**

把“16 条内容节点”改为“15 条内容节点”，把“目前使用 CSS 动态分镜”的限制改为：15 条节点均配置真实 MP4，媒体失败时自动回退 CSS 分镜；字幕由视频 `currentTime` 驱动。

- [ ] **Step 2: 批量验证媒体文件**

要求 `public/media` 恰有 15 个 MP4 和 15 个 JPEG；所有 MP4 可完整解码、为 9:16 H.264 并有 AAC 音频；所有源/副本 `cmp` 相同；所有 13 个新目录包含五个规定文件。

- [ ] **Step 3: 运行完整前端验证**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: 所有测试 PASS，TypeScript exit 0，Vite 生产构建 exit 0。

- [ ] **Step 4: 浏览器抽查三套视觉线和回退**

启动本地 Vite，至少抽查 W300、C001、K001、W400：播放、暂停、循环、字幕切换、海报和上下滑动均正常。临时把一个媒体 URL 改为不存在地址，只在浏览器运行时验证 CSS 回退，随后恢复，不提交该临时改动。

- [ ] **Step 5: 凭据、范围与工作树检查**

```bash
git diff --check
! rg -n --hidden --glob '!.git/**' 'Authorization: Bearer [A-Za-z0-9]+|RUNNINGHUB_API_KEY=[A-Za-z0-9]+' 刷到你了 docs/superpowers
git status --short
```

Expected: 无凭据命中；`.DS_Store` 保持未跟踪且未暂存；没有范围外文件。

- [ ] **Step 6: 提交文档并完成计划**

```bash
git add 刷到你了/web-prototype/README.md docs/superpowers/plans/2026-07-19-demo-15-video-production.md
git commit -m "docs: finish demo video production batch"
```

- [ ] **Step 7: 按项目既有发布流程推送并验证**

运行 `git push origin main`，确认 `git rev-parse HEAD` 与 `git rev-parse origin/main` 相同。若远端拒绝，保留本地提交并报告具体原因，不改写或强推历史。
