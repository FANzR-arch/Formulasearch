import { z } from 'astro/zod'
import photoArchive from '../../content/site/photo-archive.json'
import { localAssetPathSchema } from '../lib/validation'
import { archiveItemBaseSchema, archivePageBaseSchema, validateArchiveRelations } from './archive-schema'

const photoArchiveItemSchema = archiveItemBaseSchema.extend({
  height: z.number().int().positive(),
  image: localAssetPathSchema,
  width: z.number().int().positive(),
}).strict()

const photoArchiveSchema = z.array(photoArchiveItemSchema).min(1)

const photoArchivePageSchema = archivePageBaseSchema.extend({
  initialVisibleCount: z.number().int().positive(),
}).strict()

const manifestSchema = photoArchivePageSchema.extend({
  items: photoArchiveSchema,
})

const result = manifestSchema.safeParse(photoArchive)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Photo archive validation failed: ${issues}`)
}

export type PhotoArchiveItem = z.infer<typeof photoArchiveItemSchema>
export const photoArchivePage = result.data
export const selectedPhotoArchive = result.data.items

const itemIndexes = selectedPhotoArchive.map((item) => item.index)
const itemImages = selectedPhotoArchive.map((item) => item.image)
const filterIds = photoArchivePage.filters.map((filter) => filter.id)
const itemTags = selectedPhotoArchive.flatMap((item) => item.tags)
validateArchiveRelations({ itemIndexes, itemTags, filterIds, imageIds: itemImages, name: 'Photo archive' })
