import type { FontChoice } from '../data/fonts'
import { fontLoaders } from './font-loaders'

// Keep all dynamically loaded slices available to the download-size information panel.
performance.setResourceTimingBufferSize(5000)
const root = document.documentElement
const choices: FontChoice[] = JSON.parse(document.querySelector('#font-choice-data')!.textContent!)
const select = (id: string) => document.querySelector<HTMLSelectElement>(`#${id}`)!
const headingSelect = select('heading-font')
const bodySelect = select('body-font')
const weightSelect = select('heading-weight')
const themeSelect = select('preview-theme')
const localeSelect = select('preview-locale')
const compare = document.querySelector<HTMLInputElement>('#comparison-view')!
const specimens = document.querySelector<HTMLElement>('#font-specimens')!
const comparison = document.querySelector<HTMLElement>('#font-comparison')!
const status = document.querySelector<HTMLElement>('#font-loading-status')!
const system = {
  sans: getComputedStyle(root).getPropertyValue('--font-cjk-sans').trim(),
  serif: getComputedStyle(root).getPropertyValue('--font-cjk-serif').trim(),
}
let revision = 0
const imported = new Map<string, Promise<void>>()
const ready = new Set<string>(['system'])
const choice = (id: string) => choices.find(font => font.id === id) || choices[0]
const families = (font: FontChoice) => font.id === 'system' ? system : { sans: `"${font.family}"`, serif: `"${font.family}"` }
const setVariables = (element: HTMLElement, heading: FontChoice, body: FontChoice, weight: number) => {
  const titleFamily = families(heading)
  const bodyFamily = families(body)
  element.style.setProperty('--fp-heading-sans', titleFamily.sans)
  element.style.setProperty('--fp-heading-serif', titleFamily.serif)
  element.style.setProperty('--fp-body-sans', bodyFamily.sans)
  element.style.setProperty('--fp-body-serif', bodyFamily.serif)
  element.style.setProperty('--fp-heading-weight', String(weight))
}
const bodyWeights = (font: FontChoice) => [400, 500, 600, 700].map(weight => font.weights.includes(weight) ? weight : font.weights[0]).filter((weight, index, values) => values.indexOf(weight) === index)
const sampleText = () => Array.from(specimens.querySelectorAll('h1, h2, h3, p, li, blockquote')).map(element => element.textContent).join('')
async function load(font: FontChoice, weights: number[]) {
  if (font.id === 'system') return
  if (!imported.has(font.id)) imported.set(font.id, fontLoaders[font.id]())
  await imported.get(font.id)
  const text = sampleText()
  for (const weight of weights) {
    const descriptor = `${weight} 20px "${font.family}"`
    const faces = await document.fonts.load(descriptor, text)
    if (!faces.length || !faces.every(face => face.status === 'loaded') || !document.fonts.check(descriptor, text)) {
      throw new Error(`${font.label} 未通过实际字体加载检查`)
    }
  }
  ready.add(font.id)
}
function downloads(font: FontChoice) {
  if (!font.packageName) return { count: 0, bytes: 0 }
  const slug = font.packageName.split('/').at(-1)!
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const files = entries.filter(entry => /\.(?:woff2?|otf|ttf)(?:\?|$)/i.test(entry.name) && (decodeURIComponent(entry.name).includes(font.packageName!) || entry.name.includes(`${slug}-`)))
  const unique = new Map(files.map(entry => [entry.name, entry]))
  return { count: unique.size, bytes: [...unique.values()].reduce((sum, entry) => sum + (entry.encodedBodySize || entry.transferSize), 0) }
}
function displayInfo(role: 'heading' | 'body', font: FontChoice) {
  const element = document.querySelector<HTMLElement>(`[data-font-info="${role}"]`)!
  element.replaceChildren()
  element.append(`${role === 'heading' ? '标题' : '正文'}：${font.label} · `)
  const license = document.createElement(font.license.url ? 'a' : 'span')
  license.textContent = font.license.label
  if (license instanceof HTMLAnchorElement) { license.href = font.license.url!; license.target = '_blank'; license.rel = 'noopener noreferrer' }
  element.append(license, ' · ')
  const source = document.createElement(font.packageName ? 'a' : 'span')
  source.textContent = font.packageName || '本机系统字体'
  if (source instanceof HTMLAnchorElement) { source.href = font.source; source.target = '_blank'; source.rel = 'noopener noreferrer' }
  element.append(source)
  const detail = document.createElement('span')
  detail.dataset.fontStatus = ready.has(font.id) ? 'loaded' : 'loading'
  const resources = downloads(font)
  detail.textContent = font.id === 'system' ? '使用系统字体 · 无字体文件下载' : `${ready.has(font.id) ? '已验证加载' : '加载中'} · ${resources.count} 个字体切片 · ${(resources.bytes / 1024).toFixed(1)} KiB（本次页面累计）`
  element.append(detail)
}
function synchronizeUrl() {
  const params = new URLSearchParams({ heading: headingSelect.value, body: bodySelect.value, weight: weightSelect.value, theme: themeSelect.value, locale: localeSelect.value })
  if (compare.checked) params.set('compare', '1')
  history.replaceState(null, '', `${location.pathname}?${params}`)
}
async function update() {
  const currentRevision = ++revision
  const heading = choice(headingSelect.value)
  const body = choice(bodySelect.value)
  for (const option of Array.from(weightSelect.options)) option.disabled = !heading.weights.includes(Number(option.value))
  if (!heading.weights.includes(Number(weightSelect.value))) weightSelect.value = String(heading.weights[0])
  root.dataset.theme = themeSelect.value
  root.dataset.locale = localeSelect.value
  root.lang = localeSelect.value === 'en' ? 'en' : 'zh-Hans'
  specimens.hidden = compare.checked
  comparison.hidden = !compare.checked
  setVariables(specimens, heading, body, Number(weightSelect.value))
  synchronizeUrl()
  status.dataset.state = 'loading'
  status.textContent = '正在加载并验证字体…'
  try {
    await Promise.all([load(heading, [Number(weightSelect.value)]), load(body, bodyWeights(body))])
    if (compare.checked) {
      await Promise.all(choices.map(async font => {
        const tile = comparison.querySelector<HTMLElement>(`[data-comparison-font="${font.id}"]`)!
        const weight = font.weights.includes(Number(weightSelect.value)) ? Number(weightSelect.value) : font.weights[0]
        setVariables(tile, font, font.roles.includes('body') ? font : choices[0], weight)
        await load(font, bodyWeights(font))
        tile.querySelector<HTMLElement>('[data-comparison-status]')!.textContent = font.id === 'system' ? '系统基准' : '已验证加载'
      }))
    }
    if (revision !== currentRevision) return
    displayInfo('heading', heading)
    displayInfo('body', body)
    status.dataset.state = 'ready'
    status.textContent = '已验证当前字体。字体选择仅用于本地预览。'
  } catch (error) {
    if (revision !== currentRevision) return
    status.dataset.state = 'error'
    status.textContent = error instanceof Error ? error.message : '字体加载失败，请查看来源与网络连接。'
  }
}
const params = new URLSearchParams(location.search)
for (const [control, name] of [[headingSelect, 'heading'], [bodySelect, 'body'], [weightSelect, 'weight'], [themeSelect, 'theme'], [localeSelect, 'locale']] as const) {
  const value = params.get(name)
  if (value && Array.from(control.options).some(option => option.value === value)) control.value = value
}
compare.checked = params.get('compare') === '1'
for (const control of [headingSelect, bodySelect, weightSelect, themeSelect, localeSelect, compare]) control.addEventListener('change', update)
window.addEventListener('popstate', () => location.reload())
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver(() => {
    if (status.dataset.state === 'ready') { displayInfo('heading', choice(headingSelect.value)); displayInfo('body', choice(bodySelect.value)) }
  })
  observer.observe({ type: 'resource', buffered: true })
}
void update()
