export const supportedLocales = ['zh', 'en'] as const

export type Locale = (typeof supportedLocales)[number]

export interface LocalizedCopy {
  en: string
  zh: string
}

export const getLocalizedValue = (copy: LocalizedCopy, locale: Locale) => copy[locale]

export const interpolateLocalizedCopy = (copy: LocalizedCopy, values: Record<string, LocalizedCopy>): LocalizedCopy => {
  const interpolate = (value: string, locale: Locale) => value.replace(/\{(\w+)\}/g, (_, key: string) => {
    const replacement = values[key]
    if (!replacement) throw new Error(`Missing interpolation value "${key}" for ${locale} copy.`)
    return replacement[locale]
  })
  return {
    zh: interpolate(copy.zh, 'zh'),
    en: interpolate(copy.en, 'en'),
  }
}

const getPlaceholderNames = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

export const validateLocalizedCopyTemplates = (value: unknown, path = 'root'): void => {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateLocalizedCopyTemplates(item, `${path}[${index}]`))
    return
  }

  const record = value as Record<string, unknown>
  if (typeof record.zh === 'string' && typeof record.en === 'string') {
    const zhPlaceholders = getPlaceholderNames(record.zh)
    const enPlaceholders = getPlaceholderNames(record.en)
    if (JSON.stringify(zhPlaceholders) !== JSON.stringify(enPlaceholders)) {
      throw new Error(`Localized copy placeholders must match at ${path}: zh=${zhPlaceholders.join(',') || '(none)'}, en=${enPlaceholders.join(',') || '(none)'}.`)
    }
    return
  }

  Object.entries(record).forEach(([key, child]) => validateLocalizedCopyTemplates(child, `${path}.${key}`))
}
