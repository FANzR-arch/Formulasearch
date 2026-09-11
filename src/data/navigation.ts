import { z } from 'astro/zod'
import navigationContent from '../../content/site/navigation.json'
import { localizedCopySchema } from '../lib/i18n'
import { blogSectionNavigation } from './blog-navigation'
import { labSections, projectSections, skillSections } from './catalog'
import { siteRoutes } from './site-routes'

const navigationItemSchema = z.object({
  href: z.string().startsWith('/'),
  label: localizedCopySchema,
  note: localizedCopySchema,
}).strict()

const primaryNavigationItemSchema = z.object({
  id: z.enum(['blog', 'projects', 'skills', 'lab']),
  href: z.string().startsWith('/'),
  label: localizedCopySchema,
  menu: z.array(navigationItemSchema),
}).strict()

const navigationSchema = z.object({ items: z.array(primaryNavigationItemSchema).length(4) }).strict()
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

export const primaryNavigation = result.data.items

const sectionIds = primaryNavigation.map((section) => section.id)
if (new Set(sectionIds).size !== sectionIds.length) throw new Error('Navigation content validation failed: duplicate primary ids.')
for (const section of primaryNavigation) {
  if (section.href !== siteRoutes[section.id]) throw new Error(`Navigation content validation failed: ${section.id} href must match its canonical route.`)
}

const expectedMenus: Record<PrimarySection, Pick<NavigationItem, 'href' | 'label'>[]> = {
  blog: blogSectionNavigation.items.filter((item) => item.id !== 'all'),
  projects: projectSections.map((section) => ({ href: `${siteRoutes.projects}#${section.id}`, label: section.title })),
  skills: skillSections.map((section) => ({ href: `${siteRoutes.skills}#${section.id}`, label: section.title })),
  lab: labSections.map((section) => ({ href: `${siteRoutes.lab}#${section.id}`, label: section.title })),
}

for (const section of primaryNavigation) {
  const expected = expectedMenus[section.id]
  if (section.menu.length !== expected.length) {
    throw new Error(`Navigation content validation failed: ${section.id} menu count does not match its content sections.`)
  }
  for (const [index, item] of section.menu.entries()) {
    const category = expected[index]
    if (item.href !== category.href || item.label.zh !== category.label.zh || item.label.en !== category.label.en) {
      throw new Error(`Navigation content validation failed: ${section.id} menu item ${index + 1} must match its page category label, order, and href (${category.href}).`)
    }
  }
}
