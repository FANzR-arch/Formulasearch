(() => {
  const root = document.documentElement
  const localeStorageKey = 'formulasearch-locale'
  const themeStorageKey = 'formulasearch-theme'
  const routeTransitionStorageKey = 'formulasearch-route-transition'
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let activeRouteTransition
  let interruptedPointer

  // Establish entry state in the head, before either page content or a snapshot paints.
  try {
    if (document.referrer && new URL(document.referrer).origin === location.origin) root.dataset.siteEntry = 'internal'
    if (sessionStorage.getItem('formulasearch-intro-seen') === 'true') root.dataset.intro = 'skip'
  } catch {}
  if (root.dataset.siteEntry === 'internal' || prefersReducedMotion.matches || window.self !== window.top) root.dataset.intro = 'skip'

  document.addEventListener('pointerdown', (event) => {
    interruptedPointer = activeRouteTransition ? {
      x: event.clientX, y: event.clientY, finished: activeRouteTransition.finished,
    } : undefined
    activeRouteTransition?.skipTransition()
  }, { capture: true, passive: true })
  document.addEventListener('pointercancel', () => { interruptedPointer = undefined }, { capture: true })
  document.addEventListener('keydown', () => activeRouteTransition?.skipTransition(), { capture: true })

  // Native document snapshots retarget pointer input to <html>. Finish the
  // interrupted wipe, then deliver that one click to the actual control beneath.
  document.addEventListener('click', (event) => {
    if (!event.isTrusted || !interruptedPointer) return
    const pointer = interruptedPointer
    interruptedPointer = undefined
    if (event.target !== root || event.button !== 0 || Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) return
    event.preventDefault()
    const click = { bubbles: true, cancelable: true, composed: true, view: window,
      detail: event.detail, clientX: event.clientX, clientY: event.clientY,
      button: event.button, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
      shiftKey: event.shiftKey, altKey: event.altKey }
    pointer.finished.then(() => {
      const target = document.elementFromPoint(click.clientX, click.clientY)
      if (!target || target === root || target.closest('[inert], :disabled')) return
      target.closest('a[href], button, input, select, textarea')?.focus({ preventScroll: true })
      target.dispatchEvent(new MouseEvent('click', click))
    }, () => {})
  }, { capture: true })

  const clearViewTransitionType = (type) => {
    if (root.dataset.viewTransition === type) delete root.dataset.viewTransition
  }

  const setRouteTransitionOrigin = (event) => {
    if (prefersReducedMotion.matches || event.defaultPrevented || event.button !== 0 || event.detail === 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute('download') || link.dataset.routeTransition === 'off') return
    const destination = new URL(link.href, window.location.href)
    if (destination.origin !== window.location.origin) return
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) return
    const bounds = link.getBoundingClientRect()
    try {
      sessionStorage.setItem(routeTransitionStorageKey, JSON.stringify({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        timestamp: Date.now(),
        destination: destination.href,
      }))
    } catch {}
  }

  document.addEventListener('click', setRouteTransitionOrigin, { capture: true })

  window.addEventListener('pagereveal', (event) => {
    if (!event.viewTransition) return
    root.dataset.siteEntry = 'internal'
    root.dataset.intro = 'skip'
    activeRouteTransition = event.viewTransition
    const finish = () => {
      if (activeRouteTransition !== event.viewTransition) return
      activeRouteTransition = undefined
      clearViewTransitionType('route')
      window.dispatchEvent(new Event('formulasearch:route-settled'))
    }
    event.viewTransition.finished.then(finish, finish)
    if (prefersReducedMotion.matches) {
      try { sessionStorage.removeItem(routeTransitionStorageKey) } catch {}
      event.viewTransition.skipTransition()
      return
    }
    try {
      const record = JSON.parse(sessionStorage.getItem(routeTransitionStorageKey) || 'null')
      if (!record || Date.now() - record.timestamp > 6_000 || (record.destination && record.destination !== location.href)) {
        sessionStorage.removeItem(routeTransitionStorageKey)
        event.viewTransition.skipTransition()
        return
      }
      root.dataset.viewTransition = 'route'
      // Snapshot coordinates can be scaled by the browser's page zoom. Keep
      // the origin and radius relative to the viewport, not raw CSS pixels.
      const width = record.viewportWidth > 0 ? record.viewportWidth : innerWidth
      const height = record.viewportHeight > 0 ? record.viewportHeight : innerHeight
      const x = Number.isFinite(record.x) ? record.x / width : .5
      const y = Number.isFinite(record.y) ? record.y / height : .5
      const radius = Math.hypot(Math.max(x, 1 - x) * innerWidth, Math.max(y, 1 - y) * innerHeight)
      root.style.setProperty('--route-x', `${x * 100}%`)
      root.style.setProperty('--route-y', `${y * 100}%`)
      root.style.setProperty('--route-radius', `${radius / Math.hypot(innerWidth, innerHeight) * Math.SQRT2 * 100}%`)
      event.viewTransition.ready.then(() => sessionStorage.removeItem(routeTransitionStorageKey), () => {})
    } catch { event.viewTransition.skipTransition() }
  })

  const replaceFailedMedia = (event) => {
    const image = event.target
    if (!(image instanceof HTMLImageElement) || !image.closest('.article-prose, .article-cover') || image.dataset.mediaState === 'unavailable') return
    image.dataset.mediaState = 'unavailable'
    const picture = image.closest('picture')
    const fallback = document.createElement(picture ? 'div' : 'span')
    const altZh = image.dataset.altZh || image.alt || ''
    const altEn = image.dataset.altEn || altZh
    fallback.className = 'article-media-fallback'
    fallback.dataset.mediaFallback = 'true'
    fallback.dataset.altZh = altZh
    fallback.dataset.altEn = altEn
    fallback.setAttribute('role', 'img')
    const locale = root.dataset.locale === 'en' ? 'en' : 'zh'
    const alt = locale === 'en' ? altEn : altZh
    fallback.setAttribute('aria-label', alt)
    fallback.textContent = alt
    if (picture) picture.replaceWith(fallback)
    else image.replaceWith(fallback)
  }

  document.addEventListener('error', replaceFailedMedia, true)

  const applyLocale = (locale) => {
    const nextLocale = locale === 'en' ? 'en' : 'zh'
    root.dataset.locale = nextLocale
    root.lang = nextLocale === 'en' ? 'en' : 'zh-Hans'
    const titleValue = root.dataset[nextLocale === 'en' ? 'metaTitleEn' : 'metaTitleZh']
    const descriptionValue = root.dataset[nextLocale === 'en' ? 'metaDescriptionEn' : 'metaDescriptionZh']
    if (titleValue) {
      document.title = titleValue
      document.querySelector('#og-title')?.setAttribute('content', titleValue)
      document.querySelector('#twitter-title')?.setAttribute('content', titleValue)
    }
    if (descriptionValue) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', descriptionValue)
      document.querySelector('#og-description')?.setAttribute('content', descriptionValue)
      document.querySelector('#twitter-description')?.setAttribute('content', descriptionValue)
    }
    document.querySelector('#og-locale')?.setAttribute('content', nextLocale === 'en' ? 'en_US' : 'zh_CN')
    document.querySelectorAll('[data-aria-en][data-aria-zh]').forEach((element) => {
      element.setAttribute('aria-label', element.dataset[`aria${nextLocale === 'en' ? 'En' : 'Zh'}`] || '')
    })
    document.querySelectorAll('[data-title-en][data-title-zh]').forEach((element) => {
      element.setAttribute('title', element.dataset[`title${nextLocale === 'en' ? 'En' : 'Zh'}`] || '')
    })
    document.querySelectorAll('[data-alt-en][data-alt-zh]').forEach((element) => {
      const alt = element.dataset[`alt${nextLocale === 'en' ? 'En' : 'Zh'}`] || ''
      if (element instanceof HTMLImageElement) element.setAttribute('alt', alt)
      if (element.classList.contains('article-media-fallback')) {
        element.setAttribute('aria-label', alt)
        element.textContent = alt
      }
    })
  }

  const getThemeLabel = (theme) => {
    const isEnglish = root.dataset.locale === 'en'
    const target = theme === 'dark' ? 'themeToLight' : 'themeToDark'
    return root.dataset[`${target}${isEnglish ? 'En' : 'Zh'}`] || ''
  }

  const applyTheme = (theme) => {
    const nextTheme = theme === 'dark' ? 'dark' : 'light'
    root.dataset.theme = nextTheme
    document.querySelectorAll('img[data-theme-image]').forEach((image) => {
      const suffix = nextTheme === 'dark' ? 'Dark' : 'Light'
      image.srcset = image.dataset[`srcset${suffix}`]
      image.src = image.dataset[`src${suffix}`]
    })
    const themeToggle = document.querySelector('#theme-toggle')
    const themeColor = document.querySelector('meta[name="theme-color"]')
    themeToggle?.setAttribute('aria-pressed', String(nextTheme === 'dark'))
    themeToggle?.setAttribute('aria-label', getThemeLabel(nextTheme))
    themeToggle?.setAttribute('title', getThemeLabel(nextTheme))
    const themeColorValue = root.dataset[`themeColor${nextTheme === 'dark' ? 'Dark' : 'Light'}`]
    themeColor?.setAttribute('content', themeColorValue || '')
  }

  const getInitialTheme = () => {
    try {
      const storedTheme = localStorage.getItem(themeStorageKey)
      if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const routeLocale = root.dataset.routeLocale === 'en' ? 'en' : 'zh'
  try { applyLocale(localStorage.getItem(localeStorageKey) || routeLocale) } catch { applyLocale(routeLocale) }
  try { applyTheme(getInitialTheme()) } catch { applyTheme('light') }
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
  systemTheme.addEventListener?.('change', (event) => {
    try {
      if (!localStorage.getItem(themeStorageKey)) applyTheme(event.matches ? 'dark' : 'light')
    } catch {}
  })
  window.formulasearchSetLocale = (locale) => {
    applyLocale(locale)
    applyTheme(root.dataset.theme || 'light')
    try { localStorage.setItem(localeStorageKey, root.dataset.locale || 'zh') } catch {}
    window.dispatchEvent(new CustomEvent('formulasearch:locale', { detail: { locale: root.dataset.locale } }))
  }
  window.formulasearchSetTheme = (theme) => {
    applyTheme(theme)
    try { localStorage.setItem(themeStorageKey, root.dataset.theme || 'light') } catch {}
    window.dispatchEvent(new CustomEvent('formulasearch:theme', { detail: { theme: root.dataset.theme } }))
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyLocale(root.dataset.locale || 'zh')
    applyTheme(root.dataset.theme || 'light')

    const themeToggle = document.querySelector('#theme-toggle')
    let themeChanging = false
    themeToggle?.addEventListener('click', () => {
      if (themeChanging) return
      const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark'
      const commitTheme = () => window.formulasearchSetTheme(nextTheme)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !document.startViewTransition) return commitTheme()

      const rect = themeToggle.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
      root.style.setProperty('--theme-x', `${x}px`)
      root.style.setProperty('--theme-y', `${y}px`)
      root.style.setProperty('--theme-radius', `${radius}px`)
      root.dataset.viewTransition = 'theme'
      root.classList.add('is-theme-switching')
      themeChanging = true
      try {
        const transition = document.startViewTransition(commitTheme)
        const finish = () => {
          themeChanging = false
          root.classList.remove('is-theme-switching')
          clearViewTransitionType('theme')
        }
        transition.finished.then(finish, finish)
      } catch {
        commitTheme()
        themeChanging = false
        root.classList.remove('is-theme-switching')
        clearViewTransitionType('theme')
      }
    })

  })
})()
