<script lang="ts">
import type { FeaturedProduct } from './types'

export let product: FeaturedProduct
export let showBannerControls = true
export let kickerLabel = 'Featured Product'
export let offerCode: string
export let bannerSlideIndex: number
export let bannerSlideCount: number
export let bannerPaused: boolean
export let bannerProgress: number
export let sendBannerControl: (action: 'previous' | 'next' | 'toggle-pause') => void

function formatRegistryCount(value: number | null | undefined, fallback: string) {
  return typeof value === 'number' ? value.toLocaleString() : fallback
}

$: availableUnitsText = formatRegistryCount(
  product.stockRegistry?.unitsAvailable,
  'N/A',
)
$: unitsSoldText = formatRegistryCount(product.stockRegistry?.unitsSold, 'No Data')
</script>

<div class="featured-product-utilitybar">
  <div class="featured-product-utilitybar__deal">
    <span class="featured-product-utilitybar__badge">Sponsored</span>
    <strong>20% off with code: {offerCode}</strong>
    <span>Offer valid until regional collapse.</span>
  </div>
  <div class="featured-product-utilitybar__meta">
    <span>Available units: {availableUnitsText}</span>
    <span>Units sold: {unitsSoldText}</span>
  </div>
</div>

<div class="featured-product-topbar">
  <div>
    <p class="featured-product-kicker">{kickerLabel}</p>
    <h1>{product.name}</h1>
    {#if product.brand}
      <p class="featured-product-sellerline">
        Certified by <strong>{product.brand}</strong> with a 99.6% containment score
      </p>
    {/if}
  </div>
  {#if showBannerControls}
    <div class="featured-product-control-center" aria-label="Banner controls">
      <div class="featured-product-control-center__meta">
        <span>
          Slide {Math.min(bannerSlideIndex + 1, bannerSlideCount)} / {bannerSlideCount}
        </span>
        <strong>{bannerPaused ? 'Paused' : 'Auto-rotation active'}</strong>
      </div>
      <div
        class="featured-product-control-center__progress"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(bannerProgress * 100)}
        aria-label="Banner progress"
      >
        <span style={`transform: scaleX(${Math.max(0.02, bannerProgress)})`}></span>
      </div>
      <div class="featured-product-control-center__buttons">
        <button type="button" onclick={() => sendBannerControl('previous')}>
          Prev
        </button>
        <button type="button" onclick={() => sendBannerControl('toggle-pause')}>
          {bannerPaused ? 'Play' : 'Pause'}
        </button>
        <button type="button" onclick={() => sendBannerControl('next')}>Next</button>
      </div>
    </div>
  {/if}
</div>
