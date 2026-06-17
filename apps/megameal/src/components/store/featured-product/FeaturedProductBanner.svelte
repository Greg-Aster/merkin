<script lang="ts">
import { extractYouTubeVideoId } from '@merkin/blog-core/utils/youtube-embed'
import { onMount } from 'svelte'
import { cart } from '../../../stores/cartStore'
import {
  getAddToCartRefusalQuirk,
  getPriceDriftQuirk,
} from '../../../utils/product-banner-quirks'
import FeaturedProductZoomModal from './FeaturedProductZoomModal.svelte'
import FeaturedProductDetailPanel from './FeaturedProductDetailPanel.svelte'
import FeaturedProductMediaStage from './FeaturedProductMediaStage.svelte'
import FeaturedProductPurchaseSheet from './FeaturedProductPurchaseSheet.svelte'
import FeaturedProductRelatedRail from './FeaturedProductRelatedRail.svelte'
import FeaturedProductTopBar from './FeaturedProductTopBar.svelte'
import type {
  AvailabilityTone,
  FeaturedProduct,
  FeaturedProductPanel,
  ProductMedia,
  RelatedProduct,
} from './types'
import '../../../styles/features/store/featured-product/featured-product-shell.css'
import '../../../styles/features/store/featured-product/featured-product-commerce.css'
import '../../../styles/features/store/featured-product/featured-product-panels.css'
import '../../../styles/features/store/featured-product/featured-product-related-modal.css'

export let product: FeaturedProduct
export let showBannerControls = true
export let showFullProductLink = true
export let kickerLabel = 'Featured Product'
export let relatedProducts: RelatedProduct[] = []
export let embedOrigin: string | undefined = undefined

let selectedIndex = 0
let activePanel: FeaturedProductPanel | null = null
let zoomOpen = false
let bannerSlideIndex = 0
let bannerSlideCount = 1
let bannerProgress = 0
let bannerPaused = false
let driftedPrice = product.price
let displayedPriceText = formatCurrency(product.price)
let ctaFeedback: { tone: 'error' | 'success'; text: string } | null = null
let refusalAnimating = false
let reducedMotion = false
let priceGlitching = false

let priceDriftTimer: ReturnType<typeof setInterval> | undefined
let refusalResetTimer: ReturnType<typeof setTimeout> | undefined
let priceGlitchResetTimer: ReturnType<typeof setTimeout> | undefined
let priceGlitchFrameTimers: Array<ReturnType<typeof setTimeout>> = []

const offerCode = 'ASCEND20'
const financingLine = 'Orbit-approved financing from $45 / cycle'

const availabilityTone: Record<string, AvailabilityTone> = {
  available: {
    label: 'Available Now',
    badge: 'bg-emerald-400/90 text-slate-950',
    message: 'Cleared for this region.',
    action: 'Add to cart',
  },
  not_in_your_area: {
    label: 'Not Available In Your Area',
    badge: 'bg-amber-300/90 text-slate-950',
    message: 'Regional clearance is still pending.',
    action: 'Why not here?',
  },
  not_in_your_timeline: {
    label: 'Not Available In Your Timeline',
    badge: 'bg-fuchsia-400/85 text-slate-950',
    message: 'Fulfillment depends on causality.',
    action: 'Review timeline restrictions',
  },
  artifact_only: {
    label: 'Artifact Record',
    badge: 'bg-rose-400/85 text-slate-950',
    message: 'This listing is archival only.',
    action: 'Read the dossier',
  },
  coming_soon: {
    label: 'Coming Soon',
    badge: 'bg-cyan-300/85 text-slate-950',
    message: 'Launch window still unstable.',
    action: 'Track release status',
  },
  out_of_stock: {
    label: 'Out of Stock',
    badge: 'bg-slate-300/80 text-slate-950',
    message:
      'Print stock depleted. Additional units are not currently scheduled.',
    action: 'Check alternate formats',
  },
}

const addableAvailability = new Set(['available'])

$: selectedMedia = product.media[selectedIndex] ?? product.media[0]
$: previewTitle =
  activePanel === 'specifications'
    ? 'Specifications'
    : activePanel === 'ingredients'
      ? 'Ingredients & Nutrition'
      : activePanel === 'qanda'
        ? 'Questions & Answers'
        : activePanel === 'reviews'
        ? 'Field Reviews'
        : activePanel === 'assurance'
          ? 'Assurance'
          : activePanel === 'warnings'
            ? 'Warnings'
            : null
$: priceDriftQuirk = getPriceDriftQuirk(product.quirks, product.price)
$: addToCartRefusalQuirk = getAddToCartRefusalQuirk(product.quirks)
$: currentTone =
  availabilityTone[product.availability || 'coming_soon'] ||
  availabilityTone.coming_soon
$: primaryButtonLabel = addToCartRefusalQuirk
  ? 'Add to cart'
  : addableAvailability.has(product.availability || '')
    ? 'Add to cart'
    : currentTone.action
$: hasIngredientsPanel =
  (product.ingredients?.length ?? 0) > 0 ||
  (product.nutritionFacts?.length ?? 0) > 0
$: hasAssurancePanel = (product.assurances?.length ?? 0) > 0

function selectMedia(index: number) {
  selectedIndex = index
}

function togglePanel(panel: FeaturedProductPanel) {
  activePanel = activePanel === panel ? null : panel
}

function openZoom() {
  if (selectedMedia?.type === 'image' || selectedMedia?.type === 'model3d') {
    zoomOpen = true
  }
}

function closeZoom() {
  zoomOpen = false
}

function closePanel() {
  activePanel = null
}

function renderStars(rating?: number) {
  if (typeof rating !== 'number') return []
  return Array.from({ length: 5 }, (_, index) => index < Math.round(rating))
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return 'Inquire Within'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function thumbnailFor(media: ProductMedia) {
  if (media.thumbnail) return media.thumbnail
  if (media.poster) return media.poster
  if (media.type === 'iframe') {
    const videoId = extractYouTubeVideoId(media.src)
    if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  }
  return media.src
}

function primaryImageSource() {
  const imageMedia = product.media.find(media => media.type === 'image')
  return imageMedia?.src ?? imageMedia?.thumbnail ?? product.media[0]?.thumbnail
}

function clearPriceGlitchTimers() {
  for (const timer of priceGlitchFrameTimers) clearTimeout(timer)
  priceGlitchFrameTimers = []
  if (priceGlitchResetTimer) clearTimeout(priceGlitchResetTimer)
}

function glitchFramesFor(nextPrice: number) {
  const stable = formatCurrency(nextPrice)
  const dollars = stable.replace('$', '').split('.')[0] ?? '00'
  const cents = stable.split('.')[1] ?? '00'

  return [
    '$--.--',
    `$${dollars}.??`,
    'PRICE LOST',
    `$${dollars}.${cents[0]}_`,
    stable,
  ]
}

function applyPriceDrift() {
  if (!priceDriftQuirk) return
  const nextPrice =
    priceDriftQuirk.minPrice +
    Math.random() * (priceDriftQuirk.maxPrice - priceDriftQuirk.minPrice)
  const normalizedNextPrice = Number(nextPrice.toFixed(2))
  driftedPrice = normalizedNextPrice

  if (reducedMotion) {
    displayedPriceText = formatCurrency(normalizedNextPrice)
    priceGlitching = false
    return
  }

  clearPriceGlitchTimers()
  priceGlitching = true

  for (const [index, frame] of glitchFramesFor(normalizedNextPrice).entries()) {
    priceGlitchFrameTimers.push(
      window.setTimeout(() => {
        displayedPriceText = frame
      }, index * 90),
    )
  }

  priceGlitchResetTimer = window.setTimeout(() => {
    displayedPriceText = formatCurrency(normalizedNextPrice)
    priceGlitching = false
  }, 420)
}

function handlePrimaryAction() {
  if (addToCartRefusalQuirk) {
    refusalAnimating = true
    ctaFeedback = {
      tone: 'error',
      text: addToCartRefusalQuirk.message,
    }

    if (refusalResetTimer) clearTimeout(refusalResetTimer)
    refusalResetTimer = window.setTimeout(() => {
      refusalAnimating = false
    }, addToCartRefusalQuirk.resetMs)
    return
  }

  if (
    addableAvailability.has(product.availability || '') &&
    typeof product.price === 'number'
  ) {
    cart.add({
      id: product.sku || product.href,
      name: product.name,
      price: product.price,
      sku: product.sku,
      href: product.href,
      image: primaryImageSource(),
    })
    ctaFeedback = {
      tone: 'success',
      text: `${product.name} added to cart.`,
    }
    return
  }

  activePanel = 'qanda'
  ctaFeedback = null
}

function sendBannerControl(action: 'previous' | 'next' | 'toggle-pause') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('merkin:banner-control', {
      detail: { action },
    }),
  )
}

onMount(() => {
  if (typeof window === 'undefined') return

  cart.init()
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  driftedPrice = product.price
  displayedPriceText = formatCurrency(product.price)

  if (priceDriftQuirk && !reducedMotion) {
    applyPriceDrift()
    priceDriftTimer = window.setInterval(
      applyPriceDrift,
      priceDriftQuirk.intervalMs,
    )
  }

  const handleBannerState = (
    event: Event & {
      detail?: {
        currentIndex?: number
        slideCount?: number
        isPaused?: boolean
        progress?: number
      }
    },
  ) => {
    const detail = event.detail
    if (!detail) return

    bannerSlideIndex = detail.currentIndex ?? 0
    bannerSlideCount = detail.slideCount ?? 1
    bannerPaused = detail.isPaused ?? false
    bannerProgress = detail.progress ?? 0
  }

  window.addEventListener(
    'merkin:banner-state',
    handleBannerState as EventListener,
  )

  return () => {
    if (priceDriftTimer) clearInterval(priceDriftTimer)
    if (refusalResetTimer) clearTimeout(refusalResetTimer)
    clearPriceGlitchTimers()
    window.removeEventListener(
      'merkin:banner-state',
      handleBannerState as EventListener,
    )
  }
})
</script>

<section class="featured-product-shell">
  <FeaturedProductTopBar
    {product}
    {showBannerControls}
    {kickerLabel}
    {offerCode}
    {bannerSlideIndex}
    {bannerSlideCount}
    {bannerPaused}
    {bannerProgress}
    {sendBannerControl}
  />

  <div class="featured-product-stage">
    <FeaturedProductMediaStage
      {product}
      {selectedIndex}
      {selectedMedia}
      {selectMedia}
      {thumbnailFor}
      {openZoom}
      {embedOrigin}
    />

    <FeaturedProductPurchaseSheet
      {product}
      {currentTone}
      {displayedPriceText}
      priceDriftActive={Boolean(priceDriftQuirk)}
      {priceGlitching}
      {financingLine}
      {refusalAnimating}
      {primaryButtonLabel}
      {ctaFeedback}
      {showFullProductLink}
      {renderStars}
      {handlePrimaryAction}
    />
  </div>

  <div class="featured-product-detail-nav">
    <div
      class="featured-product-panel-actions featured-product-panel-actions--full"
      aria-label="Product detail sections"
    >
      <button
        type="button"
        class:active={activePanel === 'specifications'}
        onclick={() => togglePanel('specifications')}
      >
        Specifications
      </button>
      {#if hasIngredientsPanel}
        <button
          type="button"
          class:active={activePanel === 'ingredients'}
          onclick={() => togglePanel('ingredients')}
        >
          Ingredients
        </button>
      {/if}
      <button
        type="button"
        class:active={activePanel === 'qanda'}
        onclick={() => togglePanel('qanda')}
      >
        Q&A
      </button>
      <button
        type="button"
        class:active={activePanel === 'reviews'}
        onclick={() => togglePanel('reviews')}
      >
        Reviews
      </button>
      {#if hasAssurancePanel}
        <button
          type="button"
          class:active={activePanel === 'assurance'}
          onclick={() => togglePanel('assurance')}
        >
          Assurance
        </button>
      {/if}
      <button
        type="button"
        class:active={activePanel === 'warnings'}
        onclick={() => togglePanel('warnings')}
      >
        Warnings
      </button>
    </div>
  </div>

  {#if activePanel}
    <FeaturedProductDetailPanel
      {product}
      {activePanel}
      {previewTitle}
      {renderStars}
      {closePanel}
    />
  {/if}

  <FeaturedProductRelatedRail {relatedProducts} {formatCurrency} />
</section>

<FeaturedProductZoomModal
  open={zoomOpen}
  {selectedMedia}
  productName={product.name}
  onClose={closeZoom}
/>
