<script lang="ts">
import { createEventDispatcher } from 'svelte'

export let loadingMessage = ''
export let currentLevel = ''

const dispatch = createEventDispatcher<{
  returnToObservatory: undefined
}>()
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
  style="pointer-events: auto;"
>
  <div class="text-center text-white">
    <div class="mx-auto h-32 w-32 animate-spin rounded-full border-b-2 border-white"></div>
    <p class="mt-4 text-lg">{loadingMessage}</p>
    {#if currentLevel !== 'observatory'}
      <button
        class="mt-6 rounded bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
        on:click={() => dispatch('returnToObservatory')}
      >
        Return to Observatory
      </button>
    {/if}
  </div>
</div>
