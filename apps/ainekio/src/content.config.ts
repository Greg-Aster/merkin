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
const updates = defineCollection({
  schema: updatesSchema.extend({
    current: updatesSchema.shape.current.unwrap().extend({
      status: z.string().min(1),
      updated: z.date(),
      note: z.string().min(1),
      nextStop: z.string().min(1),
      areas: z.array(z.object({
        label: z.string().min(1),
        status: z.string().min(1),
        detail: z.string().min(1),
      })).min(1),
    }),
  }),
})
const avatar = defineCollection({ schema: z.object({}) })

export const collections = {
  avatar,
  posts,
  spec,
  team,
  friends,
  updates,
}
