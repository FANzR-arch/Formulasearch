import { z } from 'astro/zod'
import catalogContent from '../../content/site/catalog.json'
import { localizedCopySchema } from '../lib/i18n'

const catalogItemSchema = localizedCopySchema.extend({
  externalUrl: z.url().optional(),
}).strict()

const catalogProjectItemSchema = localizedCopySchema.extend({
  id: z.string().regex(/^[a-z0-9-]+$/),
  cover: z.object({
    light: z.string().startsWith('/'),
    dark: z.string().startsWith('/'),
  }).strict(),
  coverAlt: localizedCopySchema,
  description: localizedCopySchema,
  year: z.string().min(1),
  role: localizedCopySchema,
  externalUrl: z.url().optional(),
}).strict()

const catalogListSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  description: localizedCopySchema,
  items: z.array(catalogItemSchema).min(1),
  presentation: z.literal('list').default('list'),
}).strict()

const catalogProjectSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  description: localizedCopySchema,
  items: z.array(catalogProjectItemSchema).min(1),
  presentation: z.literal('projects'),
}).strict()

const catalogSectionSchema = z.union([catalogListSectionSchema, catalogProjectSectionSchema])

const catalogPageSchema = z.object({
  title: localizedCopySchema,
  description: localizedCopySchema,
  kicker: localizedCopySchema,
  heading: localizedCopySchema,
  intro: localizedCopySchema,
  indexLabel: localizedCopySchema,
}).strict()

const catalogSchema = z.object({
  projects: z.array(catalogSectionSchema),
  skills: z.array(catalogSectionSchema).min(1),
  lab: z.array(catalogSectionSchema).min(1),
  pages: z.object({
    projects: catalogPageSchema,
    skills: catalogPageSchema,
    lab: catalogPageSchema,
  }).strict(),
}).strict()

const result = catalogSchema.safeParse(catalogContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Catalog content validation failed: ${issues}`)
}

export type CatalogSection = z.infer<typeof catalogSectionSchema>
export type CatalogPage = z.infer<typeof catalogPageSchema>
export type CatalogProjectItem = z.infer<typeof catalogProjectItemSchema>

export const projectSections = result.data.projects
export const skillSections = result.data.skills
export const labSections = result.data.lab
export const catalogPages = result.data.pages
export const projectItems = projectSections.flatMap((section) => section.presentation === 'projects' ? section.items : [])

for (const [name, sections] of Object.entries({
  projects: projectSections,
  skills: skillSections,
  lab: labSections,
})) {
  const ids = sections.map((section) => section.id)
  if (new Set(ids).size !== ids.length) throw new Error(`Catalog content validation failed: duplicate ${name} section ids.`)
}

const projectIds = projectItems.map((project) => project.id)
if (new Set(projectIds).size !== projectIds.length) throw new Error('Catalog content validation failed: duplicate project ids.')
