import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { pageMeta } from '../data/page-meta'
import { siteConfig } from '../data/site-config'

const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog', ({ data }) => data.contentStatus === 'full' && !data.draft))
    .sort((left, right) => right.data.pubDate.valueOf() - left.data.pubDate.valueOf())

  const items = posts.map((post) => {
    const url = `${siteConfig.siteUrl}/blog/${post.data.slug}`
    const published = post.data.pubDate.toUTCString()
    const category = `<category>${escapeXml(post.data.category)}</category>`
    return `<item><title>${escapeXml(post.data.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escapeXml(post.data.description)}</description>${category}<pubDate>${published}</pubDate></item>`
  }).join('')

  const latestDate = posts.reduce((latest, post) => {
    const candidate = post.data.updatedDate ?? post.data.pubDate
    return candidate > latest ? candidate : latest
  }, posts[0]?.data.pubDate ?? new Date())
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${siteConfig.name}</title><link>${siteConfig.siteUrl}/blog</link><description>${escapeXml(pageMeta.blog.description.zh)}</description><language>zh-Hans</language><lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>${items}</channel></rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
