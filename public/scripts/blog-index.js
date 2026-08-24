const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const revealItems = [
  ...document.querySelectorAll('[data-reveal]'),
  ...document.querySelectorAll('.recent-stream .post-row'),
]

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'))
} else {
  document.documentElement.classList.add('motion-ready')
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
  revealItems.forEach((item) => revealObserver.observe(item))
}
