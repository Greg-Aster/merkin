import { defineCollection, z } from 'astro:content'
import {
  postsSchema,
  specSchema,
  teamSchema,
  updatesSchema,
} from '@merkin/blog-core/schemas/content'

type DefinedCollection = ReturnType<typeof defineCollection>

const posts: DefinedCollection = defineCollection({ schema: postsSchema })
const spec: DefinedCollection = defineCollection({ schema: specSchema })
const team: DefinedCollection = defineCollection({ schema: teamSchema })
const friends: DefinedCollection = defineCollection({ schema: z.object({}) })
const avatar: DefinedCollection = defineCollection({ schema: z.object({}) })
const updates: DefinedCollection = defineCollection({ schema: updatesSchema })

export const collections: {
  avatar: typeof avatar
  friends: typeof friends
  posts: typeof posts
  spec: typeof spec
  team: typeof team
  updates: typeof updates
} = {
  avatar,
  friends,
  posts,
  spec,
  team,
  updates,
}
