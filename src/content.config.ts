import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { httpUrlSchema } from './lib/validation'

const blog = defineCollection({
  loader: glob({
    base: './content/blog',
    pattern: '**/index.md',
    generateId: ({ entry }) => entry.replace(/[/\\]index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens.'),
    category: z.string().min(1),
    series: z.string().optional(),
    contentLanguage: z.enum(['zh-Hans', 'en']).default('zh-Hans'),
    tags: z.array(z.string()).default([]),
    cover: z.string().min(1),
    coverAlt: z.string().min(1),
    contentStatus: z.enum(['index-only', 'full']),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    externalLinks: z.array(z.object({
      label: z.enum(['微信', 'X', '原文']),
      url: httpUrlSchema,
    })).default([]),
  }).superRefine((data, context) => {
    if (data.contentStatus === 'index-only' && data.externalLinks.length === 0 && !data.draft) {
      context.addIssue({ code: 'custom', path: ['externalLinks'], message: 'Index-only articles require an external link.' })
    }
  }),
})

export const collections = { blog }
