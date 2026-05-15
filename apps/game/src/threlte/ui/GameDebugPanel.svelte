<script lang="ts">
export let isInitialized = false
export let currentLevel = ''
export let isMobile = false
export let runtimeDiagnosticsPanelComponent: any = null
</script>

<div
  class="game-debug-panel fixed top-4 right-4 rounded bg-black bg-opacity-80 p-4 text-white"
  style="pointer-events: auto;"
>
  <h3 class="font-bold">Debug Info</h3>
  <p>Game State: {isInitialized ? 'Ready' : 'Initializing'}</p>
  <p>Current Level: {currentLevel}</p>
  <p>Mobile: {isMobile ? 'Yes' : 'No'}</p>
  {#if runtimeDiagnosticsPanelComponent}
    <div class="mt-3">
      <svelte:component this={runtimeDiagnosticsPanelComponent} compact={true} />
    </div>
  {/if}
</div>
