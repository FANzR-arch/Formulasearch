// A complete photo archive with bounded, slow column drift. Every original stays
// in document flow, so scrolling reaches every photo without waiting for a loop.
document.addEventListener('DOMContentLoaded', () => {
  const wall = document.querySelector('[data-photo-drift]')
  if (!wall) return
  const plane = wall.querySelector('.photo-drift__plane')
  const viewport = wall.querySelector('.photo-drift__viewport')
  const originals = [...plane.children]
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const mobile = matchMedia('(max-width: 680px)')
  let tracks = [], phases = []
  let frame = 0, last = 0, visible = false, still = reduced.matches
  let hoverColumn = -1
  const pointer = { x: 0, y: 0 }
  const offset = { x: 0, y: 0 }

  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0 }
  const canAnimate = () => visible && !still && !document.hidden && !document.querySelector('[data-photo-lightbox][open]')
  const tick = (ts) => {
    frame = 0
    if (!canAnimate()) { last = 0; return }
    const dt = last ? Math.min(.05, (ts - last) / 1000) : 0
    last = ts
    const ease = 1 - Math.exp(-dt / .18)
    offset.x += (pointer.x - offset.x) * ease
    offset.y += (pointer.y - offset.y) * ease
    // Translate the whole wall together so photo proportions and gaps stay fixed.
    plane.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0)`
    tracks.forEach((track, c) => {
      if (c !== hoverColumn) phases[c] += dt / 8
      const offset = 24 + 24 * Math.sin(phases[c]) * (c % 2 ? 1 : -1)
      track.style.transform = `translate3d(0, ${offset}px, 0)`
    })
    frame = requestAnimationFrame(tick)
  }
  const start = () => { if (!frame && canAnimate()) frame = requestAnimationFrame(tick) }
  const mode = () => {
    stop()
    wall.classList.toggle('is-static', still)
    wall.classList.toggle('is-running', !still)
    plane.style.transform = ''
    pointer.x = pointer.y = offset.x = offset.y = 0
    if (still) {
      // Source order and all images remain available to keyboard and touch users.
      originals.forEach(record => plane.append(record))
      plane.querySelectorAll('.photo-drift__column').forEach(column => column.remove())
      tracks = []
    } else build()
  }
  const build = () => {
    stop()
    originals.forEach(record => plane.append(record))
    plane.querySelectorAll('.photo-drift__column').forEach(column => column.remove())
    if (still) return
    const count = mobile.matches ? 2 : 3
    const gap = parseFloat(getComputedStyle(wall).getPropertyValue('--drift-gap'))
    const width = (plane.clientWidth - gap * (count - 1)) / count
    const columns = Array.from({ length: count }, () => ({ items: [], height: 0 }))
    const photos = originals.map((record, index) => {
      const photo = record.querySelector('[data-photo-open]')
      return { record, index, height: width * Number(photo.dataset.photoHeight) / Number(photo.dataset.photoWidth) + gap }
    })
    // Fill the shortest column by rendered height, then exchange photos to
    // minimize the remaining tail. Keep source order within each column.
    photos.forEach(photo => {
      const column = columns.reduce((shortest, candidate) => candidate.height < shortest.height ? candidate : shortest)
      column.items.push(photo)
      column.height += photo.height
    })
    for (let pass = 0; pass < 20; pass++) {
      let best = null, improvement = 0
      for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
        for (const left of columns[a].items) for (const right of columns[b].items) {
          if (left.index < count || right.index < count) continue
          const delta = left.height - right.height
          const gain = 2 * delta * (columns[a].height - columns[b].height - delta)
          if (gain > improvement + .01) { improvement = gain; best = { a, b, left, right, delta } }
        }
      }
      if (!best) break
      const { a, b, left, right, delta } = best
      columns[a].items[columns[a].items.indexOf(left)] = right
      columns[b].items[columns[b].items.indexOf(right)] = left
      columns[a].height -= delta
      columns[b].height += delta
    }
    tracks = Array.from({ length: count }, (_, c) => {
      const column = document.createElement('div')
      column.className = 'photo-drift__column'
      column.dataset.driftColumn = String(c)
      const track = document.createElement('div')
      track.className = 'photo-drift__track'
      column.append(track)
      plane.append(column)
      columns[c].items.sort((a, b) => a.index - b.index).forEach(photo => track.append(photo.record))
      phases[c] = 0
      track.style.transform = 'translate3d(0, 24px, 0)'
      return track
    })
    start()
  }
  wall.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || still) return
    const rect = viewport.getBoundingClientRect()
    const top = Math.max(0, rect.top)
    const height = Math.max(1, Math.min(innerHeight, rect.bottom) - top)
    const clamp = value => Math.max(-1, Math.min(1, value))
    pointer.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1) * 12
    pointer.y = clamp((event.clientY - top) / height * 2 - 1) * 8
    hoverColumn = event.target.closest('.archive-record') ? Number(event.target.closest('[data-drift-column]')?.dataset.driftColumn ?? -1) : -1
  })
  wall.addEventListener('pointerleave', () => { hoverColumn = -1; pointer.x = pointer.y = 0 })
  wall.addEventListener('focusin', event => {
    if (event.target.matches('[data-photo-open]:focus-visible') && !still) {
      const focused = event.target
      still = true
      mode()
      focused.focus({ preventScroll: true })
    }
  })
  reduced.addEventListener('change', () => { still = reduced.matches; mode() })
  mobile.addEventListener('change', build)
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; visible ? start() : stop() }).observe(viewport)
  } else visible = true
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start())
  const dialog = document.querySelector('[data-photo-lightbox]')
  if (dialog) new MutationObserver(() => dialog.open ? stop() : start()).observe(dialog, { attributes: true, attributeFilter: ['open'] })
  mode()
}, { once: true })
