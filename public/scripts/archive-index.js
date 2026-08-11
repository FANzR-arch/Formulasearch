const filterButtons = document.querySelectorAll('[data-archive-filter]')
const archiveRecords = [...document.querySelectorAll('[data-archive-record]')]
const sentinel = document.querySelector('[data-archive-sentinel]')
const statusRegion = document.querySelector('[data-archive-status]')
const batchSize = Number(document.querySelector('[data-archive-batch-size]')?.getAttribute('data-archive-batch-size')) || 1
let activeFilter = filterButtons[0]?.getAttribute('data-archive-filter') ?? 'all'
let visibleCount = archiveRecords.filter((record) => !record.hasAttribute('hidden')).length

const renderArchive = () => {
  let matchingCount = 0
  let visibleMatchCount = 0
  archiveRecords.forEach((record) => {
    const matches = activeFilter === 'all' || record.getAttribute('data-archive-record')?.split(' ').includes(activeFilter)
    const visible = matches && visibleMatchCount < visibleCount
    if (matches) {
      matchingCount += 1
      if (visible) visibleMatchCount += 1
    }
    record.toggleAttribute('hidden', !visible)
  })
  if (statusRegion instanceof HTMLElement) {
    const locale = document.documentElement.dataset.locale === 'en' ? 'en' : 'zh'
    const template = statusRegion.dataset[`status${locale === 'en' ? 'En' : 'Zh'}`] || ''
    statusRegion.textContent = template.replace('{visible}', String(visibleMatchCount)).replace('{total}', String(matchingCount))
  }
}

renderArchive()

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.getAttribute('data-archive-filter') ?? 'all'
    filterButtons.forEach((item) => {
      const selected = item.getAttribute('data-archive-filter') === activeFilter
      item.classList.toggle('is-active', selected)
      item.setAttribute('aria-pressed', String(selected))
    })
    renderArchive()
  })
})

const loadMore = () => {
  const matchingCount = archiveRecords.filter((record) => {
    return activeFilter === 'all' || record.getAttribute('data-archive-record')?.split(' ').includes(activeFilter)
  }).length
  if (visibleCount >= matchingCount) return
  visibleCount = Math.min(archiveRecords.length, visibleCount + batchSize)
  renderArchive()
}

const observer = sentinel instanceof HTMLElement && 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore()
    }, { rootMargin: '0px 0px 480px' })
  : null
observer?.observe(sentinel)

window.addEventListener('formulasearch:locale', renderArchive)
