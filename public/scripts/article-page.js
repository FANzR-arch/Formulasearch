document.querySelectorAll('.article-copy').forEach((button) => {
  const fallbackInput = button.parentElement?.querySelector('.article-copy__failure-url')
  button.addEventListener('click', async () => {
    const url = button.getAttribute('data-copy-url') || window.location.href
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(url)
      if (fallbackInput instanceof HTMLInputElement) fallbackInput.hidden = true
      button.dataset.copyState = 'copied'
      window.formulasearchAudio?.play('success', { volume: 0.26 })
      window.setTimeout(() => {
        if (button.dataset.copyState === 'copied') delete button.dataset.copyState
      }, 1800)
    } catch {
      button.dataset.copyState = 'failed'
      window.formulasearchAudio?.play('error', { volume: 0.24 })
      if (fallbackInput instanceof HTMLInputElement) {
        fallbackInput.hidden = false
        fallbackInput.focus()
        fallbackInput.select()
      }
    }
  })
})

const tocLinks = [...document.querySelectorAll('.article-toc a')]
const articleHeadings = tocLinks
  .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
  .filter(Boolean)

const updateCurrentHeading = () => {
  if (!articleHeadings.length) return
  let current = articleHeadings[0]
  for (const heading of articleHeadings) {
    if (heading.getBoundingClientRect().top <= 180) current = heading
    else break
  }
  tocLinks.forEach((link) => {
    const active = decodeURIComponent(link.hash.slice(1)) === current.id
    link.classList.toggle('is-current', active)
    if (active) link.setAttribute('aria-current', 'location')
    else link.removeAttribute('aria-current')
  })
}

let tocFrame = 0
const scheduleTocUpdate = () => {
  if (tocFrame) return
  tocFrame = requestAnimationFrame(() => {
    updateCurrentHeading()
    tocFrame = 0
  })
}

updateCurrentHeading()
window.addEventListener('scroll', scheduleTocUpdate, { passive: true })
window.addEventListener('hashchange', scheduleTocUpdate)
