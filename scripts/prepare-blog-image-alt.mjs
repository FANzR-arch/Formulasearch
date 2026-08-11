import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const contentRoot = join(repoRoot, 'content', 'blog')
const genericAlt = new Set(['', '图像', 'image', 'Image'])

const cleanHeading = (value) => value
  .replace(/<[^>]+>/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[\*_`]/g, '')
  .replace(/\s+#*$/, '')
  .trim()

const readTitle = (markdown) => {
  const match = markdown.match(/^title:\s*["'](.+?)["']\s*$/m)
  return match?.[1]?.trim() || '文章'
}

const transform = (markdown) => {
  const lines = markdown.split(/\r?\n/)
  let inFrontmatter = false
  let frontmatterSeen = false
  let currentHeading = readTitle(markdown)
  let replacements = 0

  const output = lines.map((line) => {
    if (line.trim() === '---' && !frontmatterSeen) {
      inFrontmatter = true
      frontmatterSeen = true
      return line
    }
    if (line.trim() === '---' && inFrontmatter) {
      inFrontmatter = false
      return line
    }
    if (inFrontmatter) return line

    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/)
    if (heading) currentHeading = cleanHeading(heading[1]) || currentHeading

    return line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, destination) => {
      if (!genericAlt.has(alt.trim())) return match
      replacements += 1
      return `![${currentHeading}配图](${destination})`
    })
  })

  return { content: output.join('\n'), replacements }
}

const posts = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .map((entry) => join(contentRoot, entry.name, 'index.md'))

const mode = process.argv[2]
if (!['--check', '--write'].includes(mode)) {
  console.error('用法：node scripts/prepare-blog-image-alt.mjs --check | --write')
  process.exitCode = 1
}

let total = 0
let changedFiles = 0
for (const file of posts) {
  if (!existsSync(file)) throw new Error(`缺少 Markdown 文件：${file}`)
  const before = readFileSync(file, 'utf8')
  const { content, replacements } = transform(before)
  total += replacements
  if (mode === '--write' && content !== before) {
    writeFileSync(file, content, 'utf8')
    changedFiles += 1
  }
}

if (mode === '--check' && total > 0) {
  throw new Error(`正文图片仍有 ${total} 个通用 alt；请先运行 npm run blog:images:prepare，再人工复核复杂图片。`)
}

console.log(mode === '--write'
  ? `Blog 图片 alt 已更新：${changedFiles} 个文件，替换 ${total} 个通用 alt。`
  : `Blog 图片 alt 检查通过：${posts.length} 篇文章，无通用 alt。`)
