import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
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
// Article images sit in a 720px column: one width for standard screens, one for high-density ones.
// They are AVIF only; the original file stays the <img> fallback, which keeps the variant folder small.
const inlineVariantWidths = [720, 1440]

const readCover = (markdownPath) => {
  const markdown = readFileSync(markdownPath, 'utf8')
  const match = markdown.match(/^cover:\s*["']?([^\r\n"']+)["']?\s*$/m)
  if (!match?.[1]) throw new Error(`Blog markdown is missing cover: ${markdownPath}`)
  return match[1].trim()
}

// Local images placed in the article body, in Markdown or as raw <img>.
const readInlineImages = (markdownPath) => {
  const markdown = readFileSync(markdownPath, 'utf8').replace(/^---[\s\S]*?\n---/, '')
  const sources = [
    ...markdown.matchAll(/!\[[^\]]*\]\((\/uploads\/blog\/[^)\s]+)/g),
    ...markdown.matchAll(/<img\b[^>]*\ssrc=["'](\/uploads\/blog\/[^"']+)["']/g),
  ].map((match) => match[1])
  return sources.filter((source) => imageExtensions.has(extname(source).toLowerCase()))
}

const getCoverPaths = () => readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]+)?$/.test(entry.name))
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
  const entries = []
  for (const markdownPath of getCoverPaths()) {
    const cover = readCover(markdownPath)
    if (!cover.startsWith('/uploads/blog/')) {
      throw new Error(`Blog cover must be under /uploads/blog/: ${cover}`)
    }
    entries.push([cover, variantWidths])
    for (const source of readInlineImages(markdownPath)) entries.push([source, inlineVariantWidths])
  }
  for (const [cover, sizes] of entries) {
    if (manifest[cover]) continue

    const sourcePath = join(mediaRoot, ...cover.slice(1).split('/'))
    if (!existsSync(sourcePath)) throw new Error(`Blog cover file is missing: ${sourcePath}`)
    if (!imageExtensions.has(extname(sourcePath).toLowerCase())) {
      throw new Error(`Unsupported blog cover format: ${sourcePath}`)
    }

    const metadata = await sharp(sourcePath).metadata()
    const width = metadata.width
    const height = metadata.height
    if (!width || !height) throw new Error(`Blog cover has no intrinsic dimensions: ${sourcePath}`)

    const inline = sizes === inlineVariantWidths
    // Covers keep a native-width variant; article images stop at the column's largest width.
    const nativeWidth = inline && width >= Math.max(...sizes) ? [] : [width]
    const widths = [...new Set([...sizes, ...nativeWidth].filter((variantWidth) => variantWidth <= width))].sort((a, b) => a - b)

    manifest[cover] = {
      bytes: statSync(sourcePath).size,
      height,
      avif: widths.map((variantWidth) => {
        const { src, width: variantWidthValue } = getVariant(cover, variantWidth, 'avif')
        return { src, width: variantWidthValue }
      }),
      optimized: inline ? [] : widths.map((variantWidth) => {
        const { src, width: variantWidthValue } = getVariant(cover, variantWidth, 'webp')
        return { src, width: variantWidthValue }
      }),
      width,
    }
  }
  return Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
}

const formatManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`
const collectGeneratedFiles = (directory) => {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) return collectGeneratedFiles(entryPath)
    return /\.(?:avif|webp)$/i.test(entry.name) ? [entryPath] : []
  })
}

const expectedGeneratedFiles = (manifest) => new Set(Object.values(manifest).flatMap((media) => [
  ...media.avif,
  ...media.optimized,
].map((variant) => join(mediaRoot, ...variant.src.slice(1).split('/')))))

const writeOptimizedImages = async (manifest) => {
  for (const [cover, media] of Object.entries(manifest)) {
    const sourcePath = join(mediaRoot, ...cover.slice(1).split('/'))
    for (const variant of [...media.avif, ...media.optimized]) {
      const variantPath = join(mediaRoot, ...variant.src.slice(1).split('/'))
      // Encoding is slow; keep variants that are already newer than their source.
      if (existsSync(variantPath) && statSync(variantPath).mtimeMs >= statSync(sourcePath).mtimeMs) continue
      mkdirSync(dirname(variantPath), { recursive: true })
      const image = sharp(sourcePath)
        .resize({ width: variant.width, withoutEnlargement: true })
      const format = variant.src.endsWith('.avif')
        ? image.avif({ quality: 50, effort: 4 })
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
const expectedFiles = expectedGeneratedFiles(expected)
const orphanedFiles = collectGeneratedFiles(optimizedRoot).filter((file) => !expectedFiles.has(file))

if (orphanedFiles.length && mode === '--check') {
  throw new Error(`Found ${orphanedFiles.length} orphaned blog media variants. Run npm run blog:media:prepare to remove them.`)
}

if (mode === '--write') {
  orphanedFiles.forEach((file) => unlinkSync(file))
  await writeOptimizedImages(expected)
  writeFileSync(manifestPath, serialized, 'utf8')
  // Rendered articles are cached by their Markdown alone; drop the build cache so the next build picks up the
  // new variants. (The dev server keeps its own cache in .astro/ and needs a restart to see them.)
  const buildCache = join(repoRoot, 'node_modules', '.astro', 'data-store.json')
  if (existsSync(buildCache)) unlinkSync(buildCache)
  const variantCount = Object.values(expected).reduce((count, media) => count + media.optimized.length + media.avif.length, 0)
  console.log(`Blog media manifest written: ${Object.keys(expected).length} images (covers and article images), ${variantCount} responsive variants (WebP + AVIF).`)
} else {
  if (!existsSync(manifestPath)) throw new Error(`Blog media manifest is missing: ${manifestPath}`)
  const actual = readFileSync(manifestPath, 'utf8')
  if (actual !== serialized) {
    throw new Error('Blog media manifest is stale. Run npm run blog:media:prepare.')
  }
  await checkOptimizedImages(expected)
  const variantCount = Object.values(expected).reduce((count, media) => count + media.optimized.length + media.avif.length, 0)
  console.log(`Blog media manifest check passed: ${Object.keys(expected).length} images (covers and article images), ${variantCount} responsive variants (WebP + AVIF).`)
}
