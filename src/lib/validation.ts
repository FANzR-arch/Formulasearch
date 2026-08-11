import { z } from 'astro/zod'

export const httpUrlSchema = z.url().refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}, 'URL must use http or https.')
