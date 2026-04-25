import type { CollectionEntry } from 'astro:content'
import type {
  MediaAsset,
  PanelConfig,
  ProductField,
  ProductRecord,
  Quirk,
  ReviewRecord,
} from '../types/store-scene'
import { url } from './url-utils'

type ProductMediaEntry = NonNullable<
  CollectionEntry<'products'>['data']['media']
>[number]
type ReviewAttachmentEntry = NonNullable<
  CollectionEntry<'reviews'>['data']['attachments']
>[number]

function resolveAsset(path?: string): string {
  if (!path) return ''
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('data:')
  ) {
    return path
  }
  return path.startsWith('/') ? url(path) : path
}

function toSceneMediaAsset(
  item: ProductMediaEntry | ReviewAttachmentEntry,
  index: number,
  fallbackAlt: string,
): MediaAsset | null {
  if (!item) return null

  if (item.type === 'youtube') {
    if (!item.videoId) return null
    const poster =
      resolveAsset(item.poster) ||
      `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`

    return {
      id: item.id ?? `asset-${index}`,
      type: 'iframe',
      src: `https://www.youtube.com/embed/${item.videoId}`,
      thumbnail: resolveAsset(item.thumbnail) || poster,
      poster,
      alt: item.alt || fallbackAlt,
      caption: item.caption,
      autoplay: item.autoplay,
    }
  }

  if (!item.src) return null
  if (item.type === 'scene' && !item.sceneId) return null

  return {
    id: item.id ?? `asset-${index}`,
    type: item.type,
    src: resolveAsset(item.src),
    thumbnail: resolveAsset(item.thumbnail),
    alt: item.alt || fallbackAlt,
    poster: resolveAsset(item.poster),
    caption: item.caption,
    lowPolyFallback: resolveAsset(item.lowPolyFallback),
    autoplay: item.autoplay,
    cameraPreset: item.cameraPreset,
    sceneId: item.sceneId,
  }
}

function normalizeLegacyMedia(
  product: CollectionEntry<'products'>,
): MediaAsset[] {
  const media: MediaAsset[] = []
  const fallbackAlt = product.data.name

  if (Array.isArray(product.data.media) && product.data.media.length > 0) {
    for (const [index, item] of product.data.media.entries()) {
      const normalized = toSceneMediaAsset(item, index, fallbackAlt)
      if (normalized) media.push(normalized)
    }
    if (media.length > 0) return media
  }

  if (product.data.image) {
    media.push({
      id: 'primary-image',
      type: 'image',
      src: resolveAsset(product.data.image),
      alt: fallbackAlt,
    })
  }

  if (Array.isArray(product.data.additionalImages)) {
    for (const [index, assetPath] of product.data.additionalImages.entries()) {
      media.push({
        id: `legacy-image-${index + 1}`,
        type: 'image',
        src: resolveAsset(assetPath),
        alt: fallbackAlt,
      })
    }
  }

  return media
}

function normalizeLegacySheet(
  product: CollectionEntry<'products'>,
): ProductField[] {
  const { data } = product
  const fields: ProductField[] = []

  if (Array.isArray(data.sheet) && data.sheet.length > 0) {
    return data.sheet.map(field => ({
      type: field.type,
      label: field.label,
      value: field.value,
      quirks: field.quirks,
    }))
  }

  if (data.description) {
    fields.push({
      type: 'text',
      label: 'Summary',
      value: data.description,
    })
  }

  if (typeof data.price === 'number') {
    fields.push({
      type: 'price',
      label: 'Unit Price',
      value: data.price,
    })
  }

  if (data.availability) {
    fields.push({
      type: 'availability',
      label: 'Availability',
      value: data.availability,
    })
  }

  if (typeof data.rating === 'number') {
    fields.push({
      type: 'rating',
      label: 'Field Rating',
      value: data.rating,
    })
  }

  if (data.sku) {
    fields.push({
      type: 'meta',
      label: 'Batch ID',
      value: data.sku,
    })
  }

  if (data.format) {
    fields.push({
      type: 'meta',
      label: 'Format',
      value: data.format,
    })
  }

  return fields
}

function normalizeLegacyPanels(
  product: CollectionEntry<'products'>,
): PanelConfig[] {
  const { data } = product

  if (Array.isArray(data.panels) && data.panels.length > 0) {
    return data.panels.map(panel => ({
      id: panel.id,
      type: panel.type ?? 'custom',
      label: panel.label,
      title: panel.title,
    }))
  }

  const panels: PanelConfig[] = []

  if (
    (Array.isArray(data.reviews) && data.reviews.length > 0) ||
    (Array.isArray(data.preWrittenReviews) && data.preWrittenReviews.length > 0)
  ) {
    panels.push({ id: 'reviews', type: 'reviews', label: 'See reviews' })
  }
  if (Array.isArray(data.specifications) && data.specifications.length > 0) {
    panels.push({
      id: 'specifications',
      type: 'specifications',
      label: 'Specifications',
    })
  }
  if (Array.isArray(data.relatedProducts) && data.relatedProducts.length > 0) {
    panels.push({
      id: 'related',
      type: 'related',
      label: 'Related items',
    })
  }

  return panels
}

export function normalizeProductEntry(
  product: CollectionEntry<'products'>,
): ProductRecord {
  const categories = Array.isArray(product.data.categories)
    ? product.data.categories
    : product.data.category
      ? [product.data.category]
      : undefined

  return {
    id: product.id,
    name: product.data.name,
    slug: product.data.slug ?? product.id.replace(/\.(md|mdx)$/, ''),
    tagline: product.data.tagline,
    brand: product.data.brand,
    category: categories,
    media: normalizeLegacyMedia(product),
    sheet: normalizeLegacySheet(product),
    panels: normalizeLegacyPanels(product),
    reviews: product.data.reviews ?? [],
    quirks: product.data.quirks as Quirk[] | undefined,
    relatedProducts: product.data.relatedProducts,
    sceneWeight: product.data.sceneWeight,
    eligiblePages: product.data.eligiblePages,
    minIntervalDays: product.data.minIntervalDays,
  }
}

export function normalizeReviewEntry(
  review: CollectionEntry<'reviews'>,
): ReviewRecord {
  const attachments = Array.isArray(review.data.attachments)
    ? review.data.attachments
        .map((item, index) =>
          toSceneMediaAsset(item, index, `${review.data.author} attachment`),
        )
        .filter((item): item is MediaAsset => item !== null)
    : undefined

  return {
    id: review.id,
    author: review.data.author,
    authorLink: review.data.authorLink,
    rating: review.data.rating,
    date: review.data.date,
    attachments,
    verified: review.data.verified,
    flags: review.data.flags,
    linksTo: review.data.linksTo,
  }
}
