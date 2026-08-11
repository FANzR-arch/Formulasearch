import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { staticSiteRoutes } from '../data/site-routes'
import { siteConfig } from '../data/site-config'
type SitemapEntry = { path: string; lastmod?: string }

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => data.contentStatus === 'full' && !data.draft)
  const entries: SitemapEntry[] = [
    ...staticSiteRoutes.map((path) => ({ path })),
    ...posts.map((post) => ({
      path: `/blog/${post.data.slug}`,
      lastmod: (post.data.updatedDate ?? post.data.pubDate).toISOString().slice(0, 10),
    })),
  ]
  const urls = entries
    .map(({ path, lastmod }) => `<url><loc>${siteConfig.siteUrl}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
