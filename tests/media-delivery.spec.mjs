import { expect, test } from '@playwright/test'

const getResponsiveImageSources = (image) => image.evaluate(element => {
  const picture = element.closest('picture')
  const srcsets = [element.getAttribute('srcset'), ...[...(picture?.querySelectorAll('source[srcset]') || [])].map(source => source.getAttribute('srcset'))].filter(Boolean)
  return srcsets.flatMap(srcset => srcset.split(',').map(candidate => {
    const [src, width] = candidate.trim().split(/\s+/)
    return { src: new URL(src, document.baseURI).pathname, width: parseInt(width, 10) }
  }))
})

for (const width of [1280, 390]) {
  test(`video collections expand downward and collapse to one row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/projects')
    await expect(page.locator('[data-video-rail], [data-video-navigation]')).toHaveCount(0)
    for (const stage of await page.locator('[data-video-collection]').all()) {
      const cards = stage.locator('.project-video')
      const visible = stage.locator('.project-video:visible')
      const count = await cards.count()
      const initialCount = await visible.count()
      const more = stage.locator('[data-video-more]')
      expect(initialCount).toBeGreaterThan(0)
      const tops = await visible.evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().top)))
      expect(new Set(tops).size).toBe(1)
      if (initialCount === count) { await expect(more).toBeHidden(); continue }
      await expect(more).toHaveAttribute('aria-expanded', 'false')
      await more.click()
      await expect(visible).toHaveCount(count)
      await expect(more).toHaveAttribute('aria-expanded', 'true')
      const positions = await cards.evaluateAll(els => els.map(el => el.getBoundingClientRect().top))
      expect(positions.at(-1)).toBeGreaterThan(positions[0])
      if (await stage.locator('#brand-concept-videos').count()) await stage.screenshot({ path: `output/playwright/video-expanded-${width}.png` })
      await more.click()
      await expect(visible).toHaveCount(initialCount)
      await expect(more).toHaveAttribute('aria-expanded', 'false')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })

  test(`static posters load without requesting videos until play at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    const requested = []
    page.on('request', request => { if (request.url().endsWith('.mp4')) requested.push(request.url()) })
    await page.goto('/projects')
    const hero = page.locator('#personal-films')
    await expect(page.locator('.project-group').first()).toHaveAttribute('id', 'personal-films')
    await hero.scrollIntoViewIfNeeded()
    await expect.poll(() => hero.locator('[data-video-start] img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
    await hero.screenshot({ path: `output/playwright/video-personal-hero-${width}.png` })
    const group = page.locator('#story-ads')
    await group.scrollIntoViewIfNeeded()
    const start = group.locator('[data-video-start]').first()
    await expect(start).toBeVisible()
    await expect.poll(() => start.locator('img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
    await page.waitForLoadState('networkidle')
    expect(requested).toEqual([])
    await expect(group.locator('video').first()).toBeHidden()
    await expect(page.locator('[data-video-error]:visible')).toHaveCount(0)
    await group.screenshot({ path: `output/playwright/video-posters-${width}.png` })
    await start.click()
    const video = group.locator('video').first()
    await expect(video).toBeVisible()
    await expect(video).toHaveJSProperty('paused', false)
    await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(0)
    expect(requested.length).toBeGreaterThan(0)
    expect(requested.every(url => url.endsWith('/proxy-interview.mp4'))).toBe(true)
    await video.evaluate(el => el.pause())
  })

  test(`native video controls handle playback after opening the poster at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/projects')
    const player = page.locator('[data-video-player]').first()
    const start = player.locator('[data-video-start]')
    await start.focus()
    await start.press('Enter')
    const video = player.locator('video')
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).toHaveJSProperty('paused', false)
    await video.hover()
    await expect(page.locator('html')).not.toHaveAttribute('data-cursor-mode', 'custom')
    await video.focus()
    await video.press('Space')
    await expect(video).toHaveJSProperty('paused', true)
    await video.press('Space')
    await expect(video).toHaveJSProperty('paused', false)
    await video.evaluate(el => el.pause())
    if (width === 1280) {
      await video.evaluate(el => el.requestFullscreen())
      await expect.poll(() => video.evaluate(el => document.fullscreenElement === el)).toBe(true)
      await page.evaluate(() => document.exitFullscreen())
    }
  })
}

test('featured film title fits its column without overlapping the video in either locale', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const locale of ['en', 'zh']) {
    await page.goto(locale === 'en' ? '/en/projects' : '/projects')
    for (const width of [1570, 1280, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1244 })
      await page.evaluate(() => document.fonts.ready)
      const hero = page.locator('#personal-films')
      await hero.scrollIntoViewIfNeeded()
      const bounds = await hero.evaluate((element, language) => {
        const copy = element.querySelector('.project-video__copy').getBoundingClientRect()
        const player = element.querySelector('[data-video-player]').getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(element.querySelector(`h2 .localized-text__${language}`))
        return [...range.getClientRects()].filter(rect => rect.width > 0).map(rect => ({
          inside: rect.left >= copy.left - 1 && rect.right <= copy.right + 1,
          overlapsVideo: rect.left < player.right && rect.right > player.left && rect.top < player.bottom && rect.bottom > player.top,
        }))
      }, locale)
      expect(bounds.length).toBeGreaterThan(0)
      expect(bounds.every(line => line.inside && !line.overlapsVideo), `${locale} title at ${width}px`).toBe(true)
      if (locale === 'en' && [1570, 390].includes(width)) {
        await expect.poll(() => hero.locator('[data-video-start] img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
        await hero.screenshot({ path: `output/playwright/video-title-en-${width}.png` })
      }
    }
    await expect(page.locator('#personal-films .project-video__category, #personal-films .project-video__description')).toHaveCount(0)
  }
})

test('video loading errors appear only after play and offer a working retry', async ({ page }) => {
  await page.route('**/brand-concept-01.mp4', route => route.abort())
  await page.goto('/projects')
  const player = page.locator('#brand-concept [data-video-player]').first()
  await player.scrollIntoViewIfNeeded()
  await expect(player.locator('[data-video-error]')).toBeHidden()
  await player.locator('[data-video-start]').click()
  await expect(player.locator('[data-video-error]')).toBeVisible()
  await page.unroute('**/brand-concept-01.mp4')
  await player.locator('[data-video-retry]').click()
  await expect(player.locator('[data-video-error]')).toBeHidden()
  await expect(player.locator('video')).toHaveJSProperty('paused', false)
})

test('native mouse controls change mute and fullscreen, and a new video pauses the old one', async ({ page }) => {
  await page.setViewportSize({ width: 1483, height: 1272 })
  await page.goto('/projects')
  const players = page.locator('#brand-concept [data-video-player]')
  await players.nth(0).locator('[data-video-start]').click()
  const first = players.nth(0).locator('video')
  const second = players.nth(1).locator('video')
  const box = await first.boundingBox()
  await expect.poll(() => first.evaluate(el => el.readyState)).toBeGreaterThanOrEqual(2)
  await page.mouse.click(box.x + box.width - 120, box.y + box.height - 50)
  await expect(first).toHaveJSProperty('muted', true)
  await page.mouse.click(box.x + box.width - 72, box.y + box.height - 50)
  await expect.poll(() => first.evaluate(el => document.fullscreenElement === el)).toBe(true)
  await page.evaluate(() => document.exitFullscreen())
  await players.nth(1).locator('[data-video-start]').click()
  await expect(second).toHaveJSProperty('paused', false)
  await expect(first).toHaveJSProperty('paused', true)
})

for (const width of [1280, 390]) {
  test(`AI films have the requested categories, preserve their proportions, and play at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/projects')
    const section = page.locator('#ai-imagery')
    await expect(section.locator('.project-video-group')).toHaveCount(4)
    await expect(section.locator('#selected-films')).toHaveCount(0)
    await expect(section.locator('#story-ads > h3')).toHaveText('商业剧情广告', { useInnerText: true })
    await expect(page.locator('#personal-films h2')).toHaveText('初觉', { useInnerText: true })
    await expect(page.locator('#personal-films source')).toHaveAttribute('src', /first-awareness.mp4$/)
    for (const [id, count] of [['story-ads', 5], ['brand-concept', 4], ['product-ads', 3], ['animated-shorts', 5]]) {
      const group = section.locator(`#${id}`)
      const more = group.locator('[data-video-more]')
      if (await more.isVisible()) await more.click()
      const players = group.locator('[data-video-player]')
      await expect(players).toHaveCount(count)
      for (const player of await players.all()) {
        const video = player.locator('video')
        const ratio = await video.evaluate(el => {
          const box = el.getBoundingClientRect()
          return { actual: box.width / box.height, expected: Number(el.getAttribute('width')) / Number(el.getAttribute('height')) }
        })
        expect(ratio.actual).toBeCloseTo(ratio.expected, 2)
        await expect(video).toHaveAttribute('preload', 'none')
        await player.locator('[data-video-start]').click()
        await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(0)
        await expect(video).toHaveJSProperty('error', null)
        await video.evaluate(el => el.pause())
      }
    }
    await expect(section.locator('.project-video__source[href="https://x.com/luciusknockin/status/2098078092191465902"]')).toHaveCount(1)
    await expect(section.locator('.project-video__source[href="https://x.com/luciusknockin/status/2097011324777910578"]')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })

  test(`digital human videos expand downwards, play, and pause when collapsed at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/projects')
    const group = page.locator('#digital-humans')
    const players = group.locator('[data-video-player]')
    await expect(players).toHaveCount(9)
    const more = group.locator('[data-video-more]')
    await more.click()
    const clipNumbers = [1, 2, 3, 4, 5, 7, 8, 9, 10]
    for (let index = 0; index < clipNumbers.length; index++) {
      const player = players.nth(index)
      const video = player.locator('video')
      const number = String(clipNumbers[index]).padStart(2, '0')
      await expect(video.locator('source')).toHaveAttribute('src', `/uploads/projects/digital-human-videos/digital-human-${number}.mp4`)
      await expect(video).toHaveAttribute('preload', 'none')
      await expect(video).toHaveJSProperty('autoplay', false)
      await player.locator('[data-video-start]').click()
      await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(0)
      await expect(video).toHaveJSProperty('videoWidth', 720)
      await expect(video).toHaveJSProperty('videoHeight', 1280)
      await expect(video).toHaveJSProperty('error', null)
    }
    await more.click()
    await expect(players.last().locator('video')).toHaveJSProperty('paused', true)
    await expect(players.last()).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })
}

test('video collections remain usable without JavaScript and localize their controls', async ({ browser, baseURL, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const fallback = await context.newPage()
    await fallback.goto('/projects')
    await expect(fallback.locator('#digital-humans .project-video:visible')).toHaveCount(9)
    await expect(fallback.locator('[data-video-more]:visible, [data-video-start]:visible')).toHaveCount(0)
    const video = fallback.locator('#story-ads video').first()
    await expect(video).toBeVisible()
    await video.evaluate(async el => { el.muted = true; await el.play() })
    await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(0)
  } finally { await context.close() }
  await page.goto('/en/projects')
  await expect(page.locator('#story-ads > h3')).toHaveText('Story-led Commercials', { useInnerText: true })
  await expect(page.locator('#personal-films h2')).toHaveText('First Awareness', { useInnerText: true })
  const more = page.locator('#brand-concept [data-video-more]')
  await expect(more).toHaveText('Show more', { useInnerText: true })
  await more.focus()
  await more.press('Space')
  await expect(more).toHaveText('Show less', { useInnerText: true })
  await expect(page.locator('#story-ads [data-video-start]').first()).toHaveAccessibleName('Play: Proxy Interview')
  await page.locator('#language-toggle').click()
  await expect(more).toHaveText('收起', { useInnerText: true })
})

test('resizing a collapsed video collection recalculates its first row', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 })
  await page.goto('/projects')
  const visible = page.locator('#brand-concept .project-video:visible')
  await expect(visible).toHaveCount(2)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(visible).toHaveCount(1)
  await page.locator('#brand-concept [data-video-more]').click()
  await expect(visible).toHaveCount(4)
  await page.setViewportSize({ width: 1280, height: 844 })
  await expect(visible).toHaveCount(4)
})

test('project motion videos load on demand, play, and link to their original posts', async ({ page }) => {
  const videoRequests = []
  page.on('request', request => {
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
    await card.locator('[data-video-start]').click()
    await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(0)
    await expect(video).toHaveJSProperty('videoWidth', 1920)
    await expect(video).toHaveJSProperty('videoHeight', 1080)
    const midpoint = await video.evaluate(el => {
      el.pause()
      el.currentTime = el.duration / 2
      return el.duration / 2
    })
    await expect.poll(() => video.evaluate(el => el.seeking)).toBe(false)
    await expect.poll(() => video.evaluate(el => el.currentTime)).toBeCloseTo(midpoint, 0)
    await expect(video).toHaveJSProperty('error', null)
  }
})

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

for (const width of [1280, 375]) {
  test(`resource Lucide cover loads responsive images on demand without original PNGs at ${width}px`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 844 }, hasTouch: width === 375, reducedMotion: 'reduce' })
    try {
      const page = await context.newPage()
      const requested = new Set()
      page.on('request', request => { if (request.resourceType() === 'image') requested.add(new URL(request.url()).pathname) })
      // Native lazy loading prefetches beyond the viewport. Set the real card's distance
      // before HTML parsing so this check does not depend on OS fonts or page length.
      await page.route('**/resources', async route => {
        const response = await route.fetch()
        const html = await response.text()
        await route.fulfill({ response, body: html.replace('</head>', '<style>#resource-lucide { margin-block-start: 12000px; }</style></head>') })
      })
      await page.goto('/resources')
      const cover = page.locator('#resource-lucide .resource-card__primary img')
      await expect(cover).toHaveAttribute('loading', 'lazy')
      await expect(cover).toHaveAttribute('decoding', 'async')
      const sources = await getResponsiveImageSources(cover)
      expect(sources.length).toBeGreaterThan(1)
      expect(sources.every(source => Number.isFinite(source.width))).toBe(true)
      await page.waitForLoadState('networkidle')
      expect(await cover.evaluate(element => element.getBoundingClientRect().top - innerHeight)).toBeGreaterThan(10_000)
      for (const source of sources) expect(requested.has(source.src)).toBe(false)

      await cover.scrollIntoViewIfNeeded()
      await expect.poll(() => cover.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true)
      const current = await cover.evaluate(element => new URL(element.currentSrc).pathname)
      expect(sources.map(source => source.src)).toContain(current)
      expect(requested.has(current)).toBe(true)
      expect(current).toMatch(/\.(?:avif|webp)$/)
      await expect(cover).toHaveAttribute('alt', /\S/)
      await expect(cover).toHaveAttribute('width', /^\d+$/)
      await expect(cover).toHaveAttribute('height', /^\d+$/)
      await expect(cover).toHaveCSS('object-fit', 'contain')
      const originals = [...requested].filter(source => /^\/uploads\/(?:blog|projects|resources)\/.*\.png$/i.test(source))
      expect(originals).toEqual([])
    } finally {
      await context.close()
    }
  })
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
