<script lang="ts">
    import { onMount } from 'svelte';
  
    // --- State Management ---
    let isMobile = false;
    let isFullScreen = false;
  
    // --- Lifecycle ---
    onMount(() => {
      // Check for mobile user agent on mount (client-side only)
      isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
  
      // Listen for changes in fullscreen state to keep our button icon correct
      document.addEventListener('fullscreenchange', handleFullScreenChange);
  
      // Cleanup listener when the component is destroyed
      return () => {
        document.removeEventListener('fullscreenchange', handleFullScreenChange);
      };
    });
  
    // --- Fullscreen API Logic ---
  
    /**
     * Toggles the browser's fullscreen mode.
     */
    function toggleFullScreen() {
      if (!document.fullscreenElement) {
        // Request fullscreen on the main document element
        document.documentElement.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      } else {
        // Exit fullscreen
        document.exitFullscreen();
      }
    }
  
    /**
     * Updates the isFullScreen state when the browser's fullscreen status changes.
     */
    function handleFullScreenChange() {
      isFullScreen = !!document.fullscreenElement;
    }
  </script>
  
  <!-- 
    This svelte:head tag injects global styles into the document's <head>.
    This is the cleanest way to apply the pull-to-refresh fix.
  -->
  <svelte:head>
    <style>
      /* Disable the "pull-to-refresh" gesture on mobile browsers.
        This is critical for a good web game experience.
      */
      html, body {
        overscroll-behavior-y: contain;
      }
    </style>
  </svelte:head>
  
  <!-- Only render the button if we are on a mobile device -->
  <!-- {#if isMobile}
    <button 
      class="fullscreen-button" 
      on:click={toggleFullScreen}
      aria-label={isFullScreen ? 'Exit full-screen mode' : 'Enter full-screen mode'}
    > -->
      <!-- SVG icon changes based on the fullscreen state -->
      <!-- {#if isFullScreen} -->
        <!-- Exit Fullscreen Icon -->
        <!-- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
        </svg>
      {:else} -->
        <!-- Enter Fullscreen Icon -->
        <!-- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
      {/if}
    </button>
  {/if} -->
  
<!--   <style>
    .fullscreen-button {
      position: fixed;
      top: 15px;
      right: 15px;
      z-index: 1000; /* Ensure it's on top of other UI */
      background-color: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      padding: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      transition: background-color 0.2s ease, transform 0.2s ease;
    }
  
    .fullscreen-button:hover {
      background-color: rgba(0, 0, 0, 0.7);
    }
  
    .fullscreen-button:active {
      transform: scale(0.9);
    }
  
    .fullscreen-button svg {
      width: 100%;
      height: 100%;
    }
  </style> -->