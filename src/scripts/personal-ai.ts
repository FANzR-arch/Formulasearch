import { mountPanelInteraction } from './personal-ai-panel'
// Host state machine; chat content and persistence remain in the trusted child frame.
const widget = document.querySelector<HTMLElement>('[data-personal-ai]')
if (widget?.dataset.endpoint) {
  const root = document.documentElement
  const home = widget.dataset.home === 'true'
  const surface = widget.querySelector<HTMLElement>('.pai-surface')!
  const dialog = home ? undefined : surface as HTMLDialogElement
  const panel = dialog ? mountPanelInteraction(dialog) : undefined
  const frame = surface.querySelector<HTMLIFrameElement>('iframe')!
  const closeButton = surface.querySelector<HTMLButtonElement>('.pai-close')!
  const retry = surface.querySelector<HTMLButtonElement>('.pai-retry')!
  const status = surface.querySelector<HTMLElement>('.pai-status')!
  const statusText = surface.querySelector<HTMLElement>('.pai-status-text')!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const fine = matchMedia('(hover: hover) and (pointer: fine)')
  const triggers = [...document.querySelectorAll<HTMLButtonElement>('[data-ai-open]')]
  const navTrigger = document.querySelector<HTMLButtonElement>('.pai-nav-trigger')
  const groups = home ? [...document.querySelectorAll<HTMLElement>('.intro > *, .site-footer')] : []
  const intro = home ? document.querySelector<HTMLElement>('#main-content') : null
  const footer = home ? document.querySelector<HTMLElement>('.site-footer') : null
  const url = new URL(widget.dataset.endpoint)
  url.searchParams.set('embed', '1')
  url.searchParams.set('parentOrigin', location.origin)
  url.searchParams.set('host', 'portfolio')
  if (home) url.searchParams.set('surface', 'immersive')
  const background = widget.querySelector<HTMLElement>('.pai-background')
  if (home && background) document.querySelector('.site-page')?.prepend(background)
  const origin = url.origin
  let state: 'intro' | 'entering' | 'chat' | 'exiting' = 'intro'
  let ready = false, used = false, navigating = false, version = 0, scroll = 0
  let navigationTarget = ''
  let returnFocus: HTMLElement | undefined
  let loadTimer: ReturnType<typeof setTimeout>
  let strands: { setActive(value: boolean): void; destroy(): void } | undefined
  let loadingStrands: Promise<void> | undefined
  const pending = new Map<string, (ok: boolean) => void>()
  const read = (key: string) => { try { return sessionStorage.getItem(key) } catch { return null } }
  const remember = (key: string, value: string) => { try { sessionStorage.setItem(key, value) } catch {} }
  const en = () => root.dataset.locale === 'en'
  const copy = (zh: string, english: string) => en() ? english : zh
  const post = (message: Record<string, unknown>) => frame.contentWindow?.postMessage(message, origin)
  const links = () => [
    { path: en() ? '/en/projects' : '/projects', label: copy('作品档案', 'Projects') },
    { path: en() ? '/en/blog' : '/blog', label: copy('文章与想法', 'Writing') },
  ]
  const sync = () => {
    closeButton.setAttribute('aria-label',home ? copy('返回介绍','Back to introduction') : copy('关闭聊天','Close chat'))
    if (!ready) return
    post({ type: 'pai:cursor-enable', enabled: !!document.querySelector('[data-site-cursor]') && matchMedia('(any-hover: hover) and (any-pointer: fine)').matches })
    post({ type: 'pai:theme', theme: root.dataset.theme === 'dark' ? 'dark' : 'light' })
    post({ type: 'pai:host-state', requestId: crypto.randomUUID(), active: state === 'chat' || (!home && state === 'entering'),
      locale: en() ? 'en' : 'zh', reducedMotion: reduced.matches,
      recoveryWarning: read('pai-save-warning') === '1', links: links() })
  }
  const setState = (next: typeof state) => {
    state = next
    if (home) {
      root.dataset.aiState = next
      document.querySelector<HTMLAnchorElement>('.skip-link')?.setAttribute('href', next === 'intro' ? '#main-content' : '#personal-ai-home')
    }
    triggers.forEach(t => t.setAttribute('aria-expanded', String(next !== 'intro' && next !== 'exiting')))
    frame.tabIndex = next === 'chat' ? 0 : -1
    window.dispatchEvent(new CustomEvent('formulasearch:ai-state', { detail: { active: home && next !== 'intro', settled: home && next === 'chat' } }))
    sync()
  }
  groups.forEach((group, i) => {
    group.classList.add('pai-exit-group')
    group.style.setProperty('--pai-stagger', String(Math.min(i * 60, 180)) + 'ms')
  })
  if (home) root.dataset.aiState = 'intro'
  if (read('pai-discovered')) root.dataset.aiDiscovered = ''
  if (read('pai-arriving')) {
    navTrigger?.classList.add('is-arriving')
    remember('pai-arriving', '')
  }
  const preload = () => {
    if (frame.hasAttribute('src')) return
    status.hidden = false
    statusText.textContent = copy('正在连接聊天…', 'Connecting…')
    frame.src = url.href
    clearTimeout(loadTimer)
    loadTimer = setTimeout(() => {
      if (ready) return
      statusText.textContent = copy('聊天暂未连接。可以重试，或返回继续浏览。', 'Chat is not connected. Retry or return to browsing.')
      retry.hidden = false
    }, 12000)
  }
  const loadStrands = () => {
    if (!home || loadingStrands) return
    loadingStrands = import('./strands.mjs').then(({ mountStrands }) => {
      strands = mountStrands(background!.querySelector<HTMLElement>('.pai-strands')!)
      strands?.setActive(state === 'entering' || state === 'chat')
    }).catch(() => { widget.dataset.backgroundFallback = 'true' })
  }
  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, reduced.matches ? Math.min(ms, 100) : ms))
  const open = async (trigger: HTMLElement) => {
    if (state !== 'intro' || navigating) return
    returnFocus = trigger
    scroll = window.scrollY
    root.dataset.aiDiscovered = ''
    remember('pai-discovered', '1')
    preload()
    loadStrands()
    const token = ++version
    root.toggleAttribute('data-ai-reopening', used)
    if (home) {
      surface.inert = false
      intro?.setAttribute('inert', '')
      footer?.setAttribute('inert', '')
      setState('entering')
      closeButton.focus({ preventScroll: true })
      strands?.setActive(true)
      await delay(used ? 250 : 900)
      if (token !== version) return
    } else {
      setState('entering')
      dialog!.show()
      panel?.restore()
      await panel?.transition(trigger)
      if (token !== version) return
      closeButton.focus({ preventScroll: true })
    }
    used = true
    setState('chat')
  }
  const close = async () => {
    if (state === 'intro' || state === 'exiting' || navigating) return
    const token = ++version
    setState('exiting')
    strands?.setActive(false)
    if (home) await delay(450)
    else {
      await panel?.transition(returnFocus?.isConnected ? returnFocus : navTrigger ?? closeButton, true)
      if (token !== version) return
      dialog!.close()
    }
    if (token !== version) return
    if (home) surface.inert = true
    intro?.removeAttribute('inert')
    footer?.removeAttribute('inert')
    setState('intro')
    if (home) window.scrollTo({ top: scroll, behavior: 'instant' })
    const target = returnFocus?.getClientRects().length ? returnFocus : navTrigger
    const avatar = target?.closest<HTMLElement>('[data-ai-avatar]')
    if (avatar) avatar.dataset.inviting = ''
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    if (token !== version) return
    target?.focus({ preventScroll: true })
  }
  const navigate = async (href: string) => {
    navigationTarget = href
    if (navigating) return
    navigating = true
    // Keep the current page visible while flushing an actual conversation.
    // A newer click updates navigationTarget without starting a second flush.
    remember('pai-arriving', '1')
    const requestId = crypto.randomUUID()
    const saved = new Promise<boolean>(resolve => {
      const timeout = setTimeout(() => { pending.delete(requestId); resolve(false) }, 800)
      pending.set(requestId, ok => { clearTimeout(timeout); pending.delete(requestId); resolve(ok) })
      post({ type: 'pai:prepare-navigation', requestId })
    })
    const ok = await saved
    remember('pai-save-warning', ok ? '' : '1')
    location.assign(navigationTarget)
  }
  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return
    const message = event.data
    if (message.type === 'pai:pointer' && state === 'chat') {
      // A queued frame event must not overwrite a newer pointer move on the page.
      if (!frame.matches(':hover')) return
      if (message.visible === false) {
        window.dispatchEvent(new CustomEvent('formulasearch:chat-pointer', { detail: { visible: false } }))
      } else if (message.visible === true && Number.isFinite(message.x) && Number.isFinite(message.y) && message.x >= 0 && message.y >= 0 && message.x <= frame.clientWidth && message.y <= frame.clientHeight && ['default', 'interactive', 'text'].includes(message.state)) {
        const rect = frame.getBoundingClientRect()
        panel?.pointer(rect.left + message.x, rect.top + message.y)
        window.dispatchEvent(new CustomEvent('formulasearch:chat-pointer', { detail: { visible: true, x: rect.left + message.x, y: rect.top + message.y, state: message.state, pressed: message.pressed === true } }))
      }
      return
    }
    if (message.type === 'pai:ready') {
      ready = true
      surface.dataset.ready = ''
      clearTimeout(loadTimer)
      status.hidden = true
      retry.hidden = true
      sync()
    } else if (message.type === 'pai:close') void close()
    else if (message.type === 'pai:saved' && typeof message.requestId === 'string') pending.get(message.requestId)?.(message.ok === true)
    else if (message.type === 'pai:navigate' && state === 'chat' && links().some(link => link.path === message.path)) void navigate(new URL(message.path, location.origin).href)
  })
  triggers.forEach(t => t.addEventListener('click', () => void open(t)))
  closeButton.addEventListener('click', () => void close())
  dialog?.addEventListener('cancel', event => { event.preventDefault(); void close() })
  // Record ownership before existing menu handlers close their own overlays.
  const nestedEscapes = new WeakSet<KeyboardEvent>()
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.querySelector('.site-header.is-nav-open, .nav-menu.is-open, dialog[open]:not(.pai-dialog)')) nestedEscapes.add(event)
  }, { capture: true })
  window.addEventListener('keydown', event => {
    if (!nestedEscapes.has(event) && event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('.site-header.is-nav-open, .nav-menu.is-open, dialog[open]:not(.pai-dialog)')) void close()
  })
  retry.addEventListener('click', () => {
    ready = false
    delete surface.dataset.ready
    frame.removeAttribute('src')
    retry.hidden = true
    preload()
  })
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !used || !ready) return
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link || link.target || link.hasAttribute('download')) return
    const destination = new URL(link.href, location.href)
    if (destination.origin !== location.origin || (destination.pathname === location.pathname && destination.search === location.search)) return
    event.preventDefault()
    void navigate(destination.href)
  })
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-locale'] })
  reduced.addEventListener('change', sync)
  // visualViewport tracks the mobile keyboard without opening it on entry.
  const viewport = () => {
    if (!home || !window.visualViewport) return
    const bottom = Math.max(0, innerHeight - visualViewport!.height - visualViewport!.offsetTop)
    surface.style.bottom = bottom + 'px'
  }
  visualViewport?.addEventListener('resize', viewport)
  viewport()
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return
    navigating = false
    surface.classList.remove('is-departing')
    if (home && state !== 'intro') { ++version; setState('chat'); strands?.setActive(true) }
    sync()
  })
  // The child persists continuously; this is only a best-effort extra flush.
  window.addEventListener('pagehide', () => { post({ type: 'pai:prepare-navigation', requestId: crypto.randomUUID() }); strands?.setActive(false) })
  let hintCount = Number(read('pai-hints') || 0)
  let hintsStopped = read('pai-hints-stopped') === '1'
  document.querySelectorAll<HTMLElement>('[data-ai-avatar]').forEach(avatar => {
    const portrait = avatar.querySelector<HTMLButtonElement>('.home-avatar__frame')!
    let hoverTimer: ReturnType<typeof setTimeout>, hintTimer: ReturnType<typeof setTimeout>
    let inView = false
    const stopHints = () => { hintsStopped = true; remember('pai-hints-stopped', '1'); clearTimeout(hintTimer); delete avatar.dataset.hint }
    const invite = () => { avatar.dataset.inviting = ''; portrait.setAttribute('aria-expanded', 'true'); preload() }
    const hide = () => { delete avatar.dataset.inviting; portrait.setAttribute('aria-expanded', 'false') }
    avatar.addEventListener('pointerenter', () => {
      if (!fine.matches) return
      hoverTimer = setTimeout(() => { stopHints(); invite() }, 300)
    })
    avatar.addEventListener('pointerleave', () => {
      clearTimeout(hoverTimer)
      if (fine.matches && !avatar.contains(document.activeElement)) hide()
    })
    avatar.addEventListener('focusin', () => { stopHints(); invite() })
    avatar.addEventListener('focusout', event => { if (!avatar.contains(event.relatedTarget as Node | null) && !avatar.matches(':hover')) hide() })
    portrait.addEventListener('click', () => { stopHints(); invite() })
    avatar.addEventListener('click', stopHints)
    document.addEventListener('pointerdown', event => { if (!avatar.contains(event.target as Node)) { hide(); if (inView) stopHints() } })
    const schedule = (ms: number) => {
      clearTimeout(hintTimer)
      if (!inView || fine.matches || hintsStopped || hintCount >= 2 || document.hidden || state !== 'intro') return
      hintTimer = setTimeout(() => {
        if (!inView || hintsStopped || state !== 'intro') return
        avatar.dataset.hint = ''
        remember('pai-hints', String(++hintCount))
        hintTimer = setTimeout(() => { delete avatar.dataset.hint; schedule(20000) }, 2000)
      }, ms)
    }
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; if (!inView) delete avatar.dataset.hint; schedule(5000) }, { threshold: .8 }).observe(avatar)
    document.addEventListener('visibilitychange', () => { if (document.hidden) delete avatar.dataset.hint; schedule(5000) })
  })
}
