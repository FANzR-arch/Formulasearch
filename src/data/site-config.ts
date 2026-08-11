import { z } from 'astro/zod'
import siteContent from '../../content/site/site.json'
import { httpUrlSchema } from '../lib/validation'

const siteConfigSchema = z.object({
  author: z.object({
    name: z.string().min(1),
    url: httpUrlSchema,
    alternateNames: z.array(z.string().min(1)).min(1),
    jobTitle: z.string().min(1),
    knowsAbout: z.array(z.string().min(1)).min(1),
  }).strict(),
  githubUrl: httpUrlSchema,
  name: z.string().min(1),
  siteUrl: httpUrlSchema,
  themeColors: z.object({
    light: z.string().regex(/^#[0-9a-f]{6}$/i),
    dark: z.string().regex(/^#[0-9a-f]{6}$/i),
  }).strict(),
}).strict()

const result = siteConfigSchema.safeParse(siteContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Site config validation failed: ${issues}`)
}

export const siteConfig = result.data
