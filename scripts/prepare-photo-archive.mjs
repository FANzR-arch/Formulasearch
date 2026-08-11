import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceDirectory = process.env.PHOTO_ARCHIVE_SOURCE ?? process.argv[2] ?? 'E:/Picture/like/select'
const outputDirectory = path.resolve('public/uploads/photos/select')
const manifestPath = path.resolve('content/site/photo-archive.json')
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

const defaultPage = {
  pageTitle: { zh: '摄影', en: 'Photography' },
  pageDescription: { zh: 'Phil 的摄影作品与影像档案。', en: "Phil's photography and visual archive." },
  kicker: { zh: '影像档案 / 01', en: 'Visual archive / 01' },
  title: { zh: '记录自由', en: 'Photographic records' },
  description: { zh: '持续收集的摄影作品与日常影像，按时间与地点整理并归档。', en: 'An ongoing collection of photographs and everyday images, organised and archived by time and place.' },
  filters: [{ id: 'all', zh: '全部', en: 'All' }],
}

function manifestSource(items, page = defaultPage) {
  return `${JSON.stringify({
    ...defaultPage,
    ...page,
    items,
  }, null, 2)}\n`
}

async function readExistingManifest() {
  try {
    const source = await fs.readFile(manifestPath, 'utf8')
    const parsed = JSON.parse(source)
    const items = Array.isArray(parsed) ? parsed : parsed.items
    if (!Array.isArray(items)) throw new Error('Photo archive manifest must contain an items array.')
    return { items, page: Array.isArray(parsed) ? undefined : parsed }
  } catch (error) {
    if (error.code === 'ENOENT') return new Map()
    throw new Error(`Unable to read existing photo archive manifest: ${error.message}`)
  }
}

const images = await collectImages(sourceDirectory)
if (images.length === 0) throw new Error(`No supported images found in ${sourceDirectory}`)

await fs.mkdir(outputDirectory, { recursive: true })
await fs.mkdir(path.dirname(manifestPath), { recursive: true })

const items = []
const existingManifest = await readExistingManifest()
const existingItems = new Map(existingManifest.items.map((item) => [item.image, item]))
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
  const image = `/uploads/photos/select/${filename}`
  const existing = existingItems.get(image)
  items.push({
    alt: existing?.alt ?? `Phil 的精选摄影作品 ${number}`,
    caption: existing?.caption ?? { zh: '精选摄影 / 影像档案', en: 'Selected photography / visual archive' },
    height,
    image,
    index: number,
    label: existing?.label ?? { zh: `精选影像 ${number}`, en: `Selected photograph ${number}` },
    layout: layoutFor(index, width, height),
    tags: existing?.tags ?? ['selected'],
    width,
  })
}

await fs.writeFile(manifestPath, manifestSource(items, existingManifest.page), 'utf8')
console.log(`Prepared ${items.length} images (${(totalBytes / 1024 / 1024).toFixed(1)} MiB) in ${outputDirectory}`)
