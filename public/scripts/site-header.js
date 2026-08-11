const primaryNavigation = document.querySelector('.site-nav')
const mobileNavigationToggle = document.querySelector('#mobile-navigation-toggle')
const languageToggle = document.querySelector('#language-toggle')
const navMenus = primaryNavigation ? Array.from(primaryNavigation.querySelectorAll('.nav-menu')) : []
let navCloseTimer

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
  button?.addEventListener('click', () => {
    if (menu.classList.contains('is-open')) closeNavigationMenus()
    else openNavigationMenu(menu)
  })

  menu.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') openNavigationMenu(menu)
  })
  menu.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return
    navCloseTimer = window.setTimeout(() => closeNavigationMenus(), 180)
  })
  menu.addEventListener('focusin', () => openNavigationMenu(menu))
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
  const focusable = [...primaryNavigation.querySelectorAll('a, button')].filter((element) => !element.hasAttribute('disabled') && !element.closest('[inert]') && element.getClientRects().length)
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

mobileNavigationToggle?.addEventListener('click', () => {
  const isOpen = document.querySelector('.site-header')?.classList.toggle('is-nav-open') ?? false
  mobileNavigationToggle.setAttribute('aria-expanded', String(isOpen))
  updateNavigationLabels()
  if (isOpen) {
    requestAnimationFrame(() => primaryNavigation?.querySelector('a, button')?.focus())
  } else {
    closeNavigationMenus()
  }
})

primaryNavigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => closeMobileNavigation())
})

document.addEventListener('pointerdown', (event) => {
  if (primaryNavigation?.contains(event.target)) return
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
