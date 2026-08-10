export const supportedLocales = ['zh', 'en'] as const

export type Locale = (typeof supportedLocales)[number]

export interface LocalizedCopy {
  en: string
  zh: string
}

export const getLocalizedValue = (copy: LocalizedCopy, locale: Locale) => copy[locale]
