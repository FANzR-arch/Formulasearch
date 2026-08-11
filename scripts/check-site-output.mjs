import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const distRoot = join(projectRoot, '..', 'dist')
const siteConfig = JSON.parse(await readFile(join(projectRoot, '..', 'content', 'site', 'site.json'), 'utf8'))
const siteOrigin = new URL(siteConfig.siteUrl).origin
const failures = []

async function readUtf8(relativePath) {
  return readFile(join(distRoot, relativePath), 'utf8')
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

const rss = await readUtf8('rss.xml')
if (!rss.includes('<rss version="2.0">') || !rss.includes('<lastBuildDate>') || !/<item>[\s\S]*<pubDate>/.test(rss)) failures.push('RSS output is missing channel date or article publication dates')

const blogRoot = join(projectRoot, '..', 'content', 'blog')
const blogDirectories = (await readdir(blogRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
for (const directory of blogDirectories) {
  const markdown = await readFile(join(blogRoot, directory.name, 'index.md'), 'utf8')
  if (!/^draft:\s*true\s*$/m.test(markdown)) continue
  const slug = markdown.match(/^slug:\s*["']?([^\r\n"']+)["']?\s*$/m)?.[1]?.trim()
  if (!slug) continue
  if (sitemap.includes(`/blog/${slug}`)) failures.push(`draft article in sitemap: ${slug}`)
  if (rss.includes(`/blog/${slug}`)) failures.push(`draft article in RSS: ${slug}`)
}

for (const path of htmlFiles) {
  const html = await readFile(path, 'utf8')
  const relativePath = path.slice(distRoot.length + 1)
  const currentRoute = [...htmlByRoute.entries()].find(([, htmlPath]) => htmlPath === path)?.[0] || '/'
  if (!html.includes('<html lang=')) failures.push(`missing html lang: ${relativePath}`)
  if (!html.includes('<main id="main-content"')) failures.push(`missing main anchor: ${relativePath}`)
  if (/<a\b[^>]*target="_blank"(?![^>]*rel="[^"]*noopener)/.test(html)) failures.push(`unsafe external link: ${relativePath}`)
  if (/<a\b[^>]*href="#"/.test(html)) failures.push(`placeholder hash link: ${relativePath}`)
  if (/<img\b(?![^>]*\balt(?:\s|=))[^>]*>/.test(html)) failures.push(`image without alt: ${relativePath}`)
  if (html.includes('alt="Article image"') || html.includes('alt="Article illustration"')) failures.push(`generic article image alt: ${relativePath}`)
  if (html.includes('querySelector<') || html.includes('querySelectorAll<')) failures.push(`untranspiled TypeScript generic in inline script: ${relativePath}`)
  for (const match of html.matchAll(/<img\b[^>]*\bsrc="\/uploads\/blog\/[^>]*>/g)) {
    const imageTag = match[0]
    if (!/\bwidth="\d+"/.test(imageTag) || !/\bheight="\d+"/.test(imageTag)) failures.push(`blog cover is missing intrinsic dimensions: ${relativePath}`)
  }

  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue
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
const articlePath = blogFiles.find((path) => !['archive', 'series'].includes(basename(dirname(path))))
if (!articlePath) failures.push('no article output found')
else {
  const article = await readFile(articlePath, 'utf8')
  if (!article.includes('loading="lazy"')) failures.push('article images are missing lazy loading')
  if (!article.includes('referrerpolicy="no-referrer"')) failures.push('article images are missing referrer policy')
  if (!article.includes('property="article:modified_time"')) failures.push('article pages are missing modified time metadata')
  if (!article.includes('BreadcrumbList') || !article.includes('itemListElement') || !article.includes(`"item":"${siteConfig.siteUrl}/blog/series"`)) failures.push('article pages are missing linked BreadcrumbList structured data')
  if (!article.includes('article-related') || !article.includes('Related articles')) failures.push('article pages are missing related reading links')
}

const blogIndex = await readUtf8('blog/index.html')
const navPanelCount = (blogIndex.match(/class="nav-popover"/g) || []).length
if (navPanelCount !== 4) failures.push(`expected 4 primary navigation panels, found ${navPanelCount}`)

if (failures.length) {
  throw new Error(`Site output check failed:\n- ${failures.join('\n- ')}`)
}

console.log(`Site 输出检查通过：${htmlFiles.length} 个 HTML、${staticRoutes.length} 个静态路由、${navPanelCount} 个一级导航面板。`)
