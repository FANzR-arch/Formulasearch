import { z } from 'astro/zod'
import blogSeriesContent from '../../content/site/blog-series.json'
import categories from '../../content/blog/categories.json'

const localizedCopySchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1),
})

const blogSeriesSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: localizedCopySchema,
  description: localizedCopySchema,
  categoryIds: z.array(z.string().min(1)).min(1),
})).min(1)

const result = blogSeriesSchema.safeParse(blogSeriesContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Blog series content validation failed: ${issues}`)
}

const ids = result.data.map((series) => series.id)
if (new Set(ids).size !== ids.length) {
  throw new Error('Blog series content validation failed: duplicate series ids.')
}

const categoryIds = new Set(categories.map((category) => category.id))
const unknownCategory = result.data.flatMap((series) => series.categoryIds.filter((id) => !categoryIds.has(id)))
if (unknownCategory.length) {
  throw new Error(`Blog series content validation failed: unknown category ids: ${unknownCategory.join(', ')}`)
}

export const blogSeries = result.data
