import { z } from 'astro/zod'
import blogMedia from '../../content/site/blog-media.json'

const blogMediaItemSchema = z.object({
  bytes: z.number().int().positive(),
  height: z.number().int().positive(),
  optimized: z.array(z.object({
    src: z.string().regex(/^\/uploads\/blog-optimized\//),
    width: z.number().int().positive(),
  }).strict()).min(1),
  width: z.number().int().positive(),
}).strict()

const blogMediaSchema = z.record(z.string().regex(/^\/uploads\/blog\//), blogMediaItemSchema)
const result = blogMediaSchema.safeParse(blogMedia)

if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Blog media validation failed: ${issues}`)
}

export type BlogMedia = z.infer<typeof blogMediaItemSchema>
export const blogMediaManifest = result.data

export const getBlogMedia = (src: string): BlogMedia => {
  const media = blogMediaManifest[src]
  if (!media) throw new Error(`Blog media dimensions are missing for ${src}`)
  return media
}
