<script lang="ts">
import ProceduralModelViewer from '../ProceduralModelViewer.svelte'
import type { FeaturedProduct, ProductMedia } from './types'

export let product: FeaturedProduct
export let selectedIndex: number
export let selectedMedia: ProductMedia | undefined
export let selectMedia: (index: number) => void
export let thumbnailFor: (media: ProductMedia) => string
export let openZoom: () => void
</script>

<div class="featured-product-thumbs">
  {#each product.media as media, index}
    <button
      class:selected={index === selectedIndex}
      type="button"
      aria-label={`View ${media.type} asset ${index + 1}`}
      onclick={() => selectMedia(index)}
    >
      <img src={thumbnailFor(media)} alt={media.alt || product.name} />
      <span>{media.type === 'iframe' ? 'video' : media.type}</span>
    </button>
  {/each}
</div>

<div class="featured-product-viewer">
  <div class="featured-product-viewer__frame">
    {#if selectedMedia?.type === 'image'}
      <button
        type="button"
        class="featured-product-viewer__zoom"
        onclick={openZoom}
        aria-label="Inspect image in larger view"
      >
        <img src={selectedMedia.src} alt={selectedMedia.alt || product.name} />
        <span>Inspect</span>
      </button>
    {:else if selectedMedia?.type === 'video'}
      <video
        src={selectedMedia.src}
        poster={selectedMedia.poster}
        controls
        playsinline
        preload="metadata"
      >
        <track kind="captions" />
      </video>
    {:else if selectedMedia?.type === 'iframe'}
      <iframe
        src={selectedMedia.src}
        title={selectedMedia.alt || product.name}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      ></iframe>
    {:else if selectedMedia?.type === 'model3d'}
      <div class="featured-product-viewer__model">
        <ProceduralModelViewer
          label={selectedMedia.alt || 'Interactive 3D product preview'}
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
