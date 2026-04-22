<script lang="ts">
import { onMount } from 'svelte'
import { cart } from '../../stores/cartStore'
import type { Quirk } from '../../types/store-scene'
import {
  getAddToCartRefusalQuirk,
  getPriceDriftQuirk,
} from '../../utils/product-banner-quirks'
import ProceduralModelViewer from './ProceduralModelViewer.svelte'

type ProductMedia = {
  id: string
  type: 'image' | 'video' | 'iframe' | 'model3d'
  src: string
  alt?: string
  caption?: string
  poster?: string
  thumbnail?: string
}

type ProductSpec = {
  label: string
  value: string
}

type ProductQuestion = {
  question: string
  answer: string
  linkLabel?: string
  linkHref?: string
  linkAccent?: 'signal' | 'creepy'
}

type ProductReview = {
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

type RelatedProduct = {
  name: string
  href: string
  image?: string
  price?: number
  availability?: string
}

type ProductActionLink = {
  label: string
  href: string
}

export let product: {
  name: string
  tagline?: string
  description?: string
  brand?: string
  price?: number
  availability?: string
  alternateAction?: ProductActionLink
  rating?: number
  sku?: string
  href: string
  media: ProductMedia[]
  specifications: ProductSpec[]
  ingredients?: string[]
  nutritionFacts?: ProductSpec[]
  qanda: ProductQuestion[]
  reviews: ProductReview[]
  quirks?: Quirk[]
}
// biome-ignore lint/style/useConst: Svelte component props must use `let`.
export let showBannerControls = true
// biome-ignore lint/style/useConst: Svelte component props must use `let`.
export let kickerLabel = 'Featured Product'

// biome-ignore lint/style/useConst: Svelte component props must use `let`.
export let relatedProducts: RelatedProduct[] = []

let selectedIndex = 0
let activePanel:
  | 'specifications'
  | 'ingredients'
  | 'qanda'
  | 'reviews'
  | 'assurance'
  | null = null
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

const observedUnits = 1044
const activeWatchers = 2195
const offerCode = 'ASCEND20'
const financingLine = 'Orbit-approved financing from $45 / cycle'
const trustSignals = [
  'Free interzone dispatch on qualified terrors.',
  'Temporal returns accepted within 30 standard days.',
  'Verified companion warranty included.',
]

const availabilityTone: Record<
  string,
  { label: string; badge: string; message: string; action: string }
> = {
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

const currentTone =
  availabilityTone[product.availability || 'coming_soon'] ||
  availabilityTone.coming_soon
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
            : null
$: priceDriftQuirk = getPriceDriftQuirk(product.quirks, product.price)
$: addToCartRefusalQuirk = getAddToCartRefusalQuirk(product.quirks)
$: primaryButtonLabel = addToCartRefusalQuirk
  ? 'Add to cart'
  : addableAvailability.has(product.availability || '')
    ? 'Add to cart'
    : currentTone.action
$: hasIngredientsPanel =
  (product.ingredients?.length ?? 0) > 0 ||
  (product.nutritionFacts?.length ?? 0) > 0

function selectMedia(index: number) {
  selectedIndex = index
}

function togglePanel(
  panel: 'specifications' | 'ingredients' | 'qanda' | 'reviews' | 'assurance',
) {
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
  if (media.type === 'iframe' && media.src.includes('youtube.com/embed/')) {
    const videoId = media.src.split('/embed/')[1]?.split('?')[0]
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
	<div class="featured-product-utilitybar">
		<div class="featured-product-utilitybar__deal">
			<span class="featured-product-utilitybar__badge">Sponsored</span>
			<strong>20% off with code: {offerCode}</strong>
			<span>Offer valid until regional collapse.</span>
		</div>
		<div class="featured-product-utilitybar__meta">
			<span>{observedUnits.toLocaleString()} units observed today</span>
			<span>{activeWatchers.toLocaleString()} watchers in adjacent timelines</span>
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
					<strong>{bannerPaused ? "Paused" : "Auto-rotation active"}</strong>
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
					<button type="button" onclick={() => sendBannerControl("previous")}>
						Prev
					</button>
					<button type="button" onclick={() => sendBannerControl("toggle-pause")}>
						{bannerPaused ? "Play" : "Pause"}
					</button>
					<button type="button" onclick={() => sendBannerControl("next")}>Next</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="featured-product-stage">
		<div class="featured-product-thumbs">
			{#each product.media as media, index}
				<button
					class:selected={index === selectedIndex}
					type="button"
					aria-label={`View ${media.type} asset ${index + 1}`}
					onclick={() => selectMedia(index)}
				>
					<img src={thumbnailFor(media)} alt={media.alt || product.name} />
					<span>{media.type === "iframe" ? "video" : media.type}</span>
				</button>
			{/each}
		</div>

		<div class="featured-product-viewer">
			<div class="featured-product-viewer__frame">
				{#if selectedMedia?.type === "image"}
					<button
						type="button"
						class="featured-product-viewer__zoom"
						onclick={openZoom}
						aria-label="Inspect image in larger view"
					>
						<img src={selectedMedia.src} alt={selectedMedia.alt || product.name} />
						<span>Inspect</span>
					</button>
				{:else if selectedMedia?.type === "video"}
					<video
						src={selectedMedia.src}
						poster={selectedMedia.poster}
						controls
						playsinline
						preload="metadata"
					>
						<track kind="captions" />
					</video>
				{:else if selectedMedia?.type === "iframe"}
					<iframe
						src={selectedMedia.src}
						title={selectedMedia.alt || product.name}
						allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
						allowfullscreen
						loading="lazy"
					></iframe>
				{:else if selectedMedia?.type === "model3d"}
					<div class="featured-product-viewer__model">
						<ProceduralModelViewer
							label={selectedMedia.alt || "Interactive 3D product preview"}
							variant="snuggaloid"
							assetUrl={selectedMedia.src}
						/>
						<button
							type="button"
							class="featured-product-viewer__inspect-button"
							onclick={openZoom}
							aria-label="Open expanded 3D preview"
						>
							Expand
						</button>
					</div>
				{/if}
			</div>

			{#if selectedMedia?.caption}
				<p class="featured-product-caption">{selectedMedia.caption}</p>
			{/if}
		</div>

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
						class:featured-product-price--drifting={Boolean(priceDriftQuirk)}
						class:featured-product-price--glitching={priceGlitching}
						class="featured-product-price"
					>
						{displayedPriceText}
					</p>
					<p class="featured-product-message">{currentTone.message}</p>
					{#if priceDriftQuirk}
						<p class="featured-product-drift-note">
							Live market drift active. Price calibrates against regional unease.
						</p>
					{/if}
					<p class="featured-product-financing">{financingLine}</p>
				</div>

				{#if typeof product.rating === "number"}
					<div
						class="featured-product-rating"
						aria-label={`Rated ${product.rating} out of 5`}
					>
						<div class="featured-product-rating__stars">
							{#each renderStars(product.rating) as filled}
								<span class:filled={filled}>★</span>
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
				{#each product.specifications.slice(0, 4) as spec}
					<div>
						<span>{spec.label}</span>
						<strong>{spec.value}</strong>
					</div>
				{/each}
			</div>

			<div class="featured-product-cta-row">
				<button
					type="button"
					class:featured-product-primary--refusing={refusalAnimating}
					class="featured-product-primary"
					onclick={handlePrimaryAction}
				>
					{primaryButtonLabel}
				</button>
				{#if product.alternateAction}
					<a href={product.alternateAction.href} class="featured-product-secondary">
						{product.alternateAction.label}
					</a>
				{/if}
				<a href={product.href} class="featured-product-secondary">Full product page</a>
			</div>
			{#if ctaFeedback}
				<p class={`featured-product-cta-feedback featured-product-cta-feedback--${ctaFeedback.tone}`}>
					{ctaFeedback.text}
				</p>
			{/if}

			<div class="featured-product-commerce-note">
				<div>
					<strong>{observedUnits.toLocaleString()} sold</strong>
					<span>Trending across approved sectors.</span>
				</div>
				<div>
					<strong>{activeWatchers.toLocaleString()} watching</strong>
					<span>This listing is actively monitored.</span>
				</div>
			</div>

			<div class="featured-product-panel-actions">
				<button
					type="button"
					class:active={activePanel === "specifications"}
					onclick={() => togglePanel("specifications")}
				>
					Specifications
				</button>
				{#if hasIngredientsPanel}
					<button
						type="button"
						class:active={activePanel === "ingredients"}
						onclick={() => togglePanel("ingredients")}
					>
						Ingredients
					</button>
				{/if}
				<button
					type="button"
					class:active={activePanel === "qanda"}
					onclick={() => togglePanel("qanda")}
				>
					Q&A
				</button>
				<button
					type="button"
					class:active={activePanel === "reviews"}
					onclick={() => togglePanel("reviews")}
				>
					Reviews
				</button>
				<button
					type="button"
					class:active={activePanel === "assurance"}
					onclick={() => togglePanel("assurance")}
				>
					Assurance
				</button>
			</div>
		</aside>
	</div>

	{#if activePanel}
		<div class="featured-product-panel">
			<div class="featured-product-panel__header">
				<div>
					<p class="featured-product-panel__kicker">Expanded Product Detail</p>
					<h2>{previewTitle}</h2>
				</div>
				<button type="button" onclick={() => (activePanel = null)}>Close</button>
			</div>

			{#if activePanel === "specifications"}
				<div class="featured-product-spec-grid">
					{#each product.specifications as spec}
						<div>
							<span>{spec.label}</span>
							<strong>{spec.value}</strong>
						</div>
					{/each}
				</div>
			{:else if activePanel === "ingredients"}
				<div class="featured-product-ingredients">
					{#if product.ingredients && product.ingredients.length > 0}
						<article>
							<h3>Ingredient Disclosure</h3>
							<ul>
								{#each product.ingredients as ingredient}
									<li>{ingredient}</li>
								{/each}
							</ul>
						</article>
					{/if}
					{#if product.nutritionFacts && product.nutritionFacts.length > 0}
						<article>
							<h3>Nutrition Data</h3>
							<div class="featured-product-spec-grid">
								{#each product.nutritionFacts as fact}
									<div>
										<span>{fact.label}</span>
										<strong>{fact.value}</strong>
									</div>
								{/each}
							</div>
						</article>
					{/if}
				</div>
			{:else if activePanel === "qanda"}
				<div class="featured-product-qanda">
					{#each product.qanda as item}
						<article>
							<h3>{item.question}</h3>
							<p>{item.answer}</p>
							{#if item.linkHref && item.linkLabel}
								<a
									class:featured-product-inline-link--creepy={item.linkAccent === "creepy"}
									class="featured-product-inline-link"
									href={item.linkHref}
								>
									{item.linkLabel}
								</a>
							{/if}
						</article>
					{/each}
				</div>
			{:else if activePanel === "reviews"}
				<div class="featured-product-reviews">
					{#each product.reviews as review}
						<article>
							<div class="featured-product-review__header">
								<div class="featured-product-review__identity">
									{#if review.authorHref}
										<a href={review.authorHref}>{review.author}</a>
									{:else}
										<strong>{review.author}</strong>
									{/if}
									{#if review.verified}
										<span class="featured-product-review__verified">
											Verified consumer
										</span>
									{/if}
								</div>
								<span>{review.date || "Filed recently"}</span>
							</div>
							{#if typeof review.rating === "number"}
								<div class="featured-product-review__stars" aria-hidden="true">
									{#each renderStars(review.rating) as filled}
										<span class:filled={filled}>★</span>
									{/each}
								</div>
							{/if}
							<p>{review.comment}</p>
							{#if review.linkHref && review.linkLabel}
								<a
									class="featured-product-inline-link featured-product-inline-link--creepy"
									href={review.linkHref}
								>
									{review.linkLabel}
								</a>
							{/if}
							{#if review.flags && review.flags.length > 0}
								<div class="featured-product-review__flags">
									{#each review.flags as flag}
										<span>{flag}</span>
									{/each}
								</div>
							{/if}
						</article>
					{/each}
				</div>
			{:else if activePanel === "assurance"}
				<div class="featured-product-assurance">
					{#each trustSignals as signal}
						<article>
							<strong>Assurance</strong>
							<p>{signal}</p>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if relatedProducts.length > 0}
		<div class="featured-product-related">
			<div class="featured-product-related__header">
				<div>
					<p class="featured-product-panel__kicker">You Might Also Like</p>
					<h2>Adjacent Products</h2>
				</div>
			</div>

			<div class="featured-product-related__rail" aria-label="Related products">
				{#each relatedProducts as item}
					<a href={item.href} class="featured-product-related__card">
						{#if item.image}
							<img src={item.image} alt={item.name} />
						{/if}
						<div>
							<strong>{item.name}</strong>
							{#if typeof item.price === "number"}
								<span>{formatCurrency(item.price)}</span>
							{/if}
							{#if item.availability}
								<small>{item.availability.replaceAll("_", " ")}</small>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</section>

{#if zoomOpen}
	<div class="featured-product-modal" role="dialog" aria-modal="true">
		<button
			class="featured-product-modal__backdrop"
			type="button"
			aria-label="Close expanded preview"
			onclick={closeZoom}
		></button>
		<div class="featured-product-modal__content">
			<button type="button" class="featured-product-modal__close" onclick={closeZoom}>
				Close
			</button>
			{#if selectedMedia?.type === "image"}
				<img src={selectedMedia.src} alt={selectedMedia.alt || product.name} />
			{:else if selectedMedia?.type === "model3d"}
				<div class="featured-product-modal__model">
					<ProceduralModelViewer
						label={selectedMedia.alt || "Expanded containment render"}
						variant="snuggaloid"
						fullscreen={true}
						assetUrl={selectedMedia.src}
					/>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.featured-product-shell {
		position: relative;
		z-index: 2;
		display: grid;
		gap: 0.9rem;
		width: 100%;
		margin: 0;
		padding: 0.6rem;
		color: rgb(226 232 240);
	}

	.featured-product-utilitybar,
	.featured-product-topbar,
	.featured-product-stage,
	.featured-product-panel,
	.featured-product-related {
		border: 1px solid rgb(148 163 184 / 0.16);
		border-radius: 1.5rem;
		background:
			radial-gradient(circle at 12% 16%, rgb(255 255 255 / 0.06), transparent 28%),
			linear-gradient(180deg, rgb(15 23 42 / 0.88), rgb(2 6 23 / 0.92));
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.06),
			0 24px 70px rgb(2 6 23 / 0.34);
		backdrop-filter: blur(16px) saturate(1.08);
	}

	.featured-product-utilitybar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.8rem 1.15rem;
	}

	.featured-product-utilitybar__deal,
	.featured-product-utilitybar__meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 0.9rem;
		color: rgb(203 213 225 / 0.88);
		font-size: 0.82rem;
	}

	.featured-product-utilitybar__badge {
		padding: 0.35rem 0.58rem;
		border-radius: 999px;
		background: rgb(244 63 94 / 0.18);
		color: rgb(254 205 211);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.featured-product-topbar {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.2rem;
	}

	.featured-product-kicker,
	.featured-product-panel__kicker {
		margin: 0 0 0.35rem;
		color: rgb(125 211 252 / 0.8);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
	}

	.featured-product-topbar h1,
	.featured-product-panel h2,
	.featured-product-related h2 {
		margin: 0;
		font-size: clamp(1.4rem, 2vw, 1.9rem);
		line-height: 1.05;
	}

	.featured-product-sellerline {
		margin: 0.45rem 0 0;
		color: rgb(148 163 184);
		font-size: 0.82rem;
	}

	.featured-product-control-center {
		display: grid;
		gap: 0.6rem;
		min-width: min(100%, 20rem);
	}

	.featured-product-control-center__meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		color: rgb(203 213 225 / 0.88);
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.featured-product-control-center__progress {
		position: relative;
		overflow: hidden;
		height: 0.5rem;
		border: 1px solid rgb(125 211 252 / 0.22);
		border-radius: 999px;
		background: rgb(15 23 42 / 0.8);
	}

	.featured-product-control-center__progress span {
		position: absolute;
		inset: 0;
		transform-origin: left center;
		background: linear-gradient(90deg, rgb(34 197 94), rgb(14 165 233));
	}

	.featured-product-control-center__buttons {
		display: flex;
		flex-wrap: nowrap;
		justify-content: end;
		gap: 0.55rem;
	}

	.featured-product-control-center__buttons button {
		padding: 0.6rem 0.82rem;
		border: 1px solid rgb(125 211 252 / 0.18);
		border-radius: 999px;
		color: rgb(226 232 240);
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		background: rgb(15 23 42 / 0.72);
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease;
	}

	.featured-product-control-center__buttons button:hover {
		border-color: rgb(125 211 252 / 0.55);
		background: rgb(8 47 73 / 0.45);
		transform: translateY(-1px);
	}

	.featured-product-stage {
		display: grid;
		grid-template-columns: 5.8rem minmax(0, 1.35fr) minmax(23rem, 0.92fr);
		gap: 1rem;
		padding: 1rem;
	}

	.featured-product-thumbs {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.featured-product-thumbs button {
		display: grid;
		gap: 0.3rem;
		padding: 0.45rem;
		border: 1px solid rgb(148 163 184 / 0.16);
		border-radius: 1rem;
		background: rgb(15 23 42 / 0.72);
		color: rgb(148 163 184);
		text-transform: uppercase;
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease;
	}

	.featured-product-thumbs button.selected {
		border-color: rgb(125 211 252 / 0.55);
		background: rgb(8 47 73 / 0.72);
		transform: translateX(0.18rem);
		color: rgb(226 232 240);
	}

	.featured-product-thumbs img {
		width: 100%;
		aspect-ratio: 1 / 1;
		object-fit: cover;
		border-radius: 0.75rem;
	}

	.featured-product-viewer {
		display: grid;
		gap: 0.7rem;
	}

	.featured-product-viewer__frame {
		position: relative;
		min-height: 31rem;
		overflow: hidden;
		border: 1px solid rgb(148 163 184 / 0.14);
		border-radius: 1.35rem;
		background:
			radial-gradient(circle at 20% 20%, rgb(255 255 255 / 0.08), transparent 24%),
			linear-gradient(180deg, rgb(15 23 42 / 0.8), rgb(2 6 23 / 0.94));
	}

	.featured-product-viewer__frame :global(video),
	.featured-product-viewer__frame :global(iframe),
	.featured-product-viewer__frame img,
	.featured-product-viewer__model {
		width: 100%;
		height: 100%;
	}

	.featured-product-viewer__zoom,
	.featured-product-viewer__model {
		position: relative;
		padding: 0;
	}

	.featured-product-viewer__zoom span {
		position: absolute;
		right: 0.95rem;
		bottom: 0.95rem;
		padding: 0.5rem 0.7rem;
		border-radius: 999px;
		background: rgb(2 6 23 / 0.75);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.featured-product-viewer__frame img,
	.featured-product-related__card img {
		object-fit: cover;
	}

	.featured-product-viewer__model {
		width: 100%;
		height: 100%;
	}

	.featured-product-viewer__inspect-button {
		position: absolute;
		right: 0.95rem;
		bottom: 0.95rem;
		padding: 0.5rem 0.7rem;
		border: 1px solid rgb(125 211 252 / 0.28);
		border-radius: 999px;
		background: rgb(2 6 23 / 0.75);
		color: rgb(226 232 240);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.featured-product-caption {
		margin: 0;
		color: rgb(148 163 184);
		font-size: 0.82rem;
		line-height: 1.5;
	}

	.featured-product-sheet {
		display: grid;
		align-content: start;
		gap: 1rem;
		padding: 0.25rem 0.1rem 0.1rem;
	}

	.featured-product-sheet__status {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		flex-wrap: wrap;
	}

	.featured-product-badge {
		padding: 0.45rem 0.72rem;
		border-radius: 999px;
		font-size: 0.76rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.featured-product-brand {
		color: rgb(148 163 184);
		font-size: 0.76rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.featured-product-tagline {
		margin: 0;
		color: rgb(244 244 245);
		font-size: 1.14rem;
		font-style: italic;
		line-height: 1.4;
	}

	.featured-product-price-row {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	.featured-product-price {
		margin: 0;
		color: rgb(74 222 128);
		font-size: clamp(1.9rem, 3vw, 2.5rem);
		font-weight: 900;
		letter-spacing: -0.04em;
	}

	.featured-product-price--drifting {
		text-shadow: 0 0 24px rgb(74 222 128 / 0.18);
	}

	.featured-product-price--glitching {
		color: rgb(250 204 21);
		text-shadow:
			0 0 24px rgb(250 204 21 / 0.28),
			-1px 0 rgb(244 114 182 / 0.35),
			1px 0 rgb(56 189 248 / 0.35);
		animation: featured-product-price-flicker 120ms steps(2) infinite;
	}

	.featured-product-message {
		margin: 0.35rem 0 0;
		color: rgb(148 163 184);
		font-size: 0.84rem;
	}

	.featured-product-drift-note {
		margin: 0.28rem 0 0;
		color: rgb(254 240 138);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.featured-product-financing {
		margin: 0.4rem 0 0;
		color: rgb(186 230 253);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.featured-product-rating {
		display: grid;
		gap: 0.35rem;
		justify-items: end;
		color: rgb(226 232 240);
		font-size: 0.82rem;
	}

	.featured-product-rating__stars,
	.featured-product-review__stars {
		display: flex;
		gap: 0.12rem;
		font-size: 0.92rem;
		color: rgb(71 85 105);
	}

	.featured-product-rating__stars .filled,
	.featured-product-review__stars .filled {
		color: rgb(250 204 21);
	}

	.featured-product-description {
		margin: 0;
		color: rgb(226 232 240 / 0.92);
		font-size: 0.95rem;
		line-height: 1.7;
	}

	.featured-product-commerce-note {
		display: grid;
		gap: 0.7rem;
	}

	.featured-product-commerce-note {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.featured-product-commerce-note div,
	.featured-product-meta div,
	.featured-product-spec-grid div {
		display: grid;
		gap: 0.25rem;
		padding: 0.82rem 0.9rem;
		border: 1px solid rgb(148 163 184 / 0.14);
		border-radius: 1rem;
		background: rgb(15 23 42 / 0.56);
	}

	.featured-product-commerce-note strong,
	.featured-product-meta strong,
	.featured-product-spec-grid strong {
		color: rgb(248 250 252);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.featured-product-commerce-note span,
	.featured-product-meta span,
	.featured-product-spec-grid span {
		color: rgb(148 163 184);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.featured-product-meta,
	.featured-product-spec-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
	}

	.featured-product-cta-row,
	.featured-product-panel-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
	}

	.featured-product-primary,
	.featured-product-secondary,
	.featured-product-panel-actions button,
	.featured-product-panel__header button,
	.featured-product-modal__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.82rem 1rem;
		border-radius: 1rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease;
	}

	.featured-product-primary {
		border: 0;
		background: linear-gradient(135deg, rgb(34 197 94), rgb(14 165 233));
		color: rgb(2 6 23);
		cursor: pointer;
	}

	.featured-product-primary--refusing {
		animation: featured-product-refusal-shake 280ms ease-in-out 2;
	}

	.featured-product-primary:hover,
	.featured-product-secondary:hover,
	.featured-product-panel-actions button:hover,
	.featured-product-panel__header button:hover,
	.featured-product-modal__close:hover {
		transform: translateY(-1px);
	}

	.featured-product-secondary,
	.featured-product-panel-actions button,
	.featured-product-panel__header button,
	.featured-product-modal__close {
		border: 1px solid rgb(148 163 184 / 0.18);
		background: rgb(15 23 42 / 0.7);
		color: rgb(226 232 240);
	}

	.featured-product-panel-actions button.active {
		border-color: rgb(125 211 252 / 0.5);
		background: rgb(8 47 73 / 0.72);
	}

	.featured-product-cta-feedback {
		margin: -0.25rem 0 0;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.featured-product-cta-feedback--error {
		color: rgb(252 165 165);
	}

	.featured-product-cta-feedback--success {
		color: rgb(134 239 172);
	}

	.featured-product-panel,
	.featured-product-related {
		padding: 1rem 1.2rem;
	}

	.featured-product-panel__header,
	.featured-product-related__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.featured-product-qanda,
	.featured-product-reviews,
	.featured-product-assurance,
	.featured-product-ingredients {
		display: grid;
		gap: 0.9rem;
	}

	.featured-product-qanda article,
	.featured-product-reviews article,
	.featured-product-assurance article,
	.featured-product-ingredients article {
		padding: 1rem;
		border: 1px solid rgb(148 163 184 / 0.12);
		border-radius: 1rem;
		background: rgb(15 23 42 / 0.54);
	}

	.featured-product-qanda h3,
	.featured-product-ingredients h3,
	.featured-product-review__header strong,
	.featured-product-review__identity a {
		margin: 0;
		font-size: 1rem;
	}

	.featured-product-review__identity {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.featured-product-review__identity a {
		color: rgb(248 250 252);
		text-decoration: none;
	}

	.featured-product-review__identity a:hover {
		color: rgb(196 181 253);
	}

	.featured-product-review__verified {
		padding: 0.22rem 0.52rem;
		border-radius: 999px;
		background: rgb(14 116 144 / 0.24);
		color: rgb(186 230 253);
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.featured-product-qanda p,
	.featured-product-reviews p,
	.featured-product-assurance p,
	.featured-product-ingredients p {
		margin: 0.55rem 0 0;
		color: rgb(203 213 225 / 0.94);
		line-height: 1.7;
	}

	.featured-product-ingredients ul {
		margin: 0.8rem 0 0;
		padding-left: 1.1rem;
		color: rgb(203 213 225 / 0.94);
		display: grid;
		gap: 0.35rem;
	}

	.featured-product-ingredients li::marker {
		color: rgb(148 163 184);
	}

	.featured-product-assurance strong {
		color: rgb(186 230 253);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.featured-product-review__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		color: rgb(148 163 184);
		font-size: 0.8rem;
	}

	.featured-product-review__stars {
		margin-top: 0.45rem;
	}

	.featured-product-inline-link {
		display: inline-flex;
		align-items: center;
		margin-top: 0.75rem;
		color: rgb(125 211 252);
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-decoration: none;
		text-transform: uppercase;
	}

	.featured-product-inline-link:hover {
		color: rgb(186 230 253);
	}

	.featured-product-inline-link--creepy {
		color: rgb(244 114 182);
		text-shadow: 0 0 14px rgb(244 114 182 / 0.35);
	}

	.featured-product-review__flags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.85rem;
	}

	.featured-product-review__flags span {
		padding: 0.24rem 0.5rem;
		border: 1px solid rgb(244 114 182 / 0.18);
		border-radius: 999px;
		background: rgb(76 5 25 / 0.26);
		color: rgb(253 164 175);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	@keyframes featured-product-refusal-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-3px);
		}
		40% {
			transform: translateX(4px);
		}
		60% {
			transform: translateX(-5px);
		}
		80% {
			transform: translateX(3px);
		}
	}

	@keyframes featured-product-price-flicker {
		0%,
		100% {
			opacity: 1;
			transform: translateX(0);
		}
		25% {
			opacity: 0.85;
			transform: translateX(-1px);
		}
		50% {
			opacity: 1;
			transform: translateX(1px);
		}
		75% {
			opacity: 0.72;
			transform: translateX(0);
		}
	}

	.featured-product-related__rail {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(14rem, 18rem);
		gap: 0.85rem;
		overflow-x: auto;
		padding-bottom: 0.35rem;
		scroll-snap-type: x proximity;
	}

	.featured-product-related__card {
		display: grid;
		gap: 0.7rem;
		padding: 0.85rem;
		border: 1px solid rgb(148 163 184 / 0.14);
		border-radius: 1.1rem;
		background: rgb(15 23 42 / 0.56);
		color: rgb(226 232 240);
		text-decoration: none;
		scroll-snap-align: start;
	}

	.featured-product-related__card img {
		width: 100%;
		height: 8rem;
		border-radius: 0.9rem;
	}

	.featured-product-related__card div {
		display: grid;
		gap: 0.22rem;
	}

	.featured-product-related__card span,
	.featured-product-related__card small {
		color: rgb(148 163 184);
	}

	.featured-product-modal {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}

	.featured-product-modal__backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgb(2 6 23 / 0.82);
		cursor: pointer;
	}

	.featured-product-modal__content {
		position: relative;
		z-index: 1;
		width: min(92vw, 78rem);
		max-height: min(88vh, 58rem);
		overflow: hidden;
		border: 1px solid rgb(148 163 184 / 0.18);
		border-radius: 1.5rem;
		background: rgb(2 6 23 / 0.98);
		box-shadow: 0 30px 90px rgb(2 6 23 / 0.56);
	}

	.featured-product-modal__content img,
	.featured-product-modal__model {
		width: 100%;
		height: min(88vh, 58rem);
		object-fit: contain;
		background:
			radial-gradient(circle at 50% 20%, rgb(255 255 255 / 0.06), transparent 26%),
			linear-gradient(180deg, rgb(15 23 42), rgb(2 6 23));
	}

	.featured-product-modal__close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 2;
	}

	@media (max-width: 960px) {
		.featured-product-utilitybar,
			.featured-product-topbar,
			.featured-product-panel__header,
			.featured-product-related__header {
				align-items: start;
				flex-direction: column;
			}

		.featured-product-stage {
			grid-template-columns: 1fr;
		}

		.featured-product-thumbs {
			order: 1;
			flex-direction: row;
			overflow-x: auto;
			padding-bottom: 0.2rem;
		}

		.featured-product-thumbs button {
			min-width: 4.8rem;
		}

		.featured-product-viewer {
			order: 2;
		}

		.featured-product-sheet {
			order: 3;
			padding: 0;
		}
	}

	@media (max-width: 720px) {
		.featured-product-shell {
			padding: 0.35rem;
		}

		.featured-product-viewer__frame {
			min-height: 19rem;
		}

		.featured-product-commerce-note,
		.featured-product-meta,
		.featured-product-spec-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
