<script lang="ts">
import EditorPlayerPanel from './EditorPlayerPanel.svelte'
import type { SharedLevelEditorSettings } from './editorTypes'

export let levelSettings: SharedLevelEditorSettings
export let updateLevelNumericSetting: (
  path: Array<string | number>,
  value: string,
) => void
</script>

<EditorPlayerPanel
  {levelSettings}
  {updateLevelNumericSetting}
/>
