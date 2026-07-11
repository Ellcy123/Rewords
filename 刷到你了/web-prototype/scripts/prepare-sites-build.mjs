import { mkdir, writeFile } from 'node:fs/promises'

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../dist/server/index.js', import.meta.url),
  `export default {\n  async fetch(request, env) {\n    return env.ASSETS.fetch(request)\n  }\n}\n`,
)
