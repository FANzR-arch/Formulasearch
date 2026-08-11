import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { httpUrlSchema } from './lib/validation'

const tagsSchema = z.array(z.string().trim().min(1)).refine((tags) => new Set(tags).size === tags.length, 'Tags must be unique.')
const externalLinksSchema = z.array(z.object({
  label: z.enum(['微信', 'X', '原文']),
  url: httpUrlSchema,
}).strict()).superRefine((links, context) => {
  const seen = new Set()
  links.forEach((link, index) => {
    if (seen.has(link.url)) {
      context.addIssue({ code: 'custom', path: [index, 'url'], message: 'External links must be unique within an article.' })
    }
    seen.add(link.url)
  })
})

const blog = defineCollection({
  loader: glob({
    base: './content/blog',
    pattern: '**/index.md',
    generateId: ({ entry }) => entry.replace(/[/\\]index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens.'),
    category: z.string().trim().min(1),
    series: z.string().trim().min(1).optional(),
    contentLanguage: z.enum(['zh-Hans', 'en']).default('zh-Hans'),
    tags: tagsSchema.default([]),
    cover: z.string().trim().min(1),
    coverAlt: z.string().trim().min(1),
    contentStatus: z.enum(['index-only', 'full']),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    externalLinks: externalLinksSchema.default([]),
  }).strict().superRefine((data, context) => {
    if (data.updatedDate && data.updatedDate < data.pubDate) {
      context.addIssue({ code: 'custom', path: ['updatedDate'], message: 'updatedDate must not be earlier than pubDate.' })
    }
    if (data.contentStatus === 'index-only' && data.externalLinks.length === 0 && !data.draft) {
      context.addIssue({ code: 'custom', path: ['externalLinks'], message: 'Index-only articles require an external link.' })
    }
  }),
})

export const collections = { blog }
