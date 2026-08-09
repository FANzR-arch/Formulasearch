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

const readText = (directory, filename) => {
  const path = join(directory, filename)
  if (!existsSync(path)) throw new Error(`缺少文件：${path}`)
  const value = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').trim()
  if (!value) throw new Error(`文件为空：${path}`)
  return value
}

const labelForUrl = (url) => {
  if (url.includes('mp.weixin.qq.com')) return '微信'
  if (url.includes('x.com/')) return 'X'
  return '原文'
}

const yamlString = (value) => JSON.stringify(value)

const categories = JSON.parse(readFileSync(join(contentRoot, 'categories.json'), 'utf8'))
const categoryIds = new Set()

for (const category of categories) {
  for (const field of ['id', 'title', 'titleEn', 'description']) {
    if (!category[field]) throw new Error(`分类缺少 ${field}：${JSON.stringify(category)}`)
  }
  if (categoryIds.has(category.id)) throw new Error(`分类 id 重复：${category.id}`)
  categoryIds.add(category.id)
}

const findCover = (date) => {
  const directory = join(mediaRoot, date)
  if (!existsSync(directory)) throw new Error(`缺少封面目录：${directory}`)

  const filename = readdirSync(directory)
    .filter((entry) => imageExtensions.has(extname(entry).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))[0]

  if (!filename) throw new Error(`缺少封面图片：${directory}`)
  return `/uploads/blog/${date}/${filename}`
}

const posts = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .map((entry) => {
    const date = entry.name
    const directory = join(contentRoot, date)
    const category = readText(directory, '分类.txt')
    if (!categoryIds.has(category)) throw new Error(`未知分类 ${category}：${date}`)

    const externalLinks = readText(directory, '链接.txt')
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
      cover: findCover(date),
      date,
      directory,
      externalLinks,
      slug: `${category}-${date}`,
      summary: readText(directory, '摘要.txt'),
      title: readText(directory, '标题.txt'),
    }
  })
  .sort((a, b) => b.date.localeCompare(a.date))

const slugs = new Set()
for (const post of posts) {
  if (slugs.has(post.slug)) throw new Error(`文章 slug 重复：${post.slug}`)
  slugs.add(post.slug)
}

const renderIndex = (post, featured) => [
  '---',
  `title: ${yamlString(post.title)}`,
  `description: ${yamlString(post.summary)}`,
  `pubDate: ${post.date}`,
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

const mode = process.argv[2]

if (mode === '--write') {
  let created = 0
  let skipped = 0

  posts.forEach((post, index) => {
    const target = join(post.directory, 'index.md')
    if (existsSync(target)) {
      skipped += 1
      return
    }
    writeFileSync(target, renderIndex(post, index === 0), { encoding: 'utf8', flag: 'wx' })
    created += 1
  })

  console.log(`Blog 索引生成完成：新增 ${created} 篇，保留 ${skipped} 篇，共 ${posts.length} 篇。`)
} else if (mode === '--check') {
  for (const post of posts) {
    const target = join(post.directory, 'index.md')
    if (!existsSync(target)) throw new Error(`缺少 Markdown 索引：${target}`)
    const markdown = readFileSync(target, 'utf8')
    const expectedFields = [
      `title: ${yamlString(post.title)}`,
      `description: ${yamlString(post.summary)}`,
      `slug: ${post.slug}`,
      `category: ${post.category}`,
      `cover: ${yamlString(post.cover)}`,
    ]
    for (const field of expectedFields) {
      if (!markdown.includes(field)) throw new Error(`Markdown 与现有索引不一致：${target}\n缺少：${field}`)
    }
  }

  console.log(`Blog 内容检查通过：${posts.length} 篇、${categories.length} 个分类、${slugs.size} 个唯一 slug。`)
} else {
  console.error('用法：node scripts/prepare-blog-content.mjs --write | --check')
  process.exitCode = 1
}
