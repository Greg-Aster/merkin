import type { CollectionEntry } from 'astro:content'
import { url } from '../utils/url-utils'
import { isPublicContentData } from './content'

export type ProductEntry = CollectionEntry<'products'>

export type MediaGalleryItem = {
  type: 'image' | 'video' | 'youtube'
  src?: string
  videoId?: string
  poster?: string
  alt?: string
  caption?: string
}

export type CardThumbnail = {
  kind: 'image' | 'youtube'
  src?: string
  videoId?: string
}

export type ProductListingVisual = {
  src: string
  srcset?: string
}

export const storeCategories = [
  { id: 'all', label: 'All Products' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'consumables', label: 'Consumables' },
  { id: 'publications', label: 'Publications' },
  { id: 'companions', label: 'Companions' },
  { id: 'relics', label: 'Relics' },
] as const

export const productCategoryLabels = Object.fromEntries(
  storeCategories
    .filter(category => category.id !== 'all')
    .map(category => [category.id, category.label]),
) as Record<string, string>

export const productAvailabilityDisplay: Record<string, string> = {
  available: 'Available Now',
  coming_soon: 'Coming Soon',
  out_of_stock: 'Out of Stock',
  not_in_your_area: 'Not in Your Area',
  not_in_your_timeline: 'Not in Your Timeline',
  artifact_only: 'Artifact Only',
}

export function publicProductCollectionFilter({ data }: ProductEntry) {
  return isPublicContentData(data)
}

export function labPrototypeProductFilter({ data }: ProductEntry) {
  return data.draft === true && typeof data.sceneWeight === 'number'
}

export function resolveStoreAsset(path: string | undefined) {
  if (!path) return undefined
  return path.startsWith('/') ? url(path) : path
}

export function getProductSlug(product: ProductEntry) {
  return product.data.slug ?? product.id.replace(/\.(md|mdx)$/, '')
}

export function getProductHref(product: ProductEntry) {
  return `/store/${getProductSlug(product)}/`
}

export function getPrimaryProductVisual(product: ProductEntry) {
  return getProductListingVisual(product)?.src
}

export function getProductListingVisual(
  product: ProductEntry,
): ProductListingVisual | null {
  const media = product.data.media ?? []
  for (const item of media) {
    const responsiveSources = item.thumbnailSources ?? []
    const srcset = responsiveSources
      .map(source => `${resolveStoreAsset(source.src)} ${source.width}w`)
      .join(', ')
    const withResponsiveSources = (src: string): ProductListingVisual => ({
      src,
      ...(srcset ? { srcset } : {}),
    })

    if (item.type === 'image' && item.src) {
      return withResponsiveSources(resolveStoreAsset(item.src) ?? item.src)
    }
    if (item.thumbnail) {
      return withResponsiveSources(
        resolveStoreAsset(item.thumbnail) ?? item.thumbnail,
      )
    }
    if (item.poster) {
      return withResponsiveSources(
        resolveStoreAsset(item.poster) ?? item.poster,
      )
    }
    if (item.type === 'youtube' && item.videoId) {
      return {
        src: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
      }
    }
  }

  const legacyImage = resolveStoreAsset(product.data.image)
  return legacyImage ? { src: legacyImage } : null
}

function isGalleryMediaType(type: string): type is MediaGalleryItem['type'] {
  return type === 'image' || type === 'video' || type === 'youtube'
}

export function getProductMediaItems(product: ProductEntry): MediaGalleryItem[] {
  const { additionalImages, image, media, name } = product.data

  return Array.isArray(media) && media.length > 0
    ? media.flatMap(item => {
        if (!isGalleryMediaType(item.type)) return []
        return [
          {
            type: item.type,
            src: item.src ? resolveStoreAsset(item.src) : undefined,
            videoId: item.videoId,
            poster: item.poster ? resolveStoreAsset(item.poster) : undefined,
            alt: item.alt,
            caption: item.caption,
          },
        ]
      })
    : [
        ...(image
          ? [
              {
                type: 'image' as const,
                src: resolveStoreAsset(image),
                alt: name,
              },
            ]
          : []),
        ...(additionalImages ?? []).map((src: string) => ({
          type: 'image' as const,
          src: resolveStoreAsset(src),
          alt: name,
        })),
      ]
}

export function getProductCardThumbnail(
  mediaItems: MediaGalleryItem[],
): CardThumbnail | null {
  for (const mediaItem of mediaItems) {
    if (mediaItem.type === 'image' && mediaItem.src) {
      return { kind: 'image', src: resolveStoreAsset(mediaItem.src) }
    }
    if (mediaItem.type === 'video' && mediaItem.poster) {
      return { kind: 'image', src: resolveStoreAsset(mediaItem.poster) }
    }
    if (mediaItem.type === 'youtube' && mediaItem.videoId) {
      return { kind: 'youtube', videoId: mediaItem.videoId }
    }
  }
  return null
}

export function sortFeaturedProductsFirst(products: ProductEntry[]) {
  return products.sort((left, right) => {
    if (left.data.featured && !right.data.featured) return -1
    if (!left.data.featured && right.data.featured) return 1
    return (right.data.rating ?? 0) - (left.data.rating ?? 0)
  })
}

export function getCategoryCounts(products: ProductEntry[]) {
  return Object.fromEntries(
    storeCategories.map(category => [
      category.id,
      category.id === 'all'
        ? products.length
        : products.filter(product => product.data.category === category.id)
            .length,
    ]),
  )
}

export function getAvailabilityCounts(products: ProductEntry[]) {
  return Object.entries(productAvailabilityDisplay).map(
    ([availability, label]) => ({
      availability,
      label,
      count: products.filter(
        product => (product.data.availability ?? 'coming_soon') === availability,
      ).length,
    }),
  )
}

export function getProductSearchText(product: ProductEntry) {
  return `${product.data.name} ${product.data.category ?? ''} ${
    product.data.tagline ?? ''
  } ${product.data.description ?? ''}`.toLowerCase()
}

export function getAvailabilityBadge(
  availability = 'coming_soon',
  badge?: string,
) {
  const availabilityMap: Record<
    string,
    { label: string; classes: string; ctaMessage: string }
  > = {
    available: {
      label: badge || 'Available Now',
      classes: 'bg-emerald-500/90 text-white',
      ctaMessage: '',
    },
    coming_soon: {
      label: badge || 'Coming Soon',
      classes: 'bg-blue-500/80 text-white',
      ctaMessage: 'Transmission pending. Stand by.',
    },
    out_of_stock: {
      label: badge || 'Out of Stock',
      classes: 'bg-slate-500/80 text-white',
      ctaMessage: 'The shelves are bare. Demand has been noted. Probably.',
    },
    not_in_your_area: {
      label: badge || 'Not in Your Area',
      classes: 'bg-amber-500/80 text-black',
      ctaMessage:
        'Your coordinates are outside our current distribution matrix.',
    },
    not_in_your_timeline: {
      label: badge || 'Not Available in Your Timeline',
      classes: 'bg-purple-500/80 text-white',
      ctaMessage:
        'This product exists. Procurement from your timeline is not currently supported.',
    },
    artifact_only: {
      label: badge || 'Artifact Record',
      classes: 'bg-rose-900/80 text-rose-200',
      ctaMessage:
        'This item is catalogued for archival purposes. Acquiring it would be inadvisable.',
    },
  }

  return availabilityMap[availability] ?? availabilityMap.coming_soon
}
