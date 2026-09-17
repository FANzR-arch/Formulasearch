const primaryNavigation = document.querySelector('.site-nav')
const mobileNavigationToggle = document.querySelector('#mobile-navigation-toggle')
const languageToggle = document.querySelector('#language-toggle')
const navMenus = primaryNavigation ? Array.from(primaryNavigation.querySelectorAll('.nav-menu')) : []
let navCloseTimer
const navCloseDelay = 360
// A stationary pointer must not reopen the arriving page's menu after navigation.
let suppressHover = document.documentElement.dataset.siteEntry === 'internal'
document.addEventListener('pointermove', (event) => {
  if (event.movementX || event.movementY) suppressHover = false
}, { passive: true })

const getFocusableNavigationItems = () => [...(primaryNavigation?.querySelectorAll('a, button') ?? [])]
  .filter((element) => !element.hasAttribute('disabled') && !element.closest('[inert]') && element.getClientRects().length)

const focusFirstMobileNavigationItem = () => {
  getFocusableNavigationItems()[0]?.focus()
}

const updateNavigationLabels = () => {
  const localeSuffix = document.documentElement.dataset.locale === 'en' ? 'En' : 'Zh'
  const updateLabel = (element, isOpen) => {
    if (!element) return
    const state = isOpen ? 'Close' : 'Open'
    element.setAttribute('aria-label', element.dataset[`nav${state}${localeSuffix}`] || '')
  }

  updateLabel(mobileNavigationToggle, document.querySelector('.site-header')?.classList.contains('is-nav-open'))
  navMenus.forEach((menu) => {
    updateLabel(menu.querySelector('.nav-disclosure'), menu.classList.contains('is-open'))
  })
}

const closeNavigationMenus = (except) => {
  navMenus.forEach((menu) => {
    if (menu === except) return
    menu.classList.remove('is-open')
    menu.querySelector('.nav-disclosure')?.setAttribute('aria-expanded', 'false')
    menu.querySelector('.nav-popover')?.setAttribute('inert', '')
  })
  updateNavigationLabels()
}

const closeMobileNavigation = ({ restoreFocus = false } = {}) => {
  const header = document.querySelector('.site-header')
  const wasOpen = header?.classList.contains('is-nav-open')
  header?.classList.remove('is-nav-open')
  mobileNavigationToggle?.setAttribute('aria-expanded', 'false')
  updateNavigationLabels()
  if (restoreFocus && wasOpen) mobileNavigationToggle?.focus()
}

const openNavigationMenu = (menu) => {
  clearTimeout(navCloseTimer)
  closeNavigationMenus(menu)
  menu.classList.add('is-open')
  menu.querySelector('.nav-disclosure')?.setAttribute('aria-expanded', 'true')
  menu.querySelector('.nav-popover')?.removeAttribute('inert')
  updateNavigationLabels()
}

navMenus.forEach((menu) => {
  const button = menu.querySelector('.nav-disclosure')
  let openedByHover = false
  button?.addEventListener('click', (event) => {
    // pointerenter runs before click; the first click confirms that opening.
    if (event.detail > 0 && openedByHover && menu.classList.contains('is-open')) {
      openedByHover = false
      return
    }
    openedByHover = false
    if (menu.classList.contains('is-open')) closeNavigationMenus()
    else openNavigationMenu(menu)
  })

  menu.addEventListener('pointerenter', (event) => {
    if (!suppressHover && event.pointerType === 'mouse' && !window.matchMedia('(max-width: 760px)').matches) {
      openedByHover = !menu.classList.contains('is-open')
      openNavigationMenu(menu)
    }
  })
  menu.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return
    if (event.relatedTarget instanceof Node && menu.contains(event.relatedTarget)) return
    clearTimeout(navCloseTimer)
    navCloseTimer = window.setTimeout(() => {
      const popover = menu.querySelector('.nav-popover')
      if (menu.matches(':hover') || popover?.matches(':hover') || menu.contains(document.activeElement)) return
      closeNavigationMenus()
    }, navCloseDelay)
  })
  menu.addEventListener('focusin', (event) => {
    if (window.matchMedia('(max-width: 760px)').matches) return
    if (!menu.contains(event.relatedTarget) && event.target.matches(':focus-visible')) openNavigationMenu(menu)
  })
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const openButton = primaryNavigation?.querySelector('.nav-disclosure[aria-expanded="true"]')
    const mobileWasOpen = document.querySelector('.site-header')?.classList.contains('is-nav-open')
    closeNavigationMenus()
    closeMobileNavigation({ restoreFocus: mobileWasOpen })
    if (!mobileWasOpen) openButton?.focus()
    return
  }
  if (event.key !== 'Tab' || !document.querySelector('.site-header')?.classList.contains('is-nav-open')) return
  const focusable = getFocusableNavigationItems()
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && event.target === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && event.target === last) {
    event.preventDefault()
    first.focus()
  }
})

document.addEventListener('focusin', (event) => {
  if (primaryNavigation?.contains(event.target)) return
  closeNavigationMenus()
})

mobileNavigationToggle?.addEventListener('click', () => {
  const isOpen = document.querySelector('.site-header')?.classList.toggle('is-nav-open') ?? false
  mobileNavigationToggle.setAttribute('aria-expanded', String(isOpen))
  updateNavigationLabels()
  if (isOpen) {
    focusFirstMobileNavigationItem()
    requestAnimationFrame(focusFirstMobileNavigationItem)
  } else {
    closeNavigationMenus()
  }
})

primaryNavigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return
    const destination = new URL(link.href, location.href)
    // Keep the departing navigation steady until the new document takes over.
    if (destination.pathname === location.pathname && destination.search === location.search) closeMobileNavigation()
  })
})

window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return
  suppressHover = true
  closeNavigationMenus()
  closeMobileNavigation()
})

document.addEventListener('pointerdown', (event) => {
  if (primaryNavigation?.contains(event.target) || mobileNavigationToggle?.contains(event.target)) return
  closeNavigationMenus()
  closeMobileNavigation()
})

const updateLanguageToggle = () => {
  const isEnglish = document.documentElement.dataset.locale === 'en'
  languageToggle?.setAttribute('aria-pressed', String(isEnglish))
  const labelKey = isEnglish ? 'labelZhEn' : 'labelEnZh'
  languageToggle?.setAttribute('aria-label', languageToggle.dataset[labelKey] || '')
  languageToggle?.setAttribute('title', languageToggle.dataset[labelKey] || '')
}

updateLanguageToggle()
updateNavigationLabels()
languageToggle?.addEventListener('click', () => {
  const nextLocale = document.documentElement.dataset.locale === 'en' ? 'zh' : 'en'
  window.formulasearchSetLocale?.(nextLocale)
})
window.addEventListener('formulasearch:locale', () => {
  updateLanguageToggle()
  updateNavigationLabels()
})
