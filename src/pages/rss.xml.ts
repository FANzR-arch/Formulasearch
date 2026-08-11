import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

const siteUrl = 'https://formulasearch.com'

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
    const url = `${siteUrl}/blog/${post.data.slug}`
    const published = (post.data.updatedDate ?? post.data.pubDate).toUTCString()
    return `<item><title>${escapeXml(post.data.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escapeXml(post.data.description)}</description><pubDate>${published}</pubDate></item>`
  }).join('')

  const latestDate = posts[0]?.data.updatedDate ?? posts[0]?.data.pubDate ?? new Date()
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Phil / Formula</title><link>${siteUrl}/blog</link><description>Phil 关于 AI、设计、工具与实践的文章。</description><language>zh-Hans</language><lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>${items}</channel></rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
