import type { CollectionEntry } from 'astro:content'

function toSlug(product: CollectionEntry<'products'>) {
  return product.data.slug ?? product.id.replace(/\.(md|mdx)$/, '')
}

function toHref(product: CollectionEntry<'products'>) {
  return `/store/${toSlug(product)}/`
}

function resolveMediaThumbnail(product: CollectionEntry<'products'>) {
  const firstMedia = product.data.media?.find(item => item.type === 'image')
  return firstMedia?.src ?? product.data.image ?? '/ads/snuggloids.png'
}

export function buildFlagshipProductShowcase(
  product: CollectionEntry<'products'>,
  products: CollectionEntry<'products'>[],
) {
  const categoryMatchedProducts = products
    .filter(entry => entry.id !== product.id)
    .filter(entry => entry.data.category === product.data.category)
  const fallbackProducts = products.filter(entry => entry.id !== product.id)
  const relatedProducts = (
    categoryMatchedProducts.length > 0
      ? categoryMatchedProducts
      : fallbackProducts
  )
    .slice(0, 4)
    .map(entry => ({
      name: entry.data.name,
      href: toHref(entry),
      image: resolveMediaThumbnail(entry),
      price: entry.data.price,
      availability: entry.data.availability,
    }))

  const baseMedia = product.data.media ?? []
  const imageMedia =
    baseMedia.find(item => item.type === 'image' && item.src) ??
    (product.data.image
      ? {
          id: 'fallback-image',
          type: 'image' as const,
          src: product.data.image,
          alt: product.data.name,
          caption: 'Primary product image',
        }
      : null)
  const modelMedia = baseMedia.find(item => item.type === 'model3d' && item.src)
  const youtubeMedia = baseMedia.find(
    item => item.type === 'youtube' && item.videoId,
  )
  const videoMedia = baseMedia.find(item => item.type === 'video' && item.src)
  const youtubeThumbnail = youtubeMedia?.videoId
    ? `https://img.youtube.com/vi/${youtubeMedia.videoId}/hqdefault.jpg`
    : undefined
  const fallbackThumb =
    imageMedia?.thumbnail ??
    imageMedia?.src ??
    product.data.image ??
    youtubeThumbnail ??
    '/ads/snuggloids.png'

  const media = [
    ...(imageMedia
      ? [
          {
            id: imageMedia.id ?? 'primary-image',
            type: 'image' as const,
            src: imageMedia.src ?? fallbackThumb,
            alt: imageMedia.alt ?? product.data.name,
            caption:
              imageMedia.caption ??
              'Commercial still from the companion program.',
            thumbnail: imageMedia.thumbnail ?? fallbackThumb,
            poster: imageMedia.poster,
          },
        ]
      : []),
    ...(modelMedia?.src
      ? [
          {
            id: modelMedia.id ?? 'product-model',
            type: 'model3d' as const,
            src: modelMedia.src,
            alt:
              modelMedia.alt ??
              `Interactive three-dimensional render of ${product.data.name}`,
            caption:
              modelMedia.caption ??
              'Interactive product render. Drag to rotate the approved domestic form.',
            thumbnail: modelMedia.thumbnail ?? fallbackThumb,
          },
        ]
      : []),
    ...(youtubeMedia
      ? [
          {
            id: youtubeMedia.id ?? 'commercial',
            type: 'iframe' as const,
            src: `https://www.youtube.com/embed/${youtubeMedia.videoId}`,
            alt: youtubeMedia.alt ?? `${product.data.name} commercial`,
            caption:
              youtubeMedia.caption ??
              'Official commercial recovered from the archive broadcast.',
            thumbnail:
              youtubeMedia.thumbnail ?? youtubeMedia.poster ?? youtubeThumbnail,
            poster: youtubeMedia.poster ?? youtubeThumbnail,
          },
        ]
      : []),
    ...(videoMedia?.src
      ? [
          {
            id: videoMedia.id ?? 'product-video',
            type: 'video' as const,
            src: videoMedia.src,
            alt: videoMedia.alt ?? `${product.data.name} video preview`,
            caption:
              videoMedia.caption ??
              'Recovered product-adjacent video reference.',
            thumbnail:
              videoMedia.thumbnail ??
              videoMedia.poster ??
              imageMedia?.thumbnail ??
              fallbackThumb,
            poster: videoMedia.poster ?? fallbackThumb,
          },
        ]
      : []),
  ]

  return {
    product: {
      name: product.data.name,
      tagline: product.data.tagline,
      description: product.data.description,
      brand: product.data.brand ?? 'MEGA MEAL Consumer Goods',
      price: product.data.price,
      availability: product.data.availability,
      alternateAction: product.data.alternateAction,
      rating: product.data.rating,
      sku: product.data.sku,
      stockRegistry: product.data.stockRegistry,
      href: toHref(product),
      media,
      specifications: product.data.specifications ?? [],
      ingredients: product.data.ingredients ?? [],
      nutritionFacts: product.data.nutritionFacts ?? [],
      qanda: product.data.qanda ?? [],
      reviews: product.data.preWrittenReviews ?? [],
      quirks: product.data.quirks,
    },
    relatedProducts,
  }
}

export function getProductSlug(product: CollectionEntry<'products'>) {
  return toSlug(product)
}

export function getProductHref(product: CollectionEntry<'products'>) {
  return toHref(product)
}
