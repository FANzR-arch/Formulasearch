import { z } from 'astro/zod'
import routeContent from '../../content/site/site-routes.json'

const routeKeys = [
  'home',
  'blog',
  'blogSeries',
  'blogArchive',
  'projects',
  'skills',
  'lab',
  'photos',
  'architecture',
  'rss',
  'sitemap',
  'llms',
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
  static: z.array(z.enum(routeKeys)).min(1),
}).strict()

const result = routeContentSchema.safeParse(routeContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Site route content validation failed: ${issues}`)
}

const { static: staticRouteKeys, ...siteRoutes } = result.data
const staticRouteValues = staticRouteKeys.map((key) => siteRoutes[key])
if (new Set(staticRouteValues).size !== staticRouteValues.length) {
  throw new Error('Site route content validation failed: static routes must be unique.')
}

/** Canonical public routes shared by layouts, components and content checks. */
export { siteRoutes }

/** Public routes that are rendered without a dynamic content entry. */
export const staticSiteRoutes = staticRouteValues
