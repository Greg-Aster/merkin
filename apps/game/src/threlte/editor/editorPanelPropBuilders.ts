import type { HunyuanJobStatus } from './editorHunyuanJobPolling'
import {
  getOutlinerFilterPlaceholder,
  getOutlinerSubtitle,
} from './editorOutliner'
import type {
  OutlinerDisplayMode,
  OutlinerModeOption,
  OutlinerNodeViewportState,
  OutlinerRow,
} from './editorOutlinerTypes'
import type { EditorPanelTab } from './editorPanelTabs'
import type { EditorPublishPipelineState } from './editorPublishReadinessContracts'
import type { EditorPrefabType } from './editorStore'
import type {
  EditorStyleBakeBackend,
  EditorStyleBakeBatchScope,
  EditorStyleBakeOutputTier,
  EditorStyleBakeProduct,
  EditorStyleBakeStatus,
} from './editorStyleBakeTypes'
import type { EditorTerrainStatusSnapshot } from './editorTerrainPipeline'
import type {
  EditorMaterialData,
  EditorSceneDocument,
  EditorSceneNode,
  EditorViewportLightingMode,
  EditorViewportShadingMode,
  LevelCollisionBudget,
} from './editorTypes'

type AnyFunction = (...args: any[]) => any
type AnyController = Record<string, AnyFunction>
type LibraryItem = {
  name: string
  path: string
  isDirectory: boolean
}
type GeneratedVariantItem = {
  name: string
  path: string
  url: string
  sourceLabel?: string
  isOriginalSource?: boolean
  mode?: string
  generatedAt?: string
  metadataUrl?: string
}
type TextureField =
  | 'mapUrl'
  | 'normalMapUrl'
  | 'roughnessMapUrl'
  | 'metalnessMapUrl'
  | 'emissiveMapUrl'
  | 'alphaMapUrl'
type EditorPanelState = {
  propertiesShelfOpen?: boolean
  outlinerOpen?: boolean
  controlsOverlayOpen?: boolean
  selectedNodeIds?: string[]
  isolatedNodeIds?: string[]
  interactionMode?: string
  viewportLightingMode?: EditorViewportLightingMode
  viewportShadingMode?: EditorViewportShadingMode
  collisionOverlayEnabled?: boolean
  objectToolMode?: string
  terrainBrushMode?: string
  terrainBrushSize?: number
  terrainBrushStrength?: number
  terrainBrushFalloff?: number
  transformMode?: string
  transformSpace?: string
  transformAxis?: string
  snappingEnabled?: boolean
  translateSnap?: number
  rotateSnap?: number
  scaleSnap?: number
  surfaceSnapEnabled?: boolean
  surfaceSnapOffset?: number
}

export type EditorPanelPropBuilderContext = {
  levelId: string
  editorScene: EditorSceneDocument | null
  editorState: EditorPanelState | null | undefined
  editorNodes: EditorSceneNode[]
  editorLevelOptions: Array<any>
  levelSettings: Record<string, any>
  effectiveObservatorySettings: Record<string, any>
  effectiveSolitudeSettings: Record<string, any>
  observatoryStylePresets: Array<any>
  ambientAudioLibrary: Array<any>
  canUndo: boolean
  canRedo: boolean
  workflowBrowserPath: string
  workflowBrowserItems: LibraryItem[]
  workflowBrowserError: string
  workflowBrowserLoading: boolean
  selectedComfyWorkflowPath: string
  workflowSelectionSummary: string
  selectedNode: EditorSceneNode | null
  selectedNodes: EditorSceneNode[]
  selectedParentCandidates: EditorSceneNode[]
  multiSelectionParentCandidates: EditorSceneNode[]
  selectedNodeMaterial: EditorMaterialData
  selectedNodeColliderSize: [number, number, number]
  selectedNodeStyleDescriptor: string
  selectedNodePreviewAssetUrl: string
  selectedLibraryItem: LibraryItem | null
  selectedLibraryItemUrl: string
  selectedLibraryItemPath: string
  similarNodeCount: number
  similarNodeLabel: string
  comfyWorkflowEditorStatus: string
  hunyuanStatus: string
  hunyuanBusy: boolean
  hunyuanServiceReady: boolean
  hunyuanBackendStatus: string
  hunyuanBackendCanGenerate: boolean
  hunyuanBackendCanRetexture: boolean
  hunyuanLastOutputUrl: string
  hunyuanLastResultSummary: string
  hunyuanLastFitReport: string
  hunyuanSupportsReplacement: boolean
  hunyuanSupportsTextureWrap: boolean
  hunyuanDetectedReferenceImageUrl: string
  hunyuanJobsLoading: boolean
  hunyuanJobsError: string
  recentHunyuanJobs: HunyuanJobStatus[]
  workflowCanGenerateSelection: boolean
  workflowCanRetextureSelection: boolean
  canApplyGeneratedAssetToSelection: boolean
  canWorkflowShowAll: boolean
  selectedHunyuanJob: HunyuanJobStatus | null
  mergeDescriptor: string
  activeSceneLevelId: string
  createQuickNodeActions: Array<{ label: string; action: () => void }>
  createPrefabGroups: Array<any>
  assetOptions: Array<{ label: string; url: string }>
  assetBrowserPath: string
  assetBrowserItems: LibraryItem[]
  assetBrowserFilter: string
  assetBrowserError: string
  assetBrowserLoading: boolean
  assetPickerTargetNodeId: string
  assetPickerTargetName: string
  textureBrowserPath: string
  textureBrowserItems: LibraryItem[]
  textureBrowserError: string
  textureBrowserLoading: boolean
  activeTextureMaterialField: TextureField | null
  generatedVariantItems: GeneratedVariantItem[]
  generatedVariantLoading: boolean
  generatedVariantError: string
  filteredFlattenedNodes: Array<EditorSceneNode & { __depth: number }>
  hierarchyRootDropActive: boolean
  hierarchyDropTargetId: string | null
  hasGroupSelection: boolean
  nodeViewportStateById: Map<string, OutlinerNodeViewportState>
  outlinerDisplayMode: OutlinerDisplayMode
  outlinerModeOptions: OutlinerModeOption[]
  hierarchyFilter: string
  outlinerRows: OutlinerRow[]
  groundSettings: Record<string, any> | null
  terrainSculptSettings: Record<string, any> | null
  terrainCollisionSettings: Record<string, any> | null
  collisionBudget: LevelCollisionBudget
  terrainCollisionBakePending: boolean
  terrainHeightmapGeneratePending: boolean
  terrainChunkCookPending: boolean
  terrainStatusSnapshot: EditorTerrainStatusSnapshot | null
  worldPartitionCookPending: boolean
  groundTerrainPublishPending: boolean
  selectedTerrainSourceName: string
  selectedTerrainSourceAssetUrl: string
  heightmapSourceNodes: EditorSceneNode[]
  heightmapCandidateNodes: EditorSceneNode[]
  editorStyleStudioComponent: any
  stylePresetOptions: Array<any>
  styleBusy: boolean
  styleStatus: string
  styleInspectReport: string
  styleSourceSummary: string
  styleWorkspaceManifestUrl: string
  styleWorkspaceSourceAssetUrl: string
  styleGeneratedReferenceImageUrl: string
  styleSimplifiedAssetUrl: string
  styleBakedAssetUrl: string
  styleBakeBackend: EditorStyleBakeBackend
  styleBakeTextureSize: number
  styleBakeLineStrength: number
  styleBakeBrushStrength: number
  styleBakeAoStrength: number
  styleBakeCavityStrength: number
  styleBakeCurvatureStrength: number
  styleBakeGeometrySimplification: number
  styleBakeOutputTier: EditorStyleBakeOutputTier
  styleBakeForceRefresh: boolean
  styleBakeCurrentSourceAssetUrl: string
  styleBakeProduct: EditorStyleBakeProduct | null
  styleBakeProductStatus: EditorStyleBakeStatus
  styleBakeLastError: string
  styleBakeLastSuccessfulAt: string
  styleBakeCanApply: boolean
  styleBakeCanRevert: boolean
  styleBlenderExportPath: string
  styleBlenderOpenCommand: string
  styleBatchBusy: boolean
  styleBatchStatus: string
  styleBatchResumeAvailable: boolean
  styleBatchResumeSummary: string
  styleSceneCandidates: Array<any>
  runtimeAssetFailures: Array<any>
  comfyUiStatus: string
  comfyUiBusy: boolean
  comfyUiReady: boolean
  comfyUiLowVramMode: boolean
  editorAIMeshStudioComponent: any
  canUseStyleStudio: (node: EditorSceneNode | null) => boolean
  canUseAiMeshStudio: (node: EditorSceneNode | null) => boolean
  canUseStyleStudioSelection: boolean
  canUseAiMeshStudioSelection: boolean
  canRetextureSelection: (node: EditorSceneNode | null) => boolean
  saveMessage: string
  publishPipelineState: EditorPublishPipelineState
  assetLibraryRootGenerated: string
  assetLibraryRootModels: string
  assetController: AnyController
  aiController: AnyController
  createController: AnyController
  inspectorController: AnyController
  levelController: AnyController
  outlinerController: AnyController
  styleController: AnyController
  clearSelection: () => void
  clearIsolatedNodes: () => void
  setEditorInteractionMode: (mode: 'objects' | 'terrain') => void
  setEditorViewportLightingMode: (mode: EditorViewportLightingMode) => void
  setEditorViewportShadingMode: (mode: EditorViewportShadingMode) => void
  setCollisionOverlayEnabled: (value: boolean) => void
  setCollisionBudget: (value: LevelCollisionBudget) => void
  setTerrainBrushMode: (mode: 'raise' | 'smooth' | 'flatten') => void
  setTerrainBrushSize: (value: number) => void
  setTerrainBrushStrength: (value: number) => void
  setTerrainBrushFalloff: (value: number) => void
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void
  setTransformSpace: (mode: 'world' | 'local') => void
  setTransformAxis: (axis: 'all' | 'x' | 'y' | 'z') => void
  setSnappingEnabled: (value: boolean) => void
  setTranslateSnap: (value: number) => void
  setRotateSnap: (value: number) => void
  setScaleSnap: (value: number) => void
  setSurfaceSnapEnabled: (value: boolean) => void
  setSurfaceSnapOffset: (value: number) => void
  undoScene: () => boolean
  redoScene: () => boolean
  updateLevelSetting: AnyFunction
  updateLevelNumericSetting: AnyFunction
  applySolitudeAtmospherePreset: AnyFunction
  setTerrainAutoBake: (value: boolean) => void
  addSelectedTerrainSourcesToBasket: () => void
  removeTerrainSourceFromBasket: (nodeId: string) => void
  clearTerrainSourceBasket: () => void
  bakeTerrainCollision: () => Promise<void>
  bakeTerrainPipeline: () => Promise<void>
  validateTerrainContract: () => Promise<void>
  generateTerrainHeightmapFromSelection: () => Promise<void>
  cookTerrainChunks: () => Promise<void>
  cookWorldPartition: () => Promise<void>
  publishGroundTerrainContracts: () => Promise<void>
  openBuildOutput: () => void
  switchEditorLevel: () => void
  reloadFromDisk: () => Promise<void>
  loadPackagedLevelScene: () => void
  loadOriginalSnapshot: () => Promise<void>
  loadBackupSnapshot: () => Promise<void>
  addLatestGeneratedAssetToScene: () => void
  selectSimilarNodes: () => void
  hideSelectedNodes: () => void
  isolateSelection: () => void
  unhideAllNodes: () => void
  unlockAllNodes: () => void
  handleHierarchySelection: (nodeId: string, event: MouseEvent) => void
  toggleNodeVisibility: (nodeId: string, event?: MouseEvent) => void
  toggleNodeLocked: (nodeId: string, event?: MouseEvent) => void
  soloNode: (nodeId: string, event?: MouseEvent) => void
  toggleNodeIsolation: (nodeId: string, event?: MouseEvent) => void
  updateTupleField: AnyFunction
  applyStylePreset: (presetId: string) => void
  selectAllStyleBatchCandidates: () => void
  clearStyleBatchCandidates: () => void
  toggleStyleBatchCandidate: (candidateId: string, selected: boolean) => void
  updateNodeStyleDescriptor: (candidateId: string, descriptor: string) => void
  resetSelectedWorkflowPath: () => void
  saveCurrentSceneToDisk: () => Promise<void>
  setActiveEditorTab: (tab: EditorPanelTab) => void
  setPanelOpen: (open: boolean) => void
  setPropertiesShelfOpen: (open: boolean) => void
  setSaveMessage: (value: string) => void
  setHierarchyFilter: (value: string) => void
  setHierarchyRootDropActive: (value: boolean) => void
  setHierarchyDropTargetId: (value: string | null) => void
  setAssetBrowserFilter: (value: string) => void
  setHunyuanApplyToSimilarNodes: (value: boolean) => void
}

export function buildSceneTabProps(context: EditorPanelPropBuilderContext) {
  const editorState = context.editorState
  return {
    levelId: context.levelId,
    editorScene: context.editorScene,
    editorLevelOptions: context.editorLevelOptions,
    canUndo: context.canUndo,
    canRedo: context.canRedo,
    interactionMode: editorState?.interactionMode ?? 'objects',
    viewportLightingMode: editorState?.viewportLightingMode ?? 'authored',
    terrainSculptSettings: context.terrainSculptSettings,
    terrainCollisionSettings: context.terrainCollisionSettings,
    terrainCollisionBakePending: context.terrainCollisionBakePending,
    terrainHeightmapGeneratePending: context.terrainHeightmapGeneratePending,
    terrainChunkCookPending: context.terrainChunkCookPending,
    selectedTerrainSourceAssetUrl: context.selectedTerrainSourceAssetUrl,
    terrainBrushMode: editorState?.terrainBrushMode ?? 'raise',
    terrainBrushSize: editorState?.terrainBrushSize ?? 24,
    terrainBrushStrength: editorState?.terrainBrushStrength ?? 0.35,
    terrainBrushFalloff: editorState?.terrainBrushFalloff ?? 0.55,
    transformMode: editorState?.transformMode ?? 'translate',
    transformSpace: editorState?.transformSpace ?? 'world',
    transformAxis: editorState?.transformAxis ?? 'all',
    snappingEnabled: editorState?.snappingEnabled ?? false,
    translateSnap: editorState?.translateSnap ?? 1,
    rotateSnap: editorState?.rotateSnap ?? 15,
    scaleSnap: editorState?.scaleSnap ?? 0.1,
    surfaceSnapEnabled: editorState?.surfaceSnapEnabled ?? false,
    surfaceSnapOffset: editorState?.surfaceSnapOffset ?? 0,
    onUndo: () => {
      if (context.undoScene()) context.setSaveMessage('Undo')
    },
    onRedo: () => {
      if (context.redoScene()) context.setSaveMessage('Redo')
    },
    onSwitchLevel: context.switchEditorLevel,
    onCreateLevel: () => void context.levelController.createNewLevel(),
    onSetInteractionMode: (mode: string) =>
      context.setEditorInteractionMode(mode as 'objects' | 'terrain'),
    onSetViewportLightingMode: (mode: string) =>
      context.setEditorViewportLightingMode(mode as 'authored' | 'workbench'),
    onSetTerrainBrushMode: (mode: string) =>
      context.setTerrainBrushMode(mode as 'raise' | 'smooth' | 'flatten'),
    onSetTerrainBrushSize: context.setTerrainBrushSize,
    onSetTerrainBrushStrength: context.setTerrainBrushStrength,
    onSetTerrainBrushFalloff: context.setTerrainBrushFalloff,
    onSetTransformMode: (mode: string) =>
      context.setTransformMode(mode as 'translate' | 'rotate' | 'scale'),
    onSetTransformSpace: (mode: string) =>
      context.setTransformSpace(mode as 'world' | 'local'),
    onSetTransformAxis: (axis: string) =>
      context.setTransformAxis(axis as 'all' | 'x' | 'y' | 'z'),
    onSetSnappingEnabled: context.setSnappingEnabled,
    onSetTranslateSnap: context.setTranslateSnap,
    onSetRotateSnap: context.setRotateSnap,
    onSetScaleSnap: context.setScaleSnap,
    onSetSurfaceSnapEnabled: context.setSurfaceSnapEnabled,
    onSetSurfaceSnapOffset: context.setSurfaceSnapOffset,
  }
}

export function buildCollisionTabProps(context: EditorPanelPropBuilderContext) {
  const editorState = context.editorState
  return {
    levelId: context.levelId,
    editorScene: context.editorScene,
    collisionOverlayEnabled: editorState?.collisionOverlayEnabled ?? false,
    collisionBudget: context.collisionBudget,
    groundSettings: context.groundSettings,
    terrainSculptSettings: context.terrainSculptSettings,
    terrainCollisionSettings: context.terrainCollisionSettings,
    terrainStatus: context.terrainStatusSnapshot,
    terrainCollisionBakePending: context.terrainCollisionBakePending,
    terrainHeightmapGeneratePending: context.terrainHeightmapGeneratePending,
    terrainChunkCookPending: context.terrainChunkCookPending,
    selectedNode: context.selectedNode,
    selectedNodes: context.selectedNodes,
    heightmapSourceNodes: context.heightmapSourceNodes,
    heightmapCandidateNodes: context.heightmapCandidateNodes,
    selectedTerrainSourceName: context.selectedTerrainSourceName,
    selectedTerrainSourceAssetUrl: context.selectedTerrainSourceAssetUrl,
    onSetCollisionOverlayEnabled: context.setCollisionOverlayEnabled,
    onSetCollisionBudget: context.setCollisionBudget,
    onSetTerrainAutoBake: context.setTerrainAutoBake,
    onAddSelectedTerrainSources: context.addSelectedTerrainSourcesToBasket,
    onRemoveTerrainSource: context.removeTerrainSourceFromBasket,
    onClearTerrainSources: context.clearTerrainSourceBasket,
    onBakeTerrainCollision: () => void context.bakeTerrainCollision(),
    onBakeTerrain: () => void context.bakeTerrainPipeline(),
    onGenerateTerrainHeightmap: () =>
      void context.generateTerrainHeightmapFromSelection(),
    onCookTerrainChunks: () => void context.cookTerrainChunks(),
    onSelectCollisionReviewActor: (actorId: string) =>
      context.handleHierarchySelection(actorId, new MouseEvent('click')),
    onSetCollisionReviewBlocker:
      context.inspectorController.setBlockerForNodeId,
    onSetCollisionReviewWalkable:
      context.inspectorController.setWalkableForNodeId,
    onSetCollisionReviewTrigger:
      context.inspectorController.setTriggerForNodeId,
    onSetCollisionReviewVisualOnly:
      context.inspectorController.setVisualOnlyForNodeId,
    onDisableCollisionReviewActor:
      context.inspectorController.disableCollisionForNodeId,
    onBakeCollisionReviewMeshCollider:
      context.inspectorController.bakeMeshColliderForNodeId,
  }
}

export function buildEnvironmentTabProps(
  context: EditorPanelPropBuilderContext,
) {
  const editorState = context.editorState
  return {
    levelSettings: context.levelSettings,
    effectiveObservatorySettings: context.effectiveObservatorySettings,
    effectiveSolitudeSettings: context.effectiveSolitudeSettings,
    observatoryStylePresets: context.observatoryStylePresets,
    ambientAudioLibrary: context.ambientAudioLibrary,
    updateLevelSetting: context.updateLevelSetting,
    updateLevelNumericSetting: context.updateLevelNumericSetting,
    applySolitudeAtmospherePreset: context.applySolitudeAtmospherePreset,
    viewportLightingMode: editorState?.viewportLightingMode ?? 'authored',
    viewportShadingMode: editorState?.viewportShadingMode ?? 'rendered',
    onSetViewportLightingMode: context.setEditorViewportLightingMode,
    onSetViewportShadingMode: context.setEditorViewportShadingMode,
  }
}

export function buildPlayerTabProps(context: EditorPanelPropBuilderContext) {
  return {
    levelSettings: context.levelSettings,
    updateLevelSetting: context.updateLevelSetting,
    updateLevelNumericSetting: context.updateLevelNumericSetting,
  }
}

export function buildCreateTabProps(context: EditorPanelPropBuilderContext) {
  return {
    createQuickNodeActions: context.createQuickNodeActions,
    createPrefabGroups: context.createPrefabGroups,
    assetOptions: context.assetOptions,
    selectedNodesCount: context.selectedNodes.length,
    hunyuanBusy: context.hunyuanBusy,
    hunyuanBackendCanGenerate: context.hunyuanBackendCanGenerate,
    hunyuanBackendCanRetexture: context.hunyuanBackendCanRetexture,
    hunyuanDetectedReferenceImageUrl: context.hunyuanDetectedReferenceImageUrl,
    hunyuanLastOutputUrl: context.hunyuanLastOutputUrl,
    assetBrowserPath: context.assetBrowserPath,
    assetBrowserItems: context.assetBrowserItems,
    assetBrowserError: context.assetBrowserError,
    assetBrowserLoading: context.assetBrowserLoading,
    selectedLibraryItem: context.selectedLibraryItem,
    selectedLibraryItemUrl: context.selectedLibraryItemUrl,
    assetPickerTargetNodeId: context.assetPickerTargetNodeId,
    assetPickerTargetName: context.assetPickerTargetName,
    generatedRootPath: context.assetLibraryRootGenerated,
    modelsRootPath: context.assetLibraryRootModels,
    onAddFireflyToSelection: context.createController.addFireflyToSelection,
    onAddPrefab: (
      label: string,
      type: string,
      position: [number, number, number],
    ) =>
      context.createController.addPrefabWithParent(
        label,
        type as EditorPrefabType,
        position,
      ),
    onAddCuratedAsset: context.createController.addAssetPrefab,
    onMergeSelectionToAsset: () =>
      void context.assetController.mergeSelectionToAsset(
        context.mergeDescriptor,
      ),
    onGenerateToLibrary: () => void context.aiController.runHunyuanToLibrary(),
    onGenerateAndAdd: () =>
      void context.aiController.runHunyuanToLibrary({ addToScene: true }),
    onOpenGeneratedAssets: () =>
      void context.assetController.openGeneratedAssetInLibrary(),
    onAddLatestGenerated: context.addLatestGeneratedAssetToScene,
    onSelectAssetLibraryRoot:
      context.inspectorController.selectAssetLibraryRoot,
    onAssetBrowserUp: context.inspectorController.goUpAssetBrowser,
    onAssetBrowserRefresh: () =>
      void context.assetController.loadAssetBrowser(context.assetBrowserPath),
    onCancelAssetPicker: context.inspectorController.cancelAssetPickerTarget,
    onSelectLibraryItem: context.inspectorController.selectLibraryItem,
    onAddSelectedLibraryAssetToScene:
      context.assetController.addSelectedLibraryAssetToScene,
    onInspectSelectedLibraryAsset: () =>
      void context.assetController.inspectSelectedAssetForHunyuan(
        context.selectedLibraryItemUrl,
        context.selectedLibraryItem?.path ?? '',
      ),
    onApplySelectedLibraryAsset:
      context.inspectorController.applySelectedLibraryAssetToTargetNode,
    onRunLibraryGenerate: () =>
      void context.aiController.runHunyuanForLibraryAsset('generate'),
    onRunLibraryTexture: () =>
      void context.aiController.runHunyuanForLibraryAsset('texture'),
    onOpenAiTab: () => context.setActiveEditorTab('ai'),
  }
}

export function buildHierarchyTabProps(context: EditorPanelPropBuilderContext) {
  const editorState = context.editorState
  return {
    selectedNodes: context.selectedNodes,
    selectedNodeIds: editorState?.selectedNodeIds ?? [],
    filteredFlattenedNodes: context.filteredFlattenedNodes,
    hierarchyRootDropActive: context.hierarchyRootDropActive,
    hierarchyDropTargetId: context.hierarchyDropTargetId,
    hasGroupSelection: context.hasGroupSelection,
    isolatedNodeIds: editorState?.isolatedNodeIds ?? [],
    hasHiddenNodes: context.editorNodes.some((node: any) => !node.visible),
    hasLockedNodes: context.editorNodes.some(
      (node: any) => node.locked ?? false,
    ),
    nodeViewportStateById: context.nodeViewportStateById,
    onFilterClear: () => {
      context.setHierarchyFilter('')
    },
    onFilterChange: (value: string) => {
      context.setHierarchyFilter(value)
    },
    onIsolateSelection: context.isolateSelection,
    onShowAll: context.clearIsolatedNodes,
    onSelectSimilar: context.selectSimilarNodes,
    onUnhideAll: context.unhideAllNodes,
    onUnlockAll: context.unlockAllNodes,
    onRootDragEnter: (event: DragEvent) =>
      context.outlinerController.allowDrop(event, null),
    onRootDragOver: (event: DragEvent) =>
      context.outlinerController.allowDrop(event, null),
    onRootDragLeave: () => {
      context.setHierarchyRootDropActive(false)
      if (context.hierarchyDropTargetId === null) {
        context.setHierarchyDropTargetId(null)
      }
    },
    onRootDrop: (event: DragEvent) =>
      context.outlinerController.drop(event, null),
    onNodeDragStart: (nodeId: string, event: DragEvent) =>
      context.outlinerController.startDrag(nodeId, event),
    onNodeDragEnd: context.outlinerController.clearDragState,
    onNodeDragEnter: (nodeId: string, event: DragEvent) =>
      context.outlinerController.allowDrop(event, nodeId),
    onNodeDragOver: (nodeId: string, event: DragEvent) =>
      context.outlinerController.allowDrop(event, nodeId),
    onNodeDragLeave: (nodeId: string) => {
      if (context.hierarchyDropTargetId === nodeId) {
        context.setHierarchyDropTargetId(null)
      }
    },
    onNodeDrop: (nodeId: string, event: DragEvent) =>
      context.outlinerController.drop(event, nodeId),
    onNodeSelect: context.handleHierarchySelection,
    onToggleVisibility: context.toggleNodeVisibility,
    onToggleLocked: context.toggleNodeLocked,
    onSoloNode: context.soloNode,
    onToggleIsolation: context.toggleNodeIsolation,
    onGroupSelection: context.createController.groupSelection,
    onUngroupSelection: context.createController.ungroupSelection,
    onDuplicateSelection: context.createController.duplicateSelection,
    onDeleteSelection: context.createController.deleteSelection,
    onClearSelection: context.clearSelection,
  }
}

export function buildInspectTabProps(context: EditorPanelPropBuilderContext) {
  return {
    selectedNode: context.selectedNode,
    selectedNodes: context.selectedNodes,
    sceneSettings: context.editorScene?.settings ?? null,
    sceneObjectCount: context.editorNodes.length,
    sceneAssetNodeCount: context.editorNodes.filter(node => !!node.asset)
      .length,
    sceneColliderCount: context.editorNodes.filter(
      node => node.collision?.enabled !== false && !!node.collision,
    ).length,
    parentCandidates: context.selectedParentCandidates,
    multiParentCandidates: context.multiSelectionParentCandidates,
    selectedNodeMaterial: context.selectedNodeMaterial,
    selectedNodeColliderSize: context.selectedNodeColliderSize,
    styleDescriptor: context.selectedNodeStyleDescriptor,
    viewportLightingMode:
      context.editorState?.viewportLightingMode ?? 'authored',
    viewportShadingMode: context.editorState?.viewportShadingMode ?? 'rendered',
    assetPickerTargetNodeId: context.assetPickerTargetNodeId,
    assetBrowserPath: context.assetBrowserPath,
    assetBrowserItems: context.assetBrowserItems,
    assetBrowserFilter: context.assetBrowserFilter,
    assetBrowserError: context.assetBrowserError,
    assetBrowserLoading: context.assetBrowserLoading,
    selectedLibraryItemPath: context.selectedLibraryItemPath,
    activeTextureMaterialField: context.activeTextureMaterialField,
    textureBrowserPath: context.textureBrowserPath,
    textureBrowserItems: context.textureBrowserItems,
    textureBrowserError: context.textureBrowserError,
    textureBrowserLoading: context.textureBrowserLoading,
    ambientAudioLibrary: context.ambientAudioLibrary,
    canUseAiMeshStudioSelection: context.canUseAiMeshStudioSelection,
    hunyuanBusy: context.hunyuanBusy,
    onNameChange: context.inspectorController.updateNodeName,
    onVisibleChange: context.inspectorController.updateVisible,
    onParentChange: context.inspectorController.updateParent,
    onPrefabVariantChange: context.inspectorController.updatePrefabVariant,
    onAssetUrlChange: context.inspectorController.updateAssetUrl,
    onOpenGeneratedAssetPicker: () =>
      context.inspectorController.openAssetPickerForSelectedNode(
        context.assetLibraryRootGenerated,
      ),
    onOpenImportedAssetPicker: () =>
      context.inspectorController.openAssetPickerForSelectedNode(
        context.assetLibraryRootModels,
      ),
    onAssetLibraryRootSelect:
      context.inspectorController.selectAssetLibraryRoot,
    onAssetBrowserUp: context.inspectorController.goUpAssetBrowser,
    onAssetBrowserRefresh: () =>
      void context.assetController.loadAssetBrowser(context.assetBrowserPath),
    onAssetBrowserFilterChange: (value: string) => {
      context.setAssetBrowserFilter(value)
    },
    onAssetLibraryItemSelect: context.inspectorController.selectLibraryItem,
    onApplySelectedLibraryAsset:
      context.inspectorController.applySelectedLibraryAssetToTargetNode,
    onCancelAssetPicker: context.inspectorController.cancelAssetPickerTarget,
    onStyleDescriptorChange:
      context.inspectorController.updateSelectedNodeStyleDescriptor,
    onConvertSelectedToMesh: () =>
      void context.assetController.convertSelectedNodeToMesh(),
    onReimagineSelected: () => {
      context.setHunyuanApplyToSimilarNodes(false)
      void context.aiController.runHunyuanForSelection('generate')
    },
    onAddPointLightToSelection:
      context.createController.addPointLightToSelection,
    onSetViewportLightingMode: context.setEditorViewportLightingMode,
    onSetViewportShadingMode: context.setEditorViewportShadingMode,
    onPrimitiveGeometryChange: (value: string) =>
      context.inspectorController.updatePrimitiveField('geometry', value),
    onPrimitiveArgChange: context.inspectorController.updatePrimitiveArg,
    onCollisionEnabledChange:
      context.inspectorController.updateCollisionEnabled,
    onCollisionModeChange: context.inspectorController.updateCollisionMode,
    onCollisionShapeChange: context.inspectorController.updateCollisionShape,
    onCollisionQualityChange:
      context.inspectorController.updateCollisionQuality,
    onCollisionLodSourceTierChange:
      context.inspectorController.updateCollisionLodSourceTier,
    onCollisionIntentChange: context.inspectorController.updateCollisionIntent,
    onCollisionChannelChange:
      context.inspectorController.updateCollisionChannel,
    onPhysicsBodyTypeChange: (value: string) =>
      context.inspectorController.updatePhysicsField('bodyType', value),
    onPhysicsNumericChange:
      context.inspectorController.updatePhysicsNumericField,
    onPhysicsBooleanChange:
      context.inspectorController.updatePhysicsBooleanField,
    onCollisionNumericChange:
      context.inspectorController.updateCollisionNumericField,
    onCollisionBooleanChange:
      context.inspectorController.updateCollisionBooleanField,
    onSetCollisionVisualOnly: context.inspectorController.setVisualOnly,
    onSetCollisionBlocker: context.inspectorController.setBlocker,
    onSetCollisionWalkable: context.inspectorController.setWalkable,
    onSetCollisionTrigger: context.inspectorController.setTrigger,
    onSetCollisionDetail: context.inspectorController.setDetail,
    onForceRegenerateCollision: () =>
      void context.inspectorController.forceRegenerateCollisionFromSelection(),
    onBakeMeshCollider: () =>
      void context.inspectorController.bakeMeshColliderFromSelection(),
    onMaterialColorChange: context.inspectorController.updateNodeMaterialField,
    onMaterialNumericChange:
      context.inspectorController.updateNodeMaterialNumericField,
    onMaterialBooleanChange:
      context.inspectorController.updateNodeMaterialBooleanField,
    onMaterialTextureChange:
      context.inspectorController.updateNodeMaterialTextureField,
    onOpenTexturePicker: context.inspectorController.openTexturePicker,
    onTextureBrowserUp: context.inspectorController.goUpTextureBrowser,
    onTextureBrowserRefresh: () =>
      void context.assetController.loadTextureBrowser(
        context.textureBrowserPath,
      ),
    onTextureBrowserOpenDirectory: (path: string) =>
      void context.assetController.loadTextureBrowser(path),
    onTextureBrowserPick: context.inspectorController.applyTextureFromBrowser,
    onResetMaterialOverrides:
      context.inspectorController.clearNodeMaterialOverrides,
    onLightFieldChange: context.inspectorController.updateLightField,
    onLightNumericChange: context.inspectorController.updateLightNumericField,
    onPlaceLightAtParentBounds:
      context.inspectorController.placeSelectedLightAtParentBounds,
    onGameplayFieldChange: context.inspectorController.updateGameplayField,
    onGameplayBooleanChange:
      context.inspectorController.updateGameplayBooleanField,
    onGameplayNumericChange:
      context.inspectorController.updateGameplayNumericField,
    onTransformChange: context.updateTupleField,
    onDuplicate: context.createController.duplicateSelection,
    onDelete: context.createController.deleteSelection,
    onOpenDetailsPanel: () => context.setPropertiesShelfOpen(true),
  }
}

export function buildStyleTabProps(context: EditorPanelPropBuilderContext) {
  return {
    editorStyleStudioComponent: context.editorStyleStudioComponent,
    stylePresets: context.stylePresetOptions,
    styleBusy: context.styleBusy,
    styleStatus: context.styleStatus,
    styleInspectReport: context.styleInspectReport,
    styleSourceSummary: context.styleSourceSummary,
    styleWorkspaceManifestUrl: context.styleWorkspaceManifestUrl,
    styleWorkspaceSourceAssetUrl: context.styleWorkspaceSourceAssetUrl,
    styleGeneratedReferenceImageUrl: context.styleGeneratedReferenceImageUrl,
    styleSimplifiedAssetUrl: context.styleSimplifiedAssetUrl,
    styleBakedAssetUrl: context.styleBakedAssetUrl,
    styleBakeBackend: context.styleBakeBackend,
    styleBakeTextureSize: context.styleBakeTextureSize,
    styleBakeLineStrength: context.styleBakeLineStrength,
    styleBakeBrushStrength: context.styleBakeBrushStrength,
    styleBakeAoStrength: context.styleBakeAoStrength,
    styleBakeCavityStrength: context.styleBakeCavityStrength,
    styleBakeCurvatureStrength: context.styleBakeCurvatureStrength,
    styleBakeGeometrySimplification: context.styleBakeGeometrySimplification,
    styleBakeOutputTier: context.styleBakeOutputTier,
    styleBakeForceRefresh: context.styleBakeForceRefresh,
    styleBakeCurrentSourceAssetUrl: context.styleBakeCurrentSourceAssetUrl,
    styleBakeProduct: context.styleBakeProduct,
    styleBakeProductStatus: context.styleBakeProductStatus,
    styleBakeLastError: context.styleBakeLastError,
    styleBakeLastSuccessfulAt: context.styleBakeLastSuccessfulAt,
    styleBakeCanApply: context.styleBakeCanApply,
    styleBakeCanRevert: context.styleBakeCanRevert,
    styleBlenderExportPath: context.styleBlenderExportPath,
    styleBlenderOpenCommand: context.styleBlenderOpenCommand,
    styleBatchBusy: context.styleBatchBusy,
    styleBatchStatus: context.styleBatchStatus,
    hunyuanLastFitReport: context.hunyuanLastFitReport,
    styleBatchResumeAvailable: context.styleBatchResumeAvailable,
    styleBatchResumeSummary: context.styleBatchResumeSummary,
    styleSceneCandidates: context.styleSceneCandidates,
    runtimeAssetFailures: context.runtimeAssetFailures,
    comfyUiStatus: context.comfyUiStatus,
    comfyUiBusy: context.comfyUiBusy,
    comfyUiReady: context.comfyUiReady,
    comfyUiLowVramMode: context.comfyUiLowVramMode,
    hunyuanBackendStatus: context.hunyuanBackendStatus,
    hunyuanBusy: context.hunyuanBusy,
    hunyuanServiceReady: context.hunyuanServiceReady,
    hunyuanDetectedReferenceImageUrl: context.hunyuanDetectedReferenceImageUrl,
    selectedNode: context.selectedNode,
    selectedNodes: context.selectedNodes,
    canUseStyleStudio: context.canUseStyleStudio,
    onStartComfyUi: () =>
      context.aiController.refreshComfyUiServiceStatus(true),
    onRefreshComfyUi: () =>
      context.aiController.refreshComfyUiServiceStatus(false),
    onStartHunyuan: () =>
      context.aiController.refreshHunyuanServiceStatus(true),
    onRefreshHunyuan: () =>
      context.aiController.refreshHunyuanServiceStatus(false),
    onInspectAsset: () =>
      context.styleController.inspectSelectedAssetForStyle(),
    onApplyStylePreset: context.applyStylePreset,
    onPrepareWorkspace: () => context.styleController.prepareStyleWorkspace(),
    onSimplifyAsset: () =>
      context.styleController.simplifySelectedAssetForStyle(),
    onBakeProceduralStyle: () =>
      context.styleController.bakeSelectedAssetProceduralStyle(),
    onApplyStyleBakePreview: () =>
      context.styleController.applyStyleBakePreviewForSelection(),
    onRevertStyleBakePreview: () =>
      context.styleController.revertStyleBakePreviewForSelection(),
    onExportBlender: () =>
      context.styleController.exportSelectedAssetForBlender(),
    onRunRetexture: () => context.styleController.runStyleBake('texture'),
    onRunReimagine: () => context.styleController.runStyleBake('generate'),
    onSelectAllBatchCandidates: context.selectAllStyleBatchCandidates,
    onClearBatchCandidates: context.clearStyleBatchCandidates,
    onPauseBatch: () => void context.styleController.pauseActiveHunyuanJobs(),
    onCancelBatch: () => void context.styleController.cancelActiveHunyuanJobs(),
    onResumeBatch: () =>
      void context.styleController.resumePendingStyleBatchSession(),
    onDiscardBatch: context.styleController.discardPendingStyleBatchSession,
    onRunBatchRetexture: () =>
      void context.styleController.runStyleBatch('texture'),
    onRunBatchReimagine: () =>
      void context.styleController.runStyleBatch('generate'),
    onRunProceduralBatch: (scope: string, force: boolean) =>
      void context.styleController.runProceduralStyleBatch(
        scope as EditorStyleBakeBatchScope,
        { force },
      ),
    onToggleBatchCandidate: context.toggleStyleBatchCandidate,
    onUpdateBatchDescriptor: context.updateNodeStyleDescriptor,
  }
}

export function buildAiTabProps(context: EditorPanelPropBuilderContext) {
  return {
    editorAIMeshStudioComponent: context.editorAIMeshStudioComponent,
    comfyUiStatus: context.comfyUiStatus,
    comfyUiBusy: context.comfyUiBusy,
    comfyUiReady: context.comfyUiReady,
    comfyUiLowVramMode: context.comfyUiLowVramMode,
    comfyWorkflowEditorStatus: context.comfyWorkflowEditorStatus,
    selectedComfyWorkflowPath: context.selectedComfyWorkflowPath,
    workflowBrowserPath: context.workflowBrowserPath,
    workflowBrowserItems: context.workflowBrowserItems,
    workflowBrowserError: context.workflowBrowserError,
    workflowBrowserLoading: context.workflowBrowserLoading,
    hunyuanStatus: context.hunyuanStatus,
    hunyuanBackendStatus: context.hunyuanBackendStatus,
    hunyuanBusy: context.hunyuanBusy,
    hunyuanServiceReady: context.hunyuanServiceReady,
    hunyuanBackendCanGenerate: context.hunyuanBackendCanGenerate,
    hunyuanBackendCanRetexture: context.hunyuanBackendCanRetexture,
    hunyuanLastOutputUrl: context.hunyuanLastOutputUrl,
    hunyuanLastResultSummary: context.hunyuanLastResultSummary,
    hunyuanLastFitReport: context.hunyuanLastFitReport,
    hunyuanSupportsReplacement: context.hunyuanSupportsReplacement,
    hunyuanSupportsTextureWrap: context.hunyuanSupportsTextureWrap,
    canApplyGeneratedAssetToSelection:
      context.canApplyGeneratedAssetToSelection,
    recentHunyuanJobs: context.recentHunyuanJobs,
    hunyuanJobsLoading: context.hunyuanJobsLoading,
    hunyuanJobsError: context.hunyuanJobsError,
    hunyuanDetectedReferenceImageUrl: context.hunyuanDetectedReferenceImageUrl,
    matchingSelectionCount: context.similarNodeCount,
    similarSelectionLabel: context.similarNodeLabel,
    selectedNode: context.selectedNode,
    selectedNodes: context.selectedNodes,
    canUseAiMeshStudio: context.canUseAiMeshStudio,
    canRetextureSelection: context.canRetextureSelection,
    onSelectSimilar: context.selectSimilarNodes,
    onStartComfyUi: () =>
      context.aiController.refreshComfyUiServiceStatus(true),
    onRefreshComfyUi: () =>
      context.aiController.refreshComfyUiServiceStatus(false),
    onStartHunyuan: () =>
      context.aiController.refreshHunyuanServiceStatus(true),
    onRefreshHunyuan: () =>
      context.aiController.refreshHunyuanServiceStatus(false),
    onGenerateScratch: () => context.aiController.runHunyuanFromScratch(),
    onInspectSelection: () =>
      context.selectedNode?.asset &&
      void context.assetController.inspectSelectedAssetForHunyuan(
        context.selectedNode.asset.url,
        context.selectedNode.id,
      ),
    onGenerateSelection: () =>
      context.aiController.runHunyuanForSelection('generate'),
    onTextureSelection: () =>
      context.aiController.runHunyuanForSelection('texture'),
    onResetWorkflowPath: context.resetSelectedWorkflowPath,
    onWorkflowBrowserUp: context.assetController.goUpWorkflowBrowser,
    onWorkflowBrowserRefresh: () =>
      void context.assetController.loadWorkflowBrowser(
        context.workflowBrowserPath,
      ),
    onSelectWorkflowItem: context.assetController.selectWorkflowPath,
    onEditGenerateWorkflow: () =>
      void context.aiController.openComfyUiWorkflowEditor('generate'),
    onEditTextureWorkflow: () =>
      void context.aiController.openComfyUiWorkflowEditor('texture'),
    onOpenGeneratedAsset: () =>
      void context.assetController.openGeneratedAssetInLibrary(),
    onApplyGeneratedAsset: () =>
      void context.assetController.applyGeneratedAssetToSelection(),
    onSaveGeneratedResult: () => void context.saveCurrentSceneToDisk(),
    onRefreshRecentJobs: () =>
      void context.aiController.refreshHunyuanRecentJobs(),
  }
}

export function buildSaveTabProps(context: EditorPanelPropBuilderContext) {
  return {
    levelId: context.levelId,
    editorScene: context.editorScene,
    saveMessage: context.saveMessage,
    groundTerrainPublishPending: context.groundTerrainPublishPending,
    terrainStatus: context.terrainStatusSnapshot,
    terrainPipelinePending:
      context.terrainCollisionBakePending ||
      context.terrainHeightmapGeneratePending ||
      context.terrainChunkCookPending,
    worldPartitionCookPending: context.worldPartitionCookPending,
    publishPipelineState: context.publishPipelineState,
    onSaveLevelMetadata: () => void context.levelController.saveLevelMetadata(),
    onSaveLocal: context.levelController.saveScene,
    onOverwriteLevel: () => void context.levelController.overwriteLevelScene(),
    onCopySceneJson: context.levelController.copySceneJson,
    onReloadDisk: context.reloadFromDisk,
    onLoadPackagedScene: context.loadPackagedLevelScene,
    onLoadOriginalSnapshot: () => void context.loadOriginalSnapshot(),
    onLoadBackupSnapshot: () => void context.loadBackupSnapshot(),
    onSaveAsNewLevel: () => void context.levelController.saveAsNewLevel(),
    onApplyImport: context.levelController.applyImport,
    onPublishLevel: () => void context.levelController.publishLevel(),
    onPublishGroundTerrainContracts: () =>
      void context.publishGroundTerrainContracts(),
  }
}

export function buildWorkflowTabProps(context: EditorPanelPropBuilderContext) {
  return {
    levelId: context.levelId,
    editorScene: context.editorScene,
    terrainCollisionBakePending: context.terrainCollisionBakePending,
    terrainHeightmapGeneratePending: context.terrainHeightmapGeneratePending,
    terrainChunkCookPending: context.terrainChunkCookPending,
    worldPartitionCookPending: context.worldPartitionCookPending,
    groundTerrainPublishPending: context.groundTerrainPublishPending,
    selectedTerrainSourceName: context.selectedTerrainSourceName,
    selectedTerrainSourceAssetUrl: context.selectedTerrainSourceAssetUrl,
    terrainCollisionSettings: context.terrainCollisionSettings,
    terrainStatus: context.terrainStatusSnapshot,
    publishPipelineState: context.publishPipelineState,
    saveMessage: context.saveMessage,
    onOpenCollisionTools: () => {
      context.setPanelOpen(true)
      context.setActiveEditorTab('collision')
    },
    onBakeTerrain: () => void context.bakeTerrainPipeline(),
    onGenerateTerrainHeightmap: () =>
      void context.generateTerrainHeightmapFromSelection(),
    onBakeTerrainCollision: () => void context.bakeTerrainCollision(),
    onCookTerrainChunks: () => void context.cookTerrainChunks(),
    onCookWorldPartition: () => void context.cookWorldPartition(),
    onValidateTerrainContract: () => void context.validateTerrainContract(),
    onPublishLevel: () => void context.levelController.publishLevel(),
    onPublishGroundTerrainContracts: () =>
      void context.publishGroundTerrainContracts(),
    onOpenSaveTools: () => {
      context.setPanelOpen(true)
      context.setActiveEditorTab('build')
    },
    onOpenOutput: context.openBuildOutput,
  }
}

export function buildSideStackProps(context: EditorPanelPropBuilderContext) {
  return {
    propertiesShelfOpen: context.editorState?.propertiesShelfOpen ?? false,
    outlinerOpen: context.editorState?.outlinerOpen ?? true,
    outlinerSubtitle: getOutlinerSubtitle(
      context.outlinerDisplayMode,
      context.editorNodes,
      context.selectedNodes,
      context.selectedNode,
    ),
    outlinerMode: context.outlinerDisplayMode,
    outlinerModeOptions: context.outlinerModeOptions,
    hierarchyFilter: context.hierarchyFilter,
    outlinerFilterPlaceholder: getOutlinerFilterPlaceholder(
      context.outlinerDisplayMode,
    ),
    outlinerRows: context.outlinerRows,
    outlinerDragEnabled: context.outlinerDisplayMode === 'view-layer',
    hierarchyDropTargetId: context.hierarchyDropTargetId,
    selectedNodeIds: context.editorState?.selectedNodeIds ?? [],
    hasGroupSelection: context.hasGroupSelection,
    onOutlinerModeChange: context.outlinerController.setDisplayMode,
    onOutlinerFilterChange: (value: string) => {
      context.setHierarchyFilter(value)
    },
    onOutlinerRowDisclosure: (row: OutlinerRow, event: MouseEvent) => {
      if (row.hasChildren) {
        context.outlinerController.toggleExpanded(row.id, event)
      }
    },
    onOutlinerRowSelect: context.outlinerController.handleSelection,
    onOutlinerRowVisibility: context.outlinerController.toggleItemVisibility,
    onOutlinerRowSelectable: context.outlinerController.toggleItemSelectable,
    onOutlinerRowIsolation: context.outlinerController.toggleItemIsolation,
    onOutlinerRowDragStart: (row: OutlinerRow, event: DragEvent) => {
      if (row.nodeId) context.outlinerController.startDrag(row.nodeId, event)
    },
    onOutlinerRowDragEnd: context.outlinerController.clearDragState,
    onOutlinerRowDragEnter: (row: OutlinerRow, event: DragEvent) => {
      if (row.nodeId) context.outlinerController.allowDrop(event, row.nodeId)
    },
    onOutlinerRowDragOver: (row: OutlinerRow, event: DragEvent) => {
      if (row.nodeId) context.outlinerController.allowDrop(event, row.nodeId)
    },
    onOutlinerRowDragLeave: (row: OutlinerRow) => {
      if (row.nodeId && context.hierarchyDropTargetId === row.nodeId) {
        context.setHierarchyDropTargetId(null)
      }
    },
    onOutlinerRowDrop: (row: OutlinerRow, event: DragEvent) => {
      if (row.nodeId) context.outlinerController.drop(event, row.nodeId)
    },
    onOutlinerGroupSelection: context.createController.groupSelection,
    onOutlinerUngroupSelection: context.createController.ungroupSelection,
    getOutlinerRowActionState: context.outlinerController.getRowActionState,
    selectedNode: context.selectedNode,
    selectedNodes: context.selectedNodes,
    sceneSettings: context.editorScene?.settings ?? null,
    parentCandidates: context.selectedParentCandidates,
    selectedNodeMaterial: context.selectedNodeMaterial,
    selectedNodePreviewAssetUrl: context.selectedNodePreviewAssetUrl,
    styleDescriptor: context.selectedNodeStyleDescriptor,
    viewportLightingMode:
      context.editorState?.viewportLightingMode ?? 'authored',
    viewportShadingMode: context.editorState?.viewportShadingMode ?? 'rendered',
    assetPickerTargetNodeId: context.assetPickerTargetNodeId,
    assetBrowserPath: context.assetBrowserPath,
    assetBrowserItems: context.assetBrowserItems,
    assetBrowserFilter: context.assetBrowserFilter,
    assetBrowserError: context.assetBrowserError,
    assetBrowserLoading: context.assetBrowserLoading,
    selectedLibraryItemPath: context.selectedLibraryItemPath,
    generatedRootPath: context.assetLibraryRootGenerated,
    modelsRootPath: context.assetLibraryRootModels,
    canUseStyleStudioSelection: context.canUseStyleStudioSelection,
    canUseAiMeshStudioSelection: context.canUseAiMeshStudioSelection,
    generatedVariantItems: context.generatedVariantItems,
    generatedVariantLoading: context.generatedVariantLoading,
    generatedVariantError: context.generatedVariantError,
    styleBusy: context.styleBusy,
    hunyuanBusy: context.hunyuanBusy,
    styleBlenderExportPath: context.styleBlenderExportPath,
    styleBlenderOpenCommand: context.styleBlenderOpenCommand,
    styleStatus: context.styleStatus,
    activeTextureMaterialField: context.activeTextureMaterialField,
    textureBrowserPath: context.textureBrowserPath,
    textureBrowserLoading: context.textureBrowserLoading,
    textureBrowserItems: context.textureBrowserItems,
    colliderSize: context.selectedNodeColliderSize,
    onNameChange: context.inspectorController.updateNodeName,
    onOpenStyleTab: () => context.setActiveEditorTab('ai'),
    onOpenAiTab: () => context.setActiveEditorTab('ai'),
    onOpenCreateTab: () => {
      context.setPanelOpen(true)
      context.setActiveEditorTab('create')
    },
    onConvertSelectedToMesh: () =>
      void context.assetController.convertSelectedNodeToMesh(),
    onReimagineSelected: () => {
      context.setHunyuanApplyToSimilarNodes(false)
      void context.aiController.runHunyuanForSelection('generate')
    },
    onDuplicate: context.createController.duplicateSelection,
    onDelete: context.createController.deleteSelection,
    onVisibleChange: context.inspectorController.updateVisible,
    onSelectableChange: (selectable: boolean) => {
      if (
        context.selectedNode &&
        (context.selectedNode.locked ?? false) === selectable
      ) {
        context.toggleNodeLocked(context.selectedNode.id)
      }
    },
    onTransformChange: context.updateTupleField,
    onParentChange: context.inspectorController.updateParent,
    onAssetUrlChange: context.inspectorController.updateAssetUrl,
    onOpenGeneratedAssetPicker: () =>
      context.inspectorController.openAssetPickerForSelectedNode(
        context.assetLibraryRootGenerated,
      ),
    onOpenImportedAssetPicker: () =>
      context.inspectorController.openAssetPickerForSelectedNode(
        context.assetLibraryRootModels,
      ),
    onAssetLibraryRootSelect:
      context.inspectorController.selectAssetLibraryRoot,
    onAssetBrowserUp: context.inspectorController.goUpAssetBrowser,
    onAssetBrowserRefresh: () =>
      void context.assetController.loadAssetBrowser(context.assetBrowserPath),
    onAssetBrowserFilterChange: (value: string) => {
      context.setAssetBrowserFilter(value)
    },
    onAssetLibraryItemSelect: context.inspectorController.selectLibraryItem,
    onApplySelectedLibraryAsset:
      context.inspectorController.applySelectedLibraryAssetToTargetNode,
    onCancelAssetPicker: context.inspectorController.cancelAssetPickerTarget,
    onPrefabVariantChange: context.inspectorController.updatePrefabVariant,
    onPrimitiveGeometryChange: (value: string) =>
      context.inspectorController.updatePrimitiveField('geometry', value),
    onPrimitiveArgChange: context.inspectorController.updatePrimitiveArg,
    onLightColorChange: (value: string) =>
      context.inspectorController.updateLightField('color', value),
    onLightNumericChange: context.inspectorController.updateLightNumericField,
    onPlaceLightAtParentBounds:
      context.inspectorController.placeSelectedLightAtParentBounds,
    onGameplayFieldChange: context.inspectorController.updateGameplayField,
    onGameplayNumericChange:
      context.inspectorController.updateGameplayNumericField,
    onGameplayBooleanChange:
      context.inspectorController.updateGameplayBooleanField,
    onStyleDescriptorChange:
      context.inspectorController.updateSelectedNodeStyleDescriptor,
    onApplyGeneratedVariant:
      context.inspectorController.applyGeneratedVariantToSelectedNode,
    onOpenSelectedInBlender: () =>
      void context.styleController.exportSelectedAssetForBlender({
        openInBlender: true,
      }),
    onExportBlenderPackage: () =>
      void context.styleController.exportSelectedAssetForBlender(),
    onReimportBlenderOutput: () =>
      void context.styleController.reimportLatestBlenderOutputForSelection(),
    onAddPointLightToSelection:
      context.createController.addPointLightToSelection,
    onSetViewportLightingMode: context.setEditorViewportLightingMode,
    onSetViewportShadingMode: context.setEditorViewportShadingMode,
    onMaterialColorChange: context.inspectorController.updateNodeMaterialField,
    onMaterialNumericChange:
      context.inspectorController.updateNodeMaterialNumericField,
    onMaterialTextureChange:
      context.inspectorController.updateNodeMaterialTextureField,
    onOpenTexturePicker: context.inspectorController.openTexturePicker,
    onResetMaterialOverrides:
      context.inspectorController.clearNodeMaterialOverrides,
    onCollisionEnabledChange:
      context.inspectorController.updateCollisionEnabled,
    onCollisionModeChange: context.inspectorController.updateCollisionMode,
    onCollisionShapeChange: context.inspectorController.updateCollisionShape,
    onCollisionQualityChange:
      context.inspectorController.updateCollisionQuality,
    onCollisionLodSourceTierChange:
      context.inspectorController.updateCollisionLodSourceTier,
    onCollisionIntentChange: context.inspectorController.updateCollisionIntent,
    onCollisionChannelChange:
      context.inspectorController.updateCollisionChannel,
    onCollisionNumericChange:
      context.inspectorController.updateCollisionNumericField,
    onPhysicsBodyTypeChange: (value: string) =>
      context.inspectorController.updatePhysicsField('bodyType', value),
    onSetCollisionVisualOnly: context.inspectorController.setVisualOnly,
    onSetCollisionBlocker: context.inspectorController.setBlocker,
    onSetCollisionWalkable: context.inspectorController.setWalkable,
    onSetCollisionTrigger: context.inspectorController.setTrigger,
    onSetCollisionDetail: context.inspectorController.setDetail,
    onForceRegenerateCollision: () =>
      void context.inspectorController.forceRegenerateCollisionFromSelection(),
    onTextureBrowserUp: context.inspectorController.goUpTextureBrowser,
    onTextureBrowserRefresh: () =>
      void context.assetController.loadTextureBrowser(
        context.textureBrowserPath,
      ),
    onTextureBrowserOpenDirectory: (path: string) =>
      void context.assetController.loadTextureBrowser(path),
    onTextureBrowserPick: context.inspectorController.applyTextureFromBrowser,
  }
}
