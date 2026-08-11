import { expect, test } from '@playwright/test'

test('mobile navigation traps focus and restores it on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')

  const toggle = page.locator('#mobile-navigation-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.focus()
  await expect.poll(() => toggle.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(toggle).toHaveAttribute('aria-label', /关闭导航/)
  await expect(page.locator('#site-navigation')).toBeVisible()

  const focusable = page.locator('#site-navigation a:visible, #site-navigation button:visible')
  const firstFocusable = focusable.first()
  const lastFocusable = focusable.last()
  await expect(firstFocusable).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(lastFocusable).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(firstFocusable).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toHaveAttribute('aria-label', /打开导航/)
  await expect(toggle).toBeFocused()
})

test('mobile navigation closes when its toggle is clicked again', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')

  const toggle = page.locator('#mobile-navigation-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#site-navigation')).toBeHidden()
})

test('archive and header controls keep touch-friendly hit areas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/photos')

  const sizes = await page.locator('.site-header .monogram, .site-header .nav-disclosure, .site-header .icon-link, .site-header .language-toggle, .site-header .theme-toggle, .visual-archive__filters button').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }))

  expect(sizes.length).toBeGreaterThan(0)
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(40)
    expect(size.height).toBeGreaterThanOrEqual(40)
  }
})

test('header utility icons keep a consistent optical size', async ({ page }) => {
  await page.goto('/')
  const sizes = await page.locator('.nav-utilities svg:visible').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }))

  expect(sizes.length).toBeGreaterThanOrEqual(4)
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(16)
    expect(size.width).toBeLessThanOrEqual(18)
    expect(size.height).toBeGreaterThanOrEqual(16)
    expect(size.height).toBeLessThanOrEqual(18)
  }
})

test('header utility controls keep fixed square hit areas', async ({ page }) => {
  await page.goto('/')
  const sizes = await page.locator('.nav-utilities .icon-link, .nav-utilities .language-toggle, .nav-utilities .theme-toggle').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }))

  expect(sizes.length).toBeGreaterThanOrEqual(5)
  for (const size of sizes) {
    expect(size.width).toBe(40)
    expect(size.height).toBe(40)
  }
})

test('key routes do not overflow a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  for (const route of ['/', '/blog', '/blog/ai-practice-2026-02-22', '/photos', '/architecture', '/projects', '/skills', '/lab']) {
    await page.goto(route)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow, `${route} overflows at 320px`).toBeFalsy()
  }
})

test('homepage falls back when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl') return null
      return getContext.call(this, type, ...args)
    }
  })
  await page.goto('/')
  await expect(page.locator('#ambient-flow')).toHaveClass(/ambient-flow--fallback/)
})

test('Chinese and English homepages share the site footer', async ({ page }) => {
  for (const route of ['/', '/en']) {
    await page.goto(route)
    await expect(page.locator('.site-footer')).toHaveCount(1)
    await expect(page.locator('.site-footer a')).toHaveAttribute('href', route === '/' ? '/' : '/en')
  }
})

test('homepage identity aliases cover the visible display name', async ({ page }) => {
  await page.goto('/')
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents()
  const person = jsonLd.map((value) => JSON.parse(value)).find((value) => value['@type'] === 'Person')

  expect(person).toBeTruthy()
  expect(person.name).toBe('Phil')
  expect(person.alternateName).toEqual(expect.arrayContaining(['阿哲 Phil', 'Carlos Phil']))
  await expect(page.locator('#intro-title .localized-text__zh')).toHaveText('Carlos Phil')
})

test('reduced motion skips decorative animation loops', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    let requestCount = 0
    const request = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) => {
      requestCount += 1
      return request(callback)
    }
    window.__formulasearchRafCount = () => requestCount
  })
  await page.goto('/')
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.__formulasearchRafCount?.() ?? -1)).toBe(0)
  await expect(page.locator('#intro-overlay')).toHaveCount(0)
})

test('navigation disclosure labels reflect open state and locale', async ({ page }) => {
  await page.goto('/projects')

  const disclosure = page.locator('.nav-disclosure').first()
  await expect(disclosure).toHaveAttribute('aria-haspopup', 'true')
  await disclosure.evaluate((element) => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await expect(disclosure).toHaveAttribute('aria-label', /关闭博客分类/)

  await page.locator('#language-toggle').click()
  await expect(disclosure).toHaveAttribute('aria-label', /Close Blog menu/)
  await disclosure.evaluate((element) => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await expect(disclosure).toHaveAttribute('aria-label', /Open Blog menu/)
})

test('desktop navigation closes when focus leaves the site navigation', async ({ page }) => {
  await page.goto('/projects')
  const disclosure = page.locator('.nav-disclosure').first()
  await disclosure.focus()
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  await page.locator('.site-header > .monogram').focus()
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.nav-popover').first()).toHaveAttribute('inert', '')
})

test('desktop navigation stays open while a menu item keeps keyboard focus', async ({ page }) => {
  await page.goto('/projects')
  const menu = page.locator('.nav-menu').first()
  const disclosure = menu.locator('.nav-disclosure')
  await disclosure.focus()
  const menuLink = menu.locator('.nav-popover a').first()
  await menuLink.focus()
  await menu.evaluate((element) => element.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false, pointerType: 'mouse' })))
  await page.waitForTimeout(240)
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  await expect(menuLink).toBeFocused()
})

test('locale and theme controls update document metadata', async ({ page }) => {
  await page.goto('/projects')

  await page.locator('#language-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle(/Projects/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Phil's products/)
  await expect(page.locator('#language-toggle')).toHaveAttribute('aria-label', 'Switch to Chinese')
  await expect(page.locator('.nav-disclosure').nth(1)).toHaveAttribute('aria-label', 'Open Projects menu')
  await expect(page.locator('.icon-link--github')).toHaveAttribute('title', 'Phil on GitHub')

  await page.locator('#theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Switch to light theme')
})

test('English routes render server-localized metadata and reciprocal hreflang', async ({ page }) => {
  await page.goto('/en/projects')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle(/Projects/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Phil's products/)
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', /\/en\/projects$/)
  await expect(page.locator('link[hreflang="zh-Hans"]')).toHaveAttribute('href', /\/projects$/)
  await expect(page.locator('.catalog-hero h1 .localized-text__en')).toBeVisible()
  await expect(page.locator('.catalog-hero h1 .localized-text__zh')).toBeHidden()
  await expect(page.locator('.nav-link[href="/en/blog"]')).toBeVisible()
  await page.locator('.nav-disclosure').first().click()
  await expect(page.locator('.nav-popover a').first()).toHaveAttribute('href', /\/en\/blog\/series#ai-tools$/)

  await page.goto('/en/blog')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.blog-hero h1 .localized-text__en')).toBeVisible()
  await expect(page.locator('.cover-stage .localized-text__en').first()).toBeVisible()
  await expect(page.locator('.blog-section-nav')).toHaveAttribute('aria-label', 'Blog sections')
  await expect(page.locator('.post-row__links').first()).toHaveAttribute('aria-label', 'Original publication')
  const cover = page.locator('.cover-stage img').first()
  await expect(cover).toHaveAttribute('alt', await cover.getAttribute('data-alt-en'))
  expect(await page.locator('a[href="/blog/prompt-aesthetic-2026-07-02"]').count()).toBeGreaterThan(0)
  await expect(page.locator('a[href="/en/blog/prompt-aesthetic-2026-07-02"]')).toHaveCount(0)
})

test('English Blog index discloses source-language article bodies', async ({ page }) => {
  await page.goto('/en/blog')
  const notice = page.locator('.blog-language-note')
  await expect(notice).toBeVisible()
  await expect(notice.locator('.localized-text__en')).toBeVisible()
  await page.locator('#language-toggle').click()
  await expect(notice).toBeHidden()
  await expect(notice.locator('.localized-text__zh')).toContainText('部分文章')
})

test('English archive images expose English alt text in SSR HTML', async ({ page }) => {
  await page.goto('/en/photos')
  const image = page.locator('.archive-record img').first()
  await expect(image).toHaveAttribute('alt', await image.getAttribute('data-alt-en'))
  await expect(image).not.toHaveAttribute('alt', await image.getAttribute('data-alt-zh'))
})

test('locale switch preserves article source language semantics', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-02-22')
  await page.locator('#language-toggle').click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.article-page')).toHaveAttribute('lang', 'zh-Hans')
  await expect(page.locator('.article-header h1 .localized-text__en')).toHaveAttribute('lang', 'en')
})

test('blog featured stage keeps localized title and summary on locale switch', async ({ page }) => {
  await page.goto('/blog')

  const trigger = page.locator('[data-stage-trigger]').first()
  const stageTitle = page.locator('[data-stage-title]')
  const stageSummary = page.locator('[data-stage-summary]')
  await page.locator('#language-toggle').click()

  await expect(stageTitle.locator('.localized-text__en')).toHaveText(await trigger.getAttribute('data-stage-title-en') || '')
  await expect(stageSummary.locator('.localized-text__en')).toHaveText(await trigger.getAttribute('data-stage-summary-en') || '')
  await expect(stageTitle.locator('.localized-text__en')).toHaveAttribute('lang', 'en')
  await expect(stageSummary.locator('.localized-text__en')).toHaveAttribute('lang', 'en')

  await page.locator('[data-stage-trigger="1"]').focus()
  await expect(stageTitle.locator('.localized-text__en')).toHaveText(await page.locator('[data-stage-trigger="1"]').getAttribute('data-stage-title-en') || '')
  await expect(stageSummary.locator('.localized-text__en')).toHaveText(await page.locator('[data-stage-trigger="1"]').getAttribute('data-stage-summary-en') || '')
})

test('blog featured stage honors frontmatter featured records', async ({ page }) => {
  await page.goto('/blog')

  const featuredTrigger = page.locator('[data-stage-featured="true"]').first()
  await expect(featuredTrigger).toHaveAttribute('data-stage-trigger', '0')
})

test('theme preference survives a page reload', async ({ page }) => {
  await page.goto('/projects')
  await page.locator('#theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', '切换到浅色主题')
})

test('locale updates the dynamic background control label', async ({ page }) => {
  await page.goto('/')
  await page.locator('#language-toggle').click()
  await expect(page.locator('#background-cycle')).toHaveAttribute('aria-label', /Current background/)
})

test('background cycle keeps localized copy when the variant changes', async ({ page }) => {
  await page.goto('/')
  const cycle = page.locator('#background-cycle')
  const before = await cycle.getAttribute('aria-label')
  await cycle.click()
  await expect(cycle).toHaveAttribute('aria-label', /当前背景：/)
  expect(await cycle.getAttribute('aria-label')).not.toBe(before)

  await page.locator('#language-toggle').click()
  await expect(cycle).toHaveAttribute('aria-label', /Current background:/)
  await cycle.click()
  await expect(cycle).toHaveAttribute('aria-label', /Click to switch to/)
})

test('locale updates archive image alt text', async ({ page }) => {
  await page.goto('/photos')
  await expect(page.locator('[data-archive-index]:not([hidden]) img').first()).toHaveAttribute('alt', /红色小船/)
  await page.locator('#language-toggle').click()
  await expect(page.locator('[data-archive-index]:not([hidden]) img').first()).toHaveAttribute('alt', /red boat/i)
})

test('archive navigation exposes the current page', async ({ page }) => {
  await page.goto('/photos')
  await expect(page.locator('.visual-archive__modes')).toHaveCount(0)
  await expect(page.locator('.site-header .icon-link--archive.is-active')).toHaveAttribute('aria-current', 'page')
})

test('photo archive auto-loads more records on scroll', async ({ page }) => {
  await page.goto('/photos')

  const status = page.locator('[data-archive-status]')
  const beforeStatus = await status.textContent()
  const before = await page.locator('[data-archive-index]:not([hidden])').count()
  await expect(page.locator('[data-archive-more]')).toHaveCount(0)
  await page.locator('[data-archive-sentinel]').scrollIntoViewIfNeeded()
  await expect.poll(() => page.locator('[data-archive-index]:not([hidden])').count()).toBeGreaterThan(before)
  await expect(status).not.toHaveText(beforeStatus || '')

  await page.locator('#language-toggle').click()
  await expect(status).toContainText('Showing')
})

test('photo archive reveals all records when IntersectionObserver is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: undefined })
  })
  await page.goto('/photos')
  await expect(page.locator('#archive-grid [data-archive-record]:not([hidden])')).toHaveCount(8)
})

test('photo archive remains readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4321/photos')
  const total = await page.locator('#archive-grid [data-archive-record]').count()
  await expect(page.locator('#archive-grid [data-archive-record]:not([hidden])')).toHaveCount(total)
  await context.close()
})

test('photo archive removes repetitive captions', async ({ page }) => {
  await page.goto('/photos')
  await expect(page.locator('.archive-record figcaption')).toHaveCount(0)
  await expect(page.locator('.visual-archive__modes')).toHaveCount(0)
})

test('architecture archive keeps its narrative captions', async ({ page }) => {
  await page.goto('/architecture')
  await expect(page.locator('.archive-record figcaption').first()).toBeVisible()
  await expect(page.locator('.archive-record figcaption strong').first()).not.toBeEmpty()
})

test('article copy feedback and table of contents remain interactive', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  page.on('dialog', (dialog) => dialog.dismiss())
  await page.goto('/blog/ai-practice-2026-02-22')

  const copy = page.locator('.article-copy')
  await copy.click()
  await expect(copy).toHaveAttribute('data-copy-state', 'copied')
  await expect(copy.locator('.article-copy__feedback')).toBeVisible()
  await page.locator('#language-toggle').click()
  await expect(copy.locator('.article-copy__feedback .localized-text__en')).toBeVisible()
  await expect(page.locator('.article-header h1 .localized-text__en')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.article-cover img')).not.toHaveAttribute('alt', 'Article cover')
  await expect(page.locator('.article-cover img')).toHaveAttribute('data-alt-en', /.+/)

  const tocLink = page.locator('.article-toc a').first()
  await expect(tocLink).toBeVisible()
  await expect(page.locator('.article-prose img').first()).toBeVisible()
  await expect(page.locator('.article-prose img').first()).not.toHaveAttribute('alt', '')
  await expect(page.locator('.article-prose img[alt="图像"]')).toHaveCount(0)
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(structuredData.some((value) => value.includes('BreadcrumbList'))).toBeTruthy()
  await tocLink.click()
  await expect(tocLink).toHaveAttribute('aria-current', 'location')
})

test('article copy failure stays inside the localized button feedback', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-02-22')
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('clipboard unavailable') } },
    })
  })
  const copy = page.locator('.article-copy')
  await copy.click()
  await expect(copy).toHaveAttribute('data-copy-state', 'failed')
  await expect(copy.locator('.article-copy__failure')).toBeVisible()
  const fallbackInput = page.locator('.article-copy__failure-url')
  await expect(fallbackInput).toBeVisible()
  await expect(fallbackInput).toHaveValue(/\/blog\/ai-practice-2026-02-22$/)
  await page.locator('#language-toggle').click()
  await expect(copy.locator('.article-copy__failure .localized-text__en')).toBeVisible()
})

test('article media is playable or represented by accessible poster content', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-03-27')
  const media = await page.locator('.article-prose video, .article-prose audio').evaluateAll((elements) => elements.map((element) => ({
    controls: element.hasAttribute('controls'),
    source: Boolean(element.getAttribute('src') || element.querySelector('source[src]')?.getAttribute('src') || element.getAttribute('poster')),
  })))
  for (const item of media) {
    expect(item.controls).toBeTruthy()
    expect(item.source).toBeTruthy()
  }
})

test('remote article images reserve a temporary fallback ratio', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-02-22')
  const image = page.locator('.article-prose img[src^="http"]').first()
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((element) => getComputedStyle(element).aspectRatio)).toContain('16 / 9')
})

test('failed article images become accessible placeholders', async ({ page }) => {
  await page.route('https://pbs.twimg.com/**', (route) => route.abort())
  await page.goto('/blog/ai-practice-2026-02-22')
  const fallback = page.locator('.article-media-fallback').first()
  await expect(fallback).toBeVisible()
  await expect(fallback).toHaveAttribute('role', 'img')
  await expect(fallback).toHaveAttribute('aria-label', /.+/)
})

test('failed media placeholders follow locale changes', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-02-22')
  await page.evaluate(() => {
    const fallback = document.createElement('span')
    fallback.className = 'article-media-fallback'
    fallback.dataset.mediaFallback = 'true'
    fallback.dataset.altZh = '中文回退'
    fallback.dataset.altEn = 'English fallback'
    fallback.setAttribute('role', 'img')
    fallback.setAttribute('aria-label', '中文回退')
    fallback.textContent = '中文回退'
    document.querySelector('.article-prose')?.append(fallback)
  })
  const fallback = page.locator('.article-media-fallback').last()
  await page.locator('#language-toggle').click()
  await expect(fallback).toHaveAttribute('aria-label', 'English fallback')
  await expect(fallback).toHaveText('English fallback')
})

test('featured stage keeps safe rel on dynamic external links', async ({ page }) => {
  await page.goto('/blog')
  const trigger = page.locator('[data-stage-trigger]').nth(1)
  await trigger.evaluate((element) => {
    element.dataset.stageExternal = 'true'
    element.dataset.stageHref = 'https://example.com/reference'
  })
  await trigger.focus()
  await expect(page.locator('[data-stage-link]')).toHaveAttribute('rel', 'noopener noreferrer')
})

test('featured stage fails closed when a dynamic target is missing', async ({ page }) => {
  await page.goto('/blog')
  const trigger = page.locator('[data-stage-trigger]').nth(1)
  await trigger.evaluate((element) => element.removeAttribute('data-stage-href'))
  await trigger.focus()
  await expect(page.locator('[data-stage-link]')).not.toHaveAttribute('href')
})

test('article exposes related reading links', async ({ page }) => {
  await page.goto('/blog/ai-practice-2026-02-22')
  await expect(page.locator('.article-related__item')).toHaveCount(3)
  await expect(page.locator('.article-related__item a').first()).toHaveAttribute('href', /\/blog\//)
})

test('featured stage keeps cover alt text when switching articles', async ({ page }) => {
  await page.goto('/blog')
  const slides = page.locator('[data-cover-slide]')
  await expect(slides).toHaveCount(4)
  await expect(slides.nth(0).locator('img')).toHaveAttribute('alt', /.+/)
  await expect(slides.nth(1).locator('img')).toHaveAttribute('alt', /.+/)
  await page.locator('[data-stage-trigger="1"]').focus()
  await expect(slides.nth(1)).toHaveClass(/is-active/)
  await expect(slides.nth(1).locator('img')).toHaveAttribute('alt', /.+/)
})

test('blog archive hides draft records and placeholder links', async ({ page }) => {
  await page.goto('/blog/archive')
  await expect(page.locator('a[href="#"]')).toHaveCount(0)
  await expect(page.locator('a[href*="personal-thinking-2026-02-14"]')).toHaveCount(0)
})

test('RSS exposes local article entries', async ({ request }) => {
  const response = await request.get('/rss.xml')
  expect(response.ok()).toBeTruthy()
  const body = await response.text()
  expect(body).toContain('<rss version="2.0">')
  expect((body.match(/<item>/g) || []).length).toBeGreaterThan(0)
  expect(body).toContain('<category>')
  expect(body).toContain('<pubDate>')
  expect(body).toContain('/blog/')
  expect(body).not.toContain('<category>ai-knowledge</category>')
})

test('llms exposes published pages and articles', async ({ request }) => {
  const response = await request.get('/llms.txt')
  expect(response.ok()).toBeTruthy()
  const body = await response.text()
  expect(body).toContain('# Phil / Formula')
  expect(body).toContain('/projects')
  expect(body).toContain('/blog/ai-practice-2026-02-22')
  expect(body).not.toContain('/blog/personal-thinking-2026-02-14')
  expect(body).not.toContain('/blog/ai-knowledge-2025-12-09')
})

test('static preview server rejects paths outside dist', async ({ request }) => {
  const response = await request.get('/%2e%2e/%2e%2e/package.json')
  expect(response.status()).toBe(404)
})
