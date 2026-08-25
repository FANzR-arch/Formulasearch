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
  await manager.updatePhotoItems(archive.items)
  archive = await manager.readPhotoArchive()
  assert.equal(archive.items[0].alt.en, 'A warm brown test frame')
  const removed = await manager.deletePhoto(archive.items[0].assetHash)
  assert.equal(removed.total, 0)
  console.log('Photo Studio test passed: append, duplicate detection, metadata update, preview generation and direct deletion.')
} finally {
  await fs.rm(root, { recursive: true, force: true })
}
