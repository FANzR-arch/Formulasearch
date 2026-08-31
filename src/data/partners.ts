import { z } from 'astro/zod'
import partnersContent from '../../content/site/partners.json'
import { localizedCopySchema } from '../lib/i18n'

const partnerItemSchema = z.object({
  name: localizedCopySchema,
  url: z.url(),
}).strict()

const partnersSchema = z.object({
  title: localizedCopySchema,
  description: localizedCopySchema,
  kicker: localizedCopySchema,
  heading: localizedCopySchema,
  intro: localizedCopySchema,
  listLabel: localizedCopySchema,
  items: z.array(partnerItemSchema).min(1),
}).strict()

const result = partnersSchema.safeParse(partnersContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Partners content validation failed: ${issues}`)
}

const urls = result.data.items.map((item) => item.url)
if (new Set(urls).size !== urls.length) throw new Error('Partners content validation failed: duplicate URLs.')

export const partnersPage = result.data
export type PartnerItem = z.infer<typeof partnerItemSchema>
