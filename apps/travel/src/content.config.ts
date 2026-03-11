import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import {
  postsSchema,
  specSchema,
  teamSchema,
  friendsSchema,
  assetDataSchema,
  updatesSchema,
} from '@merkin/blog-core/schemas/content'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: postsSchema,
})
const spec = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/spec' }),
  schema: specSchema,
})
const team = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/team' }),
  schema: teamSchema,
})
const friends = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/friends' }),
  schema: friendsSchema,
})
const updates = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/updates' }),
  schema: updatesSchema,
})

// Mirror megameal content contract for asset-style folders.
const avatar = defineCollection({
  type: 'data',
  schema: assetDataSchema,
})

export const collections = {
  posts,
  spec,
  team,
  friends,
  updates,
  avatar,
}
