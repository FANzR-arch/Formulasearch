(() => {
  const dialog = document.querySelector('[data-photo-lightbox]')
  if (!(dialog instanceof HTMLDialogElement)) return

  const root = document.documentElement
  const image = dialog.querySelector('[data-photo-lightbox-image]')
  const index = dialog.querySelector('[data-photo-lightbox-index]')
  const title = dialog.querySelector('[data-photo-lightbox-title]')
  const caption = dialog.querySelector('[data-photo-lightbox-caption]')
  const date = dialog.querySelector('[data-photo-lightbox-date]')
  const dateRow = dialog.querySelector('[data-photo-lightbox-date-row]')
  const location = dialog.querySelector('[data-photo-lightbox-location]')
  const locationRow = dialog.querySelector('[data-photo-lightbox-location-row]')
  const position = dialog.querySelector('[data-photo-lightbox-position]')
  const media = dialog.querySelector('.photo-lightbox__media')
  const cursor = document.querySelector('[data-site-cursor]')
  const cursorHost = cursor?.parentElement || document.body
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let opener = null
  let closingPromise = null
  let viewVersion = 0
  let swipeStart = null
  let suppressBackdropClick = false

  // The drift wall regroups records into columns, so DOM order is not archive order.
  const photoButtons = () => [...document.querySelectorAll('[data-photo-open]')]
    .map((button, domIndex) => ({ button, order: Number(button.closest('[data-archive-index]')?.getAttribute('data-archive-index') ?? domIndex) }))
    .sort((a, b) => a.order - b.order)
    .map(({ button }) => button)

  const getOpeningRect = (button) => {
    const thumbnail = button.querySelector('img')
    if (!(thumbnail instanceof HTMLImageElement)) return null
    const rect = thumbnail.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 ? rect : null
  }

  const waitForImage = () => {
    if (!(image instanceof HTMLImageElement) || (image.complete && image.naturalWidth > 0)) return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => {
        image.removeEventListener('load', done)
        image.removeEventListener('error', done)
        dialog.removeEventListener('close', done)
        resolve()
      }
      image.addEventListener('load', done, { once: true })
      image.addEventListener('error', done, { once: true })
      dialog.addEventListener('close', done, { once: true })
    })
  }

  const animateFromThumbnail = (originRect, version) => {
    if (reducedMotion.matches || !(image instanceof HTMLImageElement) || !originRect) return
    requestAnimationFrame(() => {
      if (version !== viewVersion || !dialog.open || closingPromise) return
      const finalRect = image.getBoundingClientRect()
      if (!finalRect.width || !finalRect.height) return
      const scaleX = originRect.width / finalRect.width
      const scaleY = originRect.height / finalRect.height
      const translateX = originRect.left - finalRect.left
      const translateY = originRect.top - finalRect.top
      image.getAnimations().forEach((animation) => animation.cancel())
      image.style.transformOrigin = 'top left'
      const animation = image.animate(
        [
          { transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`, opacity: .86 },
          { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
        ],
        { duration: 400, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'both' },
      )
      animation.onfinish = () => {
        image.style.removeProperty('transform')
        image.style.removeProperty('opacity')
        image.style.removeProperty('transform-origin')
      }
    })
  }

  const animateToThumbnail = (originRect) => {
    if (reducedMotion.matches || !(image instanceof HTMLImageElement) || !originRect) return Promise.resolve()
    // Capture the visible pose before cancelling; derive both poses from the untransformed image.
    const currentRect = image.getBoundingClientRect()
    const currentOpacity = getComputedStyle(image).opacity
    image.getAnimations().forEach((animation) => animation.cancel())
    image.style.transformOrigin = 'top left'
    const finalRect = image.getBoundingClientRect()
    if (!finalRect.width || !finalRect.height) return Promise.resolve()
    const fromTransform = `translate3d(${currentRect.left - finalRect.left}px, ${currentRect.top - finalRect.top}px, 0) scale(${currentRect.width / finalRect.width}, ${currentRect.height / finalRect.height})`
    const scaleX = originRect.width / finalRect.width
    const scaleY = originRect.height / finalRect.height
    const translateX = originRect.left - finalRect.left
    const translateY = originRect.top - finalRect.top
    const animation = image.animate(
      [
        { transform: fromTransform, opacity: currentOpacity },
        { transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`, opacity: .86 },
      ],
      { duration: 320, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'both' },
    )
    return new Promise((resolve) => {
      animation.onfinish = resolve
      animation.oncancel = resolve
    })
  }

  const isInViewport = (rect) => rect && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth

  const closeWithAnimation = () => {
    if (!dialog.open || closingPromise) return
    // After browsing to another photo, bring its thumbnail back into view so the image returns to it.
    if (opener instanceof HTMLElement && !isInViewport(getOpeningRect(opener))) opener.scrollIntoView({ block: 'center', behavior: 'instant' })
    const currentRect = getOpeningRect(opener)
    const originRect = isInViewport(currentRect) ? currentRect : null
    viewVersion += 1
    dialog.classList.add('is-closing')
    closingPromise = animateToThumbnail(originRect).then(() => {
      if (!dialog.open) return
      const current = opener
      dialog.close()
      // close() restores focus to the photo that first opened the viewer; after browsing,
      // move it to the photo being shown now, before the async close event runs.
      if (current instanceof HTMLElement) current.focus({ preventScroll: true })
    })
  }

  const updateOrientation = () => {
    if (!(opener instanceof HTMLElement)) return
    const width = Number(opener.dataset.photoWidth)
    const height = Number(opener.dataset.photoHeight)
    if (width > 0 && height > 0) {
      dialog.dataset.orientation = width >= height ? 'landscape' : 'portrait'
      return
    }
    if (image instanceof HTMLImageElement && image.naturalWidth > 0 && image.naturalHeight > 0) {
      dialog.dataset.orientation = image.naturalWidth >= image.naturalHeight ? 'landscape' : 'portrait'
    }
  }

  const localValue = (element, key) => {
    if (!(element instanceof HTMLElement)) return ''
    return element.dataset[`${key}${root.dataset.locale === 'en' ? 'En' : 'Zh'}`] || ''
  }

  const update = () => {
    if (!(opener instanceof HTMLElement) || !(image instanceof HTMLImageElement)) return
    const fullSource = opener.dataset.photoFullSrc || ''
    image.src = fullSource
    image.alt = localValue(opener, 'photoCaption')
    updateOrientation()
    if (index) index.textContent = `/${opener.dataset.photoIndex || ''}`
    if (title) title.textContent = localValue(opener, 'photoTitle')
    if (caption) caption.textContent = localValue(opener, 'photoCaption')

    const dateValue = localValue(opener, 'photoDate')
    const locationValue = localValue(opener, 'photoLocation')
    if (date) date.textContent = dateValue
    if (dateRow instanceof HTMLElement) dateRow.hidden = !dateValue
    if (location) location.textContent = locationValue
    if (locationRow instanceof HTMLElement) locationRow.hidden = !locationValue

    const buttons = photoButtons()
    const current = buttons.indexOf(opener)
    if (position) position.textContent = `${String(current + 1).padStart(2, '0')} / ${String(buttons.length).padStart(2, '0')}`
    dialog.querySelectorAll('[data-photo-lightbox-step]').forEach((step) => {
      if (step instanceof HTMLButtonElement) step.disabled = buttons.length < 2
    })
    // Warm the neighbours so stepping through the archive feels immediate.
    ;[-1, 1].forEach((delta) => {
      const neighbour = buttons[(current + delta + buttons.length) % buttons.length]
      const source = neighbour?.dataset.photoFullSrc
      if (source && neighbour !== opener) new Image().src = source
    })
  }

  const setLoading = () => {
    if (!(image instanceof HTMLImageElement)) return
    dialog.toggleAttribute('data-loading', !(image.complete && image.naturalWidth > 0))
  }

  const step = (delta) => {
    if (!dialog.open || closingPromise || !(opener instanceof HTMLElement)) return
    const buttons = photoButtons()
    if (buttons.length < 2) return
    const current = buttons.indexOf(opener)
    opener = buttons[(current + delta + buttons.length) % buttons.length]
    viewVersion += 1
    if (image instanceof HTMLImageElement) image.getAnimations().forEach((animation) => animation.cancel())
    update()
    setLoading()
  }

  document.addEventListener('click', async (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-photo-open]') : null
      if (!(button instanceof HTMLElement)) return
      const version = ++viewVersion
      const originRect = getOpeningRect(button)
      opener = button
      update()
      setLoading()
      if (cursor instanceof HTMLElement && cursor.parentElement !== dialog) dialog.append(cursor)
      dialog.showModal()
      await waitForImage()
      if (version === viewVersion && dialog.open && !closingPromise) animateFromThumbnail(originRect, version)
  })

  image?.addEventListener('load', () => {
    updateOrientation()
    dialog.removeAttribute('data-loading')
  })
  image?.addEventListener('error', () => dialog.removeAttribute('data-loading'))

  dialog.querySelectorAll('[data-photo-lightbox-step]').forEach((button) => {
    button.addEventListener('click', () => step(Number(button.getAttribute('data-photo-lightbox-step'))))
  })
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    step(event.key === 'ArrowLeft' ? -1 : 1)
  })
  media?.addEventListener('pointerdown', (event) => {
    suppressBackdropClick = false
    if (event.pointerType === 'mouse') return
    swipeStart = { x: event.clientX, y: event.clientY }
  })
  media?.addEventListener('pointerup', (event) => {
    if (!swipeStart) return
    const dx = event.clientX - swipeStart.x
    const dy = event.clientY - swipeStart.y
    swipeStart = null
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    suppressBackdropClick = true
    step(dx < 0 ? 1 : -1)
  })
  media?.addEventListener('pointercancel', () => { swipeStart = null })

  dialog.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (suppressBackdropClick) {
      suppressBackdropClick = false
      return
    }
    const clickedContent = target.closest('[data-photo-lightbox-image], .photo-lightbox__details > *')
    if (!clickedContent) closeWithAnimation()
  })
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeWithAnimation()
  })
  dialog.addEventListener('close', () => {
    if (image instanceof HTMLImageElement) image.getAnimations().forEach((animation) => animation.cancel())
    viewVersion += 1
    if (image instanceof HTMLImageElement) {
      image.removeAttribute('src')
      image.style.removeProperty('transform-origin')
    }
    if (cursor instanceof HTMLElement && cursor.parentElement !== cursorHost) cursorHost.append(cursor)
    opener?.focus({ preventScroll: true })
    dialog.classList.remove('is-closing')
    opener = null
    closingPromise = null
  })
  window.addEventListener('formulasearch:locale', update)
})()
