import { z } from 'astro/zod'
import uiCopyContent from '../../content/site/ui-copy.json'

const localizedCopySchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1),
})

const uiCopySchema = z.object({
  common: z.object({
    returnHome: localizedCopySchema,
  }),
  navigation: z.object({
    primary: localizedCopySchema,
    site: localizedCopySchema,
    backgroundEffect: localizedCopySchema,
    openNavigation: localizedCopySchema,
    skipToContent: localizedCopySchema,
    photos: localizedCopySchema,
    architecture: localizedCopySchema,
    switchToEnglish: localizedCopySchema,
    switchToChinese: localizedCopySchema,
    themeToDark: localizedCopySchema,
    themeToLight: localizedCopySchema,
  }),
  blog: z.object({
    blog: localizedCopySchema,
    articleLocation: localizedCopySchema,
    articleContents: localizedCopySchema,
    onThisPage: localizedCopySchema,
    copyLink: localizedCopySchema,
    copied: localizedCopySchema,
    copyArticleLink: localizedCopySchema,
    backToBlog: localizedCopySchema,
    allArticles: localizedCopySchema,
    originallyPublished: localizedCopySchema,
    originalPublication: localizedCopySchema,
    keepReading: localizedCopySchema,
    relatedArticles: localizedCopySchema,
  }),
  archive: z.object({
    sections: localizedCopySchema,
    filters: localizedCopySchema,
    browse: localizedCopySchema,
    photos: localizedCopySchema,
    architecture: localizedCopySchema,
    loadMore: localizedCopySchema,
    note: localizedCopySchema,
    backToTop: localizedCopySchema,
  }),
  platforms: z.object({
    wechat: localizedCopySchema,
    x: localizedCopySchema,
    original: localizedCopySchema,
  }),
})

const result = uiCopySchema.safeParse(uiCopyContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`UI copy content validation failed: ${issues}`)
}

export const uiCopy = result.data
