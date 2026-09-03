(() => {
  document.querySelectorAll('[data-project-carousel]').forEach((carousel) => {
    if (!(carousel instanceof HTMLElement) || carousel.dataset.initialized === 'true') return

    const slides = [...carousel.querySelectorAll('[data-project-slide]')]
    const previous = carousel.querySelector('[data-project-carousel-previous]')
    const next = carousel.querySelector('[data-project-carousel-next]')
    const current = carousel.querySelector('[data-project-carousel-current]')
    const status = carousel.querySelector('[data-project-carousel-status]')
    if (!slides.length || !(previous instanceof HTMLButtonElement) || !(next instanceof HTMLButtonElement)) return

    carousel.dataset.initialized = 'true'

    const updateStatus = (index) => {
      const image = slides[index]?.querySelector('img')
      if (!(image instanceof HTMLImageElement) || !(status instanceof HTMLElement)) return
      const locale = document.documentElement.dataset.locale === 'en' ? 'en' : 'zh'
      status.textContent = image.dataset[`alt${locale === 'en' ? 'En' : 'Zh'}`] || image.alt
    }

    const activate = (index) => {
      const nextIndex = (index + slides.length) % slides.length
      carousel.dataset.activeIndex = String(nextIndex)
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === nextIndex
        slide.classList.toggle('is-active', active)
        slide.setAttribute('aria-hidden', String(!active))
      })
      if (current) current.textContent = String(nextIndex + 1).padStart(2, '0')
      updateStatus(nextIndex)
    }

    const move = (direction) => {
      activate(Number(carousel.dataset.activeIndex || 0) + direction)
      window.formulasearchAudio?.play('select', { volume: 0.18 })
    }

    previous.addEventListener('click', () => move(-1))
    next.addEventListener('click', () => move(1))
    carousel.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'Home') activate(0)
      else if (event.key === 'End') activate(slides.length - 1)
      else move(event.key === 'ArrowLeft' ? -1 : 1)
    })
    window.addEventListener('formulasearch:locale', () => updateStatus(Number(carousel.dataset.activeIndex || 0)))
  })
})()
