import { getCollection, type CollectionEntry } from 'astro:content'
import { getBlogCategory, type BlogCategory } from '../data/blog-categories'

export interface BlogLink {
  label: 'wechat' | 'x' | 'original'
  url: string
}

export interface BlogPost {
  category: BlogCategory
  categoryId: string
  coverAlt: string
  coverAltEn?: string
  contentStatus: 'index-only' | 'full'
  cover: string
  date: string
  draft: boolean
  links: BlogLink[]
  slug: string
  summary: string
  title: string
}

const toBlogPost = (entry: CollectionEntry<'blog'>): BlogPost => {
  const category = getBlogCategory(entry.data.category)

  return {
    category,
    categoryId: entry.data.category,
    coverAlt: entry.data.coverAlt,
    coverAltEn: entry.data.coverAltEn,
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

export const formatBlogDate = (date: string) => date.replaceAll('-', '.')
export const isLocalBlogPost = (post: BlogPost) => post.contentStatus === 'full'
export const getPrimaryBlogLink = (post: BlogPost) => isLocalBlogPost(post)
  ? `/blog/${post.slug}`
  : post.links[0]?.url ?? '/blog/archive'
