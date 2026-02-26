import { defineCollection } from 'astro:content'
import {
  postsSchema,
  specSchema,
  teamSchema,
  friendsSchema,
  assetDataSchema,
} from '@merkin/blog-core/schemas/content'

const posts = defineCollection({ schema: postsSchema })
const spec = defineCollection({ schema: specSchema })
const team = defineCollection({ schema: teamSchema })
const friends = defineCollection({ schema: friendsSchema })

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
  avatar,
}
