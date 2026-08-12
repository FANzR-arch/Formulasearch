import { z } from 'astro/zod'

export const httpUrlSchema = z.url().refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}, 'URL must use http or https.')

export const localAssetPathSchema = z.string().min(1).refine((value) => value.startsWith('/') && !value.startsWith('//'), {
  message: 'Local asset paths must use a single-slash absolute path.',
})
