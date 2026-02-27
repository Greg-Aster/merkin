<!--
  TimelineCard.svelte - Refactored to be DRY and rely on global CSS.
  This version removes the duplicated, hardcoded styles from the previous fix
  and uses the classes and variables from your imported stylesheets as intended.
-->

<style>
  /*
    This component now relies entirely on your globally defined styles.
    The @import statements will pull in main.css and timeline-styles.css.
    All variables (--hue, --card-bg) and classes (.card-base, .text-75)
    are expected to be available from these files.
  */
  @import '../../styles/main.css';
  @import '../../styles/timeline-styles.css';

  /*
    Adaptive card styling for both light and dark modes
    Ensures readability on any background
  */
  .timeline-card {
    /* Strong background with good contrast */
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
  
  /* Force high contrast for the game overlay - always use dark theme for better visibility */
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
</style>

<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte'
export let event: any // Star data from game state
export let isSelected = false
export let compact = false
export let position: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
export let isMobile = false
export let isVisible = true

const dispatch = createEventDispatcher()

// Component mounted successfully

const BLOG_ORIGIN =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
    ? window.location.origin
    : 'https://megameal.org'

function getCanonicalPostUrl(slug: string): string {
  return `${BLOG_ORIGIN}/posts/${slug}/#post-container`
}

// This helper function is defined but not used in the template below.
// The link style is hardcoded in the <a> tag.
function getEraBadgeClass(era?: string): string {
  if (!era)
    return 'bg-[oklch(0.9_0.05_var(--hue))/0.1] dark:bg-[oklch(0.3_0.05_var(--hue))/0.2] text-[oklch(0.4_0.05_var(--hue))] dark:text-[oklch(0.9_0.05_var(--hue))]'
  switch (era) {
    case 'pre-spork':
      return 'bg-[oklch(0.8_0.1_var(--hue))/0.1] dark:bg-[oklch(0.8_0.1_var(--hue))/0.2] text-[oklch(0.3_0.1_var(--hue))] dark:text-[oklch(0.8_0.1_var(--hue))]'
    case 'spork-uprising':
      return 'bg-[oklch(0.7_0.2_var(--hue))/0.1] dark:bg-[oklch(0.7_0.2_var(--hue))/0.2] text-[oklch(0.3_0.2_var(--hue))] dark:text-[oklch(0.7_0.2_var(--hue))]'
    case 'snuggaloid':
      return 'bg-[oklch(0.6_0.3_var(--hue))/0.1] dark:bg-[oklch(0.6_0.3_var(--hue))/0.2] text-[oklch(0.3_0.3_var(--hue))] dark:text-[oklch(0.6_0.3_var(--hue))]'
    case 'post-extinction':
      return 'bg-[oklch(0.5_0.1_var(--hue))/0.1] dark:bg-[oklch(0.5_0.1_var(--hue))/0.2] text-[oklch(0.2_0.1_var(--hue))] dark:text-[oklch(0.5_0.1_var(--hue))]'
    default:
      return 'bg-[oklch(0.9_0.05_var(--hue))/0.1] dark:bg-[oklch(0.3_0.05_var(--hue))/0.2] text-[oklch(0.4_0.05_var(--hue))] dark:text-[oklch(0.9_0.05_var(--hue))]'
  }
}

const cardId = `timeline-card-${event?.slug || event?.uniqueId || 'unknown'}-${Math.random().toString(36).substring(2, 9)}`

// Animation handled by CSS and triggerAnimation function

let cardElement: HTMLElement

// Get positioning styles for the card
function getPositioningStyles() {
  if (event?.screenPosition && !isMobile) {
    // Position card near the star but slightly offset to avoid covering it
    const x = Math.max(10, Math.min(window.innerWidth - 220, event.screenPosition.x + 20))
    const y = Math.max(10, Math.min(window.innerHeight - 150, event.screenPosition.y - 50))
    return `left: ${x}px; top: ${y}px;`
  }
  
  // Mobile-friendly positioning: center at bottom, above mobile controls
  if (isMobile) {
    return 'bottom: 220px; left: 50%; transform: translateX(-50%);'
  }
  
  // Desktop fallback: center at bottom
  return 'bottom: 20px; left: 50%; transform: translateX(-50%);'
}

// Fly-in animation
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
  // This is only called for level transitions now
  clickEvent.preventDefault()
  console.log('🎮 TimelineCard: Button clicked for level:', event?.levelId)
  // Dispatch with the correct levelId, but using the 'levelType' key
  // that the parent component expects from the original implementation.
  dispatch('levelTransition', { levelType: event?.levelId })
  console.log(
    '🎮 TimelineCard: Dispatched levelTransition event with levelType:',
    event?.levelId,
  )
}
</script>

{#if isVisible && event}
  <div
    bind:this={cardElement}
    id={cardId}
    class="timeline-card card-base bg-[var(--card-bg)] backdrop-blur-sm shadow-lg"
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
    style="opacity: 1; transform: translate(0px, 0px); position: fixed; {getPositioningStyles()}"
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
        class="timeline-link text-[0.65rem] mt-1 inline-block py-0.5 px-1.5 rounded-full bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors" 
        style="pointer-events: auto !important; position: relative; z-index: 9999;"
        on:click={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('🎮 Enter Level button clicked for:', event?.levelId);
          handleViewEvent(e);
        }}>
        Enter Level &rarr;
      </button>
    {:else if event.slug}
      <a 
        href={getCanonicalPostUrl(event.slug)}
        class="timeline-link text-[0.65rem] mt-1 inline-block py-0.5 px-1.5 rounded-full bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors"
        style="pointer-events: auto !important; position: relative; z-index: 9999;"
        on:click={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const targetUrl = getCanonicalPostUrl(event.slug);
          console.log('📖 Link clicked! Navigating to:', targetUrl);
          // Force navigation after a small delay to ensure the click is processed
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 10);
        }}
        on:mousedown={(e) => {
          e.stopPropagation();
          console.log('📖 Link mousedown event');
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
