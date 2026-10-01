// Warm navigation documents after the intro; leave media loading to the destination.
import { prefetch } from 'astro:prefetch'

const header = document.querySelector('.site-header')
const links = [...(header?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
  .filter(link => link.origin === location.origin && !link.target && !link.hasAttribute('download'))

const queue = [...new Set(links.filter(link => !link.closest('.nav-popover')).map(link => link.href.split('#')[0]))]
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
