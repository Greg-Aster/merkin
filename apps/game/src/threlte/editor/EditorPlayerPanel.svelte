<script lang="ts">
import { requestEditorViewportFocus } from './editorStore'
import type { SharedLevelEditorSettings } from './editorTypes'

export let levelSettings: SharedLevelEditorSettings
export let updateLevelNumericSetting: (
  path: Array<string | number>,
  value: string,
) => void

const AXIS_LABELS = ['X', 'Y', 'Z']
const ROTATION_LABELS = ['Pitch', 'Yaw', 'Roll']

function getSpawnPosition() {
  const position = levelSettings.spawn?.position
  if (!position || position.length !== 3 || !position.every(Number.isFinite)) {
    return null
  }
  return position
}

function frameSpawn() {
  const position = getSpawnPosition()
  if (!position) return
  requestEditorViewportFocus(position, 18)
}

$: spawnPosition = getSpawnPosition()
</script>

<div class="editor-section">
  <div class="label">Player</div>

  <div class="tuple-group">
    <div class="tuple-label">Spawn Position</div>
    <div class="editor-field-grid editor-field-grid--triple">
      {#each [0, 1, 2] as index}
        <label class="editor-field">
          <span class="editor-field-label">{AXIS_LABELS[index]}</span>
          <input
            class="tuple-input"
            type="number"
            step="0.1"
            value={levelSettings.spawn?.position?.[index] ?? ''}
            on:change={(event) => updateLevelNumericSetting(['spawn', 'position', index], (event.currentTarget as HTMLInputElement).value)}
          />
        </label>
      {/each}
    </div>
    <div class="button-row compact editor-mt-sm">
      <button
        data-sfx-hover="hover-soft"
        data-sfx-click="select"
        on:click={frameSpawn}
        disabled={!spawnPosition}
      >
        Frame Spawn
      </button>
    </div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Spawn View Rotation</div>
    <div class="editor-field-grid editor-field-grid--triple">
      {#each [0, 1, 2] as index}
        <label class="editor-field">
          <span class="editor-field-label">{ROTATION_LABELS[index]}</span>
          <input
            class="tuple-input"
            type="number"
            step="0.01"
            value={levelSettings.spawn?.rotation?.[index] ?? 0}
            on:change={(event) => updateLevelNumericSetting(['spawn', 'rotation', index], (event.currentTarget as HTMLInputElement).value)}
          />
        </label>
      {/each}
    </div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Movement</div>
    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field">
        <span class="editor-field-label">Move Speed</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.1"
          value={levelSettings.player?.moveSpeed ?? 5}
          on:change={(event) => updateLevelNumericSetting(['player', 'moveSpeed'], (event.currentTarget as HTMLInputElement).value)}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Jump Force</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.1"
          value={levelSettings.player?.jumpForce ?? 8}
          on:change={(event) => updateLevelNumericSetting(['player', 'jumpForce'], (event.currentTarget as HTMLInputElement).value)}
        />
      </label>
    </div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Glow</div>
    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field">
        <span class="editor-field-label">Light Scale</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="1"
          value={levelSettings.player?.lightIntensityScale ?? 60}
          on:change={(event) => updateLevelNumericSetting(['player', 'lightIntensityScale'], (event.currentTarget as HTMLInputElement).value)}
        />
      </label>
    </div>
  </div>

  <div class="save-message">Spawn position, view rotation, movement, and player glow tuning live here now. Environment only controls the world mood.</div>
</div>
