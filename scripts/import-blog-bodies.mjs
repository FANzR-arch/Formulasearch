import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const args = process.argv.slice(2)
const sourceFlag = args.indexOf('--source')
const sourceRoot = sourceFlag >= 0 ? resolve(args[sourceFlag + 1] ?? '') : ''
const shouldWrite = args.includes('--write')
const contentRoot = resolve('content', 'blog')

if (!sourceRoot || !existsSync(sourceRoot)) {
  console.error('用法：node scripts/import-blog-bodies.mjs --source <02-已发布目录> [--write]')
  process.exit(1)
}

const readUtf8 = (path) => readFileSync(path, 'utf8').replace(/^\uFEFF/, '')

const splitMarkdown = (markdown, path) => {
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/)
  if (!match) throw new Error(`缺少 YAML frontmatter：${path}`)
  return { frontmatter: match[1], body: markdown.slice(match[0].length) }
}

const readScalar = (frontmatter, field) => {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, 'm'))
  if (!match) return ''
  const value = match[1].trim()
  if (value.startsWith('"')) {
    try { return JSON.parse(value) } catch {}
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replaceAll("''", "'")
  return value
}

const normalizeTitle = (value) => value
  .normalize('NFKC')
  .toLocaleLowerCase('zh-Hans')
  .replace(/[\p{P}\p{S}\p{Z}\s]/gu, '')

const uniqueMatch = (items, predicate) => {
  const matches = items.filter(predicate)
  return matches.length === 1 ? matches[0] : null
}

const cleanBody = (body, sourceTitle, targetTitle) => {
  let cleaned = body.replace(/^\s+/, '')

  // 详情页会统一渲染本地封面，移除原稿开头重复的封面图。
  cleaned = cleaned.replace(/^(?:!\[[^\]]*\]\([^\r\n]+\)|!\[\[[^\r\n]+\]\]|<img\b[^>]*>)\s*(?:\r?\n)+/i, '')

  const firstHeading = cleaned.match(/^#\s+(.+?)\s*(?:\r?\n)+/)
  if (firstHeading) {
    const heading = normalizeTitle(firstHeading[1])
    if (heading === normalizeTitle(sourceTitle) || heading === normalizeTitle(targetTitle)) {
      cleaned = cleaned.slice(firstHeading[0].length)
    }
  }

  // Obsidian 本地粘贴图不在发布库内，避免把失效占位符带到网站。
  cleaned = cleaned
    .replace(/^!\[\[[^\]]+\]\]\s*$/gm, '')
    .replace(/^!\\\[\\\]\((?!https?:\/\/)[^)]+\)\s*$/gmi, '')

  // 页面标题是唯一 H1；原稿内部的 H1 统一降级，目录层级更稳定。
  cleaned = cleaned.replace(/^#\s+(.+)$/gm, '## $1')

  // Obsidian 接受紧贴中文的粗体，CommonMark 会把部分写法显示成字面星号。
  // 只处理代码围栏之外的片段，避免改写提示词或代码样例。
  cleaned = cleaned
    .split(/(```[\s\S]*?```)/g)
    .map((segment, index) => index % 2 === 0
      ? segment
          .replace(/\*\*([^*\r\n]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\\\*\\\*(?=[^\r\n]*$)/gm, '')
      : segment)
    .join('')

  return `${cleaned.trim()}\n`
}

const sourcePosts = readdirSync(sourceRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md')
  .map((entry) => {
    const path = join(sourceRoot, entry.name)
    const markdown = readUtf8(path)
    const { frontmatter, body } = splitMarkdown(markdown, path)
    return {
      body,
      filename: entry.name,
      path,
      published: readScalar(frontmatter, 'published'),
      sourceUrl: readScalar(frontmatter, 'source'),
      title: readScalar(frontmatter, 'title'),
    }
  })
  .filter((post) => post.title && post.published)

const targets = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .map((entry) => {
    const path = join(contentRoot, entry.name, 'index.md')
    const markdown = readUtf8(path)
    const { frontmatter } = splitMarkdown(markdown, path)
    return {
      dateFolder: entry.name,
      frontmatter,
      markdown,
      path,
      title: readScalar(frontmatter, 'title'),
      links: [...frontmatter.matchAll(/^\s+url:\s*["']?([^\s"']+)["']?\s*$/gm)].map((match) => match[1]),
    }
  })
  .sort((a, b) => b.dateFolder.localeCompare(a.dateFolder))

const results = targets.map((target) => {
  let source = uniqueMatch(sourcePosts, (post) => post.sourceUrl && target.links.includes(post.sourceUrl))
  let reason = source ? 'URL' : ''

  if (!source) {
    source = uniqueMatch(sourcePosts, (post) => post.title === target.title)
    reason = source ? '完整标题' : ''
  }

  if (!source) {
    const normalized = normalizeTitle(target.title)
    source = uniqueMatch(sourcePosts, (post) => normalized.length >= 8 && normalizeTitle(post.title) === normalized)
    reason = source ? '唯一标准化标题' : ''
  }

  return { reason, source, target }
})

const sourceUsage = new Map()
for (const result of results) {
  if (!result.source) continue
  const usedBy = sourceUsage.get(result.source.path) ?? []
  usedBy.push(result.target.dateFolder)
  sourceUsage.set(result.source.path, usedBy)
}

for (const [path, usedBy] of sourceUsage) {
  if (usedBy.length > 1) throw new Error(`同一原稿被匹配到多个页面：${basename(path)} -> ${usedBy.join(', ')}`)
}

let imported = 0
for (const { reason, source, target } of results) {
  if (!source) {
    console.log(`未匹配  ${target.dateFolder}  ${target.title}`)
    continue
  }

  console.log(`匹配[${reason}]  ${target.dateFolder} -> ${source.published}  ${source.filename}`)
  if (!shouldWrite) continue

  let frontmatter = target.frontmatter
    .replace(/^pubDate:\s*.+$/m, `pubDate: ${source.published}`)
    .replace(/^contentStatus:\s*.+$/m, 'contentStatus: full')

  const body = cleanBody(source.body, source.title, target.title)
  writeFileSync(target.path, `---\n${frontmatter}\n---\n\n${body}`, 'utf8')
  imported += 1
}

const matched = results.filter((result) => result.source).length
const unmatched = results.length - matched
console.log(`\n结果：${matched} 篇可确定正文，${unmatched} 篇保留外链。${shouldWrite ? `已写入 ${imported} 篇。` : '当前为预检，未写入文件。'}`)
