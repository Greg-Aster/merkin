<script lang="ts">
import EditorPlayerPanel from './EditorPlayerPanel.svelte'
import type { SharedLevelEditorSettings } from './editorTypes'

export let levelSettings: SharedLevelEditorSettings
export let updateLevelNumericSetting: (
  path: Array<string | number>,
  value: string,
) => void
export let updateLevelSetting: (
  path: Array<string | number>,
  value: unknown,
) => void
</script>

<EditorPlayerPanel
  {levelSettings}
  {updateLevelSetting}
  {updateLevelNumericSetting}
/>
