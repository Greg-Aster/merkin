<script lang="ts">
import type { RelatedProduct } from './types'

export let relatedProducts: RelatedProduct[] = []
export let formatCurrency: (value?: number) => string
</script>

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
            {#if typeof item.price === 'number'}
              <span>{formatCurrency(item.price)}</span>
            {/if}
            {#if item.availability}
              <small>{item.availability.replaceAll('_', ' ')}</small>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}
