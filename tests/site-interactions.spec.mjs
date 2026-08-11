import { expect, test } from '@playwright/test'

test('mobile navigation traps focus and restores it on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')

  const toggle = page.locator('#mobile-navigation-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.focus()
  await expect.poll(() => toggle.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(toggle).toHaveAttribute('aria-label', /关闭导航/)
  await expect(page.locator('#site-navigation')).toBeVisible()

  const focusable = page.locator('#site-navigation a:visible, #site-navigation button:visible')
  const firstFocusable = focusable.first()
  const lastFocusable = focusable.last()
  await expect(firstFocusable).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(lastFocusable).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(firstFocusable).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toHaveAttribute('aria-label', /打开导航/)
  await expect(toggle).toBeFocused()
})

test('mobile navigation closes when its toggle is clicked again', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')

  const toggle = page.locator('#mobile-navigation-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#site-navigation')).toBeHidden()
})

test('archive and header controls keep touch-friendly hit areas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/photos')

  const sizes = await page.locator('.site-header .monogram, .site-header .nav-disclosure, .site-header .icon-link, .site-header .language-toggle, .site-header .theme-toggle, .visual-archive__modes a, .visual-archive__filters button').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }))

  expect(sizes.length).toBeGreaterThan(0)
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(40)
    expect(size.height).toBeGreaterThanOrEqual(40)
  }
})

test('key routes do not overflow a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  for (const route of ['/', '/blog', '/blog/ai-practice-2026-02-22', '/photos', '/architecture', '/projects', '/skills', '/lab']) {
    await page.goto(route)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow, `${route} overflows at 320px`).toBeFalsy()
  }
})

test('homepage falls back when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl') return null
      return getContext.call(this, type, ...args)
    }
  })
  await page.goto('/')
  await expect(page.locator('#ambient-flow')).toHaveClass(/ambient-flow--fallback/)
})

test('navigation disclosure labels reflect open state and locale', async ({ page }) => {
  await page.goto('/projects')

  const disclosure = page.locator('.nav-disclosure').first()
  await disclosure.evaluate((element) => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await expect(disclosure).toHaveAttribute('aria-label', /关闭博客分类/)

  await page.locator('#language-toggle').click()
  await expect(disclosure).toHaveAttribute('aria-label', /Close Blog menu/)
  await disclosure.evaluate((element) => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await expect(disclosure).toHaveAttribute('aria-label', /Open Blog menu/)
})

test('locale and theme controls update document metadata', async ({ page }) => {
  await page.goto('/projects')

  await page.locator('#language-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle(/Projects/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Phil's products/)
  await expect(page.locator('#language-toggle')).toHaveAttribute('aria-label', 'Switch to Chinese')
  await expect(page.locator('.nav-disclosure').nth(1)).toHaveAttribute('aria-label', 'Open Projects menu')
  await expect(page.locator('.icon-link--github')).toHaveAttribute('title', 'Phil on GitHub')

  await page.locator('#theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Switch to light theme')
})

test('blog featured stage keeps localized title and summary on locale switch', async ({ page }) => {
  await page.goto('/blog')

  const trigger = page.locator('[data-stage-trigger]').first()
  const stageTitle = page.locator('[data-stage-title]')
  const stageSummary = page.locator('[data-stage-summary]')
  await page.locator('#language-toggle').click()

  await expect(stageTitle).toHaveText(await trigger.getAttribute('data-stage-title-en') || '')
  await expect(stageSummary).toHaveText(await trigger.getAttribute('data-stage-summary-en') || '')
})

test('theme preference survives a page reload', async ({ page }) => {
  await page.goto('/projects')
  await page.locator('#theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', '切换到浅色主题')
})

test('locale updates the dynamic background control label', async ({ page }) => {
  await page.goto('/')
  await page.locator('#language-toggle').click()
  await expect(page.locator('#background-cycle')).toHaveAttribute('aria-label', /Current background/)
})

test('background cycle keeps localized copy when the variant changes', async ({ page }) => {
  await page.goto('/')
  const cycle = page.locator('#background-cycle')
  const before = await cycle.getAttribute('aria-label')
  await cycle.click()
  await expect(cycle).toHaveAttribute('aria-label', /当前背景：/)
  expect(await cycle.getAttribute('aria-label')).not.toBe(before)

  await page.locator('#language-toggle').click()
  await expect(cycle).toHaveAttribute('aria-label', /Current background:/)
  await cycle.click()
  await expect(cycle).toHaveAttribute('aria-label', /Click to switch to/)
})

test('locale updates archive image alt text', async ({ page }) => {
  await page.goto('/photos')
  await page.locator('#language-toggle').click()
  await expect(page.locator('[data-archive-index]:not([hidden]) img').first()).toHaveAttribute('alt', /Selected photograph/)
})

test('archive navigation exposes the current page', async ({ page }) => {
  await page.goto('/photos')
  await expect(page.locator('.visual-archive__modes a.is-active')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.site-header .icon-link--archive.is-active')).toHaveAttribute('aria-current', 'page')
})

test('photo archive reveals more records without navigation', async ({ page }) => {
  await page.goto('/photos')

  const more = page.locator('[data-archive-more]')
  const status = page.locator('[data-archive-status]')
  await expect(more).toBeVisible()
  const beforeStatus = await status.textContent()
  const before = await page.locator('[data-archive-index]:not([hidden])').count()
  await more.click()
  const after = await page.locator('[data-archive-index]:not([hidden])').count()
  expect(after).toBeGreaterThan(before)
  await expect(status).not.toHaveText(beforeStatus || '')

  await page.locator('#language-toggle').click()
  await expect(status).toContainText('Showing')
})

test('article copy feedback and table of contents remain interactive', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  page.on('dialog', (dialog) => dialog.dismiss())
  await page.goto('/blog/ai-practice-2026-02-22')

  const copy = page.locator('.article-copy')
  await copy.click()
  await expect(copy).toHaveAttribute('data-copy-state', 'copied')
  await expect(copy.locator('.article-copy__feedback')).toBeVisible()
  await page.locator('#language-toggle').click()
  await expect(copy.locator('.article-copy__feedback .localized-text__en')).toBeVisible()
  await expect(page.locator('.article-cover img')).not.toHaveAttribute('alt', 'Article cover')
  await expect(page.locator('.article-cover img')).not.toHaveAttribute('data-alt-en')

  const tocLink = page.locator('.article-toc a').first()
  await expect(tocLink).toBeVisible()
  await expect(page.locator('.article-prose img[alt*="配图"]').first()).toBeVisible()
  await expect(page.locator('.article-prose img[alt="图像"]')).toHaveCount(0)
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(structuredData.some((value) => value.includes('BreadcrumbList'))).toBeTruthy()
  await tocLink.click()
  await expect(tocLink).toHaveAttribute('aria-current', 'location')
})

test('article media is playable or represented by accessible poster content', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-03-27')
  const media = await page.locator('.article-prose video, .article-prose audio').evaluateAll((elements) => elements.map((element) => ({
    controls: element.hasAttribute('controls'),
    source: Boolean(element.getAttribute('src') || element.querySelector('source[src]')?.getAttribute('src') || element.getAttribute('poster')),
  })))
  for (const item of media) {
    expect(item.controls).toBeTruthy()
    expect(item.source).toBeTruthy()
  }
})

test('featured stage keeps safe rel on dynamic external links', async ({ page }) => {
  await page.goto('/blog')
  const trigger = page.locator('[data-stage-trigger]').nth(1)
  await trigger.evaluate((element) => {
    element.dataset.stageExternal = 'true'
    element.dataset.stageHref = 'https://example.com/reference'
  })
  await trigger.focus()
  await expect(page.locator('[data-stage-link]')).toHaveAttribute('rel', 'noopener noreferrer')
})

test('featured stage fails closed when a dynamic target is missing', async ({ page }) => {
  await page.goto('/blog')
  const trigger = page.locator('[data-stage-trigger]').nth(1)
  await trigger.evaluate((element) => element.removeAttribute('data-stage-href'))
  await trigger.focus()
  await expect(page.locator('[data-stage-link]')).not.toHaveAttribute('href')
})

test('article exposes related reading links', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-02-22')
  await expect(page.locator('.article-related__item')).toHaveCount(3)
  await expect(page.locator('.article-related__item a').first()).toHaveAttribute('href', /\/blog\//)
})

test('featured stage keeps cover alt text when switching articles', async ({ page }) => {
  await page.goto('/blog')
  const slides = page.locator('[data-cover-slide]')
  await expect(slides).toHaveCount(4)
  await expect(slides.nth(0).locator('img')).toHaveAttribute('alt', /.+/)
  await expect(slides.nth(1).locator('img')).toHaveAttribute('alt', /.+/)
  await page.locator('[data-stage-trigger="1"]').focus()
  await expect(slides.nth(1)).toHaveClass(/is-active/)
  await expect(slides.nth(1).locator('img')).toHaveAttribute('alt', /.+/)
})

test('blog archive hides draft records and placeholder links', async ({ page }) => {
  await page.goto('/blog/archive')
  await expect(page.locator('a[href="#"]')).toHaveCount(0)
  await expect(page.locator('a[href*="personal-thinking-2026-02-14"]')).toHaveCount(0)
})

test('RSS exposes local article entries', async ({ request }) => {
  const response = await request.get('/rss.xml')
  expect(response.ok()).toBeTruthy()
  const body = await response.text()
  expect(body).toContain('<rss version="2.0">')
  expect((body.match(/<item>/g) || []).length).toBeGreaterThan(0)
  expect(body).toContain('<category>')
  expect(body).toContain('<pubDate>')
  expect(body).toContain('/blog/')
  expect(body).not.toContain('<category>ai-knowledge</category>')
})

test('static preview server rejects paths outside dist', async ({ request }) => {
  const response = await request.get('/%2e%2e/%2e%2e/package.json')
  expect(response.status()).toBe(404)
})
