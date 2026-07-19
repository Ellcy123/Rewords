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
