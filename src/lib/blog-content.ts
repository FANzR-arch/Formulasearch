import { getCollection, type CollectionEntry } from 'astro:content'
import categoriesContent from '../../content/blog/categories.json'

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

const categories = categoriesContent as BlogCategory[]
const categoryMap = new Map(categories.map((category) => [category.id, category]))

const toBlogPost = (entry: CollectionEntry<'blog'>): BlogPost => {
  const category = categoryMap.get(entry.data.category)
  if (!category) throw new Error(`Unknown blog category "${entry.data.category}" in ${entry.id}`)

  return {
    category,
    categoryId: entry.data.category,
    contentStatus: entry.data.contentStatus,
    cover: entry.data.cover,
    date: entry.data.pubDate.toISOString().slice(0, 10),
    draft: entry.data.draft,
    links: entry.data.externalLinks,
    slug: entry.data.slug,
    summary: entry.data.description,
    title: entry.data.title,
  }
}

export const getBlogPosts = async () => (await getCollection('blog', ({ data }) => !data.draft))
  .sort((left, right) => right.data.pubDate.valueOf() - left.data.pubDate.valueOf())
  .map(toBlogPost)

export const getBlogCategories = () => categories
export const formatBlogDate = (date: string) => date.replaceAll('-', '.')
export const isLocalBlogPost = (post: BlogPost) => post.contentStatus === 'full'
export const getPrimaryBlogLink = (post: BlogPost) => isLocalBlogPost(post)
  ? `/blog/${post.slug}`
  : post.links[0]?.url ?? '/blog/archive'
