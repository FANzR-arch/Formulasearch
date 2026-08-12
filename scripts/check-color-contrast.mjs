import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const css = await readFile(join(projectRoot, '..', 'src', 'styles', 'global.css'), 'utf8')

const scopes = [
  ['light', /:root\s*\{([\s\S]*?)\n\}/],
  ['dark', /:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/],
  ['archive-light', /:root\[data-theme='light'\]\s+\.archive-catalog-site\s*\{([\s\S]*?)\n\}/],
  ['archive-dark', /:root\[data-theme='dark'\]\s+\.archive-catalog-site\s*\{([\s\S]*?)\n\}/],
]

const parseOklch = (value, label) => {
  const match = value.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/)
  if (!match) throw new Error(`Contrast check could not parse ${label}: ${value}`)
  return [Number(match[1]) / 100, Number(match[2]), Number(match[3])]
}

const tokenFrom = (block, name, scope) => {
  const value = block.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim()
  if (!value) throw new Error(`Contrast check is missing --${name} in ${scope} theme scope.`)
  return parseOklch(value, `--${name} in ${scope}`)
}

const toSrgb = ([lightness, chroma, hue]) => {
  const angle = hue * Math.PI / 180
  const a = chroma * Math.cos(angle)
  const b = chroma * Math.sin(angle)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return linear.map((channel) => channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * Math.pow(Math.max(channel, 0), 1 / 2.4) - 0.055)
}

const luminance = (rgb) => rgb.reduce((total, channel, index) => {
  const linear = channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  return total + [0.2126, 0.7152, 0.0722][index] * linear
}, 0)

const contrastRatio = (foreground, background) => {
  const foregroundLuminance = luminance(toSrgb(foreground))
  const backgroundLuminance = luminance(toSrgb(background))
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
}

const failures = []
for (const [scope, pattern] of scopes) {
  const block = css.match(pattern)?.[1]
  if (!block) {
    failures.push(`missing ${scope} theme scope`)
    continue
  }
  const paper = tokenFrom(block, 'paper', scope)
  for (const token of ['ink', 'muted', 'accent']) {
    const ratio = contrastRatio(tokenFrom(block, token, scope), paper)
    if (ratio < 4.5) failures.push(`${scope} --${token} contrast is ${ratio.toFixed(2)}:1; expected at least 4.5:1`)
  }
}

if (failures.length) throw new Error(`Color contrast check failed:\n- ${failures.join('\n- ')}`)
console.log('Color contrast check passed: light/dark site and archive tokens meet 4.5:1.')
