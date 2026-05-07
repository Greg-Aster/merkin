<script lang="ts">
import type {
  AvailabilityTone,
  CtaFeedback,
  FeaturedProduct,
  FeaturedProductPanel,
} from './types'

export let product: FeaturedProduct
export let currentTone: AvailabilityTone
export let activePanel: FeaturedProductPanel | null
export let hasIngredientsPanel: boolean
export let displayedPriceText: string
export let priceDriftActive: boolean
export let priceGlitching: boolean
export let financingLine: string
export let refusalAnimating: boolean
export let primaryButtonLabel: string
export let ctaFeedback: CtaFeedback | null
export let showFullProductLink: boolean
export let renderStars: (rating?: number) => boolean[]
export let togglePanel: (panel: FeaturedProductPanel) => void
export let handlePrimaryAction: () => void

function formatRegistryCount(value: number | null | undefined, fallback: string) {
  return typeof value === 'number' ? value.toLocaleString() : fallback
}

$: availableUnitsText = formatRegistryCount(
  product.stockRegistry?.unitsAvailable,
  'N/A',
)
$: unitsSoldText = formatRegistryCount(product.stockRegistry?.unitsSold, 'No Data')
$: displaySpecs = product.specifications.filter(
  spec => !spec.label.toLowerCase().includes('warning'),
)
</script>

<aside class="featured-product-sheet">
  <div class="featured-product-sheet__status">
    <span class={`featured-product-badge ${currentTone.badge}`}>
      {currentTone.label}
    </span>
    {#if product.brand}
      <span class="featured-product-brand">{product.brand}</span>
    {/if}
  </div>

  {#if product.tagline}
    <p class="featured-product-tagline">"{product.tagline}"</p>
  {/if}

  <div class="featured-product-price-row">
    <div>
      <p
        class:featured-product-price--drifting={priceDriftActive}
        class:featured-product-price--glitching={priceGlitching}
        class="featured-product-price"
      >
        {displayedPriceText}
      </p>
      <p class="featured-product-message">{currentTone.message}</p>
      {#if priceDriftActive}
        <p class="featured-product-drift-note">
          Live market drift active. Price calibrates against regional unease.
        </p>
      {/if}
      <p class="featured-product-financing">{financingLine}</p>
      <div class="featured-product-cta-row">
        <button
          type="button"
          class:featured-product-primary--refusing={refusalAnimating}
          class="featured-product-primary"
          onclick={handlePrimaryAction}
        >
          {primaryButtonLabel}
        </button>
      </div>
      {#if ctaFeedback}
        <p class={`featured-product-cta-feedback featured-product-cta-feedback--${ctaFeedback.tone}`}>
          {ctaFeedback.text}
        </p>
      {/if}
    </div>

    {#if typeof product.rating === 'number'}
      <div
        class="featured-product-rating"
        aria-label={`Rated ${product.rating} out of 5`}
      >
        <div class="featured-product-rating__stars">
          {#each renderStars(product.rating) as filled}
            <span class:filled>★</span>
          {/each}
        </div>
        <span>{product.rating.toFixed(1)}</span>
      </div>
    {/if}
  </div>

  {#if product.description}
    <p class="featured-product-description">{product.description}</p>
  {/if}

  <div class="featured-product-meta">
    {#each displaySpecs.slice(0, 4) as spec}
      <div>
        <span>{spec.label}</span>
        <strong>{spec.value}</strong>
      </div>
    {/each}
  </div>

  <div class="featured-product-cta-row">
    {#if product.alternateAction}
      <a href={product.alternateAction.href} class="featured-product-secondary">
        {product.alternateAction.label}
      </a>
    {/if}
    {#if showFullProductLink}
      <a href={product.href} class="featured-product-secondary">Full product page</a>
    {/if}
  </div>
  <div class="featured-product-commerce-note">
    <a href={product.stockRegistry?.adoptionHref ?? product.href}>
      <span>Availability</span>
      <strong>{availableUnitsText}</strong>
    </a>
    <a href={product.stockRegistry?.registryHref ?? product.href}>
      <span>Units sold</span>
      <strong>{unitsSoldText}</strong>
    </a>
  </div>

  <div class="featured-product-panel-actions">
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
    <button
      type="button"
      class:active={activePanel === 'assurance'}
      onclick={() => togglePanel('assurance')}
    >
      Assurance
    </button>
    <button
      type="button"
      class:active={activePanel === 'warnings'}
      onclick={() => togglePanel('warnings')}
    >
      Warnings
    </button>
  </div>
</aside>
