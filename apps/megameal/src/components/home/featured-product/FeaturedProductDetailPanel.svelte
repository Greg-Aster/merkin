<script lang="ts">
import type { FeaturedProduct, FeaturedProductPanel } from './types'

export let product: FeaturedProduct
export let activePanel: FeaturedProductPanel
export let previewTitle: string | null
export let trustSignals: string[]
export let renderStars: (rating?: number) => boolean[]
export let closePanel: () => void
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
      {#each product.specifications as spec}
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
  {/if}
</div>
