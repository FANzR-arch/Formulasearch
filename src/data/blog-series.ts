import { z } from 'astro/zod'
import blogSeriesContent from '../../content/site/blog-series.json'
import { blogCategories } from './blog-categories'
import { localizedCopySchema } from '../lib/i18n'

const blogSeriesItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: localizedCopySchema,
  description: localizedCopySchema,
  categoryIds: z.array(z.string().min(1)).min(1),
}).strict()

const blogSeriesSchema = z.object({ items: z.array(blogSeriesItemSchema).min(1) }).strict()

const result = blogSeriesSchema.safeParse(blogSeriesContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Blog series content validation failed: ${issues}`)
}

const ids = result.data.items.map((series) => series.id)
if (new Set(ids).size !== ids.length) {
  throw new Error('Blog series content validation failed: duplicate series ids.')
}

const categoryIds = new Set(blogCategories.map((category) => category.id))
const unknownCategory = result.data.items.flatMap((series) => series.categoryIds.filter((id) => !categoryIds.has(id)))
if (unknownCategory.length) {
  throw new Error(`Blog series content validation failed: unknown category ids: ${unknownCategory.join(', ')}`)
}

export const blogSeries = result.data.items
