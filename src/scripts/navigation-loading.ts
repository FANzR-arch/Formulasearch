// Prepare navigation during the intro. Native prerender prepares a complete page;
// browsers without it fall back to cached HTML and versioned styles/scripts.
import { prefetch } from 'astro:prefetch'

const header = document.querySelector('.site-header')
const links = [...(header?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
  .filter(link => link.origin === location.origin && !link.target && !link.hasAttribute('download'))

const queue = [...new Set(links.filter(link => !link.closest('.nav-popover')).map(link => link.href.split('#')[0]))]
const preparedDocuments = new Set<string>()
const preparedAssets = new Set([...document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>('link[href], script[src]')]
  .map(element => element instanceof HTMLLinkElement ? element.href : element.src))
const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
const slowConnection = () => connection?.saveData || /2g/.test(connection?.effectiveType || '')
const warmResources = async (url: string) => {
  if (preparedDocuments.has(url) || document.hidden || slowConnection()) return
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
  // Speculation rules have no link load event. Warm critical files as well:
  // prerender can be declined by the browser (memory, battery or DevTools).
  if (HTMLScriptElement.supports?.('speculationrules')) void warmResources(url)
  window.setTimeout(scheduleIdle, 180)
}
const scheduleIdle = () => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(warmNext, { timeout: 200 })
  else window.setTimeout(warmNext, 0)
}
const startWarming = () => {
  if (warming || document.hidden || (document as Document & { prerendering?: boolean }).prerendering || !queue.length) return
  warming = true
  warmNext()
}
startWarming()
// A prepared destination must not recursively prepare seven more documents.
document.addEventListener('prerenderingchange', startWarming, { once: true })
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
