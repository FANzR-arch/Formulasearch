import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contentRoot = resolve(process.env.BLOG_CONTENT_ROOT || join(repoRoot, 'content', 'blog'))
const legacyFiles = ['标题.txt', '摘要.txt', '分类.txt', '链接.txt']
const allowedLinkLabels = new Set(['wechat', 'x', 'original'])

const readUtf8 = (path) => readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
const readLegacyText = (directory, filename, { allowEmpty = false } = {}) => {
  const path = join(directory, filename)
  if (!existsSync(path)) return null
  const value = readUtf8(path).trim()
  if (!value && !allowEmpty) throw new Error(`旧内容文件为空：${path}`)
  return value
}

const splitMarkdown = (source, path) => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/)
  if (!match) throw new Error(`Markdown 缺少有效 frontmatter：${path}`)
  let data
  try {
    data = parse(match[1])
  } catch (error) {
    throw new Error(`Markdown frontmatter 无法解析：${path}\n${error.message}`)
  }
  return { data, body: match[2], frontmatter: match[1] }
}

const categorySourceFile = JSON.parse(readUtf8(join(contentRoot, 'categories.json')))
const categorySource = categorySourceFile.items
const categories = new Set(categorySource.map((category) => category.id))
if (categories.size !== categorySource.length) throw new Error('Blog 分类 id 重复。')

const postDirectories = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const posts = postDirectories.map((directoryName) => {
  const directory = join(contentRoot, directoryName)
  const path = join(directory, 'index.md')
  if (!existsSync(path)) throw new Error(`Blog 目录缺少 index.md：${path}`)
  const source = readUtf8(path)
  const parsed = splitMarkdown(source, path)
  return { directory, directoryName, path, source, ...parsed }
})

const requireText = (post, field) => {
  const value = post.data[field]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${post.path} 缺少 ${field}`)
  return value.trim()
}

const normalizedDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return ''
}

const validate = () => {
  const slugs = new Set()
  const links = new Map()
  const counts = { full: 0, 'index-only': 0, drafts: 0 }

  for (const post of posts) {
    const title = requireText(post, 'title')
    requireText(post, 'description')
    const slug = requireText(post, 'slug')
    const sourceId = requireText(post, 'sourceId')
    const category = requireText(post, 'category')
    requireText(post, 'cover')
    const coverAlt = requireText(post, 'coverAlt')
    if (!normalizedDate(post.data.pubDate)) throw new Error(`${post.path} 的 pubDate 必须是 YYYY-MM-DD。`)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${post.path} 的 slug 格式无效：${slug}`)
    if (sourceId !== post.directoryName) throw new Error(`${post.path} 的 sourceId 必须与内容目录一致：${post.directoryName}`)
    if (slugs.has(slug)) throw new Error(`Blog slug 重复：${slug}`)
    slugs.add(slug)
    if (!categories.has(category)) throw new Error(`${post.path} 使用未知分类：${category}`)
    if (/(?:文章封面|article cover)$/i.test(coverAlt)) throw new Error(`${post.path} 的 coverAlt 仍是通用占位描述。`)
    if (!['full', 'index-only'].includes(post.data.contentStatus)) throw new Error(`${post.path} 的 contentStatus 无效。`)
    if (post.data.contentStatus === 'full' && !post.body.replace(/<!--[\s\S]*?-->/g, '').trim()) {
      throw new Error(`${post.path} 标记为 full，但没有正文。`)
    }
    const externalLinks = post.data.externalLinks ?? []
    if (!Array.isArray(externalLinks)) throw new Error(`${post.path} 的 externalLinks 必须是数组。`)
    if (post.data.contentStatus === 'index-only' && externalLinks.length === 0 && post.data.draft !== true) {
      throw new Error(`${post.path} 是已发布的 index-only 内容，但没有外链。`)
    }
    for (const link of externalLinks) {
      if (!allowedLinkLabels.has(link?.label)) throw new Error(`${post.path} 的外链平台无效。`)
      let url
      try { url = new URL(link.url) } catch { throw new Error(`${post.path} 包含无效外链：${link?.url ?? ''}`) }
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${post.path} 包含非 HTTP 外链：${link.url}`)
      if (links.has(link.url)) throw new Error(`不同文章共用同一外链：${links.get(link.url)} / ${title}`)
      links.set(link.url, title)
    }
    if (post.data.contentLanguage === 'en') {
      for (const field of ['titleEn', 'descriptionEn', 'coverAltEn']) requireText(post, field)
    }
    if (/<\/?strong\b/i.test(post.body)) throw new Error(`${post.path} 仍包含旧 <strong> HTML；请先运行 npm run blog:migrate。`)
    if (/<img\b/i.test(post.body)) throw new Error(`${post.path} 包含原始 <img> HTML；请改为 Markdown 图片语法。`)
    counts[post.data.contentStatus] += 1
    if (post.data.draft === true) counts.drafts += 1
  }

  const fingerprint = createHash('sha256').update(JSON.stringify(posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    pubDate: normalizedDate(post.data.pubDate),
    slug: post.data.slug,
    category: post.data.category,
    contentStatus: post.data.contentStatus,
    draft: post.data.draft === true,
    externalLinks: post.data.externalLinks ?? [],
    body: post.body.trim(),
  })))).digest('hex').slice(0, 16)

  console.log(`Blog content check passed: ${posts.length} posts, ${counts.full} full, ${counts['index-only']} index-only, ${counts.drafts} drafts, ${categories.size} categories, ${slugs.size} unique slugs. Fingerprint ${fingerprint}.`)
}

const legacyLabelForUrl = (url) => url.includes('mp.weixin.qq.com') ? 'wechat' : url.includes('x.com/') ? 'x' : 'original'
const migrateSingleSource = () => {
  let converted = 0
  let removed = 0
  for (const post of posts) {
    const legacy = {
      title: readLegacyText(post.directory, '标题.txt'),
      description: readLegacyText(post.directory, '摘要.txt'),
      category: readLegacyText(post.directory, '分类.txt'),
      links: readLegacyText(post.directory, '链接.txt', { allowEmpty: true }),
    }
    const legacyPresent = Object.values(legacy).some((value) => value !== null)
    if (legacyPresent && Object.values(legacy).some((value) => value === null)) {
      throw new Error(`${post.directory} 的旧 txt 文件不完整，已停止迁移。`)
    }
    if (legacyPresent) {
      const expectedLinks = legacy.links.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
        .map((url) => ({ label: legacyLabelForUrl(url), url }))
      const comparisons = [
        ['title', legacy.title, post.data.title],
        ['description', legacy.description, post.data.description],
        ['category', legacy.category, post.data.category],
        ['externalLinks', JSON.stringify(expectedLinks), JSON.stringify(post.data.externalLinks ?? [])],
      ]
      const mismatch = comparisons.find(([, left, right]) => left !== right)
      if (mismatch) throw new Error(`${post.path} 与旧 ${mismatch[0]} 内容不一致，已停止迁移。`)
    }

    const sourceIdLine = `sourceId: "${post.directoryName}"`
    const withSourceId = /^sourceId:/m.test(post.source)
      ? post.source.replace(/^sourceId:.*$/m, sourceIdLine)
      : post.source.replace(/^(pubDate:.*)$/m, `$1\n${sourceIdLine}`)
    const migrated = withSourceId
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/\r\n/g, '\n')
    if (migrated !== post.source) {
      writeFileSync(post.path, migrated, 'utf8')
      converted += 1
    }
    for (const filename of legacyFiles) {
      const path = join(post.directory, filename)
      if (existsSync(path)) {
        unlinkSync(path)
        removed += 1
      }
    }
  }
  console.log(`Blog 单一内容源迁移完成：${posts.length} 篇，转换 ${converted} 篇 Markdown，删除 ${removed} 个旧 txt 文件。`)
}

const mode = process.argv[2]
if (mode === '--migrate-single-source') migrateSingleSource()
else if (mode === '--check') validate()
else {
  console.error('用法：node scripts/prepare-blog-content.mjs --migrate-single-source | --check')
  process.exitCode = 1
}
