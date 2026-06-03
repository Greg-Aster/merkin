<script lang="ts">
import type {
  AvailabilityTone,
  CtaFeedback,
  FeaturedProduct,
  ProductActionLink,
} from './types'

export let product: FeaturedProduct
export let currentTone: AvailabilityTone
export let displayedPriceText: string
export let priceDriftActive: boolean
export let priceGlitching: boolean
export let financingLine: string
export let refusalAnimating: boolean
export let primaryButtonLabel: string
export let ctaFeedback: CtaFeedback | null
export let showFullProductLink: boolean
export let renderStars: (rating?: number) => boolean[]
export let handlePrimaryAction: () => void

const preferredFactLabels = new Set([
  'material',
  'dimensions',
  'weight',
  'origin',
  'construction',
  'interior',
])

function formatRegistryCount(value: number | null | undefined, fallback: string) {
  return typeof value === 'number' ? value.toLocaleString() : fallback
}

function factLabelKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

$: availableUnitsText = formatRegistryCount(
  product.stockRegistry?.unitsAvailable,
  'N/A',
)
$: unitsSoldText = formatRegistryCount(product.stockRegistry?.unitsSold, 'No Data')
$: displaySpecs = product.specifications.filter(
  spec => !spec.label.toLowerCase().includes('warning'),
)
$: preferredFacts = displaySpecs.filter(spec =>
  preferredFactLabels.has(factLabelKey(spec.label)),
)
$: productFacts = (preferredFacts.length > 0 ? preferredFacts : displaySpecs).slice(
  0,
  6,
)
$: productActions = [
  product.alternateAction,
  ...(product.alternateActions ?? []),
].filter((action): action is ProductActionLink => Boolean(action))
$: primaryProductActions = productActions.filter(
  action => (action.row ?? 'primary') === 'primary',
)
$: secondaryProductActions = productActions.filter(
  action => action.row === 'secondary',
)
$: showPrimaryAction = product.featuredCommerce?.showPrimaryAction ?? true
$: showStockRegistrySummary =
  product.featuredCommerce?.showStockRegistrySummary ?? true
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
      {#if showPrimaryAction}
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

  {#if primaryProductActions.length > 0}
    <div class="featured-product-cta-row">
      {#each primaryProductActions as action}
        <a
          href={action.href}
          class:featured-product-secondary--mutation={action.variant === 'mutation'}
          class="featured-product-secondary"
        >
          {action.label}
        </a>
      {/each}
    </div>
  {/if}

  {#if secondaryProductActions.length > 0 || showFullProductLink}
    <div class="featured-product-cta-row">
      {#each secondaryProductActions as action}
        <a
          href={action.href}
          class:featured-product-secondary--mutation={action.variant === 'mutation'}
          class="featured-product-secondary"
        >
          {action.label}
        </a>
      {/each}
      {#if showFullProductLink}
        <a href={product.href} class="featured-product-secondary">Full product page</a>
      {/if}
    </div>
  {/if}
  {#if showStockRegistrySummary}
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
  {/if}

  {#if productFacts.length > 0}
    <section class="featured-product-facts" aria-label="Product facts">
      <p class="featured-product-facts__kicker">Product Facts</p>
      <div class="featured-product-meta featured-product-meta--facts">
        {#each productFacts as spec}
          <div>
            <span>{spec.label}</span>
            <strong>{spec.value}</strong>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</aside>
