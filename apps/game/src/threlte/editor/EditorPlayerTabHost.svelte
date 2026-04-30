<script lang="ts">
import EditorPlayerPanel from './EditorPlayerPanel.svelte'
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
</script>

<EditorPlayerPanel
  {levelId}
  {levelSettings}
  {updateLevelSetting}
  {updateLevelNumericSetting}
/>
