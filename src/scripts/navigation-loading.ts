// Warm documents and their versioned styles/scripts; never execute destination code or fetch media.
import { prefetch } from 'astro:prefetch'

const header = document.querySelector('.site-header')
const links = [...(header?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
  .filter(link => link.origin === location.origin && !link.target && !link.hasAttribute('download'))

const queue = [...new Set(links.filter(link => !link.closest('.nav-popover')).map(link => link.href.split('#')[0]))]
const preparedDocuments = new Set<string>()
const preparedAssets = new Set([...document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>('link[href], script[src]')]
  .map(element => element instanceof HTMLLinkElement ? element.href : element.src))
const warmResources = async (url: string) => {
  if (preparedDocuments.has(url) || document.hidden) return
  preparedDocuments.add(url)
  try {
    // The completed document prefetch supplies this read from the browser cache.
    const response = await fetch(url, { cache: 'force-cache', priority: 'low' })
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return
    const template = document.createElement('template')
    template.innerHTML = await response.text()
    for (const element of template.content.querySelectorAll('link[rel="stylesheet"][href], script[src]')) {
      if (document.hidden) break
      const asset = new URL(element.getAttribute('href') || element.getAttribute('src') || '', url)
      if (asset.origin !== location.origin || !asset.pathname.startsWith('/_astro/') || preparedAssets.has(asset.href)) continue
      preparedAssets.add(asset.href)
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = asset.href
      link.dataset.navigationResource = ''
      document.head.append(link)
    }
  } catch { /* A failed warm-up must never affect normal navigation. */ }
}
const watchDocument = (link: HTMLLinkElement) => {
  if (link.rel !== 'prefetch' || link.hasAttribute('data-navigation-resource') || !links.some(item => item.href === link.href)) return
  if (performance.getEntriesByName(link.href).some(entry => (entry as PerformanceResourceTiming).responseEnd > 0)) void warmResources(link.href)
  else link.addEventListener('load', () => void warmResources(link.href), { once: true })
}
new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) {
    if (node instanceof HTMLLinkElement) watchDocument(node)
  }
}).observe(document.head, { childList: true })
document.querySelectorAll<HTMLLinkElement>('link[rel="prefetch"]').forEach(watchDocument)
let warming = false
const warmNext = () => {
  if (document.hidden) { warming = false; return }
  const url = queue.shift()
  if (!url) { warming = false; return }
  prefetch(url)
  window.setTimeout(scheduleIdle, 400)
}
const scheduleIdle = () => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(warmNext, { timeout: 1500 })
  else window.setTimeout(warmNext, 200)
}
const startWarming = () => {
  if (warming || document.hidden || !queue.length || document.querySelector('#intro-overlay')) return
  warming = true
  scheduleIdle()
}
const intro = document.querySelector('#intro-overlay')
if (intro?.parentElement) {
  const observer = new MutationObserver(() => {
    if (intro.isConnected) return
    observer.disconnect()
    startWarming()
  })
  observer.observe(intro.parentElement, { childList: true })
} else startWarming()
document.addEventListener('visibilitychange', startWarming)

// A pending link responds immediately even when the destination is still loading.
let pending: HTMLAnchorElement | undefined
let pendingTimeout: number | undefined
const clearPending = () => {
  pending?.classList.remove('is-navigation-pending')
  pending?.removeAttribute('aria-busy')
  pending = undefined
  window.clearTimeout(pendingTimeout)
}
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  const link = event.target instanceof Element ? event.target.closest('a') : null
  if (!(link instanceof HTMLAnchorElement) || !links.includes(link)) return
  if (link.pathname === location.pathname && link.search === location.search) return
  clearPending()
  pending = link
  link.classList.add('is-navigation-pending')
  link.setAttribute('aria-busy', 'true')
  // Recover if the browser cancels navigation or the destination never responds.
  pendingTimeout = window.setTimeout(clearPending, 8000)
})
window.addEventListener('pageswap', clearPending)
window.addEventListener('pagehide', clearPending)
window.addEventListener('pageshow', clearPending)
