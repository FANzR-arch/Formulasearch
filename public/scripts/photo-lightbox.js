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
  const cursor = document.querySelector('[data-site-cursor]')
  const cursorHost = cursor?.parentElement || document.body
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let opener = null
  let openingRect = null
  let closingPromise = null
  let viewVersion = 0

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
        { duration: 560, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'both' },
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
      { duration: 480, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'both' },
    )
    return new Promise((resolve) => {
      animation.onfinish = resolve
      animation.oncancel = resolve
    })
  }

  const closeWithAnimation = () => {
    if (!dialog.open || closingPromise) return
    window.formulasearchAudio?.play('close', { volume: 0.22 })
    const originRect = getOpeningRect(opener) || openingRect
    viewVersion += 1
    dialog.classList.add('is-closing')
    closingPromise = animateToThumbnail(originRect).then(() => {
      if (dialog.open) dialog.close()
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
  }

  document.querySelectorAll('[data-photo-open]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!(button instanceof HTMLElement)) return
      const version = ++viewVersion
      const originRect = getOpeningRect(button)
      opener = button
      openingRect = originRect
      update()
      if (cursor instanceof HTMLElement && cursor.parentElement !== dialog) dialog.append(cursor)
      dialog.showModal()
      await waitForImage()
      if (version === viewVersion && dialog.open && !closingPromise) animateFromThumbnail(originRect, version)
    })
  })

  image?.addEventListener('load', updateOrientation)
  dialog.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
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
    openingRect = null
    closingPromise = null
  })
  window.addEventListener('formulasearch:locale', update)
})()
