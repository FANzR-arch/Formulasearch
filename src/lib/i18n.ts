export const supportedLocales = ['zh', 'en'] as const

export type Locale = (typeof supportedLocales)[number]

export interface LocalizedCopy {
  en: string
  zh: string
}

export const getLocalizedValue = (copy: LocalizedCopy, locale: Locale) => copy[locale]

export const interpolateLocalizedCopy = (copy: LocalizedCopy, values: Record<string, LocalizedCopy>): LocalizedCopy => {
  const interpolate = (value: string, locale: Locale) => value.replace(/\{(\w+)\}/g, (_, key: string) => values[key]?.[locale] ?? `{${key}}`)
  return {
    zh: interpolate(copy.zh, 'zh'),
    en: interpolate(copy.en, 'en'),
  }
}
