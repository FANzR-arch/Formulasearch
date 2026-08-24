import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const manifestPath = path.resolve('content/site/photo-archive.json')
const publicRoot = path.resolve('public')
const previewMaxWidth = 960

const source = (await fs.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, '')
const manifest = JSON.parse(source)
if (!Array.isArray(manifest.items)) throw new Error('Photo archive manifest must contain an items array.')

let prepared = 0
for (const item of manifest.items) {
  const imagePath = path.resolve(publicRoot, item.image.replace(/^\//, ''))
  const parsed = path.posix.parse(item.image)
  const previewImage = `${parsed.dir}/${parsed.name}-960.webp`
  const previewPath = path.resolve(publicRoot, previewImage.replace(/^\//, ''))
  const previewBuffer = await sharp(imagePath)
    .resize({ width: previewMaxWidth, withoutEnlargement: true })
    .webp({ quality: 80, effort: 5, smartSubsample: true })
    .toBuffer()
  const metadata = await sharp(previewBuffer).metadata()
  if (!metadata.width) throw new Error(`Preview dimensions are unavailable for ${item.image}.`)
  await fs.writeFile(previewPath, previewBuffer)
  item.previewImage = previewImage
  item.previewWidth = metadata.width
  prepared += 1
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Prepared ${prepared} responsive photo previews (max ${previewMaxWidth}px).`)
