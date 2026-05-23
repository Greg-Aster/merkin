<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'
import {
  normalizeYouTubeEmbedUrl,
  youtubeEmbedAllow,
  youtubeEmbedReferrerPolicy,
} from '@merkin/blog-core/utils/youtube-embed'
import { onMount, tick } from 'svelte'
import ProceduralModelViewer from '../ProceduralModelViewer.svelte'
import type { FeaturedProduct, ProductMedia } from './types'

export let product: FeaturedProduct
export let selectedIndex: number
export let selectedMedia: ProductMedia | undefined
export let selectMedia: (index: number) => void
export let thumbnailFor: (media: ProductMedia) => string
export let openZoom: () => void
export let embedOrigin: string | undefined = undefined

let thumbRail: HTMLDivElement | undefined
let thumbRailScrollable = false
let thumbRailAtEnd = false
let thumbRailAxis: 'x' | 'y' = 'y'

$: hasMediaSummary = Boolean(product.description)

function iframeSrc(src: string): string {
  return normalizeYouTubeEmbedUrl(src, {
    controls: true,
    origin: embedOrigin,
  })
}

function modelVariant(productName: string) {
  return productName.toLowerCase().includes('snuggaloid')
    ? 'snuggaloid'
    : 'generic'
}

function updateThumbRailState() {
  if (!thumbRail) return

  const scrollableY = thumbRail.scrollHeight > thumbRail.clientHeight + 2
  const scrollableX = thumbRail.scrollWidth > thumbRail.clientWidth + 2
  thumbRailAxis = scrollableY ? 'y' : 'x'
  thumbRailScrollable = scrollableY || scrollableX

  const scrollOffset =
    thumbRailAxis === 'y' ? thumbRail.scrollTop : thumbRail.scrollLeft
  const maxScroll =
    thumbRailAxis === 'y'
      ? thumbRail.scrollHeight - thumbRail.clientHeight
      : thumbRail.scrollWidth - thumbRail.clientWidth
  thumbRailAtEnd = maxScroll > 0 && scrollOffset >= maxScroll - 4
}

function handleMediaSelect(index: number) {
  selectMedia(index)
  tick().then(updateThumbRailState)
}

function scrollThumbRail() {
  if (!thumbRail) return

  if (thumbRailAtEnd) {
    thumbRail.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  } else if (thumbRailAxis === 'y') {
    thumbRail.scrollBy({
      top: Math.max(thumbRail.clientHeight * 0.78, 120),
      behavior: 'smooth',
    })
  } else {
    thumbRail.scrollBy({
      left: Math.max(thumbRail.clientWidth * 0.78, 120),
      behavior: 'smooth',
    })
  }

  window.setTimeout(updateThumbRailState, 320)
}

onMount(() => {
  updateThumbRailState()

  const resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(updateThumbRailState)

  if (thumbRail) resizeObserver?.observe(thumbRail)
  window.addEventListener('resize', updateThumbRailState)

  return () => {
    resizeObserver?.disconnect()
    window.removeEventListener('resize', updateThumbRailState)
  }
})

$: product.media, tick().then(updateThumbRailState)
</script>

<div class="featured-product-media-layout">
  <div
    class:featured-product-thumbs-shell--scrollable={thumbRailScrollable}
    class="featured-product-thumbs-shell"
  >
    <div
      bind:this={thumbRail}
      class="featured-product-thumbs"
      onscroll={updateThumbRailState}
    >
      {#each product.media as media, index}
        <button
          class:selected={index === selectedIndex}
          type="button"
          aria-label={`View ${media.type} asset ${index + 1}`}
          onclick={() => handleMediaSelect(index)}
        >
          <img src={thumbnailFor(media)} alt={media.alt || product.name} />
          <span>{media.type === 'iframe' ? 'video' : media.type}</span>
        </button>
      {/each}
    </div>

    {#if thumbRailScrollable}
      <button
        class:featured-product-thumbs-scroll--reverse={thumbRailAtEnd}
        class:featured-product-thumbs-scroll--horizontal={thumbRailAxis === 'x'}
        class="featured-product-thumbs-scroll"
        type="button"
        aria-label={thumbRailAtEnd
          ? 'Return to the first media thumbnail'
          : 'Scroll to more media thumbnails'}
        title={thumbRailAtEnd ? 'Back to first media' : 'More media'}
        onclick={scrollThumbRail}
      >
        <Icon
          icon={thumbRailAxis === 'x'
            ? 'material-symbols:keyboard-arrow-right-rounded'
            : 'material-symbols:keyboard-arrow-down-rounded'}
          aria-hidden="true"
        />
      </button>
    {/if}
  </div>

  <div class="featured-product-media-main">
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
            src={iframeSrc(selectedMedia.src)}
            title={selectedMedia.alt || product.name}
            allow={youtubeEmbedAllow}
            allowfullscreen
            loading="lazy"
            referrerpolicy={youtubeEmbedReferrerPolicy}
          ></iframe>
        {:else if selectedMedia?.type === 'model3d'}
          <div class="featured-product-viewer__model">
            <ProceduralModelViewer
              label={selectedMedia.alt || 'Interactive 3D product preview'}
              variant={modelVariant(product.name)}
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

    {#if hasMediaSummary}
      <div class="featured-product-media-summary">
        <div class="featured-product-media-summary__header">
          <div>
            <p class="featured-product-media-summary__kicker">Catalog Notes</p>
            <h3>{product.name}</h3>
          </div>
          {#if product.sku}
            <span>{product.sku}</span>
          {/if}
        </div>

        {#if product.description}
          <p class="featured-product-description">{product.description}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>
