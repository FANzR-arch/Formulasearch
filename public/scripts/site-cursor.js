(() => {
  const cursor = document.querySelector('[data-site-cursor]')
  const root = document.documentElement

  if (!(cursor instanceof HTMLElement)) return

  const body = cursor.querySelector('.site-cursor__body')
  const label = cursor.querySelector('[data-cursor-label]')
  if (!(body instanceof HTMLElement)) return

  const capabilityQuery = window.matchMedia('(any-hover: hover) and (any-pointer: fine)')
  let active = false

  const setVisible = (nextVisible) => cursor.classList.toggle('is-visible', nextVisible)

  const setState = (state, text = '') => {
    if (cursor.dataset.state !== state) cursor.dataset.state = state
    if (label instanceof HTMLElement) {
      label.textContent = text
      label.toggleAttribute('hidden', !text)
    }
  }

  const activate = () => {
    active = true
    root.dataset.cursorCapability = 'fine'
    root.dataset.cursorMode = 'custom'
    setState('default')
  }

  const deactivate = () => {
    active = false
    delete root.dataset.cursorMode
    if (!capabilityQuery.matches) delete root.dataset.cursorCapability
    setVisible(false)
    body.classList.remove('is-pressed')
    setState('default')
  }

  const getCursorTarget = (target) => {
    if (!(target instanceof Element)) return null
    return target.closest('[data-cursor-state], [data-cursor-text], [data-highlight-label], [data-photo-open], [data-photo-panel], [data-photo-lightbox-image], [data-photo-lightbox-close], .home-avatar, .hero-image, a[href], button, [role="button"], input, textarea, select, [contenteditable="true"]')
  }

  const getState = (target) => {
    if (!(target instanceof Element)) return { state: 'default', text: '' }
    if (target.matches('input, textarea, [contenteditable="true"]')) return { state: 'text', text: '' }
    if (target.dataset.cursorState) return { state: target.dataset.cursorState, text: target.dataset.cursorText || '' }
    if (target.dataset.cursorText) return { state: 'interactive', text: target.dataset.cursorText }
    if (target.matches('[data-photo-lightbox-close]')) return { state: 'photo-close', text: '' }
    if (target.matches('[data-photo-lightbox-image]')) return { state: 'photo-shrink', text: '' }
    if (target.matches('[data-photo-open], [data-photo-panel]')) return { state: 'photo-open', text: '' }
    if (target.matches('[data-highlight-label]')) return { state: 'capsule', text: '' }
    if (target.matches('.home-avatar, .hero-image')) return { state: 'media', text: '' }
    if (target.closest('.site-nav')) return { state: 'nav', text: '' }
    if (target.matches('a[href], button, select, [role="button"]')) return { state: 'interactive', text: '' }
    return { state: 'default', text: '' }
  }

  const handlePointer = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
      setVisible(false)
      return
    }
    if (!active) activate()
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
    setVisible(true)
  }

  document.addEventListener('pointermove', handlePointer, { passive: true })
  document.addEventListener('pointerover', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return
    if (!active) activate()
    const target = getCursorTarget(event.target)
    const next = getState(target)
    setState(next.state, next.text)
  }, { passive: true })
  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return
    if (!active) activate()
    body.classList.add('is-pressed')
  }, { passive: true })
  document.addEventListener('pointerup', () => body.classList.remove('is-pressed'), { passive: true })
  document.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) setVisible(false)
  }, { passive: true })
  window.addEventListener('blur', () => setVisible(false), { passive: true })
  capabilityQuery.addEventListener?.('change', ({ matches }) => {
    if (matches) activate()
    else deactivate()
  })

  if (capabilityQuery.matches) activate()
})()
