(() => {
  // Load visible clips' metadata so native volume/fullscreen controls are ready before play.
  const metadataObserver = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return
      target.preload = 'metadata'
      metadataObserver.unobserve(target)
    })
  })
  document.querySelectorAll('[data-video-rail]').forEach((stage) => {
    if (stage.dataset.railInitialized) return
    stage.dataset.railInitialized = 'true'
    const rail = stage.querySelector('.project-videos--rail')
    const nav = stage.querySelector('[data-video-navigation]')
    const previous = stage.querySelector('[data-video-previous]')
    const next = stage.querySelector('[data-video-next]')
    const update = () => {
      const end = rail.scrollWidth - rail.clientWidth
      nav.hidden = end <= 2
      previous.disabled = rail.scrollLeft <= 2
      next.disabled = rail.scrollLeft >= end - 2
      const player = rail.querySelector('[data-video-player]')
      if (player) stage.style.setProperty('--video-navigation-y', `${player.getBoundingClientRect().height / 2}px`)
    }
    const move = (direction) => {
      const current = rail.scrollLeft
      const end = rail.scrollWidth - rail.clientWidth
      const origin = rail.getBoundingClientRect().left
      const stops = [...rail.querySelectorAll('.project-video')].map(card => Math.min(end, card.getBoundingClientRect().left - origin + current))
      const target = direction > 0 ? stops.find(left => left > current + 2) ?? end : stops.reverse().find(left => left < current - 2) ?? 0
      rail.scrollTo({ left: target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    }
    previous.addEventListener('click', () => move(-1))
    next.addEventListener('click', () => move(1))
    rail.addEventListener('scroll', update, { passive: true })
    new ResizeObserver(update).observe(rail)
    update()
  })
  document.querySelectorAll('[data-video-player]').forEach((player) => {
    if (player.dataset.initialized) return
    player.dataset.initialized = 'true'
    const video = player.querySelector('video')
    video.addEventListener('play', () => {
      document.querySelectorAll('video').forEach(other => {
        if (other !== video && !other.paused) other.pause()
      })
    })
    const error = player.querySelector('[data-video-error]')
    const retry = player.querySelector('[data-video-retry]')
    const failed = () => { error.hidden = false }
    const play = async () => {
      try { await video.play() } catch (cause) {
        if (cause.name !== 'AbortError' && cause.name !== 'NotAllowedError') failed()
      }
    }
    retry.addEventListener('click', () => {
      error.hidden = true
      video.load()
      play()
    })
    video.addEventListener('error', failed)
    video.querySelector('source')?.addEventListener('error', failed)
    metadataObserver.observe(video)
  })
})()
