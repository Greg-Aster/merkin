import type { Readable } from 'svelte/store'
import type { SceneMaterialData } from '../engine/sceneDocumentTypes'

export const EDITOR_MATERIAL_OVERRIDE_CONTEXT = 'editor-material-override'

export type EditorMaterialOverrideStore = Readable<SceneMaterialData | null>
