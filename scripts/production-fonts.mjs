// Build local Western font assets and real, static-600 CJK title subsets.
// Callers supply title text and own route HTML/CSS injection; no network is used.
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import subsetFont from 'subset-font'
import { create as readFont } from 'fontkitten'

const require = createRequire(import.meta.url)
const algorithmVersion = 1
const cacheDir = resolve(dirname(require.resolve('astro/package.json')), '..', '.cache', 'formulasearch-fonts')
const promises = new Map()
const sourceFonts = new Map()
const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const cjk = (character) => /\p{Script=Han}/u.test(character) || /[\u3000-\u303f\uff01-\uff60\uffe0-\uffe6]/u.test(character)
const nameIds = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
const westernFamilies = [
  { packageName: '@fontsource-variable/geist', family: 'FS Geist', slug: 'geist' },
  { packageName: '@fontsource-variable/geist-mono', family: 'FS Geist Mono', slug: 'geist-mono' },
]

function packageDirectory(name) {
  return dirname(require.resolve(`${name}/package.json`))
}

async function resolvedPackage(name, resolver = require) {
  let directory = dirname(resolver.resolve(name))
  while (true) {
    try {
      const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
      if (metadata.name === name) return { directory, ...metadata }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const parent = dirname(directory)
    if (parent === directory) throw new Error(`Cannot locate package metadata for ${name}`)
    directory = parent
  }
}

const toolInfo = resolvedPackage('subset-font').then(async (tool) => {
  const toolRequire = createRequire(join(tool.directory, 'package.json'))
  const converter = await resolvedPackage('fontverter', toolRequire)
  const converterRequire = createRequire(join(converter.directory, 'package.json'))
  const dependencyNames = ['harfbuzzjs', 'wawoff2', 'woff2sfnt-sfnt2woff']
  const dependencies = await Promise.all(dependencyNames.map((name) => resolvedPackage(name, name === 'harfbuzzjs' ? toolRequire : converterRequire)))
  return { packageName: tool.name, version: tool.version, dependencies: Object.fromEntries([converter, ...dependencies].map((item) => [item.name, item.version])) }
})

function declaration(rule, name) {
  return rule.match(new RegExp(`${name}\\s*:\\s*([^;]+);`, 'i'))?.[1].trim()
}

function unicodeRanges(value) {
  return value.split(',').map((range) => {
    const hex = range.trim().replace(/^U\+/i, '')
    if (hex.includes('?')) return [Number.parseInt(hex.replaceAll('?', '0'), 16), Number.parseInt(hex.replaceAll('?', 'F'), 16)]
    const [minimum, maximum = minimum] = hex.split('-')
    return [Number.parseInt(minimum, 16), Number.parseInt(maximum, 16)]
  })
}

function unicodeRange(characters) {
  const points = [...new Set([...characters].map((character) => character.codePointAt(0)))].sort((a, b) => a - b)
  const ranges = []
  for (const point of points) {
    const previous = ranges.at(-1)
    if (previous && point === previous[1] + 1) previous[1] = point
    else ranges.push([point, point])
  }
  const hex = (point) => point.toString(16).toUpperCase()
  return ranges.map(([minimum, maximum]) => `U+${hex(minimum)}${minimum === maximum ? '' : `-${hex(maximum)}`}`).join(',')
}

async function faces(packageName, cssEntry) {
  const cssPath = require.resolve(`${packageName}/${cssEntry}`)
  const css = await readFile(cssPath, 'utf8')
  return [...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map((match) => {
    const rule = match[1]
    const source = [...rule.matchAll(/url\(([^)]+)\)/g)].map((url) => url[1].replace(/^['"]|['"]$/g, '')).find((url) => url.endsWith('.woff2'))
    if (!source) throw new Error(`Missing WOFF2 source in ${cssPath}`)
    const range = declaration(rule, 'unicode-range')
    if (!range) throw new Error(`Missing unicode-range in ${cssPath}`)
    return {
      packageName,
      cssEntry,
      file: resolve(dirname(cssPath), source),
      style: declaration(rule, 'font-style') || 'normal',
      weight: declaration(rule, 'font-weight'),
      unicodeRange: range,
      ranges: unicodeRanges(range),
    }
  })
}

async function sourceFont(file) {
  if (!sourceFonts.has(file)) sourceFonts.set(file, readFile(file).then((buffer) => ({ buffer, hash: sha256(buffer), font: readFont(buffer) })))
  return sourceFonts.get(file)
}

async function atomicWrite(file, buffer) {
  await mkdir(dirname(file), { recursive: true })
  try {
    const existing = await readFile(file)
    if (existing.equals(buffer)) return
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, buffer)
  try {
    await rename(temporary, file)
  } catch (error) {
    // Another process can finish the identical cache entry first on Windows.
    const existing = await readFile(file).catch(() => null)
    if (!existing?.equals(buffer)) throw error
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error })
  }
}

function verifySubset(buffer, characters, source) {
  const font = readFont(buffer)
  if (Object.keys(font.variationAxes).length) throw new Error('CJK title subset still has variation axes; expected static 600')
  if (font['OS/2'].usWeightClass !== 600) throw new Error(`CJK subset weight is ${font['OS/2'].usWeightClass}, expected 600`)
  if (font.familyName !== source.font.familyName) throw new Error('Subsetting changed the original Noto internal family')
  if (font.copyright !== source.font.copyright) throw new Error('Subsetting dropped the original Noto copyright')
  const missing = [...characters].filter((character) => !font.hasGlyphForCodePoint(character.codePointAt(0)))
  if (missing.length) throw new Error(`CJK subset is missing title characters: ${missing.join('')}`)
  return { characters: [...characters].length, glyphCount: font.numGlyphs, weight: font['OS/2'].usWeightClass, variationAxes: font.variationAxes, familyName: font.familyName, copyright: font.copyright }
}

async function createSubset(face, characters, tool) {
  const source = await sourceFont(face.file)
  const missing = [...characters].filter((character) => !source.font.hasGlyphForCodePoint(character.codePointAt(0)))
  if (missing.length) throw new Error(`Noto source slice is missing declared title characters: ${missing.join('')}`)
  const key = sha256(JSON.stringify({ algorithmVersion, source: source.hash, tool, characters, weight: 600, nameIds }))
  if (!promises.has(key)) promises.set(key, (async () => {
    const file = join(cacheDir, `${key}.woff2`)
    let buffer
    try {
      buffer = await readFile(file)
      verifySubset(buffer, characters, source)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      buffer = await subsetFont(source.buffer, characters, {
        targetFormat: 'woff2',
        variationAxes: { wght: 600 },
        preserveNameIds: nameIds,
      })
      verifySubset(buffer, characters, source)
      await atomicWrite(file, buffer)
    }
    return { buffer, sourceSha256: source.hash, coverage: verifySubset(buffer, characters, source) }
  })())
  return promises.get(key)
}

function fontCss(font) {
  return `@font-face{font-family:'${font.family}';font-style:${font.style};font-weight:${font.weight};font-display:swap;${font.sizeAdjust ? `size-adjust:${font.sizeAdjust};` : ''}src:url('${font.url}') format('woff2');unicode-range:${font.unicodeRange};}`
}

/**
 * Generate route-local fonts and return CSS plus an auditable manifest.
 * @param {{ outputDir: string, texts: string | string[], route?: string }} options
 */
export async function createProductionFonts({ outputDir, texts, route = '' }) {
  if (typeof outputDir !== 'string' || !outputDir) throw new TypeError('outputDir must be a directory path')
  if (typeof texts !== 'string' && (!Array.isArray(texts) || texts.some((text) => typeof text !== 'string'))) throw new TypeError('texts must be a string or an array of strings')
  const directory = join(resolve(outputDir), 'fonts')
  const titleText = Array.isArray(texts) ? texts.join(' ') : texts
  const cjkCharacters = [...new Set([...titleText].filter(cjk))].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('')
  const tool = await toolInfo
  const fonts = []
  const versions = {}
  const licenses = []

  async function emit(buffer, metadata) {
    const hash = sha256(buffer)
    const url = `/fonts/${hash}.woff2`
    await atomicWrite(join(directory, `${hash}.woff2`), buffer)
    fonts.push({ ...metadata, url, bytes: buffer.length, sha256: hash })
  }

  async function license(packageName, slug) {
    const root = packageDirectory(packageName)
    versions[packageName] = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version
    const buffer = await readFile(join(root, 'LICENSE'))
    const url = `/fonts/${slug}-OFL.txt`
    await atomicWrite(join(directory, `${slug}-OFL.txt`), buffer)
    licenses.push({ packageName, url, sha256: sha256(buffer) })
  }

  // Both Latin and Latin-ext are declared, but browser unicode-range requests only
  // the files used by a page. Native italics keep emphasized body text accurate.
  for (const family of westernFamilies) {
    await license(family.packageName, family.slug)
    for (const entry of ['index.css', 'wght-italic.css']) {
      for (const face of await faces(family.packageName, entry)) {
        if (!/-latin(?:-ext)?-/.test(face.file.split(/[\\/]/).at(-1))) continue
        const source = await sourceFont(face.file)
        const metrics = { unitsPerEm: source.font.unitsPerEm, capHeight: source.font.capHeight, xHeight: source.font.xHeight }
        const sizeAdjust = `${(0.72 / (metrics.capHeight / metrics.unitsPerEm) * 100).toFixed(5)}%`
        await emit(source.buffer, { family: family.family, internalFamily: source.font.familyName, style: face.style, weight: face.weight, unicodeRange: face.unicodeRange, packageName: face.packageName, source: face.file.split(/[\\/]/).at(-1), sourceSha256: source.hash, subset: false, metrics, sizeAdjust })
      }
    }
  }

  const notoPackage = '@fontsource-variable/noto-sans-sc'
  await license(notoPackage, 'noto-sans-sc')
  const remaining = new Set([...cjkCharacters])
  if (remaining.size) {
    for (const face of await faces(notoPackage, 'index.css')) {
      if (face.style !== 'normal') continue
      const characters = [...remaining].filter((character) => face.ranges.some(([minimum, maximum]) => character.codePointAt(0) >= minimum && character.codePointAt(0) <= maximum)).join('')
      if (!characters) continue
      const subset = await createSubset(face, characters, tool)
      await emit(subset.buffer, { family: 'FS Noto Sans SC', internalFamily: subset.coverage.familyName, style: 'normal', weight: '600', unicodeRange: unicodeRange(characters), packageName: notoPackage, source: face.file.split(/[\\/]/).at(-1), sourceSha256: subset.sourceSha256, subset: true, characters, coverage: subset.coverage })
      for (const character of characters) remaining.delete(character)
    }
  }
  if (remaining.size) throw new Error(`Noto Sans SC does not cover title characters: ${[...remaining].join('')}`)
  const css = fonts.map(fontCss).join('\n')
  const manifest = {
    route,
    algorithmVersion,
    tool,
    sources: versions,
    cjkCharacters,
    cjkCharacterCount: [...cjkCharacters].length,
    fonts,
    licenses,
    totalBytes: fonts.reduce((sum, font) => sum + font.bytes, 0),
    cjkBytes: fonts.filter((font) => font.subset).reduce((sum, font) => sum + font.bytes, 0),
    cssSha256: sha256(css),
  }
  return { css, fonts, cjkCharacters, manifest }
}
