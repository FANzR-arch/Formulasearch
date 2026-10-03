// Font delivery for the main site: exact rendered title subsets in production,
// a watched source-title corpus in development. The reference preview is separate.
import { createReadStream } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'parse5'
import { createProductionFonts } from './production-fonts.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const developmentRoot = join(projectRoot, 'node_modules', '.cache', 'formulasearch-fonts', 'dev-assets')
const classes = node => (attribute(node, 'class') || '').split(/\s+/)
const attribute = (node, name) => node.attrs?.find(item => item.name === name)?.value
const children = node => [...(node.childNodes || []), ...(node.content ? [node.content] : [])]
const text = node => node.nodeName === '#text' ? node.value : children(node).map(text).join(' ')
const headingTags = new Set(['h1', 'h2', 'h3', 'h4'])

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))
  return nested.flat().sort()
}

export function renderedTitles(html) {
  const document = parse(html, { sourceCodeLocationInfo: true })
  const titles = [], dynamic = []
  let head, mainTitle, locale = 'zh'
  function visit(node, parents = []) {
    if (node.tagName === 'html') locale = attribute(node, 'data-route-locale') || 'zh'
    if (node.tagName === 'head') head = node
    if (headingTags.has(node.tagName) || classes(node).includes('resource-card__title') || (node.tagName === 'strong' && parents.some(parent => classes(parent).includes('partner-entry__identity')))) {
      titles.push(text(node))
      if (node.tagName === 'h1' && !mainTitle) mainTitle = node
    }
    for (const name of ['data-photo-title-zh', 'data-photo-title-en']) {
      const value = attribute(node, name)
      if (value) dynamic.push(value)
    }
    for (const child of children(node)) visit(child, [...parents, node])
  }
  visit(document)
  // Preload the visible locale only. Both locale title sets remain declared so
  // switching language never falls back to an unbuilt CJK title glyph.
  function visibleText(node) {
    if (classes(node).includes(`localized-text__${locale === 'en' ? 'zh' : 'en'}`)) return ''
    return node.nodeName === '#text' ? node.value : children(node).map(visibleText).join(' ')
  }
  return { titles: [...titles, ...dynamic], firstTitle: mainTitle ? visibleText(mainTitle) : '', dynamicTitleCount: dynamic.length, headEnd: head?.sourceCodeLocation?.endTag?.startOffset }
}

async function developmentTitles() {
  const sourceFiles = (await Promise.all(['content', 'src', 'public/scripts'].map(directory => files(join(projectRoot, directory))))).flat()
    .filter(file => /\.(json|md|astro|ts|tsx|js)$/.test(file))
  const corpus = await Promise.all(sourceFiles.map(async file => {
    const source = await readFile(file, 'utf8')
    if (!file.endsWith('.md')) return source
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || ''
    return `${frontmatter}\n${[...source.matchAll(/^#{1,4}\s+(.+)$/gm)].map(match => match[1]).join('\n')}`
  }))
  return corpus
}

const preload = url => `<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin data-production-font-preload>`

export default function typography() {
  let watcher, timer, server
  const changed = file => /\.(json|md|astro|ts|tsx|js)$/.test(file) && ['content', 'src', join('public', 'scripts')].some(directory => resolve(file).startsWith(resolve(projectRoot, directory) + sep))
  return {
    name: 'formula-production-typography',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outputDir = fileURLToPath(dir)
        const pages = []
        for (const file of (await files(outputDir)).filter(file => file.endsWith('.html'))) {
          const html = await readFile(file, 'utf8')
          if (!html.includes('data-route-locale=')) continue // static redirect documents
          const route = `/${relative(outputDir, file).replaceAll('\\', '/').replace(/(?:^|\/)index\.html$/, '')}`.replace(/\/$/, '') || '/'
          const rendered = renderedTitles(html)
          if (!rendered.headEnd) throw new Error(`Cannot inject production fonts into ${route}`)
          const generated = await createProductionFonts({ outputDir, texts: rendered.titles, route })
          const western = generated.fonts.find(font => font.family === 'FS Geist' && font.style === 'normal' && /-latin-wght-normal/.test(font.source))
          const firstTitle = new Set([...rendered.firstTitle])
          const aboveFold = generated.fonts.filter(font => font.subset && [...font.characters].some(character => firstTitle.has(character)))
          const preloaded = [western, ...aboveFold].filter(Boolean)
          const tags = `${preloaded.map(font => preload(font.url)).join('')}<style data-production-fonts>${generated.css}</style>`
          await writeFile(file, `${html.slice(0, rendered.headEnd)}${tags}${html.slice(rendered.headEnd)}`)
          pages.push({ ...generated.manifest, preloaded: preloaded.map(font => font.url), dynamicTitleCount: rendered.dynamicTitleCount })
        }
        const uniqueFonts = [...new Map(pages.flatMap(page => page.fonts).map(font => [font.url, font])).values()]
        const report = { direction: 'tech', families: ['FS Geist', 'FS Geist Mono', 'FS Noto Sans SC'], pages, uniqueFontCount: uniqueFonts.length, uniqueFontBytes: uniqueFonts.reduce((sum, font) => sum + font.bytes, 0) }
        await mkdir(join(outputDir, 'fonts'), { recursive: true })
        const reportJson = `${JSON.stringify(report, null, 2)}\n`
        await writeFile(join(outputDir, 'fonts', 'manifest.json'), reportJson)
        await mkdir(join(projectRoot, 'output', 'geist-adoption'), { recursive: true })
        await writeFile(join(projectRoot, 'output', 'geist-adoption', 'fonts-report.json'), reportJson)
        logger.info(`${pages.length} pages: static-600 title subsets; ${uniqueFonts.length} local font assets (${(report.uniqueFontBytes / 1024).toFixed(1)} KiB).`)
      },
      'astro:server:setup': async ({ server: viteServer, logger }) => {
        server = viteServer
        async function generate() {
          const result = await createProductionFonts({ outputDir: developmentRoot, texts: await developmentTitles(), route: 'development' })
          await writeFile(join(developmentRoot, 'fonts', 'development.css'), result.css)
          logger.info(`Development title corpus: ${result.manifest.cjkCharacterCount} CJK characters; local fonts ready.`)
        }
        let pending = generate()
        await pending
        server.middlewares.use((request, response, next) => {
          const pathname = (request.url || '').split(/[?#]/, 1)[0]
          if (!pathname.startsWith('/fonts/')) return next()
          const filename = pathname.slice('/fonts/'.length)
          if (!/^(?:[a-f0-9]{64}\.woff2|development\.css|[a-z-]+-OFL\.txt)$/.test(filename)) { response.statusCode = 404; response.end(); return }
          pending.then(async () => {
            const file = join(developmentRoot, 'fonts', filename)
            const buffer = await readFile(file)
            response.setHeader('Content-Type', filename.endsWith('.woff2') ? 'font/woff2' : filename.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/plain; charset=utf-8')
            response.setHeader('Cache-Control', filename.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache')
            response.setHeader('Content-Length', buffer.length)
            if (request.method === 'HEAD') response.end()
            else createReadStream(file).pipe(response)
          }).catch(error => { response.statusCode = error.code === 'ENOENT' ? 404 : 500; response.end('Font asset unavailable') })
        })
        watcher = file => {
          if (!changed(file)) return
          clearTimeout(timer)
          timer = setTimeout(() => {
            pending = pending.catch(() => {}).then(generate)
            pending.then(() => server.ws.send({ type: 'full-reload' })).catch(error => logger.error(error.message))
          }, 200)
        }
        server.watcher.on('add', watcher).on('change', watcher).on('unlink', watcher)
      },
      'astro:server:done': () => {
        clearTimeout(timer)
        if (server && watcher) for (const event of ['add', 'change', 'unlink']) server.watcher.off(event, watcher)
      },
    },
  }
}
