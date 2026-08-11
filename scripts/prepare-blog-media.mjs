import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const contentRoot = join(repoRoot, 'content', 'blog')
const mediaRoot = join(repoRoot, 'public')
const manifestPath = join(repoRoot, 'content', 'site', 'blog-media.json')
const imageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp'])

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

    manifest[cover] = {
      bytes: statSync(sourcePath).size,
      height,
      width,
    }
  }
  return Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
}

const formatManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`
const mode = process.argv[2]

if (!['--write', '--check'].includes(mode)) {
  console.error('Usage: node scripts/prepare-blog-media.mjs --write | --check')
  process.exit(1)
}

const expected = await buildManifest()
const serialized = formatManifest(expected)

if (mode === '--write') {
  writeFileSync(manifestPath, serialized, 'utf8')
  console.log(`Blog media manifest written: ${Object.keys(expected).length} covers.`)
} else {
  if (!existsSync(manifestPath)) throw new Error(`Blog media manifest is missing: ${manifestPath}`)
  const actual = readFileSync(manifestPath, 'utf8')
  if (actual !== serialized) {
    throw new Error('Blog media manifest is stale. Run npm run blog:media:prepare.')
  }
  console.log(`Blog media manifest check passed: ${Object.keys(expected).length} covers.`)
}
