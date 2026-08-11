import type { ImageMetadata } from 'astro'
import { z } from 'astro/zod'
import waterStudy from '../assets/archive/studies/water-3840x2160-glass-colorful-4k-25120.jpeg'
import violetStudy from '../assets/archive/studies/iphone-15-pro-3840x2160-splash-25150.jpeg'
import whiteStudy from '../assets/archive/studies/iphone-15-3840x2160-white-4k-25043.jpeg'
import architectureContent from '../../content/site/architecture.json'
import { archiveItemBaseSchema, archivePageBaseSchema, validateArchiveRelations } from './archive-schema'

const architectureItemSchema = archiveItemBaseSchema.extend({
  image: z.enum(['white-study', 'violet-study', 'water-study']),
}).strict()

const architectureSchema = archivePageBaseSchema.extend({
  initialVisibleCount: z.union([z.literal('all'), z.number().int().positive()]),
  items: z.array(architectureItemSchema).min(1),
}).strict()

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
const itemTags = result.data.items.flatMap((item) => item.tags)
validateArchiveRelations({ itemIndexes, itemTags, filterIds, imageIds, name: 'Architecture' })
