import type { CollectionEntry } from 'astro:content'

type BlogEntry = CollectionEntry<'blog'>

const scoreRelatedPost = (post: BlogEntry, candidate: BlogEntry) => {
  let score = 0
  if (post.data.category === candidate.data.category) score += 5
  if (post.data.series && post.data.series === candidate.data.series) score += 8

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
