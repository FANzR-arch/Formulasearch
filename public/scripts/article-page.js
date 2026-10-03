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

// The server renders the table of contents open for desktop and no-JS readers.
// On narrow screens it sits above the body, so start collapsed to keep the text in reach.
const toc = document.querySelector('.article-toc')
const compactToc = window.matchMedia('(max-width: 1100px)')
const syncTocDisclosure = () => {
  if (toc instanceof HTMLDetailsElement) toc.open = !compactToc.matches
}
syncTocDisclosure()
compactToc.addEventListener('change', syncTocDisclosure)
toc?.addEventListener('click', (event) => {
  if (compactToc.matches && event.target instanceof Element && event.target.closest('nav a')) toc.open = false
})

const tocLinks = [...document.querySelectorAll('.article-toc a')]
const articleHeadings = tocLinks
  .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
  .filter(Boolean)

// A contents list taller than the margin does not take the wheel: it keeps the current entry in view.
const revealTocLink = (link) => {
  const nav = link.closest('.article-toc')
  if (!(nav instanceof HTMLElement) || compactToc.matches || nav.scrollHeight <= nav.clientHeight) return
  const target = link.offsetTop - nav.clientHeight / 2 + link.offsetHeight / 2
  nav.scrollTo({ top: Math.max(0, target), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

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
    if (active) {
      link.setAttribute('aria-current', 'location')
      revealTocLink(link)
    }
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
