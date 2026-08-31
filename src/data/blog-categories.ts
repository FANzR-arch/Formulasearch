import { z } from 'astro/zod'
import categoriesContent from '../../content/blog/categories.json'

const blogCategorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  titleEn: z.string().min(1),
  description: z.string().min(1),
}).strict()

const result = z.object({ items: z.array(blogCategorySchema).min(1) }).strict().safeParse(categoriesContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Blog category content validation failed: ${issues}`)
}

const categoryIds = result.data.items.map((category) => category.id)
if (new Set(categoryIds).size !== categoryIds.length) {
  throw new Error('Blog category content validation failed: duplicate ids.')
}

export type BlogCategory = z.infer<typeof blogCategorySchema>
export const blogCategories = result.data.items

const categoryMap = new Map(blogCategories.map((category) => [category.id, category]))

export const getBlogCategory = (id: string) => {
  const category = categoryMap.get(id)
  if (!category) throw new Error(`Unknown blog category "${id}".`)
  return category
}
