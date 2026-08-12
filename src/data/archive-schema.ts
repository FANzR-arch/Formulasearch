import { z } from 'astro/zod'
import { localizedCopySchema } from '../lib/i18n'

export const archiveLayoutSchema = z.enum(['hero', 'portrait', 'landscape', 'square', 'wide'])

export const archiveFilterSchema = localizedCopySchema.extend({
  id: z.string().trim().min(1),
}).strict()

export const archivePageBaseSchema = z.object({
  pageTitle: localizedCopySchema,
  pageDescription: localizedCopySchema,
  kicker: localizedCopySchema,
  title: localizedCopySchema,
  description: localizedCopySchema,
  autoLoadBatchSize: z.number().int().positive(),
  eagerImageCount: z.number().int().positive(),
  filters: z.array(archiveFilterSchema).min(1),
}).strict()

export const archiveItemBaseSchema = z.object({
  alt: localizedCopySchema,
  index: z.string().regex(/^\d+$/),
  layout: archiveLayoutSchema,
  tags: z.array(z.string().min(1)).min(1),
}).strict()

interface ArchiveRelationInput {
  itemIndexes: string[]
  itemTags: string[]
  filterIds: string[]
  imageIds?: string[]
  name: string
}

export const validateArchiveRelations = ({ itemIndexes, itemTags, filterIds, imageIds, name }: ArchiveRelationInput) => {
  if (new Set(itemIndexes).size !== itemIndexes.length) throw new Error(`${name} validation failed: duplicate item indexes.`)
  if (imageIds && new Set(imageIds).size !== imageIds.length) throw new Error(`${name} validation failed: duplicate image ids.`)
  if (new Set(filterIds).size !== filterIds.length) throw new Error(`${name} validation failed: duplicate filter ids.`)
  if (filterIds[0] !== 'all') throw new Error(`${name} validation failed: the first filter must be all.`)
  const tagSet = new Set(itemTags)
  const unknownFilters = filterIds.filter((filter) => filter !== 'all' && !tagSet.has(filter))
  if (unknownFilters.length) throw new Error(`${name} validation failed: filters have no matching tags: ${unknownFilters.join(', ')}.`)
}
