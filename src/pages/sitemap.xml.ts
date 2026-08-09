import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

const pages = ['/', '/blog', '/blog/series', '/blog/archive']

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10)
  const posts = await getCollection('blog', ({ data }) => data.contentStatus === 'full' && !data.draft)
  const entries = [
    ...pages.map((path) => ({ path, lastmod: today })),
    ...posts.map((post) => ({ path: `/blog/${post.data.slug}`, lastmod: post.data.pubDate.toISOString().slice(0, 10) })),
  ]
  const urls = entries
    .map(({ path, lastmod }) => `<url><loc>https://formulasearch.com${path}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
