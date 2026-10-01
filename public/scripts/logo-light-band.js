// Animate a continuous brightness profile in arc-length order on the original SVG path.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const namespace = 'http://www.w3.org/2000/svg'
  const count = 96
  const duration = 10000
  const stops = []
  document.querySelectorAll('svg[data-logo-light-band]').forEach(svg => {
    const halo = svg.querySelector('[data-logo-light-halo]')
    const core = svg.querySelector('[data-logo-light-core]')
    if (!halo || !core) return
    const segments = Array.from({ length: count }, (_, index) => [halo, core].map(group => {
      const segment = document.createElementNS(namespace, 'use')
      segment.setAttribute('href', '#intro-logo-light-shape')
      // Adjacent intervals touch; soften the complete band rather than individual lamps.
      segment.setAttribute('stroke-dasharray', `${1 / count} ${1 - 1 / count}`)
      segment.setAttribute('stroke-dashoffset', String(-index / count))
      group.append(segment)
      return segment
    }))
    const randomPeak = () => .55 + Math.random() * .45
    const waves = [
      { center: 0, width: .047, from: 1, to: randomPeak() },
      { center: .37, width: .066, from: .68, to: randomPeak() },
      { center: .73, width: .038, from: .88, to: randomPeak() },
    ]
    const started = performance.now()
    let cycle = 0
    let frame = 0
    let painted = -Infinity
    let releaseStarted
    const render = elapsed => {
      const nextCycle = Math.floor(elapsed / duration)
      if (nextCycle !== cycle) {
        waves.forEach(wave => { wave.from = wave.to; wave.to = randomPeak() })
        cycle = nextCycle
      }
      const phase = (elapsed % duration) / duration
      const blend = .5 - .5 * Math.cos(phase * Math.PI)
      segments.forEach((layers, index) => {
        const position = (index + .5) / count
        let intensity = .018
        waves.forEach(wave => {
          const distance = ((position - phase - wave.center + 2.5) % 1) - .5
          const amplitude = wave.from + (wave.to - wave.from) * blend
          intensity += amplitude * Math.exp(-.5 * (distance / wave.width) ** 2)
        })
        const opacity = String(Math.min(1, intensity))
        layers.forEach(layer => { layer.style.opacity = opacity })
      })
    }
    const tick = now => {
      if (!svg.isConnected) return
      if (svg.closest('.intro-overlay.is-ready')) {
        releaseStarted ??= now
        // Keep the wave moving through its fade, then release the costly glow
        // before the logo scales up. Never rasterize a screen-sized blur.
        if (now - releaseStarted >= 900) {
          halo.replaceChildren()
          core.replaceChildren()
          return
        }
      }
      if (now - painted >= 1000 / 30 && !document.hidden) {
        render(now - started)
        painted = now
      }
      frame = requestAnimationFrame(tick)
    }
    render(0)
    if (!reduced) frame = requestAnimationFrame(tick)
    stops.push(() => cancelAnimationFrame(frame))
  })
  addEventListener('pagehide', () => stops.forEach(stop => stop()), { once: true })
})()
