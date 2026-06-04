<script lang="ts">
import type { SharedLevelEditorSettings } from './editorTypes'

export let levelSettings: SharedLevelEditorSettings
export let updateLevelSetting: (
  path: Array<string | number>,
  value: unknown,
) => void = () => {}
export let updateLevelNumericSetting: (
  path: Array<string | number>,
  value: string,
) => void = () => {}

const qualityTiers = [
  { id: 'ultra_low', label: 'Ultra Low' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'ultra', label: 'Ultra' },
] as const

function parseList(value: string) {
  return value
    .split(/[\n,]+/)
    .map(entry => entry.trim())
    .filter(Boolean)
}

function formatList(value: string[] | undefined) {
  return (value ?? []).join('\n')
}

function setFireflyFieldEnabled(enabled: boolean) {
  updateLevelSetting(['features', 'fireflies'], enabled)
  updateLevelSetting(['fireflies', 'enabled'], enabled)
}

function updateList(path: Array<string | number>, value: string) {
  updateLevelSetting(path, parseList(value))
}

$: fireflies = levelSettings.fireflies ?? {}
$: fireflyLighting = fireflies.lighting ?? {}
$: interactive = fireflies.interactive ?? {}
$: fieldEnabled =
  fireflies.enabled ?? levelSettings.features?.fireflies ?? false
$: fieldCenter = fireflies.center ?? [0, 0, 0]
</script>

<div class="editor-section">
  <div class="label">NPC Firefly Field</div>
  <div class="editor-status-card">
    <div class="editor-status-title">
      {fieldEnabled ? 'Ambient NPC field enabled' : 'Ambient NPC field disabled'}
    </div>
    <div class="save-message">
      {fireflies.count ?? 36} fireflies · {fireflies.lightCount ?? 8} light slots · {fireflies.distribution ?? 'uniform'}
    </div>
    <div class="editor-chip-row">
      <span class:ready={fieldEnabled} class:warn={!fieldEnabled} class="editor-chip">
        field {fieldEnabled ? 'on' : 'off'}
      </span>
      <span class:ready={interactive.enabled} class:warn={!interactive.enabled} class="editor-chip">
        interaction {interactive.enabled ? 'on' : 'off'}
      </span>
      <span class:ready={fireflyLighting.lightBudgeted ?? true} class:warn={fireflyLighting.lightBudgeted === false} class="editor-chip">
        lights {(fireflyLighting.lightBudgeted ?? true) ? 'budgeted' : 'unbudgeted'}
      </span>
    </div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Field Toggles</div>
    <label class="checkbox">
      <input
        type="checkbox"
        checked={fieldEnabled}
        on:change={(event) =>
          setFireflyFieldEnabled((event.currentTarget as HTMLInputElement).checked)}
      />
      Enable NPC Firefly Field
    </label>
    <label class="checkbox">
      <input
        type="checkbox"
        checked={fireflies.allowWithAuthored ?? false}
        on:change={(event) =>
          updateLevelSetting(
            ['fireflies', 'allowWithAuthored'],
            (event.currentTarget as HTMLInputElement).checked,
          )}
      />
      Keep Field With Authored NPCs
    </label>
    <label class="checkbox">
      <input
        type="checkbox"
        checked={fireflies.terrainFollow ?? false}
        on:change={(event) =>
          updateLevelSetting(
            ['fireflies', 'terrainFollow'],
            (event.currentTarget as HTMLInputElement).checked,
          )}
      />
      Follow Terrain
    </label>
    <label class="checkbox">
      <input
        type="checkbox"
        checked={fireflyLighting.lightBudgeted ?? true}
        on:change={(event) =>
          updateLevelSetting(
            ['fireflies', 'lighting', 'lightBudgeted'],
            (event.currentTarget as HTMLInputElement).checked,
          )}
      />
      Runtime Light Budget
    </label>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Placement & Distribution</div>
    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field"><span class="editor-field-label">Count</span><input class="tuple-input" type="number" step="1" value={fireflies.count ?? 36} on:change={(event) => updateLevelNumericSetting(['fireflies', 'count'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Light Count</span><input class="tuple-input" type="number" step="1" value={fireflies.lightCount ?? 8} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lightCount'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Radius</span><input class="tuple-input" type="number" step="1" value={fireflies.radius ?? 120} on:change={(event) => updateLevelNumericSetting(['fireflies', 'radius'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Distribution</span><select class="text-input" value={fireflies.distribution ?? 'uniform'} on:change={(event) => updateLevelSetting(['fireflies', 'distribution'], (event.currentTarget as HTMLSelectElement).value)}><option value="uniform">Uniform</option><option value="center-falloff">Center Falloff</option></select></label>
      <label class="editor-field"><span class="editor-field-label">Density Power</span><input class="tuple-input" type="number" step="0.1" min="0.1" value={fireflies.densityExponent ?? 0.5} on:change={(event) => updateLevelNumericSetting(['fireflies', 'densityExponent'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Min Height</span><input class="tuple-input" type="number" step="0.1" value={fireflies.minHeight ?? 2} on:change={(event) => updateLevelNumericSetting(['fireflies', 'minHeight'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Max Height</span><input class="tuple-input" type="number" step="0.1" value={fireflies.maxHeight ?? 5} on:change={(event) => updateLevelNumericSetting(['fireflies', 'maxHeight'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Center X</span><input class="tuple-input" type="number" step="0.1" value={fieldCenter[0]} on:change={(event) => updateLevelNumericSetting(['fireflies', 'center', 0], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Center Y</span><input class="tuple-input" type="number" step="0.1" value={fieldCenter[1]} on:change={(event) => updateLevelNumericSetting(['fireflies', 'center', 1], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Center Z</span><input class="tuple-input" type="number" step="0.1" value={fieldCenter[2]} on:change={(event) => updateLevelNumericSetting(['fireflies', 'center', 2], (event.currentTarget as HTMLInputElement).value)} /></label>
    </div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Visuals & Lighting</div>
    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field"><span class="editor-field-label">Primary Color</span><input class="text-input" type="color" value={fireflies.color ?? '#f4ffb8'} on:input={(event) => updateLevelSetting(['fireflies', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Accent Color</span><input class="text-input" type="color" value={fireflies.secondaryColor ?? '#8defff'} on:input={(event) => updateLevelSetting(['fireflies', 'secondaryColor'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Sprite Size</span><input class="tuple-input" type="number" step="0.05" value={fireflies.size ?? 0.58} on:change={(event) => updateLevelNumericSetting(['fireflies', 'size'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Sprite Intensity</span><input class="tuple-input" type="number" step="0.05" value={fireflyLighting.spriteIntensity ?? 1.45} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'spriteIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Light Intensity</span><input class="tuple-input" type="number" step="1" value={fireflyLighting.lightIntensity ?? 44} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'lightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Light Distance</span><input class="tuple-input" type="number" step="1" value={fireflyLighting.lightDistance ?? 28} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'lightDistance'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Light Decay</span><input class="tuple-input" type="number" step="0.05" value={fireflyLighting.lightDecay ?? 1.35} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'lightDecay'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Minimum Glow</span><input class="tuple-input" type="number" min="0" max="1" step="0.01" value={fireflyLighting.minimumLightIntensityScale ?? 0.16} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'minimumLightIntensityScale'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Twinkle Speed</span><input class="tuple-input" type="number" step="0.01" value={fireflies.twinkleSpeed ?? 0.82} on:change={(event) => updateLevelNumericSetting(['fireflies', 'twinkleSpeed'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Drift Speed</span><input class="tuple-input" type="number" step="0.01" value={fireflies.driftSpeed ?? 0.28} on:change={(event) => updateLevelNumericSetting(['fireflies', 'driftSpeed'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Sway</span><input class="tuple-input" type="number" step="0.1" value={fireflies.sway ?? 1.5} on:change={(event) => updateLevelNumericSetting(['fireflies', 'sway'], (event.currentTarget as HTMLInputElement).value)} /></label>
    </div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Interaction & Dialogue Pool</div>
    <label class="checkbox">
      <input
        type="checkbox"
        checked={interactive.enabled ?? false}
        on:change={(event) =>
          updateLevelSetting(
            ['fireflies', 'interactive', 'enabled'],
            (event.currentTarget as HTMLInputElement).checked,
          )}
      />
      Clickable Field Fireflies
    </label>
    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field"><span class="editor-field-label">Profile Chance</span><input class="tuple-input" type="number" min="0" max="1" step="0.01" value={interactive.profileChance ?? 0.15} on:change={(event) => updateLevelNumericSetting(['fireflies', 'interactive', 'profileChance'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Duration Ms</span><input class="tuple-input" type="number" min="0" step="250" value={interactive.durationMs ?? 4000} on:change={(event) => updateLevelNumericSetting(['fireflies', 'interactive', 'durationMs'], (event.currentTarget as HTMLInputElement).value)} /></label>
    </div>
    <label class="editor-field editor-mt-sm">
      <span class="editor-field-label">Profile Ids</span>
      <textarea rows="4" value={formatList(interactive.profileIds)} on:change={(event) => updateList(['fireflies', 'interactive', 'profileIds'], (event.currentTarget as HTMLTextAreaElement).value)}></textarea>
    </label>
    <label class="editor-field editor-mt-sm">
      <span class="editor-field-label">Lost Soul Responses</span>
      <textarea rows="6" value={formatList(interactive.lostSoulResponses)} on:change={(event) => updateList(['fireflies', 'interactive', 'lostSoulResponses'], (event.currentTarget as HTMLTextAreaElement).value)}></textarea>
    </label>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Palette</div>
    <textarea rows="4" value={formatList(fireflies.palette)} on:change={(event) => updateList(['fireflies', 'palette'], (event.currentTarget as HTMLTextAreaElement).value)}></textarea>
    <div class="save-message">Enter one color, profile id, or response per line. Commas are also accepted.</div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Quality Tiers</div>
    {#each qualityTiers as tier}
      <div class="editor-field-grid editor-mt-sm">
        <label class="editor-field"><span class="editor-field-label">{tier.label} Count</span><input class="tuple-input" type="number" step="1" value={fireflies.qualityTiers?.[tier.id]?.count ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'count'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Lights</span><input class="tuple-input" type="number" step="1" value={fireflies.qualityTiers?.[tier.id]?.lightCount ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lightCount'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Size</span><input class="tuple-input" type="number" step="0.05" value={fireflies.qualityTiers?.[tier.id]?.size ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'size'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Sprite</span><input class="tuple-input" type="number" step="0.05" value={fireflies.qualityTiers?.[tier.id]?.lighting?.spriteIntensity ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'spriteIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Light</span><input class="tuple-input" type="number" step="1" value={fireflies.qualityTiers?.[tier.id]?.lighting?.lightIntensity ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'lightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Range</span><input class="tuple-input" type="number" step="1" value={fireflies.qualityTiers?.[tier.id]?.lighting?.lightDistance ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'lightDistance'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Decay</span><input class="tuple-input" type="number" step="0.05" value={fireflies.qualityTiers?.[tier.id]?.lighting?.lightDecay ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'lightDecay'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Glow</span><input class="tuple-input" type="number" min="0" max="1" step="0.01" value={fireflies.qualityTiers?.[tier.id]?.lighting?.minimumLightIntensityScale ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'minimumLightIntensityScale'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="checkbox">
          <input
            type="checkbox"
            checked={fireflies.qualityTiers?.[tier.id]?.lighting?.lightBudgeted ?? true}
            on:change={(event) =>
              updateLevelSetting(
                ['fireflies', 'qualityTiers', tier.id, 'lighting', 'lightBudgeted'],
                (event.currentTarget as HTMLInputElement).checked,
              )}
          />
          {tier.label} Budgeted
        </label>
      </div>
    {/each}
  </div>
</div>
