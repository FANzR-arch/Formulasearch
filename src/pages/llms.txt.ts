import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { architecturePage, architectureProjects } from '../data/architecture'
import { catalogPages } from '../data/catalog'
import { pageMeta } from '../data/page-meta'
import { partnersPage } from '../data/partners'
import { photoArchivePage } from '../data/photo-archive'
import { siteConfig } from '../data/site-config'
import { getBlogPostRoute, getLocalizedRoute, localizedSiteRoutes, siteRoutes, staticSiteRoutes } from '../data/site-routes'

const cleanLine = (value: string) => value.replace(/\s+/g, ' ').trim()

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog', ({ data }) => data.contentStatus === 'full' && !data.draft))
    .sort((left, right) => right.data.pubDate.valueOf() - left.data.pubDate.valueOf())

  const descriptions: Record<string, string> = {
    [siteRoutes.home]: pageMeta.home.description.en,
    [siteRoutes.projects]: catalogPages.projects.description.en,
    [siteRoutes.skills]: catalogPages.skills.description.en,
    [siteRoutes.lab]: catalogPages.lab.description.en,
    [siteRoutes.photos]: photoArchivePage.pageDescription.en,
    [siteRoutes.architecture]: architecturePage.pageDescription.en,
    [siteRoutes.partners]: partnersPage.description.en,
    [siteRoutes.blog]: pageMeta.blog.description.en,
    [siteRoutes.blogSeries]: pageMeta.blogSeries.description.en,
    [siteRoutes.blogArchive]: pageMeta.blogArchive.description.en,
  }

  const pageLines = staticSiteRoutes.map((route) => `- ${route} — ${cleanLine(descriptions[route] ?? 'Public site page.')}`)
  const englishPageLines = localizedSiteRoutes.map((route) => `- ${getLocalizedRoute(route, 'en')} — ${cleanLine(descriptions[route] ?? 'English public site page.')}`)
  const articleLines = posts.map((post) => {
    const title = post.data.titleEn ?? post.data.title
    const description = post.data.descriptionEn ?? post.data.description
    return `- ${getBlogPostRoute(post.data.slug, post.data.contentLanguage)} — ${cleanLine(title)}. ${cleanLine(description)}`
  })
  const architectureLines = architectureProjects.flatMap((project) => [`- /architecture/${project.slug} — ${cleanLine(project.title.en)}. ${cleanLine(project.summary.en)}`, `- /en/architecture/${project.slug} — ${cleanLine(project.title.en)}. ${cleanLine(project.summary.en)}`])

  const lines = [
    `# ${siteConfig.name}`,
    '',
    `${siteConfig.author.name} is an ${siteConfig.author.jobTitle.toLowerCase()} working across ${siteConfig.author.knowsAbout.join(', ')}.`,
    '',
    '## Main pages',
    ...pageLines,
    ...englishPageLines,
    '',
    '## Architecture projects',
    ...architectureLines,
    '',
    ...articleLines,
    '## Published articles',
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
