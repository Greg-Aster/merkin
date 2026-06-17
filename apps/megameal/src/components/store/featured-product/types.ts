import type { Quirk } from '../../../types/store-scene'

export type ProductMedia = {
  id: string
  type: 'image' | 'video' | 'iframe' | 'model3d'
  src: string
  alt?: string
  caption?: string
  poster?: string
  thumbnail?: string
}

export type ProductSpec = {
  label: string
  value: string
}

export type ProductQuestion = {
  question: string
  answer: string
  linkLabel?: string
  linkHref?: string
  linkAccent?: 'signal' | 'creepy'
}

export type ProductReview = {
  author: string
  rating?: number
  date?: string
  comment: string
  authorHref?: string
  linkLabel?: string
  linkHref?: string
  flags?: string[]
  verified?: boolean
}

export type RelatedProduct = {
  name: string
  href: string
  image?: string
  price?: number
  availability?: string
}

export type ProductActionLink = {
  label: string
  href: string
  variant?: 'default' | 'mutation'
  row?: 'primary' | 'secondary'
}

export type ProductStockRegistry = {
  registryId?: string
  registryHref?: string
  adoptionHref?: string
  unitsAvailable?: number | null
  unitsSold?: number | null
}

export type ProductFeaturedCommerce = {
  showPrimaryAction?: boolean
  showStockRegistrySummary?: boolean
}

export type FeaturedProduct = {
  name: string
  tagline?: string
  description?: string
  brand?: string
  price?: number
  availability?: string
  alternateAction?: ProductActionLink
  alternateActions?: ProductActionLink[]
  featuredCommerce?: ProductFeaturedCommerce
  rating?: number
  sku?: string
  stockRegistry?: ProductStockRegistry
  href: string
  media: ProductMedia[]
  specifications: ProductSpec[]
  ingredients?: string[]
  nutritionFacts?: ProductSpec[]
  assurances?: ProductSpec[]
  qanda: ProductQuestion[]
  reviews: ProductReview[]
  quirks?: Quirk[]
}

export type FeaturedProductPanel =
  | 'specifications'
  | 'ingredients'
  | 'qanda'
  | 'reviews'
  | 'assurance'
  | 'warnings'

export type AvailabilityTone = {
  label: string
  badge: string
  message: string
  action: string
}

export type CtaFeedback = {
  tone: 'error' | 'success'
  text: string
}
