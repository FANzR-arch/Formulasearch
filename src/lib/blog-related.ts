import type { CollectionEntry } from 'astro:content'
import { blogSeries } from '../data/blog-series'

type BlogEntry = CollectionEntry<'blog'>

const seriesByCategory = new Map(
  blogSeries.flatMap((series) => series.categoryIds.map((categoryId) => [categoryId, series.id] as const)),
)

const getSeriesIds = (post: BlogEntry) => new Set([
  ...(post.data.series ? [post.data.series] : []),
  ...(seriesByCategory.has(post.data.category) ? [seriesByCategory.get(post.data.category)!] : []),
])

const scoreRelatedPost = (post: BlogEntry, candidate: BlogEntry) => {
  let score = 0
  if (post.data.category === candidate.data.category) score += 5
  const postSeries = getSeriesIds(post)
  if ([...getSeriesIds(candidate)].some((series) => postSeries.has(series))) score += 8

  const tags = new Set(post.data.tags)
  score += candidate.data.tags.reduce((total, tag) => total + (tags.has(tag) ? 2 : 0), 0)
  return score
}

export const getRelatedPosts = (post: BlogEntry, posts: BlogEntry[], limit = 3) => posts
  .filter((candidate) => candidate.id !== post.id && candidate.data.contentStatus === 'full' && !candidate.data.draft)
  .map((candidate) => ({ candidate, score: scoreRelatedPost(post, candidate) }))
  .sort((left, right) => right.score - left.score || right.candidate.data.pubDate.valueOf() - left.candidate.data.pubDate.valueOf())
  .slice(0, limit)
  .map(({ candidate }) => candidate)
