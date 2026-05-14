export type {
  EditorAssetData,
  EditorAtmospherePresetId,
  EditorAudioPresetId,
  EditorGenerationData,
  EditorGameplayData,
  EditorLightData,
  EditorMaterialData,
  EditorNodeCollisionData,
  EditorNodeKind,
  EditorNodePhysicsData,
  EditorPrefabData,
  EditorPrefabType,
  EditorPrimitiveData,
  EditorRenderPolicyData,
  EditorRigidBodyType,
  EditorSceneDocument,
  EditorSceneNode,
  EditorSceneSettings,
  EditorStylePreset,
  LevelCollisionBudget,
  LevelCollisionRoleSettings,
  LevelCollisionWorkflowSettings,
  ObservatoryEditorSettings,
  SharedLevelAmbientAudioSettings,
  SharedLevelAmbientParticleSettings,
  SharedLevelCollisionSettings,
  SharedLevelEditorSettings,
  SharedLevelFeatureSettings,
  SharedLevelGraphicsBudgetSettings,
  SharedLevelLightingSettings,
  SharedLevelPlayerSettings,
  SharedLevelPresetSettings,
  SharedLevelSkyboxSettings,
  SharedLevelSpawnSettings,
  SharedLevelStyleSettings,
  SharedLevelTerrainMigrationSettings,
  SharedLevelTerrainSculptSettings,
  SharedLevelWaterSettings,
  SolitudeEditorSettings,
  TerrainMigrationSettings,
  TerrainMigrationStatus,
} from '../engine/sceneDocumentTypes'

export type EditorTransformMode = 'translate' | 'rotate' | 'scale'
export type EditorObjectToolMode = 'select' | 'translate' | 'rotate' | 'scale'
export type EditorSpace = 'world' | 'local'
export type EditorTransformAxis = 'all' | 'x' | 'y' | 'z'
export type EditorInteractionMode = 'objects' | 'terrain'
export type EditorTerrainBrushMode = 'raise' | 'smooth' | 'flatten'
export type EditorViewportMode = 'edit' | 'playtest'
export type EditorViewportLightingMode = 'authored' | 'workbench'
export type EditorViewportShadingMode = 'rendered' | 'solid' | 'wireframe'
export type EditorLayoutPreset =
  | 'default'
  | 'create'
  | 'collision'
  | 'build'
  | 'minimal-viewport'

export interface EditorState {
  enabled: boolean
  layoutPreset: EditorLayoutPreset
  responsiveSplitPinned: boolean
  panelOpen: boolean
  propertiesShelfOpen: boolean
  outlinerOpen: boolean
  controlsOverlayOpen: boolean
  toolsDockWidth: number
  toolsDockHeight: number
  sideDockWidth: number
  sideDockHeight: number
  sideStackSplitRatio: number
  layoutCustomized: boolean
  dockHeightCustomized: boolean
  currentLevelId: string | null
  selectedNodeId: string | null
  selectedNodeIds: string[]
  isolatedNodeIds: string[]
  selectionAnchorId: string | null
  viewportMode: EditorViewportMode
  interactionMode: EditorInteractionMode
  viewportLightingMode: EditorViewportLightingMode
  viewportShadingMode: EditorViewportShadingMode
  objectToolMode: EditorObjectToolMode
  transformMode: EditorTransformMode
  transformSpace: EditorSpace
  transformAxis: EditorTransformAxis
  modalTransformActive: boolean
  collisionOverlayEnabled: boolean
  terrainBrushMode: EditorTerrainBrushMode
  terrainBrushSize: number
  terrainBrushStrength: number
  terrainBrushFalloff: number
  orbitEnabled: boolean
  snappingEnabled: boolean
  translateSnap: number
  rotateSnap: number
  scaleSnap: number
  surfaceSnapEnabled: boolean
  surfaceSnapOffset: number
  dirty: boolean
  lastSavedAt: string | null
}

export interface EditorMarqueeState {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export interface EditorCircleSelectState {
  active: boolean
  x: number
  y: number
  radius: number
  selecting: boolean
  subtracting: boolean
}
