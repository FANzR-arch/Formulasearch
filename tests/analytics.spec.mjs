import { expect, test } from '@playwright/test'

const origin = 'https://rzcthink.top'
const measurementId = 'G-18WV54GK34'
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321'

test.afterEach(async ({ context }) => {
  await context.unrouteAll({ behavior: 'ignoreErrors' })
})

// Serve the real production build at its public origin while intercepting every external request.
// The Google tag mock consumes the same command queue; no test visits reach GA4.
const prepare = async (page, context) => {
  const calls = []
  await page.exposeFunction('captureAnalytics', args => calls.push(args))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === 'www.googletagmanager.com') {
      await route.fulfill({ contentType: 'text/javascript', body: `
        window.dataLayer.forEach(args => window.captureAnalytics(Array.from(args)));
        window.dataLayer.push = function(args) {
          window.captureAnalytics(Array.from(args));
          return Array.prototype.push.call(this, args);
        };
      ` })
    } else if (url.origin === origin) {
      const response = await route.fetch({ url: base + url.pathname + url.search })
      await route.fulfill({ response })
    } else if (url.origin === new URL(base).origin) {
      await route.continue()
    } else await route.abort()
  })
  return calls
}
const events = (calls, name) => calls.filter(call => call[0] === 'event' && (!name || call[1] === name))

test('production queues one page view and strips URL parameters; prefetch does not add visits', async ({ page, context }) => {
  const calls = await prepare(page, context)
  await page.goto(`${origin}/?email=private@example.com#private-token`)
  await expect.poll(() => events(calls, 'page_view').length).toBe(1)
  const config = calls.find(call => call[0] === 'config')
  expect(config[1]).toBe(measurementId)
  expect(config[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
  // Exercise browser prefetch without depending on the separate navigation-loading feature.
  await Promise.all([
    page.waitForResponse(response => response.url() === `${origin}/about?analytics-prefetch-test=1`),
    page.evaluate(() => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = '/about?analytics-prefetch-test=1'
      document.head.append(link)
    }),
  ])
  expect(events(calls, 'page_view')).toHaveLength(1)
  expect(JSON.stringify(calls)).not.toContain('private@')
  expect(JSON.stringify(calls)).not.toContain('private-token')
  expect(events(calls, 'page_view')[0][2].page_location).toBe(`${origin}/`)
})

test('navigation and content clicks identify their destination without extra page views', async ({ page, context }) => {
  const calls = await prepare(page, context)
  await page.goto(origin)
  await page.locator('.nav-link[href="/projects"]').click()
  await expect(page).toHaveURL(`${origin}/projects`)
  await expect.poll(() => events(calls, 'navigation_click').length).toBe(1)
  expect(events(calls, 'navigation_click')[0][2]).toMatchObject({ content_id: '/projects', placement: 'navigation' })
  const card = page.locator('.project-card--linked').first()
  const path = await card.getAttribute('href')
  await card.click()
  await expect.poll(() => events(calls, 'content_click').length).toBe(1)
  expect(events(calls, 'content_click')[0][2].content_id).toBe(path)
  await expect.poll(() => events(calls, 'page_view').length).toBe(3)
})

test('keyword opening and contact intent are counted, closing and input text are not', async ({ page, context }) => {
  const calls = await prepare(page, context)
  await page.goto(origin)
  const keyword = page.locator('button[data-highlight-label="构建者"]')
  await keyword.click()
  await expect.poll(() => events(calls, 'keyword_open').length).toBe(1)
  await keyword.click()
  expect(events(calls, 'keyword_open')).toHaveLength(1)
  await page.locator('[data-wechat-open]').click()
  await expect.poll(() => events(calls, 'contact_click').length).toBe(1)
  expect(events(calls, 'contact_click')[0][2].content_id).toBe('wechat')
  expect(JSON.stringify(calls)).not.toContain('@gmail.com')
  expect(JSON.stringify(calls)).not.toContain('wechat-qr')
})

test('external content links discard tracking queries', async ({ page, context }) => {
  const calls = await prepare(page, context)
  await page.goto(`${origin}/projects`)
  const link = page.locator('#code-video .project-video__source').last()
  const href = new URL(await link.getAttribute('href'))
  // Keep this test in its document; the analytics handler sees the click before this window handler.
  await page.evaluate(() => window.addEventListener('click', event => event.preventDefault(), { once: true }))
  await link.click()
  await expect.poll(() => events(calls, 'outbound_click').length).toBe(1)
  expect(events(calls, 'outbound_click')[0][2].content_id).toBe(href.origin + href.pathname)
})

test('real playback is counted once, without counting poster hover or pause/resume', async ({ page, context }) => {
  const calls = await prepare(page, context)
  await page.goto(`${origin}/projects`)
  const video = page.locator('#code-video video').first()
  await video.hover()
  expect(events(calls, 'video_start')).toHaveLength(0)
  await video.evaluate(async video => { video.muted = true; await video.play() })
  await expect.poll(() => events(calls, 'video_start').length).toBe(1)
  await video.evaluate(video => video.pause())
  await video.evaluate(video => video.play())
  await expect.poll(() => video.evaluate(video => video.paused)).toBe(false)
  expect(events(calls, 'video_start')).toHaveLength(1)
  await video.evaluate(video => { video.pause(); video.removeAttribute('src'); video.querySelectorAll('source').forEach(source => source.remove()); video.load() })
})

test('article attention excludes hidden time and records reading milestones only once', async ({ page, context }) => {
  const calls = await prepare(page, context)
  await page.clock.install()
  await page.goto(`${origin}/blog/less-is-more-2026-05-16`)
  await expect(page.locator('.article-prose')).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(35000)
  expect(events(calls, 'content_engaged')).toHaveLength(0)
  expect(events(calls, 'content_progress')).toHaveLength(0)
  await page.evaluate(() => {
    delete document.hidden
    document.dispatchEvent(new Event('visibilitychange'))
    window.scrollTo(0, document.querySelector('.article-prose').getBoundingClientRect().bottom + scrollY - innerHeight + 5)
  })
  await page.bringToFront()
  await page.clock.runFor(32000)
  await expect.poll(() => events(calls, 'content_engaged').length).toBe(1)
  await expect.poll(() => events(calls, 'content_progress').length).toBe(4)
  expect(events(calls, 'content_progress').map(call => call[2].percent_scrolled)).toEqual([25, 50, 75, 100])
  await page.clock.runFor(10000)
  expect(events(calls, 'content_engaged')).toHaveLength(1)
  expect(events(calls, 'content_progress')).toHaveLength(4)
})

test('local previews do not load Google or queue analytics', async ({ page, context }) => {
  const calls = await prepare(page, context)
  await page.goto(base)
  expect(await page.evaluate(() => window.dataLayer || [])).toEqual([])
  expect(calls).toEqual([])
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0)
})

test('blocking Google does not block navigation or contact controls', async ({ page, context }) => {
  await prepare(page, context)
  await page.route('https://www.googletagmanager.com/**', route => route.abort())
  await page.goto(origin)
  await page.locator('[data-wechat-open]').click()
  await expect(page.locator('#wechat-contact-dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.locator('.nav-link[href="/projects"]').click()
  await expect(page).toHaveURL(`${origin}/projects`)
})
