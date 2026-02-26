import { defineCollection, z } from 'astro:content'
import {
  aboutSchema,
  assetDataSchema,
  friendsSchema,
  postsSchema,
  specSchema,
  teamSchema,
} from '@merkin/blog-core/schemas'

// Define the 'posts' collection
const postsCollection = defineCollection({
  schema: postsSchema,
})

// Rest of collections remain unchanged
const specCollection = defineCollection({
  schema: specSchema,
})

const teamCollection = defineCollection({
  schema: teamSchema,
})

// Define the friends collection
const friendsCollection = defineCollection({
  schema: friendsSchema,
})

// Define the 'about' collection for dynamic author pages
const aboutCollection = defineCollection({
  schema: aboutSchema,
})

// Define the 'products' collection
const productsCollection = defineCollection({
  schema: z.object({
    name: z.string(), // The name of the product
    tagline: z.string(), // The sinister tagline for the product
    description: z.string().optional(), // A more detailed description, optional
    price: z.number().optional(), // The price of the product, optional
    image: z.string().optional(), // Path to the product image, optional
    sku: z.string().optional(), // A unique stock keeping unit, optional
    draft: z.boolean().optional().default(false), // To mark if the product is a draft
    // ⭐ NEW: One column support for products too
    oneColumn: z.boolean().optional().default(false),
    // New fields for product frontmatter
    rating: z.number().optional(),
    additionalImages: z.array(z.string()).optional(),
    specifications: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .optional(),
    qanda: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .optional(),
    preWrittenReviews: z
      .array(
        z.object({
          author: z.string(),
          rating: z.number().optional(),
          date: z.string().optional(),
          comment: z.string(),
        }),
      )
      .optional(),
  }),
})

// ADD QUIZZES COLLECTION
const quizzesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    initialQuestion: z.string(), // The ID of the first question
    outcomes: z.record(z.object({
        title: z.string(),
        description: z.string(),
    })),
    // Questions are now a map of nodes, not an array
    nodes: z.record(
      z.object({
        text: z.string(),
        options: z.array(
          z.object({
            text: z.string(),
            trait: z.string().optional(), // Trait is now optional
            next: z.string(), // ID of the next question or an OUTCOME
          })
        ).min(1),
      })
    ),
  }),
})

// Define avatar and mascot as asset directories (no schema needed, just images)
// This prevents Astro from looking for MD/MDX files in these directories
const avatarCollection = defineCollection({
  type: 'data',
  schema: assetDataSchema,
})

const mascotCollection = defineCollection({
  type: 'data',
  schema: assetDataSchema,
})

// Export the collections
export const collections = {
  posts: postsCollection,
  spec: specCollection,
  team: teamCollection,
  friends: friendsCollection,
  about: aboutCollection, // NEW: About collection for dynamic author pages
  products: productsCollection,
  quizzes: quizzesCollection,
  avatar: avatarCollection, // Explicitly define to prevent auto-generation
  mascot: mascotCollection, // Explicitly define to prevent auto-generation
}
