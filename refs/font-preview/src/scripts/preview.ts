import type { FontChoice } from '../data/fonts'
import type { Direction } from '../data/directions'
import { fontLoaders } from './font-loaders'

// A direction only supplies values for the production typography roles.
performance.setResourceTimingBufferSize(5000)
const root = document.documentElement
const choices: FontChoice[] = JSON.parse(document.querySelector('#font-choice-data')!.textContent!)
const directions: Direction[] = JSON.parse(document.querySelector('#direction-data')!.textContent!)
const select = (id: string) => document.querySelector<HTMLSelectElement>(`#${id}`)!
const directionA = select('preview-direction'), directionB = select('comparison-direction')
const headingSelect = select('heading-font'), bodySelect = select('body-font'), weightSelect = select('heading-weight')
const themeSelect = select('preview-theme'), localeSelect = select('preview-locale')
const compare = document.querySelector<HTMLInputElement>('#comparison-view')!
const adjustment = document.querySelector<HTMLInputElement>('#size-adjust')!
const panes = document.querySelector<HTMLElement>('#font-comparison')!
const paneA = panes.querySelector<HTMLElement>('[data-pane="a"]')!, paneB = panes.querySelector<HTMLElement>('[data-pane="b"]')!
const specimenA = paneA.querySelector<HTMLElement>('[data-specimens]')!, specimenB = paneB.querySelector<HTMLElement>('[data-specimens]')!
const live = document.querySelector<HTMLElement>('#font-live-preview')!
const status = document.querySelector<HTMLElement>('#font-loading-status')!
const initialStyle = getComputedStyle(root)
const system = Object.fromEntries(['--font-sans', '--font-serif', '--font-mono', '--font-cjk-sans', '--font-cjk-serif'].map(token => [token, initialStyle.getPropertyValue(token).trim()]))
const imported = new Map<string, Promise<unknown>>()
let revision = 0
const choice = (id: string) => choices.find(font => font.id === id) || choices[0]
const direction = (id: string) => directions.find(item => item.id === id) || directions[0]
const family = (id: string, fallback: string) => id === 'system' ? fallback : `"${choice(id).family}"`
const safeWeight = (id: string, requested: number) => choice(id).weights.includes(requested) ? requested : choice(id).weights[0]
function effective(base: Direction, advanced: boolean): Direction {
  const copy = structuredClone(base)
  if (advanced) {
    if (headingSelect.value !== 'auto') copy.fonts.cjkHeading = headingSelect.value
    if (bodySelect.value !== 'auto') copy.fonts.cjkBody = bodySelect.value
    if (weightSelect.value !== 'auto') copy.weights.heading = Number(weightSelect.value)
    if (headingSelect.value !== 'auto' && weightSelect.value === 'auto') copy.weights.heading = safeWeight(copy.fonts.cjkHeading, copy.weights.heading)
  }
  return copy
}
function apply(element: HTMLElement, config: Direction) {
  element.dataset.direction = config.id
  // Root aliases are computed before inheritance: recompose every font role here.
  const cjkBody = family(config.fonts.cjkBody, system['--font-cjk-sans'])
  const cjkHeading = family(config.fonts.cjkHeading, system['--font-cjk-sans'])
  const latinBody = config.fonts.latinSans === 'system' ? '"Avenir Next", "Segoe UI Variable Text", "Segoe UI"' : `"${choice(config.fonts.latinSans).family}"`
  const headingLatin = config.fonts.latinSerif && config.fonts.latinSerif !== 'system' ? `"${choice(config.fonts.latinSerif).family}"` : latinBody
  const body = `${latinBody}, ${cjkBody}, sans-serif`
  const heading = `${headingLatin}, ${cjkHeading}, ${config.fonts.latinSerif ? 'serif' : 'sans-serif'}`
  const mono = family(config.fonts.mono, system['--font-mono'])
  const values: Record<string, string> = config.id === 'current' ? {
    '--font-sans': body,
    '--font-serif': `"Iowan Old Style", Georgia, ${family(config.fonts.cjkBody, system['--font-cjk-serif'])}, serif`,
    '--font-heading': heading,
    '--font-display': `"Iowan Old Style", Georgia, ${family(config.fonts.cjkHeading, system['--font-cjk-serif'])}, serif`,
    '--font-label': body,
    '--weight-heading': String(config.weights.heading), '--weight-cjk-heading': String(config.weights.heading),
  } : {
    '--font-sans': body, '--font-serif': body, '--font-heading': heading, '--font-display': heading,
    '--font-label': config.labelStyle === 'mono-uppercase' ? `${mono}, ${cjkBody}, monospace` : body,
    '--text-home-title': config.scale.pageTitle, '--text-page-title': config.scale.pageTitle, '--text-article-title': config.scale.pageTitle,
    '--text-feature-title': config.scale.h2, '--text-2xl': config.scale.h2, '--text-xl': config.scale.h3,
    '--text-lg': config.scale.lead, '--text-lead': config.scale.lead, '--text-description': config.scale.body, '--text-base': config.scale.body,
    '--text-sm': config.scale.small, '--text-xs': config.scale.small, '--text-2xs': config.scale.label,
    '--weight-heading': String(config.weights.heading), '--weight-cjk-heading': String(safeWeight(config.fonts.cjkHeading, config.weights.heading)),
    '--weight-display': String(config.weights.heading), '--weight-body': String(config.weights.body),
    '--weight-regular': String(config.weights.body), '--weight-label': String(config.weights.label), '--weight-meta': '400',
    '--tracking-heading': config.tracking.latinHeading, '--tracking-tight': config.tracking.latinHeading,
    '--tracking-cjk-heading': config.tracking.cjkHeading, '--tracking-label': config.tracking.label,
    '--tracking-cjk-label': config.labelStyle === 'muted-plain' ? '0' : '.02em',
    '--leading-heading': String(config.leading.heading), '--leading-cjk-heading': String(config.leading.heading),
    '--leading-subheading': '1.3', '--leading-cjk-subheading': '1.3', '--leading-body': String(config.leading.body),
    '--leading-lead': String(config.leading.body), '--leading-home-copy': String(config.leading.body),
    '--leading-home-copy-zh': String(config.leading.body),
    '--leading-article-body': String(config.leading.body), '--leading-article-body-en': String(config.leading.body), '--leading-description': String(config.leading.body),
    '--label-transform': config.labelStyle === 'mono-uppercase' ? 'uppercase' : 'none', '--label-ink': 'var(--muted)',
  }
  element.removeAttribute('style')
  for (const [token, value] of Object.entries(values)) element.style.setProperty(token, value)
  element.style.setProperty('--font-cjk-sans', cjkBody)
  element.style.setProperty('--font-cjk-serif', cjkBody)
  element.style.setProperty('--font-mono', mono)
  element.style.fontSizeAdjust = adjustment.checked ? 'cap-height 0.72' : 'none'
  element.style.lineHeight = 'var(--leading-body)'
  element.style.fontSynthesis = 'none'
  // The home name is Western text even when the surrounding page is Chinese.
  for (const name of element.querySelectorAll<HTMLElement>('.intro h1')) {
    name.style.removeProperty('--tracking-cjk-heading')
    if (config.id !== 'current') name.style.setProperty('--tracking-cjk-heading', 'var(--tracking-heading)')
  }
}
const textFor = (container: HTMLElement, selector: string) => [...container.querySelectorAll<HTMLElement>(selector)].map(element => element.innerText).join(' ')
async function load(id: string, weight: number, text: string) {
  if (id === 'system') return
  if (!fontLoaders[id]) throw new Error(`缺少已核验字体入口：${id}`)
  if (!imported.has(id)) imported.set(id, fontLoaders[id]())
  await imported.get(id)
  const descriptor = `${safeWeight(id, weight)} 20px "${choice(id).family}"`
  const faces = await document.fonts.load(descriptor, text || 'Typography 排印 2026')
  if (!faces.length || !faces.every(face => face.status === 'loaded') || !document.fonts.check(descriptor, text)) throw new Error(`${choice(id).label} 未通过实际字体加载检查`)
}
async function loadDirection(config: Direction, sample: HTMLElement) {
  const headings = textFor(sample, 'h1,h2:not(.fp-specimen__label),h3,h4') + live.querySelector('h2')!.textContent
  const body = textFor(sample, 'p,li,blockquote,.site-nav a') + live.querySelector('p')!.textContent
  const labels = textFor(sample, 'time,.project-card__meta,.article-meta,.post-row__meta,code')
  await Promise.all([
    load(config.fonts.latinSans, config.weights.body, body + headings),
    load(config.fonts.latinSans, config.weights.heading, headings),
    load(config.fonts.latinSerif || 'system', config.weights.heading, headings),
    load(config.fonts.cjkHeading, config.weights.heading, headings),
    load(config.fonts.cjkBody, config.weights.body, body),
    load(config.fonts.latinSans, 600, textFor(sample, 'strong,b')),
    load(config.fonts.cjkBody, 600, textFor(sample, 'strong,b')),
    load(config.fonts.mono, config.weights.label, labels),
  ])
}
function resourceTotals(ids?: string[]) {
  const names = ids?.map(id => choice(id).packageName).filter(Boolean) as string[] | undefined
  const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(entry => /\.(woff2?|ttf|otf)(\?|$)/i.test(entry.name))
  const selected = names ? resources.filter(entry => names.some(name => decodeURIComponent(entry.name).includes(name) || entry.name.includes(`${name.split('/').at(-1)}-`))) : resources
  const files = [...new Map(selected.map(entry => [entry.name, entry])).values()]
  return { count: files.length, bytes: files.reduce((sum, entry) => sum + entry.encodedBodySize, 0), unavailable: files.filter(entry => !entry.encodedBodySize).length, transferred: files.reduce((sum, entry) => sum + entry.transferSize, 0) }
}
function spec(pane: HTMLElement, sample: HTMLElement, config: Direction) {
  pane.querySelector('[data-direction-label]')!.textContent = config.label
  pane.querySelector('[data-direction-description]')!.textContent = config.description
  const style = getComputedStyle(sample)
  const pixel = (token: string) => {
    const probe = document.createElement('span')
    probe.style.cssText = `position:absolute;visibility:hidden;font-size:var(${token})`
    sample.append(probe)
    const result = getComputedStyle(probe).fontSize
    probe.remove()
    return result
  }
  const download = resourceTotals([...Object.values(config.fonts)])
  const total = resourceTotals()
  const size = (value: { count: number; bytes: number; unavailable: number }) => value.count && !value.bytes ? '大小未提供（缓存或浏览器限制）' : `${(value.bytes / 1024).toFixed(1)} KiB${value.unavailable ? `（另 ${value.unavailable} 个大小未提供）` : ''}`
  pane.querySelector('[data-direction-download]')!.textContent = `${download.count} 切片 · ${size(download)} / 本页共 ${size(total)}`
  const rows = [
    ['西文正文', config.fonts.latinSans === 'system' ? system['--font-sans'] : choice(config.fonts.latinSans).family],
    ['西文标题', config.id === 'current' ? `页面/卡片：系统无衬线；首页：${system['--font-serif']}` : config.fonts.latinSerif ? choice(config.fonts.latinSerif).family : choice(config.fonts.latinSans).family],
    ['中文标题 / 正文', `${choice(config.fonts.cjkHeading).label} / ${choice(config.fonts.cjkBody).label}`],
    ['等宽 / 标签', `${config.fonts.mono === 'system' ? system['--font-mono'] : choice(config.fonts.mono).family} / ${config.labelStyle}`],
    ['字号（当前视口）', [['主标题', '--text-page-title'], ['h2', '--text-2xl'], ['h3', '--text-xl'], ['导语', '--text-lead'], ['正文', '--text-description'], ['小字', '--text-sm'], ['标签', '--text-2xs']].map(([label, token]) => `${label} ${pixel(token)}`).join(' · ')],
    ['字重', `西文标题 ${config.weights.heading}${config.id === 'current' ? '（首页英语 400）' : ''} / 中文标题 ${safeWeight(config.fonts.cjkHeading, config.weights.heading)} / 正文 ${config.weights.body} / 标签 ${config.weights.label} / 元信息 400`],
    ['字距', `西文 ${style.getPropertyValue('--tracking-heading').trim()} / 中文 ${style.getPropertyValue('--tracking-cjk-heading').trim()} / 标签 ${style.getPropertyValue('--tracking-label').trim()}`],
    ['行高', `大标题 ${style.getPropertyValue('--leading-cjk-heading').trim()} / h3 ${style.getPropertyValue('--leading-cjk-subheading').trim()} / 正文 ${style.getPropertyValue('--leading-article-body').trim()}`],
    ['协调 / 光学轴', `${adjustment.checked ? 'cap-height 0.72' : '关闭'} / ${config.fonts.latinSans === 'inter' ? 'Inter opsz 14–32 · auto' : config.fonts.latinSerif === 'source-serif' ? 'Source Serif 4 opsz 8–60 · auto' : '当前字体无 opsz 轴'}`],
  ]
  const table = document.createElement('table')
  const caption = document.createElement('caption'); caption.textContent = `${config.label} 当前规格`; caption.className = 'visually-hidden'; table.append(caption)
  const tbody = document.createElement('tbody')
  for (const [label, value] of rows) { const row = document.createElement('tr'); const th = document.createElement('th'); th.scope = 'row'; th.textContent = label; const td = document.createElement('td'); td.textContent = value; row.append(th, td); tbody.append(row) }
  table.append(tbody)
  pane.querySelector('[data-direction-spec]')!.replaceChildren(table)
}
function synchronizeUrl() {
  const params = new URLSearchParams({ direction: directionA.value, theme: themeSelect.value, locale: localeSelect.value })
  if (compare.checked) { params.set('compare', '1'); params.set('directionB', directionB.value); params.set('pane', panes.dataset.activePane!) }
  if (adjustment.checked) params.set('adjust', '1')
  for (const [control, name] of [[headingSelect, 'heading'], [bodySelect, 'body'], [weightSelect, 'weight']] as const) if (control.value !== 'auto') params.set(name, control.value)
  history.replaceState(null, '', `${location.pathname}?${params}`)
}
async function update() {
  const current = ++revision
  const base = direction(directionA.value)
  const headingId = headingSelect.value === 'auto' ? base.fonts.cjkHeading : headingSelect.value
  for (const option of [...weightSelect.options]) option.disabled = option.value !== 'auto' && !choice(headingId).weights.includes(Number(option.value))
  if (weightSelect.selectedOptions[0].disabled) weightSelect.value = 'auto'
  const a = effective(base, true), b = effective(direction(directionB.value), false)
  root.dataset.theme = themeSelect.value; root.dataset.locale = localeSelect.value; root.lang = localeSelect.value === 'en' ? 'en' : 'zh-Hans'
  panes.dataset.compare = String(compare.checked)
  apply(specimenA, a); apply(live, a); apply(specimenB, b)
  synchronizeUrl()
  status.dataset.state = 'loading'; status.textContent = '正在加载并验证方向字体…'
  try {
    if (adjustment.checked && !CSS.supports('font-size-adjust', 'cap-height 0.72')) throw new Error('当前浏览器不支持 cap-height 大小协调，请关闭此选项。')
    await Promise.all([loadDirection(a, specimenA), ...(compare.checked ? [loadDirection(b, specimenB)] : [])])
    if (current !== revision) return
    spec(paneA, specimenA, a); spec(paneB, specimenB, b)
    status.dataset.state = 'ready'; status.textContent = '已验证当前方向字体 · 仅用于本地预览'
  } catch (error) { if (current !== revision) return; status.dataset.state = 'error'; status.textContent = error instanceof Error ? error.message : '字体加载失败' }
}
const params = new URLSearchParams(location.search)
for (const [control, name] of [[directionA, 'direction'], [directionB, 'directionB'], [headingSelect, 'heading'], [bodySelect, 'body'], [weightSelect, 'weight'], [themeSelect, 'theme'], [localeSelect, 'locale']] as const) {
  const value = params.get(name); if (value && [...control.options].some(option => option.value === value)) control.value = value
}
compare.checked = params.get('compare') === '1'; adjustment.checked = params.get('adjust') === '1'
panes.dataset.activePane = params.get('pane') === 'b' ? 'b' : 'a'
for (const control of [directionA, directionB, headingSelect, bodySelect, weightSelect, themeSelect, localeSelect, compare, adjustment]) control.addEventListener('change', update)
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-pane-target]')) {
  button.setAttribute('aria-pressed', String(button.dataset.paneTarget === panes.dataset.activePane))
  button.addEventListener('click', () => { panes.dataset.activePane = button.dataset.paneTarget; for (const tab of document.querySelectorAll('[data-pane-target]')) tab.setAttribute('aria-pressed', String(tab === button)); synchronizeUrl() })
}
let syncing = false
for (const [source, target] of [[paneA, paneB], [paneB, paneA]]) source.addEventListener('scroll', () => {
  if (syncing || !compare.checked || innerWidth < 900) return
  const maximum = source.scrollHeight - source.clientHeight
  syncing = true; target.scrollTop = maximum > 0 ? source.scrollTop / maximum * (target.scrollHeight - target.clientHeight) : 0
  requestAnimationFrame(() => { syncing = false })
}, { passive: true })
window.addEventListener('popstate', () => location.reload())
window.addEventListener('resize', () => { spec(paneA, specimenA, effective(direction(directionA.value), true)); spec(paneB, specimenB, effective(direction(directionB.value), false)) })
if ('PerformanceObserver' in window) new PerformanceObserver(() => {
  if (status.dataset.state === 'ready') { spec(paneA, specimenA, effective(direction(directionA.value), true)); if (compare.checked) spec(paneB, specimenB, effective(direction(directionB.value), false)) }
}).observe({ type: 'resource', buffered: true })
void update()
