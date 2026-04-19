import { defineCollection, z } from 'astro:content'
import {
  aboutSchema,
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
    sku: z.string().optional(), // A unique stock keeping unit, optional
    draft: z.boolean().optional().default(false),
    oneColumn: z.boolean().optional().default(false),
    // Availability status — drives badge and CTA behavior
    availability: z.enum([
      'available',         // purchasable now
      'coming_soon',       // real product, not yet live
      'out_of_stock',      // real product, temporarily unavailable
      'not_in_your_area',  // satirical: exists, just not near you
      'not_in_your_timeline', // satirical: exists in another timeline
      'artifact_only',     // lore exhibit, never for sale
    ]).optional().default('coming_soon'),
    // CTA behavior: 'cart' = add to cart, 'external' = Stripe link, 'none' = no purchase action
    ctaMode: z.enum(['cart', 'external', 'none']).optional().default('none'),
    // Stripe Payment Link URL — populated once product is live on Stripe
    stripePaymentLink: z.string().optional(),
    // Product category for store filter chips
    category: z.enum(['equipment', 'consumables', 'publications', 'companions', 'relics']).optional(),
    // Whether to feature this product in a hero/spotlight slot
    featured: z.boolean().optional().default(false),
    // Product format
    format: z.enum(['physical', 'digital', 'lore_only']).optional().default('physical'),
    // Separate reality-layer description shown below the fiction copy
    realDescription: z.string().optional(),
    // Shipping note shown on available/coming_soon products
    shippingNote: z.string().optional(),
    // Optional badge text override (defaults to availability label)
    badge: z.string().optional(),
    rating: z.number().optional(),
    // Unified media array — replaces image + additionalImages
    // Supports mixed types: image, local webm video, YouTube embed
    media: z.array(z.object({
      type: z.enum(['image', 'video', 'youtube']),
      src: z.string().optional(),       // image or video path
      videoId: z.string().optional(),   // YouTube video ID
      poster: z.string().optional(),    // thumbnail for video items
      alt: z.string().optional(),
      caption: z.string().optional(),
    })).optional(),
    // Keep for backwards compat — prefer media[] for new products
    image: z.string().optional(),
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

// Export the collections
export const collections = {
  posts: postsCollection,
  spec: specCollection,
  team: teamCollection,
  friends: friendsCollection,
  about: aboutCollection, // NEW: About collection for dynamic author pages
  products: productsCollection,
  quizzes: quizzesCollection,
}
