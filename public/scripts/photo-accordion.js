(() => {
  const accordion = document.querySelector('[data-photo-accordion]')
  if (!(accordion instanceof HTMLElement)) return

  const panels = [...accordion.querySelectorAll('[data-photo-panel]')]
  const captions = [...(accordion.closest('.photo-accordion')?.querySelectorAll('[data-photo-caption]') ?? [])]
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const motionOptions = { duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }
  if (!panels.length) return

  const activate = (index, shouldFocus = false) => {
    const nextIndex = Math.max(0, Math.min(index, panels.length - 1))
    if (accordion.dataset.activeIndex === String(nextIndex)) {
      if (shouldFocus) panels[nextIndex]?.focus({ preventScroll: true })
      return
    }
    const before = prefersReducedMotion.matches ? [] : panels.map((panel) => panel.getBoundingClientRect())
    accordion.dataset.activeIndex = String(nextIndex)
    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === nextIndex
      panel.classList.toggle('is-active', active)
      panel.setAttribute('aria-pressed', String(active))
    })
    captions.forEach((caption, captionIndex) => caption.toggleAttribute('hidden', captionIndex !== nextIndex))
    if (!prefersReducedMotion.matches) {
      panels.forEach((panel, panelIndex) => {
        const previous = before[panelIndex]
        const current = panel.getBoundingClientRect()
        if (!previous || !current.width) return
        const deltaX = previous.left - current.left
        const scaleX = previous.width / current.width
        if (Math.abs(deltaX) < .5 && Math.abs(1 - scaleX) < .01) return
        panel.getAnimations().forEach((animation) => animation.cancel())
        panel.animate([
          { transform: `translateX(${deltaX}px) scaleX(${scaleX})`, transformOrigin: 'left center' },
          { transform: 'translateX(0) scaleX(1)', transformOrigin: 'left center' },
        ], motionOptions)
      })
    }
    if (shouldFocus) panels[nextIndex]?.focus({ preventScroll: true })
  }

  const hoverEnabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  panels.forEach((panel, index) => {
    panel.addEventListener('click', () => activate(index))
    panel.addEventListener('focus', () => activate(index))
    if (hoverEnabled) panel.addEventListener('pointerenter', () => activate(index))
    panel.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const nextIndex = event.key === 'ArrowLeft'
        ? index - 1
        : event.key === 'ArrowRight'
          ? index + 1
          : event.key === 'Home'
            ? 0
            : panels.length - 1
      activate((nextIndex + panels.length) % panels.length, true)
    })
  })
})()
