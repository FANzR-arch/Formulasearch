import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Asia/Taipei' })

for (const [time, theme] of [
  ['2026-09-30T06:59:00+08:00', 'dark'],
  ['2026-09-30T07:00:00+08:00', 'light'],
  ['2026-09-30T18:59:00+08:00', 'light'],
  ['2026-09-30T19:00:00+08:00', 'dark'],
]) {
  test(`local time ${time} selects ${theme} before the intro`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(time))
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-pressed', String(theme === 'dark'))
    expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe(
      await page.locator('html').getAttribute(`data-theme-color-${theme}`),
    )
    expect(await page.evaluate(() => localStorage.getItem('formulasearch-theme'))).toBeNull()
    // System changes must no longer override the local-time decision.
    await page.emulateMedia({ colorScheme: theme })
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  })
}

test('the same instant follows the visitor timezone', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'America/Los_Angeles' })
  try {
    const page = await context.newPage()
    // Taipei is 11:00 (light); Los Angeles is 20:00 on the preceding day (dark).
    await page.clock.setFixedTime(new Date('2026-09-30T03:00:00Z'))
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  } finally { await context.close() }
})

test('manual choice survives reload and a different time of day', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.setFixedTime(new Date('2026-09-30T12:00:00+08:00'))
  await page.goto('/')
  await page.locator('#theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.clock.setFixedTime(new Date('2026-09-30T22:00:00+08:00'))
  await page.locator('#theme-toggle').click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('unavailable storage still allows time-based selection', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-30T22:00:00+08:00'))
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked') } })
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
