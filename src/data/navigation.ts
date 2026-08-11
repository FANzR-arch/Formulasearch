import { z } from 'astro/zod'
import navigationContent from '../../content/site/navigation.json'
import { localizedCopySchema } from '../lib/i18n'
import { blogSeries } from './blog-series'
import { labSections, projectSections, skillSections } from './catalog'

const navigationItemSchema = z.object({
  href: z.string().startsWith('/'),
  label: localizedCopySchema,
  note: localizedCopySchema,
}).strict()

const primaryNavigationItemSchema = z.object({
  id: z.enum(['blog', 'projects', 'skills', 'lab']),
  href: z.string().startsWith('/'),
  label: localizedCopySchema,
  menu: z.array(navigationItemSchema).min(1),
}).strict()

const navigationSchema = z.array(primaryNavigationItemSchema).length(4)
const result = navigationSchema.safeParse(navigationContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Navigation content validation failed: ${issues}`)
}

export type PrimarySection = z.infer<typeof primaryNavigationItemSchema>['id']
export type NavigationItem = z.infer<typeof navigationItemSchema>
export type PrimaryNavigationItem = z.infer<typeof primaryNavigationItemSchema>

export const primaryNavigation = result.data

const sectionIds = primaryNavigation.map((section) => section.id)
if (new Set(sectionIds).size !== sectionIds.length) throw new Error('Navigation content validation failed: duplicate primary ids.')
for (const section of primaryNavigation) {
  if (section.href !== `/${section.id}`) throw new Error(`Navigation content validation failed: ${section.id} href must match its id.`)
}

const expectedMenuHrefs: Record<PrimarySection, Set<string>> = {
  blog: new Set(blogSeries.map((series) => `/blog/series#${series.id}`)),
  projects: new Set(projectSections.map((section) => `/projects#${section.id}`)),
  skills: new Set(skillSections.map((section) => `/skills#${section.id}`)),
  lab: new Set(labSections.map((section) => `/lab#${section.id}`)),
}

for (const section of primaryNavigation) {
  const expected = expectedMenuHrefs[section.id]
  for (const item of section.menu) {
    if (!expected.has(item.href)) {
      throw new Error(`Navigation content validation failed: ${section.id} menu href must match a known section: ${item.href}.`)
    }
  }
  if (section.menu.length !== expected.size) {
    throw new Error(`Navigation content validation failed: ${section.id} menu count does not match its content sections.`)
  }
}
