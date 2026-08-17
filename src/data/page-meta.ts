import { z } from 'astro/zod'
import pageMetaContent from '../../content/site/page-meta.json'
import { localizedCopySchema } from '../lib/i18n'

const pageMetaEntrySchema = z.object({
  title: localizedCopySchema,
  description: localizedCopySchema,
}).strict()

const pageMetaSchema = z.object({
  home: pageMetaEntrySchema,
  blog: pageMetaEntrySchema,
  blogArchive: pageMetaEntrySchema,
  blogSeries: pageMetaEntrySchema,
  soundPreview: pageMetaEntrySchema,
}).strict()

const result = pageMetaSchema.safeParse(pageMetaContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Page metadata validation failed: ${issues}`)
}

export type PageMeta = z.infer<typeof pageMetaEntrySchema>
export const pageMeta = result.data
