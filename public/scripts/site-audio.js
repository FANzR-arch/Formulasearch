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
    source = soundSources[source] || source
    if (source.includes('/') || source.startsWith('.')) return new URL(source, window.location.href).href
    return `${audioBase}${source}`
  }

  const maxVoices = 3
  const createVoice = (source) => {
    const audio = new Audio(source)
    audio.preload = 'auto'
    return audio
  }

  // Start with one element per sound so the file is fetched once; extra voices are
  // only created for overlapping rapid clicks, by which time the file is cached.
  const getPool = (source) => {
    if (!pools.has(source)) pools.set(source, [createVoice(source)])
    return pools.get(source)
  }

  const nextVoice = (source) => {
    const pool = getPool(source)
    const idle = pool.find((audio) => audio.paused || audio.ended)
    if (idle) return idle
    if (pool.length < maxVoices) {
      const voice = createVoice(source)
      pool.push(voice)
      return voice
    }
    const cursor = cursors.get(source) || 0
    cursors.set(source, cursor + 1)
    return pool[cursor % pool.length]
  }

  const play = (source = 'click', { force = false, volume = 0.22 } = {}) => {
    if (!force && !enabled) return Promise.resolve(false)
    const resolvedSource = resolveSource(source)
    if (!resolvedSource) return Promise.resolve(false)
    const audio = nextVoice(resolvedSource)
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

  // Warm the two common cues before interaction. Play in the originating
  // document so feedback never waits for the destination's network or load event.
  for (const source of ['click', 'switch']) getPool(resolveSource(source))

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
