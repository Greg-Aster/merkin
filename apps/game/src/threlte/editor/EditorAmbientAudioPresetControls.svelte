<script lang="ts">
import { createEventDispatcher } from 'svelte'

interface EditorPresetOption {
  id: string
  label: string
  description?: string
}

export interface EditorAudioLibraryTrack {
  label: string
  src: string
}

export let presetValue = ''
export let presets: EditorPresetOption[] = []
export let enabled = false
export let track = ''
export let volume = 0.16
export let falloff = 28
export let audioLibrary: EditorAudioLibraryTrack[] = []
export let message = ''

const dispatch = createEventDispatcher<{
  presetChange: string | undefined
  enabledChange: boolean
  trackChange: string
  volumeChange: string
  falloffChange: string
}>()

function handlePresetChange(event: Event) {
  const nextValue =
    (event.currentTarget as HTMLSelectElement).value || undefined
  dispatch('presetChange', nextValue)
}

function handleEnabledChange(event: Event) {
  dispatch('enabledChange', (event.currentTarget as HTMLInputElement).checked)
}

function handleTrackChange(event: Event) {
  dispatch('trackChange', (event.currentTarget as HTMLSelectElement).value)
}

function handleVolumeChange(event: Event) {
  dispatch('volumeChange', (event.currentTarget as HTMLInputElement).value)
}

function handleFalloffChange(event: Event) {
  dispatch('falloffChange', (event.currentTarget as HTMLInputElement).value)
}
</script>

<select class="text-input" value={presetValue} on:change={handlePresetChange}>
  <option value="">Custom Audio</option>
  {#each presets as preset}
    <option value={preset.id}>{preset.label}</option>
  {/each}
</select>

<label class="checkbox"><input type="checkbox" checked={enabled} on:change={handleEnabledChange} /> Enable Ambient Bed</label>

<div class="tuple-group">
  <div class="tuple-label">Ambient Track</div>
  <select class="text-input" value={track || audioLibrary[0]?.src || ''} on:change={handleTrackChange}>
    {#each audioLibrary as item}
      <option value={item.src}>{item.label}</option>
    {/each}
  </select>
</div>

<div class="tuple-row compact-two editor-mt-sm">
  <input class="tuple-input" type="number" step="0.01" value={volume} on:change={handleVolumeChange} />
  <input class="tuple-input" type="number" step="0.1" value={falloff} on:change={handleFalloffChange} />
</div>

{#if message}
  <div class="save-message">{message}</div>
{/if}
