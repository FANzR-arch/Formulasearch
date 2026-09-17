(() => {
  const root = document.documentElement
  const audioBase = '/audio/kenney-interface/'
  const navigationSoundKey = 'formulasearch-navigation-sound'
  let pendingNavigationSound
  const soundSources = {
    click: 'click3.wav',
    link: 'click3.wav',
    switch: 'switch5.wav',
    rollover: 'switch4.wav',
    confirm: 'switch15.wav',
    select: 'switch4.wav',
    open: 'switch15.wav',
    close: 'switch16.wav',
    success: '/audio/cc0-feedback/ui-feedback/ui_wav/chimes.wav',
    error: '/audio/cc0-feedback/ui-feedback/ui_wav/negative_sound.wav',
    notify: '/audio/cc0-feedback/ui-feedback/ui_wav/Ding.wav',
  }

  let enabled = true
  let bgmAudio = null
  const pools = new Map()
  const cursors = new Map()

  root.dataset.sound = 'on'

  const resolveSource = (source) => {
    if (!source) return ''
    if (source.includes('/') || source.startsWith('.')) return new URL(source, window.location.href).href
    return `${audioBase}${soundSources[source] || source}`
  }

  const getPool = (source) => {
    if (!pools.has(source)) pools.set(source, Array.from({ length: 3 }, () => {
      const audio = new Audio(source)
      audio.preload = 'auto'
      return audio
    }))
    return pools.get(source)
  }

  const play = (source = 'click', { force = false, volume = 0.22 } = {}) => {
    if (!force && !enabled) return Promise.resolve(false)
    const resolvedSource = resolveSource(source)
    if (!resolvedSource) return Promise.resolve(false)
    const pool = getPool(resolvedSource)
    const cursor = cursors.get(resolvedSource) || 0
    const audio = pool[cursor % pool.length]
    cursors.set(resolvedSource, cursor + 1)
    try {
      audio.currentTime = 0
      audio.volume = volume
      const result = audio.play()
      if (result?.catch) return result.then(() => true, () => false)
      return Promise.resolve(true)
    } catch { return Promise.resolve(false) }
  }

  const playBgm = (source, { loop = true, volume = 0.18 } = {}) => {
    if (!enabled || !source) return Promise.resolve(false)
    const resolvedSource = resolveSource(source)
    if (!bgmAudio || bgmAudio.src !== resolvedSource) {
      bgmAudio?.pause()
      bgmAudio = new Audio(resolvedSource)
      bgmAudio.loop = loop
    }
    bgmAudio.volume = volume
    const result = bgmAudio.play()
    if (result?.catch) return result.then(() => true, () => false)
    return Promise.resolve(true)
  }

  const setEnabled = (nextEnabled) => {
    enabled = Boolean(nextEnabled)
    root.dataset.sound = enabled ? 'on' : 'off'
    if (!enabled) bgmAudio?.pause()
  }

  window.formulasearchPlaySound = play
  window.formulasearchAudio = {
    play,
    playPreview: (source, options) => play(source, { ...options, force: true }),
    setEnabled,
    isEnabled: () => enabled,
    bgm: {
      play: playBgm,
      pause: () => bgmAudio?.pause(),
      stop: () => {
        if (!bgmAudio) return
        bgmAudio.pause()
        bgmAudio.currentTime = 0
      },
      setVolume: (volume) => {
        if (bgmAudio) bgmAudio.volume = Math.max(0, Math.min(1, volume))
      },
    },
  }

  // A document navigation stops its audio. Carry one fixed navigation cue to
  // the arriving document instead of delaying or cancelling the anchor click.
  getPool(resolveSource('link'))
  const commitNavigationSound = (event) => {
    if (!pendingNavigationSound) return
    const sound = pendingNavigationSound
    pendingNavigationSound = undefined
    if (event.activation?.entry?.url && event.activation.entry.url !== sound.destination) return
    try { sessionStorage.setItem(navigationSoundKey, JSON.stringify(sound)) } catch {}
  }
  window.addEventListener('pageswap', commitNavigationSound)
  window.addEventListener('pagehide', commitNavigationSound)
  window.addEventListener('pageshow', (event) => {
    pendingNavigationSound = undefined
    try {
      const sound = JSON.parse(sessionStorage.getItem(navigationSoundKey) || 'null')
      sessionStorage.removeItem(navigationSoundKey)
      if (event.persisted || !sound || sound.destination !== location.href || Date.now() - sound.timestamp > 6_000) return
      play('link', { volume: 0.22 })
    } catch {}
  })

  const attach = () => {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('a[href], button, [role="button"], input[type="checkbox"], input[type="radio"]')
        : null
      if (!(target instanceof HTMLElement) || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return
      pendingNavigationSound = undefined
      if (target.hasAttribute('data-no-sound') || target.closest('[data-audio-preview]')) return
      if (target.matches('.site-header a[href]') && !target.getAttribute('target') && !target.hasAttribute('download') &&
          event.button === 0 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        const destination = new URL(target.href, location.href)
        if (destination.origin === location.origin && (destination.pathname !== location.pathname || destination.search !== location.search)) {
          if (enabled) pendingNavigationSound = { destination: destination.href, timestamp: Date.now() }
          return
        }
      }
      const source = target.dataset.sound || (target.matches('a[href]') ? 'link' : 'click')
      const requestedVolume = Number.parseFloat(target.dataset.soundVolume || '')
      const volume = Number.isFinite(requestedVolume) ? requestedVolume : 0.22
      play(source, { volume })
    }, { capture: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true })
  else attach()
})()
