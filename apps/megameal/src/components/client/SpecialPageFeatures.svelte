<!-- SpecialPageFeatures.svelte - Cleaned and simplified -->
<script lang="ts">
import { onMount } from 'svelte'
import '../../styles/features/special-page-features.css'

export const currentPath = ''
export const oneColumn = false // From frontmatter - treated as INITIAL state

let cookbookView = 'gallery' // 'gallery' or 'list'
let isOneColumn = false
let isTransitioning = false
let pageDefaultOneColumn = false

function getRenderedSidebarState(): boolean | null {
  const sidebarState = document.getElementById('main-grid')?.dataset.sidebar

  if (sidebarState === 'hidden') return true
  if (sidebarState === 'visible') return false

  return null
}

onMount(() => {
  const isCookbookPage = currentPath.includes('cookbook')
  const isFirstContactPage = currentPath.includes('first-contact')
  const isSpecialPage = isCookbookPage || isFirstContactPage

  if (import.meta.env.DEV) {
    console.log('SpecialPageFeatures - Current path:', currentPath)
    console.log('SpecialPageFeatures - frontmatter oneColumn:', oneColumn)
    console.log('SpecialPageFeatures - Is special page:', isSpecialPage)
  }

  // Wait for DOM and determine initial layout state
  setTimeout(() => {
    if (import.meta.env.DEV) {
      console.log('SpecialPageFeatures - Starting initialization...')
    }

    // Check fullscreen mode first (highest priority)
    const isFullscreen = localStorage.getItem('fullscreenMode') === 'true'

    if (isFullscreen) {
      // Fullscreen mode always forces one column, no toggle allowed
      if (import.meta.env.DEV) {
        console.log('Fullscreen mode detected - forcing one column layout')
      }
      isOneColumn = true
      applyLayoutState(true, true) // true for isFullscreen parameter
    } else {
      // Page-first priority system - frontmatter overrides saved preferences
      let targetState: boolean
      const renderedSidebarState = getRenderedSidebarState()

      if (renderedSidebarState !== null) {
        targetState = renderedSidebarState
        if (import.meta.env.DEV) {
          console.log('Using rendered sidebar layout:', targetState)
        }
      } else if (oneColumn !== undefined) {
        // Frontmatter has highest priority - each page defines its intended layout
        targetState = oneColumn
        if (import.meta.env.DEV) {
          console.log(
            'Using frontmatter layout (highest priority):',
            targetState,
          )
        }
      } else if (isSpecialPage) {
        // Special pages default to one column when no frontmatter specified
        targetState = true
        if (import.meta.env.DEV) {
          console.log('Special page detected, defaulting to one column')
        }
      } else {
        // Default to two column for regular pages
        targetState = false
        if (import.meta.env.DEV) {
          console.log('Using default two column layout')
        }
      }

      // Clear any saved user preference that might conflict with page intent
      localStorage.removeItem('oneColumnMode')

      // Set initial state
      isOneColumn = targetState
      pageDefaultOneColumn = targetState
      applyLayoutState(targetState, false)
    }

    // Handle special page features after layout is set
    if (isCookbookPage) {
      initializeCookbookView()
    }

    // Expose toggle function globally
    try {
      ;(window as any).toggleLayoutState = toggleLayout
      ;(window as any).getLayoutState = () => ({
        isOneColumn,
        isTransitioning,
        isFullscreen: localStorage.getItem('fullscreenMode') === 'true',
      })

      if (import.meta.env.DEV) {
        console.log(
          'SpecialPageFeatures - Global functions exposed successfully',
        )
      }
    } catch (error) {
      console.error(
        'SpecialPageFeatures - Error exposing global functions:',
        error,
      )
    }
  }, 50)

  // Listen for external layout changes (only fullscreen changes matter now)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'fullscreenMode') {
      // Handle fullscreen mode changes
      const isFullscreen = e.newValue === 'true'
      if (import.meta.env.DEV) {
        console.log('Fullscreen mode changed:', isFullscreen)
      }

      if (isFullscreen) {
        // Entering fullscreen - force one column
        isOneColumn = true
        applyLayoutState(true, true)
      } else {
        // Exiting fullscreen - restore page's intended state
        const pageIntendedState = pageDefaultOneColumn
        isOneColumn = pageIntendedState
        applyLayoutState(pageIntendedState, false)
      }
    }
  }

  window.addEventListener('storage', handleStorageChange)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    // Clean up global functions
    ;(window as any).toggleLayoutState = undefined
    ;(window as any).getLayoutState = undefined
  }
})

// Centralized toggle function that respects fullscreen mode
function toggleLayout() {
  // Prevent toggle when in fullscreen mode
  const isFullscreen = localStorage.getItem('fullscreenMode') === 'true'
  if (isTransitioning || isFullscreen) {
    if (import.meta.env.DEV) {
      console.log(
        'SpecialPageFeatures - Toggle blocked:',
        isFullscreen ? 'fullscreen mode active' : 'transitioning',
      )
    }
    return false
  }

  if (import.meta.env.DEV) {
    console.log(
      'SpecialPageFeatures - Toggling layout from',
      isOneColumn ? 'one' : 'two',
      'to',
      isOneColumn ? 'two' : 'one',
      'column',
    )
  }

  isTransitioning = true
  isOneColumn = !isOneColumn

  applyLayoutState(isOneColumn, false)

  // Reset transition flag
  setTimeout(() => {
    isTransitioning = false
  }, 300)

  return true
}

// Simplified layout application using CSS classes only
function applyLayoutState(oneColumnMode: boolean, isFullscreenMode = false) {
  if (import.meta.env.DEV) {
    console.log(
      'Applying layout state:',
      oneColumnMode ? 'One Column' : 'Two Column',
      isFullscreenMode ? '(Fullscreen)' : '(Normal)',
    )
  }

  // The grid owns sidebar layout. Body state stays for non-layout features
  // that still read the historical mode flags.
  document.body.setAttribute(
    'data-layout-mode',
    oneColumnMode ? 'oneColumn' : 'twoColumn',
  )
  document.body.classList.toggle('one-column-mode', oneColumnMode)
  document
    .getElementById('main-grid')
    ?.setAttribute('data-sidebar', oneColumnMode ? 'hidden' : 'visible')

  // Add fullscreen class for additional CSS targeting
  if (isFullscreenMode) {
    document.body.classList.add('fullscreen-mode')
  } else {
    document.body.classList.remove('fullscreen-mode')
  }

  // Let the CSS handle the actual layout changes
  if (import.meta.env.DEV) {
    console.log(
      'SpecialPageFeatures - Layout classes applied, CSS will handle the rest',
    )
  }
}

// Cookbook functionality (unchanged)
function initializeCookbookView() {
  cookbookView = localStorage.getItem('cookbookView') || 'gallery'
  updateCookbookView()
}

function setGalleryView() {
  cookbookView = 'gallery'
  localStorage.setItem('cookbookView', 'gallery')
  updateCookbookView()
}

function setListView() {
  cookbookView = 'list'
  localStorage.setItem('cookbookView', 'list')
  updateCookbookView()
}

function updateCookbookView() {
  const galleryView = document.getElementById('gallery-view')
  const listView = document.getElementById('list-view')
  const galleryBtn = document.getElementById('gallery-view-btn')
  const listBtn = document.getElementById('list-view-btn')

  if (!galleryView || !listView || !galleryBtn || !listBtn) return

  if (cookbookView === 'list') {
    galleryView.classList.add('hidden')
    listView.classList.remove('hidden')
    listBtn.className =
      'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
    galleryBtn.className =
      'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
  } else {
    galleryView.classList.remove('hidden')
    listView.classList.add('hidden')
    galleryBtn.className =
      'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
    listBtn.className =
      'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
  }
}

// Expose functions to global scope for external button triggers
onMount(() => {
  const createHiddenButton = (id: string, handler: () => void) => {
    const btn = document.createElement('button')
    btn.id = id
    btn.style.display = 'none'
    btn.addEventListener('click', handler)
    document.body.appendChild(btn)
    return btn
  }

  const galleryBtn = createHiddenButton('gallery-view-trigger', setGalleryView)
  const listBtn = createHiddenButton('list-view-trigger', setListView)

  return () => {
    galleryBtn.remove()
    listBtn.remove()
  }
})

// Reset function for debugging
export function resetSpecialPageState() {
  localStorage.removeItem('cookbookView')
  localStorage.removeItem('specialPageOriginalState')
  localStorage.removeItem('fullscreenMode')
  localStorage.removeItem('fullscreenBannerOverride')
  document.body.removeAttribute('data-layout-mode')
  document.body.classList.remove('one-column-mode', 'fullscreen-mode')
  if (import.meta.env.DEV) {
    console.log(
      'All persistent special page states reset. Layout will reset on next navigation.',
    )
  }
}
</script>

<!-- This component doesn't render anything visible, it just manages state and behavior -->
<div hidden></div>
