import { test, expect } from '@playwright/test'

test('autoplay traverses both directions with a fading trail and a one-second rest', async ({ page }) => {
  await page.goto('/skills');
  const card = page.locator('#generative-hover-type');
  const host = card.locator('[data-hover-type]');
  await page.mouse.move(0, 0);
  await host.evaluate(el => {
    window.typeEvents = [];
    new MutationObserver(records => {
      for (const r of records) {
        if (r.attributeName === 'data-autoplay') window.typeEvents.push({ phase: el.dataset.autoplay, time: performance.now() });
        if (r.attributeName === 'data-variant' && r.target.dataset.variant) window.typeEvents.push({ id: r.target.dataset.targetId, trailing: el.querySelectorAll('.glyph--exiting').length, time: performance.now() });
      }
    }).observe(el, {subtree: true, attributes: true, attributeFilter: ['data-autoplay', 'data-variant']});
  });
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.typeEvents.filter(e => e.id).length), {timeout: 14000}).toBeGreaterThanOrEqual(13);
  const events = await page.evaluate(() => window.typeEvents);
  expect(events.some(e => e.id && e.trailing > 0)).toBe(true);
  expect(events.filter(e => e.id).slice(0,13).map(e => e.id)).toEqual(['g4','g5','g6','g7','g8','g9','g9','g8','g7','g6','g5','g4','g4']);
  const phases = events.filter(e => e.phase === 'playing' || e.phase === 'resting');
  const start = phases.findIndex(e => e.phase === 'playing');
  for (let i = start; i < start + 4; i++) {
    const duration = phases[i].phase === 'playing' ? 2000 : 1000;
    expect(phases[i + 1].time - phases[i].time).toBeGreaterThan(duration - 200);
    expect(phases[i + 1].time - phases[i].time).toBeLessThan(duration + 400);
  }
  await card.locator('[data-target-id="g6"]').hover();
  await expect(host).toHaveAttribute('data-autoplay','paused');
  await expect(card.locator('[data-target-id="g6"]')).toHaveClass(/glyph--active/);
  await page.mouse.move(0,0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(host).toHaveAttribute('data-autoplay','paused');
  await page.waitForTimeout(2200);
  await expect(card.locator('.glyph--active')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(() => window.scrollTo(0,0));
  await expect(host).toHaveAttribute('data-autoplay','paused');
});

test('pointer activates the visible letter when avoidance shifts it past its original midpoint', async ({ page }) => {
  await page.goto('/skills')
  const card = page.locator('#generative-hover-type')
  await card.scrollIntoViewIfNeeded()
  await card.locator('h2 a').hover()
  const glyph = card.locator('[data-target-id="g6"]')
  await glyph.evaluate(el => {
    // Place the visible letter over its neighbor's original center to exercise
    // the conflict between rendered and original hit targets deterministically.
    const own = el.getBoundingClientRect()
    const neighbor = el.previousElementSibling.getBoundingClientRect()
    el.style.transition = 'none'
    el.style.transform = `translateX(${neighbor.x + neighbor.width / 2 - own.x - own.width / 2}px)`
    el.style.zIndex = '3'
  })
  await glyph.hover()
  await expect(glyph).toHaveClass(/glyph--active/)
  await expect(card.locator('[data-target-id="g5"]')).not.toHaveClass(/glyph--active/)
  await page.mouse.move(0, 0)
  await expect(glyph).not.toHaveClass(/glyph--active|glyph--exiting/)
})

test('hover type preserves position-specific variants and immediately starts a gradual exit', async ({ page }) => {
  await page.clock.install()
  await page.goto('/skills')
  const section = page.locator('#generative-hover-type')
  await expect(section.locator('h2 a')).toHaveAttribute('href', 'https://github.com/FANzR-arch/generative-hover-type')
  expect(await section.evaluate(el => { const sections = [...el.parentElement.children].filter(node => node.tagName === 'SECTION'); return sections[sections.indexOf(el) + 1].id })).toBe('numerologist-skills')
  await expect(section.locator('input,textarea,select')).toHaveCount(0)
  await expect(section.locator('.glyph--interactive')).toHaveCount(6)
  await expect(section.locator('[data-target-id="g3"]')).not.toHaveAttribute('tabindex')
  for (const id of ['g4', 'g5', 'g6', 'g7', 'g8', 'g9']) {
    const glyph = section.locator(`[data-target-id="${id}"]`)
    const variants = new Set()
    for (let i = 0; i < 4; i++) {
      await glyph.focus()
      await expect(glyph).toHaveClass(/glyph--active/)
      const variant = await glyph.getAttribute('data-variant')
      expect(variant).toMatch(new RegExp(`^${id}-v[1-4]$`))
      variants.add(variant)
      await glyph.blur()
    }
    expect(variants.size).toBe(4)
  }
  const first = section.locator('[data-target-id="g4"]')
  await section.scrollIntoViewIfNeeded()
  const box = await first.boundingBox()
  const near = { x: box.x + box.width / 2, y: box.y - 18 }
  await page.mouse.move(near.x, near.y)
  await expect(first).toHaveClass(/glyph--active/)
  const variant = await first.getAttribute('data-variant')
  await expect(first.locator('img')).toHaveCSS('opacity', '1')
  // Control animation time so parallel workers cannot sample after the 450ms exit.
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.mouse.move(0, 0)
  await expect(first).toHaveClass(/glyph--exiting/)
  await page.clock.runFor(320)
  await first.evaluate(el => {
    for (const animation of el.getAnimations({ subtree: true })) {
      animation.pause()
      animation.currentTime = 320
    }
  })
  await expect(first).toHaveClass(/glyph--exiting/)
  const opacity = await first.locator('img').evaluate(el => Number(getComputedStyle(el).opacity))
  expect(opacity).toBeGreaterThan(0)
  expect(opacity).toBeLessThan(1)
  const textOpacity = await first.locator('.glyph__text').evaluate(el => Number(getComputedStyle(el).opacity))
  expect(textOpacity).toBeGreaterThan(0)
  expect(textOpacity).toBeLessThan(1)
  const scale = await first.locator('img').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).a)
  expect(scale).toBeGreaterThan(.65)
  expect(scale).toBeLessThan(.8)
  await first.evaluate(el => el.getAnimations({ subtree: true }).forEach(animation => animation.play()))
  await page.mouse.move(near.x, near.y)
  await page.clock.runFor(300)
  await expect(first).toHaveAttribute('data-variant', variant)
  await page.mouse.move(0, 0)
  await expect(first).not.toHaveClass(/glyph--active/)
  await page.mouse.move(near.x, near.y)
  await expect(first).toHaveClass(/glyph--active/)
  await section.locator('[data-target-id="g5"]').hover()
  await expect(section.locator('[data-target-id="g5"]')).toHaveClass(/glyph--active/)
  await expect(first).toHaveClass(/glyph--exiting/)
  await page.clock.runFor(250)
  await expect(first).toHaveClass(/glyph--exiting/)
  expect(await first.locator('img').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0.45s, 0.18s')
  await page.clock.runFor(250)
  await expect(first).not.toHaveClass(/glyph--active|glyph--exiting/)
  await expect(first.locator('.glyph__text')).toHaveCSS('opacity', '1')
  await expect(first.locator('img')).toHaveCSS('opacity', '0')
})

test('hover type fits narrow screens in both locales and honors reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const route of ['/skills', '/en/skills']) {
    await page.goto(route)
    const section = page.locator('#generative-hover-type')
    await section.scrollIntoViewIfNeeded()
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
      const bounds = await section.locator('[data-type-title]').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }))
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1)
      const glyph = section.locator('[data-target-id="g4"]')
      await glyph.focus()
      await expect(glyph).toHaveClass(/glyph--active/)
      await glyph.blur()
      expect(await glyph.evaluate(el => el.classList.contains('glyph--active'))).toBe(false)
      await glyph.blur()
    }
  }
})
