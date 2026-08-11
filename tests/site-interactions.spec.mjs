import { expect, test } from '@playwright/test'

test('mobile navigation traps focus and restores it on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')

  const toggle = page.locator('#mobile-navigation-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
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

test('photo archive reveals more records without navigation', async ({ page }) => {
  await page.goto('/photos')

  const more = page.locator('[data-archive-more]')
  await expect(more).toBeVisible()
  const before = await page.locator('[data-archive-index]:not([hidden])').count()
  await more.click()
  const after = await page.locator('[data-archive-index]:not([hidden])').count()
  expect(after).toBeGreaterThan(before)
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

  const tocLink = page.locator('.article-toc a').first()
  await expect(tocLink).toBeVisible()
  await expect(page.locator('.article-prose img[alt*="配图"]').first()).toBeVisible()
  await expect(page.locator('.article-prose img[alt="图像"]')).toHaveCount(0)
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(structuredData.some((value) => value.includes('BreadcrumbList'))).toBeTruthy()
  await tocLink.click()
  await expect(tocLink).toHaveAttribute('aria-current', 'location')
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
