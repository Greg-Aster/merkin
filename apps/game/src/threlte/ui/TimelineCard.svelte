<!--
  TimelineCard.svelte - Restored legacy game-local card interaction path.
-->

<style>
  .timeline-card {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.9);
  }

  :global(.timeline-card .text-75) {
    color: rgba(0, 0, 0, 0.75);
  }

  :global(.timeline-card .text-50) {
    color: rgba(0, 0, 0, 0.5);
  }

  @media (prefers-color-scheme: dark) {
    .timeline-card {
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.9);
    }

    :global(.timeline-card .text-75) {
      color: rgba(255, 255, 255, 0.75);
    }

    :global(.timeline-card .text-50) {
      color: rgba(255, 255, 255, 0.5);
    }
  }

  .timeline-card {
    background: rgba(0, 0, 0, 0.9) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    color: rgba(255, 255, 255, 0.9) !important;
  }

  :global(.timeline-card .text-75) {
    color: rgba(255, 255, 255, 0.75) !important;
  }

  :global(.timeline-card .text-50) {
    color: rgba(255, 255, 255, 0.5) !important;
  }

  .card-pointer {
    width: 8px;
    height: 8px;
    transform: rotate(45deg);
    border: inherit;
  }

  .fixed-position {
    position: relative;
    bottom: auto;
    top: auto;
    left: auto;
    right: auto;
    transform: none !important;
  }

  .mobile-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: auto;
    max-height: 160px;
    width: 280px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }

  .mobile-card .card-title {
    font-size: 0.9rem;
  }

  .mobile-card .card-description {
    flex: 1;
    margin-bottom: 8px;
    font-size: 0.75rem;
  }

  .timeline-card-top {
    bottom: 30px;
    transform: translateX(-50%);
  }

  .timeline-card-top .card-pointer {
    border-bottom-style: solid;
    border-right-style: solid;
    border-top-style: none;
    border-left-style: none;
    bottom: -4px;
    left: 50%;
    margin-left: -4px;
  }

  .timeline-card-bottom {
    top: 30px;
    transform: translateX(-50%);
  }

  .timeline-card-bottom .card-pointer {
    border-top-style: solid;
    border-left-style: solid;
    border-bottom-style: none;
    border-right-style: none;
    top: -4px;
    left: 50%;
    margin-left: -4px;
  }

  .timeline-card-left {
    right: 30px;
    transform: translateY(-50%);
  }

  .timeline-card-left .card-pointer {
    border-right-style: solid;
    border-top-style: solid;
    border-bottom-style: none;
    border-left-style: none;
    right: -4px;
    top: 50%;
    margin-top: -4px;
  }

  .timeline-card-right {
    left: 30px;
    transform: translateY(-50%);
  }

  .timeline-card-right .card-pointer {
    border-left-style: solid;
    border-bottom-style: solid;
    border-top-style: none;
    border-right-style: none;
    left: -4px;
    top: 50%;
    margin-top: -4px;
  }

  .timeline-link {
    text-transform: capitalize;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .timeline-link:hover {
    background-color: var(--primary) !important;
    color: white !important;
    text-decoration: none;
  }

  :global(.timeline-card:hover .timeline-link) {
    background-color: var(--primary) !important;
    color: white !important;
  }

</style>

<script lang="ts">
import { createEventDispatcher } from 'svelte'
export let event: any
export let isSelected = false
export let compact = false
export let position: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
export let isMobile = false
export let isVisible = true

const dispatch = createEventDispatcher()

const BLOG_ORIGIN =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
    ? window.location.origin
    : 'https://megameal.org'

function getCanonicalPostUrl(slug: string): string {
  return `${BLOG_ORIGIN}/posts/${slug}/#post-container`
}

const cardId = `timeline-card-${event?.slug || event?.uniqueId || 'unknown'}-${Math.random().toString(36).substring(2, 9)}`

let cardElement: HTMLElement

function getPositioningStyles() {
  if (event?.screenPosition && !isMobile) {
    const x = Math.max(10, Math.min(window.innerWidth - 220, event.screenPosition.x + 20))
    const y = Math.max(10, Math.min(window.innerHeight - 150, event.screenPosition.y - 50))
    return `left: ${x}px; top: ${y}px;`
  }
  
  if (isMobile) {
    return 'bottom: 220px; left: 50%; transform: translateX(-50%);'
  }
  
  return 'bottom: 20px; left: 50%; transform: translateX(-50%);'
}

function triggerAnimation() {
  if (cardElement && isVisible) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (cardElement && cardElement.style) {
          cardElement.style.opacity = '1'
          cardElement.style.transform = 'translate(0px, 0px)'
        }
      }, 20)
    })
  }
}

$: if (cardElement && isVisible) {
  triggerAnimation()
}

function handleViewEvent(clickEvent: Event) {
  clickEvent.stopPropagation()
  clickEvent.preventDefault()
  dispatch('levelTransition', { levelType: event?.levelId })
}
</script>

{#if isVisible && event}
  <div
    bind:this={cardElement}
    id={cardId}
    class="timeline-card card-base bg-[var(--card-bg)] backdrop-blur-sm shadow-lg"
    class:selected-card={isSelected}
    class:fixed-position={isMobile}
    class:mobile-card={isMobile}
    class:w-[280px]={isMobile}
    class:h-auto={isMobile}
    class:absolute={!isMobile}
    class:z-30={!isMobile}
    class:w-[200px]={!isMobile}
    class:p-2={compact}
    class:text-sm={compact}
    class:p-3={!compact}
    class:timeline-card-top={!isMobile && position === 'top'}
    class:timeline-card-bottom={!isMobile && position === 'bottom'}
    class:timeline-card-left={!isMobile && position === 'left'}
    class:timeline-card-right={!isMobile && position === 'right'}
    style="opacity: 1; transform: translate(0px, 0px); position: fixed; pointer-events: auto; z-index: 2147483647; {getPositioningStyles()}"
  >
    <div class="font-bold text-75 text-sm mb-1 card-title">
      {event.title || 'Unknown Event'}
    </div>

    {#if (!compact || isMobile)}
      <div class="text-50 text-xs card-description" class:line-clamp-3={isMobile} class:line-clamp-2={!isMobile}>
        {event.description || 'No description available'}
      </div>
    {/if}

    {#if event.isLevel || event.levelId}
      <button 
        type="button"
        class="timeline-link text-[0.65rem] mt-1 inline-block py-0.5 px-1.5 rounded-full bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors" 
        style="pointer-events: auto !important; position: relative; z-index: 2147483647;"
        on:pointerdown={(e) => {
          e.stopPropagation()
        }}
        on:mousedown={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        on:click={(e) => {
          e.stopPropagation()
          e.preventDefault()
          handleViewEvent(e)
        }}>
        Enter Level &rarr;
      </button>
    {:else if event.slug}
      <a 
        href={getCanonicalPostUrl(event.slug)}
        class="timeline-link text-[0.65rem] mt-1 inline-block py-0.5 px-1.5 rounded-full bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors"
        style="pointer-events: auto !important; position: relative; z-index: 2147483647;"
        on:pointerdown={(e) => {
          e.stopPropagation()
        }}
        on:mousedown={(e) => {
          e.stopPropagation()
        }}
        on:click={(e) => {
          e.stopPropagation()
          e.preventDefault()
          const targetUrl = getCanonicalPostUrl(event.slug)
          setTimeout(() => {
            window.location.href = targetUrl
          }, 10)
        }}
        target="_self"
      >
        View Event &rarr;
      </a>
    {/if}

    {#if !isMobile}
      <div class="card-pointer absolute bg-inherit"></div>
    {/if}
  </div>
{/if}
