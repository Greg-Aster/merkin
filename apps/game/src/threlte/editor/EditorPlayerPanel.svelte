<script lang="ts">
import type { SharedLevelEditorSettings } from './editorTypes'

export let levelId: string
export let levelSettings: SharedLevelEditorSettings
export let updateLevelSetting: (
  path: Array<string | number>,
  value: unknown,
) => void
export let updateLevelNumericSetting: (
  path: Array<string | number>,
  value: string,
) => void

const AXIS_LABELS = ['X', 'Y', 'Z']

function getDefaultSpawnPositionForLevel(
  levelId: string,
): [number, number, number] {
  if (levelId === 'sci-fi-room') return [0, 1, 0]
  if (levelId === 'miranda') return [0, 4.25, -13.8]
  if (levelId === 'solitude') return [0, 2.4, -24]
  return [0, 18, -50]
}
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
            value={levelSettings.spawn?.position?.[index] ?? getDefaultSpawnPositionForLevel(levelId)[index]}
            on:change={(event) => updateLevelNumericSetting(['spawn', 'position', index], (event.currentTarget as HTMLInputElement).value)}
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

  <div class="save-message">Spawn, movement, and player glow tuning live here now. Environment only controls the world mood.</div>
</div>
