(() => {
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
    const button = player.querySelector('[data-video-toggle]')
    const sync = () => {
      const playing = !video.paused && !video.ended
      player.toggleAttribute('data-playing', playing)
      const zh = document.documentElement.lang.startsWith('zh')
      button.setAttribute('aria-label', playing ? (zh ? '暂停视频' : 'Pause video') : (zh ? '播放视频' : 'Play video'))
    }
    button.addEventListener('click', async () => {
      if (video.paused || video.ended) {
        try { await video.play() } catch { sync() }
      } else video.pause()
    })
    button.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight'].includes(event.key) && Number.isFinite(video.duration)) {
        event.preventDefault()
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + (event.key === 'ArrowRight' ? 5 : -5)))
      }
    })
    ;['play', 'pause', 'ended', 'error'].forEach(event => video.addEventListener(event, sync))
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  })
})()
