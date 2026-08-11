import { z } from 'astro/zod'
import homeEn from '../../content/site/home.en.json'
import homeZh from '../../content/site/home.json'

const workItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
})

const homeContentSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  social: z.object({
    label: z.string().min(1),
    url: z.url(),
  }),
  heroImage: z.string(),
  heroImageAlt: z.string().default(''),
  intro: z.array(z.string().min(1)).min(1),
  about: z.array(z.string().min(1)).min(1),
  interest: z.array(z.string().min(1)).min(1),
  sponsor: z.string().min(1),
  identity: z.array(z.string().min(1)).default([]),
  now: z.array(z.object({
    number: z.string().min(1),
    text: z.string().min(1),
  })).default([]),
  work: z.array(workItemSchema).default([]),
  writing: z.string().default(''),
  resources: z.string().default(''),
}).superRefine((data, context) => {
  if (data.heroImage && !data.heroImageAlt) {
    context.addIssue({ code: 'custom', path: ['heroImageAlt'], message: 'heroImageAlt is required when heroImage is set.' })
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
  const pairedFields = ['intro', 'about', 'interest'] as const
  for (const field of pairedFields) {
    if (zh[field].length !== en[field].length) {
      throw new Error(`首页中英文 ${field} 段落数量不一致：中文 ${zh[field].length}，英文 ${en[field].length}`)
    }
  }
}

const zh = parseHomeContent(homeZh, 'zh')
const en = parseHomeContent(homeEn, 'en')
validateLocalePairs(zh, en)

export const homeContent = { en, zh }
