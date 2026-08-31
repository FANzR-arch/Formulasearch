import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const contentRoot = join(repoRoot, 'content', 'blog')
const strict = process.argv.includes('--strict')
const help = process.argv.includes('--help') || process.argv.includes('-h')

if (help) {
  console.log('Usage: node scripts/check-blog-image-availability.mjs [--strict]')
  console.log('Checks current external Blog image URLs without changing content or the dimensions manifest.')
  process.exit(0)
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
    for (const match of markdown.matchAll(markdownImage)) sources.set(match[1], relative(repoRoot, file).replaceAll('\\', '/'))
    for (const match of markdown.matchAll(htmlImage)) {
      const source = (match[1] ?? match[2] ?? match[3] ?? '').trim()
      if (/^https:\/\//i.test(source)) sources.set(source, relative(repoRoot, file).replaceAll('\\', '/'))
    }
  }
  return sources
}

const fetchWithTimeout = async (source, options = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  const { headers: optionHeaders = {}, ...requestOptions } = options
  try {
    return await fetch(source, {
      ...requestOptions,
      headers: { 'user-agent': 'Formulasearch blog image availability checker', ...optionHeaders },
      redirect: 'follow',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const closeBody = async (response) => {
  try { await response.body?.cancel() } catch {}
}

const checkSource = async (source) => {
  let response = await fetchWithTimeout(source, { method: 'HEAD' })
  if ([403, 405, 501].includes(response.status)) {
    await closeBody(response)
    response = await fetchWithTimeout(source, { headers: { range: 'bytes=0-0' } })
  }
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() || ''
  const result = {
    ok: response.ok && contentType.startsWith('image/'),
    status: response.status,
    contentType: contentType || 'missing',
    finalUrl: response.url || source,
  }
  await closeBody(response)
  return result
}

const sources = collectSources()
const entries = [...sources.entries()]
const results = []
let cursor = 0
const worker = async () => {
  while (cursor < entries.length) {
    const index = cursor++
    const [source, file] = entries[index]
    try {
      results[index] = { source, file, ...(await checkSource(source)) }
    } catch (error) {
      results[index] = { source, file, ok: false, status: 0, contentType: 'unreachable', error: error instanceof Error ? error.message : String(error) }
    }
  }
}

await Promise.all(Array.from({ length: Math.min(6, entries.length) }, () => worker()))

const failures = results.filter((result) => !result.ok)
const redirects = results.filter((result) => result.finalUrl && result.finalUrl !== result.source)
console.log(`Blog 图片可用性报告：${results.length} 个唯一外部 URL，${results.length - failures.length} 个可访问，${failures.length} 个失败，${redirects.length} 个发生重定向。`)
for (const result of failures) {
  const detail = result.error || `HTTP ${result.status}, content-type ${result.contentType}`
  console.log(`- failed | ${result.file} | ${detail} | ${result.source}`)
}
for (const result of redirects) {
  console.log(`- redirect | ${result.file} | ${result.source} -> ${result.finalUrl}`)
}

if (strict && failures.length > 0) {
  throw new Error(`Blog image availability check failed: ${failures.length} external URL(s) are unavailable or not images.`)
}
