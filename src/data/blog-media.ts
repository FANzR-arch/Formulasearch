import { z } from 'astro/zod'
import blogMedia from '../../content/site/blog-media.json'

const avifVariantSchema = z.object({
  src: z.string().regex(/^\/uploads\/blog-optimized\/.+\.avif$/),
  width: z.number().int().positive(),
}).strict()

const webpVariantSchema = z.object({
  src: z.string().regex(/^\/uploads\/blog-optimized\/.+\.webp$/),
  width: z.number().int().positive(),
}).strict()

const blogMediaItemSchema = z.object({
  avif: z.array(avifVariantSchema).min(1),
  bytes: z.number().int().positive(),
  height: z.number().int().positive(),
  optimized: z.array(webpVariantSchema).min(1),
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

const validateVariantWidths = (label: string, variants: { width: number }[], src: string) => {
  const widths = variants.map((variant) => variant.width)
  if (new Set(widths).size !== widths.length) throw new Error(`Blog media validation failed: duplicate ${label} widths for ${src}`)
  if (widths.some((width, index) => index > 0 && width <= widths[index - 1])) {
    throw new Error(`Blog media validation failed: ${label} widths must be ascending for ${src}`)
  }
}

for (const [src, media] of Object.entries(blogMediaManifest)) {
  validateVariantWidths('AVIF', media.avif, src)
  validateVariantWidths('WebP', media.optimized, src)
}

export const getBlogMedia = (src: string): BlogMedia => {
  const media = blogMediaManifest[src]
  if (!media) throw new Error(`Blog media dimensions are missing for ${src}`)
  return media
}
