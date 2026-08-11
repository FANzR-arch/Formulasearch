import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const manifestPath = path.resolve(process.env.PHOTO_ARCHIVE_MANIFEST ?? 'content/site/photo-archive.json')
const publicRoot = path.resolve('public')
const hashBuffer = (buffer) => createHash('sha256').update(buffer).digest('hex')

const parsed = JSON.parse((await fs.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''))
const items = Array.isArray(parsed) ? parsed : parsed.items
if (!Array.isArray(items)) throw new Error(`Photo archive manifest must contain an items array: ${manifestPath}`)

let migrated = 0
const hashes = new Map()
for (const item of items) {
  if (!/^[a-f0-9]{64}$/i.test(item.assetHash ?? '')) {
    if (typeof item.image !== 'string' || !item.image.startsWith('/')) throw new Error(`Photo archive item has an invalid image path: ${item.index ?? '(unknown)'}`)
    const assetPath = path.resolve(publicRoot, item.image.slice(1))
    const relative = path.relative(publicRoot, assetPath)
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Photo archive image escapes public/: ${item.image}`)
    item.assetHash = hashBuffer(await fs.readFile(assetPath))
    migrated += 1
  }
  const normalizedHash = item.assetHash.toLowerCase()
  const previousIndex = hashes.get(normalizedHash)
  if (hashes.has(normalizedHash)) throw new Error(`Photo archive contains duplicate asset hash ${normalizedHash} at items ${previousIndex} and ${item.index ?? '(unknown)'}.`)
  hashes.set(normalizedHash, item.index ?? '(unknown)')
}

await fs.writeFile(manifestPath, `${JSON.stringify(Array.isArray(parsed) ? items : { ...parsed, items }, null, 2)}\n`, 'utf8')
console.log(`Migrated ${migrated} photo archive asset hashes in ${manifestPath}.`)
