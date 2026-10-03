import { z } from 'astro/zod'
import catalogContent from '../../content/site/catalog.json'
import { localizedCopySchema } from '../lib/i18n'
import { getVisibleResourceSections, validateResourceReferences } from '../lib/resource-links'

const catalogItemSchema = localizedCopySchema.extend({
  tag: localizedCopySchema.optional(),
  description: localizedCopySchema.optional(),
  externalUrl: z.url().optional(),
}).strict()

const localizedListSchema = z.array(localizedCopySchema).min(1)

const projectGalleryItemSchema = z.object({
  src: z.string().startsWith('/'),
  alt: localizedCopySchema,
}).strict()

const projectShowcaseItemSchema = z.object({
  src: z.string().startsWith('/'),
  alt: localizedCopySchema,
  title: localizedCopySchema,
  tag: localizedCopySchema,
}).strict()

const projectExperimentSchema = z.object({
  title: localizedCopySchema,
  tag: localizedCopySchema,
  description: localizedCopySchema,
  image: z.string().startsWith('/').optional(),
  externalUrl: z.url().optional(),
}).strict()

const projectDetailSchema = z.object({
  version: z.string().min(1).optional(),
  problemLine: localizedCopySchema,
  keywords: localizedListSchema,
  gallery: z.array(projectGalleryItemSchema).min(1),
  context: localizedCopySchema,
  problems: localizedListSchema,
  goal: localizedCopySchema,
  solution: localizedCopySchema,
  design: localizedListSchema,
  workflow: localizedCopySchema,
  strengths: localizedListSchema,
  limitations: localizedListSchema,
  experiments: z.array(projectExperimentSchema).min(1).optional(),
}).strict()

const catalogProjectItemSchema = localizedCopySchema.extend({
  id: z.string().regex(/^[a-z0-9-]+$/),
  cover: z.object({
    light: z.string().startsWith('/'),
    dark: z.string().startsWith('/'),
  }).strict(),
  coverFocus: z.enum(['top', 'center', 'bottom']).optional(),
  coverAlt: localizedCopySchema,
  description: localizedCopySchema,
  year: z.string().min(1),
  role: localizedCopySchema,
  externalUrl: z.url().optional(),
  showcase: z.array(projectShowcaseItemSchema).min(2).optional(),
  detail: projectDetailSchema,
}).strict()

const catalogListSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  description: localizedCopySchema,
  image: z.string().startsWith('/').optional(),
  imageAlt: localizedCopySchema.optional(),
  items: z.array(catalogItemSchema).min(1),
  projects: z.array(catalogProjectItemSchema).min(1).optional(),
  presentation: z.literal('list').default('list'),
}).strict()

const catalogVideoSchema = z.object({
  src: z.string().startsWith('/'),
  poster: z.string().startsWith('/'),
  title: localizedCopySchema,
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  category: localizedCopySchema.optional(),
  description: localizedCopySchema.optional(),
  sourceUrl: z.url().optional(),
}).strict()

const catalogProjectSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  description: localizedCopySchema.optional(),
  items: z.array(catalogProjectItemSchema),
  videoLayout: z.enum(['grid', 'rail']).default('grid'),
  videos: z.array(catalogVideoSchema).min(1).optional(),
  videoGroups: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: localizedCopySchema,
    videos: z.array(catalogVideoSchema).min(1),
  }).strict()).min(1).optional(),
  presentation: z.literal('projects'),
}).strict()

const skillGalleryItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: localizedCopySchema,
  image: z.string().startsWith('/'),
  imageAlt: localizedCopySchema,
  externalUrl: z.url(),
}).strict()

const skillGallerySectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  description: localizedCopySchema,
  summary: localizedCopySchema,
  repositoryUrl: z.url(),
  facts: z.array(z.object({
    label: localizedCopySchema,
    value: localizedCopySchema,
  }).strict()).min(1),
  gallery: z.array(skillGalleryItemSchema).min(1),
  presentation: z.literal('skill-gallery'),
}).strict()

const skillProjectSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  tag: localizedCopySchema,
  description: localizedCopySchema,
  cover: z.object({
    light: z.string().startsWith('/'),
    dark: z.string().startsWith('/'),
  }).strict(),
  coverAlt: localizedCopySchema,
  repositoryUrl: z.url(),
  presentation: z.literal('skill-project'),
}).strict()

const skillTypeSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: localizedCopySchema,
  repositoryUrl: z.url(),
  presentation: z.literal('skill-type'),
}).strict()

const learningPathSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  description: localizedCopySchema.optional(),
  paths: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: localizedCopySchema,
    description: localizedCopySchema.optional(),
    // An optional published Blog slug for the path's representative cover.
    cover: z.string().regex(/^[a-z0-9-]+$/).optional(),
    // Blog post slugs in reading order; resolved against the blog collection at render time.
    posts: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(2),
  }).strict()).min(1),
  presentation: z.literal('paths'),
}).strict()

const resourceLinkItemSchema = localizedCopySchema.extend({
  id: z.string().regex(/^[a-z0-9-]+$/),
  description: localizedCopySchema.optional(),
  image: z.union([z.string().startsWith('/'), z.object({
    light: z.string().startsWith('/'),
    dark: z.string().startsWith('/'),
  }).strict()]).optional(),
  imageAlt: localizedCopySchema.optional(),
  url: z.union([z.url({ protocol: /^https?$/ }), z.string().regex(/^\/(?!\/)[^\s]*$/)]).optional(),
  tag: localizedCopySchema.optional(),
  status: z.enum(['live', 'beta']).optional(),
  source: z.enum(['own', 'external']),
  related: z.object({
    skill: z.string().regex(/^[a-z0-9-]+$/).optional(),
    post: z.string().regex(/^[a-z0-9-]+$/).optional(),
    project: z.string().regex(/^[a-z0-9-]+$/).optional(),
  }).strict().optional(),
}).strict().refine((item) => Boolean(item.url || item.related?.post), 'A resource must have a URL or related.post.')

const resourceLinkSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  title: localizedCopySchema,
  description: localizedCopySchema.optional(),
  presentation: z.literal('resource-links'),
  groups: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: localizedCopySchema,
    icon: z.enum(['resources-icons', 'resources-motion', 'resources-assets', 'resources-own-tools', 'resources-prompts', 'resources-workflows', 'resources-materials']),
    items: z.array(resourceLinkItemSchema),
  }).strict()),
}).strict()

const catalogSectionSchema = z.union([catalogListSectionSchema, catalogProjectSectionSchema, skillGallerySectionSchema, skillProjectSectionSchema, skillTypeSectionSchema, learningPathSectionSchema, resourceLinkSectionSchema])

const catalogPageSchema = z.object({
  title: localizedCopySchema,
  description: localizedCopySchema,
  kicker: localizedCopySchema,
  heading: localizedCopySchema,
  intro: localizedCopySchema.optional(),
  indexLabel: localizedCopySchema,
}).strict()

const catalogSchema = z.object({
  projects: z.array(catalogSectionSchema),
  skills: z.array(catalogSectionSchema).min(1),
  resources: z.array(catalogSectionSchema).min(1),
  pages: z.object({
    projects: catalogPageSchema,
    skills: catalogPageSchema,
    resources: catalogPageSchema,
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
export type LearningPathSection = z.infer<typeof learningPathSectionSchema>
export type ResourceLinkSection = z.infer<typeof resourceLinkSectionSchema>
export type ResourceLinkItem = z.infer<typeof resourceLinkItemSchema>

export const projectSections = result.data.projects
export const skillSections = result.data.skills
export const resourceSections = result.data.resources
export const visibleResourceSections: CatalogSection[] = getVisibleResourceSections(resourceSections)
export const catalogPages = result.data.pages
export const resourceProjectItems = resourceSections.flatMap((section) => section.presentation === 'projects' ? section.items : section.presentation === 'list' ? section.projects ?? [] : [])
// Courses live under Resources but keep their /projects detail URLs.
export const projectItems = [...projectSections.flatMap((section) => section.presentation === 'projects' ? section.items : []), ...resourceProjectItems]

for (const [name, sections] of Object.entries({
  projects: projectSections,
  skills: skillSections,
  resources: resourceSections,
})) {
  const ids = sections.map((section) => section.id)
  if (new Set(ids).size !== ids.length) throw new Error(`Catalog content validation failed: duplicate ${name} section ids.`)
}

const projectIds = projectItems.map((project) => project.id)
if (new Set(projectIds).size !== projectIds.length) throw new Error('Catalog content validation failed: duplicate project ids.')

validateResourceReferences(resourceSections, skillSections, projectItems)
