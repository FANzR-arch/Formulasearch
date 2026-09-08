import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'formula-photo-studio-'))
const manifest = path.join(root, 'photo-archive.json')
const output = path.join(root, 'output')
const input = path.join(root, 'sample.png')
process.env.PHOTO_STUDIO_MANIFEST = manifest
process.env.PHOTO_STUDIO_OUTPUT = output

try {
  await fs.writeFile(manifest, `${JSON.stringify({ pageTitle: { zh: '摄影', en: 'Photography' }, items: [] }, null, 2)}\n`, 'utf8')
  await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#b76542' } }).png().toFile(input)
  const manager = await import('../src/content-studio/photo-manager.mjs')
  const first = await manager.importPhotoFiles([input])
  assert.equal(first.imported, 1)
  const duplicate = await manager.importPhotoFiles([input])
  assert.equal(duplicate.duplicates, 1)
  let archive = await manager.readPhotoArchive()
  assert.equal(archive.items.length, 1)
  assert.match(archive.items[0].assetHash, /^[a-f0-9]{64}$/)
  assert.equal(archive.items[0].previewWidth, 960)
  archive.items[0].alt = { zh: '暖棕色测试画面', en: 'A warm brown test frame' }
  archive.items[0].tags = ['test']
  await manager.updatePhotoItems(archive.items, archive.revision)
  archive = await manager.readPhotoArchive()
  assert.equal(archive.items[0].alt.en, 'A warm brown test frame')
  const stale = structuredClone(archive)
  archive.items[0].alt.en = 'Updated in the first tab'
  await manager.updatePhotoItems(archive.items, archive.revision)
  await assert.rejects(manager.updatePhotoItems(stale.items, stale.revision), manager.PhotoConflictError)
  assert.equal((await manager.readPhotoArchive()).items[0].alt.en, 'Updated in the first tab')

  const secondInput = path.join(root, 'second.png')
  const thirdInput = path.join(root, 'third.png')
  await sharp({ create: { width: 400, height: 500, channels: 3, background: '#46724a' } }).png().toFile(secondInput)
  await sharp({ create: { width: 500, height: 400, channels: 3, background: '#3254ad' } }).png().toFile(thirdInput)
  const parallel = await Promise.all([
    manager.importPhotoFiles([secondInput]), manager.importPhotoFiles([thirdInput]), manager.importPhotoFiles([secondInput]),
  ])
  assert.equal(parallel.reduce((sum, result) => sum + result.imported, 0), 2)
  assert.equal(parallel.reduce((sum, result) => sum + result.duplicates, 0), 1)
  archive = await manager.readPhotoArchive()
  assert.equal(archive.items.length, 3)
  assert.equal(new Set(archive.items.map((item) => item.image)).size, 3)
  for (const item of archive.items) assert.equal((await sharp(await fs.readFile(path.join(output, path.basename(item.image)))).metadata()).width, item.width)

  const edits = structuredClone(archive.items)
  edits[0].alt.en = 'Winner of concurrent saves'
  const concurrentSaves = await Promise.allSettled([
    manager.updatePhotoItems(edits, archive.revision), manager.updatePhotoItems(archive.items, archive.revision),
  ])
  assert.deepEqual(concurrentSaves.map((result) => result.status), ['fulfilled', 'rejected'])
  assert(concurrentSaves[1].reason instanceof manager.PhotoConflictError)

  const broken = path.join(root, 'broken.png')
  const rollbackInput = path.join(root, 'rollback.png')
  await fs.writeFile(broken, 'not an image')
  await sharp({ create: { width: 300, height: 200, channels: 3, background: '#ccb832' } }).png().toFile(rollbackInput)
  const beforeFailure = await fs.readFile(manifest, 'utf8')
  const filesBeforeFailure = (await fs.readdir(output)).sort()
  await assert.rejects(manager.importPhotoFiles([rollbackInput, broken]))
  assert.equal(await fs.readFile(manifest, 'utf8'), beforeFailure)
  assert.deepEqual((await fs.readdir(output)).sort(), filesBeforeFailure)
  assert.equal((await manager.importPhotoFiles([rollbackInput])).imported, 1)
  assert.equal(Object.hasOwn(JSON.parse(await fs.readFile(manifest, 'utf8')), 'revision'), false)

  archive = await manager.readPhotoArchive()
  const removed = await manager.deletePhoto(archive.items[0].assetHash)
  assert.equal(removed.total, 3)
  await assert.rejects(manager.updatePhotoItems(archive.items, archive.revision), manager.PhotoConflictError)
  assert.equal((await fs.readdir(root)).some((name) => name.endsWith('.tmp')), false)
  console.log('Photo Studio test passed: import, deduplication, preview, concurrent imports/saves, stale-edit rejection, failed-import rollback, queue recovery and deletion.')
} finally {
  await fs.rm(root, { recursive: true, force: true })
}
