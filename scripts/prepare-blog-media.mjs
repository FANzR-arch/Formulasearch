import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const contentRoot = join(repoRoot, 'content', 'blog')
const mediaRoot = join(repoRoot, 'public')
const manifestPath = join(repoRoot, 'content', 'site', 'blog-media.json')
const optimizedRoot = join(repoRoot, 'public', 'uploads', 'blog-optimized')
const imageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp'])
const variantWidths = [480, 768, 1080]

const readCover = (markdownPath) => {
  const markdown = readFileSync(markdownPath, 'utf8')
  const match = markdown.match(/^cover:\s*["']?([^\r\n"']+)["']?\s*$/m)
  if (!match?.[1]) throw new Error(`Blog markdown is missing cover: ${markdownPath}`)
  return match[1].trim()
}

const getCoverPaths = () => readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((entry) => join(contentRoot, entry.name, 'index.md'))

const getVariant = (cover, width, format) => {
  const parts = cover.slice(1).split('/')
  const filename = parts.pop()
  const date = parts.pop()
  const stem = filename.slice(0, -extname(filename).length)
  const name = `${stem}-${width}w.${format}`
  return {
    path: join(optimizedRoot, date, name),
    src: `/uploads/blog-optimized/${date}/${name}`,
    width,
  }
}

const buildManifest = async () => {
  const manifest = {}
  for (const markdownPath of getCoverPaths()) {
    const cover = readCover(markdownPath)
    if (!cover.startsWith('/uploads/blog/')) {
      throw new Error(`Blog cover must be under /uploads/blog/: ${cover}`)
    }

    const sourcePath = join(mediaRoot, ...cover.slice(1).split('/'))
    if (!existsSync(sourcePath)) throw new Error(`Blog cover file is missing: ${sourcePath}`)
    if (!imageExtensions.has(extname(sourcePath).toLowerCase())) {
      throw new Error(`Unsupported blog cover format: ${sourcePath}`)
    }

    const metadata = await sharp(sourcePath).metadata()
    const width = metadata.width
    const height = metadata.height
    if (!width || !height) throw new Error(`Blog cover has no intrinsic dimensions: ${sourcePath}`)

    const widths = [...new Set([...variantWidths, width].filter((variantWidth) => variantWidth <= width))]

    manifest[cover] = {
      bytes: statSync(sourcePath).size,
      height,
      avif: widths.map((variantWidth) => {
        const { src, width: variantWidthValue } = getVariant(cover, variantWidth, 'avif')
        return { src, width: variantWidthValue }
      }),
      optimized: widths.map((variantWidth) => {
        const { src, width: variantWidthValue } = getVariant(cover, variantWidth, 'webp')
        return { src, width: variantWidthValue }
      }),
      width,
    }
  }
  return Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
}

const formatManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`
const writeOptimizedImages = async (manifest) => {
  for (const [cover, media] of Object.entries(manifest)) {
    const sourcePath = join(mediaRoot, ...cover.slice(1).split('/'))
    for (const variant of [...media.avif, ...media.optimized]) {
      const variantPath = join(mediaRoot, ...variant.src.slice(1).split('/'))
      mkdirSync(dirname(variantPath), { recursive: true })
      const image = sharp(sourcePath)
        .resize({ width: variant.width, withoutEnlargement: true })
      const format = variant.src.endsWith('.avif')
        ? image.avif({ quality: 50, effort: 6 })
        : image.webp({ quality: 78 })
      await format.toFile(variantPath)
    }
  }
}

const checkOptimizedImages = async (manifest) => {
  for (const [cover, media] of Object.entries(manifest)) {
    for (const variant of [...media.avif, ...media.optimized]) {
      const variantPath = join(mediaRoot, ...variant.src.slice(1).split('/'))
      if (!existsSync(variantPath)) throw new Error(`Optimized blog cover is missing for ${cover}: ${variantPath}`)
      const metadata = await sharp(variantPath).metadata()
      if (metadata.width !== variant.width) {
        throw new Error(`Optimized blog cover has unexpected width for ${cover}: ${variantPath}`)
      }
    }
  }
}

const mode = process.argv[2]

if (!['--write', '--check'].includes(mode)) {
  console.error('Usage: node scripts/prepare-blog-media.mjs --write | --check')
  process.exit(1)
}

const expected = await buildManifest()
const serialized = formatManifest(expected)

if (mode === '--write') {
  await writeOptimizedImages(expected)
  writeFileSync(manifestPath, serialized, 'utf8')
  const variantCount = Object.values(expected).reduce((count, media) => count + media.optimized.length + media.avif.length, 0)
  console.log(`Blog media manifest written: ${Object.keys(expected).length} covers, ${variantCount} responsive variants (WebP + AVIF).`)
} else {
  if (!existsSync(manifestPath)) throw new Error(`Blog media manifest is missing: ${manifestPath}`)
  const actual = readFileSync(manifestPath, 'utf8')
  if (actual !== serialized) {
    throw new Error('Blog media manifest is stale. Run npm run blog:media:prepare.')
  }
  await checkOptimizedImages(expected)
  const variantCount = Object.values(expected).reduce((count, media) => count + media.optimized.length + media.avif.length, 0)
  console.log(`Blog media manifest check passed: ${Object.keys(expected).length} covers, ${variantCount} responsive variants (WebP + AVIF).`)
}
