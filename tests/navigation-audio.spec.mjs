import { expect, test } from '@playwright/test'

const observeAudio = async (page, failure = '') => page.addInitScript(failure => {
  sessionStorage.setItem('formulasearch-intro-seen', 'true')
  const record = value => {
    window.captureAudioObservation?.({ ...value, path: location.pathname })
    const log = JSON.parse(sessionStorage.getItem('audio-observations') || '[]')
    log.push({ ...value, path: location.pathname })
    sessionStorage.setItem('audio-observations', JSON.stringify(log))
  }
  const original = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () {
    record({ event: 'play', src: new URL(this.src).pathname })
    if (failure === 'throw') throw new Error('Simulated audio device failure')
    if (failure === 'reject') return Promise.reject(new DOMException('Simulated autoplay denial', 'NotAllowedError'))
    if (failure === 'pending') return new Promise(() => {})
    this.addEventListener('ended', () => record({ event: 'ended', src: new URL(this.src).pathname }), { once: true })
    return original.call(this)
  }
}, failure)

test('navigation plays one immediate cue at the source and never replays on arrival', async ({ page }) => {
  await observeAudio(page)
  await page.goto('/')
  let sourcePath = '/'
  for (const path of ['/projects', '/blog', '/skills']) {
    await page.evaluate(() => sessionStorage.removeItem('audio-observations'))
    await page.locator(`.nav-link[href="${path}"]`).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('audio-observations') || '[]').filter(entry => entry.event === 'play'))).toEqual([
      { event: 'play', src: '/audio/kenney-interface/click3.wav', path: sourcePath },
    ])
    sourcePath = path
    await page.waitForFunction(() => !document.documentElement.dataset.viewTransition)
  }
  await page.reload()
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('audio-observations')).filter(entry => entry.event === 'play').length)).toBe(1)
})

for (const failure of ['throw', 'reject', 'pending']) {
  test(`navigation never waits for audio when playback is ${failure}`, async ({ page }) => {
    await observeAudio(page, failure)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/projects')
    await page.locator('.nav-link[href="/blog"]').click()
    await expect(page).toHaveURL(/\/blog$/)
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('audio-observations') || '[]'))).toEqual([
      { event: 'play', src: '/audio/kenney-interface/click3.wav', path: '/projects' },
    ])
    expect(errors).toEqual([])
  })
}

test('home navigation keeps its hit targets on arrival and a second click goes to the intended page', async ({ page }) => {
  await observeAudio(page)
  await page.addInitScript(() => {
    addEventListener('pagereveal', event => {
      if (location.pathname !== '/blog') return
      event.viewTransition?.ready.then(() => {
        document.getAnimations().forEach(animation => animation.pause())
        window.routeHeld = true
      }).catch(() => {})
    })
  })
  await page.goto('/')
  const skills = page.locator('.nav-link[href="/skills"]')
  const before = await skills.boundingBox()
  await page.locator('.nav-link[href="/blog"]').click()
  await page.waitForFunction(() => window.routeHeld)
  const after = await skills.boundingBox()
  expect(Math.abs(before.x - after.x)).toBeLessThan(1)
  expect(Math.abs(before.y - after.y)).toBeLessThan(1)
  await page.mouse.click(before.x + before.width - 3, before.y + before.height / 2)
  await expect(page).toHaveURL(/\/skills$/)
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('audio-observations') || '[]').filter(entry => entry.event === 'play'))).toEqual([
    { event: 'play', src: '/audio/kenney-interface/click3.wav', path: '/' },
    { event: 'play', src: '/audio/kenney-interface/click3.wav', path: '/blog' },
  ])
})

test('navigation feedback is already played while the destination is still waiting', async ({ page }) => {
  const observations = []
  await page.exposeFunction('captureAudioObservation', entry => observations.push(entry))
  await observeAudio(page)
  await page.goto('/')
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/projects', async route => { await gate; await route.continue() })
  try {
    await page.locator('.nav-link[href="/projects"]').click({ noWaitAfter: true })
    await expect.poll(() => observations.filter(entry => entry.event === 'play')).toEqual([
      { event: 'play', src: '/audio/kenney-interface/click3.wav', path: '/' },
    ])
    expect(new URL(page.url()).pathname).toBe('/')
  } finally { release() }
  await expect(page).toHaveURL(/\/projects$/)
})
