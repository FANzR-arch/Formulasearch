import { z } from 'astro/zod'
import siteContent from '../../content/site/site.json'

const siteConfigSchema = z.object({
  author: z.object({
    name: z.string().min(1),
    url: z.url(),
    alternateNames: z.array(z.string().min(1)).min(1),
    jobTitle: z.string().min(1),
    knowsAbout: z.array(z.string().min(1)).min(1),
  }),
  githubUrl: z.url(),
  name: z.string().min(1),
  siteUrl: z.url(),
})

const result = siteConfigSchema.safeParse(siteContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Site config validation failed: ${issues}`)
}

export const siteConfig = result.data
