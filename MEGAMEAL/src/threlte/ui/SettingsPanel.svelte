<script lang="ts">
  import { isSettingsMenuOpen, isSoundEnabled } from '../stores/uiStore';
  import { MultiplayerControls } from '../features/multiplayer';
  import { PerformancePanel } from '../features/performance';

  function closeSettings() {
    isSettingsMenuOpen.set(false);
  }
</script>

{#if $isSettingsMenuOpen}
  <div class="settings-overlay" on:click={closeSettings}>
    <div class="settings-panel" on:click|stopPropagation>
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="close-button" on:click={closeSettings}>×</button>
      </div>
      
      <div class="settings-content">
        <!-- Multiplayer Section -->
        <section class="settings-section">
          <h3>Multiplayer</h3>
          <div class="section-content">
            <MultiplayerControls />
          </div>
        </section>

        <!-- Audio Section -->
        <section class="settings-section">
          <h3>Audio</h3>
          <div class="section-content">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={$isSoundEnabled}
              />
              Enable Sound
            </label>
          </div>
        </section>

        <!-- Performance Section -->
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

  .section-content {
    color: white;
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

  /* Make the multiplayer controls fit within the panel */
  .section-content :global(.multiplayer-controls) {
    position: static;
    background: none;
    padding: 0;
    border-radius: 0;
    font-family: inherit;
  }
</style>