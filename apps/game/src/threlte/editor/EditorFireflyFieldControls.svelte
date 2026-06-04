<script lang="ts">
import {
  DEFAULT_SCENE_FIREFLY_LIGHTING,
  getSceneFireflyFieldCoverage,
  resolveSceneFireflyFieldQuality,
} from '../engine/sceneFireflyField'
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

function formatCoverageNumber(value: number) {
  if (!Number.isFinite(value)) return '0'
  return value >= 100 ? value.toFixed(0) : value.toFixed(1)
}

function normalizeActiveLightPercent(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(1, Math.max(0, value > 1 ? value / 100 : value))
}

function formatActiveLightPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  const percent = value * 100
  return percent >= 10
    ? percent.toFixed(1).replace(/\.0$/, '')
    : percent.toFixed(1)
}

function updateActiveLightPercent(path: Array<string | number>, value: string) {
  const percent = Number.parseFloat(value)
  updateLevelSetting(
    path,
    Number.isFinite(percent)
      ? Math.min(1, Math.max(0, percent / 100))
      : undefined,
  )
}

function getTierActiveLightPercent(tier: (typeof qualityTiers)[number]['id']) {
  const tierSettings = fireflies.qualityTiers?.[tier]
  return (
    normalizeActiveLightPercent(tierSettings?.activeLightPercent) ??
    normalizeActiveLightPercent(tierSettings?.lighting?.activeLightPercent)
  )
}

$: fireflies = levelSettings.fireflies ?? {}
$: fireflyLighting = fireflies.lighting ?? {}
$: interactive = fireflies.interactive ?? {}
$: fieldEnabled =
  fireflies.enabled ?? levelSettings.features?.fireflies ?? false
$: fieldCenter = fireflies.center ?? [0, 0, 0]
$: fieldCoverage = getSceneFireflyFieldCoverage({ radius: fireflies.radius })
$: fieldQuality = resolveSceneFireflyFieldQuality({
  settings: fireflies,
  qualityTier: 'high',
  defaultCount: 36,
  defaultLightCount: 8,
  defaultSize: 0.58,
  defaultSpriteIntensity: 1.45,
})
</script>

<div class="editor-section">
  <div class="label">NPC Firefly Field</div>
  <div class="editor-status-card">
    <div class="editor-status-title">
      {fieldEnabled ? 'Ambient NPC field enabled' : 'Ambient NPC field disabled'}
    </div>
    <div class="save-message">
      {fieldQuality.count} fireflies · {formatActiveLightPercent(fieldQuality.activeLightPercent)} active lights ({fieldQuality.activeLightCount}) · radius {formatCoverageNumber(fieldCoverage.radius)} · {fireflies.distribution ?? 'uniform'}
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
      <label class="editor-field"><span class="editor-field-label">Active Lights %</span><input class="tuple-input" type="number" min="0" max="100" step="1" value={formatActiveLightPercent(fieldQuality.activeLightPercent)} on:change={(event) => updateActiveLightPercent(['fireflies', 'activeLightPercent'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Coverage Radius</span><input class="tuple-input" type="number" step="1" value={fireflies.radius ?? 120} on:change={(event) => updateLevelNumericSetting(['fireflies', 'radius'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Distribution</span><select class="text-input" value={fireflies.distribution ?? 'uniform'} on:change={(event) => updateLevelSetting(['fireflies', 'distribution'], (event.currentTarget as HTMLSelectElement).value)}><option value="uniform">Uniform Coverage</option><option value="center-falloff">Center Falloff</option></select></label>
      <label class="editor-field"><span class="editor-field-label">Density Power</span><input class="tuple-input" type="number" step="0.1" min="0.1" value={fireflies.densityExponent ?? 0.5} on:change={(event) => updateLevelNumericSetting(['fireflies', 'densityExponent'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Min Height</span><input class="tuple-input" type="number" step="0.1" value={fireflies.minHeight ?? 2} on:change={(event) => updateLevelNumericSetting(['fireflies', 'minHeight'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Max Height</span><input class="tuple-input" type="number" step="0.1" value={fireflies.maxHeight ?? 5} on:change={(event) => updateLevelNumericSetting(['fireflies', 'maxHeight'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Center X</span><input class="tuple-input" type="number" step="0.1" value={fieldCenter[0]} on:change={(event) => updateLevelNumericSetting(['fireflies', 'center', 0], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Center Y</span><input class="tuple-input" type="number" step="0.1" value={fieldCenter[1]} on:change={(event) => updateLevelNumericSetting(['fireflies', 'center', 1], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Center Z</span><input class="tuple-input" type="number" step="0.1" value={fieldCenter[2]} on:change={(event) => updateLevelNumericSetting(['fireflies', 'center', 2], (event.currentTarget as HTMLInputElement).value)} /></label>
    </div>
    <div class="save-message">
      Footprint diameter {formatCoverageNumber(fieldCoverage.diameter)} · area {formatCoverageNumber(fieldCoverage.area)} · {fireflies.terrainFollow ? 'terrain-following heights' : 'fixed-height band'}
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
      <label class="editor-field"><span class="editor-field-label">Hold Seconds</span><input class="tuple-input" type="number" min="0" step="0.1" value={fireflyLighting.selectionHoldSeconds ?? 2.4} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'selectionHoldSeconds'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Fade Seconds</span><input class="tuple-input" type="number" min="0.05" step="0.05" value={fireflyLighting.selectionFadeSeconds ?? 0.9} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'selectionFadeSeconds'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Pulse Threshold</span><input class="tuple-input" type="number" min="0" max="0.95" step="0.01" value={fireflyLighting.pulseThreshold ?? 0.48} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'pulseThreshold'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Pulse Softness</span><input class="tuple-input" type="number" min="0.01" max="1" step="0.01" value={fireflyLighting.pulseSoftness ?? 0.72} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'pulseSoftness'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Blink Min</span><input class="tuple-input" type="number" min="0.25" step="0.1" value={fireflyLighting.blinkPeriodSecondsMin ?? DEFAULT_SCENE_FIREFLY_LIGHTING.blinkPeriodSecondsMin} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'blinkPeriodSecondsMin'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Blink Max</span><input class="tuple-input" type="number" min="0.25" step="0.1" value={fireflyLighting.blinkPeriodSecondsMax ?? DEFAULT_SCENE_FIREFLY_LIGHTING.blinkPeriodSecondsMax} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'blinkPeriodSecondsMax'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Blink Fade</span><input class="tuple-input" type="number" min="0.01" step="0.05" value={fireflyLighting.blinkFadeSeconds ?? DEFAULT_SCENE_FIREFLY_LIGHTING.blinkFadeSeconds} on:change={(event) => updateLevelNumericSetting(['fireflies', 'lighting', 'blinkFadeSeconds'], (event.currentTarget as HTMLInputElement).value)} /></label>
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
        <label class="editor-field"><span class="editor-field-label">{tier.label} Active %</span><input class="tuple-input" type="number" min="0" max="100" step="1" value={formatActiveLightPercent(getTierActiveLightPercent(tier.id))} on:change={(event) => updateActiveLightPercent(['fireflies', 'qualityTiers', tier.id, 'activeLightPercent'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Size</span><input class="tuple-input" type="number" step="0.05" value={fireflies.qualityTiers?.[tier.id]?.size ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'size'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Sprite</span><input class="tuple-input" type="number" step="0.05" value={fireflies.qualityTiers?.[tier.id]?.lighting?.spriteIntensity ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'spriteIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Light</span><input class="tuple-input" type="number" step="1" value={fireflies.qualityTiers?.[tier.id]?.lighting?.lightIntensity ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'lightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Range</span><input class="tuple-input" type="number" step="1" value={fireflies.qualityTiers?.[tier.id]?.lighting?.lightDistance ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'lightDistance'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Decay</span><input class="tuple-input" type="number" step="0.05" value={fireflies.qualityTiers?.[tier.id]?.lighting?.lightDecay ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'lightDecay'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Glow</span><input class="tuple-input" type="number" min="0" max="1" step="0.01" value={fireflies.qualityTiers?.[tier.id]?.lighting?.minimumLightIntensityScale ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'minimumLightIntensityScale'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Hold</span><input class="tuple-input" type="number" min="0" step="0.1" value={fireflies.qualityTiers?.[tier.id]?.lighting?.selectionHoldSeconds ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'selectionHoldSeconds'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Fade</span><input class="tuple-input" type="number" min="0.05" step="0.05" value={fireflies.qualityTiers?.[tier.id]?.lighting?.selectionFadeSeconds ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'selectionFadeSeconds'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Pulse</span><input class="tuple-input" type="number" min="0" max="0.95" step="0.01" value={fireflies.qualityTiers?.[tier.id]?.lighting?.pulseThreshold ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'pulseThreshold'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Soft</span><input class="tuple-input" type="number" min="0.01" max="1" step="0.01" value={fireflies.qualityTiers?.[tier.id]?.lighting?.pulseSoftness ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'lighting', 'pulseSoftness'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Blink Min</span><input class="tuple-input" type="number" min="0.25" step="0.1" value={fireflies.qualityTiers?.[tier.id]?.blinkPeriodSecondsMin ?? fireflies.qualityTiers?.[tier.id]?.lighting?.blinkPeriodSecondsMin ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'blinkPeriodSecondsMin'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Blink Max</span><input class="tuple-input" type="number" min="0.25" step="0.1" value={fireflies.qualityTiers?.[tier.id]?.blinkPeriodSecondsMax ?? fireflies.qualityTiers?.[tier.id]?.lighting?.blinkPeriodSecondsMax ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'blinkPeriodSecondsMax'], (event.currentTarget as HTMLInputElement).value)} /></label>
        <label class="editor-field"><span class="editor-field-label">{tier.label} Blink Fade</span><input class="tuple-input" type="number" min="0.01" step="0.05" value={fireflies.qualityTiers?.[tier.id]?.blinkFadeSeconds ?? fireflies.qualityTiers?.[tier.id]?.lighting?.blinkFadeSeconds ?? ''} on:change={(event) => updateLevelNumericSetting(['fireflies', 'qualityTiers', tier.id, 'blinkFadeSeconds'], (event.currentTarget as HTMLInputElement).value)} /></label>
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
