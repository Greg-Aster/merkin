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
  LevelCollisionDefaultPolicy,
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
  SharedLevelTerrainSculptSettings,
  SharedLevelWaterSettings,
  SolitudeEditorSettings,
} from '../engine/sceneDocumentTypes'

export type EditorTransformMode = 'translate' | 'rotate' | 'scale'
export type EditorSpace = 'world' | 'local'
export type EditorTransformAxis = 'all' | 'x' | 'y' | 'z'
export type EditorInteractionMode = 'objects' | 'terrain'
export type EditorTerrainBrushMode = 'raise' | 'smooth' | 'flatten'
export type EditorViewportLightingMode = 'authored' | 'workbench'
export type EditorViewportShadingMode = 'rendered' | 'solid' | 'wireframe'

export interface EditorState {
  enabled: boolean
  panelOpen: boolean
  propertiesShelfOpen: boolean
  outlinerOpen: boolean
  controlsOverlayOpen: boolean
  currentLevelId: string | null
  selectedNodeId: string | null
  selectedNodeIds: string[]
  isolatedNodeIds: string[]
  selectionAnchorId: string | null
  interactionMode: EditorInteractionMode
  viewportLightingMode: EditorViewportLightingMode
  viewportShadingMode: EditorViewportShadingMode
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
