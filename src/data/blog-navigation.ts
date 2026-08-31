import { z } from 'astro/zod'
import blogNavigationContent from '../../content/site/blog-navigation.json'
import { blogCategories } from './blog-categories'
import { localizedCopySchema } from '../lib/i18n'
import { siteRoutes } from './site-routes'

const blogSectionIdSchema = z.enum(['all', 'aesthetics', 'ai-tools', 'personal-thinking'])
const blogNavigationItemSchema = z.object({
  id: blogSectionIdSchema,
  href: z.string().startsWith('/'),
  label: localizedCopySchema,
  categoryIds: z.array(z.string().min(1)),
}).strict()

const blogNavigationSchema = z.object({
  ariaLabel: localizedCopySchema,
  items: z.array(blogNavigationItemSchema).length(4),
}).strict()

const result = blogNavigationSchema.safeParse(blogNavigationContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Blog navigation content validation failed: ${issues}`)
}

const expectedRoutes = {
  all: siteRoutes.blog,
  aesthetics: `${siteRoutes.blog}/category/aesthetics`,
  'ai-tools': `${siteRoutes.blog}/category/ai-tools`,
  'personal-thinking': `${siteRoutes.blog}/category/personal-thinking`,
} as const

const ids = result.data.items.map((item) => item.id)
if (new Set(ids).size !== ids.length) throw new Error('Blog navigation content validation failed: duplicate ids.')
for (const item of result.data.items) {
  if (item.href !== expectedRoutes[item.id]) {
    throw new Error(`Blog navigation content validation failed: ${item.id} href must be ${expectedRoutes[item.id]}.`)
  }
}

const knownCategoryIds = new Set(blogCategories.map((category) => category.id))
for (const item of result.data.items) {
  const unknownCategoryIds = item.categoryIds.filter((categoryId) => !knownCategoryIds.has(categoryId))
  if (unknownCategoryIds.length) throw new Error(`Blog navigation content validation failed: ${item.id} includes unknown category ids: ${unknownCategoryIds.join(', ')}.`)
  if (item.id === 'all' && item.categoryIds.length) throw new Error('Blog navigation content validation failed: all must not include category ids.')
  if (item.id !== 'all' && !item.categoryIds.length) throw new Error(`Blog navigation content validation failed: ${item.id} must include category ids.`)
}

export type BlogSectionId = z.infer<typeof blogSectionIdSchema>
export const blogSectionNavigation = result.data
