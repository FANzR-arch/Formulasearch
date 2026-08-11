import { z } from 'astro/zod'
import routeContent from '../../content/site/site-routes.json'

const staticRouteKeys = [
  'home',
  'blog',
  'blogSeries',
  'blogArchive',
  'projects',
  'skills',
  'lab',
  'photos',
  'architecture',
] as const

const routeContentSchema = z.object({
  home: z.string().startsWith('/'),
  blog: z.string().startsWith('/'),
  blogSeries: z.string().startsWith('/'),
  blogArchive: z.string().startsWith('/'),
  projects: z.string().startsWith('/'),
  skills: z.string().startsWith('/'),
  lab: z.string().startsWith('/'),
  photos: z.string().startsWith('/'),
  architecture: z.string().startsWith('/'),
  rss: z.string().startsWith('/'),
  sitemap: z.string().startsWith('/'),
  llms: z.string().startsWith('/'),
  static: z.array(z.enum(staticRouteKeys)).length(staticRouteKeys.length),
  localized: z.array(z.enum(staticRouteKeys)).min(1),
}).strict()

const result = routeContentSchema.safeParse(routeContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Site route content validation failed: ${issues}`)
}

const { static: staticRouteManifestKeys, localized: localizedRouteManifestKeys, ...siteRoutes } = result.data
const staticRouteValues = staticRouteManifestKeys.map((key) => siteRoutes[key])
if (new Set(staticRouteValues).size !== staticRouteValues.length) {
  throw new Error('Site route content validation failed: static routes must be unique.')
}
const localizedRouteValues = localizedRouteManifestKeys.map((key) => siteRoutes[key])
if (new Set(localizedRouteValues).size !== localizedRouteValues.length) {
  throw new Error('Site route content validation failed: localized routes must be unique.')
}

/** Canonical public routes shared by layouts, components and content checks. */
export { siteRoutes }

/** Routes that have a server-rendered English counterpart under /en. */
export const localizedRouteKeys = localizedRouteManifestKeys
export const localizedSiteRoutes = localizedRouteValues

export const getLocalizedRoute = (route: string, locale: 'zh' | 'en') => {
  if (locale !== 'en' || route === '/en' || route.startsWith('/en/')) return route
  const [, pathname, suffix = ''] = route.match(/^([^?#]+)([?#].*)?$/) ?? []
  if (!pathname || !localizedSiteRoutes.includes(pathname as (typeof localizedSiteRoutes)[number])) return route
  return `${pathname === '/' ? '/en' : `/en${pathname}`}${suffix}`
}

/** Public routes that are rendered without a dynamic content entry. */
export const staticSiteRoutes = staticRouteValues
