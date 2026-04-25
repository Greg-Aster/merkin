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
  const nextValue =
    (event.currentTarget as HTMLSelectElement).value || undefined
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
