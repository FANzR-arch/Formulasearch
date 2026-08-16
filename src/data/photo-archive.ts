import { z } from 'astro/zod'
import photoArchive from '../../content/site/photo-archive.json'
import { localAssetPathSchema } from '../lib/validation'
import { archiveItemBaseSchema, archivePageBaseSchema, validateArchiveRelations } from './archive-schema'
import { localizedCopySchema } from '../lib/i18n'

const photoArchiveItemSchema = archiveItemBaseSchema.extend({
  assetHash: z.string().regex(/^[a-f0-9]{64}$/i),
  height: z.number().int().positive(),
  image: localAssetPathSchema,
  previewImage: localAssetPathSchema.optional(),
  previewWidth: z.number().int().positive().optional(),
  title: localizedCopySchema.optional(),
  caption: localizedCopySchema.optional(),
  date: localizedCopySchema.optional(),
  location: localizedCopySchema.optional(),
  width: z.number().int().positive(),
}).strict().superRefine((item, context) => {
  if (/^(?:Phil 的精选摄影作品|待补充摄影描述) \d+$/.test(item.alt.zh) || /^(?:Selected photograph \d+|Photography record \d+ awaiting description)$/i.test(item.alt.en)) {
    context.addIssue({ code: 'custom', path: ['alt'], message: 'Photo archive alt text must describe the image, not only its index or review status.' })
  }
  if ((item.previewImage == null) !== (item.previewWidth == null)) {
    context.addIssue({ code: 'custom', path: ['previewImage'], message: 'Photo preview image and width must be provided together.' })
  }
})

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
const itemAssetHashes = selectedPhotoArchive.map((item) => item.assetHash.toLowerCase())
const filterIds = photoArchivePage.filters.map((filter) => filter.id)
const itemTags = selectedPhotoArchive.flatMap((item) => item.tags)
validateArchiveRelations({ itemIndexes, itemTags, filterIds, imageIds: itemImages, name: 'Photo archive' })
if (new Set(itemAssetHashes).size !== itemAssetHashes.length) {
  throw new Error('Photo archive validation failed: assetHash values must be unique so metadata can follow each image safely.')
}
