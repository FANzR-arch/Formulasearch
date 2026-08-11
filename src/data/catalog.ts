import { z } from 'astro/zod'
import catalogContent from '../../content/site/catalog.json'

const localizedCopySchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1),
})

const catalogSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  description: localizedCopySchema,
  items: z.array(localizedCopySchema).min(1),
})

const catalogPageSchema = z.object({
  title: localizedCopySchema,
  description: localizedCopySchema,
  kicker: localizedCopySchema,
  heading: localizedCopySchema,
  intro: localizedCopySchema,
  indexLabel: localizedCopySchema,
})

const catalogSchema = z.object({
  projects: z.array(catalogSectionSchema).min(1),
  skills: z.array(catalogSectionSchema).min(1),
  lab: z.array(catalogSectionSchema).min(1),
  pages: z.object({
    projects: catalogPageSchema,
    skills: catalogPageSchema,
    lab: catalogPageSchema,
  }),
})

const result = catalogSchema.safeParse(catalogContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Catalog content validation failed: ${issues}`)
}

export type CatalogSection = z.infer<typeof catalogSectionSchema>

export const projectSections = result.data.projects
export const skillSections = result.data.skills
export const labSections = result.data.lab
export const catalogPages = result.data.pages
