import { z } from 'astro/zod'
import uiCopyContent from '../../content/site/ui-copy.json'
import { localizedCopySchema, validateLocalizedCopyTemplates } from '../lib/i18n'

const uiCopySchema = z.object({
  common: z.object({
    returnHome: localizedCopySchema,
  }),
  navigation: z.object({
    primary: localizedCopySchema,
    site: localizedCopySchema,
    backgroundEffect: localizedCopySchema,
    backgroundCycle: localizedCopySchema,
    backgroundVariants: z.object({
      dither: localizedCopySchema,
      molten: localizedCopySchema,
      contour: localizedCopySchema,
    }),
    openNavigation: localizedCopySchema,
    closeNavigation: localizedCopySchema,
    skipToContent: localizedCopySchema,
    photos: localizedCopySchema,
    architecture: localizedCopySchema,
    openSection: localizedCopySchema,
    closeSection: localizedCopySchema,
    sectionMenu: localizedCopySchema,
    githubProfile: localizedCopySchema,
    switchToEnglish: localizedCopySchema,
    switchToChinese: localizedCopySchema,
    themeToDark: localizedCopySchema,
    themeToLight: localizedCopySchema,
  }),
  blog: z.object({
    blog: localizedCopySchema,
    heroEyebrow: localizedCopySchema,
    heroIntro: localizedCopySchema,
    featuredIndex: localizedCopySchema,
    featuredArticles: localizedCopySchema,
    recentArticles: localizedCopySchema,
    archiveHeading: localizedCopySchema,
    seriesHeading: localizedCopySchema,
    recentCountSuffix: localizedCopySchema,
    archiveCountSuffix: localizedCopySchema,
    featuredArticleCoverAlt: localizedCopySchema,
    articleCoverAlt: localizedCopySchema,
    readingTime: localizedCopySchema,
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
    results: localizedCopySchema,
    note: localizedCopySchema,
    backToTop: localizedCopySchema,
  }),
  platforms: z.object({
    wechat: localizedCopySchema,
    x: localizedCopySchema,
    original: localizedCopySchema,
  }),
}).strict()

const result = uiCopySchema.safeParse(uiCopyContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`UI copy content validation failed: ${issues}`)
}

validateLocalizedCopyTemplates(result.data)
export const uiCopy = result.data
