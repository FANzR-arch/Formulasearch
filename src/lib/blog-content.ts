import { getCollection, type CollectionEntry } from 'astro:content'
import { getBlogCategory, type BlogCategory } from '../data/blog-categories'
import { siteRoutes } from '../data/site-routes'

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
  featured: boolean
  links: BlogLink[]
  slug: string
  summary: string
  summaryEn?: string
  title: string
  titleEn?: string
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
    featured: entry.data.featured,
    links: entry.data.externalLinks,
    slug: entry.data.slug,
    summary: entry.data.description,
    summaryEn: entry.data.descriptionEn,
    title: entry.data.title,
    titleEn: entry.data.titleEn,
  }
}

export const getBlogPosts = async () => (await getCollection('blog', ({ data }) => !data.draft))
  .sort((left, right) => right.data.pubDate.valueOf() - left.data.pubDate.valueOf())
  .map(toBlogPost)

export const formatBlogDate = (date: string) => date.replaceAll('-', '.')
export const isLocalBlogPost = (post: BlogPost) => post.contentStatus === 'full'
export const getPrimaryBlogLink = (post: BlogPost) => isLocalBlogPost(post)
  ? `${siteRoutes.blog}/${post.slug}`
  : post.links[0]?.url ?? siteRoutes.blogArchive
