import { access, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const distRoot = join(projectRoot, '..', 'dist')
const publicRoot = join(projectRoot, '..', 'public')
const siteConfig = JSON.parse(await readFile(join(projectRoot, '..', 'content', 'site', 'site.json'), 'utf8'))
const siteOrigin = new URL(siteConfig.siteUrl).origin
const failures = []
const getAttribute = (attributes, name) => attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || ''
const stripTags = (value) => value.replace(/<[^>]+>/g, '').replace(/&(?:amp|lt|gt|quot|#39);/g, ' ').trim()
const checkAriaReferences = (html, references, relativePath, context) => {
  for (const id of references.split(/\s+/).filter(Boolean)) {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(`\\bid="${escapedId}"`).test(html)) failures.push(`${context} references missing id: ${relativePath} -> ${id}`)
  }
}
const checkUrlScheme = (value, relativePath, context, allowContact = false) => {
  const source = value.trim()
  if (!source || source.startsWith('#')) return
  if (source.startsWith('//')) {
    failures.push(`protocol-relative ${context} is not allowed: ${relativePath} -> ${value}`)
    return
  }
  const scheme = source.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  if (!scheme) return
  const allowed = allowContact ? new Set(['http', 'https', 'mailto', 'tel']) : new Set(['http', 'https'])
  if (!allowed.has(scheme)) failures.push(`unsafe ${context} scheme: ${relativePath} -> ${value}`)
}
const checkAssetUrl = (value, relativePath, context) => {
  checkUrlScheme(value, relativePath, context)
  if (siteOrigin.startsWith('https:') && /^http:/i.test(value.trim())) {
    failures.push(`insecure ${context} on HTTPS site: ${relativePath} -> ${value}`)
  }
}

async function readUtf8(relativePath) {
  return readFile(join(distRoot, relativePath), 'utf8')
}

const checkLocalAsset = async (source, relativePath) => {
  if (!source.startsWith('/') || source.startsWith('//')) return
  const sourcePath = source.split(/[?#]/, 1)[0]
  const assetRoot = sourcePath.startsWith('/_astro/') ? distRoot : publicRoot
  const relativeAsset = sourcePath.slice(1).replaceAll('/', sep)
  const target = resolve(assetRoot, relativeAsset)
  const root = resolve(assetRoot)
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    failures.push(`local asset escapes output root: ${relativePath} -> ${source}`)
    return
  }
  try {
    await access(target)
  } catch {
    failures.push(`missing local asset: ${relativePath} -> ${source}`)
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else files.push(path)
  }
  return files
}

const routeSource = await readFile(join(projectRoot, '..', 'src', 'data', 'site-routes.ts'), 'utf8')
const staticRoutes = [...routeSource.matchAll(/^\s+'([^']+)',?$/gm)].map((match) => match[1])
const htmlFiles = (await walk(distRoot)).filter((path) => path.endsWith('.html'))
const htmlByRoute = new Map()
for (const path of htmlFiles) {
  const relativePath = path.slice(distRoot.length + 1).replaceAll('\\', '/')
  const route = relativePath === 'index.html' ? '/' : `/${relativePath.replace(/\/index\.html$/, '')}`
  htmlByRoute.set(route, path)
}

for (const route of staticRoutes) {
  const relativePath = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`
  try {
    await readUtf8(relativePath)
  } catch {
    failures.push(`missing static route: ${route}`)
  }
}

const sitemap = await readUtf8('sitemap.xml')
for (const route of staticRoutes) {
  if (!sitemap.includes(`<loc>${siteConfig.siteUrl}${route}</loc>`)) failures.push(`sitemap missing route: ${route}`)
}

let robots = ''
try {
  robots = await readUtf8('robots.txt')
} catch {
  failures.push('missing robots.txt')
}
if (robots && (!robots.includes('User-agent: *') || !robots.includes('Allow: /') || !robots.includes(`Sitemap: ${siteConfig.siteUrl}/sitemap.xml`))) {
  failures.push('robots.txt is missing the public allow rule or sitemap URL')
}

let llms = ''
try {
  llms = await readUtf8('llms.txt')
} catch {
  failures.push('missing llms.txt')
}
const rss = await readUtf8('rss.xml')
if (!rss.includes('<rss version="2.0">') || !rss.includes('<lastBuildDate>') || !/<item>[\s\S]*<pubDate>/.test(rss)) failures.push('RSS output is missing channel date or article publication dates')

const blogRoot = join(projectRoot, '..', 'content', 'blog')
const blogDirectories = (await readdir(blogRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
const blogRecords = []
for (const directory of blogDirectories) {
  const markdown = await readFile(join(blogRoot, directory.name, 'index.md'), 'utf8')
  const slug = markdown.match(/^slug:\s*["']?([^\r\n"']+)["']?\s*$/m)?.[1]?.trim()
  const draft = /^draft:\s*true\s*$/m.test(markdown)
  const contentStatus = markdown.match(/^contentStatus:\s*([\w-]+)\s*$/m)?.[1]
  if (!slug) {
    failures.push(`blog article is missing slug: ${directory.name}`)
    continue
  }
  blogRecords.push({ contentStatus, draft, slug })
  const articleUrl = `${siteConfig.siteUrl}/blog/${slug}`
  const inSitemap = sitemap.includes(`<loc>${articleUrl}</loc>`)
  const inRss = rss.includes(`<link>${articleUrl}</link>`) || rss.includes(`<guid isPermaLink="true">${articleUrl}</guid>`)
  const isPublishedLocalArticle = contentStatus === 'full' && !draft
  if (isPublishedLocalArticle) {
    if (!inSitemap) failures.push(`full article missing from sitemap: ${slug}`)
    if (!inRss) failures.push(`full article missing from RSS: ${slug}`)
    if (!htmlByRoute.has(`/blog/${slug}`)) failures.push(`full article missing HTML route: ${slug}`)
  } else {
    if (inSitemap) failures.push(`draft or index-only article in sitemap: ${slug}`)
    if (inRss) failures.push(`draft or index-only article in RSS: ${slug}`)
  }
}
const fullArticleRoutes = new Set(blogRecords.filter(({ contentStatus, draft }) => contentStatus === 'full' && !draft).map(({ slug }) => `/blog/${slug}`))

if (llms) {
  if (!llms.includes(`# ${siteConfig.name}`)) failures.push('llms.txt is missing the site heading')
  const llmsRoutes = [...llms.matchAll(/^- (\/\S*)\s+—/gm)].map((match) => match[1])
  const expectedLlmsRoutes = new Set([...staticRoutes, ...fullArticleRoutes])
  for (const route of expectedLlmsRoutes) {
    if (!llmsRoutes.includes(route)) failures.push(`llms.txt missing route: ${route}`)
  }
  for (const route of llmsRoutes) {
    if (!expectedLlmsRoutes.has(route)) failures.push(`llms.txt contains stale route: ${route}`)
  }
}

for (const path of htmlFiles) {
  const html = await readFile(path, 'utf8')
  const relativePath = path.slice(distRoot.length + 1)
  const currentRoute = [...htmlByRoute.entries()].find(([, htmlPath]) => htmlPath === path)?.[0] || '/'
  const idCounts = new Map()
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) idCounts.set(id, (idCounts.get(id) || 0) + 1)
  for (const [id, count] of idCounts) {
    if (count > 1) failures.push(`duplicate id (\"${id}\") appears ${count} times: ${relativePath}`)
  }
  if (!html.includes('<html lang=')) failures.push(`missing html lang: ${relativePath}`)
  const mainCount = (html.match(/<main\b/g) || []).length
  if (!html.includes('<main id="main-content"')) failures.push(`missing main anchor: ${relativePath}`)
  if (mainCount !== 1) failures.push(`expected one main landmark, found ${mainCount}: ${relativePath}`)
  const h1Count = (html.match(/<h1\b/g) || []).length
  if (h1Count !== 1) failures.push(`expected one h1, found ${h1Count}: ${relativePath}`)
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  const expectedCanonical = new URL(currentRoute, siteConfig.siteUrl).toString()
  if (!canonical) failures.push(`missing canonical: ${relativePath}`)
  else if (canonical !== expectedCanonical) failures.push(`canonical mismatch: ${relativePath} -> ${canonical}`)
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`missing document title: ${relativePath}`)
  if (!/<meta name="description" content="[^"]+"/.test(html)) failures.push(`missing meta description: ${relativePath}`)
  for (const [, jsonLd] of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    if (jsonLd.includes('<')) failures.push(`unsafe unescaped < in JSON-LD: ${relativePath}`)
  }
  const ogType = html.match(/<meta property="og:type" content="([^"]+)"/)?.[1]
  if (!ogType) failures.push(`missing og:type: ${relativePath}`)
  if (fullArticleRoutes.has(currentRoute) && ogType !== 'article') failures.push(`article has incorrect og:type: ${relativePath}`)
  if (/<a\b[^>]*target="_blank"(?![^>]*rel="[^"]*noopener)/.test(html)) failures.push(`unsafe external link: ${relativePath}`)
  if (/<a\b[^>]*href="#"/.test(html)) failures.push(`placeholder hash link: ${relativePath}`)
  if (/<img\b(?![^>]*\balt(?:\s|=))[^>]*>/.test(html)) failures.push(`image without alt: ${relativePath}`)
  if (html.includes('alt="Article image"') || html.includes('alt="Article illustration"')) failures.push(`generic article image alt: ${relativePath}`)
  if (html.includes('querySelector<') || html.includes('querySelectorAll<')) failures.push(`untranspiled TypeScript generic in inline script: ${relativePath}`)
  for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attributes = match[1]
    const content = match[2]
    const label = getAttribute(attributes, 'aria-label')
    const labelledBy = getAttribute(attributes, 'aria-labelledby')
    if (!label && !labelledBy && !stripTags(content)) failures.push(`button has no accessible name: ${relativePath}`)
  }
  for (const [, tagName, attributes] of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const labelledBy = getAttribute(attributes, 'aria-labelledby')
    if (labelledBy) checkAriaReferences(html, labelledBy, relativePath, `${tagName} aria-labelledby`)
    const describedBy = getAttribute(attributes, 'aria-describedby')
    if (describedBy) checkAriaReferences(html, describedBy, relativePath, `${tagName} aria-describedby`)
    const controls = getAttribute(attributes, 'aria-controls')
    if (controls) checkAriaReferences(html, controls, relativePath, `${tagName} aria-controls`)
    if (tagName.toLowerCase() === 'label') {
      const targetId = getAttribute(attributes, 'for')
      if (targetId) checkAriaReferences(html, targetId, relativePath, 'label for')
    }
  }
  for (const match of html.matchAll(/<(?:div|span|p)\b[^>]*aria-label="[^"]+"[^>]*>/g)) {
    if (!/\brole="[^"]+"/.test(match[0])) failures.push(`generic element has aria-label without a role: ${relativePath}`)
  }
  for (const [, source] of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
    checkAssetUrl(source, relativePath, 'image URL')
    await checkLocalAsset(source, relativePath)
  }
  for (const [, source] of html.matchAll(/<(?:source|video|audio)\b[^>]*\b(?:src|poster)="([^"]+)"/g)) {
    checkAssetUrl(source, relativePath, 'media URL')
    await checkLocalAsset(source, relativePath)
  }
  for (const [, srcset] of html.matchAll(/\b(?:srcset|imagesrcset)="([^"]+)"/g)) {
    for (const candidate of srcset.split(',')) {
      const source = candidate.trim().split(/\s+/, 1)[0]
      checkAssetUrl(source, relativePath, 'responsive image URL')
      await checkLocalAsset(source, relativePath)
    }
  }
  for (const match of html.matchAll(/<img\b[^>]*\bsrc="\/uploads\/blog\/[^>]*>/g)) {
    const imageTag = match[0]
    if (!/\bwidth="\d+"/.test(imageTag) || !/\bheight="\d+"/.test(imageTag)) failures.push(`blog cover is missing intrinsic dimensions: ${relativePath}`)
  }
  for (const [, imageTag] of html.matchAll(/<img\b[^>]*\bclass="[^"]*hero-image[^"]*"[^>]*>/g)) {
    if (!/\bwidth="\d+"/.test(imageTag) || !/\bheight="\d+"/.test(imageTag)) failures.push(`hero image is missing intrinsic dimensions: ${relativePath}`)
  }

  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    checkUrlScheme(href, relativePath, 'link URL', true)
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue
    let url
    try { url = new URL(href, `${siteConfig.siteUrl}${currentRoute}`) } catch { continue }
    if (url.origin !== siteOrigin) continue
    const route = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '')
    const targetPath = htmlByRoute.get(route)
    if (!targetPath) {
      failures.push(`broken internal link: ${relativePath} -> ${href}`)
      continue
    }
    if (url.hash) {
      const targetHtml = await readFile(targetPath, 'utf8')
      const fragment = decodeURIComponent(url.hash.slice(1))
      if (!new RegExp(`(?:id|name)="${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(targetHtml)) {
        failures.push(`broken fragment: ${relativePath} -> ${href}`)
      }
    }
  }
}

const blogFiles = htmlFiles.filter((path) => path.includes(`${join('blog', '')}`) && !path.endsWith(`${join('blog', 'index.html')}`))
const articlePaths = blogFiles.filter((path) => !['archive', 'series'].includes(basename(dirname(path))))
if (!articlePaths.length) failures.push('no article output found')
for (const articlePath of articlePaths) {
  const relativePath = articlePath.slice(distRoot.length + 1)
  const article = await readFile(articlePath, 'utf8')
  if (!article.includes('type="image/avif"')) failures.push('article pages are missing AVIF cover sources')
  if (!article.includes('type="image/webp"')) failures.push('article pages are missing WebP cover sources')
  const proseStart = article.indexOf('<div class="article-prose">')
  const proseEnd = article.indexOf('<footer class="article-footer">', proseStart)
  const articleProse = proseStart >= 0 && proseEnd > proseStart ? article.slice(proseStart, proseEnd) : ''
  const proseImages = [...articleProse.matchAll(/<img\b[^>]*>/g)].map((match) => match[0])
  for (const match of articleProse.matchAll(/<(video|audio)\b[\s\S]*?<\/\1>/g)) {
    const mediaTag = match[0]
    if (!/\bcontrols(?:\s|=|>)/.test(mediaTag)) failures.push(`article media must expose native controls: ${relativePath}`)
    if (!/\b(?:src|poster)="[^"]+"/.test(mediaTag) && !/<source\b[^>]*\bsrc="[^"]+"/.test(mediaTag)) failures.push(`article media must provide a source or poster: ${relativePath}`)
    for (const [, source] of mediaTag.matchAll(/\b(?:src|poster)="([^"]+)"/g)) checkAssetUrl(source, relativePath, 'media URL')
    for (const [, source] of mediaTag.matchAll(/<source\b[^>]*\bsrc="([^"]+)"/g)) checkAssetUrl(source, relativePath, 'media source URL')
  }
  if (proseImages.some((imageTag) => !/\bloading="lazy"/.test(imageTag))) failures.push(`article body images must use lazy loading: ${relativePath}`)
  if (proseImages.some((imageTag) => !/\bdecoding="async"/.test(imageTag))) failures.push(`article body images must use async decoding: ${relativePath}`)
  if (proseImages.some((imageTag) => !/\breferrerpolicy="no-referrer"/.test(imageTag))) failures.push(`article body images must use no-referrer policy: ${relativePath}`)
  if (!article.includes('property="article:modified_time"')) failures.push(`article pages are missing modified time metadata: ${relativePath}`)
  if (!article.includes('BreadcrumbList') || !article.includes('itemListElement') || !article.includes(`"item":"${siteConfig.siteUrl}/blog/series"`)) failures.push(`article pages are missing linked BreadcrumbList structured data: ${relativePath}`)
  if (!/<section\b[^>]*class="[^"]*article-related[^"]*"[\s\S]*<h2\b[^>]*>/.test(article)) failures.push(`article pages are missing related reading links: ${relativePath}`)
}

const blogIndex = await readUtf8('blog/index.html')
const navPanelCount = (blogIndex.match(/class="nav-popover"/g) || []).length
if (navPanelCount !== 4) failures.push(`expected 4 primary navigation panels, found ${navPanelCount}`)

const homeIndex = await readUtf8('index.html')
if (!/<noscript>[\s\S]*#intro-overlay\s*\{\s*display:\s*none/.test(homeIndex)) failures.push('homepage is missing the no-script intro overlay fallback')

for (const archiveRoute of ['photos', 'architecture']) {
  const archiveHtml = await readUtf8(`${archiveRoute}/index.html`)
  const activeLinks = archiveHtml.match(/<a\b(?=[^>]*class="[^"]*is-active[^"]*")(?=[^>]*aria-current="page")[^>]*>/g) || []
  if (activeLinks.length < 2) failures.push(`${archiveRoute} archive is missing aria-current on active mode and header links`)
}

if (failures.length) {
  throw new Error(`Site output check failed:\n- ${failures.join('\n- ')}`)
}

console.log(`Site 输出检查通过：${htmlFiles.length} 个 HTML、${staticRoutes.length} 个静态路由、${navPanelCount} 个一级导航面板。`)
