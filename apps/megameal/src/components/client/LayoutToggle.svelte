<!-- LayoutToggle.svelte - Cleaned and simplified -->
<script lang="ts">
import { onMount } from 'svelte'

// Appearance configuration
export const position:
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left' = 'top-right'
export const variant: 'full' | 'minimal' = 'full' // Controls appearance
export const showLabels = true // Only applies to 'full' variant
export const size: 'sm' | 'md' | 'lg' = 'md' // Only applies to 'minimal' variant

let isOneColumn = false
let isTransitioning = false
let isReady = false
let isFullscreenMode = false

onMount(() => {
  let retryCount = 0
  const maxRetries = 20 // Try for up to 2 seconds

  // Wait for SpecialPageFeatures to expose the global toggle function
  const checkForToggleFunction = () => {
    if (import.meta.env.DEV) {
      console.log(
        `LayoutToggle - Checking for global functions (attempt ${retryCount + 1}/${maxRetries})`,
      )
    }

    if ((window as any).toggleLayoutState && (window as any).getLayoutState) {
      isReady = true

      // Get initial state
      updateStateFromGlobal()

      // Poll for state changes (mainly for fullscreen mode)
      const pollInterval = setInterval(() => {
        updateStateFromGlobal()
      }, 100)

      if (import.meta.env.DEV) {
        console.log(
          'LayoutToggle - Successfully connected to SpecialPageFeatures toggle system',
        )
      }

      return () => {
        clearInterval(pollInterval)
      }
    } else {
      retryCount++
      if (retryCount < maxRetries) {
        // Retry with exponential backoff
        const delay = Math.min(100 * Math.pow(1.2, retryCount), 500)
        if (import.meta.env.DEV) {
          console.log(
            `LayoutToggle - Functions not ready, retrying in ${delay}ms...`,
          )
        }
        setTimeout(checkForToggleFunction, delay)
      } else {
        if (import.meta.env.DEV) {
          console.error(
            'LayoutToggle - Failed to connect to SpecialPageFeatures after maximum retries',
          )
          console.error(
            'LayoutToggle - Available window functions:',
            Object.keys(window).filter(
              k => k.includes('Layout') || k.includes('toggle'),
            ),
          )
        }

        // Set as ready anyway to prevent permanent disabled state
        isReady = true
      }
    }
  }

  checkForToggleFunction()

  // Listen for fullscreen changes only
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'fullscreenMode') {
      updateStateFromGlobal()
    }
  }

  window.addEventListener('storage', handleStorageChange)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
  }
})

// Update state from global functions and check fullscreen
function updateStateFromGlobal() {
  if ((window as any).getLayoutState) {
    const state = (window as any).getLayoutState()
    isOneColumn = state.isOneColumn
    isTransitioning = state.isTransitioning

    // Check fullscreen mode
    isFullscreenMode = localStorage.getItem('fullscreenMode') === 'true'
  }
}

function toggleLayout() {
  // Prevent toggle when in fullscreen mode or transitioning
  if (isTransitioning || isFullscreenMode) return

  // Use centralized toggle function only
  if ((window as any).toggleLayoutState) {
    if (import.meta.env.DEV) {
      console.log('LayoutToggle - Calling centralized toggle function')
    }
    const success = (window as any).toggleLayoutState()

    if (!success && import.meta.env.DEV) {
      console.warn('LayoutToggle - Toggle failed')
    }
  } else if (import.meta.env.DEV) {
    console.error('LayoutToggle - Global toggle function not available')
    // No fallback DOM manipulation - it was causing the issues
  }
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
      class="fixed {positionClasses} z-50 {sizeClasses} bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 group"
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
        class="group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

<style>
  /* Ensure button stays above other content */
  button {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  
  /* Smooth icon transitions */
  svg {
    transition: transform 0.2s ease;
  }
  
  button:hover svg {
    transform: scale(1.1);
  }
  
  /* Subtle glow effect on hover for minimal variant */
  button:hover {
    box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.3);
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    button {
      padding: 0.5rem;
    }
  }
</style>