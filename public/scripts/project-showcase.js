(() => {
  const initialize = () => {
    document.querySelectorAll('[data-project-showcase]').forEach((showcase) => {
      if (showcase.dataset.projectShowcaseBound === 'true') return
      showcase.dataset.projectShowcaseBound = 'true'

      const viewport = showcase.querySelector('[data-project-showcase-viewport]')
      const cards = [...showcase.querySelectorAll('[data-project-showcase-card]')]
      const previous = showcase.querySelector('[data-project-showcase-previous]')
      const next = showcase.querySelector('[data-project-showcase-next]')
      const current = showcase.querySelector('[data-project-showcase-current]')
      if (!viewport || cards.length < 2 || !previous || !next || !current) return

      const nearestIndex = () => cards.reduce((closest, card, index) => (
        Math.abs(card.offsetLeft - viewport.scrollLeft) < Math.abs(cards[closest].offsetLeft - viewport.scrollLeft) ? index : closest
      ), 0)

      const update = () => {
        const index = nearestIndex()
        const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
        current.textContent = String(index + 1).padStart(2, '0')
        previous.disabled = maxScroll <= 1 || viewport.scrollLeft <= 1
        next.disabled = maxScroll <= 1 || viewport.scrollLeft >= maxScroll - 1
      }

      const move = (direction) => {
        const target = Math.max(0, Math.min(cards.length - 1, nearestIndex() + direction))
        viewport.scrollTo({ left: cards[target].offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      }

      previous.addEventListener('click', () => move(-1))
      next.addEventListener('click', () => move(1))
      viewport.addEventListener('scroll', update, { passive: true })
      window.addEventListener('resize', update)
      update()
    })
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize()
  document.addEventListener('astro:page-load', initialize)
})()
