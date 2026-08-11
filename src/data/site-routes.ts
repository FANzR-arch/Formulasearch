/** Canonical public routes shared by layouts, components and content checks. */
export const siteRoutes = {
  home: '/',
  blog: '/blog',
  blogSeries: '/blog/series',
  blogArchive: '/blog/archive',
  projects: '/projects',
  skills: '/skills',
  lab: '/lab',
  photos: '/photos',
  architecture: '/architecture',
  rss: '/rss.xml',
  sitemap: '/sitemap.xml',
  llms: '/llms.txt',
} as const

/** Public routes that are rendered without a dynamic content entry. */
export const staticSiteRoutes = [
  siteRoutes.home,
  siteRoutes.blog,
  siteRoutes.blogSeries,
  siteRoutes.blogArchive,
  siteRoutes.projects,
  siteRoutes.skills,
  siteRoutes.lab,
  siteRoutes.photos,
  siteRoutes.architecture,
] as const
