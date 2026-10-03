import { expect, test } from '@playwright/test'
import sharp from 'sharp'

for (const mobile of [false, true]) {
  test(`circle expands from the button center after an edge click, mobile=${mobile}`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => {
      addEventListener('pagereveal', event => {
        event.viewTransition?.ready.then(() => {
          const style = getComputedStyle(document.documentElement)
          window.circleOrigin = {
            x: parseFloat(style.getPropertyValue('--route-x')) / 100 * innerWidth,
            y: parseFloat(style.getPropertyValue('--route-y')) / 100 * innerHeight,
            animation: document.getAnimations().some(animation => animation.animationName === 'route-reveal'),
          }
        }).catch(() => {})
      })
    })
    await page.goto('/projects')
    if (mobile) await page.locator('#mobile-navigation-toggle').click()
    const link = page.locator('.nav-link[href="/blog"]')
    const bounds = await link.boundingBox()
    await link.click({ position: { x: 3, y: bounds.height / 2 } })
    await expect.poll(() => page.evaluate(() => window.circleOrigin?.animation)).toBe(true)
    const origin = await page.evaluate(() => window.circleOrigin)
    expect(origin.x).toBeCloseTo(bounds.x + bounds.width / 2, 1)
    expect(origin.y).toBeCloseTo(bounds.y + bounds.height / 2, 1)
  })
}

for (const zoom of [1, 1.5]) {
  test(`rendered circle stays centered and follows its easing at zoom=${zoom}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.addInitScript(zoom => {
      // pagereveal can capture the incoming page before DOMContentLoaded. Set
      // zoom as soon as <html> exists so both snapshots use the same scale.
      const applyZoom = () => {
        if (!document.documentElement) return false
        document.documentElement.style.zoom = zoom
        return true
      }
      if (!applyZoom()) {
        const observer = new MutationObserver(() => {
          if (applyZoom()) observer.disconnect()
        })
        observer.observe(document, { childList: true })
      }
      addEventListener('pagereveal', event => {
        event.viewTransition?.ready.then(async () => {
          const animation = document.getAnimations().find(a => a.animationName === 'route-reveal')
          if (!animation) return
          // ready creates the native snapshot tree before its first composite.
          // Let the transition paint once before freezing and seeking its mask.
          await new Promise(requestAnimationFrame)
          await new Promise(requestAnimationFrame)
          animation.pause()
          await animation.ready
          window.circleZoom = Number(getComputedStyle(document.documentElement).zoom)
          window.circleAnimation = animation
        }).catch(() => {})
      })
    }, zoom)
    await page.goto('/projects')
    const link = page.locator('.nav-link[href="/blog"]')
    const box = await link.boundingBox()
    await link.click({ position: { x: 3, y: box.height / 2 } })
    await page.waitForFunction(() => !!window.circleAnimation)
    expect(await page.evaluate(() => window.circleZoom)).toBe(zoom)
    // Isolate the actual composited mask, rather than just checking stored coordinates.
    await page.addStyleTag({ content: '::view-transition-old(root) { filter: brightness(0); } ::view-transition-new(root) { filter: brightness(0) invert(1); }' })
    const radii = []
    const eased = []
    for (const progress of [.10, .13]) {
      const sample = await page.evaluate(async progress => {
        window.circleAnimation.currentTime = window.circleAnimation.effect.getTiming().duration * progress
        // Seeking a paused animation updates JS before the compositor paints.
        // Cross a paint boundary and flush the real mask style before capture.
        await new Promise(requestAnimationFrame)
        await new Promise(requestAnimationFrame)
        // CSS animation easing lives on the keyframes, so the effect's own progress is linear time.
        // Apply the declared page-reveal curve to know how far the radius should have grown.
        const [x1, y1, x2, y2] = getComputedStyle(document.documentElement).getPropertyValue('--ease-page-reveal').match(/-?[\d.]+/g).map(Number)
        const time = window.circleAnimation.effect.getComputedTiming().progress
        const bezier = (a, b, s) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3
        let low = 0, high = 1
        for (let step = 0; step < 50; step++) {
          const middle = (low + high) / 2
          if (bezier(x1, x2, middle) < time) low = middle
          else high = middle
        }
        return {
          clipPath: getComputedStyle(document.documentElement, '::view-transition-new(root)').clipPath,
          progress: bezier(y1, y2, (low + high) / 2),
          playState: window.circleAnimation.playState,
        }
      }, progress)
      expect(sample.clipPath).toMatch(/^circle\(/)
      expect(sample.playState).toBe('paused')
      eased.push(sample.progress)
      const { data, info } = await sharp(await page.screenshot({ scale: 'css' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const points = []
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels
        if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) points.push([x, y])
      }
      expect(points.length, `Composited mask sample: ${JSON.stringify(sample)}`).toBeGreaterThan(30)
      const left = Math.min(...points.map(p => p[0])), right = Math.max(...points.map(p => p[0]))
      const top = Math.min(...points.map(p => p[1])), bottom = Math.max(...points.map(p => p[1]))
      expect(Math.abs((left + right + 1) / 2 - (box.x + box.width / 2))).toBeLessThan(2)
      expect(Math.abs((top + bottom + 1) / 2 - (box.y + box.height / 2))).toBeLessThan(2)
      radii.push((right - left + 1) / 2)
    }
    expect(Math.abs(radii[1] - radii[0] * eased[1] / eased[0])).toBeLessThan(2)
  })
}

test('departing dark homepage keeps a complete background bitmap and restores its live canvas', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('formulasearch-theme', 'dark')
    sessionStorage.setItem('formulasearch-intro-seen', 'true')
    addEventListener('pagereveal', event => {
      event.viewTransition?.ready.then(() => {
        const animation = document.getAnimations().find(a => a.animationName === 'route-reveal')
        if (animation) { animation.pause(); animation.currentTime = 0; window.circleAnimation = animation }
      }).catch(() => {})
    })
  })
  await page.goto('/')
  const restored = await page.evaluate(() => {
    const live = document.querySelector('#ambient-flow')
    const swap = new Event('pageswap')
    Object.defineProperty(swap, 'viewTransition', { value: {} })
    dispatchEvent(swap)
    const bitmap = document.querySelector('#ambient-flow')
    const captured = bitmap !== live && !!bitmap.getContext('2d')
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    return captured && document.querySelector('#ambient-flow') === live
  })
  expect(restored).toBe(true)
  await page.evaluate(() => addEventListener('pageswap', () => {
    const canvas = document.querySelector('#ambient-flow')
    sessionStorage.setItem('departure-bitmap', String(!!canvas.getContext('2d')))
  }))
  await page.locator('.nav-link[href="/blog"]').click()
  await page.waitForFunction(() => !!window.circleAnimation)
  expect(await page.evaluate(() => sessionStorage.getItem('departure-bitmap'))).toBe('true')
  const { data, info } = await sharp(await page.screenshot({ scale: 'css' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let white = 0
  for (let i = 0; i < data.length; i += info.channels) if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) white++
  expect(white / (info.width * info.height)).toBeLessThan(.02)
})

test('hover opens the unified menu and clicking its arrow navigates directly', async ({ page }) => {
  await page.goto('/projects')
  await page.mouse.move(1100, 650)
  const disclosure = page.locator('.nav-disclosure').first()
  await disclosure.hover()
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  await expect(page).toHaveURL(/\/projects$/)
  await disclosure.locator('svg').click()
  await expect(page).toHaveURL(/\/blog$/)
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
})

test('a second pointer navigation during a route animation reaches the latest destination', async ({ page }) => {
  await page.addInitScript(() => {
    addEventListener('pagereveal', event => {
      if (!event.viewTransition || location.pathname !== '/blog') return
      event.viewTransition.ready.then(() => {
        // Hold the visual transition open: exercise actual hit testing, not a race with CI speed.
        const animations = document.getAnimations()
        window.routeReady = animations.some(animation => animation.animationName === 'route-reveal')
        animations.forEach(animation => animation.pause())
      }).catch(() => {})
    })
  })
  await page.goto('/projects')
  await page.locator('.nav-link[href="/blog"]').click()
  await page.waitForFunction(() => window.routeReady)
  const link = page.locator('.nav-link[href="/skills"]')
  const box = await link.boundingBox()
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  expect(await page.evaluate(() => document.getAnimations().some(animation =>
    animation.animationName === 'route-reveal' && animation.effect.getKeyframes().some(frame => frame.clipPath?.startsWith('circle('))
  ))).toBe(true)
  await page.mouse.click(point.x, point.y)
  await expect(page).toHaveURL(/\/skills$/)
})

test('an interrupted circle delivers a language toggle exactly once', async ({ page }) => {
  await page.addInitScript(() => {
    addEventListener('pagereveal', event => {
      event.viewTransition?.ready.then(() => {
        document.getAnimations().forEach(animation => animation.pause())
        window.routeReady = true
      }).catch(() => {})
    })
    window.localeChanges = 0
    addEventListener('formulasearch:locale', () => window.localeChanges++)
  })
  await page.goto('/projects')
  await page.locator('.nav-link[href="/blog"]').click()
  await page.waitForFunction(() => window.routeReady)
  const box = await page.locator('#language-toggle').boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('html')).toHaveAttribute('data-locale', 'en')
  expect(await page.evaluate(() => window.localeChanges)).toBe(1)
})

test('a modified click during the circle keeps the original tab and opens the destination', async ({ page, context }) => {
  await page.addInitScript(() => {
    addEventListener('pagereveal', event => {
      if (location.pathname !== '/blog') return
      event.viewTransition?.ready.then(() => {
        document.getAnimations().forEach(animation => animation.pause())
        window.routeReady = true
      }).catch(() => {})
    })
  })
  await page.goto('/projects')
  await page.locator('.nav-link[href="/blog"]').click()
  await page.waitForFunction(() => window.routeReady)
  const box = await page.locator('.nav-link[href="/skills"]').boundingBox()
  const opened = context.waitForEvent('page')
  await page.keyboard.down('Control')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.keyboard.up('Control')
  const next = await opened
  expect(next).not.toBe(page)
  // Read the opened document itself rather than cached new-tab navigation
  // events. Navigation Timing confirms DOMContentLoaded actually completed.
  await expect.poll(() => next.evaluate(() => ({
    href: location.href,
    domReady: performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd > 0,
  }))).toEqual({ href: new URL('/skills', page.url()).href, domReady: true })
  await expect.poll(() => next.locator('main h1').isVisible()).toBe(true)
  await expect(page).toHaveURL(/\/blog$/)
})

for (const seen of [false, true]) {
  test(`homepage is visible at transition capture with intro seen=${seen}`, async ({ page }) => {
    await page.addInitScript(() => {
      addEventListener('pagereveal', event => {
        if (!event.viewTransition || location.pathname !== '/') return
        event.viewTransition.ready.then(() => {
          window.homeCapture = {
            opacity: getComputedStyle(document.querySelector('#site-page')).opacity,
            overlayVisible: !!document.querySelector('#intro-overlay')?.getClientRects().length,
          }
        }).catch(() => {})
      })
    })
    await page.goto('/projects')
    await page.evaluate(seen => seen ? sessionStorage.setItem('formulasearch-intro-seen', 'true') : sessionStorage.removeItem('formulasearch-intro-seen'), seen)
    await page.locator('.monogram').click()
    await expect.poll(() => page.evaluate(() => window.homeCapture)).toEqual({ opacity: '1', overlayVisible: false })
    await expect(page.locator('#intro-overlay')).toHaveCount(0)
  })
}

test('stationary hover does not reopen the arriving navigation menu', async ({ page }) => {
  await page.goto('/projects')
  const link = page.locator('.nav-link[href="/blog"]')
  await link.hover()
  await expect(page.locator('.nav-menu').first()).toHaveClass(/is-open/)
  await link.click()
  await page.waitForFunction(() => !document.documentElement.dataset.viewTransition)
  await page.waitForTimeout(150)
  await expect(page.locator('.nav-menu').first()).not.toHaveClass(/is-open/)
  const hero = page.locator('.blog-hero')
  await expect(hero).toHaveCSS('opacity', '1')
  await page.mouse.move(1100, 650)
  await page.locator('.nav-link[href="/blog"]').hover()
  await expect(page.locator('.nav-menu').first()).toHaveClass(/is-open/)
})

test('mobile navigation stays steady until the outgoing page is captured', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    addEventListener('pageswap', () => {
      sessionStorage.setItem('departing-nav-open', String(document.querySelector('.site-header')?.classList.contains('is-nav-open')))
    })
  })
  await page.goto('/projects')
  await page.locator('#mobile-navigation-toggle').click()
  await page.locator('.nav-link[href="/blog"]').click()
  expect(await page.evaluate(() => sessionStorage.getItem('departing-nav-open'))).toBe('true')
  await expect(page.locator('.site-header')).not.toHaveClass(/is-nav-open/)
})

test('arrival hover resumes when the browser reports zero movement deltas', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(MouseEvent.prototype, 'movementX', { get: () => 0 })
    Object.defineProperty(MouseEvent.prototype, 'movementY', { get: () => 0 })
  })
  await page.goto('/projects')
  await page.locator('.nav-link[href="/blog"]').click()
  await expect(page).toHaveURL(/\/blog$/)
  await page.waitForFunction(() => !document.documentElement.dataset.viewTransition)
  await expect(page.locator('.nav-menu').first()).not.toHaveClass(/is-open/)
  await page.mouse.move(1100, 650)
  await page.locator('.nav-link[href="/blog"]').hover()
  await expect(page.locator('.nav-menu').first()).toHaveClass(/is-open/)
})

for (const zoom of [1, 1.25]) {
  test(`theme circle opens from the toggle centre at zoom=${zoom}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.addInitScript(zoom => {
      localStorage.setItem('formulasearch-theme', 'dark')
      const applyZoom = () => {
        if (!document.documentElement) return false
        document.documentElement.style.zoom = zoom
        return true
      }
      if (!applyZoom()) new MutationObserver((_, observer) => { if (applyZoom()) observer.disconnect() }).observe(document, { childList: true })
    }, zoom)
    await page.goto('/blog')
    const toggle = page.locator('#theme-toggle')
    const box = await toggle.boundingBox()
    await page.evaluate(() => {
      const freeze = async () => {
        const animation = document.getAnimations().find(a => a.animationName === 'theme-reveal')
        if (!animation) return requestAnimationFrame(freeze)
        await new Promise(requestAnimationFrame)
        animation.pause()
        animation.currentTime = animation.effect.getTiming().duration * 0.12
        window.themeCircleFrozen = true
      }
      freeze()
    })
    await toggle.click()
    await page.waitForFunction(() => window.themeCircleFrozen === true)
    await page.addStyleTag({ content: '::view-transition-old(root) { filter: brightness(0); } ::view-transition-new(root) { filter: brightness(0) invert(1); }' })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const { data, info } = await sharp(await page.screenshot({ scale: 'css' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    let left = Infinity, right = -1, top = Infinity, bottom = -1
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
      }
    }
    expect(right).toBeGreaterThan(left)
    expect(Math.abs((left + right + 1) / 2 - (box.x + box.width / 2))).toBeLessThan(2)
    expect(Math.abs((top + bottom + 1) / 2 - (box.y + box.height / 2))).toBeLessThan(2)
  })
}
