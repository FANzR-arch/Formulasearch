(() => {
  const progressRail = document.querySelector('[data-scroll-progress]')
  if (!(progressRail instanceof HTMLElement)) return

  let frame = 0
  const update = () => {
    frame = 0
    const root = document.documentElement
    const range = Math.max(0, root.scrollHeight - root.clientHeight)
    const progress = range > 0 ? Math.min(1, Math.max(0, root.scrollTop / range)) : 0
    root.style.setProperty('--scroll-progress', String(progress))
    progressRail.classList.toggle('is-visible', range > 0)
  }
  const schedule = () => {
    if (frame) return
    frame = window.requestAnimationFrame(update)
  }

  document.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('orientationchange', schedule, { passive: true })
  update()
})()
