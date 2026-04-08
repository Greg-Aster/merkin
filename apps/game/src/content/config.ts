import { defineCollection, z } from 'astro:content'

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    published: z.coerce.date(),
    draft: z.boolean().optional().default(false),
    description: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional(),
    // Timeline/game fields
    timelineYear: z.string().optional(),
    bannerType: z.string().optional(),
    era: z.string().optional(),
    location: z.string().optional(),
    isKeyEvent: z.boolean().optional().default(false),
    isLevel: z.boolean().optional().default(false),
    levelId: z.string().nullable().optional(),
  }),
})

export const collections = { posts }
