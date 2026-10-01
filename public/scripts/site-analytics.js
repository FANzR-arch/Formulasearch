// GA4 content-interest events. Enabled only by a valid ID on the configured public host.
(() => {
  const script = document.currentScript
  const id = script?.dataset.measurementId || ''
  if (!/^G-[A-Z0-9]+$/.test(id) || location.hostname !== script?.dataset.siteHost || window.self !== window.top) return

  const start = () => {
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments) }
    const gtag = window.gtag
    const pageLocation = location.origin + location.pathname
    const canonicalPath = path => path.replace(/^\/en(?=\/|$)/, '') || '/'
    const pageId = canonicalPath(location.pathname)
    const group = pageId.split('/').filter(Boolean)[0] || 'home'
    const cleanUrl = value => {
      try {
        const url = new URL(value, location.href)
        return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : ''
      } catch { return '' }
    }
    const contentId = value => {
      try {
        const url = new URL(value, location.href)
        if (!/^https?:$/.test(url.protocol)) return ''
        return (url.origin === location.origin ? canonicalPath(url.pathname) : url.origin + url.pathname).slice(0, 100)
      } catch { return '' }
    }
    const send = (event, properties = {}) => {
      gtag('event', event, {
        send_to: id,
        page_location: pageLocation,
        page_referrer: cleanUrl(document.referrer),
        content_group: group,
        site_language: document.documentElement.dataset.locale === 'en' ? 'en' : 'zh',
        ...properties,
      })
    }
    gtag('js', new Date())
    gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: pageLocation,
      page_referrer: cleanUrl(document.referrer),
    })
    send('page_view')
    const loader = document.createElement('script')
    loader.async = true
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.append(loader)

    const placement = element => element.closest('.site-header') ? 'navigation'
      : element.closest('section[id]')?.id || (element.closest('footer') ? 'footer' : 'content')
    const once = new Set()
    const sendOnce = (event, key, properties) => {
      const token = `${event}:${key}`
      if (once.has(token)) return
      once.add(token)
      send(event, properties)
    }
    document.addEventListener('click', event => {
      if (!(event.target instanceof Element) || event.button !== 0) return
      const control = event.target.closest('a, button, [data-ai-open]')
      if (!(control instanceof HTMLElement) || control.matches(':disabled, [aria-disabled="true"]')) return
      const where = placement(control)
      const contact = control.dataset.connectionContact
      if (['twitter', 'email', 'wechat'].includes(contact)) {
        send('contact_click', { content_id: contact, placement: where })
        return
      }
      if (control.hasAttribute('data-ai-open')) {
        send('ai_open', { content_id: 'personal-ai', placement: where })
        return
      }
      if (control.hasAttribute('data-home-keyword')) {
        queueMicrotask(() => {
          if (control.getAttribute('aria-expanded') === 'true') {
            send('keyword_open', { content_id: (control.dataset.highlightLabel || '').slice(0, 100), placement: 'home' })
          }
        })
        return
      }
      if (control.hasAttribute('data-photo-open')) {
        sendOnce('photo_open', control.dataset.photoIndex, { content_id: `photo:${control.dataset.photoIndex}`, placement: where })
        return
      }
      if (!(control instanceof HTMLAnchorElement) || event.defaultPrevented) return
      const destination = contentId(control.href)
      if (!destination || (!control.closest('main, .site-header, footer'))) return
      if (control.origin === location.origin && control.pathname === location.pathname && control.hash) {
        send('section_jump', { content_id: `${pageId}${control.hash}`.slice(0, 100), placement: where })
      } else {
        const name = control.closest('.site-header') ? 'navigation_click'
          : control.origin !== location.origin ? 'outbound_click' : 'content_click'
        send(name, { content_id: destination, placement: where })
      }
    })

    // Count actual playback, not hovering a poster or preloading metadata.
    document.addEventListener('playing', event => {
      const video = event.target
      if (!(video instanceof HTMLVideoElement) || !video.closest('main')) return
      const key = contentId(video.currentSrc || video.querySelector('source')?.src || video.src)
      if (key) sendOnce('video_start', key, { content_id: key, placement: placement(video) })
    }, true)

    let activeSeconds = 0
    let previousTick = performance.now()
    let wasActive = false
    let timer
    const article = document.querySelector('.article-prose')
    const tick = () => {
      const now = performance.now()
      const active = !document.hidden && document.hasFocus() && !document.querySelector('#intro-overlay')
      if (active && wasActive) activeSeconds += Math.min(now - previousTick, 1500) / 1000
      previousTick = now
      wasActive = active
      if (!active) return
      if (activeSeconds >= 30) sendOnce('content_engaged', pageId, { content_id: pageId, active_seconds: 30 })
      if (!article || activeSeconds < 10) return
      const bounds = article.getBoundingClientRect()
      if (bounds.height <= 0) return
      const percent = Math.min(100, Math.max(0, (innerHeight - bounds.top) / bounds.height * 100))
      for (const threshold of [25, 50, 75, 100]) {
        if (percent >= threshold) sendOnce('content_progress', threshold, { content_id: pageId, percent_scrolled: threshold })
      }
    }
    const resume = () => {
      previousTick = performance.now()
      wasActive = false
      window.clearInterval(timer)
      timer = window.setInterval(tick, 1000)
    }
    resume()
    document.addEventListener('visibilitychange', () => { previousTick = performance.now(); wasActive = false })
    window.addEventListener('blur', () => { wasActive = false })
    window.addEventListener('pagehide', () => window.clearInterval(timer))
    window.addEventListener('pageshow', event => {
      if (!event.persisted) return
      once.clear()
      activeSeconds = 0
      send('page_view')
      resume()
    })
  }
  // Download-only prefetch never executes this script. Prerender waits for activation.
  if (document.prerendering) document.addEventListener('prerenderingchange', start, { once: true })
  else start()
})()
