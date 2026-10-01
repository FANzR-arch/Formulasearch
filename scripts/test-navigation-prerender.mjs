import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { resolve, join, sep } from 'node:path'

// Playwright's page-target attachment disables native prerender in Chromium.
// Attach through a tab target in an isolated browser to test actual activation.
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321'
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const outputRoot = resolve('output')
await mkdir(outputRoot, { recursive: true })
const profile = await mkdtemp(join(outputRoot, 'navigation-prerender-'))
const processHandle = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let socket
try {
  let endpoint
  for (let i = 0; i < 100; i++) {
    try { endpoint = await readFile(join(profile, 'DevToolsActivePort'), 'utf8'); break } catch { await delay(100) }
  }
  assert(endpoint, 'The isolated browser did not start')
  const [port, route] = endpoint.trim().split('\n')
  socket = new WebSocket(`ws://127.0.0.1:${port}${route}`)
  await new Promise(resolveOpen => socket.addEventListener('open', resolveOpen, { once: true }))
  let sequence = 0
  const pending = new Map(), events = [], sessions = new Map()
  const send = (method, params = {}, sessionId) => new Promise((resolveCall, reject) => {
    const id = ++sequence
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)) }, 10000)
    pending.set(id, { resolve: result => { clearTimeout(timeout); resolveCall(result) }, reject: error => { clearTimeout(timeout); reject(error) } })
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const call = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) call?.reject(new Error(JSON.stringify(message.error)))
      else call?.resolve(message.result)
    } else {
      events.push(message)
      if (message.method === 'Target.attachedToTarget' && message.params.targetInfo.type === 'page') sessions.set(message.params.targetInfo.targetId, message.params.sessionId)
    }
  })
  const targets = () => send('Target.getTargets', { filter: [{}] })
  const { targetInfos } = await targets()
  const tab = targetInfos.find(target => target.type === 'tab' && target.url === 'about:blank')
  assert(tab)
  const { sessionId: tabSession } = await send('Target.attachToTarget', { targetId: tab.targetId, flatten: true })
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true, filter: [{}] }, tabSession)
  for (let i = 0; !sessions.size && i < 30; i++) await delay(100)
  const homeSession = [...sessions.values()][0]
  assert(homeSession)
  const evaluate = async (sessionId, expression) => {
    const result = await send('Runtime.evaluate', { expression: `JSON.stringify(${expression})`, returnByValue: true }, sessionId)
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails))
    return JSON.parse(result.result.value)
  }
  await send('Page.enable', {}, homeSession)
  await send('Preload.enable', {}, homeSession)
  await send('Page.navigate', { url: base }, homeSession)
  const readyPaths = () => new Set(events.filter(event => event.method === 'Preload.prerenderStatusUpdated' && event.params.status === 'Ready').map(event => new URL(event.params.key.url).pathname))
  for (let i = 0; readyPaths().size < 7 && i < 100; i++) await delay(100)
  const paths = [...readyPaths()]
  assert.equal(paths.length, 7, JSON.stringify(events.filter(event => event.method === 'Preload.prerenderStatusUpdated').map(event => event.params)))
  await send('Runtime.evaluate', { expression: `window.formulasearchSetTheme('light');window.formulasearchSetLocale('en');` }, homeSession)
  // Wait only for the existing intro to clear, then use actual pointer input.
  for (let i = 0; await evaluate(homeSession, `!!document.querySelector('#intro-overlay')`) && i < 80; i++) await delay(100)
  const point = await evaluate(homeSession, `(()=>{const r=document.querySelector('.site-nav a[href="/projects"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 }, homeSession)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 }, homeSession)
  await delay(700)
  const activated = (await targets()).targetInfos.find(target => target.type === 'page' && target.url === new URL('/projects', base).href)
  assert(activated)
  const activatedSession = sessions.get(activated.targetId)
  assert(activatedSession)
  const result = await evaluate(activatedSession, `({path:location.pathname,activation:performance.getEntriesByType('navigation')[0].activationStart,theme:document.documentElement.dataset.theme,locale:document.documentElement.dataset.locale,response:performance.getEntriesByName('formulasearch:route-response')[0]?.duration})`)
  assert.equal(result.path, '/projects')
  assert(result.activation > 0, 'Navigation must activate the prepared page')
  assert.equal(result.theme, 'light')
  assert.equal(result.locale, 'en')
  assert(result.response > 0 && result.response < 250, `Click-to-animation took ${result.response}ms`)
  await writeFile(join(outputRoot, 'navigation-prerender-results.json'), JSON.stringify({ readyPaths: paths, result }, null, 2))
  console.log(`Native prerender passed: 7 prepared pages, no recursive loading, theme/locale synchronized, click-to-animation ${result.response.toFixed(1)}ms.`)
  await send('Browser.close')
} finally {
  socket?.close()
  processHandle.kill()
  await delay(300)
  // Only remove the freshly created test profile inside this project's output.
  assert(profile.startsWith(outputRoot + sep))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
