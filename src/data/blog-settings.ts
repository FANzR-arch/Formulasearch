import { z } from 'astro/zod'
import blogSettingsContent from '../../content/site/blog-settings.json'

const blogSettingsSchema = z.object({
  featuredCount: z.number().int().positive(),
  recentCount: z.number().int().positive(),
  relatedCount: z.number().int().positive(),
  readingUnitsPerMinute: z.number().int().positive(),
}).strict()

const result = blogSettingsSchema.safeParse(blogSettingsContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Blog settings validation failed: ${issues}`)
}

export const blogSettings = result.data
