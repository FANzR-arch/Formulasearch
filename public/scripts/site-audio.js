(() => {
  const root = document.documentElement
  const audioBase = '/audio/kenney-interface/'
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
    if (!pools.has(source)) pools.set(source, Array.from({ length: 3 }, () => new Audio(source)))
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
    audio.currentTime = 0
    audio.volume = volume
    const result = audio.play()
    if (result?.catch) return result.then(() => true, () => false)
    return Promise.resolve(true)
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

  const attach = () => {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('a[href], button, [role="button"], input[type="checkbox"], input[type="radio"]')
        : null
      if (!(target instanceof HTMLElement) || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return
      if (target.hasAttribute('data-no-sound') || target.closest('[data-audio-preview]')) return
      const source = target.dataset.sound || (target.matches('a[href]') ? 'link' : 'click')
      const requestedVolume = Number.parseFloat(target.dataset.soundVolume || '')
      const volume = Number.isFinite(requestedVolume) ? requestedVolume : 0.22
      play(source, { volume })
    }, { capture: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true })
  else attach()
})()
