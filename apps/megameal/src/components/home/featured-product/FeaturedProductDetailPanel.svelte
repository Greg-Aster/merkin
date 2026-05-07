<script lang="ts">
import type { FeaturedProduct, FeaturedProductPanel } from './types'

export let product: FeaturedProduct
export let activePanel: FeaturedProductPanel
export let previewTitle: string | null
export let trustSignals: string[]
export let renderStars: (rating?: number) => boolean[]
export let closePanel: () => void

$: warningSpecs = product.specifications.filter(spec =>
  ['age', 'care', 'warning', 'safety'].some(keyword =>
    spec.label.toLowerCase().includes(keyword),
  ),
)
$: displaySpecs = product.specifications.filter(
  spec => !spec.label.toLowerCase().includes('warning'),
)

type WarningKind = 'prohibition' | 'hazard' | 'caution' | 'notice'

function warningKind(label: string): WarningKind {
  const l = label.toLowerCase()
  if (l.includes('bleed') || l.includes('hazard') || l.includes('biohazard')) return 'hazard'
  if (l.includes('children') || l.includes('pets') || l.includes('age')) return 'caution'
  if (l.includes('feeding') || l.includes('handling') || l.includes('misuse') || l.includes('warning')) return 'prohibition'
  return 'notice'
}

function warningHeader(kind: WarningKind): string {
  if (kind === 'hazard') return 'Hazard'
  if (kind === 'caution') return 'Caution'
  if (kind === 'prohibition') return 'Warning'
  return 'Notice'
}
</script>

<div class="featured-product-panel">
  <div class="featured-product-panel__header">
    <div>
      <p class="featured-product-panel__kicker">Expanded Product Detail</p>
      <h2>{previewTitle}</h2>
    </div>
    <button type="button" onclick={closePanel}>Close</button>
  </div>

  {#if activePanel === 'specifications'}
    <div class="featured-product-spec-grid">
      {#each displaySpecs as spec}
        <div>
          <span>{spec.label}</span>
          <strong>{spec.value}</strong>
        </div>
      {/each}
    </div>
  {:else if activePanel === 'ingredients'}
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
  {:else if activePanel === 'qanda'}
    <div class="featured-product-qanda">
      {#each product.qanda as item}
        <article>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
          {#if item.linkHref && item.linkLabel}
            <a
              class:featured-product-inline-link--creepy={item.linkAccent === 'creepy'}
              class="featured-product-inline-link"
              href={item.linkHref}
            >
              {item.linkLabel}
            </a>
          {/if}
        </article>
      {/each}
    </div>
  {:else if activePanel === 'reviews'}
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
            <span>{review.date || 'Filed recently'}</span>
          </div>
          {#if typeof review.rating === 'number'}
            <div class="featured-product-review__stars" aria-hidden="true">
              {#each renderStars(review.rating) as filled}
                <span class:filled>★</span>
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
  {:else if activePanel === 'assurance'}
    <div class="featured-product-assurance">
      {#each trustSignals as signal}
        <article>
          <strong>Assurance</strong>
          <p>{signal}</p>
        </article>
      {/each}
    </div>
  {:else if activePanel === 'warnings'}
    <div class="featured-product-assurance featured-product-warnings">
      {#if warningSpecs.length > 0}
        {#each warningSpecs as spec}
          {@const kind = warningKind(spec.label)}
          <article class="featured-product-warning featured-product-warning--{kind}">
            <div class="featured-product-warning__marker" aria-hidden="true">
              <div class="featured-product-warning__icon">
                {#if kind === 'prohibition'}
                  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="5"/><line x1="10" y1="10" x2="38" y2="38" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>
                {:else if kind === 'hazard'}
                  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 4 L46 42 L2 42 Z" fill="currentColor" stroke="#000" stroke-width="2" stroke-linejoin="round"/><path d="M24 18 L24 30" stroke="#000" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="36" r="2.4" fill="#000"/></svg>
                {:else if kind === 'caution'}
                  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 4 L46 42 L2 42 Z" fill="currentColor" stroke="#000" stroke-width="2" stroke-linejoin="round"/><path d="M24 18 L24 30" stroke="#000" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="36" r="2.4" fill="#000"/></svg>
                {:else}
                  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="currentColor"/><path d="M24 14 L24 18 M24 22 L24 34" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>
                {/if}
              </div>
              <span class="featured-product-warning__kicker">{warningHeader(kind)}</span>
            </div>
            <div class="featured-product-warning__body">
              <strong>{spec.label}</strong>
              <p>{spec.value}</p>
            </div>
          </article>
        {/each}
      {:else}
        <article>
          <strong>Product Warning</strong>
          <p>
            Review the product description, availability status, and fulfillment
            notes before treating this listing as active commerce.
          </p>
        </article>
      {/if}
    </div>
  {/if}
</div>
