import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { getBlogPostRoute, getLocalizedRoute, localizedSiteRoutes, staticSiteRoutes } from '../data/site-routes'
import { siteConfig } from '../data/site-config'
import { escapeXml } from '../lib/xml'
type SitemapEntry = { path: string; lastmod?: string }

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => data.contentStatus === 'full' && !data.draft)
  const entries: SitemapEntry[] = [
    ...staticSiteRoutes.map((path) => ({ path })),
    ...localizedSiteRoutes.map((path) => ({ path: getLocalizedRoute(path, 'en') })),
    ...posts.map((post) => ({
      path: getBlogPostRoute(post.data.slug, post.data.contentLanguage),
      lastmod: (post.data.updatedDate ?? post.data.pubDate).toISOString().slice(0, 10),
    })),
  ]
  const urls = entries
    .map(({ path, lastmod }) => `<url><loc>${escapeXml(`${siteConfig.siteUrl}${path}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
