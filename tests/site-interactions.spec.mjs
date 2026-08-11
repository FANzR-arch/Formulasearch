import { expect, test } from '@playwright/test'

test('mobile navigation traps focus and restores it on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')

  const toggle = page.locator('#mobile-navigation-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#site-navigation')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toBeFocused()
})

test('locale and theme controls update document metadata', async ({ page }) => {
  await page.goto('/projects')

  await page.locator('#language-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle(/Projects/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Phil's products/)

  await page.locator('#theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-pressed', 'true')
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
  await expect(copy).toContainText(/Copied|已复制/)

  const tocLink = page.locator('.article-toc a').first()
  await expect(tocLink).toBeVisible()
  await tocLink.click()
  await expect(tocLink).toHaveAttribute('aria-current', 'location')
})
