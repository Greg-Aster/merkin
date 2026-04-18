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
    const nextValue = (event.currentTarget as HTMLSelectElement).value || undefined
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

<div class="tuple-row compact-two" style="margin-top:0.45rem;">
  <input class="tuple-input" type="number" step="0.01" value={volume} on:change={handleVolumeChange} />
  <input class="tuple-input" type="number" step="0.1" value={falloff} on:change={handleFalloffChange} />
</div>

{#if message}
  <div class="save-message">{message}</div>
{/if}

<style>
  .checkbox {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.55rem;
    font-size: 0.9rem;
  }

  .tuple-group {
    margin-top: 0.65rem;
  }

  .tuple-label {
    font-size: 0.75rem;
    color: #8fb7d4;
    margin-bottom: 0.35rem;
  }

  .tuple-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .tuple-row.compact-two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .text-input,
  .tuple-input {
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
