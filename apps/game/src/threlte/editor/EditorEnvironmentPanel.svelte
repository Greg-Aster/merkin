<script lang="ts">
  import type { EditorStylePreset, ObservatoryEditorSettings, SharedLevelEditorSettings, SolitudeEditorSettings } from './editorTypes'
  import {
    observatoryAtmospherePresets,
    solitudeAtmospherePresets,
    solitudeAudioPresets,
  } from './editorLevelPresets'
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

  function getDefaultSpawnPositionForLevel(levelId: string): [number, number, number] {
    if (levelId === 'sci-fi-room') return [0, 1, 0]
    if (levelId === 'miranda') return [0, 4.25, -13.8]
    if (levelId === 'solitude') return [0, 2.4, -24]
    return [0, 18, -50]
  }
</script>

<div class="editor-section">
  <div class="label">Environment</div>
  <div class="tuple-group">
    <div class="tuple-label">Spawn Position</div>
    <div class="tuple-row">
      {#each [0, 1, 2] as index}
        <input
          class="tuple-input"
          type="number"
          step="0.1"
          value={levelSettings.spawn?.position?.[index] ?? getDefaultSpawnPositionForLevel(levelId)[index]}
          on:change={(event) => updateLevelNumericSetting(['spawn', 'position', index], (event.currentTarget as HTMLInputElement).value)}
        />
      {/each}
    </div>
  </div>
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
    <div class="tuple-label">Fog</div>
    <div class="tuple-row compact-two" style="margin-top:0.45rem;">
      <input class="text-input" type="color" value={levelSettings.style?.fog?.color ?? '#7b8797'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} />
      <input class="tuple-input" type="number" step="0.0001" value={levelSettings.style?.fog?.density ?? 0.001} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} />
    </div>
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Lighting</div>
    <div class="tuple-row compact-two" style="margin-top:0.45rem;">
      <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.ambientIntensity ?? 0.75} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} />
      <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.keyLightIntensity ?? 0.7} on:change={(event) => updateLevelNumericSetting(['lighting', 'keyLightIntensity'], (event.currentTarget as HTMLInputElement).value)} />
      <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.fillLightIntensity ?? 0.22} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillLightIntensity'], (event.currentTarget as HTMLInputElement).value)} />
    </div>
  </div>
  <div class="save-message">Shared scene/environment controls for every level. Individual levels may only use a subset of these settings.</div>
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
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="text-input" type="color" value={effectiveObservatorySettings.style?.fog?.color ?? '#87CEEB'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.0005" value={effectiveObservatorySettings.style?.fog?.density ?? 0.002} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.colorGrading?.saturation ?? 1.2} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'saturation'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.colorGrading?.contrast ?? 1.1} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'contrast'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.colorGrading?.brightness ?? 1} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'brightness'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.colorGrading?.warmth ?? 1.05} on:change={(event) => updateLevelNumericSetting(['style', 'colorGrading', 'warmth'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.bloom?.intensity ?? 0.3} on:change={(event) => updateLevelNumericSetting(['style', 'bloom', 'intensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.style?.bloom?.threshold ?? 0.9} on:change={(event) => updateLevelNumericSetting(['style', 'bloom', 'threshold'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
    </div>

    <div class="tuple-group">
      <div class="tuple-label">Lighting</div>
      <div class="tuple-row compact-two">
        <input class="tuple-input" type="number" step="0.1" value={effectiveObservatorySettings.lighting?.ambientIntensity ?? 10.4} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.lighting?.sunIntensity ?? 0.8} on:change={(event) => updateLevelNumericSetting(['lighting', 'sunIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveObservatorySettings.lighting?.fillIntensity ?? 0.3} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.1" value={effectiveObservatorySettings.lighting?.fallbackAmbientIntensity ?? 4.8} on:change={(event) => updateLevelNumericSetting(['lighting', 'fallbackAmbientIntensity'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
    </div>

    <div class="tuple-group">
      <div class="tuple-label">Ocean</div>
      <div class="tuple-row compact-two">
        <input class="tuple-input" type="number" step="1" value={effectiveObservatorySettings.ocean?.size?.width ?? 4000} on:change={(event) => updateObservatoryNumericSetting(['ocean', 'size', 'width'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="1" value={effectiveObservatorySettings.ocean?.size?.height ?? 4000} on:change={(event) => updateObservatoryNumericSetting(['ocean', 'size', 'height'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.1" value={effectiveObservatorySettings.ocean?.initialLevel ?? -2} on:change={(event) => updateObservatoryNumericSetting(['ocean', 'initialLevel'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.1" value={effectiveObservatorySettings.ocean?.targetLevel ?? 5} on:change={(event) => updateObservatoryNumericSetting(['ocean', 'targetLevel'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.001" value={effectiveObservatorySettings.ocean?.riseRate ?? 0.01} on:change={(event) => updateObservatoryNumericSetting(['ocean', 'riseRate'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.001" value={effectiveObservatorySettings.ocean?.underwaterFogDensity ?? 0.1} on:change={(event) => updateObservatoryNumericSetting(['ocean', 'underwaterFogDensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.001" value={effectiveObservatorySettings.ocean?.surfaceFogDensity ?? 0.001} on:change={(event) => updateObservatoryNumericSetting(['ocean', 'surfaceFogDensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="1" value={effectiveObservatorySettings.ocean?.underwaterFogColor ?? 533536} on:change={(event) => updateObservatoryNumericSetting(['ocean', 'underwaterFogColor'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
      <label class="checkbox"><input type="checkbox" checked={effectiveObservatorySettings.ocean?.enableAnimation ?? true} on:change={(event) => updateObservatorySetting(['ocean', 'enableAnimation'], (event.currentTarget as HTMLInputElement).checked)} /> Animate Ocean</label>
      <label class="checkbox"><input type="checkbox" checked={effectiveObservatorySettings.ocean?.enableRising ?? true} on:change={(event) => updateObservatorySetting(['ocean', 'enableRising'], (event.currentTarget as HTMLInputElement).checked)} /> Rising Water</label>
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
        message="Atmosphere presets seed fog, lighting, particles, and water. Manual edits remain as overrides."
        on:presetChange={(event) => updateLevelSetting(['presets', 'atmosphere'], event.detail)}
      />
      <select class="text-input" value={levelSettings.skyboxPreset ?? 'observatory'} on:change={(event) => updateLevelSetting(['skyboxPreset'], (event.currentTarget as HTMLSelectElement).value)}>
        <option value="observatory">Observatory Starfield</option>
        <option value="classic">Classic Cubemap</option>
      </select>
      <select class="text-input" value={effectiveSolitudeSettings.style?.preset ?? 'monument'} on:change={(event) => updateLevelSetting(['style', 'preset'], (event.currentTarget as HTMLSelectElement).value)}>
        {#each observatoryStylePresets as preset}
          <option value={preset}>{preset}</option>
        {/each}
      </select>
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="text-input" type="color" value={effectiveSolitudeSettings.style?.fog?.color ?? '#7b8797'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.00005" value={effectiveSolitudeSettings.style?.fog?.density ?? 0.00045} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.lighting?.ambientIntensity ?? 0.75} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.lighting?.keyLightIntensity ?? 0.7} on:change={(event) => updateLevelNumericSetting(['lighting', 'keyLightIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.lighting?.fillLightIntensity ?? 0.22} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillLightIntensity'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
    </div>

    <div class="tuple-group">
      <div class="tuple-label">Water</div>
      <div class="tuple-row compact-two">
        <input class="tuple-input" type="number" step="0.1" value={effectiveSolitudeSettings.water?.level ?? -0.16} on:change={(event) => updateLevelNumericSetting(['water', 'level'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="text-input" type="color" value={effectiveSolitudeSettings.water?.color ?? '#425d72'} on:input={(event) => updateLevelSetting(['water', 'color'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.water?.size?.width ?? 800} on:change={(event) => updateLevelNumericSetting(['water', 'size', 'width'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.water?.size?.height ?? 800} on:change={(event) => updateLevelNumericSetting(['water', 'size', 'height'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.water?.opacity ?? 0.86} on:change={(event) => updateLevelNumericSetting(['water', 'opacity'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
      <label class="checkbox"><input type="checkbox" checked={effectiveSolitudeSettings.water?.enableAnimation ?? true} on:change={(event) => updateLevelSetting(['water', 'enableAnimation'], (event.currentTarget as HTMLInputElement).checked)} /> Animate Water</label>
    </div>

    <div class="tuple-group">
      <div class="tuple-label">Ambient Particles</div>
      <label class="checkbox"><input type="checkbox" checked={effectiveSolitudeSettings.features?.ambientParticles ?? true} on:change={(event) => updateLevelSetting(['features', 'ambientParticles'], (event.currentTarget as HTMLInputElement).checked)} /> Enable Ambient Field</label>
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.ambientParticles?.count ?? 180} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'count'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="1" value={effectiveSolitudeSettings.ambientParticles?.radius ?? 140} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'radius'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.1" value={effectiveSolitudeSettings.ambientParticles?.minHeight ?? 0.8} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'minHeight'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.1" value={effectiveSolitudeSettings.ambientParticles?.maxHeight ?? 18} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'maxHeight'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="text-input" type="color" value={effectiveSolitudeSettings.ambientParticles?.color ?? '#b8d9ff'} on:input={(event) => updateLevelSetting(['ambientParticles', 'color'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="text-input" type="color" value={effectiveSolitudeSettings.ambientParticles?.secondaryColor ?? '#f3e8b2'} on:input={(event) => updateLevelSetting(['ambientParticles', 'secondaryColor'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={effectiveSolitudeSettings.ambientParticles?.size ?? 1.15} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'size'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.ambientParticles?.opacity ?? 0.26} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'opacity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.ambientParticles?.driftSpeed ?? 0.22} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'driftSpeed'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.01" value={effectiveSolitudeSettings.ambientParticles?.sway ?? 0.85} on:change={(event) => updateLevelNumericSetting(['ambientParticles', 'sway'], (event.currentTarget as HTMLInputElement).value)} />
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
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="text-input" type="color" value={levelSettings.style?.fog?.color ?? '#5f76a8'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.0001" value={levelSettings.style?.fog?.density ?? 0.0035} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.ambientIntensity ?? 1.25} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.keyLightIntensity ?? 0.55} on:change={(event) => updateLevelNumericSetting(['lighting', 'keyLightIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.fillLightIntensity ?? 0.2} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillLightIntensity'], (event.currentTarget as HTMLInputElement).value)} />
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
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="text-input" type="color" value={levelSettings.style?.fog?.color ?? '#080b12'} on:input={(event) => updateLevelSetting(['style', 'fog', 'color'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.0001" value={levelSettings.style?.fog?.density ?? 0.017} on:change={(event) => updateLevelNumericSetting(['style', 'fog', 'density'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row compact-two" style="margin-top:0.45rem;">
        <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.ambientIntensity ?? 0.38} on:change={(event) => updateLevelNumericSetting(['lighting', 'ambientIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.keyLightIntensity ?? 1.15} on:change={(event) => updateLevelNumericSetting(['lighting', 'keyLightIntensity'], (event.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={levelSettings.lighting?.fillLightIntensity ?? 0.42} on:change={(event) => updateLevelNumericSetting(['lighting', 'fillLightIntensity'], (event.currentTarget as HTMLInputElement).value)} />
      </div>
    </div>
    <div class="save-message">Miranda now reads shared editor environment settings for spawn, skybox, fog, and its primary light stack.</div>
  </div>
{/if}
