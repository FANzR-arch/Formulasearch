import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const projectRoot = process.cwd()
const generator = path.resolve(projectRoot, 'scripts/prepare-photo-source-manifest.mjs')
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'formulasearch-photo-source-'))

function run(mode, source, manifest) {
  return spawnSync(process.execPath, [generator, mode, source], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, PHOTO_SOURCE_MANIFEST: manifest },
  })
}

try {
  const source = path.join(temporaryRoot, 'source')
  const manifest = path.join(temporaryRoot, 'manifest.json')
  await fs.mkdir(path.join(source, 'nested'), { recursive: true })
  await fs.writeFile(path.join(source, 'first.jpg'), Buffer.from('first-image'))
  await fs.writeFile(path.join(source, 'nested', 'second.png'), Buffer.from('second-image'))

  const write = run('--write', source, manifest)
  if (write.status !== 0) throw new Error(`Photo source manifest write failed.\n${write.stdout}\n${write.stderr}`)

  const check = run('--check', source, manifest)
  if (check.status !== 0) throw new Error(`Photo source manifest check failed.\n${check.stdout}\n${check.stderr}`)

  await fs.writeFile(path.join(source, 'first.jpg'), Buffer.from('changed-image'))
  const changed = run('--check', source, manifest)
  if (changed.status === 0 || !`${changed.stdout}\n${changed.stderr}`.includes('changed: first.jpg')) {
    throw new Error('Photo source manifest check did not detect a changed source file.')
  }

  console.log('Photo source manifest regression test passed (write + check + change detection).')
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true })
}
