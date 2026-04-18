<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export interface EditorPresetOption {
    id: string
    label: string
    description?: string
  }

  export let value = ''
  export let presets: EditorPresetOption[] = []
  export let message = ''

  const dispatch = createEventDispatcher<{
    presetChange: string | undefined
  }>()

  function handlePresetChange(event: Event) {
    const nextValue = (event.currentTarget as HTMLSelectElement).value || undefined
    dispatch('presetChange', nextValue)
  }
</script>

<select class="text-input" value={value} on:change={handlePresetChange}>
  <option value="">Custom Atmosphere</option>
  {#each presets as preset}
    <option value={preset.id}>{preset.label}</option>
  {/each}
</select>

{#if message}
  <div class="save-message">{message}</div>
{/if}

<style>
  .text-input {
    width: 100%;
    background: rgba(7, 12, 18, 0.88);
    color: #ecf7ff;
    border: 1px solid rgba(126, 203, 255, 0.14);
    border-radius: 0.45rem;
    padding: 0.45rem 0.55rem;
  }

  .save-message {
    margin-top: 0.45rem;
    font-size: 0.78rem;
    color: #9bc7e4;
  }
</style>
