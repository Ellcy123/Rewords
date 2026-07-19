import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const assets = await readdir(new URL('assets/', dist))
const jsName = assets.find(name => name.endsWith('.js'))
const cssName = assets.find(name => name.endsWith('.css'))
if (!jsName || !cssName) throw new Error('Vite assets are missing')

const [javascript, css] = await Promise.all([
  readFile(new URL(`assets/${jsName}`, dist), 'utf8'),
  readFile(new URL(`assets/${cssName}`, dist), 'utf8'),
])
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#050507"><meta name="description" content="《刷到你了》短视频因果解谜试玩原型"><title>刷到你了</title><style>${css}</style></head><body><div id="root"></div><script type="module">${javascript.replaceAll('</script', '<\\/script')}</script></body></html>`
const worker = `const html=${JSON.stringify(html)};\nexport default { async fetch(request, env) {\n  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 })\n  const pathname = new URL(request.url).pathname\n  if (pathname.startsWith('/media/')) {\n    if (!env?.ASSETS?.fetch) return new Response('Asset service unavailable', { status: 503 })\n    return env.ASSETS.fetch(request)\n  }\n  return new Response(request.method === 'HEAD' ? null : html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } })\n}}\n`
const serverDir = new URL('server/', dist)
const entry = new URL('index.js', serverDir)
await mkdir(serverDir, { recursive: true })
await writeFile(entry, worker)

const module = await import(`${entry.href}?check=${Date.now()}`)
const response = await module.default.fetch(new Request('https://example.test/'))
if (response.status !== 200 || !(await response.text()).includes('id="root"')) {
  throw new Error('Generated Sites worker failed its smoke test')
}

const mediaResponse = await module.default.fetch(
  new Request('https://example.test/media/W001_ltx_raw_v1.mp4'),
  { ASSETS: { fetch: () => new Response('video-bytes', { headers: { 'content-type': 'video/mp4' } }) } },
)
if (mediaResponse.headers.get('content-type') !== 'video/mp4') {
  throw new Error('Generated Sites worker failed its media delegation smoke test')
}
