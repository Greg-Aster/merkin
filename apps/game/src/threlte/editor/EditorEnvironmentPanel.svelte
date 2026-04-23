<script lang="ts">
  import type {
    EditorStylePreset,
    ObservatoryEditorSettings,
    SharedLevelEditorSettings,
    SolitudeEditorSettings,
  } from './editorTypes'
  import {
    observatoryAtmospherePresets,
    solitudeAtmospherePresets,
    solitudeAudioPresets,
  } from './editorLevelPresets'
  import { getSolitudeAtmosphereProfile } from '../styles/GameplayStyleProfiles'
  import EditorAtmospherePresetPicker from './EditorAtmospherePresetPicker.svelte'
  import EditorAmbientAudioPresetControls from './EditorAmbientAudioPresetControls.svelte'

  export let levelId: string
  export let levelSettings: SharedLevelEditorSettings
  export let effectiveObservatorySettings: ObservatoryEditorSettings
  export let effectiveSolitudeSettings: SolitudeEditorSettings
  export let observatoryStylePresets: EditorStylePreset[]
  export let ambientAudioLibrary: Array<{ label: string, src: string }>
  export let updateLevelSetting: (path: Array<string | number>, value: unknown) => void
  export let updateLevelNumericSetting: (path: Array<string | number>, value: string) => void
  export let updateObservatorySetting: (path: Array<string | number>, value: unknown) => void
  export let updateObservatoryNumericSetting: (path: Array<string | number>, value: string) => void
  export let applySolitudeAtmospherePreset: (presetId: string | undefined) => void = () => {}

  $: solitudeProfile = getSolitudeAtmosphereProfile(effectiveSolitudeSettings?.presets?.atmosphere)
</script>

<div class="editor-section">
  <div class="label">Environment</div>

  <div class="tuple-group">
    <div class="tuple-label">Features</div>
    <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.styles ?? true} on:change={(event) => updateLevelSetting(['features', 'styles'], (event.currentTarget as HTMLInputElement).checked)} /> Styles</label>
    <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.vegetation ?? false} on:change={(event) => updateLevelSetting(['features', 'vegetation'], (event.currentTarget as HTMLInputElement).checked)} /> Vegetation</label>
    <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.fireflies ?? false} on:change={(event) => updateLevelSetting(['features', 'fireflies'], (event.currentTarget as HTMLInputElement).checked)} /> Fireflies</label>
    <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.starMap ?? false} on:change={(event) => updateLevelSetting(['features', 'starMap'], (event.currentTarget as HTMLInputElement).checked)} /> Star Map / Navigation</label>
    <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.conversations ?? false} on:change={(event) => updateLevelSetting(['features', 'conversations'], (event.currentTarget as HTMLInputElement).checked)} /> Conversations</label>
    <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.water ?? false} on:change={(event) => updateLevelSetting(['features', 'water'], (event.currentTarget as HTMLInputElement).checked)} /> Water</label>
    <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.ambientParticles ?? false} on:change={(event) => updateLevelSetting(['features', 'ambientParticles'], (event.currentTarget as HTMLInputElement).checked)} /> Ambient Particles</label>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Skybox</div>
    <select class="text-input" value={levelSettings.skyboxPreset ?? 'observatory'} on:change={(event) => updateLevelSetting(['skyboxPreset'], (event.currentTarget as HTMLSelectElement).value)}>
      <option value="observatory">Observatory</option>
      <option value="classic">Classic</option>
    </select>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Global Fog</div>
    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field">
        <span class="editor-field-label">Fog Color</span>
        <input class="text-input" type="color" value={levelSettings.style?.fog?.color ?? '#7b8797'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Fog Density</span>
        <input class="tuple-input" type="number" step="0.0001" value={levelSettings.style?.fog?.density ?? 0.001} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} />
      </label>
    </div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Atmosphere FX</div>
    <div class="editor-field-grid editor-field-grid--triple editor-mt-sm">
      <label class="editor-field"><span class="editor-field-label">Bloom Intensity</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.style?.bloom?.intensity ?? 0.16} on:change={(event) => updateLevelNumericSetting(['style', 'bloom', 'intensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Bloom Threshold</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.style?.bloom?.threshold ?? 0.86} on:change={(event) => updateLevelNumericSetting(['style', 'bloom', 'threshold'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Haze Color</span><input class="text-input" type="color" value={levelSettings.style?.haze?.color ?? '#22174f'} on:input={(event) => updateLevelSetting(['style', 'haze', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Haze Density</span><input class="tuple-input" type="number" step="0.00005" value={levelSettings.style?.haze?.density ?? 0.00034} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'density'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Haze Floor</span><input class="tuple-input" type="number" step="0.1" value={levelSettings.style?.haze?.floor ?? 0.25} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'floor'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Haze Ceiling</span><input class="tuple-input" type="number" step="0.1" value={levelSettings.style?.haze?.ceiling ?? 11} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'ceiling'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Mist Opacity</span><input class="tuple-input" type="number" step="0.01" value={levelSettings.style?.haze?.mistOpacity ?? 0.18} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistOpacity'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Mist Layers</span><input class="tuple-input" type="number" step="1" value={levelSettings.style?.haze?.mistLayers ?? 4} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistLayers'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Mist Scale</span><input class="tuple-input" type="number" step="10" value={levelSettings.style?.haze?.mistScale ?? 380} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistScale'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Mist Drift</span><input class="tuple-input" type="number" step="0.01" value={levelSettings.style?.haze?.mistDriftSpeed ?? 0.055} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistDriftSpeed'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Saturation</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.style?.colorGrading?.saturation ?? 1.18} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'saturation'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Contrast</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.style?.colorGrading?.contrast ?? 1.12} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'contrast'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Brightness</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.style?.colorGrading?.brightness ?? 0.92} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'brightness'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Warmth</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.style?.colorGrading?.warmth ?? 0.9} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'warmth'], (event.currentTarget as HTMLInputElement).value)} /></label>
    </div>
    <div class="save-message">These controls drive the runtime atmosphere directly: fog, low haze, mist, color grading, and bloom. Ambient occlusion is not wired into the live renderer yet.</div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">Global Lighting</div>
    <div class="editor-field-grid editor-field-grid--triple editor-mt-sm">
      <label class="editor-field"><span class="editor-field-label">Ambient</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.ambientIntensity ?? 0.75} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Key</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.keyLightIntensity ?? 0.7} on:change={(event) => updateLevelNumericSetting(['lighting', 'keyLightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="editor-field"><span class="editor-field-label">Fill</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.fillLightIntensity ?? 0.22} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillLightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
    </div>
  </div>

  {#if levelId === 'observatory'}
    <div class="editor-section">
      <div class="label">Observatory</div>

      <div class="tuple-group">
        <div class="tuple-label">Features</div>
        <label class="checkbox"><input type="checkbox" checked={effectiveObservatorySettings.features?.ocean ?? true} on:change={(event) => updateLevelSetting(['features', 'ocean'], (event.currentTarget as HTMLInputElement).checked)} /> Ocean</label>
        <label class="checkbox"><input type="checkbox" checked={effectiveObservatorySettings.features?.vegetation ?? true} on:change={(event) => updateLevelSetting(['features', 'vegetation'], (event.currentTarget as HTMLInputElement).checked)} /> Vegetation</label>
        <label class="checkbox"><input type="checkbox" checked={effectiveObservatorySettings.features?.fireflies ?? true} on:change={(event) => updateLevelSetting(['features', 'fireflies'], (event.currentTarget as HTMLInputElement).checked)} /> Fireflies</label>
        <label class="checkbox"><input type="checkbox" checked={effectiveObservatorySettings.features?.starMap ?? true} on:change={(event) => updateLevelSetting(['features', 'starMap'], (event.currentTarget as HTMLInputElement).checked)} /> Star Map</label>
        <label class="checkbox"><input type="checkbox" checked={effectiveObservatorySettings.features?.conversations ?? true} on:change={(event) => updateLevelSetting(['features', 'conversations'], (event.currentTarget as HTMLInputElement).checked)} /> Conversations</label>
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Style</div>
        <EditorAtmospherePresetPicker
          value={effectiveObservatorySettings.presets?.atmosphere ?? ''}
          presets={observatoryAtmospherePresets}
          message="Atmosphere presets seed the shared mood controls while individual tweaks remain as overrides."
          on:presetChange={(event) => updateLevelSetting(['presets', 'atmosphere'], event.detail)}
        />
        <select class="text-input" value={effectiveObservatorySettings.style?.preset ?? 'ghibli'} on:change={(event) => updateLevelSetting(['style', 'preset'], (event.currentTarget as HTMLSelectElement).value)}>
          {#each observatoryStylePresets as preset}
            <option value={preset}>{preset}</option>
          {/each}
        </select>
        <label class="checkbox"><input type="checkbox" checked={effectiveObservatorySettings.style?.enabled ?? true} on:change={(event) => updateLevelSetting(['style', 'enabled'], (event.currentTarget as HTMLInputElement).checked)} /> Toon / Stylized Lighting</label>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Fog Color</span><input class="text-input" type="color" value={effectiveObservatorySettings.style?.fog?.color ?? '#87CEEB'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Fog Density</span><input class="tuple-input" type="number" step="0.0005" value={effectiveObservatorySettings.style?.fog?.density ?? 0.002} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Saturation</span><input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.colorGrading?.saturation ?? 1.2} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'saturation'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Contrast</span><input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.colorGrading?.contrast ?? 1.1} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'contrast'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Brightness</span><input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.colorGrading?.brightness ?? 1} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'brightness'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Warmth</span><input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.colorGrading?.warmth ?? 1.05} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'warmth'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Bloom Intensity</span><input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.bloom?.intensity ?? 0.3} on:change={(event) => updateLevelNumericSetting(['style', 'bloom', 'intensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Bloom Threshold</span><input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.bloom?.threshold ?? 0.9} on:change={(event) => updateLevelNumericSetting(['style', 'bloom', 'threshold'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
      </div>
    </div>

  {:else if levelId === 'solitude'}
    <div class="editor-section">
      <div class="label">Solitude</div>

      <div class="tuple-group">
        <div class="tuple-label">Atmosphere</div>
        <EditorAtmospherePresetPicker
          value={effectiveSolitudeSettings.presets?.atmosphere ?? ''}
          presets={solitudeAtmospherePresets}
          message="Atmosphere presets seed fog, lighting, particles, water, bloom, and haze. Manual edits remain as overrides."
          on:presetChange={(event) => applySolitudeAtmospherePreset(event.detail)}
        />
        <select class="text-input" value={effectiveSolitudeSettings.style?.preset ?? 'surreal-site'} on:change={(event) => updateLevelSetting(['style', 'preset'], (event.currentTarget as HTMLSelectElement).value)}>
          {#each observatoryStylePresets as preset}
            <option value={preset}>{preset}</option>
          {/each}
        </select>

        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Fog Color</span><input class="text-input" type="color" value={effectiveSolitudeSettings.style?.fog?.color ?? '#43206c'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Fog Density</span><input class="tuple-input" type="number" step="0.00005" value={effectiveSolitudeSettings.style?.fog?.density ?? 0.00092} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>

        <div class="editor-field-grid editor-field-grid--triple editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Ambient Light</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.lighting?.ambientIntensity ?? 0.46} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Key Light</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.lighting?.keyLightIntensity ?? 0.96} on:change={(event) => updateLevelNumericSetting(['lighting', 'keyLightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Fill Light</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.lighting?.fillLightIntensity ?? 0.34} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillLightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>

        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Saturation</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.style?.colorGrading?.saturation ?? 1.24} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'saturation'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Contrast</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.style?.colorGrading?.contrast ?? 1.18} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'contrast'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Brightness</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.style?.colorGrading?.brightness ?? 0.87} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'brightness'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Warmth</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.style?.colorGrading?.warmth ?? 0.86} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'warmth'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>

        <div class="tuple-label editor-mt-sm">Real Bloom</div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Bloom Intensity</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.style?.bloom?.intensity ?? 0.18} on:change={(event) => updateLevelNumericSetting(['style', 'bloom', 'intensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Bloom Threshold</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.style?.bloom?.threshold ?? 0.9} on:change={(event) => updateLevelNumericSetting(['style', 'bloom', 'threshold'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>

        <div class="tuple-label editor-mt-sm">Real Haze</div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Haze Color</span><input class="text-input" type="color" value={effectiveSolitudeSettings.style?.haze?.color ?? solitudeProfile.runtime.heightFog?.color ?? '#231150'} on:input={(event) => updateLevelSetting(['style', 'haze', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Extra Density</span><input class="tuple-input" type="number" step="0.00005" value={effectiveSolitudeSettings.style?.haze?.density ?? solitudeProfile.runtime.heightFog?.density ?? 0.0005} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'density'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Floor</span><input class="tuple-input" type="number" step="0.1" value={effectiveSolitudeSettings.style?.haze?.floor ?? solitudeProfile.runtime.heightFog?.floor ?? 0.2} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'floor'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Ceiling</span><input class="tuple-input" type="number" step="0.1" value={effectiveSolitudeSettings.style?.haze?.ceiling ?? solitudeProfile.runtime.heightFog?.ceiling ?? 10} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'ceiling'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Mist Opacity</span><input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.style?.haze?.mistOpacity ?? solitudeProfile.runtime.heightFog?.mistOpacity ?? 0.18} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistOpacity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Mist Layers</span><input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.style?.haze?.mistLayers ?? solitudeProfile.runtime.heightFog?.mistLayers ?? 4} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistLayers'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Mist Height</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.style?.haze?.mistHeight ?? solitudeProfile.runtime.heightFog?.mistHeight ?? 0.55} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistHeight'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Mist Spacing</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.style?.haze?.mistSpacing ?? solitudeProfile.runtime.heightFog?.mistSpacing ?? 0.45} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistSpacing'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Mist Scale</span><input class="tuple-input" type="number" step="10" value={effectiveSolitudeSettings.style?.haze?.mistScale ?? solitudeProfile.runtime.heightFog?.mistScale ?? 420} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistScale'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Mist Drift</span><input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.style?.haze?.mistDriftSpeed ?? solitudeProfile.runtime.heightFog?.mistDriftSpeed ?? 0.06} on:change={(event) => updateLevelNumericSetting(['style', 'haze', 'mistDriftSpeed'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Water</div>
        <div class="editor-field-grid">
          <label class="editor-field"><span class="editor-field-label">Water Level</span><input class="tuple-input" type="number" step="0.1" value={effectiveSolitudeSettings.water?.level ?? -0.16} on:change={(event) => updateLevelNumericSetting(['water', 'level'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Water Color</span><input class="text-input" type="color" value={effectiveSolitudeSettings.water?.color ?? '#425d72'} on:input={(event) => updateLevelSetting(['water', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Width</span><input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.water?.size?.width ?? 800} on:change={(event) => updateLevelNumericSetting(['water', 'size', 'width'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Height</span><input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.water?.size?.height ?? 800} on:change={(event) => updateLevelNumericSetting(['water', 'size', 'height'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Opacity</span><input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.water?.opacity ?? 0.86} on:change={(event) => updateLevelNumericSetting(['water', 'opacity'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
        <label class="checkbox"><input type="checkbox" checked={effectiveSolitudeSettings.water?.enableAnimation ?? true} on:change={(event) => updateLevelSetting(['water', 'enableAnimation'], (event.currentTarget as HTMLInputElement).checked)} /> Animate Water</label>
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Ambient Particles</div>
        <label class="checkbox"><input type="checkbox" checked={effectiveSolitudeSettings.features?.ambientParticles ?? true} on:change={(event) => updateLevelSetting(['features', 'ambientParticles'], (event.currentTarget as HTMLInputElement).checked)} /> Enable Ambient Field</label>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Count</span><input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.ambientParticles?.count ?? 180} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'count'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Radius</span><input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.ambientParticles?.radius ?? 140} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'radius'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Min Height</span><input class="tuple-input" type="number" step="0.1" value={effectiveSolitudeSettings.ambientParticles?.minHeight ?? 0.8} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'minHeight'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Max Height</span><input class="tuple-input" type="number" step="0.1" value={effectiveSolitudeSettings.ambientParticles?.maxHeight ?? 18} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'maxHeight'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Primary Color</span><input class="text-input" type="color" value={effectiveSolitudeSettings.ambientParticles?.color ?? '#b8d9ff'} on:input={(event) => updateLevelSetting(['ambientParticles', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Accent Color</span><input class="text-input" type="color" value={effectiveSolitudeSettings.ambientParticles?.secondaryColor ?? '#f3e8b2'} on:input={(event) => updateLevelSetting(['ambientParticles', 'secondaryColor'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Size</span><input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.ambientParticles?.size ?? 1.15} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'size'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Opacity</span><input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.ambientParticles?.opacity ?? 0.26} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'opacity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Drift</span><input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.ambientParticles?.driftSpeed ?? 0.22} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'driftSpeed'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Sway</span><input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.ambientParticles?.sway ?? 0.85} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'sway'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
        <div class="save-message">Use this for drifting dust, glowing motes, ash, snow-like ambience, or atmospheric sparkle.</div>
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Ambient Audio</div>
        <EditorAmbientAudioPresetControls
          presetValue={effectiveSolitudeSettings.presets?.audio ?? ''}
          presets={solitudeAudioPresets}
          enabled={effectiveSolitudeSettings.ambientAudio?.enabled ?? false}
          track={effectiveSolitudeSettings.ambientAudio?.track ?? ambientAudioLibrary[0].src}
          volume={effectiveSolitudeSettings.ambientAudio?.volume ?? 0.2}
          falloff={effectiveSolitudeSettings.ambientAudio?.falloff ?? 36}
          audioLibrary={ambientAudioLibrary}
          message="Audio presets add a large ambient region across Solitude. Authored `Audio Region` nodes still layer on top for local mood."
          on:presetChange={(event) => updateLevelSetting(['presets', 'audio'], event.detail)}
          on:enabledChange={(event) => updateLevelSetting(['ambientAudio', 'enabled'], event.detail)}
          on:trackChange={(event) => updateLevelSetting(['ambientAudio', 'track'], event.detail)}
          on:volumeChange={(event) => updateLevelNumericSetting(['ambientAudio', 'volume'], event.detail)}
          on:falloffChange={(event) => updateLevelNumericSetting(['ambientAudio', 'falloff'], event.detail)}
        />
      </div>

      <div class="save-message">Use the GLB / glTF Library below for authored models. Monolith and Broken Ring prefabs are quick ruin-building pieces.</div>
    </div>

  {:else if levelId === 'sci-fi-room'}
    <div class="editor-section">
      <div class="label">Sci Fi Room</div>
      <div class="tuple-group">
        <div class="tuple-label">Skybox</div>
        <select class="text-input" value={levelSettings.skyboxPreset ?? 'observatory'} on:change={(event) => updateLevelSetting(['skyboxPreset'], (event.currentTarget as HTMLSelectElement).value)}>
          <option value="observatory">Observatory</option>
          <option value="classic">Classic</option>
        </select>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Room Features</div>
        <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.starMap ?? true} on:change={(event) => updateLevelSetting(['features', 'starMap'], (event.currentTarget as HTMLInputElement).checked)} /> Star Navigation</label>
        <label class="checkbox"><input type="checkbox" checked={levelSettings.features?.styles ?? true} on:change={(event) => updateLevelSetting(['features', 'styles'], (event.currentTarget as HTMLInputElement).checked)} /> Stylized Look</label>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Atmosphere</div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Fog Color</span><input class="text-input" type="color" value={levelSettings.style?.fog?.color ?? '#5f76a8'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Fog Density</span><input class="tuple-input" type="number" step="0.0001" value={levelSettings.style?.fog?.density ?? 0.0035} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
        <div class="editor-field-grid editor-field-grid--triple editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Ambient</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.ambientIntensity ?? 1.25} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Key</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.keyLightIntensity ?? 0.55} on:change={(event) => updateLevelNumericSetting(['lighting', 'keyLightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Fill</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.fillLightIntensity ?? 0.2} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillLightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
      </div>
      <div class="save-message">Sci Fi Room now reads shared editor environment settings for spawn, skybox, fog, lighting, and star navigation.</div>
    </div>

  {:else if levelId === 'miranda'}
    <div class="editor-section">
      <div class="label">Miranda Wreck</div>
      <div class="tuple-group">
        <div class="tuple-label">Skybox</div>
        <select class="text-input" value={levelSettings.skyboxPreset ?? 'observatory'} on:change={(event) => updateLevelSetting(['skyboxPreset'], (event.currentTarget as HTMLSelectElement).value)}>
          <option value="observatory">Observatory</option>
          <option value="classic">Classic</option>
        </select>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Ship Atmosphere</div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Fog Color</span><input class="text-input" type="color" value={levelSettings.style?.fog?.color ?? '#080b12'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Fog Density</span><input class="tuple-input" type="number" step="0.0001" value={levelSettings.style?.fog?.density ?? 0.017} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
        <div class="editor-field-grid editor-field-grid--triple editor-mt-sm">
          <label class="editor-field"><span class="editor-field-label">Ambient</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.ambientIntensity ?? 0.38} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Key</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.keyLightIntensity ?? 1.15} on:change={(event) => updateLevelNumericSetting(['lighting', 'keyLightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
          <label class="editor-field"><span class="editor-field-label">Fill</span><input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.fillLightIntensity ?? 0.42} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillLightIntensity'], (event.currentTarget as HTMLInputElement).value)} /></label>
        </div>
      </div>
      <div class="save-message">Miranda now reads shared editor environment settings for spawn, skybox, fog, and its primary light stack.</div>
    </div>
  {/if}
</div>
