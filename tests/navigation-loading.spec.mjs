import { expect, test } from '@playwright/test'

const prefetchedPaths = page => page.locator('link[rel="prefetch"]:not([data-navigation-resource])').evaluateAll(links => links.map(link => new URL(link.href).pathname))

// Ordinary Playwright attaches directly to a page target, which Chromium uses
// to disable prerender. Exercise the unsupported-browser fallback here.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { HTMLScriptElement.supports = () => false })
})

test('cacheable navigation reuses the prefetched document without transferring it again', async ({ page }) => {
  const response = await page.request.head('/projects')
  test.skip(!/max-age=[1-9]/.test(response.headers()['cache-control'] || ''), 'Run the static server with HTML_CACHE_CONTROL=public, max-age=60')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.waitForFunction(() => performance.getEntriesByType('resource')
    .some(entry => new URL(entry.name, location.href).pathname === '/projects' && entry.responseEnd > 0))
  await page.locator('.nav-link[href="/projects"]').click()
  await expect(page).toHaveURL(/\/projects$/)
  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0]
    return { transferSize: entry.transferSize, deliveryType: entry.deliveryType }
  })
  expect(navigation).toEqual({ transferSize: 0, deliveryType: 'cache' })
})

test('fallback documents warm during the intro without loading destination media', async ({ page }) => {
  const downloaded = []
  page.on('requestfinished', request => {
    if (!request.isNavigationRequest() && ['/blog', '/projects', '/skills', '/lab', '/photos', '/architecture', '/partners'].includes(new URL(request.url()).pathname)) {
      downloaded.push(new URL(request.url()).pathname)
    }
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#intro-overlay')).toBeVisible()
  await expect.poll(() => prefetchedPaths(page)).toContain('/blog')
  await expect(page.locator('#intro-overlay')).toBeVisible()
  await expect(page.locator('#intro-overlay')).toHaveCount(0, { timeout: 8500 })
  const media = []
  page.on('request', request => {
    if (['image', 'media'].includes(request.resourceType())) media.push(request.url())
  })
  await expect.poll(() => prefetchedPaths(page), { timeout: 10000 }).toEqual(
    expect.arrayContaining(['/blog', '/projects', '/skills', '/lab', '/photos', '/architecture', '/partners']),
  )
  const paths = await prefetchedPaths(page)
  expect(paths).toHaveLength(7)
  expect(new Set(paths).size).toBe(7)
  await expect.poll(() => page.locator('link[data-navigation-resource]').count()).toBeGreaterThan(0)
  const assets = await page.locator('link[data-navigation-resource]').evaluateAll(links => links.map(link => new URL(link.href).pathname))
  expect(assets.every(path => path.startsWith('/_astro/') && /\.(css|js)$/.test(path))).toBe(true)
  expect(new Set(assets).size).toBe(assets.length)
  expect(paths.some(path => path.includes('/category/'))).toBe(false)
  expect(media).toEqual([])
  await expect.poll(() => downloaded).toEqual(expect.arrayContaining(paths))
})

for (const interaction of ['hover', 'focus']) {
  test(`submenu ${interaction} prepares its destination before clicking`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const link = page.locator('.nav-popover a[href="/blog/category/aesthetics"]')
    expect(await prefetchedPaths(page)).not.toContain('/blog/category/aesthetics')
    await page.locator('[aria-controls="nav-panel-blog"]').hover()
    if (interaction === 'hover') await link.hover()
    else await link.focus()
    await expect.poll(() => prefetchedPaths(page)).toContain('/blog/category/aesthetics')
  })
}

for (const connection of [{ saveData: true, effectiveType: '4g' }, { saveData: false, effectiveType: '2g' }]) {
  test(`background loading respects ${JSON.stringify(connection)}`, async ({ page }) => {
    await page.addInitScript(connection => {
      Object.defineProperty(navigator, 'connection', { value: connection })
    }, connection)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.locator('.nav-link[href="/projects"]').hover()
    await page.waitForTimeout(3500)
    expect(await prefetchedPaths(page)).toEqual([])
  })
}

test('a delayed navigation responds immediately and history return clears pending feedback', async ({ page }) => {
  let feedback
  await page.exposeFunction('observeNavigationFeedback', state => { feedback = state })
  await page.addInitScript(() => {
    new MutationObserver(() => {
      const link = document.querySelector('.nav-link.is-navigation-pending')
      if (link) window.observeNavigationFeedback({ busy: link.getAttribute('aria-busy'), background: getComputedStyle(link).backgroundColor })
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['aria-busy'] })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => localStorage.setItem('formulasearch-theme', 'light'))
  await page.goto('/')
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/projects', async route => {
    if (route.request().isNavigationRequest()) await gate
    await route.continue()
  })
  try {
    const link = page.locator('.nav-link[href="/projects"]')
    await link.click({ noWaitAfter: true })
    // Inspect feedback reported by the departing page, without waiting for navigation.
    await expect.poll(() => feedback?.busy).toBe('true')
    expect(feedback.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(new URL(page.url()).pathname).toBe('/')
  } finally { release() }
  await expect(page).toHaveURL(/\/projects$/)
  await page.goBack()
  await expect(page.locator('.is-navigation-pending')).toHaveCount(0)
  await expect(page.locator('.site-header [aria-busy]')).toHaveCount(0)
  // Hold the visual state without a navigation, since browser screenshots wait for navigation.
  await page.evaluate(() => window.addEventListener('click', event => event.preventDefault(), { once: true }))
  await page.locator('.nav-link[href="/projects"]').click()
  await page.screenshot({ path: 'output/playwright/navigation-pending.png' })
})
