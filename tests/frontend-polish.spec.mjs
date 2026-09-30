import { expect, test } from '@playwright/test'

// Run in one worker: fanning these media-heavy pages out in parallel starves the
// timing-sensitive autoplay check in generative-hover-type.spec.mjs on local machines.
test.describe.configure({ mode: 'default' })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('formulasearch-intro-seen', 'true'))
})

test('mobile article TOC starts collapsed, keeps the body close, and closes after a jump', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog/minimax-h3-skills-examples')
  const toc = page.locator('.article-toc')
  await expect(toc).not.toHaveAttribute('open')
  await expect(toc.locator('.article-toc__count')).toHaveText(/^\d+$/)
  expect(await toc.evaluate((el) => el.getBoundingClientRect().height)).toBeLessThan(80)
  const bodyTop = await page.locator('.article-prose h2').first().evaluate((el) => el.getBoundingClientRect().top + scrollY)
  expect(bodyTop).toBeLessThan(844 * 1.6)

  await toc.locator('summary').click()
  await expect(toc).toHaveAttribute('open', '')
  const link = toc.locator('nav a').nth(2)
  const href = await link.getAttribute('href')
  await link.click()
  await expect(toc).not.toHaveAttribute('open')
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe(decodeURIComponent(href))
  const targetTop = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top, decodeURIComponent(href.slice(1)))
  expect(targetTop).toBeGreaterThanOrEqual(0)
  expect(targetTop).toBeLessThan(844)
})

test('desktop article TOC stays open beside the text', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/blog/minimax-h3-skills-examples')
  await expect(page.locator('.article-toc')).toHaveAttribute('open', '')
  await expect(page.locator('.article-toc nav a').first()).toBeVisible()
})

test('skills stack lets touch scroll vertically, follows keyboard focus, and shows its position', async ({ page }) => {
  await page.goto('/skills')
  const gallery = page.locator('[data-skill-gallery]').first()
  const topDrag = gallery.locator('[data-skill-active="true"] [data-skill-drag]')
  expect(await topDrag.evaluate((el) => getComputedStyle(el).touchAction)).toBe('pan-y')

  const counter = page.locator('.skill-gallery__counter').first()
  await expect(counter).toContainText('01')
  await topDrag.focus()
  await page.keyboard.press('ArrowRight')
  await expect(counter.locator('[data-skill-current]')).not.toHaveText('01')
  const focused = await page.evaluate(() => ({
    active: document.activeElement?.closest('[data-skill-card]')?.getAttribute('data-skill-active'),
    hidden: document.activeElement?.getAttribute('aria-hidden'),
  }))
  expect(focused).toEqual({ active: 'true', hidden: 'false' })
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => document.activeElement?.closest('[data-skill-card]')?.getAttribute('data-skill-active'))).toBe('true')
})

test('photo viewer steps through the archive by button and keyboard and returns to the last photo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/photos')
  const dialog = page.locator('[data-photo-lightbox]')
  const position = dialog.locator('[data-photo-lightbox-position]')
  await page.locator('[data-photo-open]').first().click()
  await expect(dialog).toHaveAttribute('open', '')
  await expect(position).toHaveText(/^01 \/ \d{2}$/)
  const total = (await position.textContent()).split('/')[1].trim()

  await dialog.locator('[data-photo-lightbox-step="1"]').click()
  await expect(position).toHaveText(`02 / ${total}`)
  await expect(dialog.locator('[data-photo-lightbox-image]')).toHaveAttribute('src', /photo-002\.webp$/)
  await page.keyboard.press('ArrowRight')
  await expect(position).toHaveText(`03 / ${total}`)
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(position).toHaveText(`${total} / ${total}`)
  await expect(dialog.locator('[data-photo-lightbox-title]')).toHaveText(`照片 ${total}`)

  await page.keyboard.press('Escape')
  await expect(dialog).not.toHaveAttribute('open')
  const returned = await page.evaluate(() => {
    const active = document.activeElement
    const rect = active.getBoundingClientRect()
    return { index: active.getAttribute('data-photo-index'), visible: rect.bottom > 0 && rect.top < innerHeight }
  })
  expect(returned).toEqual({ index: total, visible: true })
})

test('photo viewer steps on a horizontal touch swipe without closing', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.addInitScript(() => sessionStorage.setItem('formulasearch-intro-seen', 'true'))
  await page.goto('/photos')
  await page.locator('[data-photo-open]').first().click()
  const dialog = page.locator('[data-photo-lightbox]')
  await expect(dialog.locator('[data-photo-lightbox-position]')).toHaveText(/^01 /)
  const box = await dialog.locator('.photo-lightbox__media').boundingBox()
  const y = box.y + box.height / 2
  await dialog.locator('.photo-lightbox__media').evaluate((media, { x1, x2, y }) => {
    const fire = (type, x) => media.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', clientX: x, clientY: y, bubbles: true }))
    fire('pointerdown', x1)
    fire('pointerup', x2)
    media.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x2, clientY: y }))
  }, { x1: box.x + box.width * 0.8, x2: box.x + box.width * 0.2, y })
  await expect(dialog.locator('[data-photo-lightbox-position]')).toHaveText(/^02 /)
  await expect(dialog).toHaveAttribute('open', '')
  await context.close()
})

test('reduced motion collapses transitions site-wide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/skills')
  const durations = await page.evaluate(() => [
    '.skill-gallery > li',
    '.skill-gallery__shuffle',
    '.catalog-section__media img',
  ].flatMap((selector) => [...document.querySelectorAll(selector)].slice(0, 1))
    .map((element) => Math.max(...getComputedStyle(element).transitionDuration.split(',').map((value) => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)))))
  expect(durations.length).toBeGreaterThan(0)
  for (const duration of durations) expect(duration).toBeLessThan(1)
})

test('project detail defers hidden carousel slides and surfaces the live version early', async ({ page }) => {
  const requested = []
  page.on('request', (request) => { if (request.resourceType() === 'image') requested.push(new URL(request.url()).pathname) })
  await page.goto('/projects/briank')
  const slides = page.locator('[data-project-slide] img')
  const count = await slides.count()
  expect(count).toBeGreaterThan(3)
  await expect(slides.first()).toHaveAttribute('srcset', /\.webp \d+w/)
  // Only the first slide and its two neighbours may load before the visitor browses.
  await expect.poll(() => page.locator('[data-project-slide] img[data-src]').count()).toBe(count - 3)
  expect(requested.filter((path) => /\/uploads\/projects\/.+\.(png|jpe?g)$/.test(path))).toEqual([])

  // Moving to slide 2 pulls in slide 3 as the new neighbour.
  await page.locator('[data-project-carousel-next]').click()
  await expect(page.locator('[data-project-slide] img[data-src]')).toHaveCount(count - 4)
  await expect(page.locator('[data-project-slide].is-active img')).toHaveJSProperty('complete', true)

  const tryLink = page.locator('.project-detail__utility .project-detail__try')
  await expect(tryLink).toHaveAttribute('href', /^https:\/\//)
  await expect(tryLink).toHaveAttribute('target', '_blank')
  expect(await tryLink.evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(await page.locator('.project-detail__cover').evaluate((el) => el.getBoundingClientRect().top))
})

test('interface sounds are downloaded once per file', async ({ page }) => {
  const wavRequests = []
  page.on('request', (request) => { if (request.url().endsWith('.wav')) wavRequests.push(new URL(request.url()).pathname) })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(wavRequests).toEqual(['/audio/kenney-interface/click3.wav'])
})
