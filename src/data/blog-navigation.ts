import { z } from 'astro/zod'
import blogNavigationContent from '../../content/site/blog-navigation.json'
import { localizedCopySchema } from '../lib/i18n'

const blogSectionIdSchema = z.enum(['latest', 'series', 'archive'])
const blogNavigationItemSchema = z.object({
  id: blogSectionIdSchema,
  href: z.string().startsWith('/'),
  label: localizedCopySchema,
})

const blogNavigationSchema = z.object({
  ariaLabel: localizedCopySchema,
  items: z.array(blogNavigationItemSchema).length(3),
})

const result = blogNavigationSchema.safeParse(blogNavigationContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Blog navigation content validation failed: ${issues}`)
}

const expectedRoutes = {
  latest: '/blog',
  series: '/blog/series',
  archive: '/blog/archive',
} as const

const ids = result.data.items.map((item) => item.id)
if (new Set(ids).size !== ids.length) throw new Error('Blog navigation content validation failed: duplicate ids.')
for (const item of result.data.items) {
  if (item.href !== expectedRoutes[item.id]) {
    throw new Error(`Blog navigation content validation failed: ${item.id} href must be ${expectedRoutes[item.id]}.`)
  }
}

export type BlogSectionId = z.infer<typeof blogSectionIdSchema>
export const blogSectionNavigation = result.data
