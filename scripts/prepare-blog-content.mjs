import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contentRoot = join(repoRoot, 'content', 'blog')
const mediaRoot = join(repoRoot, 'public', 'uploads', 'blog')
const imageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp'])

const readText = (directory, filename, { allowEmpty = false } = {}) => {
  const path = join(directory, filename)
  if (!existsSync(path)) throw new Error(`缺少文件：${path}`)
  const value = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').trim()
  if (!value && !allowEmpty) throw new Error(`文件为空：${path}`)
  return value
}

const labelForUrl = (url) => {
  if (url.includes('mp.weixin.qq.com')) return 'wechat'
  if (url.includes('x.com/')) return 'x'
  return 'original'
}

const yamlString = (value) => JSON.stringify(value)

const readFrontmatterField = (markdown, field) => {
  const match = markdown.match(new RegExp(`^${field}:\\s*["']?([^\\r\\n"']+)["']?\\s*$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

const readFrontmatterBoolean = (markdown, field, fallback = false) => {
  const value = readFrontmatterField(markdown, field)
  if (!value) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`Invalid ${field} in blog frontmatter: ${value}`)
}

const getMarkdownBody = (markdown) => {
  const frontmatterEnd = markdown.indexOf('\n---', 4)
  if (frontmatterEnd === -1) return ''
  return markdown
    .slice(frontmatterEnd + 4)
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
}

const validateContentStatus = (post, markdown) => {
  const contentStatus = readFrontmatterField(markdown, 'contentStatus')
  const draft = readFrontmatterBoolean(markdown, 'draft')
  if (!['index-only', 'full'].includes(contentStatus)) {
    throw new Error(`Invalid contentStatus in ${post.directory}: ${contentStatus || '(empty)'}`)
  }
  if (contentStatus === 'index-only' && post.externalLinks.length === 0 && !draft) {
    throw new Error(`Index-only article must keep at least one external link: ${post.directory}`)
  }
  if (contentStatus === 'full' && !getMarkdownBody(markdown)) {
    throw new Error(`Full article has no body content: ${post.directory}`)
  }
  return { contentStatus, draft }
}

const categories = JSON.parse(readFileSync(join(contentRoot, 'categories.json'), 'utf8'))
const categoryIds = new Set()

for (const category of categories) {
  for (const field of ['id', 'title', 'titleEn', 'description']) {
    if (!category[field]) throw new Error(`分类缺少 ${field}：${JSON.stringify(category)}`)
  }
  if (categoryIds.has(category.id)) throw new Error(`分类 id 重复：${category.id}`)
  categoryIds.add(category.id)
}

const findCover = (sourceDate) => {
  const directory = join(mediaRoot, sourceDate)
  if (!existsSync(directory)) throw new Error(`缺少封面目录：${directory}`)

  const filename = readdirSync(directory)
    .filter((entry) => imageExtensions.has(extname(entry).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))[0]

  if (!filename) throw new Error(`缺少封面图片：${directory}`)
  return `/uploads/blog/${sourceDate}/${filename}`
}

const posts = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .map((entry) => {
    const sourceDate = entry.name
    const directory = join(contentRoot, sourceDate)
    const category = readText(directory, '分类.txt')
    if (!categoryIds.has(category)) throw new Error(`未知分类 ${category}：${sourceDate}`)

    const externalLinks = readText(directory, '链接.txt', { allowEmpty: true })
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`链接协议无效：${url}`)
        return { label: labelForUrl(url), url }
      })

    return {
      category,
      cover: findCover(sourceDate),
      sourceDate,
      directory,
      externalLinks,
      slug: `${category}-${sourceDate}`,
      summary: readText(directory, '摘要.txt'),
      title: readText(directory, '标题.txt'),
    }
  })
  .sort((a, b) => b.sourceDate.localeCompare(a.sourceDate))

const slugs = new Set()
const links = new Map()
const summaries = new Map()
for (const post of posts) {
  if (slugs.has(post.slug)) throw new Error(`文章 slug 重复：${post.slug}`)
  slugs.add(post.slug)

  const previousSummary = summaries.get(post.summary)
  if (previousSummary && previousSummary !== post.title) {
    throw new Error(`不同标题共用同一摘要：${previousSummary} / ${post.title}`)
  }
  summaries.set(post.summary, post.title)

  const postLinkUrls = new Set()
  for (const link of post.externalLinks) {
    if (postLinkUrls.has(link.url)) {
      throw new Error(`同一篇文章重复使用外链：${post.title}\n${link.url}`)
    }
    postLinkUrls.add(link.url)
    const previousTitle = links.get(link.url)
    if (previousTitle && previousTitle !== post.title) {
      throw new Error(`不同文章共用同一外链：${previousTitle} / ${post.title}\n${link.url}`)
    }
    links.set(link.url, post.title)
  }
}

// New index-only records use the source folder date until their verified
// publication date is known. Existing index.md files keep their real pubDate.
const renderIndex = (post, featured) => [
  '---',
  `title: ${yamlString(post.title)}`,
  `description: ${yamlString(post.summary)}`,
  `pubDate: ${post.sourceDate}`,
  `slug: ${post.slug}`,
  `category: ${post.category}`,
  'tags: []',
  `cover: ${yamlString(post.cover)}`,
  `coverAlt: ${yamlString(`${post.title}的文章封面`)}`,
  'contentStatus: index-only',
  `featured: ${featured}`,
  'draft: false',
  'externalLinks:',
  ...post.externalLinks.flatMap((link) => [
    `  - label: ${yamlString(link.label)}`,
    `    url: ${yamlString(link.url)}`,
  ]),
  '---',
  '',
  '<!-- 正文尚未迁移；contentStatus 改为 full 前不会生成本站文章页。 -->',
  '',
].join('\n')

const managedFields = (post) => ({
  title: yamlString(post.title),
  description: yamlString(post.summary),
  slug: post.slug,
  category: post.category,
  cover: yamlString(post.cover),
  coverAlt: yamlString(`${post.title}的文章封面`),
})

const syncIndex = (post, markdown) => {
  const frontmatterEnd = markdown.indexOf('\n---', 4)
  if (frontmatterEnd === -1) throw new Error(`Markdown 缺少 frontmatter 结束标记：${post.directory}`)

  let frontmatter = markdown.slice(0, frontmatterEnd)
  const body = markdown.slice(frontmatterEnd)
  for (const [field, value] of Object.entries(managedFields(post))) {
    const pattern = new RegExp(`^${field}:.*$`, 'm')
    const line = `${field}: ${value}`
    frontmatter = pattern.test(frontmatter) ? frontmatter.replace(pattern, line) : `${frontmatter}\n${line}`
  }

  const links = post.externalLinks.length
    ? ['externalLinks:', ...post.externalLinks.flatMap((link) => [
      `  - label: ${yamlString(link.label)}`,
      `    url: ${yamlString(link.url)}`,
    ])].join('\n')
    : 'externalLinks: []'
  const frontmatterLines = frontmatter.split(/\r?\n/)
  const linksStart = frontmatterLines.findIndex((line) => line.startsWith('externalLinks:'))
  if (linksStart === -1) {
    frontmatterLines.push(...links.split('\n'))
  } else {
    let linksEnd = linksStart + 1
    while (linksEnd < frontmatterLines.length && (frontmatterLines[linksEnd].startsWith('  - label:') || frontmatterLines[linksEnd].startsWith('    url:'))) linksEnd += 1
    frontmatterLines.splice(linksStart, linksEnd - linksStart, ...links.split('\n'))
  }
  frontmatter = frontmatterLines.join('\n')
  return `${frontmatter}${body}`
}

const mode = process.argv[2]

if (mode === '--write') {
  let created = 0
  let updated = 0
  let unchanged = 0

  posts.forEach((post, index) => {
    const target = join(post.directory, 'index.md')
    if (existsSync(target)) {
      const before = readFileSync(target, 'utf8')
      const after = syncIndex(post, before)
      if (after !== before) {
        writeFileSync(target, after, 'utf8')
        updated += 1
      } else {
        unchanged += 1
      }
      return
    }
    if (post.externalLinks.length === 0) throw new Error(`Index-only article must keep at least one external link: ${post.directory}`)
    writeFileSync(target, renderIndex(post, index === 0), { encoding: 'utf8', flag: 'wx' })
    created += 1
  })

  console.log(`Blog 索引同步完成：新增 ${created} 篇，更新 ${updated} 篇，未变化 ${unchanged} 篇，共 ${posts.length} 篇。`)
} else if (mode === '--check') {
  const statusCounts = { full: 0, 'index-only': 0 }
  let draftCount = 0
  for (const post of posts) {
    const target = join(post.directory, 'index.md')
    if (!existsSync(target)) throw new Error(`缺少 Markdown 索引：${target}`)
    const markdown = readFileSync(target, 'utf8')
    const { contentStatus, draft } = validateContentStatus(post, markdown)
    statusCounts[contentStatus] += 1
    if (draft) draftCount += 1
    const expectedFields = [
      `title: ${yamlString(post.title)}`,
      `description: ${yamlString(post.summary)}`,
      `slug: ${post.slug}`,
      `category: ${post.category}`,
      `cover: ${yamlString(post.cover)}`,
      `coverAlt: ${yamlString(`${post.title}的文章封面`)}`,
    ]
    for (const field of expectedFields) {
      if (!markdown.includes(field)) throw new Error(`Markdown 与现有索引不一致：${target}\n缺少：${field}`)
    }

    const markdownLinks = [...markdown.matchAll(/^\s+url:\s*["']([^"']+)["']\s*$/gm)].map((match) => match[1])
    const sourceLinks = post.externalLinks.map((link) => link.url)
    if (JSON.stringify(markdownLinks) !== JSON.stringify(sourceLinks)) {
      throw new Error(`Markdown 与链接.txt 不一致：${target}`)
    }
  }

  console.log(`Blog content check passed: ${posts.length} posts, ${statusCounts.full} full, ${statusCounts['index-only']} index-only, ${draftCount} drafts, ${categories.length} categories, ${slugs.size} unique slugs.`)
} else {
  console.error('用法：node scripts/prepare-blog-content.mjs --write | --check')
  process.exitCode = 1
}
