<script lang="ts">
import MultiplayerControls from "../features/multiplayer/ui/MultiplayerControls.svelte";
import PerformancePanel from "../features/performance/ui/PerformancePanel.svelte";
import {
	ambienceVolumeSetting,
	isNeuralStylizationEnabled,
	isSettingsMenuOpen,
	isSoundEnabled,
	masterVolumeSetting,
	neuralStylizationAutoQualityEnabled,
	neuralStylizationEffectiveSettingsSummary,
	neuralStylizationFrameStride,
	neuralStylizationInputHeight,
	neuralStylizationMode,
	neuralStylizationOnnxLastInferenceMs,
	neuralStylizationOnnxProvider,
	neuralStylizationOnnxReady,
	neuralStylizationOnnxStatus,
	neuralStylizationOutputMode,
	neuralStylizationOutputScale,
	neuralStylizationStrength,
	sfxVolumeSetting,
} from "../stores/uiStore";

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
        <section class="settings-section">
          <h3>Multiplayer</h3>
          <div class="section-content">
            <MultiplayerControls />
          </div>
        </section>

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

            <label class="slider-label">
              <span>Master</span>
              <span>{Math.round($masterVolumeSetting * 100)}%</span>
            </label>
            <input
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$masterVolumeSetting}
            />

            <label class="slider-label">
              <span>Ambience</span>
              <span>{Math.round($ambienceVolumeSetting * 100)}%</span>
            </label>
            <input
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$ambienceVolumeSetting}
            />

            <label class="slider-label">
              <span>Effects</span>
              <span>{Math.round($sfxVolumeSetting * 100)}%</span>
            </label>
            <input
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$sfxVolumeSetting}
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

        <section class="settings-section">
          <h3>Experimental Visuals</h3>
          <div class="section-content visual-grid">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={$isNeuralStylizationEnabled} />
              Enable Neural Stylization
            </label>

            <label class="field">
              <span>Mode</span>
              <select bind:value={$neuralStylizationMode}>
                <option value="soft-shader">Soft Shader</option>
                <option value="glitch-shader">Glitch Shader</option>
                <option value="onnx">ONNX</option>
              </select>
            </label>

            <label class="field">
              <span>Output</span>
              <select bind:value={$neuralStylizationOutputMode}>
                <option value="original">Original</option>
                <option value="blend">Blend</option>
                <option value="stylized-only">Stylized Only</option>
              </select>
            </label>

            <label class="slider-label">
              <span>Blend Strength</span>
              <span>{Math.round($neuralStylizationStrength * 100)}%</span>
            </label>
            <input
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$neuralStylizationStrength}
            />

            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={$neuralStylizationAutoQualityEnabled}
              />
              Auto Quality
            </label>

            <label class="field">
              <span>Input Height</span>
              <input type="number" min="128" max="512" step="1" bind:value={$neuralStylizationInputHeight} />
            </label>

            <label class="field">
              <span>Output Scale</span>
              <input type="number" min="0.5" max="1" step="0.05" bind:value={$neuralStylizationOutputScale} />
            </label>

            <label class="field">
              <span>Frame Stride</span>
              <input type="number" min="1" max="8" step="1" bind:value={$neuralStylizationFrameStride} />
            </label>

            {#if $neuralStylizationMode === "onnx"}
              <label class="field">
                <span>ONNX Provider</span>
                <select bind:value={$neuralStylizationOnnxProvider}>
                  <option value="auto">Auto</option>
                  <option value="webgpu">WebGPU</option>
                  <option value="webgl">WebGL</option>
                  <option value="wasm">WASM</option>
                </select>
              </label>

              <div class="status-block">
                <div class="status-title">ONNX Status</div>
                <div class="status-copy">{$neuralStylizationOnnxStatus}</div>
                <div class="status-meta">
                  <span>Ready: {$neuralStylizationOnnxReady ? "Yes" : "No"}</span>
                  <span>Inference: {$neuralStylizationOnnxLastInferenceMs}</span>
                </div>
              </div>
            {/if}

            <div class="auto-quality-card">
              <div class="auto-quality-heading">Live Summary</div>
              <div class="auto-quality-summary">{$neuralStylizationEffectiveSettingsSummary}</div>
            </div>
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

  .visual-grid {
    display: grid;
    gap: 12px;
  }

  .field {
    display: grid;
    gap: 6px;
    font-size: 14px;
  }

  .field span {
    color: rgba(255, 255, 255, 0.88);
  }

  .field select,
  .field input[type="number"] {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }

  .auto-quality-card,
  .status-block {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .auto-quality-heading,
  .status-title {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.62);
  }

  .auto-quality-summary,
  .status-copy {
    font-size: 14px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.92);
  }

  .status-meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.72);
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
