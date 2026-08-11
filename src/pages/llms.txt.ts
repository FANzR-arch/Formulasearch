import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { architecturePage } from '../data/architecture'
import { catalogPages } from '../data/catalog'
import { pageMeta } from '../data/page-meta'
import { photoArchivePage } from '../data/photo-archive'
import { siteConfig } from '../data/site-config'
import { staticSiteRoutes } from '../data/site-routes'

const cleanLine = (value: string) => value.replace(/\s+/g, ' ').trim()

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog', ({ data }) => data.contentStatus === 'full' && !data.draft))
    .sort((left, right) => right.data.pubDate.valueOf() - left.data.pubDate.valueOf())

  const descriptions: Record<string, string> = {
    '/': pageMeta.home.description.en,
    '/projects': catalogPages.projects.description.en,
    '/skills': catalogPages.skills.description.en,
    '/lab': catalogPages.lab.description.en,
    '/photos': photoArchivePage.pageDescription.en,
    '/architecture': architecturePage.pageDescription.en,
    '/blog': pageMeta.blog.description.en,
    '/blog/series': pageMeta.blogSeries.description.en,
    '/blog/archive': pageMeta.blogArchive.description.en,
  }

  const pageLines = staticSiteRoutes.map((route) => `- ${route} — ${cleanLine(descriptions[route] ?? 'Public site page.')}`)
  const articleLines = posts.map((post) => {
    const title = post.data.titleEn ?? post.data.title
    const description = post.data.descriptionEn ?? post.data.description
    return `- /blog/${post.data.slug} — ${cleanLine(title)}. ${cleanLine(description)}`
  })

  const lines = [
    `# ${siteConfig.name}`,
    '',
    `${siteConfig.author.name} is an ${siteConfig.author.jobTitle.toLowerCase()} working across ${siteConfig.author.knowsAbout.join(', ')}.`,
    '',
    '## Main pages',
    ...pageLines,
    '',
    '## Published articles',
    ...articleLines,
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
