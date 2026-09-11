import { expect, test } from '@playwright/test'

test('closing a photo during expansion keeps its visible pose continuous', async ({ page }) => {
  await page.goto('/photos')
  await page.locator('[data-photo-open]').first().click()
  const image = page.locator('[data-photo-lightbox-image]')
  await expect.poll(() => image.evaluate(el => el.getAnimations().length)).toBeGreaterThan(0)
  const poses = await image.evaluate(el => {
    const animation = el.getAnimations()[0]
    animation.pause()
    animation.currentTime = 100
    const rect = () => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }
    const before = rect()
    el.closest('dialog').dispatchEvent(new Event('cancel', { cancelable: true }))
    return { before, after: rect() }
  })
  for (const key of ['x', 'y', 'width', 'height']) expect(Math.abs(poses.before[key] - poses.after[key])).toBeLessThan(1)
  await expect(page.locator('[data-photo-lightbox]')).not.toHaveAttribute('open')
  await page.locator('[data-photo-open]').nth(1).click()
  await expect(page.locator('[data-photo-lightbox]')).toHaveAttribute('open', '')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-photo-lightbox]')).not.toHaveAttribute('open')
})

test('long article TOC stays inside short desktop viewports and its final link is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/blog/ai-practice-2026-02-22')
  const toc = page.locator('.article-toc')
  expect(await toc.evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(696)
  const last = toc.locator('a').last()
  const href = await last.getAttribute('href')
  await last.click()
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe(href)
})

test('scroll indicator follows document progress without changing inherited page styles', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-02-22')
  await page.mouse.move(1100, 500)
  await page.mouse.wheel(0, 600)
  const rail = page.locator('[data-scroll-progress]')
  await expect.poll(() => rail.evaluate(el => Number(getComputedStyle(el).getPropertyValue('--scroll-progress')))).toBeGreaterThan(0)
  const state = await rail.evaluate(el => ({
    progress: Number(getComputedStyle(el).getPropertyValue('--scroll-progress')),
    expected: scrollY / (document.documentElement.scrollHeight - innerHeight),
    root: getComputedStyle(document.documentElement).getPropertyValue('--scroll-progress'),
    child: getComputedStyle(document.querySelector('main')).getPropertyValue('--scroll-progress'),
    scale: new DOMMatrix(getComputedStyle(el, '::after').transform).d,
  }))
  expect(state.root).toBe('')
  expect(state.child).toBe('')
  expect(state.progress).toBeCloseTo(state.expected, 2)
  expect(state.scale).toBeCloseTo(state.progress, 4)
})
