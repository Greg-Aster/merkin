<script lang="ts">
import EditorEnvironmentPanel from './EditorEnvironmentPanel.svelte'
import type {
  EditorStylePreset,
  EditorViewportLightingMode,
  EditorViewportShadingMode,
  ObservatoryEditorSettings,
  SharedLevelEditorSettings,
  SolitudeEditorSettings,
} from './editorTypes'

export let levelSettings: SharedLevelEditorSettings
export let effectiveObservatorySettings: ObservatoryEditorSettings
export let effectiveSolitudeSettings: SolitudeEditorSettings
export let observatoryStylePresets: EditorStylePreset[]
export let ambientAudioLibrary: Array<{ label: string; src: string }>
export let updateLevelSetting: (
  path: Array<string | number>,
  value: unknown,
) => void
export let updateLevelNumericSetting: (
  path: Array<string | number>,
  value: string,
) => void
export let applySolitudeAtmospherePreset: (
  presetId: string | undefined,
) => void = () => {}
export let viewportLightingMode: EditorViewportLightingMode = 'authored'
export let viewportShadingMode: EditorViewportShadingMode = 'rendered'
export let onSetViewportLightingMode: (
  mode: EditorViewportLightingMode,
) => void = () => {}
export let onSetViewportShadingMode: (mode: EditorViewportShadingMode) => void =
  () => {}
</script>

<EditorEnvironmentPanel
  {levelSettings}
  {effectiveObservatorySettings}
  {effectiveSolitudeSettings}
  {observatoryStylePresets}
  {ambientAudioLibrary}
  {updateLevelSetting}
  {updateLevelNumericSetting}
  {applySolitudeAtmospherePreset}
  {viewportLightingMode}
  {viewportShadingMode}
  {onSetViewportLightingMode}
  {onSetViewportShadingMode}
/>
