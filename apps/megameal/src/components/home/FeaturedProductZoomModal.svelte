<script lang="ts">
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

export let open = false
export let selectedMedia: ProductMedia | null = null
export let productName = ''
export let onClose: () => void

function modelVariant(name: string) {
  return name.toLowerCase().includes('snuggaloid') ? 'snuggaloid' : 'generic'
}
</script>

{#if open}
  <div class="featured-product-modal" role="dialog" aria-modal="true">
    <button
      class="featured-product-modal__backdrop"
      type="button"
      aria-label="Close expanded preview"
      onclick={onClose}
    ></button>
    <div class="featured-product-modal__content">
      <button type="button" class="featured-product-modal__close" onclick={onClose}>
        Close
      </button>
      {#if selectedMedia?.type === 'image'}
        <img src={selectedMedia.src} alt={selectedMedia.alt || productName} />
      {:else if selectedMedia?.type === 'model3d'}
        <div class="featured-product-modal__model">
          <ProceduralModelViewer
            label={selectedMedia.alt || 'Expanded containment render'}
            variant={modelVariant(productName)}
            fullscreen={true}
            assetUrl={selectedMedia.src}
          />
        </div>
      {/if}
    </div>
  </div>
{/if}
