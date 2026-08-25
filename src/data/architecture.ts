import type { ImageMetadata } from 'astro'
import { z } from 'astro/zod'
import architectureContent from '../../content/site/architecture.json'
import { localizedCopySchema } from '../lib/i18n'
import { archiveItemBaseSchema, archivePageBaseSchema, validateArchiveRelations } from './archive-schema'

const architectureAssetPathSchema = z.string().regex(/^\/src\/assets\/archive\/architecture\/[a-z0-9/_-]+\.(?:avif|jpe?g|png|webp)$/i)

const architectureItemSchema = archiveItemBaseSchema.extend({
  caption: localizedCopySchema,
  image: architectureAssetPathSchema,
  label: localizedCopySchema,
}).strict()

const architectureProjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  index: z.string().regex(/^\d+$/),
  title: localizedCopySchema,
  summary: localizedCopySchema,
  cover: architectureAssetPathSchema,
  images: z.array(architectureItemSchema).min(1),
}).strict()

const architectureSchema = archivePageBaseSchema.extend({
  projectListLabel: localizedCopySchema,
  openProjectLabel: localizedCopySchema,
  backLabel: localizedCopySchema,
  initialVisibleCount: z.union([z.literal('all'), z.number().int().positive()]),
}).strict()

const result = architectureSchema.safeParse(architectureContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Architecture content validation failed: ${issues}`)
}

const projectModules = import.meta.glob('../../content/architecture/*/index.json', { eager: true, import: 'default' }) as Record<string, unknown>
const projectResults = Object.entries(projectModules).map(([path, value]) => {
  const project = architectureProjectSchema.safeParse(value)
  if (!project.success) {
    const issues = project.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('; ')
    throw new Error(`Architecture project validation failed (${path}): ${issues}`)
  }
  return project.data
})

const imageModules = import.meta.glob('../assets/archive/architecture/**/*.{avif,jpeg,jpg,png,webp}', { eager: true, import: 'default' }) as Record<string, ImageMetadata>
const resolveImage = (source: string) => {
  const image = imageModules[source.replace(/^\/src\//, '../')]
  if (!image) throw new Error(`Architecture image is missing or cannot be optimized by Astro: ${source}`)
  return image
}

export const architecturePage = result.data
export const architectureProjects = projectResults
  .sort((left, right) => left.index.localeCompare(right.index))
  .map((project) => ({
  ...project,
  cover: resolveImage(project.cover),
  items: project.images.map((item) => ({ ...item, image: resolveImage(item.image) })),
}))

export const architectureItems = projectResults.flatMap((project) => project.images)
const itemIndexes = architectureItems.map((item) => item.index)
const imageIds = architectureItems.map((item) => item.image)
const filterIds = result.data.filters.map((filter) => filter.id)
const itemTags = architectureItems.flatMap((item) => item.tags)
validateArchiveRelations({ itemIndexes, itemTags, filterIds, imageIds, name: 'Architecture' })

const projectSlugs = projectResults.map((project) => project.slug)
if (new Set(projectSlugs).size !== projectSlugs.length) throw new Error('Architecture validation failed: duplicate project slugs.')
for (const project of projectResults) {
  if (!project.images.some((item) => item.image === project.cover)) throw new Error(`Architecture validation failed: project cover is not part of ${project.slug}.`)
}
