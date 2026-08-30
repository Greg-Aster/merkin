<!-- LayoutToggle.svelte - Cleaned and simplified -->
<script lang="ts">
import { onMount } from 'svelte'
import '../../styles/features/layout-toggle.css'

// Appearance configuration
export let position:
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left' = 'top-right'
export let variant: 'full' | 'minimal' = 'full' // Controls appearance
export let showLabels = true // Only applies to 'full' variant
export let size: 'sm' | 'md' | 'lg' = 'md' // Only applies to 'minimal' variant

let isOneColumn = false
let isTransitioning = false
let isReady = false
let isFullscreenMode = false

interface LayoutStateDetail {
  isOneColumn: boolean
  isTransitioning: boolean
  isFullscreen: boolean
}

onMount(() => {
  const handleLayoutState = (event: Event) => {
    const detail = (event as CustomEvent<LayoutStateDetail>).detail
    if (!detail) return
    isOneColumn = detail.isOneColumn
    isTransitioning = detail.isTransitioning
    isFullscreenMode = detail.isFullscreen
    isReady = true
  }

  document.addEventListener('blog-core:layout-state', handleLayoutState)
  document.dispatchEvent(new CustomEvent('blog-core:layout-state-request'))

  return () => {
    document.removeEventListener('blog-core:layout-state', handleLayoutState)
  }
})

function toggleLayout() {
  // Prevent toggle when in fullscreen mode or transitioning
  if (isTransitioning || isFullscreenMode) return

  isTransitioning = true
  document.dispatchEvent(new CustomEvent('blog-core:layout-toggle-request'))
}

// Position classes
$: positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
}[position]

// Size classes for minimal variant
$: sizeClasses = {
  sm: 'w-8 h-8 p-1.5',
  md: 'w-10 h-10 p-2',
  lg: 'w-12 h-12 p-2.5',
}[size]

$: iconSize = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}[size]

// Hide toggle when in fullscreen mode
$: shouldHideToggle = isFullscreenMode
</script>

<!-- Only show toggle when not in fullscreen mode -->
{#if !shouldHideToggle}
  {#if variant === 'minimal'}
    <!-- MINIMAL VARIANT -->
    <button
      on:click={toggleLayout}
      disabled={isTransitioning || isFullscreenMode || !isReady}
      class="layout-toggle-button fixed {positionClasses} z-50 {sizeClasses} bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 group"
      aria-label={isOneColumn ? 'Switch to two column layout' : 'Switch to single column layout'}
      title={isOneColumn ? 'Show sidebar' : 'Hide sidebar'}
    >
      {#if isTransitioning}
        <!-- Loading spinner -->
        <svg class="{iconSize} animate-spin text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      {:else if isOneColumn}
        <!-- Single column icon -->
        <svg class="{iconSize} text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="12" height="16" rx="2" stroke-width="2"/>
        </svg>
      {:else}
        <!-- Two column icon -->
        <svg class="{iconSize} text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="7" height="16" rx="1" stroke-width="2"/>
          <rect x="14" y="4" width="7" height="16" rx="1" stroke-width="2"/>
        </svg>
      {/if}
    </button>
  {:else}
    <!-- FULL VARIANT -->
    <div class="fixed {positionClasses} z-50 flex flex-col items-end gap-2">
      <button
        on:click={toggleLayout}
        disabled={isTransitioning || isFullscreenMode || !isReady}
        class="layout-toggle-button group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={isOneColumn ? 'Switch to two column layout' : 'Switch to single column layout'}
        title={isOneColumn ? 'Show sidebar' : 'Hide sidebar'}
      >
        <!-- Icon container -->
        <div class="flex items-center gap-2">
          <!-- Column icon -->
          <div class="relative w-5 h-5 flex items-center justify-center">
            {#if isOneColumn}
              <!-- Single column icon -->
              <svg class="w-4 h-4 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            {:else}
              <!-- Two column icon -->
              <svg class="w-4 h-4 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="7" height="16" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
                <rect x="14" y="4" width="7" height="16" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            {/if}
          </div>
          
          <!-- Labels (optional) -->
          {#if showLabels}
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isOneColumn ? 'Show Sidebar' : 'Hide Sidebar'}
            </span>
          {/if}
        </div>
        
        <!-- Loading indicator -->
        {#if isTransitioning}
          <div class="absolute inset-0 bg-white/50 dark:bg-gray-800/50 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 animate-spin text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        {/if}
      </button>
      
      <!-- Status indicator -->
      {#if isReady}
        <!-- Keyboard shortcut hint -->
        <div class="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          Click to toggle layout
        </div>
      {:else}
        <!-- Connection status -->
        <div class="text-xs text-blue-500 dark:text-blue-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded">
          Connecting to layout system...
        </div>
      {/if}
    </div>
  {/if}
{/if}
