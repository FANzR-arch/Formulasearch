// Smooth desktop wheel input on the real document scroll; keep touch and reading controls native.
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

const desktop = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const dialogs = [...document.querySelectorAll('dialog')]
const intro = document.querySelector('#intro-overlay')
let lenis: Lenis | undefined

const interrupt = () => lenis?.scrollTo(window.scrollY, { immediate: true, force: true })
const destroy = () => {
  lenis?.destroy()
  lenis = undefined
}

const syncOverlays = () => {
  if (!lenis) return
  const introVisible = intro?.isConnected && !intro.classList.contains('is-exiting')
  const blocked = introVisible || dialogs.some((dialog) => dialog.open)
  if (blocked) lenis.stop()
  else lenis.start()
}

const sync = () => {
  if (!desktop.matches || reducedMotion.matches || document.hidden) {
    destroy()
    return
  }
  if (!lenis) {
    lenis = new Lenis({
      lerp: 0.095,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      // Native anchors preserve URL history, keyboard focus and existing scroll padding.
      anchors: false,
      prevent: (node) => node.matches('dialog, input, textarea, select, [contenteditable]'),
      virtualScroll: ({ event, deltaX, deltaY }) => {
        if (event instanceof WheelEvent && (event.shiftKey || event.ctrlKey || Math.abs(deltaX) >= Math.abs(deltaY))) {
          interrupt()
          return false
        }
        return true
      },
    })
  }
  syncOverlays()
}

// Cancel the tail before native keyboard scrolling, anchor jumps or selection begins.
document.addEventListener('pointerdown', interrupt, { capture: true, passive: true })
document.addEventListener('keydown', interrupt, { capture: true })
document.addEventListener('click', interrupt, { capture: true })
window.addEventListener('hashchange', interrupt)
window.addEventListener('popstate', interrupt)
window.addEventListener('pagehide', destroy)
window.addEventListener('pageshow', sync)
document.addEventListener('visibilitychange', sync)
desktop.addEventListener('change', sync)
reducedMotion.addEventListener('change', sync)

const overlayObserver = new MutationObserver(syncOverlays)
dialogs.forEach((dialog) => overlayObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }))
if (intro) {
  overlayObserver.observe(intro, { attributes: true, attributeFilter: ['class'] })
  if (intro.parentElement) overlayObserver.observe(intro.parentElement, { childList: true })
}

sync()
