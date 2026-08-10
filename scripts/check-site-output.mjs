import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const distRoot = join(projectRoot, '..', 'dist')
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
  if (!sitemap.includes(`<loc>https://formulasearch.com${route}</loc>`)) failures.push(`sitemap missing route: ${route}`)
}

for (const path of htmlFiles) {
  const html = await readFile(path, 'utf8')
  const relativePath = path.slice(distRoot.length + 1)
  if (!html.includes('<html lang=')) failures.push(`missing html lang: ${relativePath}`)
  if (!html.includes('<main id="main-content"')) failures.push(`missing main anchor: ${relativePath}`)
  if (/<a\b[^>]*target="_blank"(?![^>]*rel="[^"]*noopener)/.test(html)) failures.push(`unsafe external link: ${relativePath}`)
  if (/<img\b(?![^>]*\balt(?:\s|=))[^>]*>/.test(html)) failures.push(`image without alt: ${relativePath}`)
}

const blogFiles = htmlFiles.filter((path) => path.includes(`${join('blog', '')}`) && !path.endsWith(`${join('blog', 'index.html')}`))
const articlePath = blogFiles.find((path) => !['archive', 'series'].includes(basename(dirname(path))))
if (!articlePath) failures.push('no article output found')
else {
  const article = await readFile(articlePath, 'utf8')
  if (!article.includes('loading="lazy"')) failures.push('article images are missing lazy loading')
  if (!article.includes('referrerpolicy="no-referrer"')) failures.push('article images are missing referrer policy')
}

const blogIndex = await readUtf8('blog/index.html')
const navPanelCount = (blogIndex.match(/class="nav-popover"/g) || []).length
if (navPanelCount !== 4) failures.push(`expected 4 primary navigation panels, found ${navPanelCount}`)

if (failures.length) {
  throw new Error(`Site output check failed:\n- ${failures.join('\n- ')}`)
}

console.log(`Site 输出检查通过：${htmlFiles.length} 个 HTML、${staticRoutes.length} 个静态路由、${navPanelCount} 个一级导航面板。`)
