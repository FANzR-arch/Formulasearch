import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

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
    slug: z.string().min(1),
    category: z.string().min(1),
    series: z.string().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string().min(1),
    coverAlt: z.string().min(1),
    contentStatus: z.enum(['index-only', 'full']),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    externalLinks: z.array(z.object({
      label: z.enum(['微信', 'X', '原文']),
      url: z.url(),
    })).default([]),
  }),
})

export const collections = { blog }
