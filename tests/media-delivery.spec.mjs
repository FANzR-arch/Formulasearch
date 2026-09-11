import { expect, test } from '@playwright/test'

for (const width of [1280, 390]) {
  test(`video rail arrows replace scrollbars at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/projects')
    for (const stage of await page.locator('[data-video-rail]').all()) {
      const rail = stage.locator('.project-videos--rail')
      await expect(rail).toHaveCSS('scrollbar-width', 'none')
      const overflow = await rail.evaluate(el => el.scrollWidth > el.clientWidth + 2)
      const nav = stage.locator('[data-video-navigation]')
      if (!overflow) { await expect(nav).toBeHidden(); continue }
      await expect(nav).toBeVisible()
      const next = stage.locator('[data-video-next]')
      const previous = stage.locator('[data-video-previous]')
      await expect(previous).toBeDisabled()
      await next.click()
      await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
      await expect(previous).toBeEnabled()
      await previous.click()
      await expect(previous).toBeDisabled()
      await rail.evaluate(el => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }))
      await expect(next).toBeDisabled()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })
}

test('video chrome appears only on hover or focus and scrollbar uses one cursor', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.locator('video[controls]')).toHaveCount(0)
  const player = page.locator('[data-video-player]').first()
  const button = player.locator('button')
  const video = player.locator('video')
  await player.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await expect(player.locator('.project-video__play')).toHaveCSS('opacity', '0')
  await button.hover()
  await expect(player.locator('.project-video__play')).toHaveCSS('opacity', '1')
  await expect(page.locator('html')).toHaveAttribute('data-cursor-mode', 'custom')
  await button.click()
  await expect(video).toHaveJSProperty('paused', false)
  await button.click()
  await expect(video).toHaveJSProperty('paused', true)
  await button.focus()
  await button.press('Space')
  await expect(video).toHaveJSProperty('paused', false)
  await button.press('Space')
  const rail = page.locator('#brand-concept .project-videos--rail')
  const bar = await rail.evaluate(el => {
    const rect = el.getBoundingClientRect()
    return { x: rect.left + 50, y: rect.bottom - 2, size: el.offsetHeight - el.clientHeight }
  })
  if (bar.size > 2) {
    await page.mouse.move(bar.x, bar.y)
    await expect(page.locator('html')).not.toHaveAttribute('data-cursor-mode', 'custom')
    await expect(page.locator('[data-site-cursor]')).toHaveCSS('opacity', '0')
  }
})

for (const width of [1280, 390]) {
  test(`AI films are grouped, keep their proportions, and play at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/projects')
    const section = page.locator('#ai-imagery')
    await expect(section.locator('.project-video-group')).toHaveCount(4)
    await expect(section.locator('.project-showcase')).toHaveCount(0)
    for (const [id, count] of [['brand-concept', 4], ['story-ads', 2], ['product-ads', 3], ['animated-shorts', 5]]) {
      const videos = section.locator(`#${id} video`)
      await expect(videos).toHaveCount(count)
      const heights = await videos.evaluateAll((els) => els.map(el => el.getBoundingClientRect().height))
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(3)
      for (const video of await videos.all()) {
        await expect(video).toHaveAttribute('preload', 'none')
        await video.scrollIntoViewIfNeeded()
        await video.evaluate(async el => { el.muted = true; await el.play() })
        await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(0)
        await expect(video).toHaveJSProperty('error', null)
        await video.evaluate(el => { if (el instanceof HTMLVideoElement) el.pause() })
      }
    }
    await expect(section.locator('.project-video__source[href="https://x.com/luciusknockin/status/2098078092191465902"]')).toHaveCount(1)
    await expect(section.locator('.project-video__source[href="https://x.com/luciusknockin/status/2097011324777910578"]')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })
}

for (const width of [1280, 390]) {
  test(`digital human videos stay in one scrollable row and play at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/projects')
    const rail = page.locator('#digital-humans .project-videos--rail')
    const videos = rail.locator('video')
    await expect(videos).toHaveCount(9)
    await expect(rail.locator('source[src$="digital-human-06.mp4"]')).toHaveCount(0)
    await expect(page.locator('#digital-humans .project-showcase')).toHaveCount(0)
    const layout = await rail.evaluate((element) => ({
      overflows: element.scrollWidth > element.clientWidth,
      tops: [...element.querySelectorAll('.project-video')].map((card) => card.getBoundingClientRect().top),
    }))
    expect(layout.overflows).toBe(true)
    expect(new Set(layout.tops).size).toBe(1)
    await rail.scrollIntoViewIfNeeded()
    await rail.focus()
    await rail.press('ArrowRight')
    await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
    const clipNumbers = [1, 2, 3, 4, 5, 7, 8, 9, 10]
    for (let index = 0; index < clipNumbers.length; index++) {
      const video = videos.nth(index)
      const number = String(clipNumbers[index]).padStart(2, '0')
      await expect(video.locator('source')).toHaveAttribute('src', `/uploads/projects/digital-human-videos/digital-human-${number}.mp4`)
      await expect(video).toHaveAttribute('preload', 'none')
      await expect(video).toHaveJSProperty('autoplay', false)
      await video.scrollIntoViewIfNeeded()
      await video.evaluate(async (element) => {
        if (!(element instanceof HTMLVideoElement)) throw new Error('Expected a video player')
        element.muted = true
        await element.play()
      })
      await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(0)
      await expect(video).toHaveJSProperty('videoWidth', 720)
      await expect(video).toHaveJSProperty('videoHeight', 1280)
      await video.evaluate((element) => { if (element instanceof HTMLVideoElement) element.pause() })
      await expect(video).toHaveJSProperty('error', null)
    }
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(pageOverflow).toBe(false)
  })
}

test('project motion videos load on demand, play, and link to their original posts', async ({ page }) => {
  const videoRequests = []
  page.on('request', (request) => {
    if (request.url().includes('/code-motion/') && request.url().endsWith('.mp4')) videoRequests.push(request.url())
  })
  await page.goto('/projects')
  const cards = page.locator('#code-video .project-video')
  await expect(cards).toHaveCount(2)
  await expect(page.locator('#code-video h2')).toContainText('程序化动效视频')
  expect(videoRequests).toHaveLength(0)
  const originalPosts = [
    'https://x.com/Formulasearch/status/2098377897790861459',
    'https://x.com/luciusknockin/status/2096650450087092621?s=20',
  ]
  for (const [index, sourceUrl] of originalPosts.entries()) {
    const card = cards.nth(index)
    const video = card.locator('video')
    await expect(card.locator('.project-video__source')).toHaveAttribute('href', sourceUrl)
    await expect(video).toHaveAttribute('preload', 'none')
    await expect(video).toHaveJSProperty('autoplay', false)
    await video.scrollIntoViewIfNeeded()
    await video.evaluate(async (element) => { element.muted = true; await element.play() })
    await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(0)
    await expect(video).toHaveJSProperty('videoWidth', 1920)
    await expect(video).toHaveJSProperty('videoHeight', 1080)
    const midpoint = await video.evaluate((element) => {
      if (!(element instanceof HTMLVideoElement)) throw new Error('Expected a video player')
      element.pause()
      element.currentTime = element.duration / 2
      return element.duration / 2
    })
    await expect.poll(() => video.evaluate((element) => element instanceof HTMLVideoElement && element.seeking)).toBe(false)
    await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeCloseTo(midpoint, 0)
    await expect(video).toHaveJSProperty('error', null)
  }
})

for (const theme of ['light', 'dark']) {
  for (const pathname of ['/', '/lab']) {
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
      if (pathname === '/lab') {
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
    for (const pathname of ['/', '/lab']) {
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
