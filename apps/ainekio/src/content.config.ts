import { defineCollection, z } from 'astro:content'
import {
  friendsSchema,
  postsSchema,
  specSchema,
  teamSchema,
  updatesSchema,
} from '@merkin/blog-core/schemas/content'

const posts = defineCollection({ schema: postsSchema })
const spec = defineCollection({ schema: specSchema })
const team = defineCollection({ schema: teamSchema })
const friends = defineCollection({ schema: friendsSchema })
const updates = defineCollection({ schema: updatesSchema })
const avatar = defineCollection({ schema: z.object({}) })

export const collections = {
  avatar,
  posts,
  spec,
  team,
  friends,
  updates,
}
