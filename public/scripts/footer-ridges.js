(() => {
  const canvas = document.querySelector('[data-footer-ridges]')
  if (!(canvas instanceof HTMLCanvasElement)) return
  const root = document.documentElement
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  // Footer controls: the WeChat QR dialog and the back-to-top button.
  const opener = document.querySelector('[data-footer-wechat]')
  const dialog = document.querySelector('#footer-wechat-dialog')
  if (opener instanceof HTMLElement && dialog instanceof HTMLDialogElement) {
    // Keep the custom cursor visible above the native dialog's top layer.
    const cursor = document.querySelector('.site-cursor')
    let cursorHost = null
    opener.addEventListener('click', () => {
      if (dialog.open) return
      if (cursor) { cursorHost = cursor.parentNode; dialog.append(cursor) }
      dialog.showModal()
    })
    let pressedOutside = false
    const outside = (event) => {
      const bounds = dialog.getBoundingClientRect()
      return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
    }
    dialog.addEventListener('pointerdown', (event) => { pressedOutside = outside(event) })
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog && pressedOutside && outside(event)) dialog.close()
      pressedOutside = false
    })
    dialog.addEventListener('close', () => {
      if (cursor && cursorHost) cursorHost.appendChild(cursor)
      opener.focus({ preventScroll: true })
    })
  }
  document.querySelector('[data-footer-top]')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' })
  })

  // Signal ridges: stacked contour lines that drift slowly and swell under the pointer.
  const makeNoise = (seed) => {
    let state = seed >>> 0
    const next = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296)
    const size = 512
    const values = Array.from({ length: size }, next)
    const smooth = (t) => t * t * (3 - 2 * t)
    const line = (x) => {
      const i = Math.floor(x)
      const f = x - i
      const a = values[((i % size) + size) % size]
      const b = values[(((i + 1) % size) + size) % size]
      return a + (b - a) * smooth(f)
    }
    return (x, octaves = 3) => {
      let sum = 0
      let amplitude = 0.5
      let frequency = 1
      let total = 0
      for (let o = 0; o < octaves; o++) {
        sum += amplitude * line(x * frequency + o * 17.3)
        total += amplitude
        amplitude *= 0.5
        frequency *= 2.03
      }
      return sum / total
    }
  }

  const noise = makeNoise(23)
  // The swell appears where the pointer enters and fades in place, rather than travelling in from off screen.
  const pointer = { x: 0, current: 0, presence: 0, target: 0 }
  let width = 0
  let height = 0
  let ratio = 1
  let ctx = null
  let frame = 0
  let visible = false

  // Colours are read once per theme, columns and their envelope once per size: the frame loop only
  // samples noise and draws, at most 30 times a second, so the footer stays cheap while it scrolls by.
  let colours = { ink: '#000', paper: '#fff' }
  let columns = []
  let lastDraw = 0
  let lastTime = 0
  const readColours = () => {
    const style = getComputedStyle(root)
    colours = { ink: style.getPropertyValue('--ink').trim(), paper: style.getPropertyValue('--paper').trim() }
  }

  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    width = canvas.clientWidth
    height = canvas.clientHeight
    if (!width || !height) return false
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    ctx = canvas.getContext('2d')
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
    const step = Math.max(6, width / 220)
    columns = []
    for (let x = -2; x <= width + step; x += step) {
      const u = x / width
      columns.push({ x, u, envelope: Math.exp(-(((u - 0.5) / 0.25) ** 2)) + 0.45 * Math.exp(-(((u - 0.17) / 0.09) ** 2)) + 0.3 * Math.exp(-(((u - 0.86) / 0.07) ** 2)) })
    }
    readColours()
    return !!ctx
  }

  const draw = (time) => {
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = colours.paper
    ctx.fillRect(0, 0, width, height)
    const rows = width < 520 ? 20 : 30
    const top = height * 0.3
    const bottom = height * 0.97
    const amplitude = height * 0.36
    const spread = width * 0.065
    const dt = lastTime ? Math.min(time - lastTime, 100) : 16
    lastTime = time
    pointer.current += (pointer.x - pointer.current) * (1 - Math.exp(-dt / 70))
    pointer.presence += (pointer.target - pointer.presence) * (1 - Math.exp(-dt / (pointer.target ? 120 : 260)))
    const drift = time * 0.00011
    const ys = new Float32Array(columns.length)
    for (let row = 0; row < rows; row++) {
      const p = row / (rows - 1)
      const baseY = top + (bottom - top) * p
      const lift = amplitude * (0.5 + 0.5 * p)
      const swell = height * 0.16 * (0.4 + 0.6 * p) * pointer.presence
      for (let index = 0; index < columns.length; index++) {
        const column = columns[index]
        const n = noise(column.u * 6.5 + row * 0.12 + drift)
        const near = column.x - pointer.current
        ys[index] = baseY - column.envelope * n * lift - (swell > 0.05 && Math.abs(near) < spread * 3 ? Math.exp(-((near / spread) ** 2)) * swell * (0.5 + n) : 0)
      }
      // Paper below the line hides the rows behind it; then the line itself.
      ctx.beginPath()
      ctx.moveTo(-2, height + 2)
      for (let index = 0; index < columns.length; index++) ctx.lineTo(columns[index].x, ys[index])
      ctx.lineTo(width + 2, height + 2)
      ctx.closePath()
      ctx.fillStyle = colours.paper
      ctx.fill()
      ctx.beginPath()
      for (let index = 0; index < columns.length; index++) {
        if (index) ctx.lineTo(columns[index].x, ys[index])
        else ctx.moveTo(columns[index].x, ys[index])
      }
      ctx.strokeStyle = colours.ink
      ctx.lineWidth = 0.7 + p * 0.7
      ctx.globalAlpha = 0.5 + p * 0.5
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  const loop = (time) => {
    frame = 0
    if (!visible || document.hidden) return
    // Full rate while the pointer shapes the ridges, half rate while they only drift.
    if (time - lastDraw >= (pointer.presence > 0.01 || pointer.target ? 15 : 32)) {
      lastDraw = time
      draw(time)
    }
    if (!reduceMotion.matches) frame = requestAnimationFrame(loop)
  }
  const start = () => { if (!frame) frame = requestAnimationFrame(loop) }
  const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0 }

  // Listen on the whole footer: its links and text sit above the canvas and would otherwise swallow the moves.
  const surface = canvas.closest('footer') || canvas.parentElement || canvas
  surface.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return
    const x = event.clientX - canvas.getBoundingClientRect().left
    if (pointer.presence < 0.02) pointer.current = x
    pointer.x = x
    pointer.target = 1
    if (reduceMotion.matches) { pointer.current = x; pointer.presence = 1; draw(performance.now()) }
    else start()
  }, { passive: true })
  surface.addEventListener('pointerleave', () => {
    pointer.target = 0
    if (reduceMotion.matches) { pointer.presence = 0; draw(performance.now()) }
  })

  const redraw = () => { if (resize()) draw(performance.now()) }
  if (typeof ResizeObserver === 'function') new ResizeObserver(redraw).observe(canvas)
  else window.addEventListener('resize', redraw, { passive: true })
  new MutationObserver(() => { readColours(); draw(performance.now()) }).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (visible) start() })
  reduceMotion.addEventListener?.('change', () => { stop(); if (visible) { draw(performance.now()); start() } })

  // Animate only while the footer is on screen.
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) { if (!ctx) resize(); start() } else stop()
    }, { rootMargin: '80px' }).observe(canvas)
  } else {
    visible = true
    start()
  }
})()
