(() => {
  const root = document.documentElement
  const localeStorageKey = 'formulasearch-locale'
  const themeStorageKey = 'formulasearch-theme'

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
      root.classList.add('is-theme-switching')
      themeChanging = true
      try {
        const transition = document.startViewTransition(commitTheme)
        const finish = () => {
          themeChanging = false
          root.classList.remove('is-theme-switching')
        }
        transition.finished.then(finish, finish)
      } catch {
        commitTheme()
        themeChanging = false
        root.classList.remove('is-theme-switching')
      }
    })
  })
})()
