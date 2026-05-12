<script lang="ts">
import { createEventDispatcher } from 'svelte'

export let errorMessage = ''
export let roomJoinError = ''

const dispatch = createEventDispatcher<{
  clearRoomError: undefined
  reload: undefined
}>()
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-red-900 bg-opacity-90"
  style="pointer-events: auto;"
>
  <div class="rounded-lg bg-red-800 p-8 text-center text-white">
    <h2 class="mb-4 text-2xl font-bold">
      {roomJoinError ? 'Room Join Error' : 'Error'}
    </h2>
    <p class="text-lg">{roomJoinError || errorMessage}</p>
    <button
      class="mt-4 rounded bg-red-600 px-4 py-2 hover:bg-red-500"
      on:click={() => dispatch('reload')}
    >
      Reload Game
    </button>
    {#if roomJoinError}
      <button
        class="mt-2 ml-4 rounded bg-gray-600 px-4 py-2 hover:bg-gray-500"
        on:click={() => dispatch('clearRoomError')}
      >
        Continue Without Joining
      </button>
    {/if}
  </div>
</div>
