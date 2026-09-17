(() => {
  const progressRail = document.querySelector('[data-scroll-progress]')
  if (!(progressRail instanceof HTMLElement)) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let frame = 0
  let range = 0
  const update = () => {
    frame = 0
    const root = document.documentElement
    const progress = range > 0 ? Math.min(1, Math.max(0, root.scrollTop / range)) : 0
    progressRail.style.setProperty('--scroll-progress', String(progress))
    progressRail.classList.toggle('is-visible', range > 0)
  }
  const schedule = () => {
    if (reducedMotion.matches) return update()
    if (frame) return
    frame = window.requestAnimationFrame(update)
  }
  // ResizeObserver runs after layout. Cache geometry instead of forcing layout
  // while the parser and page initializers are still changing the document.
  const measure = () => {
    const root = document.documentElement
    range = Math.max(0, root.scrollHeight - root.clientHeight)
    schedule()
  }

  document.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
  window.addEventListener('orientationchange', measure, { passive: true })
  // Initial geometry comes from ResizeObserver; reading it in the first
  // pageshow would force the very layout we are trying to leave to the browser.
  window.addEventListener('pageshow', (event) => { if (event.persisted) measure() })
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    observer.observe(document.documentElement)
  } else {
    window.addEventListener('load', measure, { once: true })
  }
})()
