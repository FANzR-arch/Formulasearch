import type { ImageMetadata } from 'astro'
import { z } from 'astro/zod'
import waterStudy from '../assets/archive/studies/water-3840x2160-glass-colorful-4k-25120.jpeg'
import violetStudy from '../assets/archive/studies/iphone-15-pro-3840x2160-splash-25150.jpeg'
import whiteStudy from '../assets/archive/studies/iphone-15-3840x2160-white-4k-25043.jpeg'
import architectureContent from '../../content/site/architecture.json'

const localizedCopySchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1),
})

const architectureItemSchema = z.object({
  image: z.enum(['white-study', 'violet-study', 'water-study']),
  alt: z.string().min(1),
  index: z.string().regex(/^\d+$/),
  layout: z.enum(['hero', 'portrait', 'landscape', 'square', 'wide']),
  tags: z.array(z.string().min(1)).min(1),
  label: localizedCopySchema,
  caption: localizedCopySchema,
})

const architectureSchema = z.object({
  pageTitle: localizedCopySchema,
  pageDescription: localizedCopySchema,
  kicker: localizedCopySchema,
  title: localizedCopySchema,
  description: localizedCopySchema,
  filters: z.array(z.object({ id: z.string().min(1), zh: z.string().min(1), en: z.string().min(1) })).min(1),
  items: z.array(architectureItemSchema).min(1),
})

const result = architectureSchema.safeParse(architectureContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Architecture content validation failed: ${issues}`)
}

const imageMap: Record<string, ImageMetadata> = {
  'white-study': whiteStudy,
  'violet-study': violetStudy,
  'water-study': waterStudy,
}

export const architecturePage = result.data
export const architectureItems = result.data.items.map((item) => ({
  ...item,
  image: imageMap[item.image],
}))

const itemIndexes = architectureItems.map((item) => item.index)
const imageIds = result.data.items.map((item) => item.image)
const filterIds = result.data.filters.map((filter) => filter.id)
if (new Set(itemIndexes).size !== itemIndexes.length) throw new Error('Architecture content validation failed: duplicate item indexes.')
if (new Set(imageIds).size !== imageIds.length) throw new Error('Architecture content validation failed: duplicate image ids.')
if (new Set(filterIds).size !== filterIds.length) throw new Error('Architecture content validation failed: duplicate filter ids.')
