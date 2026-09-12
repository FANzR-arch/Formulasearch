import { test, expect } from '@playwright/test'

test('autoplay traverses both directions in two seconds with a two-second rest', async ({ page }) => {
  await page.goto('/skills');
  const card = page.locator('#generative-hover-type');
  const host = card.locator('[data-hover-type]');
  await page.mouse.move(0, 0);
  await host.evaluate(el => {
    window.typeEvents = [];
    new MutationObserver(records => {
      for (const r of records) {
        if (r.attributeName === 'data-autoplay') window.typeEvents.push({ phase: el.dataset.autoplay, time: performance.now() });
        if (r.attributeName === 'data-variant' && r.target.dataset.variant) window.typeEvents.push({ id: r.target.dataset.targetId, time: performance.now() });
      }
    }).observe(el, {subtree: true, attributes: true, attributeFilter: ['data-autoplay', 'data-variant']});
  });
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.typeEvents.filter(e => e.id).length), {timeout: 14000}).toBeGreaterThanOrEqual(13);
  const events = await page.evaluate(() => window.typeEvents);
  expect(events.filter(e => e.id).slice(0,13).map(e => e.id)).toEqual(['g4','g5','g6','g7','g8','g9','g9','g8','g7','g6','g5','g4','g4']);
  const phases = events.filter(e => e.phase === 'playing' || e.phase === 'resting');
  const start = phases.findIndex(e => e.phase === 'playing');
  for (let i = start; i < start + 4; i++) {
    expect(phases[i + 1].time - phases[i].time).toBeGreaterThan(1800);
    expect(phases[i + 1].time - phases[i].time).toBeLessThan(2400);
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

test('hover type precedes Numerologist and preserves position-specific variants and exit delay', async ({ page }) => {
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
  await first.hover()
  await expect(first).toHaveClass(/glyph--active/)
  const variant = await first.getAttribute('data-variant')
  await first.dispatchEvent('pointerleave')
  await page.waitForTimeout(80)
  await expect(first).toHaveClass(/glyph--active/)
  await first.dispatchEvent('pointerenter')
  await page.waitForTimeout(200)
  await expect(first).toHaveAttribute('data-variant', variant)
  await first.dispatchEvent('pointerleave')
  await expect(first).not.toHaveClass(/glyph--active/)
  await first.dispatchEvent('pointerenter')
  await expect(first).toHaveClass(/glyph--active/)
  await first.dispatchEvent('pointerleave')
  await section.locator('[data-target-id="g5"]').dispatchEvent('pointerenter')
  await expect(first).not.toHaveClass(/glyph--active/)
  await expect(section.locator('[data-target-id="g5"]')).toHaveClass(/glyph--active/)
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
      await glyph.dispatchEvent('pointerleave')
      expect(await glyph.evaluate(el => el.classList.contains('glyph--active'))).toBe(false)
      await glyph.blur()
    }
  }
})
