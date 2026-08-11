import { z } from 'astro/zod'
import homeEn from '../../content/site/home.en.json'
import homeZh from '../../content/site/home.json'
import { httpUrlSchema, localAssetPathSchema } from './validation'

const workItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
}).strict()

const homeContentSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  contactLabel: z.string().min(1),
  contactEmailPrefix: z.string().min(1),
  social: z.object({
    label: z.string().min(1),
    url: httpUrlSchema,
  }).strict(),
  heroImage: z.union([z.literal(''), localAssetPathSchema]),
  heroImageAlt: z.string().default(''),
  intro: z.array(z.string().min(1)).min(1),
  about: z.array(z.string().min(1)).min(1),
  interest: z.array(z.string().min(1)).min(1),
  sponsor: z.string().min(1),
  identity: z.array(z.string().min(1)).default([]),
  now: z.array(z.object({
    number: z.string().min(1),
    text: z.string().min(1),
  }).strict()).default([]),
  work: z.array(workItemSchema).default([]),
  writing: z.string().default(''),
  resources: z.string().default(''),
}).strict().superRefine((data, context) => {
  if (data.heroImage && !data.heroImageAlt) {
    context.addIssue({ code: 'custom', path: ['heroImageAlt'], message: 'heroImageAlt is required when heroImage is set.' })
  }
  if (!data.heroImage && data.heroImageAlt) {
    context.addIssue({ code: 'custom', path: ['heroImageAlt'], message: 'heroImageAlt must be empty when heroImage is empty.' })
  }
})

export type HomeContent = z.infer<typeof homeContentSchema>

function parseHomeContent(value: unknown, locale: 'zh' | 'en') {
  const result = homeContentSchema.safeParse(value)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('; ')
    throw new Error(`首页 ${locale} 内容校验失败：${issues}`)
  }
  return result.data
}

function validateLocalePairs(zh: HomeContent, en: HomeContent) {
  const pairedFields = ['intro', 'about', 'interest', 'identity', 'now', 'work'] as const
  for (const field of pairedFields) {
    if (zh[field].length !== en[field].length) {
      throw new Error(`首页中英文 ${field} 段落数量不一致：中文 ${zh[field].length}，英文 ${en[field].length}`)
    }
  }

  const sharedFields = [
    ['name', zh.name, en.name],
    ['email', zh.email, en.email],
    ['social.label', zh.social.label, en.social.label],
    ['social.url', zh.social.url, en.social.url],
    ['heroImage', zh.heroImage, en.heroImage],
  ] as const
  for (const [field, zhValue, enValue] of sharedFields) {
    if (zhValue !== enValue) {
      throw new Error(`Homepage shared field must match between locales: ${field}`)
    }
  }
}

const zh = parseHomeContent(homeZh, 'zh')
const en = parseHomeContent(homeEn, 'en')
validateLocalePairs(zh, en)

export const homeContent = { en, zh }
