import type { Readable } from 'svelte/store'
import type { EditorMaterialData } from './editorTypes'

export const EDITOR_MATERIAL_OVERRIDE_CONTEXT = 'editor-material-override'

export type EditorMaterialOverrideStore = Readable<EditorMaterialData | null>
