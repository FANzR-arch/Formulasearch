import type { ImageMetadata } from 'astro'
import { z } from 'astro/zod'
import nanjingEntranceRender from '../assets/archive/architecture/nanjing-stone-city/entrance-render.png'
import nanjingExplodedAxon from '../assets/archive/architecture/nanjing-stone-city/exploded-axon.png'
import qingdaoHero from '../assets/archive/architecture/qingdao-mountain-sea/hero.png'
import qingdaoBoard01 from '../assets/archive/architecture/qingdao-mountain-sea/board-01.webp'
import qingdaoBoard02 from '../assets/archive/architecture/qingdao-mountain-sea/board-02.webp'
import qingdaoBoard03 from '../assets/archive/architecture/qingdao-mountain-sea/board-03.webp'
import qingdaoBoard04 from '../assets/archive/architecture/qingdao-mountain-sea/board-04.webp'
import qingdaoBoard05 from '../assets/archive/architecture/qingdao-mountain-sea/board-05.webp'
import qingdaoBoard06 from '../assets/archive/architecture/qingdao-mountain-sea/board-06.webp'
import qingdaoBoard07 from '../assets/archive/architecture/qingdao-mountain-sea/board-07.webp'
import architectureContent from '../../content/site/architecture.json'
import { localizedCopySchema } from '../lib/i18n'
import { archiveItemBaseSchema, archivePageBaseSchema, validateArchiveRelations } from './archive-schema'

const architectureItemSchema = archiveItemBaseSchema.extend({
  caption: localizedCopySchema,
  image: z.enum([
    'nanjing-entrance-render',
    'nanjing-exploded-axon',
    'qingdao-hero',
    'qingdao-board-01',
    'qingdao-board-02',
    'qingdao-board-03',
    'qingdao-board-04',
    'qingdao-board-05',
    'qingdao-board-06',
    'qingdao-board-07',
  ]),
  label: localizedCopySchema,
}).strict()

const architectureProjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  index: z.string().regex(/^\d+$/),
  title: localizedCopySchema,
  summary: localizedCopySchema,
  cover: architectureItemSchema.shape.image,
  imageIds: z.array(architectureItemSchema.shape.image).min(1),
}).strict()

const architectureSchema = archivePageBaseSchema.extend({
  projectListLabel: localizedCopySchema,
  openProjectLabel: localizedCopySchema,
  backLabel: localizedCopySchema,
  projects: z.array(architectureProjectSchema).min(1),
  initialVisibleCount: z.union([z.literal('all'), z.number().int().positive()]),
  items: z.array(architectureItemSchema).min(1),
}).strict()

const result = architectureSchema.safeParse(architectureContent)
if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
  throw new Error(`Architecture content validation failed: ${issues}`)
}

const imageMap: Record<string, ImageMetadata> = {
  'nanjing-entrance-render': nanjingEntranceRender,
  'nanjing-exploded-axon': nanjingExplodedAxon,
  'qingdao-hero': qingdaoHero,
  'qingdao-board-01': qingdaoBoard01,
  'qingdao-board-02': qingdaoBoard02,
  'qingdao-board-03': qingdaoBoard03,
  'qingdao-board-04': qingdaoBoard04,
  'qingdao-board-05': qingdaoBoard05,
  'qingdao-board-06': qingdaoBoard06,
  'qingdao-board-07': qingdaoBoard07,
}

export const architectureItems = result.data.items.map((item) => ({
  ...item,
  image: imageMap[item.image],
}))

const architectureItemsById = new Map(result.data.items.map((item, index) => [item.image, architectureItems[index]]))

export const architecturePage = result.data
export const architectureProjects = result.data.projects.map((project) => ({
  ...project,
  cover: imageMap[project.cover],
  items: project.imageIds.map((imageId) => architectureItemsById.get(imageId)!),
}))

const itemIndexes = architectureItems.map((item) => item.index)
const imageIds = result.data.items.map((item) => item.image)
const filterIds = result.data.filters.map((filter) => filter.id)
const itemTags = result.data.items.flatMap((item) => item.tags)
validateArchiveRelations({ itemIndexes, itemTags, filterIds, imageIds, name: 'Architecture' })

const projectSlugs = result.data.projects.map((project) => project.slug)
if (new Set(projectSlugs).size !== projectSlugs.length) throw new Error('Architecture validation failed: duplicate project slugs.')
const projectImageIds = result.data.projects.flatMap((project) => project.imageIds)
if (projectImageIds.length !== imageIds.length || new Set(projectImageIds).size !== imageIds.length || imageIds.some((imageId) => !projectImageIds.includes(imageId))) {
  throw new Error('Architecture validation failed: every image must belong to exactly one project.')
}
for (const project of result.data.projects) {
  if (!project.imageIds.includes(project.cover)) throw new Error(`Architecture validation failed: project cover is not part of ${project.slug}.`)
}
