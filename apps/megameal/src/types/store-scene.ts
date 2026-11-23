export type SceneMediaType = 'image' | 'video' | 'model3d' | 'iframe' | 'scene'

export type ProductFieldType =
  | 'text'
  | 'price'
  | 'availability'
  | 'rating'
  | 'button'
  | 'link'
  | 'meta'

export interface MediaAsset {
  id: string
  type: SceneMediaType
  src: string
  thumbnail?: string
  alt?: string
  poster?: string
  caption?: string
  lowPolyFallback?: string
  autoplay?: boolean
  cameraPreset?: string
  sceneId?: string
}

export interface ProductField {
  type: ProductFieldType
  label?: string
  value: unknown
  quirks?: string[]
}

export interface PanelConfig {
  id: string
  type: 'reviews' | 'specifications' | 'policies' | 'related' | 'custom'
  label?: string
  title?: string
}

export interface Quirk {
  name: string
  params?: Record<string, unknown>
}

export interface ProductRecord {
  id: string
  name: string
  slug: string
  tagline?: string
  brand?: string
  category?: string[]
  media: MediaAsset[]
  sheet: ProductField[]
  panels: PanelConfig[]
  reviews: string[]
  quirks?: Quirk[]
  relatedProducts?: string[]
  sceneWeight?: number
  eligiblePages?: string[]
  minIntervalDays?: number
}

export interface ReviewRecord {
  id: string
  author: string
  authorLink?: string
  rating: number
  date: string
  attachments?: MediaAsset[]
  verified?: boolean
  flags?: string[]
  linksTo?: string[]
}
