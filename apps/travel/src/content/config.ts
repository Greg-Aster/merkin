import { defineCollection } from 'astro:content'
import { postsSchema } from '@merkin/blog-core/schemas/content'

const posts = defineCollection({
  schema: postsSchema,
})

export const collections = {
  posts,
}
