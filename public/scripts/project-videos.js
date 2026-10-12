(() => {
  // Compact collections reveal additional rows on demand, without horizontal scrolling.
  document.querySelectorAll('[data-video-collection]').forEach(stage => {
    if (stage.dataset.initialized) return
    stage.dataset.initialized = 'true'
    const list = stage.querySelector('.project-videos')
    const cards = [...list.querySelectorAll('.project-video')]
    const more = stage.querySelector('[data-video-more]')
    let expanded = false
    let lastWidth = 0
    const update = () => {
      cards.forEach(card => { card.hidden = false })
      const firstTop = cards[0]?.offsetTop
      const nextRow = cards.findIndex(card => card.offsetTop > firstTop + 2)
      const firstRowCount = nextRow === -1 ? cards.length : nextRow
      more.hidden = firstRowCount === cards.length
      more.setAttribute('aria-expanded', String(expanded))
      cards.forEach((card, index) => {
        if (expanded || index < firstRowCount) return
        if (card.contains(document.activeElement)) more.focus({ preventScroll: true })
        card.hidden = true
        card.querySelector('video')?.pause()
      })
    }
    more.addEventListener('click', () => {
      expanded = !expanded
      update()
      if (!expanded) more.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    })
    new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      if (width <= 0 || Math.abs(width - lastWidth) < 1) return
      lastWidth = width
      update()
    }).observe(list)
    update()
  })

  document.querySelectorAll('[data-video-player]').forEach(player => {
    if (player.dataset.initialized) return
    player.dataset.initialized = 'true'
    const video = player.querySelector('video')
    const start = player.querySelector('[data-video-start]')
    const error = player.querySelector('[data-video-error]')
    const retry = player.querySelector('[data-video-retry]')
    start.hidden = false
    const reveal = () => {
      player.dataset.started = 'true'
      start.hidden = true
    }
    const failed = () => { error.hidden = false }
    const play = async () => {
      reveal()
      video.focus({ preventScroll: true })
      try { await video.play() } catch (cause) {
        if (cause.name !== 'AbortError' && cause.name !== 'NotAllowedError') failed()
      }
    }
    start.addEventListener('click', play)
    retry.addEventListener('click', () => {
      error.hidden = true
      video.load()
      play()
    })
    video.addEventListener('play', () => {
      reveal()
      document.querySelectorAll('video').forEach(other => {
        if (other !== video && !other.paused) other.pause()
      })
    })
    video.addEventListener('error', failed)
    video.querySelector('source')?.addEventListener('error', failed)
    // No metadata preloading: the static poster stays visible until the visitor presses play.
  })
})()
