import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceDirectory = process.env.PHOTO_ARCHIVE_SOURCE ?? process.argv[2] ?? 'E:/Picture/like/select'
const outputDirectory = path.resolve('public/uploads/photos/select')
const manifestPath = path.resolve('src/data/photo-archive.ts')
const maxDimension = 2560
const supportedImage = /\.(?:jpe?g|png)$/i

async function collectImages(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectImages(entryPath)
    return supportedImage.test(entry.name) ? [entryPath] : []
  }))

  return files.flat().sort((left, right) => left.localeCompare(right, 'en'))
}

function displayDimensions(metadata) {
  const isRotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1)
  const originalWidth = isRotated ? metadata.height : metadata.width
  const originalHeight = isRotated ? metadata.width : metadata.height

  if (!originalWidth || !originalHeight) throw new Error('Image dimensions are unavailable.')

  const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight))
  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale),
  }
}

function layoutFor(index, width, height) {
  if (index === 0) return 'hero'
  const ratio = width / height
  if (ratio < 0.92) return 'portrait'
  if (ratio < 1.08) return 'square'
  return index % 5 === 0 ? 'wide' : 'landscape'
}

function manifestSource(items) {
  return `export interface PhotoArchiveItem {
  alt: string
  caption: { en: string; zh: string }
  height: number
  image: string
  index: string
  label: { en: string; zh: string }
  layout: 'hero' | 'portrait' | 'landscape' | 'square' | 'wide'
  tags: string[]
  width: number
}

export const selectedPhotoArchive: PhotoArchiveItem[] = ${JSON.stringify(items, null, 2)}
`
}

const images = await collectImages(sourceDirectory)
if (images.length === 0) throw new Error(`No supported images found in ${sourceDirectory}`)

await fs.mkdir(outputDirectory, { recursive: true })
await fs.mkdir(path.dirname(manifestPath), { recursive: true })

const items = []
let totalBytes = 0

for (const [index, input] of images.entries()) {
  const metadata = await sharp(input).metadata()
  const { width, height } = displayDimensions(metadata)
  const filename = `photo-${String(index + 1).padStart(3, '0')}.webp`
  const output = path.join(outputDirectory, filename)

  await sharp(input)
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, effort: 5, smartSubsample: true })
    .toFile(output)

  totalBytes += (await fs.stat(output)).size
  const number = String(index + 1).padStart(2, '0')
  items.push({
    alt: `Phil 的精选摄影作品 ${number}`,
    caption: { zh: '精选摄影 / 影像档案', en: 'Selected photography / visual archive' },
    height,
    image: `/uploads/photos/select/${filename}`,
    index: number,
    label: { zh: `精选影像 ${number}`, en: `Selected photograph ${number}` },
    layout: layoutFor(index, width, height),
    tags: ['selected'],
    width,
  })
}

await fs.writeFile(manifestPath, manifestSource(items), 'utf8')
console.log(`Prepared ${items.length} images (${(totalBytes / 1024 / 1024).toFixed(1)} MiB) in ${outputDirectory}`)
