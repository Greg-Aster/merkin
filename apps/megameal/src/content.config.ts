import { defineCollection, z } from 'astro:content'
import {
  aboutSchema,
  friendsSchema,
  postsSchema,
  specSchema,
  teamSchema,
} from '@merkin/blog-core/schemas'

const legacyProductCategorySchema = z.enum([
  'equipment',
  'consumables',
  'publications',
  'companions',
  'relics',
])

const productListingStyleSchema = z.enum(['legacy', 'showcase'])

const mediaAssetSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['image', 'video', 'youtube', 'model3d', 'iframe', 'scene']),
  src: z.string().optional(),
  videoId: z.string().optional(),
  poster: z.string().optional(),
  thumbnail: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  lowPolyFallback: z.string().optional(),
  autoplay: z.boolean().optional(),
  cameraPreset: z.string().optional(),
  sceneId: z.string().optional(),
})

const productLinkAccentSchema = z.enum(['signal', 'creepy'])

const productQuestionSchema = z.object({
  question: z.string(),
  answer: z.string(),
  linkLabel: z.string().optional(),
  linkHref: z.string().optional(),
  linkAccent: productLinkAccentSchema.optional(),
})

const productReviewSchema = z.object({
  author: z.string(),
  rating: z.number().optional(),
  date: z.string().optional(),
  comment: z.string(),
  authorHref: z.string().optional(),
  linkLabel: z.string().optional(),
  linkHref: z.string().optional(),
  flags: z.array(z.string()).optional(),
  verified: z.boolean().optional(),
})

const productDataPointSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const productActionLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
})

const productStockRegistrySchema = z.object({
  registryId: z.string().optional(),
  registryHref: z.string().optional(),
  adoptionHref: z.string().optional(),
  unitsAvailable: z.number().int().nonnegative().nullable().optional(),
  unitsSold: z.number().int().nonnegative().nullable().optional(),
})

const snuggaloidRegistryCollection = defineCollection({
  schema: z.object({
    name: z.string(),
    unitId: z.string(),
    adoptionStatus: z
      .enum(['preview', 'available', 'reserved', 'adopted', 'not_available'])
      .optional()
      .default('preview'),
    image: z.string().optional(),
    gallery: z.array(mediaAssetSchema).optional().default([]),
    temperament: z.string().optional(),
    size: z.string().optional(),
    exterior: z.string().optional(),
    traits: z.array(z.string()).optional().default([]),
    registryNote: z.string().optional(),
    adoptionNote: z.string().optional(),
    warnings: z.array(z.string()).optional().default([]),
    easterEgg: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
  }),
})

const quirkSchema = z.object({
  name: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
})

const productFieldSchema = z.object({
  type: z.enum([
    'text',
    'price',
    'availability',
    'rating',
    'button',
    'link',
    'meta',
  ]),
  label: z.string().optional(),
  value: z.unknown(),
  quirks: z.array(z.string()).optional(),
})

const panelConfigSchema = z.object({
  id: z.string(),
  type: z
    .enum(['reviews', 'specifications', 'policies', 'related', 'custom'])
    .optional()
    .default('custom'),
  label: z.string().optional(),
  title: z.string().optional(),
})

const timelineFrontmatterSchema = {
  timelineYear: z.number().optional(),
  timelineEra: z.string().optional(),
  timelineLocation: z.string().optional(),
  isKeyEvent: z.boolean().optional(),
  showInTimeline: z.boolean().optional(),
}

const megamealPostsSchema = postsSchema.extend({
  oneColumn: z.boolean().optional().default(true),
  bannerType: z
    .enum([
      'none',
      'standard',
      'image',
      'video',
      'timeline',
      'assistant',
      'cookbook',
      'archive',
      'reader',
    ])
    .optional(),
})

// Define the 'posts' collection
const postsCollection = defineCollection({
  schema: megamealPostsSchema,
})

const videosCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    published: z.date(),
    description: z.string(),
    videoId: z.string(),
    channelName: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional().default('Video'),
    draft: z.boolean().optional().default(false),
    ...timelineFrontmatterSchema,
    related: z
      .array(
        z.object({
          title: z.string(),
          href: z.string(),
          eyebrow: z.string().optional(),
          image: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
  }),
})

const cookbookCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    published: z.date(),
    description: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional().default('Cookbook'),
    section: z.string().optional().default('Archive'),
    page: z.number().optional(),
    kind: z.enum(['index', 'recipe', 'essay']).optional().default('recipe'),
    authorName: z.string().optional(),
    authorBio: z.string().optional(),
    prepTime: z.string().optional(),
    cookTime: z.string().optional(),
    totalTime: z.string().optional(),
    servings: z.string().optional(),
    difficulty: z.string().optional(),
    era: z.string().optional(),
    location: z.string().optional(),
    downloadable: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
    ...timelineFrontmatterSchema,
    related: z.array(z.string()).optional().default([]),
  }),
})

const readerCollection = defineCollection({
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
    slug: z.string().optional(),
    brand: z.string().optional(),
    description: z.string().optional(), // A more detailed description, optional
    price: z.number().optional(), // The price of the product, optional
    sku: z.string().optional(), // A unique stock keeping unit, optional
    stockRegistry: productStockRegistrySchema.optional(),
    draft: z.boolean().optional().default(false),
    ...timelineFrontmatterSchema,
    oneColumn: z.boolean().optional().default(false),
    // Availability status — drives badge and CTA behavior
    availability: z
      .enum([
        'available', // purchasable now
        'coming_soon', // real product, not yet live
        'out_of_stock', // real product, temporarily unavailable
        'not_in_your_area', // satirical: exists, just not near you
        'not_in_your_timeline', // satirical: exists in another timeline
        'artifact_only', // lore exhibit, never for sale
      ])
      .optional()
      .default('coming_soon'),
    // CTA behavior: 'cart' = add to cart, 'external' = Stripe link, 'none' = no purchase action
    ctaMode: z.enum(['cart', 'external', 'none']).optional().default('none'),
    // Stripe Payment Link URL — populated once product is live on Stripe
    stripePaymentLink: z.string().optional(),
    // Product category for store filter chips
    category: legacyProductCategorySchema.optional(),
    categories: z.array(z.string()).optional(),
    // Whether to feature this product in a hero/spotlight slot
    featured: z.boolean().optional().default(false),
    listingStyle: productListingStyleSchema.optional().default('legacy'),
    listingLabel: z.string().optional(),
    // Product format
    format: z
      .enum(['physical', 'digital', 'lore_only'])
      .optional()
      .default('physical'),
    // Separate reality-layer description shown below the fiction copy
    realDescription: z.string().optional(),
    alternateAction: productActionLinkSchema.optional(),
    // Shipping note shown on available/coming_soon products
    shippingNote: z.string().optional(),
    // Optional badge text override (defaults to availability label)
    badge: z.string().optional(),
    rating: z.number().optional(),
    // Unified media array — replaces image + additionalImages
    // Supports mixed types: image, local webm video, YouTube embed
    media: z.array(mediaAssetSchema).optional(),
    // Keep for backwards compat — prefer media[] for new products
    image: z.string().optional(),
    additionalImages: z.array(z.string()).optional(),
    specifications: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .optional(),
    ingredients: z.array(z.string()).optional(),
    nutritionFacts: z.array(productDataPointSchema).optional(),
    assurances: z.array(productDataPointSchema).optional(),
    qanda: z.array(productQuestionSchema).optional(),
    preWrittenReviews: z.array(productReviewSchema).optional(),
    sheet: z.array(productFieldSchema).optional(),
    panels: z.array(panelConfigSchema).optional(),
    reviews: z.array(z.string()).optional(),
    quirks: z.array(quirkSchema).optional(),
    relatedProducts: z.array(z.string()).optional(),
    sceneWeight: z.number().positive().optional(),
    eligiblePages: z.array(z.string()).optional(),
    minIntervalDays: z.number().int().nonnegative().optional(),
  }),
})

const reviewsCollection = defineCollection({
  schema: z.object({
    author: z.string(),
    authorLink: z.string().optional(),
    rating: z.number().min(0).max(5),
    date: z.string(),
    attachments: z.array(mediaAssetSchema).optional(),
    verified: z.boolean().optional().default(false),
    flags: z.array(z.string()).optional(),
    linksTo: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
  }),
})

// ADD QUIZZES COLLECTION
const quizzesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    initialQuestion: z.string(), // The ID of the first question
    outcomes: z.record(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    ),
    // Questions are now a map of nodes, not an array
    nodes: z.record(
      z.object({
        text: z.string(),
        options: z
          .array(
            z.object({
              text: z.string(),
              trait: z.string().optional(), // Trait is now optional
              next: z.string(), // ID of the next question or an OUTCOME
            }),
          )
          .min(1),
      }),
    ),
  }),
})

// Export the collections
export const collections = {
  posts: postsCollection,
  videos: videosCollection,
  cookbook: cookbookCollection,
  reader: readerCollection,
  spec: specCollection,
  team: teamCollection,
  friends: friendsCollection,
  about: aboutCollection, // NEW: About collection for dynamic author pages
  products: productsCollection,
  snuggaloids: snuggaloidRegistryCollection,
  reviews: reviewsCollection,
  quizzes: quizzesCollection,
}
