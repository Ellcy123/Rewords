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
