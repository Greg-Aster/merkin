import { defineCollection } from 'astro:content'
import {
  postsSchema,
  specSchema,
  teamSchema,
  friendsSchema,
} from '@merkin/blog-core/schemas/content'

const posts = defineCollection({ schema: postsSchema })
const spec = defineCollection({ schema: specSchema })
const team = defineCollection({ schema: teamSchema })
const friends = defineCollection({ schema: friendsSchema })

// avatar is an image folder — define it as a collection to suppress Astro deprecation warning
const avatar = defineCollection({ type: 'assets' })

export const collections = {
  posts,
  spec,
  team,
  friends,
  avatar,
}
