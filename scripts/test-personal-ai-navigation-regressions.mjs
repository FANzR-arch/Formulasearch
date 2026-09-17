// Navigation contract against the local host preview; the chat bridge is simulated.
// No chat messages, model requests or external persistence are used.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.PERSONAL_AI_BASE_URL || 'http://127.0.0.1:4321'
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
try {
  for (const scenario of ['preload-only', 'saved-immediately', 'latest-target-on-timeout']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    await context.addInitScript(() => {
      sessionStorage.setItem('formulasearch-intro-seen', 'true')
      document.addEventListener('click', event => {
        const link = event.target.closest?.('a[href]')
        if (link) console.log('navigation-click:' + JSON.stringify({ href: link.href, time: performance.timeOrigin + performance.now() }))
      }, true)
    })
    const page = await context.newPage()
    page.setDefaultTimeout(5000)
    const clicks = [], requests = []
    page.on('console', message => {
      if (message.text().startsWith('navigation-click:')) clicks.push(JSON.parse(message.text().slice('navigation-click:'.length)))
    })
    page.on('request', request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) requests.push({ href: request.url(), time: Date.now() })
    })
    await page.goto(base)
    const endpoint = await page.locator('[data-personal-ai]').getAttribute('data-endpoint')
    assert.ok(endpoint, 'Use a development preview with a configured chat endpoint')
    await page.route(url => url.origin === new URL(endpoint).origin && url.pathname === '/chat', route => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><title>Simulated navigation bridge</title><script>
        const origin = new URL(location.href).searchParams.get('parentOrigin');
        addEventListener('message', event => {
          if (event.origin !== origin || event.source !== parent) return;
          if (event.data?.type === 'pai:prepare-navigation' && ${scenario !== 'latest-target-on-timeout'})
            parent.postMessage({type:'pai:saved',requestId:event.data.requestId,ok:true},origin);
        });
        parent.postMessage({type:'pai:ready'},origin);
      </script>`,
    }))
    await page.locator('[data-ai-avatar]:visible .home-avatar__frame').focus()
    await page.waitForFunction(() => document.querySelector('.pai-surface')?.hasAttribute('data-ready'))
    if (scenario !== 'preload-only') {
      await page.locator('[data-ai-avatar]:visible [data-ai-open]').click()
      await page.waitForFunction(() => document.documentElement.dataset.aiState === 'chat')
    }
    clicks.length = requests.length = 0
    const skills = await page.locator('.nav-link[href="/skills"]').boundingBox()
    await page.locator('.nav-link[href="/projects"]').click({ noWaitAfter: true })
    if (scenario === 'latest-target-on-timeout') {
      await page.waitForTimeout(60)
      assert.equal(await page.locator('.pai-surface').evaluate(el => getComputedStyle(el).opacity), '1', 'Keep the active chat visible while saving')
      await page.mouse.click(skills.x + skills.width / 2, skills.y + skills.height / 2)
    }
    const destination = scenario === 'latest-target-on-timeout' ? '/skills' : '/projects'
    await page.waitForURL(url => url.pathname === destination)
    assert.equal(requests.length, 1)
    const delay = requests[0].time - clicks[0].time
    if (scenario !== 'latest-target-on-timeout') assert.ok(delay < 200, `Unexpected navigation delay: ${delay}ms`)
    else {
      assert.equal(clicks.length, 2)
      assert.equal(await page.evaluate(() => sessionStorage.getItem('pai-save-warning')), '1')
    }
    console.log(`${scenario}: passed (${Math.round(delay)}ms, ${destination})`)
    await context.close()
  }
} finally { await browser.close() }
