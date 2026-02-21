<!--
  Style Controls UI Component
  
  Provides a simple interface for testing different visual styles
  in development and for potential in-game style switching.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { 
    currentStylePresetStore, 
    enableToonShadingStore, 
    enableOutlinesStore,
    enableColorGradingStore,
    styleSystemReadyStore
  } from '../core/StyleManager'
  
  const dispatch = createEventDispatcher()
  
  // Props
  export let visible = true
  export let position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-right'
  
  // Style options
  const stylePresets = [
    { value: 'ghibli', label: 'Studio Ghibli', description: 'Warm, natural colors' },
    { value: 'alto', label: 'Alto\'s Adventure', description: 'Minimalist gradients' },
    { value: 'monument', label: 'Monument Valley', description: 'Pastel architecture' },
    { value: 'retro', label: 'Retro/Synthwave', description: 'Bold 80s colors' }
  ] as const
  
  // Local state
  let isExpanded = false
  
  // Reactive values from stores
  $: currentPreset = $currentStylePresetStore
  $: toonShadingEnabled = $enableToonShadingStore
  $: outlinesEnabled = $enableOutlinesStore
  $: colorGradingEnabled = $enableColorGradingStore
  $: styleSystemReady = $styleSystemReadyStore
  
  function handlePresetChange(preset: typeof stylePresets[number]['value']) {
    currentStylePresetStore.set(preset)
    dispatch('styleChanged', { preset })
  }
  
  function toggleToonShading() {
    enableToonShadingStore.update(enabled => !enabled)
  }
  
  function toggleOutlines() {
    enableOutlinesStore.update(enabled => !enabled)
  }
  
  function toggleColorGrading() {
    enableColorGradingStore.update(enabled => !enabled)
  }
</script>

{#if visible && styleSystemReady}
  <div class="style-controls" class:expanded={isExpanded} data-position={position}>
    
    <!-- Toggle button -->
    <button 
      class="toggle-button"
      on:click={() => isExpanded = !isExpanded}
      title="Style Controls"
    >
      🎨
    </button>
    
    {#if isExpanded}
      <div class="controls-panel">
        
        <!-- Style Preset Selection -->
        <div class="control-group">
          <h3>Visual Style</h3>
          <div class="preset-grid">
            {#each stylePresets as preset}
              <button
                class="preset-button"
                class:active={currentPreset === preset.value}
                on:click={() => handlePresetChange(preset.value)}
                title={preset.description}
              >
                {preset.label}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Feature Toggles -->
        <div class="control-group">
          <h3>Effects</h3>
          
          <label class="toggle-label">
            <input 
              type="checkbox" 
              bind:checked={toonShadingEnabled}
              on:change={toggleToonShading}
            />
            <span>Toon Shading</span>
          </label>
          
          <label class="toggle-label">
            <input 
              type="checkbox" 
              bind:checked={outlinesEnabled}
              on:change={toggleOutlines}
            />
            <span>Outlines</span>
          </label>
          
          <label class="toggle-label">
            <input 
              type="checkbox" 
              bind:checked={colorGradingEnabled}
              on:change={toggleColorGrading}
            />
            <span>Color Grading</span>
          </label>
          
        </div>
        
      </div>
    {/if}
    
  </div>
{/if}

<style>
  .style-controls {
    position: fixed;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  }
  
  .style-controls[data-position="top-left"] {
    top: 20px;
    left: 20px;
  }
  
  .style-controls[data-position="top-right"] {
    top: 20px;
    right: 20px;
  }
  
  .style-controls[data-position="bottom-left"] {
    bottom: 20px;
    left: 20px;
  }
  
  .style-controls[data-position="bottom-right"] {
    bottom: 20px;
    right: 20px;
  }
  
  .toggle-button {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }
  
  .toggle-button:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }
  
  .controls-panel {
    position: absolute;
    top: 60px;
    right: 0;
    width: 280px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 20px;
    color: white;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .style-controls[data-position="bottom-right"] .controls-panel,
  .style-controls[data-position="bottom-left"] .controls-panel {
    top: auto;
    bottom: 60px;
  }
  
  .style-controls[data-position="top-left"] .controls-panel,
  .style-controls[data-position="bottom-left"] .controls-panel {
    right: auto;
    left: 0;
  }
  
  .control-group {
    margin-bottom: 20px;
  }
  
  .control-group:last-child {
    margin-bottom: 0;
  }
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
  }
  
  .preset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  
  .preset-button {
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
  }
  
  .preset-button:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
  }
  
  .preset-button.active {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
  }
  
  .toggle-label {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    cursor: pointer;
    user-select: none;
  }
  
  .toggle-label input[type="checkbox"] {
    margin-right: 8px;
    accent-color: #4CAF50;
  }
  
  .toggle-label span {
    font-size: 13px;
  }
  
  /* Smooth transitions */
  .controls-panel {
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Mobile responsiveness */
  @media (max-width: 480px) {
    .style-controls {
      position: fixed;
      top: auto !important;
      bottom: 20px !important;
      left: 20px !important;
      right: 20px !important;
    }
    
    .controls-panel {
      position: static;
      width: 100%;
      margin-top: 10px;
    }
    
    .preset-grid {
      grid-template-columns: 1fr;
    }
  }
</style>