const stage = document.querySelector('[data-cover-stage]')
const slides = [...document.querySelectorAll('[data-cover-slide]')]
const triggers = [...document.querySelectorAll('[data-stage-trigger]')]
const details = document.querySelector('[data-stage-details]')
const stageTitle = document.querySelector('[data-stage-title]')
const stageSummary = document.querySelector('[data-stage-summary]')
const stageCategory = document.querySelector('[data-stage-category]')
const stageDate = document.querySelector('[data-stage-date]')
const stageLink = document.querySelector('[data-stage-link]')
const stageCount = document.querySelector('[data-stage-count]')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let activeIndex = 0
let updateTimer = 0
const activeLocale = () => document.documentElement.dataset.locale === 'en' ? 'en' : 'zh'
const localizedDatasetValue = (trigger, key) => trigger?.dataset[`${key}${activeLocale() === 'en' ? 'En' : 'Zh'}`] || ''
const updateLocalizedElement = (element, trigger, key) => {
  if (!element) return
  const locale = activeLocale()
  const target = element.querySelector(`.localized-text__${locale}`)
  if (target) {
    target.textContent = localizedDatasetValue(trigger, key)
    const translated = trigger?.dataset[`${key}Translated`] !== 'false'
    target.setAttribute('lang', locale === 'en' && translated ? 'en' : 'zh-Hans')
  } else element.textContent = localizedDatasetValue(trigger, key)
}
const updateStageCopy = (trigger) => {
  updateLocalizedElement(stageTitle, trigger, 'stageTitle')
  updateLocalizedElement(stageSummary, trigger, 'stageSummary')
  updateLocalizedElement(stageCategory, trigger, 'stageCategory')
}

const activateStage = (nextIndex) => {
  if (!stage || nextIndex === activeIndex || !triggers[nextIndex]) return
  const trigger = triggers[nextIndex]
  activeIndex = nextIndex

  slides.forEach((slide, index) => {
    const isActive = index === nextIndex
    slide.classList.toggle('is-active', isActive)
    slide.setAttribute('aria-hidden', String(!isActive))
    slide.setAttribute('tabindex', isActive ? '0' : '-1')
  })

  triggers.forEach((item, index) => {
    const isActive = index === nextIndex
    item.classList.toggle('is-active', isActive)
    if (isActive) item.setAttribute('aria-current', 'true')
    else item.removeAttribute('aria-current')
  })

  if (stageCount) stageCount.textContent = `${String(nextIndex + 1).padStart(2, '0')} / ${String(triggers.length).padStart(2, '0')}`
  details?.classList.add('is-updating')
  window.clearTimeout(updateTimer)
  updateTimer = window.setTimeout(() => {
    updateStageCopy(trigger)
    if (stageDate) stageDate.textContent = trigger.dataset.stageDate || ''
    if (stageLink) {
      const stageHref = trigger.dataset.stageHref
      if (!stageHref) {
        stageLink.removeAttribute('href')
        stageLink.removeAttribute('target')
        stageLink.removeAttribute('rel')
      } else if (trigger.dataset.stageExternal === 'true') {
        stageLink.setAttribute('href', stageHref)
        stageLink.setAttribute('target', '_blank')
        stageLink.setAttribute('rel', 'noopener noreferrer')
      } else {
        stageLink.setAttribute('href', stageHref)
        stageLink.removeAttribute('target')
        stageLink.removeAttribute('rel')
      }
    }
    details?.classList.remove('is-updating')
  }, reduceMotion ? 0 : 150)
}

triggers.forEach((trigger, index) => {
  trigger.addEventListener('mouseenter', () => activateStage(index))
  trigger.addEventListener('focus', () => activateStage(index))
})

window.addEventListener('formulasearch:locale', () => {
  const activeTrigger = triggers[activeIndex]
  if (!activeTrigger) return
  updateStageCopy(activeTrigger)
})

const revealItems = [
  ...document.querySelectorAll('[data-reveal]'),
  ...document.querySelectorAll('.recent-stream .post-row'),
]

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'))
} else {
  document.documentElement.classList.add('motion-ready')
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
  revealItems.forEach((item) => revealObserver.observe(item))
}
