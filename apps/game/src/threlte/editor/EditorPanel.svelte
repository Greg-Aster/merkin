<script lang="ts">
import { EDITOR_API_BASE } from '@config/editorApi'
import { onDestroy, onMount } from 'svelte'
import { get } from 'svelte/store'
import {
  type LevelLifecycleStatus,
  type LevelRegistryEntry,
  levelRegistryStore,
  sanitizeLevelId,
  setLevelRegistry,
} from '../levels/levelRegistry'
import { gameActions } from '../stores/gameStateStore'
import {
  reportRuntimeAssetFailure,
  runtimeAssetFailuresStore,
  setRuntimeDiagnostic,
} from '../stores/runtimeDiagnosticsStore'
import EditorAiTabHost from './EditorAiTabHost.svelte'
import EditorCollisionTabHost from './EditorCollisionTabHost.svelte'
import EditorCommandPalette from './EditorCommandPalette.svelte'
import EditorCreateTabHost from './EditorCreateTabHost.svelte'
import EditorInspectTabHost from './EditorInspectTabHost.svelte'
import EditorMainToolbar from './EditorMainToolbar.svelte'
import EditorNpcTabHost from './EditorNpcTabHost.svelte'
import EditorOutputTabHost from './EditorOutputTabHost.svelte'
import EditorPanelHeader from './EditorPanelHeader.svelte'
import EditorPanelToolsDock from './EditorPanelToolsDock.svelte'
import EditorPerformanceTabHost from './EditorPerformanceTabHost.svelte'
import EditorSaveTabHost from './EditorSaveTabHost.svelte'
import EditorSceneTabHost from './EditorSceneTabHost.svelte'
import EditorSideStackHost from './EditorSideStackHost.svelte'
import EditorStyleTabHost from './EditorStyleTabHost.svelte'
import EditorWorkflowTabHost from './EditorWorkflowTabHost.svelte'
import EditorWorldTabHost from './EditorWorldTabHost.svelte'
import { createDefaultSceneForLevel } from './defaultScenes'
import { createEditorAiController } from './editorAiController'
import { createEditorAssetController } from './editorAssetController'
import { canBakeSceneNode, getPrefabAssetUrl } from './editorBakeSource'
import {
  exportBlenderScenePackage,
  importBlenderSceneDelta,
} from './editorBlenderSceneBridge'
import {
  getDefaultCollisionChannel,
  getDefaultCollisionIntent,
  getDefaultCollisionShape,
  getNodeVisualColliderSize,
  resolveNodeCollision,
} from './editorCollisionDefaults'
import type { EditorCommand } from './editorCommandRegistry'
import { createPrefabGroups } from './editorCreateCatalog'
import { createEditorCreateController } from './editorCreateController'
import {
  EDITOR_PREFAB_GENERATION_LABELS,
  inferNodeGenerationDescriptor,
} from './editorGeneration'
import { createGroundTerrainRuntimePublisher } from './editorGroundTerrainRuntimePublisher'
import {
  collectSubtreeIds,
  createWorldMatrixResolver,
  getTopLevelNodeIds,
} from './editorHierarchyUtils'
import { createEditorInspectorController } from './editorInspectorController'
import { createEditorLevelController } from './editorLevelController'
import {
  resolveObservatoryPresetSettings,
  resolveSolitudePresetSettings,
  solitudeAtmospherePresets,
} from './editorLevelPresets'
import {
  mergeLevelSettings,
  normalizeLevelSceneSettings,
} from './editorLevelSetup'
import {
  OUTLINER_MODE_OPTIONS,
  buildOutlinerItems,
  flattenOutlinerItems,
  getOutlinerExpandedIds,
} from './editorOutliner'
import { createEditorOutlinerController } from './editorOutlinerController'
import type {
  OutlinerDisplayMode,
  OutlinerNodeViewportState,
} from './editorOutlinerTypes'
import {
  buildAiTabProps,
  buildCollisionTabProps,
  buildCreateTabProps,
  buildEnvironmentTabProps,
  buildInspectTabProps,
  buildNpcTabProps,
  buildPlayerTabProps,
  buildSaveTabProps,
  buildSceneTabProps,
  buildSideStackProps,
  buildStyleTabProps,
  buildWorkflowTabProps,
} from './editorPanelPropBuilders'
import type { EditorPanelTab } from './editorPanelTabs'
import {
  type PersistedStyleBatchSession,
  loadStyleBatchSessionFromLocalStorage,
  saveEditorSceneToLocalStorage,
} from './editorPersistence'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'
import {
  EDITOR_LAYOUT_PRESETS,
  EDITOR_LAYOUT_PRESET_OPTIONS,
  type EditorLayoutPreset,
  type EditorMaterialData,
  type EditorSceneDocument,
  type EditorSceneNode,
  type EditorStylePreset,
  type LevelCollisionBudget,
  addEmptyNode,
  addNode,
  applyEditorLayoutPreset,
  canRedoStore,
  canUndoStore,
  clearIsolatedNodes,
  clearSelection,
  createEmptyScene,
  duplicateNodes,
  editorNodeViewportStateStore,
  editorNodesStore,
  editorPrefabs,
  editorSceneStore,
  editorStateStore,
  endSceneTransaction,
  executeSceneCommands,
  exportSceneJson,
  getProtectedSceneNodeRemovalIds,
  groupNodes,
  importSceneJson,
  patchNode,
  patchNodes,
  redoScene,
  removeNodes,
  reparentNodes,
  requestEditorViewportFocus,
  resetEditorDockLayout,
  resetEditorLayoutPreset,
  saveSceneToLocalStorage,
  selectAllNodes,
  selectEditorNode,
  selectedEditorNodeStore,
  selectedEditorNodesStore,
  setCollisionOverlayEnabled,
  setControlsOverlayOpen,
  setEditorDockLayout,
  setEditorInteractionMode,
  setEditorScene,
  setEditorViewportLightingMode,
  setEditorViewportMode,
  setEditorViewportShadingMode,
  setIsolatedNodes,
  setObjectToolMode,
  setOutlinerOpen,
  setPanelOpen,
  setPropertiesShelfOpen,
  setResponsiveSplitPinned,
  setRotateSnap,
  setScaleSnap,
  setSelectedNodes,
  setSnappingEnabled,
  setSurfaceSnapEnabled,
  setSurfaceSnapOffset,
  setTerrainBrushFalloff,
  setTerrainBrushMode,
  setTerrainBrushSize,
  setTerrainBrushStrength,
  setTransformAxis,
  setTransformMode,
  setTransformSpace,
  setTranslateSnap,
  startSceneTransaction,
  toggleIsolatedNode,
  togglePanelOpen,
  togglePropertiesShelfOpen,
  undoScene,
  ungroupNodes,
  updateLevelSceneSettings,
} from './editorStore'
import type {
  EditorStyleBakeBackend,
  EditorStyleBakeOutputTier,
  EditorStyleBakePreviewSnapshot,
  EditorStyleBakeProduct,
  EditorStyleBakeStatus,
} from './editorStyleBakeTypes'
import {
  type EditorStyleSceneCandidate,
  buildStyleSceneCandidates,
  getCuratedStyleBatchCandidateIds,
  getStyleBatchPresetById,
  getUnreimaginedStyleBatchCandidateIds,
  reconcileStyleBatchSelection,
  stylePresetOptions,
} from './editorStyleBatchSelection'
import { createEditorStyleController } from './editorStyleController'
import { isGeneratedHeightmapChunkTerrain } from './editorTerrainModeGuards'
import {
  type EditorTerrainStatusSnapshot,
  describeEditorTerrainPipeline,
  planEditorTerrainBakeSteps,
} from './editorTerrainPipeline'
import {
  type HeightmapSourceDescriptor,
  applyTerrainChunkCookPayload,
  applyTerrainCollisionBakePayload,
  applyTerrainHeightmapPayload,
  buildTerrainChunkCookRequest,
  buildTerrainHeightmapRequest,
} from './editorTerrainPipelineRunner'

export let levelId: string

let editorState
let editorNodes: EditorSceneNode[] = []
let editorScene = null
let levelRegistryEntries: LevelRegistryEntry[] = []
let nodeViewportStateById = new Map<string, OutlinerNodeViewportState>()
let selectedNode: EditorSceneNode | null = null
let selectedNodes: EditorSceneNode[] = []
let commandPaletteOpen = false
let editorCommands: EditorCommand[] = []
let dockResizeTarget: {
  dock: 'tools' | 'side'
  axis: 'x' | 'y'
} | null = null
let editorViewportWidth = 1440
let editorViewportHeight = 900
let lastAppliedLayoutPreset: EditorLayoutPreset = 'default'
let buildWorkflowOpen = true
let buildOutputOpen = false
let heightmapSourceNodes: EditorSceneNode[] = []
let heightmapCandidateNodes: EditorSceneNode[] = []
let heightmapSourceDescriptors: HeightmapSourceDescriptor[] = []
let canUndo = false
let canRedo = false
let importBuffer = ''
let saveMessage = 'Local only'
let blenderSceneExportResult: {
  packagePath: string
  packageDirectory: string
  nodeCount: number
  assetCount: number
  warningCount: number
} | null = null
let publishPipelineState: EditorPublishPipelineState =
  createInitialEditorPublishPipelineState()
let terrainCollisionBakePending = false
let terrainHeightmapGeneratePending = false
let terrainChunkCookPending = false
let worldPartitionCookPending = false
let groundTerrainPublishPending = false
let terrainStatusSnapshot: EditorTerrainStatusSnapshot | null = null
let terrainStatusKey = ''
let terrainStatusRequestId = 0
const ASSET_LIBRARY_ROOT_MODELS = 'apps/megameal/public/models'
const ASSET_LIBRARY_ROOT_GENERATED = 'apps/megameal/public/generated/hunyuan3d'
const COMFY_WORKFLOW_LIBRARY_ROOT = 'apps/game/authoring/workflows/ref-image'
const DEFAULT_COMFY_WORKFLOW_PATH =
  'apps/game/authoring/workflows/ref-image/Hunyaun example.json'

let assetBrowserPath = ASSET_LIBRARY_ROOT_MODELS
let assetBrowserItems: Array<{
  name: string
  path: string
  isDirectory: boolean
}> = []
let assetBrowserFilter = ''
let assetBrowserError = ''
let assetBrowserLoading = false
let selectedLibraryItem: {
  name: string
  path: string
  isDirectory: boolean
} | null = null
let assetPickerTargetNodeId = ''
let textureBrowserPath = 'apps/game/public'
let textureBrowserItems: Array<{
  name: string
  path: string
  isDirectory: boolean
}> = []
let textureBrowserError = ''
let textureBrowserLoading = false
let activeTextureMaterialField:
  | 'mapUrl'
  | 'normalMapUrl'
  | 'roughnessMapUrl'
  | 'metalnessMapUrl'
  | 'emissiveMapUrl'
  | 'alphaMapUrl'
  | null = null
let generatedVariantItems: Array<{
  name: string
  path: string
  url: string
  sourceLabel?: string
  isOriginalSource?: boolean
  mode?: string
  generatedAt?: string
  metadataUrl?: string
}> = []
let generatedVariantLoading = false
let generatedVariantError = ''
let selectedGeneratedVariantUrl = ''
let generatedVariantSelectionKey = ''
let workflowBrowserPath = COMFY_WORKFLOW_LIBRARY_ROOT
let workflowBrowserItems: Array<{
  name: string
  path: string
  isDirectory: boolean
}> = []
let workflowBrowserError = ''
let workflowBrowserLoading = false
let selectedComfyWorkflowPath = DEFAULT_COMFY_WORKFLOW_PATH
let comfyUiApiUrl = 'http://127.0.0.1:8188'
let comfyUiStatus =
  'ComfyUI powers local mesh workflows and can be started here.'
let comfyUiBusy = false
let comfyUiReady = false
let comfyUiLowVramMode = false
let aiPreferencesLoaded = false
let comfyUiStatusKey = ''
let comfyWorkflowEditorStatus = ''
let hunyuanApiUrl = 'http://127.0.0.1:8080'
let hunyuanPrompt = ''
let mergeDescriptor = ''
let hunyuanReferenceImageUrl = ''
let hunyuanScratchName = 'Generated Artifact'
let hunyuanScratchReferenceImageUrl = ''
let hunyuanScratchPrompt = ''
let hunyuanDetectedReferenceImageUrl = ''
let hunyuanStatus = 'Select a single asset node to generate or texture.'
let hunyuanBackendStatus = 'Mesh backend not checked yet.'
let hunyuanBusy = false
let hunyuanServiceReady = false
let hunyuanBackendCanGenerate = false
let hunyuanBackendCanRetexture = false
let hunyuanLastOutputUrl = ''
let hunyuanLastResultSummary = ''
let canApplyGeneratedAssetToSelection = false
let hunyuanLastFitReport = ''
let recentHunyuanJobs: Array<any> = []
let hunyuanJobsLoading = false
let hunyuanJobsError = ''
let selectedHunyuanJobId = ''
let hunyuanJobsPollInterval: number | null = null
let hunyuanSupportsReplacement = false
let hunyuanSupportsTextureWrap = false
let hunyuanSelectionKey = ''
let hunyuanInspectToken = 0
let lastInspectedHunyuanAsset = ''
let hunyuanActiveJobId = ''
let autoSaveTimeout: number | null = null
let pendingLevelId = levelId
let newLevelTitle = ''
let newLevelIdInput = ''
let newLevelTemplateId = levelId
let saveAsTitle = ''
let saveAsLevelId = ''
let metadataTitle = ''
let metadataStatus: LevelLifecycleStatus = 'draft'
let metadataDeployed = false
let metadataStarMapEnabled = false
let metadataStarMapYear = 2100
let metadataStarMapDescription = ''
let metadataSourceKind: 'scene' = 'scene'
let loadedMetadataLevelId = ''
type BakeWorkspaceTab = 'style' | 'collision' | 'runtime'

let activeEditorTab: EditorPanelTab = 'scene'
let activeBakeWorkspaceTab: BakeWorkspaceTab = 'style'
let hierarchyFilter = ''
let outlinerDisplayMode: OutlinerDisplayMode = 'view-layer'
let outlinerExpandedIdsByMode: Record<OutlinerDisplayMode, string[]> = {
  'view-layer': ['outliner:view-layer:scene'],
  collections: ['outliner:collections:scene', 'outliner:collections:smart'],
  'blender-file': [
    'outliner:blender-file:root',
    'outliner:blender-file:scenes',
    'outliner:blender-file:collections',
    'outliner:blender-file:objects',
  ],
  'data-api': [
    'outliner:data-api:root',
    'outliner:data-api:scene',
    'outliner:data-api:selection',
  ],
}
let editorTabContentElement: HTMLDivElement | null = null
let lastScrolledTab: EditorPanelTab | null = null
let editorAIMeshStudioComponent:
  | typeof import('./EditorAIMeshStudio.svelte').default
  | null = null
let editorAIMeshStudioPromise: Promise<void> | null = null
let editorStyleStudioComponent:
  | typeof import('./EditorStyleStudio.svelte').default
  | null = null
let editorStyleStudioPromise: Promise<void> | null = null
let hunyuanApplyToSimilarNodes = false
let styleSelectionKey = ''
let styleProfileName = 'Painterly Storybook'
let stylePrompt = ''
let styleNegativePrompt = ''
let styleLoraNotes = ''
let styleControlNetNotes =
  'Preserve silhouette and major surface breakup from the source asset.'
let styleReferenceImageUrl = ''
let styleStatus = 'Select a single geometry node to open the style toolchain.'
let styleInspectReport = ''
let styleSourceSummary = ''
let styleWorkspaceManifestUrl = ''
let styleWorkspaceSourceAssetUrl = ''
let styleGeneratedReferenceImageUrl = ''
let styleSimplifiedAssetUrl = ''
let styleBakedAssetUrl = ''
let styleBakeBackend: EditorStyleBakeBackend = 'procedural-material'
let styleBakeTextureSize = 256
let styleBakeLineStrength = 0.35
let styleBakeBrushStrength = 0.25
let styleBakeAoStrength = 0.8
let styleBakeCavityStrength = 0.65
let styleBakeCurvatureStrength = 0.45
let styleBakeGeometrySimplification = 0
let styleBakeOutputTier: EditorStyleBakeOutputTier = 'preview'
let styleBakeForceRefresh = false
let styleBakeCurrentSourceAssetUrl = ''
let styleBakeProduct: EditorStyleBakeProduct | null = null
let styleBakeProductStatus: EditorStyleBakeStatus = 'missing'
let styleBakeLastError = ''
let styleBakeLastSuccessfulAt = ''
let styleBakeCanApply = false
let styleBakeCanRevert = false
let styleBakePreviewSnapshot: EditorStyleBakePreviewSnapshot | null = null
let styleBlenderExportPath = ''
let styleBlenderOpenCommand = ''
let styleSimplifyRatio = 0.6
let styleSimplifyError = 0.001
let styleBusy = false
let styleWorkspaceRestoreToken = 0
let styleBatchBusy = false
let styleBatchStatus = ''
let styleBatchAbortRequested = false
let styleBatchStopIntent: 'pause' | 'cancel' | null = null
let runtimeAssetFailures: Array<{
  id: string
  source: string
  message: string
  updatedAt: number
}> = []
let styleBatchSelectionIds: string[] = []
let styleBatchSelectionKey = 0
let styleBatchSelectionInitialized = false
let styleLevelDefaultsAppliedFor = ''
let styleBatchNodeStatusById: Record<string, string> = {}
let styleBatchSession: PersistedStyleBatchSession | null = null
let styleBatchResumePromise: Promise<void> | null = null
let styleBatchPendingResume: PersistedStyleBatchSession | null = null
let styleSelectableSceneCandidates: EditorStyleSceneCandidate[] = []
let styleSceneCandidates: EditorStyleSceneCandidate[] = []

function sendPipelineLogToTerminal(message: string, detail?: unknown) {
  void fetch(`${EDITOR_API_BASE}/api/editor/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'pipeline',
      message,
      detail,
    }),
  }).catch(() => {
    // Terminal mirroring is best-effort only.
  })
}

function appendPipelineLog(message: string, detail?: unknown) {
  sendPipelineLogToTerminal(message, detail)
}

const unsubState = editorStateStore.subscribe(value => {
  editorState = value
})
const unsubNodes = editorNodesStore.subscribe(value => {
  editorNodes = value
})
const unsubScene = editorSceneStore.subscribe(value => {
  editorScene = value
})
const unsubRegistry = levelRegistryStore.subscribe(value => {
  levelRegistryEntries = value
})
const unsubViewportState = editorNodeViewportStateStore.subscribe(value => {
  nodeViewportStateById = value
})
const unsubSelected = selectedEditorNodeStore.subscribe(value => {
  selectedNode = value
})
const unsubSelectedNodes = selectedEditorNodesStore.subscribe(value => {
  selectedNodes = value
})
const unsubCanUndo = canUndoStore.subscribe(value => {
  canUndo = value
})
const unsubCanRedo = canRedoStore.subscribe(value => {
  canRedo = value
})
const unsubRuntimeAssetFailures = runtimeAssetFailuresStore.subscribe(value => {
  runtimeAssetFailures = value
})

const assetOptions = [
  {
    label: 'Hanging Light',
    url: '/models/polyhaven/caged_hanging_light/caged_hanging_light_1k.gltf',
  },
  {
    label: 'Aircon Unit',
    url: '/models/polyhaven/exterior_aircon_unit/exterior_aircon_unit_1k.gltf',
  },
  { label: 'Barrel', url: '/models/polyhaven/Barrel_01/Barrel_01_1k.gltf' },
  {
    label: 'Concrete Barrier',
    url: '/models/polyhaven/concrete_road_barrier_02/concrete_road_barrier_02_1k.gltf',
  },
]

function getNodeDepth(node: EditorSceneNode, allNodes: EditorSceneNode[]) {
  let depth = 0
  let currentParentId = node.parentId ?? null
  while (currentParentId) {
    const parent = allNodes.find(candidate => candidate.id === currentParentId)
    if (!parent) break
    depth += 1
    currentParentId = parent.parentId ?? null
    if (depth > 32) break
  }
  return depth
}

function flattenNodes(nodes: EditorSceneNode[]) {
  const result: EditorSceneNode[] = []
  const visit = (parentId: string | null, depth: number) => {
    const children = nodes.filter(node => (node.parentId ?? null) === parentId)
    for (const child of children) {
      result.push({ ...child, __depth: depth } as EditorSceneNode & {
        __depth: number
      })
      visit(child.id, depth + 1)
    }
  }
  visit(null, 0)
  return result as Array<EditorSceneNode & { __depth: number }>
}

const outlinerModeOptions = OUTLINER_MODE_OPTIONS

const outlinerController = createEditorOutlinerController({
  getEditorNodes: () => editorNodes,
  getEditorState: () => editorState,
  getOutlinerDisplayMode: () => outlinerDisplayMode,
  setOutlinerDisplayMode: mode => {
    outlinerDisplayMode = mode
  },
  getOutlinerExpandedIdsByMode: () => outlinerExpandedIdsByMode,
  setOutlinerExpandedIdsByMode: value => {
    outlinerExpandedIdsByMode = value
  },
  getOutlinerVisibleNodeOrder: () => outlinerVisibleNodeOrder,
  selectEditorNode,
  setSelectedNodes,
  patchNodes,
  clearIsolatedNodes,
  setIsolatedNodes,
  getDraggedHierarchyNodeIds: () => draggedHierarchyNodeIds,
  setDraggedHierarchyNodeIds: nodeIds => {
    draggedHierarchyNodeIds = nodeIds
  },
  getDragSelectionIds: () => dragSelectionIds,
  setHierarchyDropTargetId: nodeId => {
    hierarchyDropTargetId = nodeId
  },
  setHierarchyRootDropActive: active => {
    hierarchyRootDropActive = active
  },
  reparentNodes,
  setSaveMessage: message => {
    saveMessage = message
  },
})

const createController = createEditorCreateController({
  getSelectedNode: () => selectedNode,
  getSelectedNodes: () => selectedNodes,
  getEditorNodes: () => editorNodes,
  getActiveSceneLevelId: () => activeSceneLevelId,
  setSaveMessage: message => {
    saveMessage = message
  },
  addNode,
  addEmptyNode,
  setSelectedNodes,
  groupNodes,
  ungroupNodes,
  duplicateNodes,
  removeNodes,
  editorPrefabs,
})

const levelController = createEditorLevelController({
  getEditorSceneStore: () => editorSceneStore,
  getLevelId: () => levelId,
  getActiveSceneLevelId: () => activeSceneLevelId,
  getLevelRegistryEntries: () => levelRegistryEntries,
  getMetadataState: () => ({
    metadataTitle,
    metadataStatus,
    metadataDeployed,
    metadataStarMapEnabled,
    metadataStarMapYear,
    metadataStarMapDescription,
    metadataSourceKind,
    saveAsTitle,
    saveAsLevelId,
    newLevelTitle,
    newLevelIdInput,
    newLevelTemplateId,
    importBuffer,
  }),
  setMetadataState: next => {
    if (next.metadataTitle !== undefined) metadataTitle = next.metadataTitle
    if (next.metadataStatus !== undefined) metadataStatus = next.metadataStatus
    if (next.metadataDeployed !== undefined)
      metadataDeployed = next.metadataDeployed
    if (next.metadataStarMapEnabled !== undefined)
      metadataStarMapEnabled = next.metadataStarMapEnabled
    if (next.metadataStarMapYear !== undefined)
      metadataStarMapYear = next.metadataStarMapYear
    if (next.metadataStarMapDescription !== undefined)
      metadataStarMapDescription = next.metadataStarMapDescription
    if (next.metadataSourceKind !== undefined)
      metadataSourceKind = next.metadataSourceKind
    if (next.saveAsTitle !== undefined) saveAsTitle = next.saveAsTitle
    if (next.saveAsLevelId !== undefined) saveAsLevelId = next.saveAsLevelId
    if (next.newLevelTitle !== undefined) newLevelTitle = next.newLevelTitle
    if (next.newLevelIdInput !== undefined)
      newLevelIdInput = next.newLevelIdInput
    if (next.newLevelTemplateId !== undefined)
      newLevelTemplateId = next.newLevelTemplateId
    if (next.importBuffer !== undefined) importBuffer = next.importBuffer
  },
  setSaveMessage: message => {
    saveMessage = message
  },
  setLevelRegistry,
  sanitizeLevelId,
  saveEditorSceneToLocalStorage,
  saveSceneToLocalStorage,
  exportSceneJson,
  importSceneJson,
  clearSelection,
  transitionToLevel: gameActions.transitionToLevel,
  createEmptyScene,
  setEditorScene,
  setPublishPipelineState: state => {
    publishPipelineState = state
  },
})

const groundTerrainRuntimePublisher = createGroundTerrainRuntimePublisher({
  editorApiBase: EDITOR_API_BASE,
  getActiveSceneLevelId: () => activeSceneLevelId,
  saveSceneDocumentToDisk: levelController.saveSceneDocumentToDisk,
  getPending: () => groundTerrainPublishPending,
  setPending: pending => {
    groundTerrainPublishPending = pending
  },
  setSaveMessage: message => {
    saveMessage = message
  },
})

const textureFilePattern = /\.(png|jpe?g|webp|gif|bmp|tga|avif)$/i

let styleController: ReturnType<typeof createEditorStyleController>
let aiController: ReturnType<typeof createEditorAiController>

const assetController = createEditorAssetController({
  state: {
    get assetBrowserPath() {
      return assetBrowserPath
    },
    set assetBrowserPath(value) {
      assetBrowserPath = value
    },
    get assetBrowserItems() {
      return assetBrowserItems
    },
    set assetBrowserItems(value) {
      assetBrowserItems = value
    },
    get assetBrowserFilter() {
      return assetBrowserFilter
    },
    set assetBrowserFilter(value) {
      assetBrowserFilter = value
    },
    get assetBrowserError() {
      return assetBrowserError
    },
    set assetBrowserError(value) {
      assetBrowserError = value
    },
    get assetBrowserLoading() {
      return assetBrowserLoading
    },
    set assetBrowserLoading(value) {
      assetBrowserLoading = value
    },
    get selectedLibraryItem() {
      return selectedLibraryItem
    },
    set selectedLibraryItem(value) {
      selectedLibraryItem = value
    },
    get textureBrowserPath() {
      return textureBrowserPath
    },
    set textureBrowserPath(value) {
      textureBrowserPath = value
    },
    get textureBrowserItems() {
      return textureBrowserItems
    },
    set textureBrowserItems(value) {
      textureBrowserItems = value
    },
    get textureBrowserError() {
      return textureBrowserError
    },
    set textureBrowserError(value) {
      textureBrowserError = value
    },
    get textureBrowserLoading() {
      return textureBrowserLoading
    },
    set textureBrowserLoading(value) {
      textureBrowserLoading = value
    },
    get workflowBrowserPath() {
      return workflowBrowserPath
    },
    set workflowBrowserPath(value) {
      workflowBrowserPath = value
    },
    get workflowBrowserItems() {
      return workflowBrowserItems
    },
    set workflowBrowserItems(value) {
      workflowBrowserItems = value
    },
    get workflowBrowserError() {
      return workflowBrowserError
    },
    set workflowBrowserError(value) {
      workflowBrowserError = value
    },
    get workflowBrowserLoading() {
      return workflowBrowserLoading
    },
    set workflowBrowserLoading(value) {
      workflowBrowserLoading = value
    },
    get selectedComfyWorkflowPath() {
      return selectedComfyWorkflowPath
    },
    set selectedComfyWorkflowPath(value) {
      selectedComfyWorkflowPath = value
    },
    get generatedVariantItems() {
      return generatedVariantItems
    },
    set generatedVariantItems(value) {
      generatedVariantItems = value
    },
    get generatedVariantLoading() {
      return generatedVariantLoading
    },
    set generatedVariantLoading(value) {
      generatedVariantLoading = value
    },
    get generatedVariantError() {
      return generatedVariantError
    },
    set generatedVariantError(value) {
      generatedVariantError = value
    },
    get selectedGeneratedVariantUrl() {
      return selectedGeneratedVariantUrl
    },
    set selectedGeneratedVariantUrl(value) {
      selectedGeneratedVariantUrl = value
    },
    get hunyuanStatus() {
      return hunyuanStatus
    },
    set hunyuanStatus(value) {
      hunyuanStatus = value
    },
    get hunyuanDetectedReferenceImageUrl() {
      return hunyuanDetectedReferenceImageUrl
    },
    set hunyuanDetectedReferenceImageUrl(value) {
      hunyuanDetectedReferenceImageUrl = value
    },
    get hunyuanReferenceImageUrl() {
      return hunyuanReferenceImageUrl
    },
    set hunyuanReferenceImageUrl(value) {
      hunyuanReferenceImageUrl = value
    },
    get hunyuanSupportsReplacement() {
      return hunyuanSupportsReplacement
    },
    set hunyuanSupportsReplacement(value) {
      hunyuanSupportsReplacement = value
    },
    get hunyuanSupportsTextureWrap() {
      return hunyuanSupportsTextureWrap
    },
    set hunyuanSupportsTextureWrap(value) {
      hunyuanSupportsTextureWrap = value
    },
    get hunyuanLastOutputUrl() {
      return hunyuanLastOutputUrl
    },
    set hunyuanLastOutputUrl(value) {
      hunyuanLastOutputUrl = value
    },
    get hunyuanLastResultSummary() {
      return hunyuanLastResultSummary
    },
    set hunyuanLastResultSummary(value) {
      hunyuanLastResultSummary = value
    },
    get hunyuanSelectionKey() {
      return hunyuanSelectionKey
    },
    set hunyuanSelectionKey(value) {
      hunyuanSelectionKey = value
    },
    get hunyuanInspectToken() {
      return hunyuanInspectToken
    },
    set hunyuanInspectToken(value) {
      hunyuanInspectToken = value
    },
  },
  assetLibraryRootGenerated: ASSET_LIBRARY_ROOT_GENERATED,
  defaultComfyWorkflowPath: DEFAULT_COMFY_WORKFLOW_PATH,
  textureFilePattern,
  getSelectedNode: () => selectedNode,
  getSelectedNodes: () => selectedNodes,
  getEditorNodes: () => editorNodes,
  getActiveSceneLevelId: () => activeSceneLevelId,
  getCanUseAiMeshStudio: canUseAiMeshStudio,
  getAiSourceName,
  getDefaultStyleDescriptor,
  getNodeTransformSnapshot: node =>
    styleController?.getNodeTransformSnapshot(node) ?? null,
  readJsonPayload,
  setRuntimeDiagnostic,
  reportRuntimeAssetFailure,
  appendPipelineLog,
  patchNode,
  patchNodes,
  addNode,
  removeNodes,
  startSceneTransaction,
  endSceneTransaction,
  addAssetPrefab: createController.addAssetPrefab,
  setActiveEditorTab: tab => {
    activeEditorTab = tab as EditorPanelTab
  },
  setSaveMessage: message => {
    saveMessage = message
  },
})

styleController = createEditorStyleController({
  state: {
    get styleSelectionKey() {
      return styleSelectionKey
    },
    set styleSelectionKey(value) {
      styleSelectionKey = value
    },
    get styleProfileName() {
      return styleProfileName
    },
    set styleProfileName(value) {
      styleProfileName = value
    },
    get stylePrompt() {
      return stylePrompt
    },
    set stylePrompt(value) {
      stylePrompt = value
    },
    get styleNegativePrompt() {
      return styleNegativePrompt
    },
    set styleNegativePrompt(value) {
      styleNegativePrompt = value
    },
    get styleLoraNotes() {
      return styleLoraNotes
    },
    set styleLoraNotes(value) {
      styleLoraNotes = value
    },
    get styleControlNetNotes() {
      return styleControlNetNotes
    },
    set styleControlNetNotes(value) {
      styleControlNetNotes = value
    },
    get styleReferenceImageUrl() {
      return styleReferenceImageUrl
    },
    set styleReferenceImageUrl(value) {
      styleReferenceImageUrl = value
    },
    get styleStatus() {
      return styleStatus
    },
    set styleStatus(value) {
      styleStatus = value
    },
    get styleInspectReport() {
      return styleInspectReport
    },
    set styleInspectReport(value) {
      styleInspectReport = value
    },
    get styleSourceSummary() {
      return styleSourceSummary
    },
    set styleSourceSummary(value) {
      styleSourceSummary = value
    },
    get styleWorkspaceManifestUrl() {
      return styleWorkspaceManifestUrl
    },
    set styleWorkspaceManifestUrl(value) {
      styleWorkspaceManifestUrl = value
    },
    get styleWorkspaceSourceAssetUrl() {
      return styleWorkspaceSourceAssetUrl
    },
    set styleWorkspaceSourceAssetUrl(value) {
      styleWorkspaceSourceAssetUrl = value
    },
    get styleGeneratedReferenceImageUrl() {
      return styleGeneratedReferenceImageUrl
    },
    set styleGeneratedReferenceImageUrl(value) {
      styleGeneratedReferenceImageUrl = value
    },
    get styleSimplifiedAssetUrl() {
      return styleSimplifiedAssetUrl
    },
    set styleSimplifiedAssetUrl(value) {
      styleSimplifiedAssetUrl = value
    },
    get styleBakedAssetUrl() {
      return styleBakedAssetUrl
    },
    set styleBakedAssetUrl(value) {
      styleBakedAssetUrl = value
    },
    get styleBakeBackend() {
      return styleBakeBackend
    },
    set styleBakeBackend(value) {
      styleBakeBackend = value
    },
    get styleBakeTextureSize() {
      return styleBakeTextureSize
    },
    set styleBakeTextureSize(value) {
      styleBakeTextureSize = Number(value)
    },
    get styleBakeLineStrength() {
      return styleBakeLineStrength
    },
    set styleBakeLineStrength(value) {
      styleBakeLineStrength = Number(value)
    },
    get styleBakeBrushStrength() {
      return styleBakeBrushStrength
    },
    set styleBakeBrushStrength(value) {
      styleBakeBrushStrength = Number(value)
    },
    get styleBakeAoStrength() {
      return styleBakeAoStrength
    },
    set styleBakeAoStrength(value) {
      styleBakeAoStrength = Number(value)
    },
    get styleBakeCavityStrength() {
      return styleBakeCavityStrength
    },
    set styleBakeCavityStrength(value) {
      styleBakeCavityStrength = Number(value)
    },
    get styleBakeCurvatureStrength() {
      return styleBakeCurvatureStrength
    },
    set styleBakeCurvatureStrength(value) {
      styleBakeCurvatureStrength = Number(value)
    },
    get styleBakeGeometrySimplification() {
      return styleBakeGeometrySimplification
    },
    set styleBakeGeometrySimplification(value) {
      styleBakeGeometrySimplification = Number(value)
    },
    get styleBakeOutputTier() {
      return styleBakeOutputTier
    },
    set styleBakeOutputTier(value) {
      styleBakeOutputTier = value
    },
    get styleBakeForceRefresh() {
      return styleBakeForceRefresh
    },
    set styleBakeForceRefresh(value) {
      styleBakeForceRefresh = Boolean(value)
    },
    get styleBakeCurrentSourceAssetUrl() {
      return styleBakeCurrentSourceAssetUrl
    },
    set styleBakeCurrentSourceAssetUrl(value) {
      styleBakeCurrentSourceAssetUrl = value
    },
    get styleBakeProduct() {
      return styleBakeProduct
    },
    set styleBakeProduct(value) {
      styleBakeProduct = value
    },
    get styleBakeProductStatus() {
      return styleBakeProductStatus
    },
    set styleBakeProductStatus(value) {
      styleBakeProductStatus = value
    },
    get styleBakeLastError() {
      return styleBakeLastError
    },
    set styleBakeLastError(value) {
      styleBakeLastError = value
    },
    get styleBakeLastSuccessfulAt() {
      return styleBakeLastSuccessfulAt
    },
    set styleBakeLastSuccessfulAt(value) {
      styleBakeLastSuccessfulAt = value
    },
    get styleBakeCanApply() {
      return styleBakeCanApply
    },
    set styleBakeCanApply(value) {
      styleBakeCanApply = Boolean(value)
    },
    get styleBakeCanRevert() {
      return styleBakeCanRevert
    },
    set styleBakeCanRevert(value) {
      styleBakeCanRevert = Boolean(value)
    },
    get styleBakePreviewSnapshot() {
      return styleBakePreviewSnapshot
    },
    set styleBakePreviewSnapshot(value) {
      styleBakePreviewSnapshot = value
    },
    get styleBlenderExportPath() {
      return styleBlenderExportPath
    },
    set styleBlenderExportPath(value) {
      styleBlenderExportPath = value
    },
    get styleBlenderOpenCommand() {
      return styleBlenderOpenCommand
    },
    set styleBlenderOpenCommand(value) {
      styleBlenderOpenCommand = value
    },
    get styleSimplifyRatio() {
      return styleSimplifyRatio
    },
    set styleSimplifyRatio(value) {
      styleSimplifyRatio = value
    },
    get styleSimplifyError() {
      return styleSimplifyError
    },
    set styleSimplifyError(value) {
      styleSimplifyError = value
    },
    get styleBusy() {
      return styleBusy
    },
    set styleBusy(value) {
      styleBusy = value
    },
    get styleWorkspaceRestoreToken() {
      return styleWorkspaceRestoreToken
    },
    set styleWorkspaceRestoreToken(value) {
      styleWorkspaceRestoreToken = value
    },
    get styleBatchBusy() {
      return styleBatchBusy
    },
    set styleBatchBusy(value) {
      styleBatchBusy = value
    },
    get styleBatchStatus() {
      return styleBatchStatus
    },
    set styleBatchStatus(value) {
      styleBatchStatus = value
    },
    get styleBatchAbortRequested() {
      return styleBatchAbortRequested
    },
    set styleBatchAbortRequested(value) {
      styleBatchAbortRequested = value
    },
    get styleBatchStopIntent() {
      return styleBatchStopIntent
    },
    set styleBatchStopIntent(value) {
      styleBatchStopIntent = value
    },
    get styleBatchSelectionIds() {
      return styleBatchSelectionIds
    },
    set styleBatchSelectionIds(value) {
      styleBatchSelectionIds = value
    },
    get styleBatchNodeStatusById() {
      return styleBatchNodeStatusById
    },
    set styleBatchNodeStatusById(value) {
      styleBatchNodeStatusById = value
    },
    get styleBatchSession() {
      return styleBatchSession
    },
    set styleBatchSession(value) {
      styleBatchSession = value
    },
    get styleBatchResumePromise() {
      return styleBatchResumePromise
    },
    set styleBatchResumePromise(value) {
      styleBatchResumePromise = value
    },
    get styleBatchPendingResume() {
      return styleBatchPendingResume
    },
    set styleBatchPendingResume(value) {
      styleBatchPendingResume = value
    },
    get comfyUiApiUrl() {
      return comfyUiApiUrl
    },
    set comfyUiApiUrl(value) {
      comfyUiApiUrl = value
    },
    get comfyUiLowVramMode() {
      return comfyUiLowVramMode
    },
    set comfyUiLowVramMode(value) {
      comfyUiLowVramMode = Boolean(value)
    },
    get hunyuanApiUrl() {
      return hunyuanApiUrl
    },
    set hunyuanApiUrl(value) {
      hunyuanApiUrl = value
    },
    get selectedComfyWorkflowPath() {
      return selectedComfyWorkflowPath
    },
    set selectedComfyWorkflowPath(value) {
      selectedComfyWorkflowPath = value
    },
    get hunyuanPrompt() {
      return hunyuanPrompt
    },
    set hunyuanPrompt(value) {
      hunyuanPrompt = value
    },
    get hunyuanReferenceImageUrl() {
      return hunyuanReferenceImageUrl
    },
    set hunyuanReferenceImageUrl(value) {
      hunyuanReferenceImageUrl = value
    },
    get hunyuanLastOutputUrl() {
      return hunyuanLastOutputUrl
    },
    set hunyuanLastOutputUrl(value) {
      hunyuanLastOutputUrl = value
    },
    get hunyuanLastFitReport() {
      return hunyuanLastFitReport
    },
    set hunyuanLastFitReport(value) {
      hunyuanLastFitReport = value
    },
    get hunyuanActiveJobId() {
      return hunyuanActiveJobId
    },
    set hunyuanActiveJobId(value) {
      hunyuanActiveJobId = value
    },
    get hunyuanBackendCanGenerate() {
      return hunyuanBackendCanGenerate
    },
    set hunyuanBackendCanGenerate(value) {
      hunyuanBackendCanGenerate = value
    },
    get hunyuanBackendCanRetexture() {
      return hunyuanBackendCanRetexture
    },
    set hunyuanBackendCanRetexture(value) {
      hunyuanBackendCanRetexture = value
    },
    get hunyuanBackendStatus() {
      return hunyuanBackendStatus
    },
    set hunyuanBackendStatus(value) {
      hunyuanBackendStatus = value
    },
    get hunyuanBusy() {
      return hunyuanBusy
    },
    set hunyuanBusy(value) {
      hunyuanBusy = value
    },
    get hunyuanServiceReady() {
      return hunyuanServiceReady
    },
    set hunyuanServiceReady(value) {
      hunyuanServiceReady = value
    },
    get hunyuanDetectedReferenceImageUrl() {
      return hunyuanDetectedReferenceImageUrl
    },
    set hunyuanDetectedReferenceImageUrl(value) {
      hunyuanDetectedReferenceImageUrl = value
    },
    get selectedGeneratedVariantUrl() {
      return selectedGeneratedVariantUrl
    },
    set selectedGeneratedVariantUrl(value) {
      selectedGeneratedVariantUrl = value
    },
    get selectedHunyuanJobId() {
      return selectedHunyuanJobId
    },
    set selectedHunyuanJobId(value) {
      selectedHunyuanJobId = value
    },
    get saveMessage() {
      return saveMessage
    },
    set saveMessage(value) {
      saveMessage = value
    },
  },
  getSelectedNode: () => selectedNode,
  getSelectedNodes: () => selectedNodes,
  getEditorNodes: () => editorNodes,
  getActiveSceneLevelId: () => activeSceneLevelId,
  getStyleSceneCandidates: () => styleSceneCandidates,
  canUseStyleStudio,
  getDefaultStyleDescriptor,
  getAiSourceName,
  ensureSceneNodeSourceAsset: assetController.ensureSceneNodeSourceAsset,
  readJsonPayload,
  appendPipelineLog,
  refreshGeneratedAssetLibrary: assetController.refreshGeneratedAssetLibrary,
  inspectSelectedAssetForHunyuan:
    assetController.inspectSelectedAssetForHunyuan,
  saveSceneDocumentToDisk: levelController.saveSceneDocumentToDisk,
  getCurrentScene: () => get(editorSceneStore),
  patchNode,
  queueHunyuanJob: (...args) => aiController.queueHunyuanJob(...args),
  waitForQueuedHunyuanJob: (...args) =>
    aiController.waitForQueuedHunyuanJob(...args),
  refreshHunyuanServiceStatus: (...args) =>
    aiController.refreshHunyuanServiceStatus(...args),
  refreshHunyuanRecentJobs: () => aiController.refreshHunyuanRecentJobs(),
  runHunyuanForSelection: (...args) =>
    aiController.runHunyuanForSelection(...args),
})

aiController = createEditorAiController({
  state: {
    get hunyuanApiUrl() {
      return hunyuanApiUrl
    },
    set hunyuanApiUrl(value) {
      hunyuanApiUrl = value
    },
    get comfyUiApiUrl() {
      return comfyUiApiUrl
    },
    set comfyUiApiUrl(value) {
      comfyUiApiUrl = value
    },
    get comfyUiLowVramMode() {
      return comfyUiLowVramMode
    },
    set comfyUiLowVramMode(value) {
      comfyUiLowVramMode = Boolean(value)
    },
    get selectedComfyWorkflowPath() {
      return selectedComfyWorkflowPath
    },
    set selectedComfyWorkflowPath(value) {
      selectedComfyWorkflowPath = value
    },
    get hunyuanStatus() {
      return hunyuanStatus
    },
    set hunyuanStatus(value) {
      hunyuanStatus = value
    },
    get hunyuanBusy() {
      return hunyuanBusy
    },
    set hunyuanBusy(value) {
      hunyuanBusy = value
    },
    get hunyuanServiceReady() {
      return hunyuanServiceReady
    },
    set hunyuanServiceReady(value) {
      hunyuanServiceReady = value
    },
    get hunyuanBackendCanGenerate() {
      return hunyuanBackendCanGenerate
    },
    set hunyuanBackendCanGenerate(value) {
      hunyuanBackendCanGenerate = value
    },
    get hunyuanBackendCanRetexture() {
      return hunyuanBackendCanRetexture
    },
    set hunyuanBackendCanRetexture(value) {
      hunyuanBackendCanRetexture = value
    },
    get hunyuanBackendStatus() {
      return hunyuanBackendStatus
    },
    set hunyuanBackendStatus(value) {
      hunyuanBackendStatus = value
    },
    get hunyuanPrompt() {
      return hunyuanPrompt
    },
    set hunyuanPrompt(value) {
      hunyuanPrompt = value
    },
    get hunyuanReferenceImageUrl() {
      return hunyuanReferenceImageUrl
    },
    set hunyuanReferenceImageUrl(value) {
      hunyuanReferenceImageUrl = value
    },
    get hunyuanScratchName() {
      return hunyuanScratchName
    },
    set hunyuanScratchName(value) {
      hunyuanScratchName = value
    },
    get hunyuanScratchReferenceImageUrl() {
      return hunyuanScratchReferenceImageUrl
    },
    set hunyuanScratchReferenceImageUrl(value) {
      hunyuanScratchReferenceImageUrl = value
    },
    get hunyuanScratchPrompt() {
      return hunyuanScratchPrompt
    },
    set hunyuanScratchPrompt(value) {
      hunyuanScratchPrompt = value
    },
    get hunyuanLastFitReport() {
      return hunyuanLastFitReport
    },
    set hunyuanLastFitReport(value) {
      hunyuanLastFitReport = value
    },
    get hunyuanLastOutputUrl() {
      return hunyuanLastOutputUrl
    },
    set hunyuanLastOutputUrl(value) {
      hunyuanLastOutputUrl = value
    },
    get hunyuanLastResultSummary() {
      return hunyuanLastResultSummary
    },
    set hunyuanLastResultSummary(value) {
      hunyuanLastResultSummary = value
    },
    get hunyuanSupportsReplacement() {
      return hunyuanSupportsReplacement
    },
    set hunyuanSupportsReplacement(value) {
      hunyuanSupportsReplacement = value
    },
    get hunyuanSupportsTextureWrap() {
      return hunyuanSupportsTextureWrap
    },
    set hunyuanSupportsTextureWrap(value) {
      hunyuanSupportsTextureWrap = value
    },
    get hunyuanDetectedReferenceImageUrl() {
      return hunyuanDetectedReferenceImageUrl
    },
    set hunyuanDetectedReferenceImageUrl(value) {
      hunyuanDetectedReferenceImageUrl = value
    },
    get hunyuanActiveJobId() {
      return hunyuanActiveJobId
    },
    set hunyuanActiveJobId(value) {
      hunyuanActiveJobId = value
    },
    get hunyuanJobsLoading() {
      return hunyuanJobsLoading
    },
    set hunyuanJobsLoading(value) {
      hunyuanJobsLoading = value
    },
    get hunyuanJobsError() {
      return hunyuanJobsError
    },
    set hunyuanJobsError(value) {
      hunyuanJobsError = value
    },
    get recentHunyuanJobs() {
      return recentHunyuanJobs
    },
    set recentHunyuanJobs(value) {
      recentHunyuanJobs = value
    },
    get selectedHunyuanJobId() {
      return selectedHunyuanJobId
    },
    set selectedHunyuanJobId(value) {
      selectedHunyuanJobId = value
    },
    get comfyUiBusy() {
      return comfyUiBusy
    },
    set comfyUiBusy(value) {
      comfyUiBusy = value
    },
    get comfyUiReady() {
      return comfyUiReady
    },
    set comfyUiReady(value) {
      comfyUiReady = value
    },
    get comfyUiStatus() {
      return comfyUiStatus
    },
    set comfyUiStatus(value) {
      comfyUiStatus = value
    },
    get comfyWorkflowEditorStatus() {
      return comfyWorkflowEditorStatus
    },
    set comfyWorkflowEditorStatus(value) {
      comfyWorkflowEditorStatus = value
    },
    get saveMessage() {
      return saveMessage
    },
    set saveMessage(value) {
      saveMessage = value
    },
  },
  getSelectedNode: () => selectedNode,
  getEditorNodes: () => editorNodes,
  getSelectedLibraryItem: () => selectedLibraryItem,
  getActiveSceneLevelId: () => activeSceneLevelId,
  canUseAiMeshStudio,
  getAiReplacementTargetIds,
  getAiSourceName,
  getDefaultStyleDescriptor,
  ensureSceneNodeSourceAsset: assetController.ensureSceneNodeSourceAsset,
  getSceneNodeVisualBounds: styleController.getSceneNodeVisualBounds,
  inspectGeneratedAssetBounds: styleController.inspectAssetBounds,
  readJsonPayload,
  refreshGeneratedAssetLibrary: assetController.refreshGeneratedAssetLibrary,
  inspectSelectedAssetForHunyuan:
    assetController.inspectSelectedAssetForHunyuan,
  saveSceneDocumentToDisk: levelController.saveSceneDocumentToDisk,
  setRuntimeDiagnostic,
  appendPipelineLog,
  patchNode,
  addNode,
  getSelectedLibraryItemUrl: assetController.getSelectedLibraryItemUrl,
  getSelectedLibraryItemName: assetController.getSelectedLibraryItemName,
  getNodeTransformSnapshot: styleController.getNodeTransformSnapshot,
})

const inspectorController = createEditorInspectorController({
  getLevelId: () => activeSceneLevelId,
  getSelectedNode: () => selectedNode,
  getSelectedNodes: () => selectedNodes,
  getEditorNodes: () => editorNodes,
  addNode,
  patchNode,
  updateLevelSettings: updateLevelSceneSettings,
  reparentNodes,
  selectEditorNode,
  setSaveMessage: message => {
    saveMessage = message
  },
  updateNodeStyleDescriptor,
  getNodeVisualColliderSize,
  getDefaultCollisionShape,
  getDefaultCollisionIntent,
  getDefaultCollisionChannel,
  getTextureBrowserPath: () => textureBrowserPath,
  getTextureBrowserItems: () => textureBrowserItems,
  getTextureBrowserLoading: () => textureBrowserLoading,
  getActiveTextureMaterialField: () => activeTextureMaterialField,
  setActiveTextureMaterialField: field => {
    activeTextureMaterialField = field
  },
  loadTextureBrowser: assetController.loadTextureBrowser,
  resolvePublicAssetUrl: assetController.resolvePublicAssetUrl,
  getAssetBrowserPath: () => assetBrowserPath,
  getSelectedLibraryItem: () => selectedLibraryItem,
  setSelectedLibraryItem: item => {
    selectedLibraryItem = item
  },
  setAssetBrowserFilter: value => {
    assetBrowserFilter = value
  },
  loadAssetBrowser: assetController.loadAssetBrowser,
  setAssetPickerTargetNodeId: nodeId => {
    assetPickerTargetNodeId = nodeId
  },
  getAssetPickerTargetNodeId: () => assetPickerTargetNodeId,
  setActiveEditorTab: tab => {
    activeEditorTab = tab
  },
  setPropertiesShelfOpen,
  setHunyuanSelectionKey: value => {
    hunyuanSelectionKey = value
  },
  setLastInspectedHunyuanAsset: value => {
    lastInspectedHunyuanAsset = value
  },
  inspectSelectedAssetForHunyuan:
    assetController.inspectSelectedAssetForHunyuan,
  getSceneNodeVisualBounds: styleController.getSceneNodeVisualBounds,
  inspectGeneratedAssetBounds: styleController.inspectAssetBounds,
  getDefaultStyleDescriptor,
  appendPipelineLog,
  getNodeTransformSnapshot: styleController.getNodeTransformSnapshot,
  setSelectedGeneratedVariantUrl: assetUrl => {
    selectedGeneratedVariantUrl = assetUrl
  },
  setHunyuanLastOutputUrl: assetUrl => {
    hunyuanLastOutputUrl = assetUrl
  },
  saveSceneDocumentToDisk: levelController.saveSceneDocumentToDisk,
})

$: flattenedNodes = flattenNodes(editorNodes)
$: filteredFlattenedNodes = flattenedNodes.filter(node => {
  const query = hierarchyFilter.trim().toLowerCase()
  if (!query) return true

  const prefabType = node.prefab?.type?.toLowerCase() ?? ''
  const gameplayType = node.gameplay?.type?.toLowerCase() ?? ''
  const assetUrl = node.asset?.url?.toLowerCase() ?? ''

  return (
    node.name.toLowerCase().includes(query) ||
    node.kind.toLowerCase().includes(query) ||
    prefabType.includes(query) ||
    gameplayType.includes(query) ||
    assetUrl.includes(query)
  )
})
$: outlinerRootItems = buildOutlinerItems({
  mode: outlinerDisplayMode,
  levelId: activeSceneLevelId,
  nodes: editorNodes,
  scene: editorScene,
  selectedNode,
  nodeViewportStateById,
})
$: if (editorNodes.length > 0) {
  outlinerController.ensureExpandedState('view-layer')
  outlinerController.ensureExpandedState('collections')
}
$: outlinerRows = flattenOutlinerItems(
  outlinerRootItems,
  hierarchyFilter,
  getOutlinerExpandedIds(outlinerExpandedIdsByMode, outlinerDisplayMode),
)
$: outlinerVisibleNodeOrder = Array.from(
  new Set(outlinerRows.map(row => row.nodeId).filter(Boolean) as string[]),
)
$: hasGroupSelection = selectedNodes.some(node => node.kind === 'group')
$: levelSettings = editorScene?.settings?.level ?? {}
$: observatorySettings = editorScene?.settings?.observatory ?? {}
$: solitudeSettings = editorScene?.settings?.solitude ?? {}
$: groundSettings = levelSettings.ground ?? null
$: terrainSculptSettings = levelSettings.terrainSculpt ?? null
$: terrainCollisionSettings = levelSettings.collision?.terrain ?? null
$: collisionBudget =
  (levelSettings.collision?.workflow?.colliderBudget as
    | LevelCollisionBudget
    | undefined) ?? 'mobile'
$: effectiveObservatorySettings =
  resolveObservatoryPresetSettings(
    mergeLevelSettings(levelSettings, observatorySettings),
  ) ?? {}
$: effectiveSolitudeSettings =
  resolveSolitudePresetSettings(
    mergeLevelSettings(levelSettings, solitudeSettings),
  ) ?? {}
$: selectedNodeMaterial = getSelectedNodeMaterialDefaults(selectedNode)
$: selectedParentCandidates = editorNodes.filter(
  node => node.id !== selectedNode?.id,
)
$: multiSelectionParentCandidates = editorNodes.filter(
  node => !selectedNodes.some(selected => selected.id === node.id),
)
$: selectedNodeStyleDescriptor = getDefaultStyleDescriptor(selectedNode)
$: selectedNodeColliderSize =
  resolveNodeCollision(selectedNode, editorScene?.settings)?.size ??
  getNodeVisualColliderSize(selectedNode)

function canBakeHeightmapSource(node: EditorSceneNode) {
  return Boolean(
    node.asset?.url ||
      node.primitive ||
      (node.prefab && getPrefabAssetUrl(node.prefab.type, node.prefab.variant)),
  )
}

function resolveHeightmapSourceAssetUrl(node: EditorSceneNode) {
  if (node.asset?.url) return node.asset.url
  if (node.prefab)
    return getPrefabAssetUrl(node.prefab.type, node.prefab.variant)
  return ''
}

function getHeightmapSelectionRootIds() {
  const roots = selectedNodes.length
    ? selectedNodes
    : selectedNode
      ? [selectedNode]
      : []
  return getTopLevelNodeIds(
    editorNodes,
    roots.map(node => node.id),
  )
}

function getHeightmapSourceNodes() {
  const basketIds = terrainCollisionSettings?.sourceNodeIds ?? []
  if (basketIds.length > 0) {
    const idSet = new Set(basketIds)
    return editorNodes.filter(
      node => idSet.has(node.id) && canBakeHeightmapSource(node),
    )
  }

  return []
}

function getHeightmapCandidateNodes() {
  const sourceIds = new Set<string>()
  const rootIds = getHeightmapSelectionRootIds()

  for (const rootId of rootIds) {
    collectSubtreeIds(editorNodes, rootId).forEach(nodeId => {
      const viewportState = nodeViewportStateById.get(nodeId)
      if (viewportState && !viewportState.effectiveVisible) return
      sourceIds.add(nodeId)
    })
  }

  return editorNodes.filter(
    node => sourceIds.has(node.id) && canBakeHeightmapSource(node),
  )
}

function getHeightmapSourceDescriptors() {
  if (heightmapSourceNodes.length === 0) return []

  const getWorldMatrix = createWorldMatrixResolver(editorNodes)
  return heightmapSourceNodes.map(node => {
    const sourceAssetUrl = resolveHeightmapSourceAssetUrl(node)
    return {
      nodeId: node.id,
      sourceName: node.name,
      ...(sourceAssetUrl ? { sourceAssetUrl } : {}),
      ...(node.primitive ? { primitive: node.primitive } : {}),
      matrix: getWorldMatrix(node.id).toArray(),
    } satisfies HeightmapSourceDescriptor
  })
}

$: heightmapCandidateNodes = getHeightmapCandidateNodes()
$: heightmapSourceNodes = getHeightmapSourceNodes()
$: heightmapSourceDescriptors = getHeightmapSourceDescriptors()
$: selectedTerrainSourceName =
  heightmapSourceNodes.length === 0
    ? ''
    : heightmapSourceNodes.length === 1
      ? heightmapSourceNodes[0].name
      : `${selectedNode?.name ?? 'Selection'} (${heightmapSourceNodes.length} sources)`
$: selectedTerrainSourceAssetUrl =
  heightmapSourceDescriptors[0]?.sourceAssetUrl ??
  (heightmapSourceDescriptors.length > 0 ? 'procedural-terrain-sources' : '')
$: nextTerrainStatusKey = JSON.stringify({
  levelId: activeSceneLevelId || levelId || editorScene?.levelId || '',
  updatedAt: editorScene?.updatedAt ?? '',
  selectedTerrainSourceAssetUrl,
  sourceAssetUrl: terrainCollisionSettings?.sourceAssetUrl ?? '',
  sourceAssetUrls: terrainCollisionSettings?.sourceAssetUrls ?? [],
  sourceNodeId: terrainCollisionSettings?.sourceNodeId ?? '',
  sourceNodeIds: terrainCollisionSettings?.sourceNodeIds ?? [],
})
$: if (nextTerrainStatusKey !== terrainStatusKey) {
  terrainStatusKey = nextTerrainStatusKey
  terrainStatusSnapshot = null
  if (activeSceneLevelId || levelId || editorScene?.levelId) {
    void refreshTerrainStatusSnapshot(nextTerrainStatusKey, editorScene)
  }
}

function setTerrainSourceBasket(sourceNodes: EditorSceneNode[]) {
  const sourceNodeIds = Array.from(new Set(sourceNodes.map(node => node.id)))
  const sourceAssetUrls = Array.from(
    new Set(
      sourceNodes
        .map(resolveHeightmapSourceAssetUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  )
  const sourceName =
    sourceNodes.length === 0
      ? ''
      : sourceNodes.length === 1
        ? sourceNodes[0].name
        : `${sourceNodes.length} terrain sources`

  updateLevelSceneSettings(settings => {
    const terrain = settings.collision?.terrain ?? {}
    const baseTerrain = {
      ...terrain,
      source: 'baked-heightmap' as const,
      runtimeSource: terrain.runtimeSource ?? 'editor-manifest',
      sourceNodeIds,
      sourceNodeId: sourceNodeIds[0],
      sourceAssetUrls,
      sourceAssetUrl: sourceAssetUrls[0],
      sourceName,
    }
    const nextTerrain =
      sourceNodeIds.length > 0
        ? {
            ...baseTerrain,
            dirty: true,
            heightmapDirty: true,
          }
        : {
            ...baseTerrain,
            sourceAssetUrl: undefined,
            sourceAssetUrls: [],
            sourceBounds: undefined,
            sourceName: '',
            sourceNodeId: undefined,
            sourceNodeIds: [],
            sourceTriangleCount: undefined,
            heightmapUrl: undefined,
            heightmapResolution: undefined,
            manifestUrl: undefined,
            colliderUrl: undefined,
            metadataUrl: undefined,
            colliderResolution: undefined,
            triangleCount: undefined,
            vertexCount: undefined,
            chunksPath: undefined,
            chunkGrid: undefined,
            chunkCount: undefined,
            chunkLods: undefined,
            heightOverrideCount: undefined,
            lastGeneratedAt: undefined,
            lastChunksGeneratedAt: undefined,
            dirty: true,
            heightmapDirty: true,
          }

    return {
      ...settings,
      collision: {
        ...(settings.collision ?? {}),
        terrain: nextTerrain,
      },
    }
  })
}

function addSelectedTerrainSourcesToBasket() {
  if (heightmapCandidateNodes.length === 0) {
    saveMessage =
      'Select terrain source meshes, primitives, prefabs, or groups first'
    return
  }

  setTerrainSourceBasket([...heightmapSourceNodes, ...heightmapCandidateNodes])
  saveMessage = `Added ${heightmapCandidateNodes.length} terrain source candidate(s)`
}

function removeTerrainSourceFromBasket(nodeId: string) {
  setTerrainSourceBasket(
    heightmapSourceNodes.filter(node => node.id !== nodeId),
  )
  saveMessage = 'Removed terrain source from basket'
}

function clearTerrainSourceBasket() {
  setTerrainSourceBasket([])
  saveMessage =
    'Cleared terrain source basket and invalidated baked terrain artifacts'
}
$: canUseStyleStudioSelection = canUseStyleStudio(selectedNode)
$: canUseAiMeshStudioSelection = canUseAiMeshStudio(selectedNode)
$: selectedLibraryItemPath = selectedLibraryItem?.path ?? ''
$: selectedLibraryItemUrl = assetController.getSelectedLibraryItemUrl()
$: assetPickerTargetName =
  editorNodes.find(node => node.id === assetPickerTargetNodeId)?.name ?? ''
$: canWorkflowShowAll =
  editorNodes.some(node => !node.visible) ||
  (editorState?.isolatedNodeIds.length ?? 0) > 0
$: dragSelectionIds = selectedNodes.map(node => node.id)
$: pendingLevelId = levelId
$: activeSceneLevelId = editorScene?.levelId ?? levelId
$: editorLevelOptions = levelRegistryEntries.map(entry => ({
  id: entry.id,
  label: entry.title,
  status: entry.status,
  deployed: entry.deployed,
}))
$: activeLevelRegistryEntry =
  levelRegistryEntries.find(entry => entry.id === activeSceneLevelId) ?? null

$: if (activeSceneLevelId && loadedMetadataLevelId !== activeSceneLevelId) {
  const entry = activeLevelRegistryEntry
  metadataTitle = entry?.title ?? activeSceneLevelId
  metadataStatus = entry?.status ?? 'draft'
  metadataDeployed = entry?.deployed ?? false
  metadataStarMapEnabled = entry?.starMap?.enabled ?? false
  metadataStarMapYear = entry?.starMap?.year ?? 2100
  metadataStarMapDescription =
    entry?.starMap?.description ?? `Enter ${entry?.title ?? activeSceneLevelId}`
  metadataSourceKind = 'scene'
  loadedMetadataLevelId = activeSceneLevelId
}

let draggedHierarchyNodeIds: string[] = []
let hierarchyDropTargetId: string | null = null
let hierarchyRootDropActive = false

const observatoryStylePresets: EditorStylePreset[] = [
  'site',
  'surreal-site',
  'ghibli',
  'alto',
  'monument',
  'retro',
]
const ambientAudioLibrary = [
  { label: 'Portal Deck', src: '/audio/ambient/portal-deck.mp3' },
  {
    label: 'Wicked Shadows Whisper',
    src: '/audio/ambient/Wicked Shadows Whisper.mp3',
  },
  { label: 'Shadow Waltz', src: '/audio/ambient/Shadow Waltz.mp3' },
  {
    label: 'Dark Shadows of Delight',
    src: '/audio/ambient/Dark Shadows of Delight.mp3',
  },
  { label: 'Meta 3', src: '/audio/ambient/meta_3.mp3' },
  { label: 'Whistling Dreams', src: '/audio/ambient/Whistling Dreams.mp3' },
  { label: 'Piano Synth', src: '/audio/ambient/piano synth.mp3' },
  { label: 'Faster', src: '/audio/ambient/Faster.mp3' },
  {
    label: 'Retro Video Game',
    src: '/audio/ambient/retro video game, new age, electric guitar fake.mp3',
  },
  { label: 'Untitled', src: '/audio/ambient/Untitled.mp3' },
]

const editorPanelTabs: Array<{
  id: EditorPanelTab
  icon: string
  label: string
  description: string
}> = [
  {
    id: 'scene',
    icon: '◫',
    label: 'Scene',
    description: 'Scene status, editing mode, and object details',
  },
  {
    id: 'create',
    icon: '+',
    label: 'Create',
    description: 'Primitives, prefabs, content browser, and asset preview',
  },
  {
    id: 'world',
    icon: '☼',
    label: 'World',
    description: 'Environment, terrain, atmosphere, audio, and player setup',
  },
  {
    id: 'npc',
    icon: 'N',
    label: 'NPC',
    description:
      'NPCs, conversations, ambient fields, and interaction authoring',
  },
  {
    id: 'performance',
    icon: '▥',
    label: 'Performance',
    description: 'Performance budgets, quality systems, and optimization tools',
  },
  {
    id: 'bake',
    icon: '◈',
    label: 'Bake',
    description:
      'Style, collision, terrain, partition, and runtime bake controls',
  },
  {
    id: 'collision',
    icon: '◇',
    label: 'Collision',
    description: 'Collision policy, authoring, review, overlay, and bake entry',
  },
  {
    id: 'build',
    icon: '↧',
    label: 'Build',
    description: 'Save, validation, bake/cook, publish, and diagnostics',
  },
  {
    id: 'ai',
    icon: '✦',
    label: 'AI Lab',
    description: 'ComfyUI, Hunyuan jobs, generated outputs, and experiments',
  },
]

const bakeWorkspaceTabs: Array<{
  id: BakeWorkspaceTab
  label: string
  description: string
}> = [
  {
    id: 'style',
    label: 'Style Product',
    description: 'Preview, compare, and accept object-preserving style bakes.',
  },
  {
    id: 'collision',
    label: 'Collision And Terrain',
    description: 'Bake mesh colliders, terrain collision, and terrain chunks.',
  },
  {
    id: 'runtime',
    label: 'Runtime And Publish',
    description: 'Cook world partition data and review publish bake gates.',
  },
]

function setActiveEditorTab(tab: EditorPanelTab) {
  activeEditorTab = tab
  if (tab === 'bake') {
    void ensureEditorStyleStudio()
  } else if (tab === 'ai') {
    void ensureEditorAIMeshStudio()
    void ensureEditorStyleStudio()
  }
  requestAnimationFrame(() => {
    editorTabContentElement?.scrollTo({ top: 0, behavior: 'auto' })
  })
}

async function ensureEditorAIMeshStudio() {
  if (editorAIMeshStudioComponent) return

  if (!editorAIMeshStudioPromise) {
    editorAIMeshStudioPromise = import('./EditorAIMeshStudio.svelte').then(
      module => {
        editorAIMeshStudioComponent = module.default
      },
    )
  }

  await editorAIMeshStudioPromise
}

async function ensureEditorStyleStudio() {
  if (editorStyleStudioComponent) return

  if (!editorStyleStudioPromise) {
    editorStyleStudioPromise = import('./EditorStyleStudio.svelte').then(
      module => {
        editorStyleStudioComponent = module.default
      },
    )
  }

  await editorStyleStudioPromise
}

$: if (
  editorState?.panelOpen &&
  editorTabContentElement &&
  activeEditorTab !== lastScrolledTab
) {
  lastScrolledTab = activeEditorTab
  requestAnimationFrame(() => {
    editorTabContentElement?.scrollTo({ top: 0, behavior: 'auto' })
  })
}

const createQuickNodeActions = [
  { label: 'Empty', action: () => createController.addEmpty() },
  { label: 'Box', action: () => addRawPrimitive() },
  {
    label: 'Light',
    action: () => createController.addPrimitivePrefab('light'),
  },
  {
    label: 'Marker',
    action: () => createController.addPrimitivePrefab('marker'),
  },
  {
    label: 'NPC Firefly',
    action: () => createController.addPrimitivePrefab('npc-firefly'),
  },
  {
    label: 'Audio Region',
    action: () => createController.addPrimitivePrefab('audio-region'),
  },
  {
    label: 'Fog Volume',
    action: () => createController.addPrimitivePrefab('fog-volume'),
  },
  {
    label: 'Mist Region',
    action: () => createController.addPrimitivePrefab('mist-region'),
  },
]

function getAiSourceAssetUrl(node: EditorSceneNode | null) {
  if (node?.asset?.url) return node.asset.url
  return getPrefabAssetUrl(node?.prefab?.type, node?.prefab?.variant)
}

function getAiSourceName(node: EditorSceneNode | null) {
  if (!node) return ''
  if (node.asset) return node.name
  if (node.prefab?.type)
    return EDITOR_PREFAB_GENERATION_LABELS[node.prefab.type] ?? node.name
  return node.name
}

function canUseAiMeshStudio(node: EditorSceneNode | null) {
  return canBakeSceneNode(node)
}

function canRetextureSelection(node: EditorSceneNode | null) {
  return !!getAiSourceAssetUrl(node)
}

function canUseStyleStudio(node: EditorSceneNode | null) {
  return canBakeSceneNode(node)
}

function getDefaultStyleDescriptor(node: EditorSceneNode | null) {
  return node ? inferNodeGenerationDescriptor(node) : ''
}

function updateNodeStyleDescriptor(nodeId: string, value: string) {
  const node = editorNodes.find(candidate => candidate.id === nodeId)
  if (!node) return
  patchNode(nodeId, {
    generation: {
      ...(node.generation ?? {}),
      descriptor: value,
    },
  })
}

function handleHierarchySelection(nodeId: string, event: MouseEvent) {
  const additive = event.shiftKey
  const modifierAdditive =
    event.metaKey ||
    event.ctrlKey ||
    event.getModifierState('Meta') ||
    event.getModifierState('Control')
  const order = filteredFlattenedNodes.map(node => node.id)
  selectEditorNode(nodeId, {
    additive: additive || modifierAdditive,
    rangeOrder: additive ? order : undefined,
  })
}

function getSimilarNodeIds(node: EditorSceneNode | null) {
  if (!node) return []

  if (node.prefab?.type) {
    return editorNodes
      .filter(candidate => candidate.prefab?.type === node.prefab?.type)
      .map(candidate => candidate.id)
  }

  if (node.asset?.url) {
    return editorNodes
      .filter(candidate => candidate.asset?.url === node.asset?.url)
      .map(candidate => candidate.id)
  }

  if (node.npc?.archetype) {
    return editorNodes
      .filter(candidate => candidate.npc?.archetype === node.npc?.archetype)
      .map(candidate => candidate.id)
  }

  if (node.gameplay?.type) {
    return editorNodes
      .filter(candidate => candidate.gameplay?.type === node.gameplay?.type)
      .map(candidate => candidate.id)
  }

  return editorNodes
    .filter(candidate => candidate.kind === node.kind)
    .map(candidate => candidate.id)
}

function getSimilarNodeLabel(node: EditorSceneNode | null) {
  if (!node) return 'matching nodes'
  if (node.prefab?.type) return `${node.prefab.type} prefabs`
  if (node.asset?.url) return 'matching asset instances'
  if (node.npc?.archetype) return `${node.npc.archetype} NPCs`
  if (node.gameplay?.type) return `${node.gameplay.type} helpers`
  return `${node.kind} nodes`
}

$: similarNodeIds = getSimilarNodeIds(selectedNode)
$: similarNodeCount = similarNodeIds.length
$: similarNodeLabel = getSimilarNodeLabel(selectedNode)
$: styleSelectableSceneCandidates =
  (styleBatchSelectionKey,
  buildStyleSceneCandidates(
    editorNodes,
    [],
    styleBatchNodeStatusById,
    getDefaultStyleDescriptor,
  ))

$: {
  const nextSelection = reconcileStyleBatchSelection(
    styleSelectableSceneCandidates,
    styleBatchSelectionIds,
    styleBatchSelectionInitialized,
    () => getCuratedStyleBatchCandidateIds(editorNodes),
  )
  if (
    nextSelection.selectedIds !== styleBatchSelectionIds ||
    nextSelection.initialized !== styleBatchSelectionInitialized
  ) {
    styleBatchSelectionIds = nextSelection.selectedIds
    styleBatchSelectionInitialized = nextSelection.initialized
  }
}

$: styleSceneCandidates = styleSelectableSceneCandidates.map(candidate => ({
  ...candidate,
  selected: styleBatchSelectionIds.includes(candidate.id),
}))

$: levelStyleBatchPreset = getStyleBatchPresetById(
  editorScene?.settings?.level?.style?.editorBatch?.presetId,
)
$: levelStyleBatchPresetKey = levelStyleBatchPreset
  ? `${activeSceneLevelId}:${levelStyleBatchPreset.id}`
  : ''

$: if (
  levelStyleBatchPreset &&
  styleLevelDefaultsAppliedFor !== levelStyleBatchPresetKey &&
  !styleBatchSession
) {
  styleProfileName = levelStyleBatchPreset.label
  stylePrompt = levelStyleBatchPreset.prompt
  styleNegativePrompt = levelStyleBatchPreset.negativePrompt
  styleLoraNotes = levelStyleBatchPreset.loraNotes
  styleControlNetNotes = levelStyleBatchPreset.controlNetNotes
  styleBatchSelectionIds = getCuratedStyleBatchCandidateIds(editorNodes)
  styleBatchSelectionInitialized = true
  styleLevelDefaultsAppliedFor = levelStyleBatchPresetKey
} else if (
  styleLevelDefaultsAppliedFor &&
  styleLevelDefaultsAppliedFor !== levelStyleBatchPresetKey
) {
  styleLevelDefaultsAppliedFor = ''
}

function selectAllStyleBatchCandidates() {
  styleBatchSelectionIds = styleSceneCandidates.map(candidate => candidate.id)
  styleBatchSelectionKey++
}

function selectCurrentStyleBatchCandidates() {
  const selectedIds = selectedNodes
    .filter(node => canUseStyleStudio(node))
    .map(node => node.id)
  const fallbackIds =
    selectedIds.length === 0 && selectedNode && canUseStyleStudio(selectedNode)
      ? [selectedNode.id]
      : []
  const nextIds = selectedIds.length > 0 ? selectedIds : fallbackIds

  if (nextIds.length === 0) {
    saveMessage =
      'Select one or more geometry-backed scene objects before using scene selection as the AI batch.'
    return
  }

  styleBatchSelectionIds = nextIds
  styleBatchSelectionInitialized = true
  styleBatchSelectionKey++
  saveMessage = `Selected ${nextIds.length} scene object${nextIds.length === 1 ? '' : 's'} for the AI batch.`
}

function selectUnreimaginedStyleBatchCandidates() {
  const nextIds = getUnreimaginedStyleBatchCandidateIds(editorNodes)

  if (nextIds.length === 0) {
    saveMessage =
      'No unreimagined geometry candidates were found. Texture-only restyles and full mesh reimagines are tracked separately.'
    return
  }

  styleBatchSelectionIds = nextIds
  styleBatchSelectionInitialized = true
  styleBatchSelectionKey++
  saveMessage = `Selected ${nextIds.length} object${nextIds.length === 1 ? '' : 's'} that still need a full mesh reimagine.`
}

function clearStyleBatchCandidates() {
  styleBatchSelectionIds = []
  styleBatchSelectionKey++
}

function toggleStyleBatchCandidate(candidateId: string, selected: boolean) {
  if (selected) {
    if (!styleBatchSelectionIds.includes(candidateId)) {
      styleBatchSelectionIds = [...styleBatchSelectionIds, candidateId]
      styleBatchSelectionKey++
    }
    return
  }

  styleBatchSelectionIds = styleBatchSelectionIds.filter(
    id => id !== candidateId,
  )
  styleBatchSelectionKey++
}

function selectSimilarNodes() {
  if (!selectedNode) return

  const ids = getSimilarNodeIds(selectedNode)
  if (ids.length === 0) return

  const anchorId = ids.includes(selectedNode.id)
    ? selectedNode.id
    : ids[0] ?? null
  setSelectedNodes(ids, anchorId)
  saveMessage = `Selected ${ids.length} ${getSimilarNodeLabel(selectedNode)}`
}

function getAiReplacementTargetIds(node: EditorSceneNode | null) {
  if (!node) return []
  if (!hunyuanApplyToSimilarNodes) return [node.id]

  const ids = getSimilarNodeIds(node)
  return ids.length > 0 ? ids : [node.id]
}

function setNestedValue<T>(
  source: T,
  path: Array<string | number>,
  value: unknown,
): T {
  const next = structuredClone(source ?? {})
  let current: any = next
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]
    const nextKey = path[index + 1]
    if (current[key] == null) {
      current[key] = typeof nextKey === 'number' ? [] : {}
    }
    current = current[key]
  }
  current[path[path.length - 1]] = value
  return next
}

function isFiniteVec3Setting(
  value: unknown,
): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function isSpawnPositionSettingPath(path: Array<string | number>) {
  return path[0] === 'spawn' && path[1] === 'position'
}

function getSpawnSupportActorId(settings: Record<string, any>) {
  const actorId = settings.spawn?.supportActorId
  return typeof actorId === 'string' && actorId.trim() ? actorId.trim() : null
}

function getLinkedSpawnSupportActorCommand(input: {
  scene: EditorSceneDocument
  previousLevelSettings: Record<string, any>
  nextLevelSettings: Record<string, any>
  path: Array<string | number>
}) {
  if (!isSpawnPositionSettingPath(input.path)) return null

  const supportActorId =
    getSpawnSupportActorId(input.nextLevelSettings) ??
    getSpawnSupportActorId(input.previousLevelSettings)
  if (!supportActorId) return null

  const previousSpawn = input.previousLevelSettings.spawn?.position
  const nextSpawn = input.nextLevelSettings.spawn?.position
  if (!isFiniteVec3Setting(previousSpawn) || !isFiniteVec3Setting(nextSpawn)) {
    return null
  }

  const supportActor = input.scene.nodes.find(
    node => node.id === supportActorId,
  )
  if (!supportActor || !isFiniteVec3Setting(supportActor.position)) return null

  const delta = nextSpawn.map(
    (component, index) => component - previousSpawn[index],
  ) as [number, number, number]
  if (delta.every(component => component === 0)) return null

  const position = supportActor.position.map(
    (component, index) => component + delta[index],
  ) as [number, number, number]

  return {
    type: 'patch-node' as const,
    nodeId: supportActor.id,
    patch: {
      position,
    },
  }
}

function updateLevelSetting(path: Array<string | number>, value: unknown) {
  const scene = get(editorSceneStore)
  if (!scene) {
    updateLevelSceneSettings(settings => setNestedValue(settings, path, value))
    return
  }

  const previousLevelSettings = structuredClone(
    scene.settings?.level ?? {},
  ) as Record<string, any>
  const nextLevelSettings = setNestedValue(
    previousLevelSettings,
    path,
    value,
  ) as Record<string, any>
  const nextSettings = normalizeLevelSceneSettings(scene.levelId, {
    ...(scene.settings ?? {}),
    level: nextLevelSettings,
  })
  const supportActorCommand = getLinkedSpawnSupportActorCommand({
    scene,
    previousLevelSettings,
    nextLevelSettings,
    path,
  })

  executeSceneCommands([
    {
      type: 'replace-settings',
      settings: nextSettings,
    },
    ...(supportActorCommand ? [supportActorCommand] : []),
  ])
}

function updateLevelNumericSetting(
  path: Array<string | number>,
  value: string,
) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return
  updateLevelSetting(path, numeric)
}

function applySolitudeAtmospherePreset(presetId: string | undefined) {
  const preset = presetId
    ? solitudeAtmospherePresets.find(entry => entry.id === presetId)
    : null

  updateLevelSceneSettings(settings => {
    if (!preset) {
      return setNestedValue(settings, ['presets', 'atmosphere'], presetId)
    }

    const nextSettings = structuredClone(settings)
    nextSettings.presets = {
      ...(nextSettings.presets ?? {}),
      atmosphere: presetId,
    }

    if (preset.settings.style) {
      nextSettings.style = structuredClone(preset.settings.style)
    }

    if (preset.settings.lighting) {
      nextSettings.lighting = structuredClone(preset.settings.lighting)
    }

    if (preset.settings.water) {
      nextSettings.water = structuredClone(preset.settings.water)
    }

    if (preset.settings.ambientParticles) {
      nextSettings.ambientParticles = structuredClone(
        preset.settings.ambientParticles,
      )
    }

    nextSettings.features = {
      ...(nextSettings.features ?? {}),
      styles:
        preset.settings.style?.enabled ?? nextSettings.features?.styles ?? true,
      water:
        preset.settings.water?.enabled ?? nextSettings.features?.water ?? false,
      ambientParticles:
        preset.settings.ambientParticles?.enabled ??
        nextSettings.features?.ambientParticles ??
        true,
    }

    return nextSettings
  })
}

function applyStylePreset(presetId: string) {
  const preset = stylePresetOptions.find(entry => entry.id === presetId)
  if (!preset) return

  styleProfileName = preset.label
  stylePrompt = preset.prompt
  styleNegativePrompt = preset.negativePrompt
  styleLoraNotes = preset.loraNotes
  styleControlNetNotes = preset.controlNetNotes
  styleStatus = `Loaded style preset: ${preset.label}`
  saveMessage = styleStatus
}

async function readJsonPayload(response: Response, context: string) {
  const rawText = await response.text()

  try {
    return rawText ? JSON.parse(rawText) : null
  } catch {
    const preview = rawText.trim().slice(0, 180) || '<empty response>'
    appendPipelineLog(`${context} returned non-JSON`, {
      status: response.status,
      preview,
    })
    throw new Error(
      `${context} returned non-JSON data (${response.status}). ${preview}`,
    )
  }
}

$: if (typeof window !== 'undefined' && selectedComfyWorkflowPath) {
  window.localStorage.setItem(
    'merkin:selected-comfy-workflow-path',
    selectedComfyWorkflowPath,
  )
}

$: if (typeof window !== 'undefined' && aiPreferencesLoaded) {
  window.localStorage.setItem(
    'merkin:comfy-ui-low-vram-mode',
    comfyUiLowVramMode ? '1' : '0',
  )
}

function getApplicableSelectionNodeIds() {
  if (selectedNodes.length > 0) {
    return selectedNodes
      .filter(node => canUseAiMeshStudio(node))
      .map(node => node.id)
  }

  if (selectedNode && canUseAiMeshStudio(selectedNode)) {
    return [selectedNode.id]
  }

  return []
}

$: canApplyGeneratedAssetToSelection =
  hunyuanLastOutputUrl !== '' && getApplicableSelectionNodeIds().length > 0

async function saveCurrentSceneToDisk() {
  await levelController.overwriteLevelScene()
}

function openNewLevelTools() {
  setPanelOpen(true)
  setActiveEditorTab('scene')
  saveMessage = 'Enter a title and level ID, then create the level'
}

function saveAsLevelFromMenu() {
  if (saveAsLevelId.trim()) {
    void levelController.saveAsNewLevel()
    return
  }

  saveAsTitle = metadataTitle ? `${metadataTitle} Copy` : ''
  saveAsLevelId = sanitizeLevelId(`${activeSceneLevelId}-copy`)
  setPanelOpen(true)
  setActiveEditorTab('build')
  saveMessage = 'Review Save As fields, then save the new level file'
}

async function exportLevelForBlender() {
  const scene = get(editorSceneStore)
  if (!scene) {
    saveMessage = 'No level scene loaded'
    return
  }

  try {
    saveMessage = `Exporting ${activeSceneLevelId} for Blender...`
    const payload = await exportBlenderScenePackage(activeSceneLevelId, scene)
    blenderSceneExportResult = {
      packagePath: payload.packagePath ?? '',
      packageDirectory: payload.packageDirectory ?? '',
      nodeCount: payload.nodeCount ?? 0,
      assetCount: payload.assetCount ?? 0,
      warningCount: payload.warnings?.length ?? 0,
    }
    if (payload.packagePath) {
      void navigator.clipboard?.writeText?.(payload.packagePath)
    }
    setPanelOpen(true)
    setActiveEditorTab('build')
    saveMessage = payload.packagePath
      ? `Saved Blender package: ${payload.packagePath}. Path copied to clipboard.`
      : payload.message ?? 'Saved Blender package'
  } catch (error) {
    console.error('Blender level export failed:', error)
    blenderSceneExportResult = null
    saveMessage =
      error instanceof Error ? error.message : 'Blender level export failed'
  }
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      resolve(String(reader.result ?? ''))
    })
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('File read failed'))
    })
    reader.readAsText(file)
  })
}

async function importLevelFromBlenderDeltaFile(file: File) {
  const scene = get(editorSceneStore)
  if (!scene) {
    saveMessage = 'No level scene loaded'
    return
  }

  try {
    saveMessage = `Importing Blender delta: ${file.name}`
    const deltaText = await readFileAsText(file)
    const delta = JSON.parse(deltaText)
    const payload = await importBlenderSceneDelta(scene, delta)
    if (!payload.scene) {
      throw new Error(
        payload.message ?? 'Blender scene import returned no scene',
      )
    }
    importSceneJson(JSON.stringify(payload.scene))
    saveMessage = payload.unknownNodeIds?.length
      ? `Imported ${payload.updatedCount ?? 0} node(s); ignored ${payload.unknownNodeIds.length} unknown node(s)`
      : `Imported Blender delta for ${payload.updatedCount ?? 0} node(s)`
  } catch (error) {
    console.error('Blender level import failed:', error)
    saveMessage =
      error instanceof Error ? error.message : 'Blender level import failed'
  }
}

function importLevelFromBlender() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.addEventListener('change', () => {
    const [file] = Array.from(input.files ?? [])
    if (file) void importLevelFromBlenderDeltaFile(file)
  })
  input.click()
}

function loadEditorLevelFromMenu(levelId: string) {
  pendingLevelId = levelId
  switchEditorLevel()
}

function getMinimumDockWidth(viewportWidth: number) {
  return viewportWidth <= 1100 ? 220 : 240
}

function getDefaultDockWidth(viewportWidth: number) {
  return Math.round(
    Math.min(
      320,
      Math.max(getMinimumDockWidth(viewportWidth), viewportWidth * 0.205),
    ),
  )
}

function getMaximumDockWidth(viewportWidth: number) {
  return Math.round(Math.min(420, viewportWidth * 0.32))
}

function getMinimumDockHeight(viewportHeight: number) {
  return viewportHeight <= 680 ? 180 : 240
}

function getDefaultDockHeight(viewportHeight: number) {
  const usableHeight = Math.max(
    getMinimumDockHeight(viewportHeight),
    viewportHeight - 132,
  )
  const preferredHeight = Math.max(
    getMinimumDockHeight(viewportHeight),
    viewportHeight * 0.72,
  )
  return Math.round(Math.min(preferredHeight, usableHeight))
}

function getMaximumDockHeight(viewportHeight: number) {
  return Math.round(
    Math.max(getMinimumDockHeight(viewportHeight), viewportHeight - 96),
  )
}

function clampDockWidth(
  width: number,
  target: 'tools' | 'side',
  viewportWidth: number,
) {
  const minWidth = getMinimumDockWidth(viewportWidth)
  const maxWidth = getMaximumDockWidth(viewportWidth)
  const otherDockOpen =
    target === 'tools'
      ? editorState?.outlinerOpen || editorState?.propertiesShelfOpen
      : editorState?.panelOpen
  const otherDockWidth =
    target === 'tools'
      ? getEffectiveDockWidth('side', viewportWidth, false)
      : getEffectiveDockWidth('tools', viewportWidth, false)
  const combinedLimit = Math.max(
    minWidth,
    Math.floor(viewportWidth * 0.55) - (otherDockOpen ? otherDockWidth : 0),
  )

  return Math.round(
    Math.min(Math.max(width, minWidth), maxWidth, combinedLimit),
  )
}

function getEffectiveDockWidth(
  target: 'tools' | 'side',
  viewportWidth: number,
  clampAgainstOther = true,
) {
  const storedWidth =
    target === 'tools'
      ? editorState?.toolsDockWidth
      : editorState?.sideDockWidth
  const requestedWidth = editorState?.layoutCustomized
    ? storedWidth
    : getDefaultDockWidth(viewportWidth)
  const finiteWidth =
    typeof requestedWidth === 'number' && Number.isFinite(requestedWidth)
      ? requestedWidth
      : getDefaultDockWidth(viewportWidth)

  if (!clampAgainstOther) {
    return Math.round(
      Math.min(
        Math.max(finiteWidth, getMinimumDockWidth(viewportWidth)),
        getMaximumDockWidth(viewportWidth),
      ),
    )
  }

  return clampDockWidth(finiteWidth, target, viewportWidth)
}

function clampDockHeight(height: number, viewportHeight: number) {
  const minHeight = getMinimumDockHeight(viewportHeight)
  const maxHeight = getMaximumDockHeight(viewportHeight)
  return Math.round(Math.min(Math.max(height, minHeight), maxHeight))
}

function getEffectiveDockHeight(
  target: 'tools' | 'side',
  viewportHeight: number,
) {
  const storedHeight =
    target === 'tools'
      ? editorState?.toolsDockHeight
      : editorState?.sideDockHeight
  const requestedHeight =
    editorState?.dockHeightCustomized &&
    typeof storedHeight === 'number' &&
    Number.isFinite(storedHeight) &&
    storedHeight > 0
      ? storedHeight
      : getDefaultDockHeight(viewportHeight)

  return clampDockHeight(requestedHeight, viewportHeight)
}

function resetDockLayoutFromMenu() {
  resetEditorDockLayout()
  saveMessage = 'Editor dock layout reset'
}

function getLayoutPresetWorkspace(preset: EditorLayoutPreset): EditorPanelTab {
  if (preset === 'create') return 'create'
  if (preset === 'collision') return 'collision'
  if (preset === 'build') return 'build'
  return 'scene'
}

function applyLayoutPresetFromMenu(preset: EditorLayoutPreset) {
  applyEditorLayoutPreset(preset)
  setActiveEditorTab(getLayoutPresetWorkspace(preset))
  if (preset === 'collision') setCollisionOverlayEnabled(true)
  saveMessage = `Layout preset: ${EDITOR_LAYOUT_PRESETS[preset].label}`
}

function resetLayoutPresetFromMenu() {
  resetEditorLayoutPreset()
  setActiveEditorTab('scene')
  saveMessage = 'Editor layout preset reset'
}

function beginDockResize(
  target: 'tools' | 'side',
  axis: 'x' | 'y',
  event: PointerEvent,
) {
  if (!editorState?.enabled) return
  event.preventDefault()
  event.stopPropagation()
  dockResizeTarget = { dock: target, axis }
}

function resizeDockFromPointer(event: PointerEvent) {
  if (!dockResizeTarget || !editorState) return
  event.preventDefault()

  const editorBody = document.querySelector('.editor-body')
  if (!editorBody) return
  const rect = editorBody.getBoundingClientRect()
  if (dockResizeTarget.axis === 'y') {
    const region = document.querySelector(
      `.editor-${dockResizeTarget.dock}-region`,
    )
    if (!region) return
    const regionRect = region.getBoundingClientRect()
    const height = event.clientY - regionRect.top
    const clampedHeight = clampDockHeight(height, editorViewportHeight)
    setEditorDockLayout(
      dockResizeTarget.dock === 'tools'
        ? { toolsDockHeight: clampedHeight }
        : { sideDockHeight: clampedHeight },
    )
    return
  }

  const width =
    dockResizeTarget.dock === 'tools'
      ? event.clientX - rect.left
      : rect.right - event.clientX

  const clampedWidth = clampDockWidth(
    width,
    dockResizeTarget.dock,
    editorViewportWidth,
  )
  setEditorDockLayout(
    dockResizeTarget.dock === 'tools'
      ? { toolsDockWidth: clampedWidth }
      : { sideDockWidth: clampedWidth },
  )
}

function endDockResize() {
  dockResizeTarget = null
}

function hasFiniteVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)
  )
}

function getSpawnPosition() {
  const position = levelSettings?.spawn?.position
  return hasFiniteVec3(position) ? position : null
}

function selectionStatus() {
  return editorState.selectedNodeIds.length > 0
    ? { enabled: true, disabledReason: undefined, status: 'ready' as const }
    : {
        enabled: false,
        disabledReason: 'Select one or more scene objects first.',
        status: 'needs-selection' as const,
      }
}

function deletionStatus() {
  const selected = selectionStatus()
  if (!selected.enabled) return selected

  const protectedIds = getProtectedSceneNodeRemovalIds(
    editorScene,
    editorState.selectedNodeIds,
  )
  if (protectedIds.length === 0) return selected

  return {
    enabled: false,
    disabledReason: `Required level actor${protectedIds.length === 1 ? '' : 's'} cannot be deleted: ${protectedIds.join(', ')}.`,
    status: 'experimental' as const,
  }
}

function backendStatus() {
  if (hunyuanBusy) {
    return {
      enabled: false,
      disabledReason: 'AI backend is busy.',
      status: 'experimental' as const,
    }
  }
  if (!hunyuanServiceReady) {
    return {
      enabled: false,
      disabledReason: 'AI backend is offline.',
      status: 'offline' as const,
    }
  }
  return { enabled: true, disabledReason: undefined, status: 'ready' as const }
}

function openOwnerWorkspace(tab: EditorPanelTab) {
  setPanelOpen(true)
  setActiveEditorTab(tab)
}

function openBuildOutput() {
  setPanelOpen(true)
  buildOutputOpen = true
  setActiveEditorTab('build')
}

function selectPerformanceNodes(nodeIds: string[], label: string) {
  const selectedIds = Array.from(new Set(nodeIds)).filter(Boolean)
  setSelectedNodes(selectedIds)
  saveMessage = `${label}: ${selectedIds.length} selected`
}

function buildEditorCommands(): EditorCommand[] {
  const selected = selectionStatus()
  const deletion = deletionStatus()
  const backend = backendStatus()
  const spawnPosition = getSpawnPosition()
  const terrainPipeline = describeEditorTerrainPipeline({
    scene: get(editorSceneStore),
    selectedTerrainSourceName,
    selectedTerrainSourceAssetUrl,
    terrainStatus: terrainStatusSnapshot,
  })
  const terrainPipelineBusy =
    terrainCollisionBakePending ||
    terrainHeightmapGeneratePending ||
    terrainChunkCookPending
  const terrainCommand = (id: string) =>
    terrainPipeline.commands.find(command => command.id === id)
  const bakeTerrainCommand = terrainCommand('bake-terrain')
  const generateHeightmapCommand = terrainCommand('generate-heightmap')
  const bakeTerrainCollisionCommand = terrainCommand('bake-terrain-collision')
  const heightfieldChunkCommand = terrainCommand('cook-heightfield-chunks')
  const glbChunkCommand = terrainCommand('cook-glb-chunks')
  const cookChunkCommand =
    terrainPipeline.mode === 'glb-chunk-terrain' || !heightfieldChunkCommand
      ? glbChunkCommand
      : heightfieldChunkCommand

  return [
    {
      id: 'open-command-palette',
      label: 'Open Command Palette',
      description: 'Search editor commands by owner, state, or shortcut.',
      category: 'Diagnostics',
      ownerWorkspace: 'header',
      enabled: true,
      status: 'ready',
      shortcut: 'Ctrl+K',
      run: () => {
        commandPaletteOpen = true
      },
    },
    {
      id: 'save-level',
      label: 'Save Level',
      description: 'Overwrite the active level scene document on disk.',
      category: 'Build',
      ownerWorkspace: 'build',
      enabled: true,
      status: 'ready',
      shortcut: 'Ctrl+S',
      run: saveCurrentSceneToDisk,
    },
    {
      id: 'save-as-level',
      label: 'Save As Level',
      description: 'Prepare a copied level file with a new ID.',
      category: 'Build',
      ownerWorkspace: 'build',
      enabled: true,
      status: 'ready',
      run: saveAsLevelFromMenu,
    },
    {
      id: 'new-level',
      label: 'New Level',
      description: 'Open the new-level tools in the Scene workspace.',
      category: 'World',
      ownerWorkspace: 'scene',
      enabled: true,
      status: 'ready',
      run: openNewLevelTools,
    },
    {
      id: 'copy-scene-json',
      label: 'Copy Scene JSON',
      description: 'Copy the active scene JSON payload.',
      category: 'Diagnostics',
      ownerWorkspace: 'build',
      enabled: true,
      status: 'ready',
      run: levelController.copySceneJson,
    },
    {
      id: 'publish-level',
      label: 'Publish Level',
      description: 'Run publish checks and deploy the active level metadata.',
      category: 'Build',
      ownerWorkspace: 'build',
      enabled: !publishPipelineState.running,
      disabledReason: publishPipelineState.running
        ? 'Publish is already running.'
        : undefined,
      status: publishPipelineState.running ? 'experimental' : 'danger',
      run: () => {
        openOwnerWorkspace('build')
        void levelController.publishLevel()
      },
    },
    {
      id: 'bake-terrain',
      label: 'Bake Terrain',
      description:
        'Make runtime terrain current: generate heightmap if needed, bake collision, cook chunks, then validate.',
      category: 'World',
      ownerWorkspace: 'build',
      enabled: !terrainPipelineBusy && Boolean(bakeTerrainCommand?.enabled),
      disabledReason: terrainPipelineBusy
        ? 'Terrain bake, cook, or validation is already running.'
        : bakeTerrainCommand?.enabled
          ? undefined
          : bakeTerrainCommand?.reason ?? 'Terrain pipeline is blocked.',
      status: terrainPipelineBusy
        ? 'experimental'
        : bakeTerrainCommand?.enabled
          ? 'ready'
          : 'experimental',
      run: () => {
        openOwnerWorkspace('build')
        void bakeTerrainPipeline()
      },
    },
    {
      id: 'generate-terrain-heightmap',
      label: 'Generate Heightmap',
      description:
        generateHeightmapCommand?.reason ??
        'Generate a heightmap from the selected terrain source.',
      category: 'World',
      ownerWorkspace: 'build',
      enabled:
        !terrainHeightmapGeneratePending &&
        Boolean(generateHeightmapCommand?.enabled),
      disabledReason: terrainHeightmapGeneratePending
        ? 'Terrain heightmap generation is already running.'
        : generateHeightmapCommand?.enabled
          ? undefined
          : generateHeightmapCommand?.reason ??
            'Terrain heightmap generation is blocked.',
      status: terrainHeightmapGeneratePending
        ? 'experimental'
        : generateHeightmapCommand?.enabled
          ? 'ready'
          : 'experimental',
      run: () => {
        openOwnerWorkspace('build')
        void generateTerrainHeightmapFromSelection()
      },
    },
    {
      id: 'bake-terrain-collision',
      label: 'Bake Terrain Collision',
      description:
        bakeTerrainCollisionCommand?.reason ??
        'Bake runtime collision from the current terrain contract.',
      category: 'Collision',
      ownerWorkspace: 'collision',
      enabled:
        !terrainCollisionBakePending &&
        Boolean(bakeTerrainCollisionCommand?.enabled),
      disabledReason: terrainCollisionBakePending
        ? 'Terrain collision baking is already running.'
        : bakeTerrainCollisionCommand?.enabled
          ? undefined
          : bakeTerrainCollisionCommand?.reason ??
            'Terrain collision baking is blocked.',
      status: terrainCollisionBakePending
        ? 'experimental'
        : bakeTerrainCollisionCommand?.enabled
          ? 'ready'
          : 'experimental',
      run: () => {
        openOwnerWorkspace('collision')
        void bakeTerrainCollision()
      },
    },
    {
      id: 'cook-terrain-chunks',
      label: 'Cook Terrain Chunks',
      description:
        cookChunkCommand?.reason ??
        'Cook runtime render chunks for the current terrain source.',
      category: 'World',
      ownerWorkspace: 'build',
      enabled: !terrainChunkCookPending && Boolean(cookChunkCommand?.enabled),
      disabledReason: terrainChunkCookPending
        ? 'Terrain chunk cooking is already running.'
        : cookChunkCommand?.enabled
          ? undefined
          : cookChunkCommand?.reason ?? 'Terrain chunk cooking is blocked.',
      status: terrainChunkCookPending
        ? 'experimental'
        : cookChunkCommand?.enabled
          ? 'ready'
          : 'experimental',
      run: () => {
        openOwnerWorkspace('build')
        void cookTerrainChunks()
      },
    },
    {
      id: 'cook-world-partition',
      label: 'Cook World Partition',
      description:
        'Cook world-partition metadata for the active level runtime.',
      category: 'World',
      ownerWorkspace: 'build',
      enabled: !worldPartitionCookPending,
      disabledReason: worldPartitionCookPending
        ? 'World partition cooking is already running.'
        : undefined,
      status: worldPartitionCookPending ? 'experimental' : 'ready',
      run: () => {
        openOwnerWorkspace('build')
        void cookWorldPartition()
      },
    },
    {
      id: 'open-performance-tools',
      label: 'Open Performance Tools',
      description:
        'Open scene performance diagnostics and budget management tools.',
      category: 'Diagnostics',
      ownerWorkspace: 'performance',
      enabled: true,
      status: 'ready',
      run: () => openOwnerWorkspace('performance'),
    },
    {
      id: 'bake-mesh-collider',
      label: 'Bake Mesh Collider',
      description: 'Bake a collider asset for the selected mesh object.',
      category: 'Collision',
      ownerWorkspace: 'collision',
      enabled: selected.enabled,
      disabledReason: selected.disabledReason,
      status: selected.enabled ? 'ready' : 'needs-selection',
      run: () => {
        openOwnerWorkspace('collision')
        void inspectorController.bakeMeshColliderFromSelection()
      },
    },
    {
      id: 'validate-terrain-contract',
      label: 'Validate Terrain Contract',
      description:
        terrainCommand('validate-terrain-contract')?.reason ??
        'Validate visual ownership, collision, chunks, and fallback state.',
      category: 'Diagnostics',
      ownerWorkspace: 'build',
      enabled: true,
      status: 'ready',
      run: () => {
        openOwnerWorkspace('build')
        void validateTerrainContract()
      },
    },
    {
      id: 'mark-level-draft',
      label: 'Mark Level As Draft',
      description: 'Switch the active level registry entry back to draft.',
      category: 'Build',
      ownerWorkspace: 'build',
      enabled: true,
      status: 'danger',
      run: () => {
        openOwnerWorkspace('build')
        void levelController.markLevelDraft()
      },
    },
    {
      id: 'reload-current-level',
      label: 'Reload Current Level',
      description: 'Reload the active level document from disk.',
      category: 'Build',
      ownerWorkspace: 'build',
      enabled: true,
      status: 'danger',
      run: () => {
        openOwnerWorkspace('build')
        void reloadFromDisk()
      },
    },
    {
      id: 'open-save-tools',
      label: 'Open Level File Tools',
      description: 'Open save, import, registry, and publish tools.',
      category: 'Build',
      ownerWorkspace: 'build',
      enabled: true,
      status: 'ready',
      run: () => openOwnerWorkspace('build'),
    },
    {
      id: 'undo',
      label: 'Undo',
      description: 'Undo the last scene edit.',
      category: 'Object',
      ownerWorkspace: 'viewport',
      enabled: canUndo,
      disabledReason: canUndo ? undefined : 'Nothing to undo.',
      status: canUndo ? 'ready' : 'experimental',
      shortcut: 'Ctrl+Z',
      run: () => {
        if (undoScene()) saveMessage = 'Undo'
      },
    },
    {
      id: 'redo',
      label: 'Redo',
      description: 'Redo the last undone scene edit.',
      category: 'Object',
      ownerWorkspace: 'viewport',
      enabled: canRedo,
      disabledReason: canRedo ? undefined : 'Nothing to redo.',
      status: canRedo ? 'ready' : 'experimental',
      shortcut: 'Ctrl+Shift+Z',
      run: () => {
        if (redoScene()) saveMessage = 'Redo'
      },
    },
    {
      id: 'select-all',
      label: 'Select All',
      description: 'Select every object in the scene hierarchy.',
      category: 'Selection',
      ownerWorkspace: 'outliner',
      enabled: editorNodes.length > 0,
      disabledReason:
        editorNodes.length > 0 ? undefined : 'No scene objects to select.',
      status: editorNodes.length > 0 ? 'ready' : 'experimental',
      shortcut: 'Ctrl+A',
      run: selectAllNodes,
    },
    {
      id: 'clear-selection',
      label: 'Clear Selection',
      description: 'Clear the current object selection.',
      category: 'Selection',
      ownerWorkspace: 'outliner',
      ...selected,
      shortcut: 'Esc',
      run: clearSelection,
    },
    {
      id: 'select-similar',
      label: 'Select Similar',
      description: `Select ${similarNodeLabel} in the scene.`,
      category: 'Selection',
      ownerWorkspace: 'outliner',
      enabled: similarNodeCount > 0,
      disabledReason:
        similarNodeCount > 0
          ? undefined
          : 'Select an object with similar matches first.',
      status: similarNodeCount > 0 ? 'ready' : 'needs-selection',
      run: () => setSelectedNodes(similarNodeIds),
    },
    {
      id: 'duplicate-selection',
      label: 'Duplicate Selection',
      description: 'Duplicate selected scene objects.',
      category: 'Object',
      ownerWorkspace: 'viewport',
      ...selected,
      shortcut: 'Ctrl+D',
      run: () => duplicateNodes(editorState.selectedNodeIds),
    },
    {
      id: 'delete-selection',
      label: 'Delete Selection',
      description: 'Delete selected scene objects.',
      category: 'Object',
      ownerWorkspace: 'viewport',
      ...deletion,
      status: deletion.enabled ? 'danger' : deletion.status,
      shortcut: 'Del',
      run: () => removeNodes(editorState.selectedNodeIds),
    },
    {
      id: 'frame-spawn',
      label: 'Frame Player Spawn',
      description:
        'Move the editor viewport focus to the configured player spawn.',
      category: 'View',
      ownerWorkspace: 'scene',
      enabled: Boolean(spawnPosition),
      disabledReason: spawnPosition
        ? undefined
        : 'No finite player spawn is configured.',
      status: spawnPosition ? 'ready' : 'experimental',
      run: () => {
        if (spawnPosition) requestEditorViewportFocus(spawnPosition, 18)
      },
    },
    {
      id: 'bake-collision',
      label: 'Open Collision Bake Tools',
      description:
        'Review generated collider and collision defaults before baking.',
      category: 'Collision',
      ownerWorkspace: 'collision',
      enabled: true,
      status: 'experimental',
      run: () => openOwnerWorkspace('collision'),
    },
    {
      id: 'generate-asset',
      label: 'Open Asset Generator',
      description:
        'Open the Create workspace for prefab and AI-assisted asset creation.',
      category: 'Create',
      ownerWorkspace: 'create',
      enabled: backend.enabled,
      disabledReason: backend.disabledReason,
      status: backend.status,
      run: () => openOwnerWorkspace('create'),
    },
    {
      id: 'generate-selection-asset',
      label: 'Generate Asset For Selection',
      description: 'Open AI tools for the selected object.',
      category: 'AI',
      ownerWorkspace: 'ai',
      enabled: selected.enabled && backend.enabled,
      disabledReason: selected.disabledReason ?? backend.disabledReason,
      status: selected.enabled ? backend.status : selected.status,
      run: () => openOwnerWorkspace('ai'),
    },
    {
      id: 'texture-selection-asset',
      label: 'Texture Selection',
      description: 'Open AI texture and style tools for the selected object.',
      category: 'AI',
      ownerWorkspace: 'ai',
      enabled: selected.enabled && backend.enabled,
      disabledReason: selected.disabledReason ?? backend.disabledReason,
      status: selected.enabled ? backend.status : selected.status,
      run: () => openOwnerWorkspace('ai'),
    },
    {
      id: 'open-asset-library',
      label: 'Open Asset Library',
      description: 'Open the Create workspace asset browser.',
      category: 'Asset',
      ownerWorkspace: 'create',
      enabled: true,
      status: 'ready',
      run: () => openOwnerWorkspace('create'),
    },
    {
      id: 'view-rendered',
      label: 'Rendered View',
      description: 'Use rendered viewport shading.',
      category: 'View',
      ownerWorkspace: 'viewport',
      enabled: editorState.viewportShadingMode !== 'rendered',
      disabledReason:
        editorState.viewportShadingMode === 'rendered'
          ? 'Rendered view is already active.'
          : undefined,
      status: 'ready',
      run: () => setEditorViewportShadingMode('rendered'),
    },
    {
      id: 'view-solid',
      label: 'Solid View',
      description: 'Use solid viewport shading.',
      category: 'View',
      ownerWorkspace: 'viewport',
      enabled: editorState.viewportShadingMode !== 'solid',
      disabledReason:
        editorState.viewportShadingMode === 'solid'
          ? 'Solid view is already active.'
          : undefined,
      status: 'ready',
      run: () => setEditorViewportShadingMode('solid'),
    },
    {
      id: 'view-wireframe',
      label: 'Wireframe View',
      description: 'Use wireframe viewport shading.',
      category: 'View',
      ownerWorkspace: 'viewport',
      enabled: editorState.viewportShadingMode !== 'wireframe',
      disabledReason:
        editorState.viewportShadingMode === 'wireframe'
          ? 'Wireframe view is already active.'
          : undefined,
      status: 'ready',
      run: () => setEditorViewportShadingMode('wireframe'),
    },
    {
      id: 'toggle-details-shelf',
      label: editorState.propertiesShelfOpen
        ? 'Hide Details Shelf'
        : 'Show Details Shelf',
      description: 'Toggle the selected-object details shelf.',
      category: 'View',
      ownerWorkspace: 'header',
      enabled: editorState.panelOpen,
      disabledReason: editorState.panelOpen
        ? undefined
        : 'Open the tool panel first.',
      status: 'ready',
      run: togglePropertiesShelfOpen,
    },
    {
      id: 'toggle-tool-panel',
      label: editorState.panelOpen ? 'Collapse Tool Panel' : 'Open Tool Panel',
      description: 'Toggle the main editor tool panel.',
      category: 'View',
      ownerWorkspace: 'header',
      enabled: true,
      status: 'ready',
      run: togglePanelOpen,
    },
    ...EDITOR_LAYOUT_PRESET_OPTIONS.map(preset => ({
      id: `layout-${preset.id}`,
      label: `Layout: ${preset.label}`,
      description: `Apply the ${preset.label} editor layout preset.`,
      category: 'View' as const,
      ownerWorkspace: 'header' as const,
      enabled: true,
      status: 'ready' as const,
      run: () => applyLayoutPresetFromMenu(preset.id),
    })),
    {
      id: 'layout-reset',
      label: 'Reset Layout Preset',
      description: 'Restore the default editor layout preset and dock sizes.',
      category: 'View',
      ownerWorkspace: 'header',
      enabled: true,
      status: 'ready',
      run: resetLayoutPresetFromMenu,
    },
    {
      id: 'reset-dock-layout',
      label: 'Reset Dock Layout',
      description: 'Restore default editor dock widths.',
      category: 'View',
      ownerWorkspace: 'header',
      enabled: editorState.layoutCustomized,
      disabledReason: editorState.layoutCustomized
        ? undefined
        : 'Dock layout is already using defaults.',
      status: 'ready',
      run: resetDockLayoutFromMenu,
    },
  ]
}

function runEditorCommand(commandId: string) {
  const command = editorCommands.find(item => item.id === commandId)
  if (!command || !command.enabled) return
  commandPaletteOpen = false
  void command.run()
}

$: if (editorState) {
  editorCommands = buildEditorCommands()
}

$: if (
  editorState?.layoutPreset &&
  editorState.layoutPreset !== lastAppliedLayoutPreset
) {
  lastAppliedLayoutPreset = editorState.layoutPreset
  setActiveEditorTab(getLayoutPresetWorkspace(editorState.layoutPreset))
}

$: editorDockStyle = editorState
  ? `--editor-tools-width: ${getEffectiveDockWidth('tools', editorViewportWidth)}px; --editor-side-width: ${getEffectiveDockWidth('side', editorViewportWidth)}px; --editor-tools-height: ${getEffectiveDockHeight('tools', editorViewportHeight)}px; --editor-side-height: ${getEffectiveDockHeight('side', editorViewportHeight)}px;`
  : ''
$: responsiveSingleSideDock =
  Boolean(editorState) &&
  editorViewportWidth <= 1024 &&
  editorState.layoutPreset !== 'default' &&
  !editorState.responsiveSplitPinned &&
  editorState.outlinerOpen &&
  editorState.propertiesShelfOpen
$: effectiveOutlinerOpen =
  Boolean(editorState?.outlinerOpen) &&
  !(responsiveSingleSideDock && editorState.selectedNodeIds.length > 0)
$: effectivePropertiesShelfOpen =
  Boolean(editorState?.propertiesShelfOpen) &&
  !(responsiveSingleSideDock && editorState.selectedNodeIds.length === 0)
$: effectiveSideOpen = effectiveOutlinerOpen || effectivePropertiesShelfOpen

$: selectedHunyuanJob =
  recentHunyuanJobs.find(job => job.id === selectedHunyuanJobId) ?? null
$: selectedNodePreviewAssetUrl =
  assetController.getSelectedNodePreviewAssetUrl(selectedNode)
$: workflowSelectionSummary =
  selectedNodes.length > 1
    ? `${selectedNodes.length} objects selected`
    : selectedNode
      ? `${selectedNode.name} selected`
      : 'No selection yet'
$: workflowCanGenerateSelection =
  !!selectedNode &&
  selectedNodes.length <= 1 &&
  canUseAiMeshStudio(selectedNode) &&
  hunyuanBackendCanGenerate &&
  hunyuanSupportsReplacement
$: workflowCanRetextureSelection =
  !!selectedNode &&
  selectedNodes.length <= 1 &&
  canRetextureSelection(selectedNode) &&
  hunyuanBackendCanRetexture &&
  hunyuanSupportsTextureWrap

$: {
  const shouldPollHunyuanJobs = activeEditorTab === 'ai'
  if (
    typeof window !== 'undefined' &&
    shouldPollHunyuanJobs &&
    hunyuanJobsPollInterval === null
  ) {
    void aiController.refreshHunyuanRecentJobs()
    hunyuanJobsPollInterval = window.setInterval(() => {
      void aiController.refreshHunyuanRecentJobs()
    }, 4000)
  } else if (
    (!shouldPollHunyuanJobs || typeof window === 'undefined') &&
    hunyuanJobsPollInterval !== null
  ) {
    window.clearInterval(hunyuanJobsPollInterval)
    hunyuanJobsPollInterval = null
  }
}

$: {
  const nextGeneratedVariantKey =
    selectedNode?.id && selectedNode?.asset?.url?.startsWith('/generated/')
      ? `${selectedNode.id}:${selectedNode.asset.url}`
      : ''

  if (
    nextGeneratedVariantKey &&
    nextGeneratedVariantKey !== generatedVariantSelectionKey
  ) {
    generatedVariantSelectionKey = nextGeneratedVariantKey
    void assetController.loadGeneratedVariantsForSelectedNode(selectedNode)
  } else if (!nextGeneratedVariantKey && generatedVariantSelectionKey) {
    generatedVariantSelectionKey = ''
    assetController.clearGeneratedVariantState()
  }
}

function addAssetFromBrowser(item: { name: string; path: string }) {
  assetController.addAssetFromBrowser(item)
}

function addLatestGeneratedAssetToScene() {
  if (!hunyuanLastOutputUrl) {
    saveMessage = 'No generated asset available yet'
    return
  }

  const assetName =
    hunyuanLastOutputUrl
      .split('/')
      .pop()
      ?.replace(/\.(gltf|glb)$/i, '') || 'Generated Asset'
  createController.addAssetPrefab(assetName, hunyuanLastOutputUrl, [1, 1, 1])
  saveMessage = `Added latest generated asset at scene scale: ${hunyuanLastOutputUrl}`
}

$: styleBatchResumeAvailable = !!styleBatchPendingResume && !styleBatchBusy
function getStyleBatchModeLabel(mode: PersistedStyleBatchSession['mode']) {
  if (mode === 'procedural-material') return 'procedural style bake'
  return mode === 'generate' ? 'mesh reimagine' : 'texture'
}
$: styleBatchResumeSummary = styleBatchPendingResume
  ? `Saved ${getStyleBatchModeLabel(styleBatchPendingResume.mode)} batch with ${styleBatchPendingResume.entries.length} objects from ${new Date(styleBatchPendingResume.updatedAt).toLocaleString()}`
  : ''

function updateTupleField(
  field: 'position' | 'rotation' | 'scale',
  index: number,
  value: string,
) {
  if (!selectedNode) return
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return

  const next = [...selectedNode[field]] as [number, number, number]
  next[index] = numeric
  patchNode(selectedNode.id, { [field]: next })
}

function toggleNodeVisibility(nodeId: string, event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()
  const node = editorNodes.find(candidate => candidate.id === nodeId)
  if (!node) return
  patchNode(nodeId, { visible: !node.visible })
}

function toggleNodeLocked(nodeId: string, event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()
  const node = editorNodes.find(candidate => candidate.id === nodeId)
  if (!node) return
  patchNode(nodeId, { locked: !(node.locked ?? false) })
}

function toggleNodeIsolation(nodeId: string, event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()
  toggleIsolatedNode(nodeId)
}

function isolateSelection() {
  if (selectedNodes.length === 0) return
  setIsolatedNodes(selectedNodes.map(node => node.id))
}

function soloNode(nodeId: string, event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()
  setIsolatedNodes([nodeId])
}

function unhideAllNodes() {
  const hiddenNodeIds = editorNodes
    .filter(node => !node.visible)
    .map(node => node.id)
  if (hiddenNodeIds.length === 0) return
  patchNodes(hiddenNodeIds, { visible: true })
}

function hideSelectedNodes() {
  const selectedIds = selectedNodes.map(node => node.id)
  if (selectedIds.length === 0) return
  patchNodes(selectedIds, { visible: false })
  clearSelection()
}

function unlockAllNodes() {
  const lockedNodeIds = editorNodes
    .filter(node => node.locked ?? false)
    .map(node => node.id)
  if (lockedNodeIds.length === 0) return
  patchNodes(lockedNodeIds, { locked: false })
}

function getSelectedNodeMaterialDefaults(
  node: EditorSceneNode | null,
): EditorMaterialData {
  if (!node) return {}

  if (node.primitive) {
    return {
      color: node.material?.color ?? node.primitive.color,
      mapUrl: node.material?.mapUrl,
      emissive: node.material?.emissive ?? node.primitive.emissive,
      emissiveMapUrl: node.material?.emissiveMapUrl,
      emissiveIntensity:
        node.material?.emissiveIntensity ?? node.primitive.emissiveIntensity,
      metalness: node.material?.metalness ?? node.primitive.metalness,
      metalnessMapUrl: node.material?.metalnessMapUrl,
      roughness: node.material?.roughness ?? node.primitive.roughness,
      roughnessMapUrl: node.material?.roughnessMapUrl,
      normalMapUrl: node.material?.normalMapUrl,
      alphaMapUrl: node.material?.alphaMapUrl,
      opacity: node.material?.opacity ?? node.primitive.opacity,
      transparent: node.material?.transparent ?? node.primitive.transparent,
      wireframe: node.material?.wireframe,
      doubleSided: node.material?.doubleSided,
      flatShading: node.material?.flatShading,
      envMapIntensity: node.material?.envMapIntensity,
      transmission: node.material?.transmission,
      ior: node.material?.ior,
      clearcoat: node.material?.clearcoat,
      clearcoatRoughness: node.material?.clearcoatRoughness,
      thickness: node.material?.thickness,
      reflectivity: node.material?.reflectivity,
    }
  }

  return node.material ?? {}
}

function addRawPrimitive() {
  addNode({
    id: `primitive-${Date.now()}`,
    name: 'Primitive Box',
    kind: 'primitive',
    parentId: selectedNode?.id ?? null,
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    primitive: {
      geometry: 'box',
      args: [1, 1, 1],
      color: '#7ecbff',
      emissive: '#17384a',
      emissiveIntensity: 0.18,
      metalness: 0.65,
      roughness: 0.35,
    },
  })
}

$: if (selectedNode) {
  importBuffer = ''
}

$: {
  const nextSelectionKey = selectedNode?.id ?? ''

  if (nextSelectionKey !== hunyuanSelectionKey) {
    hunyuanSelectionKey = nextSelectionKey
    hunyuanPrompt = ''
    lastInspectedHunyuanAsset = ''
  }

  if (!canUseAiMeshStudio(selectedNode)) {
    hunyuanInspectToken += 1
    hunyuanDetectedReferenceImageUrl = ''
    hunyuanReferenceImageUrl = ''
    hunyuanSupportsReplacement = false
    hunyuanSupportsTextureWrap = false
    hunyuanLastOutputUrl = ''
    hunyuanServiceReady = false
    hunyuanStatus = selectedNode
      ? 'Hunyuan tools currently target geometry-backed nodes: imported assets, primitives, and prefabs.'
      : 'Select a single geometry node to generate or texture.'
  }
}

$: setRuntimeDiagnostic('selection', {
  level: selectedNodes.length > 1 ? 'warning' : selectedNode ? 'ready' : 'idle',
  message:
    selectedNodes.length > 1
      ? `${selectedNodes.length} nodes selected. AI tools require a single node.`
      : selectedNode
        ? `Selected node: ${selectedNode.name} (${selectedNode.kind}).`
        : 'No editor selection active.',
})

$: {
  const nextAssetUrl = getAiSourceAssetUrl(selectedNode)
  const inspectionKey =
    selectedNode?.id && nextAssetUrl ? `${selectedNode.id}:${nextAssetUrl}` : ''

  if (inspectionKey && inspectionKey !== lastInspectedHunyuanAsset) {
    lastInspectedHunyuanAsset = inspectionKey
    void assetController.inspectSelectedAssetForHunyuan(
      nextAssetUrl,
      selectedNode?.id ?? '',
    )
    void aiController.refreshHunyuanServiceStatus(false)
  } else if (!inspectionKey) {
    lastInspectedHunyuanAsset = ''
    if (selectedNode?.prefab || selectedNode?.primitive) {
      hunyuanDetectedReferenceImageUrl = ''
      hunyuanReferenceImageUrl = ''
      hunyuanSupportsReplacement = true
      hunyuanSupportsTextureWrap = false
      hunyuanLastOutputUrl = ''
      void aiController.refreshHunyuanServiceStatus(false)
      hunyuanStatus = `Ready to generate a new mesh for ${selectedNode.name}. Procedural nodes are exported to a temporary GLB before they enter the AI pipeline.`
    }
  }
}

$: {
  const nextStyleSelectionKey = selectedNode?.id ?? ''
  if (nextStyleSelectionKey !== styleSelectionKey) {
    styleSelectionKey = nextStyleSelectionKey
    styleWorkspaceRestoreToken += 1
    styleInspectReport = ''
    styleSourceSummary = ''
    styleWorkspaceManifestUrl = ''
    styleWorkspaceSourceAssetUrl = ''
    styleGeneratedReferenceImageUrl = ''
    styleSimplifiedAssetUrl = ''
    styleBakeCurrentSourceAssetUrl = getAiSourceAssetUrl(selectedNode) ?? ''
    styleBakeProduct = null
    styleBakeProductStatus = 'missing'
    styleBakeLastError = ''
    styleBakeLastSuccessfulAt = ''
    styleBakeCanApply = false
    styleBakeCanRevert = false
    styleBakePreviewSnapshot = null
    styleBlenderExportPath = ''
    styleBlenderOpenCommand = ''

    if (selectedNode && canUseStyleStudio(selectedNode)) {
      styleStatus = `Ready to prepare a style workspace for ${selectedNode.name}.`
      if (
        getAiSourceAssetUrl(selectedNode) &&
        hunyuanDetectedReferenceImageUrl
      ) {
        styleReferenceImageUrl = hunyuanDetectedReferenceImageUrl
      }
      if (!stylePrompt.trim()) {
        stylePrompt =
          'hand-painted storybook environment art, unified surface language, stylized materials, painterly wear, broad readable forms'
      }
      if (selectedNode.asset?.url) {
        void styleController.restoreLatestStyleWorkspaceForSelection(
          selectedNode.asset.url,
          selectedNode.id,
        )
      }
    } else {
      styleStatus = 'Select a single geometry node to open the style toolchain.'
      styleReferenceImageUrl = ''
    }
  }
}

$: if (
  selectedNode &&
  canUseStyleStudio(selectedNode) &&
  !styleReferenceImageUrl &&
  hunyuanDetectedReferenceImageUrl
) {
  styleReferenceImageUrl = hunyuanDetectedReferenceImageUrl
}

$: {
  const nextComfyUiStatusKey = activeEditorTab === 'ai' ? comfyUiApiUrl : ''
  if (nextComfyUiStatusKey && nextComfyUiStatusKey !== comfyUiStatusKey) {
    comfyUiStatusKey = nextComfyUiStatusKey
    void aiController.refreshComfyUiServiceStatus(false)
  } else if (!nextComfyUiStatusKey) {
    comfyUiStatusKey = ''
  }
}

$: if (editorState?.dirty) {
  if (autoSaveTimeout !== null) {
    window.clearTimeout(autoSaveTimeout)
  }
  autoSaveTimeout = window.setTimeout(() => {
    const saved = saveSceneToLocalStorage(activeSceneLevelId)
    saveMessage = saved
      ? 'Autosaved locally'
      : 'Autosave skipped: fix scene validation errors first'
    autoSaveTimeout = null
  }, 1200)
}

function setTerrainAutoBake(enabled: boolean) {
  updateLevelSceneSettings(settings => ({
    ...settings,
    terrainSculpt: {
      ...(settings.terrainSculpt ?? {}),
      enabled: settings.terrainSculpt?.enabled ?? true,
      autoBakeCollision: enabled,
    },
    collision: {
      ...(settings.collision ?? {}),
      terrain: {
        ...(settings.collision?.terrain ?? {}),
        source: 'baked-heightmap',
        runtimeSource:
          settings.collision?.terrain?.runtimeSource ?? 'editor-manifest',
      },
    },
  }))
  saveMessage = enabled
    ? 'Terrain collision will auto-bake after terrain edits'
    : 'Terrain collision auto-bake disabled'
}

function setCollisionBudget(budget: LevelCollisionBudget) {
  updateLevelSceneSettings(settings => ({
    ...settings,
    collision: {
      ...(settings.collision ?? {}),
      workflow: {
        ...(settings.collision?.workflow ?? {}),
        colliderBudget: budget,
      },
    },
  }))
  saveMessage = `Collision budget set to ${budget}`
}

async function bakeTerrainCollision() {
  if (terrainCollisionBakePending) return false
  terrainCollisionBakePending = true
  saveMessage = 'Baking terrain collision...'

  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-terrain/bake-collision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId: activeSceneLevelId }),
      },
    )
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Terrain collision bake failed')
    }

    const sourceStillDirty = Boolean(terrainCollisionSettings?.heightmapDirty)
    updateLevelSceneSettings(settings =>
      applyTerrainCollisionBakePayload(settings, payload, {
        sourceStillDirty,
      }),
    )
    saveMessage = sourceStillDirty
      ? 'Terrain collision baked from existing heightmap; source basket still needs heightmap generation'
      : 'Terrain collision baked'
    return true
  } catch (error) {
    console.error('Terrain collision bake failed:', error)
    saveMessage =
      error instanceof Error ? error.message : 'Terrain collision bake failed'
    return false
  } finally {
    terrainCollisionBakePending = false
  }
}

async function generateTerrainHeightmapFromSelection() {
  if (terrainHeightmapGeneratePending) return false
  if (heightmapSourceDescriptors.length === 0) {
    saveMessage =
      'Select a mesh asset, primitive, prefab, or group to generate the terrain heightmap'
    return false
  }

  terrainHeightmapGeneratePending = true
  saveMessage = `Generating terrain heightmap from ${selectedTerrainSourceName}...`

  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-terrain/generate-heightmap`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildTerrainHeightmapRequest({
            levelId: activeSceneLevelId,
            nodeId: selectedNode?.id,
            sources: heightmapSourceDescriptors,
            resolution: terrainCollisionSettings?.heightmapResolution ?? 512,
          }),
        ),
      },
    )
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Terrain heightmap generation failed')
    }

    updateLevelSceneSettings(settings =>
      applyTerrainHeightmapPayload(settings, payload, {
        selectedNodeId: selectedNode?.id,
        selectedTerrainSourceName,
      }),
    )
    saveMessage = `Generated heightmap and collision from ${selectedTerrainSourceName}`
    return true
  } catch (error) {
    console.error('Terrain heightmap generation failed:', error)
    saveMessage =
      error instanceof Error
        ? error.message
        : 'Terrain heightmap generation failed'
    return false
  } finally {
    terrainHeightmapGeneratePending = false
  }
}

async function loadTerrainStatusSnapshot(
  scene: EditorSceneDocument | null,
): Promise<EditorTerrainStatusSnapshot | null> {
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-terrain/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelId: activeSceneLevelId,
          scene,
        }),
      },
    )
    const payload = await response.json()
    if (!payload?.success) return null
    const sourceAssets = Array.isArray(payload.sourceAssets)
      ? payload.sourceAssets
      : []
    const missingSourceAssets = Array.isArray(payload.missingSourceAssets)
      ? payload.missingSourceAssets
      : sourceAssets.filter(source => source.exists === false)
    return { sourceAssets, missingSourceAssets }
  } catch {
    return null
  }
}

async function refreshTerrainStatusSnapshot(
  key: string,
  scene: EditorSceneDocument | null,
) {
  const requestId = ++terrainStatusRequestId
  const snapshot = await loadTerrainStatusSnapshot(scene)
  if (requestId !== terrainStatusRequestId || key !== terrainStatusKey) return
  terrainStatusSnapshot = snapshot
}

async function cookTerrainChunks() {
  if (terrainChunkCookPending) return false
  const scene = get(editorSceneStore)
  const terrainStatus = await loadTerrainStatusSnapshot(scene)
  const pipeline = describeEditorTerrainPipeline({
    scene,
    selectedTerrainSourceName,
    selectedTerrainSourceAssetUrl,
    terrainStatus,
  })
  const cookCommand = pipeline.commands.find(
    command =>
      command.id === 'cook-glb-chunks' ||
      command.id === 'cook-heightfield-chunks',
  )
  if (pipeline.mode === 'glb-chunk-terrain' && !cookCommand?.enabled) {
    saveMessage = cookCommand?.reason ?? 'Terrain chunk cook is blocked'
    return false
  }
  const sourceGlbCook = pipeline.mode === 'glb-chunk-terrain'
  terrainChunkCookPending = true
  saveMessage = sourceGlbCook
    ? 'Cooking source GLB terrain chunks...'
    : 'Cooking terrain visual chunks...'

  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-terrain/cook-chunks`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildTerrainChunkCookRequest({
            levelId: activeSceneLevelId,
            sourceGlbCook,
          }),
        ),
      },
    )
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Terrain chunk cook failed')
    }

    updateLevelSceneSettings(settings =>
      applyTerrainChunkCookPayload(settings, payload, {
        sourceGlbCook,
      }),
    )
    saveMessage = sourceGlbCook
      ? `Cooked ${payload.chunkCount ?? 0} source GLB terrain chunks`
      : `Cooked ${payload.chunkCount ?? 0} terrain visual chunks`
    return true
  } catch (error) {
    console.error('Terrain chunk cook failed:', error)
    saveMessage =
      error instanceof Error ? error.message : 'Terrain chunk cook failed'
    return false
  } finally {
    terrainChunkCookPending = false
  }
}

async function validateTerrainContract() {
  saveMessage = 'Validating terrain contract...'
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/audit-engine`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId: activeSceneLevelId }),
      },
    )
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Terrain validation failed')
    }
    saveMessage = 'Terrain contract validation passed'
    return true
  } catch (error) {
    console.error('Terrain contract validation failed:', error)
    saveMessage =
      error instanceof Error ? error.message : 'Terrain validation failed'
    return false
  }
}

async function bakeTerrainPipeline() {
  if (
    terrainCollisionBakePending ||
    terrainHeightmapGeneratePending ||
    terrainChunkCookPending
  ) {
    saveMessage = 'Terrain pipeline is already running'
    return
  }

  const scene = get(editorSceneStore)
  const terrainStatus = await loadTerrainStatusSnapshot(scene)
  const pipeline = describeEditorTerrainPipeline({
    scene,
    selectedTerrainSourceName,
    selectedTerrainSourceAssetUrl,
    terrainStatus,
  })
  const bakeCommand = pipeline.commands.find(
    command => command.id === 'bake-terrain',
  )
  if (!bakeCommand?.enabled) {
    saveMessage = bakeCommand?.reason ?? 'Terrain pipeline is blocked'
    return
  }

  const steps = planEditorTerrainBakeSteps({
    pipeline,
    terrain: terrainCollisionSettings,
    terrainSculptEnabled: terrainSculptSettings?.enabled,
    groundMode: groundSettings?.mode,
    groundVisualSource: groundSettings?.visualSource,
    groundTerrainVisualSource: groundSettings?.terrainVisualSource,
    groundTerrainRuntimeMode: groundSettings?.terrainRuntimeMode,
    terrainRuntimeMode: terrainCollisionSettings?.runtimeMode,
    terrainVisualSource: terrainCollisionSettings?.visualSource,
    renderChunkType:
      terrainCollisionSettings?.renderChunks?.type ??
      groundSettings?.renderChunks?.type,
  })
  const appendStepBeforeValidation = (step: (typeof steps)[number]) => {
    if (steps.includes(step)) return
    const validationIndex = steps.indexOf('validation')
    if (validationIndex === -1) {
      steps.push(step)
    } else {
      steps.splice(validationIndex, 0, step)
    }
  }
  saveMessage =
    pipeline.mode === 'scene-authored'
      ? 'Validating scene-authored terrain...'
      : 'Baking terrain runtime products...'

  if (pipeline.mode === 'scene-authored') {
    if (!(await validateTerrainContract())) return
    saveMessage = `Terrain runtime products current: ${steps.join(', ')}`
    return
  }

  if (pipeline.mode === 'glb-chunk-terrain') {
    if (steps.includes('source-glb-chunks') && !(await cookTerrainChunks())) {
      return
    }
    if (steps.includes('validation') && !(await validateTerrainContract())) {
      return
    }
    saveMessage = `Terrain runtime products current: ${steps.join(', ')}`
    return
  }

  if (steps.includes('heightmap')) {
    if (!(await generateTerrainHeightmapFromSelection())) return
  }

  const currentTerrain =
    get(editorSceneStore)?.settings?.level?.collision?.terrain
  if (
    steps.includes('collision') ||
    Boolean(currentTerrain?.dirty) ||
    !currentTerrain?.colliderUrl ||
    !currentTerrain?.metadataUrl
  ) {
    appendStepBeforeValidation('collision')
    if (!(await bakeTerrainCollision())) return
  }

  const refreshedTerrain =
    get(editorSceneStore)?.settings?.level?.collision?.terrain
  const chunksStale =
    Boolean(refreshedTerrain?.lastGeneratedAt) &&
    (!refreshedTerrain?.lastChunksGeneratedAt ||
      Date.parse(String(refreshedTerrain.lastChunksGeneratedAt)) <
        Date.parse(String(refreshedTerrain.lastGeneratedAt)))
  const terrainChunkRuntimeRequested = isGeneratedHeightmapChunkTerrain({
    terrainSculptEnabled: terrainSculptSettings?.enabled,
    groundMode: groundSettings?.mode,
    groundVisualSource: groundSettings?.visualSource,
    groundTerrainVisualSource: groundSettings?.terrainVisualSource,
    groundTerrainRuntimeMode: groundSettings?.terrainRuntimeMode,
    terrainRuntimeMode: refreshedTerrain?.runtimeMode,
    terrainVisualSource: refreshedTerrain?.visualSource,
    renderChunkType:
      refreshedTerrain?.renderChunks?.type ??
      groundSettings?.renderChunks?.type,
    terrainSource: refreshedTerrain?.source,
    hasHeightfieldChunks: Boolean(refreshedTerrain?.chunksPath),
  })
  const needsChunks =
    terrainChunkRuntimeRequested &&
    (chunksStale ||
      !refreshedTerrain?.chunksPath ||
      !refreshedTerrain?.chunkCount)
  if (steps.includes('chunks') || needsChunks) {
    appendStepBeforeValidation('chunks')
    if (!(await cookTerrainChunks())) return
  }

  if (steps.includes('validation') && !(await validateTerrainContract())) return
  saveMessage = `Terrain runtime products current: ${steps.join(', ')}`
}

async function cookWorldPartition() {
  if (worldPartitionCookPending) return
  worldPartitionCookPending = true
  saveMessage = 'Cooking actor world partition...'

  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/cook-world-partition`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId: activeSceneLevelId }),
      },
    )
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'World partition cook failed')
    }

    updateLevelSceneSettings(settings => ({
      ...settings,
      worldPartition: {
        ...(settings.worldPartition ?? {}),
        partitionUrl:
          payload.partitionUrl ?? settings.worldPartition?.partitionUrl,
        cellSize: payload.cellSize ?? settings.worldPartition?.cellSize,
        activeRadius:
          payload.activeRadius ?? settings.worldPartition?.activeRadius,
        cells: payload.cells ?? settings.worldPartition?.cells,
        residentActors:
          payload.residentActors ?? settings.worldPartition?.residentActors,
        streamableActors:
          payload.streamableActors ?? settings.worldPartition?.streamableActors,
        lastGeneratedAt: new Date().toISOString(),
      },
    }))
    saveMessage = `Cooked ${payload.cells ?? 0} actor partition cells`
  } catch (error) {
    console.error('World partition cook failed:', error)
    saveMessage =
      error instanceof Error ? error.message : 'World partition cook failed'
  } finally {
    worldPartitionCookPending = false
  }
}

async function publishGroundTerrainContracts() {
  await groundTerrainRuntimePublisher.publishGroundTerrainContracts()
}

async function reloadFromDisk() {
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(activeSceneLevelId)}`,
    )
    const payload = await response.json()
    if (payload?.success && payload.scene) {
      const localScene = saveEditorSceneToLocalStorage(
        activeSceneLevelId,
        payload.scene,
      )
      setEditorScene(localScene)
      saveMessage = 'Reloaded from disk and replaced local scene cache'
      return
    }
    saveMessage = 'No disk scene found'
  } catch (error) {
    console.error('Reload from disk failed:', error)
    saveMessage = 'Reload failed'
  }
}

function loadPackagedLevelScene() {
  setEditorScene(
    createDefaultSceneForLevel(activeSceneLevelId) ??
      createEmptyScene(activeSceneLevelId),
  )
  saveMessage = 'Loaded packaged scene from repo'
}

async function loadOriginalSnapshot() {
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(activeSceneLevelId)}&snapshot=original-packaged`,
    )
    const payload = await response.json()
    if (payload?.success && payload.scene) {
      setEditorScene(payload.scene)
      saveMessage = payload.snapshotFile
        ? `Loaded original snapshot ${payload.snapshotFile}`
        : 'Loaded original snapshot'
      return
    }
    saveMessage = `No original snapshot found for ${activeSceneLevelId}`
  } catch (error) {
    console.error('Original snapshot load failed:', error)
    saveMessage = 'Original snapshot load failed'
  }
}

async function loadBackupSnapshot() {
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(activeSceneLevelId)}&snapshot=latest-backup`,
    )
    const payload = await response.json()
    if (payload?.success && payload.scene) {
      setEditorScene(payload.scene)
      saveMessage = payload.snapshotFile
        ? `Loaded backup snapshot ${payload.snapshotFile}`
        : 'Loaded backup snapshot'
      return
    }
    saveMessage = `No backup snapshot found for ${activeSceneLevelId}`
  } catch (error) {
    console.error('Backup snapshot load failed:', error)
    saveMessage = 'Backup snapshot load failed'
  }
}

function switchEditorLevel() {
  if (!pendingLevelId) {
    saveMessage = 'Select a level'
    return
  }

  if (pendingLevelId === levelId) {
    saveMessage = 'Already on this level'
    return
  }

  if (autoSaveTimeout !== null) {
    window.clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }

  if (editorState?.dirty) {
    const saved = saveSceneToLocalStorage(activeSceneLevelId)
    if (!saved) {
      saveMessage = 'Fix scene validation errors before switching levels'
      return
    }
  }
  clearSelection()
  saveMessage = `Switching to ${editorLevelOptions.find(option => option.id === pendingLevelId)?.label ?? pendingLevelId}`
  gameActions.transitionToLevel(pendingLevelId)
}

function setSaveMessageValue(value: string) {
  saveMessage = value
}

function removeSelectedNpc() {
  const node = get(selectedEditorNodeStore)
  if (!node?.npc) return

  const nextNode = structuredClone(node)
  nextNode.npc = undefined
  executeSceneCommands([
    {
      type: 'replace-node',
      nodeId: node.id,
      node: nextNode,
    },
  ])
  setSaveMessageValue(`Removed NPC component from ${node.name}`)
}

function setHierarchyFilterValue(value: string) {
  hierarchyFilter = value
}

function setHierarchyRootDropActiveValue(value: boolean) {
  hierarchyRootDropActive = value
}

function setHierarchyDropTargetIdValue(value: string | null) {
  hierarchyDropTargetId = value
}

function setAssetBrowserFilterValue(value: string) {
  assetBrowserFilter = value
}

function setHunyuanApplyToSimilarNodesValue(value: boolean) {
  hunyuanApplyToSimilarNodes = value
}

function handleEditorMenuShortcut(event: KeyboardEvent) {
  if (!editorState?.enabled) return
  const mod = event.metaKey || event.ctrlKey
  if (!mod) return

  if (event.key.toLowerCase() === 'k') {
    event.preventDefault()
    commandPaletteOpen = true
    return
  }

  if (event.key.toLowerCase() === 's') {
    event.preventDefault()
    runEditorCommand('save-level')
  }
}

$: editorPanelPropContext = {
  levelId,
  editorScene,
  editorState,
  editorNodes,
  editorLevelOptions,
  levelSettings,
  effectiveObservatorySettings,
  effectiveSolitudeSettings,
  observatoryStylePresets,
  ambientAudioLibrary,
  canUndo,
  canRedo,
  workflowBrowserPath,
  workflowBrowserItems,
  workflowBrowserError,
  workflowBrowserLoading,
  selectedComfyWorkflowPath,
  workflowSelectionSummary,
  selectedNode,
  selectedNodes,
  selectedParentCandidates,
  multiSelectionParentCandidates,
  selectedNodeMaterial,
  selectedNodeColliderSize,
  selectedNodeStyleDescriptor,
  selectedNodePreviewAssetUrl,
  selectedLibraryItem,
  selectedLibraryItemUrl,
  selectedLibraryItemPath,
  similarNodeCount,
  similarNodeLabel,
  comfyWorkflowEditorStatus,
  hunyuanStatus,
  hunyuanBusy,
  hunyuanServiceReady,
  hunyuanBackendStatus,
  hunyuanBackendCanGenerate,
  hunyuanBackendCanRetexture,
  hunyuanLastOutputUrl,
  hunyuanLastResultSummary,
  hunyuanLastFitReport,
  hunyuanSupportsReplacement,
  hunyuanSupportsTextureWrap,
  hunyuanDetectedReferenceImageUrl,
  hunyuanJobsLoading,
  hunyuanJobsError,
  recentHunyuanJobs,
  workflowCanGenerateSelection,
  workflowCanRetextureSelection,
  canApplyGeneratedAssetToSelection,
  canWorkflowShowAll,
  selectedHunyuanJob,
  mergeDescriptor,
  activeSceneLevelId,
  createQuickNodeActions,
  createPrefabGroups,
  assetOptions,
  assetBrowserPath,
  assetBrowserItems,
  assetBrowserFilter,
  assetBrowserError,
  assetBrowserLoading,
  assetPickerTargetNodeId,
  assetPickerTargetName,
  textureBrowserPath,
  textureBrowserItems,
  textureBrowserError,
  textureBrowserLoading,
  activeTextureMaterialField,
  generatedVariantItems,
  generatedVariantLoading,
  generatedVariantError,
  filteredFlattenedNodes,
  hierarchyRootDropActive,
  hierarchyDropTargetId,
  hasGroupSelection,
  nodeViewportStateById,
  outlinerDisplayMode,
  outlinerModeOptions,
  hierarchyFilter,
  outlinerRows,
  groundSettings,
  terrainSculptSettings,
  terrainCollisionSettings,
  collisionBudget,
  terrainCollisionBakePending,
  terrainHeightmapGeneratePending,
  terrainChunkCookPending,
  terrainStatusSnapshot,
  worldPartitionCookPending,
  groundTerrainPublishPending,
  selectedTerrainSourceName,
  selectedTerrainSourceAssetUrl,
  heightmapSourceNodes,
  heightmapCandidateNodes,
  editorStyleStudioComponent,
  stylePresetOptions,
  styleBusy,
  styleStatus,
  styleInspectReport,
  styleSourceSummary,
  styleWorkspaceManifestUrl,
  styleWorkspaceSourceAssetUrl,
  styleGeneratedReferenceImageUrl,
  styleSimplifiedAssetUrl,
  styleBakedAssetUrl,
  styleBakeBackend,
  styleBakeTextureSize,
  styleBakeLineStrength,
  styleBakeBrushStrength,
  styleBakeAoStrength,
  styleBakeCavityStrength,
  styleBakeCurvatureStrength,
  styleBakeGeometrySimplification,
  styleBakeOutputTier,
  styleBakeForceRefresh,
  styleBakeCurrentSourceAssetUrl,
  styleBakeProduct,
  styleBakeProductStatus,
  styleBakeLastError,
  styleBakeLastSuccessfulAt,
  styleBakeCanApply,
  styleBakeCanRevert,
  styleBlenderExportPath,
  styleBlenderOpenCommand,
  styleBatchBusy,
  styleBatchStatus,
  styleBatchResumeAvailable,
  styleBatchResumeSummary,
  styleSceneCandidates,
  runtimeAssetFailures,
  comfyUiStatus,
  comfyUiBusy,
  comfyUiReady,
  comfyUiLowVramMode,
  editorAIMeshStudioComponent,
  canUseStyleStudio,
  canUseAiMeshStudio,
  canUseStyleStudioSelection,
  canUseAiMeshStudioSelection,
  canRetextureSelection,
  saveMessage,
  publishPipelineState,
  assetLibraryRootGenerated: ASSET_LIBRARY_ROOT_GENERATED,
  assetLibraryRootModels: ASSET_LIBRARY_ROOT_MODELS,
  assetController,
  aiController,
  createController,
  inspectorController,
  levelController,
  outlinerController,
  styleController,
  clearSelection,
  clearIsolatedNodes,
  setEditorInteractionMode,
  setEditorViewportLightingMode,
  setEditorViewportShadingMode,
  setCollisionOverlayEnabled,
  setObjectToolMode,
  setTerrainBrushMode,
  setTerrainBrushSize,
  setTerrainBrushStrength,
  setTerrainBrushFalloff,
  setTransformMode,
  setTransformSpace,
  setTransformAxis,
  setSnappingEnabled,
  setTranslateSnap,
  setRotateSnap,
  setScaleSnap,
  setSurfaceSnapEnabled,
  setSurfaceSnapOffset,
  removeSelectedNpc,
  undoScene,
  redoScene,
  updateLevelSetting,
  updateLevelNumericSetting,
  applySolitudeAtmospherePreset,
  setTerrainAutoBake,
  addSelectedTerrainSourcesToBasket,
  removeTerrainSourceFromBasket,
  clearTerrainSourceBasket,
  setCollisionBudget,
  bakeTerrainCollision,
  bakeTerrainPipeline,
  validateTerrainContract,
  generateTerrainHeightmapFromSelection,
  cookTerrainChunks,
  cookWorldPartition,
  publishGroundTerrainContracts,
  openBuildOutput,
  switchEditorLevel,
  reloadFromDisk,
  loadPackagedLevelScene,
  loadOriginalSnapshot,
  loadBackupSnapshot,
  addLatestGeneratedAssetToScene,
  selectSimilarNodes,
  hideSelectedNodes,
  isolateSelection,
  unhideAllNodes,
  unlockAllNodes,
  handleHierarchySelection,
  toggleNodeVisibility,
  toggleNodeLocked,
  soloNode,
  toggleNodeIsolation,
  updateTupleField,
  applyStylePreset,
  selectAllStyleBatchCandidates,
  selectCurrentStyleBatchCandidates,
  selectUnreimaginedStyleBatchCandidates,
  clearStyleBatchCandidates,
  toggleStyleBatchCandidate,
  updateNodeStyleDescriptor,
  resetSelectedWorkflowPath: assetController.resetSelectedWorkflowPath,
  saveCurrentSceneToDisk,
  setActiveEditorTab,
  setPanelOpen,
  setPropertiesShelfOpen,
  setSaveMessage: setSaveMessageValue,
  setHierarchyFilter: setHierarchyFilterValue,
  setHierarchyRootDropActive: setHierarchyRootDropActiveValue,
  setHierarchyDropTargetId: setHierarchyDropTargetIdValue,
  setAssetBrowserFilter: setAssetBrowserFilterValue,
  setHunyuanApplyToSimilarNodes: setHunyuanApplyToSimilarNodesValue,
}

$: sceneTabProps = buildSceneTabProps(editorPanelPropContext)
$: collisionTabProps = buildCollisionTabProps(editorPanelPropContext)
$: environmentTabProps = buildEnvironmentTabProps(editorPanelPropContext)
$: npcTabProps = buildNpcTabProps(editorPanelPropContext)
$: playerTabProps = buildPlayerTabProps(editorPanelPropContext)
$: createTabProps = buildCreateTabProps(editorPanelPropContext)
$: inspectTabProps = buildInspectTabProps(editorPanelPropContext)
$: styleTabProps = buildStyleTabProps(editorPanelPropContext)
$: aiTabProps = buildAiTabProps(editorPanelPropContext)
$: saveTabProps = buildSaveTabProps(editorPanelPropContext)
$: workflowTabProps = buildWorkflowTabProps(editorPanelPropContext)
$: sideStackProps = buildSideStackProps(editorPanelPropContext)
onMount(() => {
  if (typeof window !== 'undefined') {
    const savedWorkflowPath =
      window.localStorage.getItem('merkin:selected-comfy-workflow-path') || ''
    if (savedWorkflowPath) {
      selectedComfyWorkflowPath = savedWorkflowPath
    }
    comfyUiLowVramMode =
      window.localStorage.getItem('merkin:comfy-ui-low-vram-mode') === '1'
    aiPreferencesLoaded = true
  }
  void assetController.loadAssetBrowser(assetBrowserPath)
  void assetController.loadWorkflowBrowser(workflowBrowserPath)
  void levelController.refreshLevelRegistryFromDisk()
  void aiController.refreshHunyuanRecentJobs()

  if (typeof window !== 'undefined') {
    const persistedStyleBatch =
      loadStyleBatchSessionFromLocalStorage(activeSceneLevelId)
    if (persistedStyleBatch) {
      styleBatchSelectionIds = persistedStyleBatch.entries.map(
        entry => entry.nodeId,
      )
      styleBatchNodeStatusById = Object.fromEntries(
        persistedStyleBatch.entries.map(entry => [
          entry.nodeId,
          entry.error || entry.status,
        ]),
      )
      const hasOnlyTerminalEntries = persistedStyleBatch.entries.every(entry =>
        ['applied', 'failed', 'cancelled'].includes(entry.status),
      )
      if (hasOnlyTerminalEntries) {
        styleController.persistStyleBatchSession(null)
      } else {
        styleBatchPendingResume = persistedStyleBatch
        styleBatchStatus = `Found an interrupted ${getStyleBatchModeLabel(persistedStyleBatch.mode)} batch for ${persistedStyleBatch.entries.length} objects. Review prompts, then choose resume or discard.`
        saveMessage = styleBatchStatus
      }
    }
  }
})

onDestroy(() => {
  if (autoSaveTimeout !== null) {
    window.clearTimeout(autoSaveTimeout)
  }
  if (hunyuanJobsPollInterval !== null) {
    window.clearInterval(hunyuanJobsPollInterval)
  }
  unsubState()
  unsubNodes()
  unsubScene()
  unsubRegistry()
  unsubViewportState()
  unsubSelected()
  unsubSelectedNodes()
  unsubCanUndo()
  unsubCanRedo()
  unsubRuntimeAssetFailures()
})
</script>

<svelte:window
  bind:innerWidth={editorViewportWidth}
  bind:innerHeight={editorViewportHeight}
  on:keydown={handleEditorMenuShortcut}
  on:pointermove={resizeDockFromPointer}
  on:pointerup={endDockResize}
  on:pointercancel={endDockResize}
/>

{#if editorState?.enabled}
  <div
    class="editor-shell"
    class:collapsed={!editorState.panelOpen}
    class:resizing-dock={dockResizeTarget !== null}
    class:resizing-dock-y={dockResizeTarget?.axis === 'y'}
    style={editorDockStyle}
  >
    <div class="editor-top-chrome">
      <EditorPanelHeader
        panelOpen={editorState.panelOpen}
        propertiesShelfOpen={editorState.propertiesShelfOpen}
        outlinerOpen={editorState.outlinerOpen}
        controlsOverlayOpen={editorState.controlsOverlayOpen}
        layoutPreset={editorState.layoutPreset}
        layoutPresetOptions={EDITOR_LAYOUT_PRESET_OPTIONS}
        responsiveSplitPinned={editorState.responsiveSplitPinned}
        {canUndo}
        {canRedo}
        selectedNodeCount={editorState.selectedNodeIds.length}
        currentLevelId={activeSceneLevelId}
        levelOptions={editorLevelOptions}
        publishLevelPending={publishPipelineState.running}
        commands={editorCommands}
        onRunCommand={runEditorCommand}
        onOpenCommandPalette={() => {
          commandPaletteOpen = true
        }}
        onSaveLevel={saveCurrentSceneToDisk}
        onSaveAsLevel={saveAsLevelFromMenu}
        onNewLevel={openNewLevelTools}
        onLoadLevel={loadEditorLevelFromMenu}
        onPublishLevel={levelController.publishLevel}
        onMarkDraft={levelController.markLevelDraft}
        onReloadDisk={reloadFromDisk}
        onCopySceneJson={levelController.copySceneJson}
        onExportLevel={exportLevelForBlender}
        onImportLevel={importLevelFromBlender}
        onOpenSaveTools={() => setActiveEditorTab('build')}
        onUndo={() => {
          if (undoScene()) saveMessage = 'Undo'
        }}
        onRedo={() => {
          if (redoScene()) saveMessage = 'Redo'
        }}
        onSelectAll={selectAllNodes}
        onClearSelection={clearSelection}
        onDuplicateSelection={() => duplicateNodes(editorState.selectedNodeIds)}
        onDeleteSelection={() => removeNodes(editorState.selectedNodeIds)}
        onSetPanelOpen={setPanelOpen}
        onSetPropertiesShelfOpen={setPropertiesShelfOpen}
        onSetOutlinerOpen={setOutlinerOpen}
        onSetControlsOverlayOpen={setControlsOverlayOpen}
        onApplyLayoutPreset={applyLayoutPresetFromMenu}
        onResetLayoutPreset={resetLayoutPresetFromMenu}
        onSetResponsiveSplitPinned={setResponsiveSplitPinned}
        onResetDockLayout={resetDockLayoutFromMenu}
        onTogglePropertiesShelf={togglePropertiesShelfOpen}
        onTogglePanel={togglePanelOpen}
      />

      <EditorMainToolbar
        viewportMode={editorState.viewportMode}
        interactionMode={editorState.interactionMode}
        objectToolMode={editorState.objectToolMode}
        transformSpace={editorState.transformSpace}
        transformAxis={editorState.transformAxis}
        snappingEnabled={editorState.snappingEnabled}
        translateSnap={editorState.translateSnap}
        rotateSnap={editorState.rotateSnap}
        scaleSnap={editorState.scaleSnap}
        surfaceSnapEnabled={editorState.surfaceSnapEnabled}
        surfaceSnapOffset={editorState.surfaceSnapOffset}
        viewportShadingMode={editorState.viewportShadingMode}
        viewportLightingMode={editorState.viewportLightingMode}
        collisionOverlayEnabled={editorState.collisionOverlayEnabled}
        terrainModeAvailable={Boolean(terrainSculptSettings?.enabled) || Boolean(terrainCollisionSettings?.manifestUrl) || Boolean(selectedTerrainSourceAssetUrl)}
        terrainBrushMode={editorState.terrainBrushMode}
        terrainBrushSize={editorState.terrainBrushSize}
        terrainBrushStrength={editorState.terrainBrushStrength}
        terrainBrushFalloff={editorState.terrainBrushFalloff}
        commands={editorCommands}
        onSetViewportMode={setEditorViewportMode}
        onSetInteractionMode={setEditorInteractionMode}
        onSetObjectToolMode={setObjectToolMode}
        onSetTransformSpace={setTransformSpace}
        onSetTransformAxis={setTransformAxis}
        onSetSnappingEnabled={setSnappingEnabled}
        onSetTranslateSnap={setTranslateSnap}
        onSetRotateSnap={setRotateSnap}
        onSetScaleSnap={setScaleSnap}
        onSetSurfaceSnapEnabled={setSurfaceSnapEnabled}
        onSetSurfaceSnapOffset={setSurfaceSnapOffset}
        onSetViewportShadingMode={setEditorViewportShadingMode}
        onSetViewportLightingMode={setEditorViewportLightingMode}
        onSetCollisionOverlayEnabled={setCollisionOverlayEnabled}
        onSetTerrainBrushMode={setTerrainBrushMode}
        onSetTerrainBrushSize={setTerrainBrushSize}
        onSetTerrainBrushStrength={setTerrainBrushStrength}
        onSetTerrainBrushFalloff={setTerrainBrushFalloff}
        onRunCommand={runEditorCommand}
      />
    </div>

    <EditorCommandPalette
      open={commandPaletteOpen}
      commands={editorCommands}
      onRunCommand={runEditorCommand}
      onClose={() => {
        commandPaletteOpen = false
      }}
    />

    {#if editorState.panelOpen || effectiveSideOpen}
      <div
        class="editor-body"
        data-layout={editorState.panelOpen && effectiveSideOpen
          ? 'both'
          : editorState.panelOpen
            ? 'tools'
            : 'side'}
        data-preset={editorState.layoutPreset}
        data-responsive-single={responsiveSingleSideDock}
      >
        {#if editorState.panelOpen}
          <div class="editor-tools-region">
            <EditorPanelToolsDock
              tabs={editorPanelTabs}
              activeTab={activeEditorTab}
              onTabSelect={setActiveEditorTab}
              bind:contentElement={editorTabContentElement}
            >
      {#if activeEditorTab === 'scene'}
        <section class="editor-workspace" aria-label="Scene workspace">
          <div class="editor-workspace-heading">
            <div class="label">Scene Workspace</div>
            <p>Scene status, current editing mode, and object details.</p>
          </div>
          <EditorSceneTabHost
            {...sceneTabProps}
            bind:pendingLevelId
            bind:newLevelTitle
            bind:newLevelIdInput
            bind:newLevelTemplateId
          />
          <details class="editor-section" open>
            <summary class="label">Inspector &amp; Object Details</summary>
            <EditorInspectTabHost {...inspectTabProps} bind:hunyuanPrompt />
          </details>
        </section>

      {/if}

      {#if activeEditorTab === 'create'}
        <section class="editor-workspace" aria-label="Create workspace">
          <div class="editor-workspace-heading">
            <div class="label">Create Workspace</div>
            <p>Primitives, prefabs, content browser, asset preview, and add/apply actions.</p>
          </div>
          <EditorCreateTabHost
            {...createTabProps}
            bind:hunyuanStatus
            bind:hunyuanPrompt
            bind:hunyuanReferenceImageUrl
            bind:hunyuanScratchName
            bind:hunyuanScratchReferenceImageUrl
            bind:hunyuanScratchPrompt
            bind:assetBrowserFilter
            bind:mergeDescriptor
          />
        </section>

      {/if}

      {#if activeEditorTab === 'world'}
        <section class="editor-workspace" aria-label="World workspace">
          <div class="editor-workspace-heading">
            <div class="label">World Workspace</div>
            <p>Level settings, terrain tools, environment, player spawn, and gameplay world controls.</p>
          </div>
          <EditorWorldTabHost
            {levelId}
            {editorScene}
            {terrainSculptSettings}
            {terrainCollisionSettings}
            terrainStatus={terrainStatusSnapshot}
            {selectedTerrainSourceName}
            {selectedTerrainSourceAssetUrl}
            {worldPartitionCookPending}
            {environmentTabProps}
            {playerTabProps}
            onCookWorldPartition={() => void cookWorldPartition()}
            onBakeTerrain={() => void bakeTerrainPipeline()}
          />
        </section>
      {/if}

      {#if activeEditorTab === 'npc'}
        <section class="editor-workspace" aria-label="NPC workspace">
          <div class="editor-workspace-heading">
            <div class="label">NPC Workspace</div>
            <p>NPC actors, firefly fields, conversations, movement, lighting, and quality tiers.</p>
          </div>
          <EditorNpcTabHost {...npcTabProps} />
        </section>
      {/if}

      {#if activeEditorTab === 'performance'}
        <section class="editor-workspace" aria-label="Performance workspace">
          <div class="editor-workspace-heading">
            <div class="label">Performance Workspace</div>
            <p>Budget diagnostics, runtime quality systems, and optimization selection tools.</p>
          </div>
          <EditorPerformanceTabHost
            {levelId}
            {editorScene}
            {editorNodes}
            {publishPipelineState}
            onOpenBuildTools={() => openOwnerWorkspace('build')}
            onOpenCollisionTools={() => openOwnerWorkspace('collision')}
            onSelectNodes={selectPerformanceNodes}
          />
        </section>
      {/if}

      {#if activeEditorTab === 'collision'}
        <section class="editor-workspace" aria-label="Collision workspace">
          <div class="editor-workspace-heading">
            <div class="label">Collision Workspace</div>
            <p>Collision policy, authoring, review, runtime overlay, and bake entry points.</p>
          </div>
          <EditorCollisionTabHost {...collisionTabProps} />
        </section>
      {/if}

      {#if activeEditorTab === 'bake'}
        <section class="editor-workspace" aria-label="Bake workspace">
          <div class="editor-workspace-heading">
            <div class="label">Bake Workspace</div>
            <p>Choose one bake type, follow the steps, then move to the next production product.</p>
          </div>

          <section class="editor-section" aria-label="Bake type">
            <div class="label">Bake Type</div>
            <div class="button-row compact" role="tablist" aria-label="Bake workspace type">
              {#each bakeWorkspaceTabs as tab (tab.id)}
                <button
                  class:active={activeBakeWorkspaceTab === tab.id}
                  role="tab"
                  aria-selected={activeBakeWorkspaceTab === tab.id}
                  title={tab.description}
                  data-sfx-hover="hover-soft"
                  data-sfx-click="panel-open"
                  on:click={() => {
                    activeBakeWorkspaceTab = tab.id
                  }}
                >
                  {tab.label}
                </button>
              {/each}
            </div>
            <div class="save-message">
              {bakeWorkspaceTabs.find(tab => tab.id === activeBakeWorkspaceTab)?.description}
            </div>
          </section>

          {#if activeBakeWorkspaceTab === 'style'}
            <EditorStyleTabHost
              workspaceMode="bake"
              {...styleTabProps}
              bind:styleProfileName
              bind:stylePrompt
              bind:styleNegativePrompt
              bind:styleLoraNotes
              bind:styleControlNetNotes
              bind:styleReferenceImageUrl
              bind:styleSimplifyRatio
              bind:styleSimplifyError
              bind:styleBakeBackend
              bind:styleBakeTextureSize
              bind:styleBakeLineStrength
              bind:styleBakeBrushStrength
              bind:styleBakeAoStrength
              bind:styleBakeCavityStrength
              bind:styleBakeCurvatureStrength
              bind:styleBakeGeometrySimplification
              bind:styleBakeOutputTier
              bind:styleBakeForceRefresh
              bind:comfyUiLowVramMode
            />
          {/if}

          {#if activeBakeWorkspaceTab === 'collision'}
            <EditorCollisionTabHost {...collisionTabProps} />
          {/if}

          {#if activeBakeWorkspaceTab === 'runtime'}
            <EditorWorkflowTabHost {...workflowTabProps} />
          {/if}
        </section>
      {/if}

      {#if activeEditorTab === 'build'}
        <section class="editor-workspace" aria-label="Build workspace">
          <div class="editor-workspace-heading">
            <div class="label">Build Workspace</div>
            <p>Save, validation, publish, bake/cook output, diagnostics, and legacy automation.</p>
          </div>
          <EditorSaveTabHost
            {...saveTabProps}
            bind:metadataTitle
            bind:metadataStatus
            bind:metadataDeployed
            bind:metadataStarMapEnabled
            bind:metadataStarMapYear
            bind:metadataStarMapDescription
            bind:metadataSourceKind
            bind:saveAsTitle
            bind:saveAsLevelId
            bind:importBuffer
          />
          {#if blenderSceneExportResult}
            <div class="editor-section editor-status-card">
              <div class="label">Blender Export Ready</div>
              <p>
                Exported {blenderSceneExportResult.nodeCount} node(s) and
                {blenderSceneExportResult.assetCount} asset(s).
                {#if blenderSceneExportResult.warningCount > 0}
                  {blenderSceneExportResult.warningCount} warning(s) need review.
                {/if}
              </p>
              <label>
                <span>Package Manifest</span>
                <input class="text-input" value={blenderSceneExportResult.packagePath} readonly />
              </label>
              <div class="button-row compact editor-mt-sm">
                <button
                  data-sfx-hover="hover-soft"
                  data-sfx-click="soft"
                  on:click={() => void navigator.clipboard?.writeText?.(blenderSceneExportResult?.packagePath ?? '')}
                >
                  Copy Manifest Path
                </button>
                <button
                  data-sfx-hover="hover-soft"
                  data-sfx-click="soft"
                  on:click={() => {
                    if (blenderSceneExportResult) saveMessage = `Import this in Blender: ${blenderSceneExportResult.packagePath}`
                  }}
                >
                  Show Next Step
                </button>
              </div>
              <div class="save-message">
                In Blender, use Merkin > Import Merkin Scene Package and select this manifest.
              </div>
            </div>
          {/if}
          <details class="editor-section" bind:open={buildWorkflowOpen}>
            <summary class="label">Pipelines, Bake &amp; Publish Tools</summary>
            <EditorWorkflowTabHost {...workflowTabProps} />
          </details>
          <details class="editor-section" bind:open={buildOutputOpen}>
            <summary class="label">Diagnostics &amp; AI Output</summary>
            <EditorOutputTabHost
              {saveMessage}
              {runtimeAssetFailures}
              {recentHunyuanJobs}
              {hunyuanJobsLoading}
              {hunyuanJobsError}
              bind:selectedHunyuanJobId
              {publishPipelineState}
              onRefreshRecentJobs={() =>
                void aiController.refreshHunyuanRecentJobs()}
            />
          </details>
        </section>
      {/if}

      {#if activeEditorTab === 'ai'}
        <section class="editor-workspace" aria-label="AI Lab workspace">
          <div class="editor-workspace-heading">
            <div class="label">AI Lab</div>
            <p>Pick scene objects, choose texture restyle or full mesh reimagine, run or resume the batch, then review output.</p>
          </div>
          <EditorStyleTabHost
            workspaceMode="generation"
            {...styleTabProps}
            bind:styleProfileName
            bind:stylePrompt
            bind:styleNegativePrompt
            bind:styleLoraNotes
            bind:styleControlNetNotes
            bind:styleReferenceImageUrl
            bind:styleSimplifyRatio
            bind:styleSimplifyError
            bind:styleBakeBackend
            bind:styleBakeTextureSize
            bind:styleBakeLineStrength
            bind:styleBakeBrushStrength
            bind:styleBakeAoStrength
            bind:styleBakeCavityStrength
            bind:styleBakeCurvatureStrength
            bind:styleBakeGeometrySimplification
            bind:styleBakeOutputTier
            bind:styleBakeForceRefresh
            bind:comfyUiLowVramMode
          />
          <details class="editor-section editor-advanced-block">
            <summary class="label">Scratch Mesh And Workflow Debug</summary>
            <div class="save-message">Manual scratch generation, workflow-template browsing, direct Hunyuan job inspection, and manual apply controls live here.</div>
            <EditorAiTabHost
              {...aiTabProps}
              bind:comfyUiApiUrl
              bind:comfyUiLowVramMode
              bind:hunyuanApiUrl
              bind:selectedHunyuanJobId
              bind:hunyuanReferenceImageUrl
              bind:hunyuanPrompt
              bind:hunyuanScratchName
              bind:hunyuanScratchReferenceImageUrl
              bind:hunyuanScratchPrompt
              bind:hunyuanApplyToSimilarNodes
            />
          </details>
        </section>
      {/if}

          </EditorPanelToolsDock>
            <button
              class="editor-dock-resize-handle tools-resize-handle"
              type="button"
              aria-label="Resize tools dock"
              on:pointerdown={(event) => beginDockResize('tools', 'x', event)}
            ></button>
            <button
              class="editor-dock-height-resize-handle"
              type="button"
              aria-label="Resize tools dock height"
              on:pointerdown={(event) => beginDockResize('tools', 'y', event)}
            ></button>
          </div>
        {/if}

        {#if effectiveSideOpen}
          <div class="editor-side-region">
            <button
              class="editor-dock-resize-handle side-resize-handle"
              type="button"
              aria-label="Resize details dock"
              on:pointerdown={(event) => beginDockResize('side', 'x', event)}
            ></button>
            <EditorSideStackHost
              {...sideStackProps}
              outlinerOpen={effectiveOutlinerOpen}
              propertiesShelfOpen={effectivePropertiesShelfOpen}
              sideStackSplitRatio={editorState.sideStackSplitRatio}
              toolPanelOpen={editorState.panelOpen}
              bind:selectedGeneratedVariantUrl
              bind:hunyuanPrompt
              onSideStackSplitRatioChange={(ratio) =>
                setEditorDockLayout({ sideStackSplitRatio: ratio })}
            />
            <button
              class="editor-dock-height-resize-handle"
              type="button"
              aria-label="Resize details dock height"
              on:pointerdown={(event) => beginDockResize('side', 'y', event)}
            ></button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .editor-shell {
    position: fixed;
    inset: 0.75rem;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.5rem;
    min-width: 0;
    min-height: 0;
    color: #e8f5ff;
    z-index: 88;
    pointer-events: none;
    --editor-dock-gap: 0.5rem;
    --editor-tools-width: 320px;
    --editor-side-width: 320px;
    --editor-tools-height: 72vh;
    --editor-side-height: 72vh;
  }

  .editor-shell.collapsed {
    grid-template-rows: auto;
  }

  .editor-top-chrome {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.45rem;
    align-items: center;
    min-width: 0;
    position: relative;
    z-index: 120;
    pointer-events: auto;
    isolation: isolate;
  }

  .editor-body {
    display: grid;
    gap: var(--editor-dock-gap);
    min-width: 0;
    min-height: 0;
    position: relative;
    z-index: 1;
    pointer-events: none;
  }

  .editor-body[data-layout='both'] {
    grid-template-columns: minmax(0, var(--editor-tools-width)) minmax(45vw, 1fr) minmax(0, var(--editor-side-width));
    grid-template-areas: 'tools viewport side';
    align-items: start;
  }

  .editor-body[data-layout='tools'] {
    grid-template-columns: minmax(0, var(--editor-tools-width)) minmax(45vw, 1fr);
    grid-template-areas: 'tools viewport';
    align-items: start;
  }

  .editor-body[data-layout='side'] {
    grid-template-columns: minmax(45vw, 1fr) minmax(0, var(--editor-side-width));
    grid-template-areas: 'viewport side';
    align-items: start;
  }

  .editor-tools-region,
  .editor-side-region {
    min-width: 0;
    min-height: 0;
    pointer-events: auto;
    align-self: start;
    max-height: 100%;
    position: relative;
  }

  .editor-tools-region {
    grid-area: tools;
    height: var(--editor-tools-height);
  }

  .editor-side-region {
    grid-area: side;
    height: var(--editor-side-height);
  }

  .editor-dock-resize-handle {
    position: absolute;
    top: 0.5rem;
    bottom: 0.5rem;
    z-index: 4;
    width: 0.55rem;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(126, 203, 255, 0.12);
    cursor: col-resize;
    opacity: 0.55;
    transition:
      background 0.12s ease,
      opacity 0.12s ease;
    touch-action: none;
  }

  .editor-dock-resize-handle:hover,
  .editor-dock-resize-handle:focus-visible,
  .editor-shell.resizing-dock .editor-dock-resize-handle {
    background: rgba(126, 203, 255, 0.42);
    opacity: 1;
  }

  .tools-resize-handle {
    right: -0.525rem;
  }

  .side-resize-handle {
    left: -0.525rem;
  }

  .editor-shell.resizing-dock {
    cursor: col-resize;
    user-select: none;
  }

  .editor-shell.resizing-dock-y {
    cursor: row-resize;
    user-select: none;
  }

  .editor-dock-height-resize-handle {
    position: absolute;
    left: 0.75rem;
    right: 0.75rem;
    bottom: -0.525rem;
    z-index: 5;
    height: 0.55rem;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(126, 203, 255, 0.12);
    cursor: row-resize;
    opacity: 0.55;
    transition:
      background 0.12s ease,
      opacity 0.12s ease;
    touch-action: none;
  }

  .editor-dock-height-resize-handle:hover,
  .editor-dock-height-resize-handle:focus-visible,
  .editor-shell.resizing-dock-y .editor-dock-height-resize-handle {
    background: rgba(126, 203, 255, 0.42);
    opacity: 1;
  }

  @media (max-width: 1280px) {
    .editor-shell {
      inset: 0.6rem;
    }

    .editor-top-chrome {
      grid-template-columns: minmax(18rem, auto) minmax(0, 1fr);
      gap: 0.38rem;
    }

    .editor-tools-region,
    .editor-side-region {
      max-height: 100%;
    }
  }

  @media (max-width: 900px) {
    .editor-shell {
      inset: 0.5rem;
      gap: 0.4rem;
      --editor-dock-gap: 0.4rem;
    }

    .editor-top-chrome {
      grid-template-columns: minmax(14rem, auto) minmax(0, 1fr);
      gap: 0.35rem;
    }

    .editor-tools-region,
    .editor-side-region {
      max-height: 100%;
    }

    .editor-body[data-layout='both'] {
      grid-template-columns: minmax(12rem, 1fr) minmax(0, max(var(--editor-tools-width), var(--editor-side-width)));
      grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        'viewport tools'
        'viewport side';
    }

    .editor-body[data-layout='tools'] {
      grid-template-columns: minmax(12rem, 1fr) minmax(0, var(--editor-tools-width));
      grid-template-areas: 'viewport tools';
    }

    .editor-body[data-layout='side'] {
      grid-template-columns: minmax(12rem, 1fr) minmax(0, var(--editor-side-width));
      grid-template-areas: 'viewport side';
    }
  }

  @media (max-width: 680px) {
    .editor-top-chrome {
      grid-template-columns: minmax(0, 1fr);
    }

    .editor-body[data-layout='both'],
    .editor-body[data-layout='tools'],
    .editor-body[data-layout='side'] {
      grid-template-columns: minmax(0, 1fr);
    }

    .editor-body[data-layout='both'] {
      grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        'tools'
        'side';
    }

    .editor-body[data-layout='tools'] {
      grid-template-areas: 'tools';
    }

    .editor-body[data-layout='side'] {
      grid-template-areas: 'side';
    }
  }
</style>
