(() => {
  // Decorative relationship lines never intercept keyword or navigation input.
  const svg = document.querySelector('[data-home-connections]')
  if (!svg) return
  const mappings = JSON.parse(svg.dataset.homeConnections)
  const enabled = matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const abort = new AbortController()
  const options = { signal: abort.signal }
  let active = null
  let targets = []
  let frame = 0
  let exitTimer = 0
  let hovered = null
  let focused = null

  const clear = () => {
    cancelAnimationFrame(frame)
    clearTimeout(exitTimer)
    exitTimer = 0
    targets.forEach(({ element }) => element.classList.remove('is-keyword-destination'))
    targets = []
    active = null
    svg.replaceChildren()
  }
  const hide = () => {
    if (!active) return
    targets.forEach(({ element }) => element.classList.remove('is-keyword-destination'))
    if (reduced.matches) { clear(); return }
    svg.getAnimations().forEach((animation) => animation.cancel())
    svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' })
    clearTimeout(exitTimer)
    exitTimer = setTimeout(clear, 180)
  }
  const visible = (element) => {
    const box = element.getBoundingClientRect()
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && !element.closest('[inert]')
  }
  const draw = () => {
    if (!active || !visible(active) || !enabled.matches) { clear(); return }
    const source = active.getBoundingClientRect()
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`)
    // Match both ends left-to-right and share vertical control points so the
    // curves stay ordered, even when navigation items have different heights.
    const ordered = targets.map((target) => ({ ...target, dest: target.element.getBoundingClientRect() }))
      .sort((a, b) => (a.dest.left + a.dest.width / 2) - (b.dest.left + b.dest.width / 2))
    const downward = targets.every(({ element }) => element.hasAttribute('data-connection-contact'))
    const endY = downward ? Math.min(...ordered.map(({ dest }) => dest.top)) - 4 : Math.max(...ordered.map(({ dest }) => dest.bottom)) + 4
    const y = downward ? source.bottom + 4 : source.top - 4
    const travel = endY - y
    const x = source.left + source.width / 2
    ordered.forEach(({ dest, path }) => {
      const endX = dest.left + dest.width / 2
      path.setAttribute('d', `M ${x} ${y} C ${x} ${y + travel * .52}, ${endX} ${endY - travel * .34}, ${endX} ${endY}`)
    })
    // Track layout while note text types, scrolls, or changes language.
    frame = requestAnimationFrame(draw)
  }
  const show = (button) => {
    if (button === active && !exitTimer) return
    clear()
    exitTimer = 0
    svg.getAnimations().forEach((animation) => animation.cancel())
    if (!button || !enabled.matches || !visible(button)) return
    const routes = mappings[button.dataset.highlightLabel] || []
    const links = [...document.querySelectorAll('.site-header a[href]')]
    targets = routes.flatMap(({ route, weight }) => {
      const element = route.startsWith('contact:')
        ? document.querySelector(`[data-connection-contact="${route.slice(8)}"]`)
        : links.find((link) => {
        const path = new URL(link.href).pathname.replace(/^\/en(?=\/|$)/, '').replace(/\/$/, '') || '/'
        return path === route && !new URL(link.href).hash && visible(link)
      })
      if (!element || !visible(element)) return []
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('pathLength', '1')
      path.dataset.destination = route
      path.dataset.weight = weight
      path.style.strokeWidth = weight === 'primary' ? '1.5px' : '.7px'
      svg.append(path)
      element.classList.add('is-keyword-destination')
      return [{ element, path }]
    })
    if (!targets.length) return
    active = button
    draw()
    if (!reduced.matches) targets.forEach(({ path }, index) => {
      path.animate([{ strokeDasharray: '1', strokeDashoffset: 1, opacity: 0 }, { strokeDasharray: '1', strokeDashoffset: 0, opacity: .23 }],
        { duration: 480, delay: index * 65, easing: 'cubic-bezier(.25,1,.5,1)', fill: 'backwards' })
    })
  }
  const keyword = (element) => element instanceof Element ? element.closest('button[data-home-keyword]') : null
  document.addEventListener('pointerover', (event) => {
    const next = keyword(event.target)
    if (next === hovered) return
    hovered = next
    if (hovered || focused) show(hovered || focused)
    else hide()
  }, options)
  document.addEventListener('pointerout', (event) => {
    if (event.relatedTarget) return
    hovered = null
    if (focused) show(focused)
    else hide()
  }, options)
  document.addEventListener('focusin', (event) => { const button = keyword(event.target); focused = button?.matches(':focus-visible') ? button : null; if (focused) show(focused) }, options)
  document.addEventListener('focusout', () => { focused = null; if (!hovered) hide() }, options)
  const reset = () => { hovered = null; focused = null; clear() }
  window.addEventListener('formulasearch:locale', reset, options)
  window.addEventListener('blur', reset, options)
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') reset() }, options)
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset() }, options)
  enabled.addEventListener('change', reset, options)
  reduced.addEventListener('change', reset, options)
  document.addEventListener('astro:before-swap', () => { reset(); abort.abort() }, options)
  window.addEventListener('pagehide', reset, options)
})()
