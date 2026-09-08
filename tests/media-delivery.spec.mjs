import { expect, test } from '@playwright/test'

for (const theme of ['light', 'dark']) {
  for (const pathname of ['/', '/projects']) {
    test(`${pathname} loads only the saved ${theme} image and switches themes`, async ({ page }) => {
      // A saved choice must win even when the operating system prefers the other theme.
      await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light', reducedMotion: 'reduce' })
      await page.addInitScript((value) => localStorage.setItem('formulasearch-theme', value), theme)
      const requested = new Set()
      page.on('request', (request) => requested.add(new URL(request.url()).pathname))
      await page.goto(pathname)
      const image = page.locator(pathname === '/' ? '.home-avatar__image:visible' : '.project-card[href="/projects/lab"] img')
      await image.scrollIntoViewIfNeeded()
      await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true)
      if (pathname === '/') {
        const ratio = await image.evaluate((element) => element.getBoundingClientRect().width / element.parentElement.getBoundingClientRect().width)
        expect(ratio).toBeLessThan(1.1)
      }
      const sources = await image.evaluate((element) => ({
        light: element.dataset.srcsetLight.split(', ').map((item) => item.split(' ')[0]),
        dark: element.dataset.srcsetDark.split(', ').map((item) => item.split(' ')[0]),
        current: new URL(element.currentSrc).pathname,
      }))
      expect(sources[theme]).toContain(sources.current)
      for (const source of sources[theme === 'light' ? 'dark' : 'light']) expect(requested.has(source)).toBe(false)
      expect([...requested].some((source) => /\/uploads\/(home\/profile-|projects\/lab\/cover-).*\.png$/.test(source))).toBe(false)

      await page.locator('#theme-toggle').click()
      await image.scrollIntoViewIfNeeded()
      const nextTheme = theme === 'light' ? 'dark' : 'light'
      await expect.poll(() => image.evaluate((element, expected) => element.complete && element.naturalWidth > 0 && expected.includes(new URL(element.currentSrc).pathname), sources[nextTheme])).toBe(true)
      if (pathname === '/projects') {
        await page.locator('#language-toggle').click()
        await expect(image).toHaveAttribute('alt', await image.getAttribute('data-alt-en'))
      }
    })
  }
}

test('images and native pointer remain usable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    for (const pathname of ['/', '/projects']) {
      await page.goto(pathname)
      const image = page.locator(pathname === '/' ? '.home-avatar__image:visible' : '.project-card[href="/projects/lab"] img')
      await image.scrollIntoViewIfNeeded()
      await expect(image).toBeVisible()
      await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true)
      if (pathname === '/') {
        const ratio = await image.evaluate((element) => element.getBoundingClientRect().width / element.parentElement.getBoundingClientRect().width)
        expect(ratio).toBeLessThan(1.1)
      }
      await expect(page.locator('html')).not.toHaveCSS('cursor', 'none')
    }
  } finally {
    await context.close()
  }
})

test('blocked cursor script preserves the native pointer', async ({ page }) => {
  await page.route('**/scripts/site-cursor.js', (route) => route.abort())
  await page.goto('/photos')
  await page.mouse.move(420, 350)
  await expect(page.locator('html')).not.toHaveCSS('cursor', 'none')
  await expect(page.locator('[data-site-cursor]')).not.toHaveClass(/is-visible/)
})

test('custom pointer releases on blur and touch, then recovers on mouse movement', async ({ page }) => {
  await page.goto('/photos')
  await page.mouse.move(420, 350)
  await expect(page.locator('html')).toHaveCSS('cursor', 'none')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(page.locator('html')).not.toHaveCSS('cursor', 'none')
  await page.mouse.move(430, 360)
  await expect(page.locator('[data-site-cursor]')).toHaveClass(/is-visible/)
  await page.dispatchEvent('body', 'pointerdown', { pointerType: 'touch' })
  await expect(page.locator('html')).not.toHaveCSS('cursor', 'none')
  await page.mouse.move(440, 370)
  await expect(page.locator('html')).toHaveCSS('cursor', 'none')
  await expect(page.locator('[data-site-cursor]')).toHaveClass(/is-visible/)
})
