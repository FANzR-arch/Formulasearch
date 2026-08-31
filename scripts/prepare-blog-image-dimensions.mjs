import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const contentRoot = join(repoRoot, 'content', 'blog')
const manifestPath = join(repoRoot, 'content', 'site', 'blog-image-dimensions.json')
const mode = process.argv[2]

if (!['--check', '--report', '--write'].includes(mode)) {
  console.error('Usage: node scripts/prepare-blog-image-dimensions.mjs --check | --report | --write')
  process.exitCode = 1
}

const readManifest = () => {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (raw?.version !== 1 || !raw?.images || typeof raw.images !== 'object' || Array.isArray(raw.images)) {
    throw new Error(`Invalid blog image dimensions manifest: ${manifestPath}`)
  }
  for (const [source, value] of Object.entries(raw.images)) {
    if (!/^https:\/\//i.test(source) || !Number.isInteger(value?.width) || !Number.isInteger(value?.height) || value.width <= 0 || value.height <= 0) {
      throw new Error(`Invalid remote image dimensions: ${source}`)
    }
  }
  return raw
}

const collectSources = () => {
  const files = readdirSync(contentRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]+)?$/.test(entry.name))
    .map((entry) => join(contentRoot, entry.name, 'index.md'))
  const sources = new Map()
  const markdownImage = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g
  const htmlImage = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi
  for (const file of files) {
    if (!existsSync(file)) continue
    const markdown = readFileSync(file, 'utf8')
    for (const match of markdown.matchAll(markdownImage)) {
      sources.set(match[1], relative(repoRoot, file).replaceAll('\\', '/'))
    }
    for (const match of markdown.matchAll(htmlImage)) {
      const source = (match[1] ?? match[2] ?? match[3] ?? '').trim()
      if (/^https:\/\//i.test(source)) sources.set(source, relative(repoRoot, file).replaceAll('\\', '/'))
    }
  }
  return sources
}

const fetchImageDimensions = async (source) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(source, {
      headers: { 'user-agent': 'Formulasearch blog image metadata checker' },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const metadata = await sharp(buffer).metadata()
    if (!metadata.width || !metadata.height) throw new Error('image dimensions unavailable')
    return { width: metadata.width, height: metadata.height }
  } finally {
    clearTimeout(timer)
  }
}

const manifest = readManifest()
const sources = collectSources()
const knownSources = Object.keys(manifest.images)
const staleSources = knownSources.filter((source) => !sources.has(source))
const pendingSources = [...sources.keys()].filter((source) => !manifest.images[source])

if (mode === '--check') {
  if (staleSources.length > 0) throw new Error(`Blog image dimensions manifest has ${staleSources.length} stale URL(s): ${staleSources.join(', ')}`)
  console.log(`Blog remote image dimensions manifest check passed: ${knownSources.length} known, ${pendingSources.length} pending.`)
  process.exit(0)
}

if (mode === '--report') {
  console.log(`Blog remote image dimensions: ${sources.size} unique HTTPS URL(s), ${knownSources.length} known, ${pendingSources.length} pending.`)
  if (staleSources.length > 0) console.log(`Stale manifest entries: ${staleSources.length}`)
  for (const source of pendingSources) console.log(`- pending | ${sources.get(source)} | ${source}`)
  process.exit(0)
}

const nextImages = Object.fromEntries(knownSources.filter((source) => sources.has(source)).map((source) => [source, manifest.images[source]]))
let resolved = 0
let failed = 0
for (const source of pendingSources) {
  try {
    nextImages[source] = { ...(await fetchImageDimensions(source)), verifiedAt: new Date().toISOString().slice(0, 10) }
    resolved += 1
    console.log(`resolved | ${source} | ${nextImages[source].width}x${nextImages[source].height}`)
  } catch (error) {
    failed += 1
    console.warn(`pending | ${source} | ${error instanceof Error ? error.message : String(error)}`)
  }
}

writeFileSync(manifestPath, `${JSON.stringify({ version: 1, images: Object.fromEntries(Object.entries(nextImages).sort(([left], [right]) => left.localeCompare(right))) }, null, 2)}\n`, 'utf8')
console.log(`Blog remote image dimensions updated: ${resolved} resolved, ${failed} pending, ${Object.keys(nextImages).length} total.`)
