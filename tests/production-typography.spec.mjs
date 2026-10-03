// Independent production-font verification. Existing dirty interaction/media tests stay untouched.
// Read the build manifest; a missing or stale font build must fail visibly.
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const fontManifest = JSON.parse(readFileSync(new URL('../dist/fonts/manifest.json', import.meta.url), 'utf8'))
const contract = {
  latinFamily: 'FS Geist', latinGlyphFamily: 'Geist',
  headingFamily: 'FS Noto Sans SC', headingGlyphFamily: 'Noto Sans SC',
  monoFamily: 'FS Geist Mono', monoGlyphFamily: 'Geist Mono',
  maximumFontBytes: 256 * 1024,
  maximumCjkBytes: 160 * 1024,
}

const routeManifest = JSON.parse(readFileSync(new URL('../content/site/site-routes.json', import.meta.url), 'utf8'))
const pageTypes = [
  ...routeManifest.static.map(key => ({ key, path: routeManifest[key], translatedRoute: true })),
  { key: 'project-detail', path: '/projects/lab', translatedRoute: true },
  { key: 'course-detail', path: '/projects/seo-geo-course', translatedRoute: true },
  { key: 'architecture-detail', path: '/architecture/nanjing-stone-city', translatedRoute: true },
  // Article canonical paths follow content language; UI language can still change in storage.
  { key: 'article', path: '/blog/prompt-aesthetic-2026-06-19', translatedRoute: false },
]
const routeFor = (type, locale) => locale === 'en' && type.translatedRoute
  ? type.path === '/' ? '/en' : `/en${type.path}`
  : type.path
const hasCjk = text => /\p{Script=Han}/u.test(text)
const onlyCjk = text => [...new Set([...text].filter(character => /\p{Script=Han}/u.test(character)))].join('')
const headingCjkText = text => [...new Set([...text].filter(character => /\p{Script=Han}|[\u3000-\u303f\uff01-\uff65]/u.test(character)))].join('')
const onlyLatin = text => (text.match(/[A-Za-z0-9]+/g) || []).join(' ')
const normalizeFamily = value => value.replace(/ Variable$/i, '').toLowerCase()
const nativeWeight = (range, value) => {
  const weights = range.split(/\s+/).map(Number)
  return weights.length === 1 ? weights[0] === value : value >= weights[0] && value <= weights[1]
}

test.describe('production typography', () => {
  // Run this file with --workers=1 after the production code is stable.
  test.describe.configure({ mode: 'serial' })

  const newContext = async (browser, baseURL, { width = 1440, theme = 'light', locale = 'zh' } = {}) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion: 'reduce', hasTouch: width === 375 })
    await context.addInitScript(({ theme, locale }) => {
      localStorage.setItem('formulasearch-theme', theme)
      localStorage.setItem('formulasearch-locale', locale)
      sessionStorage.setItem('formulasearch-intro-seen', 'true')
    }, { theme, locale })
    return context
  }
  const settled = async page => {
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  const cdpFor = async page => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('DOM.enable')
    await cdp.send('CSS.enable')
    return cdp
  }
  const platformFonts = async (cdp, selector) => {
    const { root } = await cdp.send('DOM.getDocument')
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: `${selector}, ${selector} *` })
    expect(nodeIds.length, `Glyph target exists: ${selector}`).toBeGreaterThan(0)
    // Chromium reports only the queried element's direct text runs. Localized
    // headings wrap their actual text in child spans, so inspect those as well.
    return (await Promise.all(nodeIds.map(nodeId => cdp.send('CSS.getPlatformFontsForNode', { nodeId })))).flatMap(result => result.fonts)
  }
  const collectRoles = page => page.evaluate(() => {
    const visible = element => getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0
    const read = element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect()
      let clippedRail = false
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (['auto', 'scroll', 'hidden'].includes(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth + 1) clippedRail = true
      }
      return { text: element.innerText, family: style.fontFamily, weight: Number(style.fontWeight), fontStyle: style.fontStyle, size: parseFloat(style.fontSize), leading: parseFloat(style.lineHeight) / parseFloat(style.fontSize), tracking: style.letterSpacing, synthesis: style.fontSynthesis, left: rect.left, right: rect.right, width: rect.width, height: rect.height, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clippedRail }
    }
    const headings = [...document.querySelectorAll('main h1, main h2, main h3, main h4, main .partner-entry__identity strong')].filter(visible).map((element, index) => {
      element.dataset.productionTypographyHeading = String(index)
      return { ...read(element), selector: `[data-production-typography-heading="${index}"]` }
    })
    const bodies = [...document.querySelectorAll('main p:not([class*="meta"]):not([class*="eyebrow"]), main .article-prose li')].filter(visible).map(read)
    const labels = [...document.querySelectorAll('main time, main code, main .project-card__meta')].filter(visible).map(read)
    return { headings, bodies, labels, width: innerWidth, scrollWidth: document.documentElement.scrollWidth }
  })
  // Isolate scripts in a temporary rendered probe. A computed family alone cannot prove glyph use.
  const proveGlyphs = async (page, cdp, style, text, expectedFamily, expectedGlyphFamily, system = false) => {
    expect(text, 'A real source text sample exists').not.toBe('')
    await page.evaluate(({ style, text }) => {
      const probe = document.createElement('span')
      probe.id = 'production-font-glyph-probe'
      Object.assign(probe.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', fontFamily: style.family, fontWeight: String(style.weight), fontStyle: style.fontStyle, fontSize: '20px', fontSynthesis: 'none' })
      probe.textContent = text
      document.body.append(probe)
    }, { style, text })
    try {
      const native = await page.evaluate(async ({ family, style, text, system }) => {
        if (system) return null
        const descriptor = `${style.fontStyle} ${style.weight} 20px "${family}"`
        const faces = await document.fonts.load(descriptor, text)
        return { descriptor, check: document.fonts.check(descriptor, text), faces: faces.map(face => ({ family: face.family.replace(/^['"]|['"]$/g, ''), weight: face.weight, style: face.style, status: face.status })) }
      }, { family: expectedFamily, style, text, system })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
      const actual = (await platformFonts(cdp, '#production-font-glyph-probe')).filter(font => font.glyphCount > 0)
      expect(actual.length).toBeGreaterThan(0)
      if (system) expect(actual.every(font => !font.isCustomFont), 'CJK body uses only system glyphs').toBe(true)
      else {
        expect(native.check).toBe(true)
        expect(native.faces.length).toBeGreaterThan(0)
        expect(native.faces.every(face => face.family === expectedFamily && face.status === 'loaded' && nativeWeight(face.weight, style.weight)), 'FontFace supplies the real native weight').toBe(true)
        expect(actual.every(font => font.isCustomFont && normalizeFamily(font.familyName).startsWith(normalizeFamily(expectedGlyphFamily))), 'Every source glyph belongs to the chosen web family without fallback').toBe(true)
      }
      return { text, style, native, actual }
    } finally { await page.locator('#production-font-glyph-probe').evaluate(element => element.remove()) }
  }
  const fontEntries = page => page.evaluate(() => performance.getEntriesByType('resource').filter(entry => /\.(?:woff2?|otf|ttf)(?:[?#]|$)/i.test(entry.name)).map(entry => ({ name: entry.name, path: new URL(entry.name).pathname, encodedBodySize: entry.encodedBodySize, transferSize: entry.transferSize })))

  for (const width of [1440, 375]) for (const theme of ['light', 'dark']) for (const locale of ['zh', 'en']) {
    test(`real headings and system CJK body fit all page types: ${width}px ${theme} ${locale}`, async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(180_000)
      const context = await newContext(browser, baseURL, { width, theme, locale })
      const records = []
      try {
        const page = await context.newPage(), cdp = await cdpFor(page)
        for (const type of pageTypes) {
          const pathname = routeFor(type, locale)
          const response = await page.goto(pathname, { waitUntil: 'domcontentloaded' })
          expect(response?.status(), pathname).toBe(200)
          await settled(page)
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
          await expect(page.locator('html')).toHaveAttribute('data-locale', locale)
          const roles = await collectRoles(page)
          expect(roles.scrollWidth, `${pathname}: page fits the viewport`).toBeLessThanOrEqual(width)
          expect(roles.headings.length, `${pathname}: visible headings exist`).toBeGreaterThan(0)
          for (const heading of roles.headings) {
            expect(heading.synthesis, `${pathname}: no synthesized font style`).toBe('none')
            if (!heading.clippedRail) {
              expect(heading.left, `${pathname}: heading left edge`).toBeGreaterThanOrEqual(-2)
              expect(heading.right, `${pathname}: heading right edge`).toBeLessThanOrEqual(width + 2)
            }
          }
          // Preserve each actual weight/family combination, including special display headings.
          const groups = new Map()
          for (const heading of roles.headings.filter(heading => hasCjk(heading.text))) {
            expect(heading.family).toContain(contract.headingFamily)
            const key = JSON.stringify([heading.family, heading.weight, heading.fontStyle])
            const group = groups.get(key) || { style: heading, text: '' }
            group.text += heading.text
            groups.set(key, group)
          }
          const cjkHeadingProofs = []
          for (const group of groups.values()) {
            const originalGlyphFonts = await platformFonts(cdp, group.style.selector)
            expect(originalGlyphFonts.some(font => font.isCustomFont && normalizeFamily(font.familyName).startsWith(normalizeFamily(contract.headingGlyphFamily)) && font.glyphCount > 0), 'The original heading renders with the selected subset').toBe(true)
            cjkHeadingProofs.push({ ...await proveGlyphs(page, cdp, group.style, headingCjkText(group.text), contract.headingFamily, contract.headingGlyphFamily), originalGlyphFonts })
          }
          const latin = roles.headings.find(heading => onlyLatin(heading.text))
          const latinProof = latin ? await proveGlyphs(page, cdp, latin, onlyLatin(latin.text), contract.latinFamily, contract.latinGlyphFamily) : null
          const cjkBody = roles.bodies.find(body => hasCjk(body.text))
          if (cjkBody) expect(cjkBody.family, 'Noto is restricted to headings').not.toContain(contract.headingFamily)
          const cjkBodyProof = cjkBody ? await proveGlyphs(page, cdp, cjkBody, onlyCjk(cjkBody.text), '', '', true) : null
          const latinBody = roles.bodies.find(body => onlyLatin(body.text) && body.family.split(',')[0].replaceAll('"', '').trim() === contract.latinFamily)
          const latinBodyProof = latinBody ? await proveGlyphs(page, cdp, latinBody, onlyLatin(latinBody.text), contract.latinFamily, contract.latinGlyphFamily) : null
          const label = roles.labels.find(label => onlyLatin(label.text))
          const monoProof = label ? await proveGlyphs(page, cdp, label, onlyLatin(label.text), contract.monoFamily, contract.monoGlyphFamily) : null
          await page.screenshot({ path: testInfo.outputPath(`${type.key}-${width}-${theme}-${locale}.png`), fullPage: false })
          records.push({ pathname, roles, cjkHeadingProofs, latinProof, cjkBodyProof, latinBodyProof, monoProof })
        }
      } finally {
        await testInfo.attach('production-font-glyph-and-layout', { body: JSON.stringify(records, null, 2), contentType: 'application/json' })
        await context.close()
      }
    })
  }

  test('cold delivery requests only the generated local WOFF2 subset and stays within its budget', async ({ browser, baseURL }, testInfo) => {
    const records = []
    for (const pathname of ['/projects', '/blog/prompt-aesthetic-2026-06-19', '/resources']) {
      const context = await newContext(browser, baseURL)
      try {
        const page = await context.newPage()
        await page.goto(pathname, { waitUntil: 'domcontentloaded' })
        await settled(page)
        const entries = await fontEntries(page)
        expect(entries.length).toBeGreaterThan(0)
        const manifest = fontManifest.pages.find(page => page.route === pathname)
        expect(manifest, `${pathname} has a generated title-font manifest`).toBeTruthy()
        expect(entries.every(entry => manifest.fonts.some(font => font.url === entry.path)), 'No original package slices or unrelated font files').toBe(true)
        expect(entries.every(entry => /\.woff2$/.test(entry.path) && !entry.path.includes('/node_modules/') && !entry.path.startsWith('/@fs/'))).toBe(true)
        const cjk = entries.filter(entry => manifest.fonts.some(font => font.subset && font.url === entry.path))
        expect(cjk.length).toBeGreaterThan(0)
        expect(cjk.every(entry => entry.encodedBodySize > 0)).toBe(true)
        expect(cjk.reduce((sum, entry) => sum + entry.encodedBodySize, 0)).toBeLessThanOrEqual(contract.maximumCjkBytes)
        for (const entry of entries) expect(entry.encodedBodySize).toBe(manifest.fonts.find(font => font.url === entry.path).bytes)
        expect(entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0)).toBeLessThanOrEqual(contract.maximumFontBytes)
        records.push({ pathname, entries })
      } finally { await context.close() }
    }
    await testInfo.attach('cold-production-font-downloads', { body: JSON.stringify(records, null, 2), contentType: 'application/json' })
  })

  test('font-delayed fallback remains readable and the loaded font preserves the reading layout', async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(60_000)
    const context = await newContext(browser, baseURL, { width: 375 })
    let releaseFonts
    const fontGate = new Promise(resolve => { releaseFonts = resolve })
    const blocked = []
    try {
      const page = await context.newPage()
      await page.addInitScript(() => {
        window.productionFontLayoutShifts = []
        new PerformanceObserver(list => {
          window.productionFontLayoutShifts.push(...list.getEntries().filter(entry => !entry.hadRecentInput).map(entry => ({ startTime: entry.startTime, value: entry.value })))
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await page.route(/\.woff2(?:[?#]|$)/, async route => { blocked.push(route.request().url()); await fontGate; await route.continue() })
      await page.goto('/projects', { waitUntil: 'domcontentloaded' })
      await expect.poll(() => blocked.length).toBeGreaterThan(0)
      const title = page.locator('.page-hero h1')
      await expect(title).toBeVisible()
      const before = await collectRoles(page)
      expect(before.scrollWidth).toBe(375)
      const cdp = await cdpFor(page)
      const fallback = await platformFonts(cdp, '.page-hero h1')
      expect(fallback.some(font => !font.isCustomFont && font.glyphCount > 0), 'Readable fallback is painted before the web font arrives').toBe(true)
      const beforeAt = await page.evaluate(() => performance.now())
      releaseFonts()
      await settled(page)
      const after = await collectRoles(page)
      expect(after.scrollWidth).toBe(375)
      const loaded = await platformFonts(cdp, '.page-hero h1')
      expect(loaded.some(font => font.isCustomFont && normalizeFamily(font.familyName).startsWith(normalizeFamily(contract.headingGlyphFamily)) && font.glyphCount > 0)).toBe(true)
      const shifts = await page.evaluate(beforeAt => window.productionFontLayoutShifts.filter(entry => entry.startTime >= beforeAt), beforeAt)
      await testInfo.attach('font-delayed-layout', { body: JSON.stringify({ blocked, before, after, fallback, loaded, shifts }, null, 2), contentType: 'application/json' })
      await page.screenshot({ path: testInfo.outputPath('font-delayed-loaded-375.png'), fullPage: false })
    } finally { releaseFonts(); await context.close() }
  })
})
