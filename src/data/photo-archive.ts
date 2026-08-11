import { z } from 'astro/zod'
import photoArchive from '../../content/site/photo-archive.json'

const localizedTextSchema = z.object({
  en: z.string().min(1),
  zh: z.string().min(1),
})

const photoArchiveItemSchema = z.object({
  alt: z.string().min(1),
  caption: localizedTextSchema,
  height: z.number().int().positive(),
  image: z.string().min(1).refine((value) => value.startsWith('/'), {
    message: 'Photo paths must be public absolute paths.',
  }),
  index: z.string().regex(/^\d+$/),
  label: localizedTextSchema,
  layout: z.enum(['hero', 'portrait', 'landscape', 'square', 'wide']),
  tags: z.array(z.string().min(1)).min(1),
  width: z.number().int().positive(),
})

const photoArchiveSchema = z.array(photoArchiveItemSchema).min(1)

const photoArchivePageSchema = z.object({
  pageTitle: localizedTextSchema,
  pageDescription: localizedTextSchema,
  kicker: localizedTextSchema,
  title: localizedTextSchema,
  description: localizedTextSchema,
  filters: z.array(z.object({ id: z.string().min(1), zh: z.string().min(1), en: z.string().min(1) })).min(1),
})

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
if (new Set(itemIndexes).size !== itemIndexes.length) throw new Error('Photo archive validation failed: duplicate item indexes.')
if (new Set(itemImages).size !== itemImages.length) throw new Error('Photo archive validation failed: duplicate image paths.')
if (new Set(filterIds).size !== filterIds.length) throw new Error('Photo archive validation failed: duplicate filter ids.')
