import { expect, test } from '@playwright/test'

const skipIntro = page => page.addInitScript(() => {
  sessionStorage.setItem('formulasearch-intro-seen', 'true')
  localStorage.setItem('formulasearch-locale', 'zh')
})

test('clicked portrait shrinks on pointer leave while keyboard access remains usable', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/')
  const portrait = page.locator('.home-avatar__frame:visible')
  const avatar = page.locator('[data-ai-avatar]:visible')
  test.skip(await avatar.count() === 0, 'PersonalAI is not configured in this build')
  await portrait.click()
  await expect(portrait).toHaveAttribute('aria-expanded', 'true')
  await page.mouse.move(10, 400)
  await expect(portrait).toHaveAttribute('aria-expanded', 'false')
  await expect.poll(() => portrait.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBe(1)
  await expect(avatar.locator('[data-ai-open]')).toBeHidden()
  await portrait.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(portrait).toBeFocused()
  await expect(portrait).toHaveAttribute('aria-expanded', 'true')
  await expect(avatar.locator('[data-ai-open]')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(avatar.locator('[data-ai-open]')).toBeFocused()
})

test('keyword lines recover within the same keyword after blur, and repeated exits clear them', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/')
  const keyword = page.locator('button[data-highlight-label="构建者"]')
  const svg = page.locator('[data-home-connections]')
  for (let i = 0; i < 3; i++) {
    await keyword.hover()
    await expect(svg.locator('path')).toHaveCount(4)
    await expect(svg).toHaveCSS('opacity', '1')
    await page.mouse.move(10, 400)
    await expect(svg.locator('path')).toHaveCount(0)
  }
  await keyword.hover()
  await expect(svg.locator('path')).toHaveCount(4)
  const countAfterBlur = await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'))
    // A synthetic blur leaves the real pointer in the window. Assert its reset
    // before a browser-generated pointerover can legitimately restore the lines.
    return document.querySelector('[data-home-connections]').querySelectorAll('path').length
  })
  expect(countAfterBlur).toBe(0)
  const rect = await keyword.boundingBox()
  await page.mouse.move(rect.x + rect.width / 2 + 2, rect.y + rect.height / 2)
  await expect(svg.locator('path')).toHaveCount(4)
  await expect(svg).toHaveCSS('opacity', '1')
  await expect.poll(() => svg.evaluate(el => el.getAnimations({ subtree: true }).every(animation => animation.playState === 'finished'))).toBe(true)
  await page.screenshot({ path: 'output/playwright/home-keyword-feedback.png' })
})

test('intro waits for a delayed visible portrait before starting the logo zoom', async ({ page }) => {
  const clockStart = new Date('2026-10-01T12:00:00Z')
  await page.clock.install({ time: clockStart })
  await page.clock.pauseAt(clockStart)
  await page.addInitScript(() => localStorage.setItem('formulasearch-theme', 'light'))
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route(/profile-light.*\.(webp|png)|\/_image\?.*profile-light/, async route => { await gate; await route.continue() })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const overlay = page.locator('#intro-overlay')
  try {
    await expect(overlay).toBeVisible()
    // The opaque intro covers a painted homepage, so revealing it needs no first render.
    await expect(page.locator('#site-page')).toHaveCSS('opacity', '1')
    // The logo stays solid while the visible first-screen image is pending.
    // Test the readiness deadlines without replaying every ambient WebGL/logo frame.
    await page.clock.fastForward(1100)
    await expect(overlay).not.toHaveClass(/is-ready/)
    await expect(page.locator('.intro-mark > .intro-mark__motion')).toHaveCSS('animation-name', 'none')
    await expect(page.locator('.intro-mark__solid')).toHaveCSS('opacity', '1')
    await expect(page.locator('.intro-mark__solid')).not.toHaveCSS('fill', 'none')
    expect(await page.locator('.intro-mark__solid').evaluate(el => getComputedStyle(el).fill)).toBe(
      await page.locator('.intro-field').evaluate(el => getComputedStyle(el).fill))
    await expect(page.locator('.intro-mark__cutout')).toHaveCSS('opacity', '0')
  } finally { release() }
  await expect(page.locator('.home-avatar__image:visible')).toHaveJSProperty('complete', true)
  await expect(overlay).not.toHaveClass(/is-ready/)
  await page.clock.fastForward(2800)
  await expect(overlay).toHaveClass(/is-ready/)
  const windowPhase = await page.evaluate(() => {
    const overlay = document.querySelector('#intro-overlay')
    const animations = overlay.getAnimations({ subtree: true })
    animations.forEach(animation => { animation.pause(); animation.currentTime = 920 })
    return {
      solid: getComputedStyle(overlay.querySelector('.intro-mark__solid')).opacity,
      cutout: getComputedStyle(overlay.querySelector('.intro-mark__cutout')).opacity,
      outline: getComputedStyle(overlay.querySelector('.intro-mark__line')).opacity,
      scale: getComputedStyle(overlay.querySelector('.intro-mark > .intro-mark__motion')).transform,
      pageOpacity: getComputedStyle(document.querySelector('#site-page')).opacity,
    }
  })
  expect(windowPhase).toEqual({ solid: '0', cutout: '1', outline: '0.25', scale: 'none', pageOpacity: '1' })
  await page.screenshot({ path: 'output/playwright/home-intro-window.png' })
  await page.evaluate(() => document.querySelector('#intro-overlay').getAnimations({ subtree: true }).forEach(animation => {
    if (animation.animationName === 'logo-zoom') animation.currentTime = 1900
  }))
  await page.screenshot({ path: 'output/playwright/home-intro-expanding.png' })
  await page.evaluate(() => document.querySelector('#intro-overlay').getAnimations({ subtree: true }).forEach(animation => animation.play()))
  // Each jump reaches one chained timer; a single jump would start the next
  // timeout at its destination and would not exercise the removal deadline.
  await page.clock.fastForward(3200)
  await page.clock.fastForward(450)
  await expect(overlay).toHaveCount(0)
  await expect(page.locator('#site-page')).toHaveCSS('opacity', '1')
})

test('intro cannot trap a visitor when a first-screen image never responds', async ({ page }) => {
  const clockStart = new Date('2026-10-01T12:00:00Z')
  await page.clock.install({ time: clockStart })
  await page.clock.pauseAt(clockStart)
  await page.addInitScript(() => localStorage.setItem('formulasearch-theme', 'light'))
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route(/profile-light.*\.(webp|png)|\/_image\?.*profile-light/, async route => { await gate; await route.abort() })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const overlay = page.locator('#intro-overlay')
    await page.clock.fastForward(3000)
    await expect(overlay).not.toHaveClass(/is-ready/)
    await page.clock.fastForward(800)
    await expect(overlay).toHaveClass(/is-ready/)
    await page.clock.fastForward(3200)
    await expect(overlay).toHaveClass(/is-exiting/)
    await page.clock.fastForward(450)
    await expect(overlay).toHaveCount(0)
    await expect(page.locator('#site-page')).toHaveCSS('opacity', '1')
  } finally { release() }
})

test('reduced motion and mobile touch retain their expected behavior', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  try {
    await page.goto('/')
    await expect(page.locator('#intro-overlay')).toHaveCount(0)
    await expect(page.locator('[data-home-connections]')).toBeHidden()
    const portrait = page.locator('.home-avatar__frame:visible')
    if (await page.locator('[data-ai-avatar]').count()) {
      await portrait.tap()
      await expect(page.locator('[data-ai-avatar]:visible [data-ai-open]')).toBeVisible()
      await page.touchscreen.tap(8, 500)
      await expect(portrait).toHaveAttribute('aria-expanded', 'false')
    }
  } finally { await context.close() }
})

test('a long press bends the homepage with a growing gravitational lens and releases it', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/')
  await expect(page.locator('#starfield')).toBeVisible()
  expect(await page.evaluate(() => window.__formulasearchLens ?? null)).toBeNull()
  await page.mouse.move(900, 560)
  await page.mouse.down()
  await expect(page.locator('html')).toHaveAttribute('data-blackhole', 'active')
  const radiusAt = () => page.evaluate(() => window.__formulasearchLens?.einstein ?? 0)
  await expect.poll(radiusAt).toBeGreaterThan(0.005)
  const early = await radiusAt()
  await expect.poll(radiusAt).toBeGreaterThan(early * 1.5)
  expect(await page.evaluate(() => window.__formulasearchLens.twist)).toBeGreaterThan(0)
  // On a fine pointer the copy is drawn on a temporary canvas while the originals keep their layout.
  await expect(page.locator('canvas.text-warp')).toBeAttached()
  await expect(page.locator('html')).toHaveAttribute('data-text-warp', '')
  await page.mouse.up()
  await expect(page.locator('html')).not.toHaveAttribute('data-blackhole', /.*/)
  await expect.poll(() => page.evaluate(() => window.__formulasearchLens ?? null)).toBeNull()
  await expect(page.locator('.text-warp')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-text-warp', /.*/)
  // Pulled pills, the portrait and icons are handed back untouched.
  expect(await page.locator('#main-content [style*="transform"]').count()).toBe(0)
})

test('a short click or a press on a control never opens a black hole', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/')
  await page.mouse.click(900, 560)
  await page.waitForTimeout(600)
  await expect(page.locator('html')).not.toHaveAttribute('data-blackhole', /.*/)
  const link = page.locator('.site-header a').first()
  const box = await link.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(600)
  await expect(page.locator('html')).not.toHaveAttribute('data-blackhole', /.*/)
  await page.mouse.up()
})
