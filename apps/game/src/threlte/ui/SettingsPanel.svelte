<script lang="ts">
import { onMount } from 'svelte'
import {
  type RuntimeInputActionId,
  formatRuntimeInputCodeLabel,
  isRuntimeInputCodeAllowed,
} from '../engine/runtimeInputBindings'
import PerformancePanel from '../features/performance/ui/PerformancePanel.svelte'
import {
  rebindRuntimeInputAction,
  resetRuntimeInputBindings,
  runtimeInputBindingRows,
} from '../stores/runtimeInputBindingsStore'
import {
  ambienceVolumeSetting,
  isSettingsMenuOpen,
  isSoundEnabled,
  masterVolumeSetting,
  sfxVolumeSetting,
} from '../stores/uiStore'

let multiplayerControlsComponent: any = null
let multiplayerUnavailableReason = ''
let pendingInputAction: RuntimeInputActionId | null = null

onMount(() => {
  void ensureMultiplayerControls()
})

function closeSettings() {
  isSettingsMenuOpen.set(false)
}

function handleOverlayKeydown(event: KeyboardEvent) {
  if (pendingInputAction) return
  if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    closeSettings()
  }
}

function beginInputCapture(actionId: RuntimeInputActionId) {
  pendingInputAction = actionId
}

function handleInputCaptureKeydown(event: KeyboardEvent) {
  if (!$isSettingsMenuOpen || !pendingInputAction) return

  event.preventDefault()
  event.stopPropagation()

  if (event.code === 'Escape') {
    pendingInputAction = null
    return
  }

  if (!isRuntimeInputCodeAllowed(event.code)) return

  rebindRuntimeInputAction(pendingInputAction, event.code)
  pendingInputAction = null
}

function handleInputReset() {
  pendingInputAction = null
  resetRuntimeInputBindings()
}

async function ensureMultiplayerControls() {
  if (multiplayerControlsComponent || multiplayerUnavailableReason) return

  try {
    const module = await import(
      '../features/multiplayer/ui/MultiplayerControls.svelte'
    )
    multiplayerControlsComponent = module.default
  } catch (error) {
    console.warn(
      'Failed to load multiplayer controls for settings panel:',
      error,
    )
    multiplayerUnavailableReason =
      'Multiplayer controls are unavailable in this session.'
  }
}
</script>

<svelte:window on:keydown|capture={handleInputCaptureKeydown} />

{#if $isSettingsMenuOpen}
  <div
    class="settings-overlay"
    role="button"
    tabindex="0"
    aria-label="Close settings"
    data-sfx-click="panel-close"
    on:click={closeSettings}
    on:keydown={handleOverlayKeydown}
  >
    <div
      class="settings-panel"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="settings-title"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <div class="settings-header">
        <h2 id="settings-title">Settings</h2>
        <button
          class="close-button"
          aria-label="Close settings"
          data-sfx-hover="hover-emphasis"
          data-sfx-click="panel-close"
          on:click={closeSettings}
        >
          ×
        </button>
      </div>
      
      <div class="settings-content">
        <section class="settings-section">
          <h3>Multiplayer</h3>
          <div class="section-content">
            {#if multiplayerControlsComponent}
              <svelte:component this={multiplayerControlsComponent} />
            {:else if multiplayerUnavailableReason}
              <div class="status-block">
                <div class="status-title">Multiplayer Unavailable</div>
                <div class="status-copy">{multiplayerUnavailableReason}</div>
              </div>
            {:else}
              <div class="status-block">
                <div class="status-title">Loading</div>
                <div class="status-copy">Preparing multiplayer controls…</div>
              </div>
            {/if}
          </div>
        </section>

        <section class="settings-section">
          <div class="settings-section-header">
            <h3>Controls</h3>
            <button
              class="secondary-button"
              type="button"
              data-sfx-hover="hover-soft"
              data-sfx-click="soft"
              on:click={handleInputReset}
            >
              Reset
            </button>
          </div>
          <div class="section-content">
            <div class="binding-list">
              {#each $runtimeInputBindingRows as binding}
                <div class="binding-row">
                  <div>
                    <div class="binding-label">{binding.label}</div>
                    <div class="binding-category">{binding.category}</div>
                  </div>
                  <button
                    class:capturing={pendingInputAction === binding.id}
                    class="binding-button"
                    type="button"
                    data-sfx-hover="hover-soft"
                    data-sfx-click="soft"
                    on:click={() => beginInputCapture(binding.id)}
                  >
                    {pendingInputAction === binding.id
                      ? 'Press a key'
                      : binding.keyboardCodes
                          .map(formatRuntimeInputCodeLabel)
                          .join(' / ')}
                  </button>
                </div>
              {/each}
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Audio</h3>
          <div class="section-content">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={$isSoundEnabled}
                data-sfx-click="soft"
              />
              Enable Sound
            </label>

            <div class="slider-label">
              <span>Master</span>
              <span>{Math.round($masterVolumeSetting * 100)}%</span>
            </div>
            <input
              id="master-volume"
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$masterVolumeSetting}
              data-sfx-focus="focus-soft"
            />

            <div class="slider-label">
              <span>Ambience</span>
              <span>{Math.round($ambienceVolumeSetting * 100)}%</span>
            </div>
            <input
              id="ambience-volume"
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$ambienceVolumeSetting}
              data-sfx-focus="focus-soft"
            />

            <div class="slider-label">
              <span>Effects</span>
              <span>{Math.round($sfxVolumeSetting * 100)}%</span>
            </div>
            <input
              id="effects-volume"
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$sfxVolumeSetting}
              data-sfx-focus="focus-soft"
            />
          </div>
        </section>

        <section class="settings-section">
          <h3>Performance</h3>
          <div class="section-content">
            <PerformancePanel 
              visible={true}
              position="inline"
              compact={false}
            />
          </div>
        </section>

      </div>
    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(2px);
  }

  .settings-panel {
    background: rgba(20, 20, 20, 0.95);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .settings-header h2 {
    margin: 0;
    color: white;
    font-size: 24px;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .settings-content {
    padding: 0;
  }

  .settings-section {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 20px 24px;
  }

  .settings-section:last-child {
    border-bottom: none;
  }

  .settings-section h3 {
    margin: 0 0 16px 0;
    color: white;
    font-size: 18px;
    font-weight: 500;
  }

  .settings-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 16px;
  }

  .settings-section-header h3 {
    margin: 0;
  }

  .section-content {
    color: white;
  }

  .binding-list {
    display: grid;
    gap: 8px;
  }

  .binding-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(148px, auto);
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
  }

  .binding-label {
    font-size: 14px;
    line-height: 1.2;
    color: rgba(255, 255, 255, 0.94);
  }

  .binding-category {
    margin-top: 3px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }

  .binding-button,
  .secondary-button {
    min-height: 32px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    color: white;
    font: inherit;
    cursor: pointer;
  }

  .binding-button {
    padding: 6px 10px;
    text-align: center;
    white-space: nowrap;
  }

  .binding-button.capturing {
    border-color: rgba(126, 216, 255, 0.75);
    background: rgba(126, 216, 255, 0.14);
  }

  .secondary-button {
    padding: 6px 12px;
    font-size: 13px;
  }

  .status-block {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .status-title {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.62);
  }

  .status-copy {
    font-size: 14px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.92);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 16px;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #4f46e5;
  }

  .slider-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.88);
    margin: 0 0 6px;
  }

  .volume-slider {
    width: 100%;
    margin: 0;
    accent-color: #4f46e5;
  }

  .section-content :global(.multiplayer-controls) {
    position: static;
    background: none;
    padding: 0;
    border-radius: 0;
    font-family: inherit;
  }
</style>
