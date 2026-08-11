import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

export interface BlogCategory {
  id: string
  title: string
  titleEn: string
  description: string
}

export interface BlogLink {
  label: '微信' | 'X' | '原文'
  url: string
}

export interface BlogPost {
  category: BlogCategory
  categoryId: string
  contentStatus: 'index-only' | 'full'
  cover: string
  date: string
  draft: boolean
  links: BlogLink[]
  slug: string
  summary: string
  title: string
}

const contentRoot = join(process.cwd(), 'content', 'blog')
const mediaRoot = join(process.cwd(), 'public', 'uploads', 'blog')
const imageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp'])

const categories = JSON.parse(
  readFileSync(join(contentRoot, 'categories.json'), 'utf8'),
) as BlogCategory[]

const categoryMap = new Map(categories.map((category) => [category.id, category]))

const readText = (directory: string, filename: string, allowEmpty = false) => {
  const value = readFileSync(join(directory, filename), 'utf8').replace(/^\uFEFF/, '').trim()
  if (!value && !allowEmpty) throw new Error(`Empty blog content file: ${join(directory, filename)}`)
  return value
}

const readFrontmatterField = (markdown: string, field: string) => {
  const match = markdown.match(new RegExp(`^${field}:\\s*["']?([^\\r\\n"']+)["']?\\s*$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

const getLinkLabel = (url: string): BlogLink['label'] => {
  if (url.includes('mp.weixin.qq.com')) return '微信'
  if (url.includes('x.com/')) return 'X'
  return '原文'
}

const findCover = (date: string) => {
  const directory = join(mediaRoot, date)
  if (!existsSync(directory)) return ''

  const filename = readdirSync(directory)
    .filter((entry) => imageExtensions.has(extname(entry).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))[0]

  return filename ? `/uploads/blog/${date}/${filename}` : ''
}

const loadPosts = (): BlogPost[] => readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .map((entry) => {
    const directory = join(contentRoot, entry.name)
    const categoryId = readText(directory, '分类.txt')
    const category = categoryMap.get(categoryId)

    if (!category) throw new Error(`Unknown blog category "${categoryId}" in ${entry.name}`)

    const links = readText(directory, '链接.txt', true)
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => ({ label: getLinkLabel(url), url }))

    const markdown = readFileSync(join(directory, 'index.md'), 'utf8')
    const contentStatus = readFrontmatterField(markdown, 'contentStatus') as BlogPost['contentStatus']
    const draft = readFrontmatterField(markdown, 'draft') === 'true'
    if (contentStatus !== 'index-only' && contentStatus !== 'full') {
      throw new Error(`Unknown contentStatus "${contentStatus}" in ${entry.name}`)
    }

    return {
      category,
      categoryId,
      contentStatus,
      cover: findCover(entry.name),
      date: readFrontmatterField(markdown, 'pubDate') || entry.name,
      draft,
      links,
      slug: readFrontmatterField(markdown, 'slug'),
      summary: readText(directory, '摘要.txt'),
      title: readText(directory, '标题.txt'),
    }
  })
  .sort((a, b) => b.date.localeCompare(a.date))

const posts = loadPosts().filter((post) => !post.draft)

export const getBlogPosts = () => posts
export const getBlogCategories = () => categories
export const formatBlogDate = (date: string) => date.replaceAll('-', '.')
export const isLocalBlogPost = (post: BlogPost) => post.contentStatus === 'full'
export const getPrimaryBlogLink = (post: BlogPost) => isLocalBlogPost(post)
  ? `/blog/${post.slug}`
  : post.links[0]?.url ?? '/blog/archive'
