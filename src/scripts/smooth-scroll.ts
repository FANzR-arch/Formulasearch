// Smooth desktop wheel input on the real document scroll; keep touch and reading controls native.
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

const desktop = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const dialogs = [...document.querySelectorAll('dialog')]
const intro = document.querySelector('#intro-overlay')
let lenis: Lenis | undefined
let routeTransitionActive = false

const interrupt = () => lenis?.scrollTo(window.scrollY, { immediate: true, force: true })
const destroy = () => {
  lenis?.destroy()
  lenis = undefined
}

const syncOverlays = () => {
  if (!lenis) return
  const introVisible = intro?.isConnected && !intro.classList.contains('is-exiting')
  const aiState = document.documentElement.dataset.aiState
  const blocked = introVisible || (aiState && aiState !== 'intro') || dialogs.some((dialog) => dialog.matches(':modal'))
  if (blocked) lenis.stop()
  else lenis.start()
}

const sync = () => {
  if (routeTransitionActive) return
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

const scheduleSync = () => {
  if (!desktop.matches || reducedMotion.matches) sync()
  else requestAnimationFrame(sync)
}

// Cancel the tail before native keyboard scrolling, anchor jumps or selection begins.
document.addEventListener('pointerdown', interrupt, { capture: true, passive: true })
document.addEventListener('keydown', interrupt, { capture: true })
document.addEventListener('click', interrupt, { capture: true })
window.addEventListener('hashchange', interrupt)
window.addEventListener('popstate', interrupt)
window.addEventListener('pagehide', destroy)
window.addEventListener('pageshow', scheduleSync)
window.addEventListener('pagereveal', (event) => {
  const transition = (event as Event & { viewTransition?: { finished: Promise<void> } }).viewTransition
  if (!transition) return
  routeTransitionActive = true
  const finish = () => { routeTransitionActive = false; scheduleSync() }
  transition.finished.then(finish, finish)
})
document.addEventListener('visibilitychange', sync)
desktop.addEventListener('change', sync)
reducedMotion.addEventListener('change', sync)

const overlayObserver = new MutationObserver(syncOverlays)
window.addEventListener('formulasearch:ai-state', syncOverlays)
dialogs.forEach((dialog) => overlayObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }))
if (intro) {
  overlayObserver.observe(intro, { attributes: true, attributeFilter: ['class'] })
  if (intro.parentElement) overlayObserver.observe(intro.parentElement, { childList: true })
}

// Let the browser complete its first layout; route animation owns the first frames.
if (document.readyState === 'complete') scheduleSync()
